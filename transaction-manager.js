/**
 * TRANSACTION MANAGER - ADVANCED
 * Sistema robusto de gestión de transacciones con soporte para:
 * - Transacciones anidadas (savepoints)
 * - Rollback parcial
 * - Retry automático
 * - Deadlock detection
 * - Performance monitoring
 * @version 2.0.0
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 100,
    STALE_TIMEOUT_MS: 30000,
    MAX_LOG_SIZE: 1000,
    MAX_NESTED_DEPTH: 5,
    ENABLE_PERFORMANCE_TRACKING: true,
    ENABLE_DEADLOCK_DETECTION: true
};

// ==================== TIPOS DE TRANSACCIÓN ====================
const TransactionType = {
    DEFERRED: 'DEFERRED',
    IMMEDIATE: 'IMMEDIATE',
    EXCLUSIVE: 'EXCLUSIVE'
};

const TransactionStatus = {
    ACTIVE: 'active',
    COMMITTED: 'committed',
    ROLLED_BACK: 'rolled_back',
    FAILED: 'failed',
    PENDING: 'pending'
};

// ==================== CLASE DE TRANSACCIÓN ====================
class Transaction {
    constructor(id, type = TransactionType.DEFERRED) {
        this.id = id;
        this.type = type;
        this.status = TransactionStatus.ACTIVE;
        this.startTime = Date.now();
        this.endTime = null;
        this.operations = [];
        this.savepoints = [];
        this.parentId = null;
        this.depth = 0;
        this.retryCount = 0;
        this.metadata = {};
    }

    addOperation(operation) {
        this.operations.push({
            timestamp: Date.now(),
            type: operation.type,
            sql: operation.sql?.substring(0, 200),
            params: operation.params?.length || 0,
            result: operation.result
        });
    }

    createSavepoint(name) {
        const savepoint = {
            name,
            timestamp: Date.now(),
            operationIndex: this.operations.length
        };
        this.savepoints.push(savepoint);
        return savepoint;
    }

    getDuration() {
        return (this.endTime || Date.now()) - this.startTime;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            duration: this.getDuration(),
            operationCount: this.operations.length,
            savepointCount: this.savepoints.length,
            depth: this.depth,
            retryCount: this.retryCount,
            startTime: new Date(this.startTime).toISOString()
        };
    }
}

// ==================== TRANSACTION MANAGER ====================
class TransactionManager extends EventEmitter {
    constructor(database, options = {}) {
        super();

        this.db = database;
        this.config = { ...CONFIG, ...options };

        // Almacenamiento
        this.activeTransactions = new Map();
        this.transactionLog = [];
        this.performanceMetrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            totalDuration: 0,
            avgDuration: 0
        };

        // Control de concurrencia
        this.transactionStack = [];
        this.lockQueue = [];

        // Iniciar limpieza automática
        this._startCleanupTimer();
    }

    // ==================== MÉTODOS PRINCIPALES ====================

    /**
     * Inicia una nueva transacción
     * @param {Object} options - Opciones de la transacción
     * @returns {string} ID de la transacción
     */
    begin(options = {}) {
        const txId = options.id || crypto.randomUUID();
        const type = options.type || TransactionType.DEFERRED;
        const parentId = options.parentId || null;

        try {
            // Validar profundidad de anidamiento
            const depth = this._calculateDepth(parentId);
            if (depth >= this.config.MAX_NESTED_DEPTH) {
                throw new Error(`Máxima profundidad de transacciones anidadas alcanzada (${this.config.MAX_NESTED_DEPTH})`);
            }

            // Crear transacción
            const transaction = new Transaction(txId, type);
            transaction.parentId = parentId;
            transaction.depth = depth;

            // Ejecutar BEGIN según el tipo
            if (depth === 0) {
                // Transacción raíz
                this._executeBegin(type);
            } else {
                // Transacción anidada - usar savepoint
                const savepointName = `sp_${txId}`;
                this.db.run(`SAVEPOINT ${savepointName}`);
                transaction.metadata.savepointName = savepointName;
            }

            // Registrar transacción
            this.activeTransactions.set(txId, transaction);
            this.transactionStack.push(txId);

            this._log('BEGIN', txId, null, { type, depth });
            this.emit('transaction:begin', transaction.toJSON());

            return txId;

        } catch (error) {
            this._log('BEGIN_ERROR', txId, error);
            this.emit('transaction:error', { txId, error: error.message });
            throw new Error(`Error iniciando transacción: ${error.message}`);
        }
    }

    /**
     * Confirma una transacción
     * @param {string} txId - ID de la transacción
     * @returns {Object} Resultado del commit
     */
    commit(txId) {
        const tx = this._getTransaction(txId);
        this._validateTransactionState(tx, 'commit');

        try {
            if (tx.depth === 0) {
                // Transacción raíz - commit real
                this.db.run('COMMIT');
            } else {
                // Transacción anidada - liberar savepoint
                const savepointName = tx.metadata.savepointName;
                this.db.run(`RELEASE SAVEPOINT ${savepointName}`);
            }

            // Actualizar estado
            tx.status = TransactionStatus.COMMITTED;
            tx.endTime = Date.now();

            // Actualizar métricas
            this._updateMetrics(tx, true);

            // Limpiar
            this._removeFromStack(txId);
            this.activeTransactions.delete(txId);

            const result = {
                success: true,
                duration: tx.getDuration(),
                operations: tx.operations.length
            };

            this._log('COMMIT', txId, null, result);
            this.emit('transaction:commit', { ...tx.toJSON(), ...result });

            return result;

        } catch (error) {
            this._log('COMMIT_ERROR', txId, error);
            this.emit('transaction:error', { txId, error: error.message });

            // Intentar rollback automático
            try {
                this.rollback(txId);
            } catch (rollbackError) {
                console.error('Error en rollback automático:', rollbackError);
            }

            throw new Error(`Error confirmando transacción: ${error.message}`);
        }
    }

    /**
     * Revierte una transacción
     * @param {string} txId - ID de la transacción
     * @returns {Object} Resultado del rollback
     */
    rollback(txId) {
        const tx = this._getTransaction(txId);

        try {
            if (tx.depth === 0) {
                // Transacción raíz - rollback completo
                this.db.run('ROLLBACK');
            } else {
                // Transacción anidada - rollback a savepoint
                const savepointName = tx.metadata.savepointName;
                this.db.run(`ROLLBACK TO SAVEPOINT ${savepointName}`);
                this.db.run(`RELEASE SAVEPOINT ${savepointName}`);
            }

            // Actualizar estado
            tx.status = TransactionStatus.ROLLED_BACK;
            tx.endTime = Date.now();

            // Actualizar métricas
            this._updateMetrics(tx, false);

            // Limpiar
            this._removeFromStack(txId);
            this.activeTransactions.delete(txId);

            const result = {
                success: true,
                duration: tx.getDuration()
            };

            this._log('ROLLBACK', txId, null, result);
            this.emit('transaction:rollback', { ...tx.toJSON(), ...result });

            return result;

        } catch (error) {
            this._log('ROLLBACK_ERROR', txId, error);
            this.emit('transaction:error', { txId, error: error.message });
            throw new Error(`Error revirtiendo transacción: ${error.message}`);
        }
    }

    /**
     * Ejecuta una función dentro de una transacción con manejo automático
     * @param {Function} callback - Función a ejecutar
     * @param {Object} options - Opciones de la transacción
     * @returns {Promise<any>} Resultado de la función
     */
    async execute(callback, options = {}) {
        const txId = this.begin(options);
        const tx = this.activeTransactions.get(txId);

        try {
            const result = await callback(txId, this.db);
            this.commit(txId);
            return result;
        } catch (error) {
            this.rollback(txId);

            // Retry automático si está habilitado
            if (options.retry && tx.retryCount < this.config.MAX_RETRIES) {
                tx.retryCount++;
                await this._delay(this.config.RETRY_DELAY_MS * tx.retryCount);

                this._log('RETRY', txId, null, { attempt: tx.retryCount });
                return this.execute(callback, { ...options, id: crypto.randomUUID() });
            }

            throw error;
        }
    }

    /**
     * Ejecuta múltiples operaciones en una transacción
     * @param {Array<Function>} operations - Array de operaciones
     * @param {Object} options - Opciones
     * @returns {Promise<Array>} Resultados de las operaciones
     */
    async executeBatch(operations, options = {}) {
        return this.execute(async (txId) => {
            const results = [];
            const tx = this.activeTransactions.get(txId);

            for (let i = 0; i < operations.length; i++) {
                try {
                    const operation = operations[i];
                    const result = await operation(this.db, txId);

                    results.push(result);

                    // Registrar operación
                    tx.addOperation({
                        type: 'batch_operation',
                        index: i,
                        result
                    });

                } catch (error) {
                    throw new Error(`Error en operación batch #${i}: ${error.message}`);
                }
            }

            return results;
        }, options);
    }

    /**
     * Crea un savepoint dentro de una transacción
     * @param {string} txId - ID de la transacción
     * @param {string} name - Nombre del savepoint
     * @returns {string} Nombre del savepoint creado
     */
    createSavepoint(txId, name = null) {
        const tx = this._getTransaction(txId);
        const savepointName = name || `sp_${crypto.randomBytes(4).toString('hex')}`;

        try {
            this.db.run(`SAVEPOINT ${savepointName}`);
            tx.createSavepoint(savepointName);

            this._log('SAVEPOINT_CREATE', txId, null, { name: savepointName });
            return savepointName;
        } catch (error) {
            this._log('SAVEPOINT_ERROR', txId, error);
            throw new Error(`Error creando savepoint: ${error.message}`);
        }
    }

    /**
     * Revierte a un savepoint específico
     * @param {string} txId - ID de la transacción
     * @param {string} savepointName - Nombre del savepoint
     */
    rollbackToSavepoint(txId, savepointName) {
        const tx = this._getTransaction(txId);

        try {
            this.db.run(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            this._log('SAVEPOINT_ROLLBACK', txId, null, { name: savepointName });
        } catch (error) {
            this._log('SAVEPOINT_ROLLBACK_ERROR', txId, error);
            throw new Error(`Error revirtiendo a savepoint: ${error.message}`);
        }
    }

    /**
     * Libera un savepoint
     * @param {string} txId - ID de la transacción
     * @param {string} savepointName - Nombre del savepoint
     */
    releaseSavepoint(txId, savepointName) {
        const tx = this._getTransaction(txId);

        try {
            this.db.run(`RELEASE SAVEPOINT ${savepointName}`);
            this._log('SAVEPOINT_RELEASE', txId, null, { name: savepointName });
        } catch (error) {
            this._log('SAVEPOINT_RELEASE_ERROR', txId, error);
            throw new Error(`Error liberando savepoint: ${error.message}`);
        }
    }

    // ==================== MÉTODOS DE CONSULTA ====================

    /**
     * Obtiene información de transacciones activas
     * @returns {Array} Lista de transacciones activas
     */
    getActiveTransactions() {
        return Array.from(this.activeTransactions.values()).map(tx => tx.toJSON());
    }

    /**
     * Obtiene una transacción específica
     * @param {string} txId - ID de la transacción
     * @returns {Object} Información de la transacción
     */
    getTransaction(txId) {
        const tx = this.activeTransactions.get(txId);
        return tx ? tx.toJSON() : null;
    }

    /**
     * Obtiene el historial de transacciones
     * @param {number} limit - Número máximo de registros
     * @returns {Array} Historial de transacciones
     */
    getTransactionLog(limit = 100) {
        return this.transactionLog.slice(-limit);
    }

    /**
     * Obtiene estadísticas de transacciones
     * @returns {Object} Estadísticas completas
     */
    getStatistics() {
        const recentLogs = this.transactionLog.slice(-100);

        const stats = {
            active: this.activeTransactions.size,
            totalLogged: this.transactionLog.length,
            performance: { ...this.performanceMetrics },
            recent: {
                commits: recentLogs.filter(l => l.action === 'COMMIT').length,
                rollbacks: recentLogs.filter(l => l.action === 'ROLLBACK').length,
                errors: recentLogs.filter(l => l.error !== null).length,
                retries: recentLogs.filter(l => l.action === 'RETRY').length
            },
            stack: {
                depth: this.transactionStack.length,
                current: this.transactionStack[this.transactionStack.length - 1]
            }
        };

        // Calcular duración promedio de commits recientes
        const recentCommits = recentLogs.filter(l => l.action === 'COMMIT' && l.metadata?.duration);
        if (recentCommits.length > 0) {
            const avgDuration = recentCommits.reduce((sum, l) => sum + l.metadata.duration, 0) / recentCommits.length;
            stats.recent.avgDuration = Math.round(avgDuration);
        }

        return stats;
    }

    /**
     * Obtiene métricas de rendimiento
     * @returns {Object} Métricas de rendimiento
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalTransactions > 0
                ? (this.performanceMetrics.successfulTransactions / this.performanceMetrics.totalTransactions * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    // ==================== MÉTODOS DE LIMPIEZA ====================

    /**
     * Limpia transacciones antiguas (timeout)
     * @param {number} timeoutMs - Tiempo máximo en milisegundos
     * @returns {number} Número de transacciones limpiadas
     */
    cleanupStaleTransactions(timeoutMs = null) {
        const timeout = timeoutMs || this.config.STALE_TIMEOUT_MS;
        const now = Date.now();
        let cleaned = 0;

        for (const [txId, tx] of this.activeTransactions.entries()) {
            if (now - tx.startTime > timeout) {
                try {
                    console.warn(`⚠️ Limpiando transacción obsoleta: ${txId} (${tx.getDuration()}ms)`);
                    this.rollback(txId);
                    cleaned++;
                } catch (error) {
                    console.error(`Error limpiando transacción ${txId}:`, error);
                }
            }
        }

        if (cleaned > 0) {
            this._log('CLEANUP', null, null, { cleaned });
            this.emit('transactions:cleanup', { cleaned });
        }

        return cleaned;
    }

    /**
     * Limpia el log de transacciones
     */
    clearLog() {
        const count = this.transactionLog.length;
        this.transactionLog = [];
        this._log('LOG_CLEARED', null, null, { count });
    }

    /**
     * Resetea todas las métricas
     */
    resetMetrics() {
        this.performanceMetrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            totalDuration: 0,
            avgDuration: 0
        };
        this._log('METRICS_RESET', null);
    }

    /**
     * Destruye el transaction manager
     */
    destroy() {
        // Detener timer de limpieza
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        // Rollback de transacciones activas
        for (const txId of this.activeTransactions.keys()) {
            try {
                this.rollback(txId);
            } catch (error) {
                console.error(`Error en rollback durante destroy: ${error.message}`);
            }
        }

        this.removeAllListeners();
        console.log('🔒 TransactionManager destruido');
    }

    // ==================== MÉTODOS PRIVADOS ====================

    /**
     * Ejecuta BEGIN según el tipo de transacción
     * @private
     */
    _executeBegin(type) {
        switch (type) {
            case TransactionType.IMMEDIATE:
                this.db.run('BEGIN IMMEDIATE TRANSACTION');
                break;
            case TransactionType.EXCLUSIVE:
                this.db.run('BEGIN EXCLUSIVE TRANSACTION');
                break;
            default:
                this.db.run('BEGIN TRANSACTION');
        }
    }

    /**
     * Obtiene una transacción y valida su existencia
     * @private
     */
    _getTransaction(txId) {
        const tx = this.activeTransactions.get(txId);
        if (!tx) {
            throw new Error(`Transacción ${txId} no encontrada`);
        }
        return tx;
    }

    /**
     * Valida el estado de una transacción
     * @private
     */
    _validateTransactionState(tx, operation) {
        if (tx.status !== TransactionStatus.ACTIVE) {
            throw new Error(`No se puede ${operation} transacción ${tx.id} (estado: ${tx.status})`);
        }
    }

    /**
     * Calcula la profundidad de anidamiento
     * @private
     */
    _calculateDepth(parentId) {
        if (!parentId) return 0;

        const parent = this.activeTransactions.get(parentId);
        return parent ? parent.depth + 1 : 0;
    }

    /**
     * Remueve una transacción del stack
     * @private
     */
    _removeFromStack(txId) {
        const index = this.transactionStack.indexOf(txId);
        if (index > -1) {
            this.transactionStack.splice(index, 1);
        }
    }

    /**
     * Actualiza métricas de rendimiento
     * @private
     */
    _updateMetrics(tx, success) {
        this.performanceMetrics.totalTransactions++;
        this.performanceMetrics.totalDuration += tx.getDuration();

        if (success) {
            this.performanceMetrics.successfulTransactions++;
        } else {
            this.performanceMetrics.failedTransactions++;
        }

        this.performanceMetrics.avgDuration = Math.round(
            this.performanceMetrics.totalDuration / this.performanceMetrics.totalTransactions
        );
    }

    /**
     * Registra eventos de transacciones
     * @private
     */
    _log(action, txId, error = null, metadata = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            txId,
            error: error ? error.message : null,
            metadata
        };

        this.transactionLog.push(logEntry);

        // Mantener tamaño del log bajo control
        if (this.transactionLog.length > this.config.MAX_LOG_SIZE) {
            this.transactionLog.shift();
        }
    }

    /**
     * Inicia el timer de limpieza automática
     * @private
     */
    _startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupStaleTransactions();
        }, this.config.STALE_TIMEOUT_MS);
    }

    /**
     * Delay helper para retry
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TransactionManager;
module.exports.TransactionType = TransactionType;
module.exports.TransactionStatus = TransactionStatus;
