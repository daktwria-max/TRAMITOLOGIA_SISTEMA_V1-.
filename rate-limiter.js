/**
 * RATE LIMITER
 * Sistema de limitación de tasa para operaciones costosas
 * @version 1.0.0
 */

class RateLimiter {
    constructor(options = {}) {
        // Configuración por defecto
        this.limits = {
            ocr: { maxRequests: 10, windowMs: 60000, cost: 10 }, // 10 por minuto
            pdf: { maxRequests: 20, windowMs: 60000, cost: 5 },  // 20 por minuto
            backup: { maxRequests: 5, windowMs: 300000, cost: 20 }, // 5 por 5 minutos
            database: { maxRequests: 100, windowMs: 60000, cost: 1 }, // 100 por minuto
            fileUpload: { maxRequests: 50, windowMs: 60000, cost: 2 } // 50 por minuto
        };

        // Permitir sobrescribir límites
        if (options.limits) {
            this.limits = { ...this.limits, ...options.limits };
        }

        // Almacenamiento de solicitudes por operación
        this.requests = new Map();

        // Almacenamiento de puntos (para rate limiting basado en costos)
        this.points = new Map();

        // Cola de espera para solicitudes bloqueadas
        this.queues = new Map();

        // Estadísticas
        this.stats = {
            allowed: 0,
            blocked: 0,
            queued: 0,
            byOperation: {}
        };

        // Limpiar datos antiguos periódicamente
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Verifica si una operación puede ejecutarse
     * @param {string} operation - Nombre de la operación
     * @param {string} identifier - Identificador único (IP, userId, etc.)
     * @returns {Object} Resultado de la verificación
     */
    check(operation, identifier = 'default') {
        const limit = this.limits[operation];

        if (!limit) {
            // Si no hay límite definido, permitir
            return { allowed: true };
        }

        const key = `${operation}:${identifier}`;
        const now = Date.now();

        // Inicializar si no existe
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const requests = this.requests.get(key);

        // Filtrar solicitudes dentro de la ventana de tiempo
        const validRequests = requests.filter(
            timestamp => now - timestamp < limit.windowMs
        );

        // Actualizar lista de solicitudes
        this.requests.set(key, validRequests);

        // Verificar si se excede el límite
        if (validRequests.length >= limit.maxRequests) {
            this._recordBlock(operation);

            const oldestRequest = Math.min(...validRequests);
            const resetTime = oldestRequest + limit.windowMs;
            const retryAfter = Math.ceil((resetTime - now) / 1000);

            return {
                allowed: false,
                retryAfter,
                limit: limit.maxRequests,
                remaining: 0,
                reset: new Date(resetTime)
            };
        }

        // Registrar nueva solicitud
        validRequests.push(now);
        this.requests.set(key, validRequests);
        this._recordAllow(operation);

        return {
            allowed: true,
            limit: limit.maxRequests,
            remaining: limit.maxRequests - validRequests.length,
            reset: new Date(now + limit.windowMs)
        };
    }

    /**
     * Consume puntos para una operación (rate limiting basado en costos)
     * @param {string} operation - Nombre de la operación
     * @param {string} identifier - Identificador único
     * @returns {Object} Resultado
     */
    consume(operation, identifier = 'default') {
        const limit = this.limits[operation];

        if (!limit) {
            return { allowed: true };
        }

        const key = `${operation}:${identifier}`;
        const now = Date.now();

        // Inicializar puntos si no existe
        if (!this.points.has(key)) {
            this.points.set(key, {
                points: 0,
                resetTime: now + limit.windowMs
            });
        }

        const pointData = this.points.get(key);

        // Resetear si pasó la ventana de tiempo
        if (now >= pointData.resetTime) {
            pointData.points = 0;
            pointData.resetTime = now + limit.windowMs;
        }

        // Calcular puntos necesarios
        const cost = limit.cost || 1;
        const maxPoints = limit.maxRequests * cost;

        // Verificar si hay suficientes puntos disponibles
        if (pointData.points + cost > maxPoints) {
            this._recordBlock(operation);

            const retryAfter = Math.ceil((pointData.resetTime - now) / 1000);

            return {
                allowed: false,
                retryAfter,
                pointsRemaining: maxPoints - pointData.points,
                pointsCost: cost,
                reset: new Date(pointData.resetTime)
            };
        }

        // Consumir puntos
        pointData.points += cost;
        this.points.set(key, pointData);
        this._recordAllow(operation);

        return {
            allowed: true,
            pointsRemaining: maxPoints - pointData.points,
            pointsCost: cost,
            reset: new Date(pointData.resetTime)
        };
    }

    /**
     * Ejecuta una operación con rate limiting
     * @param {string} operation - Nombre de la operación
     * @param {Function} callback - Función a ejecutar
     * @param {string} identifier - Identificador único
     * @returns {Promise<any>} Resultado de la operación
     */
    async execute(operation, callback, identifier = 'default') {
        const result = this.consume(operation, identifier);

        if (!result.allowed) {
            const error = new Error(`Rate limit excedido para ${operation}`);
            error.retryAfter = result.retryAfter;
            error.rateLimitInfo = result;
            throw error;
        }

        return await callback();
    }

    /**
     * Ejecuta una operación con cola de espera
     * @param {string} operation - Nombre de la operación
     * @param {Function} callback - Función a ejecutar
     * @param {string} identifier - Identificador único
     * @returns {Promise<any>} Resultado de la operación
     */
    async executeWithQueue(operation, callback, identifier = 'default') {
        const queueKey = `${operation}:${identifier}`;

        // Inicializar cola si no existe
        if (!this.queues.has(queueKey)) {
            this.queues.set(queueKey, []);
        }

        return new Promise((resolve, reject) => {
            const task = { callback, resolve, reject };
            const queue = this.queues.get(queueKey);

            queue.push(task);
            this._recordQueue(operation);

            // Procesar cola
            this._processQueue(operation, identifier);
        });
    }

    /**
     * Procesa la cola de espera
     * @private
     */
    async _processQueue(operation, identifier) {
        const queueKey = `${operation}:${identifier}`;
        const queue = this.queues.get(queueKey);

        if (!queue || queue.length === 0) return;

        const result = this.consume(operation, identifier);

        if (result.allowed) {
            const task = queue.shift();

            try {
                const result = await task.callback();
                task.resolve(result);
            } catch (error) {
                task.reject(error);
            }

            // Procesar siguiente tarea
            if (queue.length > 0) {
                setImmediate(() => this._processQueue(operation, identifier));
            }
        } else {
            // Reintentar después del tiempo de espera
            setTimeout(
                () => this._processQueue(operation, identifier),
                result.retryAfter * 1000
            );
        }
    }

    /**
     * Resetea el límite para una operación específica
     * @param {string} operation - Nombre de la operación
     * @param {string} identifier - Identificador único
     */
    reset(operation, identifier = 'default') {
        const key = `${operation}:${identifier}`;
        this.requests.delete(key);
        this.points.delete(key);
        this.queues.delete(key);
    }

    /**
     * Resetea todos los límites
     */
    resetAll() {
        this.requests.clear();
        this.points.clear();
        this.queues.clear();
    }

    /**
     * Limpia datos antiguos
     */
    cleanup() {
        const now = Date.now();

        // Limpiar solicitudes antiguas
        for (const [key, requests] of this.requests.entries()) {
            const operation = key.split(':')[0];
            const limit = this.limits[operation];

            if (!limit) continue;

            const validRequests = requests.filter(
                timestamp => now - timestamp < limit.windowMs
            );

            if (validRequests.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validRequests);
            }
        }

        // Limpiar puntos antiguos
        for (const [key, pointData] of this.points.entries()) {
            if (now >= pointData.resetTime) {
                this.points.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas de rate limiting
     * @returns {Object} Estadísticas
     */
    getStatistics() {
        return {
            ...this.stats,
            activeKeys: this.requests.size,
            queuedTasks: Array.from(this.queues.values()).reduce(
                (sum, queue) => sum + queue.length,
                0
            )
        };
    }

    /**
     * Obtiene información de límites para una operación
     * @param {string} operation - Nombre de la operación
     * @param {string} identifier - Identificador único
     * @returns {Object} Información de límites
     */
    getInfo(operation, identifier = 'default') {
        const limit = this.limits[operation];

        if (!limit) {
            return { exists: false };
        }

        const key = `${operation}:${identifier}`;
        const requests = this.requests.get(key) || [];
        const pointData = this.points.get(key);
        const queue = this.queues.get(key) || [];

        return {
            exists: true,
            limit: limit.maxRequests,
            windowMs: limit.windowMs,
            cost: limit.cost,
            currentRequests: requests.length,
            remaining: limit.maxRequests - requests.length,
            points: pointData?.points || 0,
            queueLength: queue.length
        };
    }

    /**
     * Registra una solicitud permitida
     * @private
     */
    _recordAllow(operation) {
        this.stats.allowed++;
        if (!this.stats.byOperation[operation]) {
            this.stats.byOperation[operation] = { allowed: 0, blocked: 0, queued: 0 };
        }
        this.stats.byOperation[operation].allowed++;
    }

    /**
     * Registra una solicitud bloqueada
     * @private
     */
    _recordBlock(operation) {
        this.stats.blocked++;
        if (!this.stats.byOperation[operation]) {
            this.stats.byOperation[operation] = { allowed: 0, blocked: 0, queued: 0 };
        }
        this.stats.byOperation[operation].blocked++;
    }

    /**
     * Registra una solicitud en cola
     * @private
     */
    _recordQueue(operation) {
        this.stats.queued++;
        if (!this.stats.byOperation[operation]) {
            this.stats.byOperation[operation] = { allowed: 0, blocked: 0, queued: 0 };
        }
        this.stats.byOperation[operation].queued++;
    }

    /**
     * Destruye el rate limiter y limpia recursos
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.resetAll();
    }
}

module.exports = RateLimiter;
