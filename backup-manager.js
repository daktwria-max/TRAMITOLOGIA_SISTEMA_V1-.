/**
 * BACKUP MANAGER
 * Sistema de respaldo automático de base de datos
 * @version 1.0.0
 */

const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class BackupManager {
    constructor(databasePath, options = {}) {
        this.databasePath = databasePath;
        this.backupDir = options.backupDir || path.join(app.getPath('userData'), 'backups');
        this.maxBackups = options.maxBackups || 10;
        this.autoBackupInterval = options.autoBackupInterval || 3600000; // 1 hora por defecto
        this.compressionEnabled = options.compressionEnabled !== false;
        this.encryptionEnabled = options.encryptionEnabled || false;
        this.encryptionKey = options.encryptionKey || null;

        this.autoBackupTimer = null;
        this.backupLog = [];
        this.isBackingUp = false;

        this._initialize();
    }

    /**
     * Inicializa el gestor de respaldos
     * @private
     */
    async _initialize() {
        try {
            await fs.ensureDir(this.backupDir);
            console.log(`[BackupManager] Directorio de respaldos: ${this.backupDir}`);
        } catch (error) {
            console.error('[BackupManager] Error creando directorio de respaldos:', error);
        }
    }

    /**
     * Inicia el sistema de respaldo automático
     * @param {number} intervalMs - Intervalo en milisegundos
     */
    startAutoBackup(intervalMs = null) {
        if (this.autoBackupTimer) {
            this.stopAutoBackup();
        }

        const interval = intervalMs || this.autoBackupInterval;

        this.autoBackupTimer = setInterval(async () => {
            try {
                await this.createBackup({ auto: true });
            } catch (error) {
                console.error('[BackupManager] Error en respaldo automático:', error);
            }
        }, interval);

        console.log(`[BackupManager] Respaldo automático iniciado (intervalo: ${interval}ms)`);

        // Crear respaldo inicial
        setTimeout(() => this.createBackup({ auto: true, initial: true }), 5000);
    }

    /**
     * Detiene el sistema de respaldo automático
     */
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
            console.log('[BackupManager] Respaldo automático detenido');
        }
    }

    /**
     * Crea un respaldo de la base de datos
     * @param {Object} options - Opciones del respaldo
     * @returns {Promise<Object>} Información del respaldo
     */
    async createBackup(options = {}) {
        if (this.isBackingUp) {
            throw new Error('Ya hay un respaldo en progreso');
        }

        this.isBackingUp = true;
        const startTime = Date.now();

        try {
            // Verificar que la base de datos existe
            if (!await fs.pathExists(this.databasePath)) {
                throw new Error('Base de datos no encontrada');
            }

            // Generar nombre del respaldo
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const type = options.auto ? 'auto' : 'manual';
            const backupName = `backup_${type}_${timestamp}`;

            // Leer base de datos
            let data = await fs.readFile(this.databasePath);
            const originalSize = data.length;

            // Calcular hash para verificación de integridad
            const hash = crypto.createHash('sha256').update(data).digest('hex');

            // Comprimir si está habilitado
            if (this.compressionEnabled) {
                data = await gzip(data);
            }

            // Encriptar si está habilitado
            if (this.encryptionEnabled && this.encryptionKey) {
                data = this._encrypt(data);
            }

            // Guardar respaldo
            const ext = this.compressionEnabled ? '.gz' : '.db';
            const backupPath = path.join(this.backupDir, `${backupName}${ext}`);
            await fs.writeFile(backupPath, data);

            // Crear archivo de metadatos
            const metadata = {
                timestamp: new Date().toISOString(),
                type,
                originalSize,
                compressedSize: data.length,
                compressionRatio: ((1 - data.length / originalSize) * 100).toFixed(2) + '%',
                hash,
                compressed: this.compressionEnabled,
                encrypted: this.encryptionEnabled,
                databasePath: this.databasePath
            };

            await fs.writeJSON(backupPath + '.meta.json', metadata, { spaces: 2 });

            // Registrar respaldo
            const backupInfo = {
                ...metadata,
                path: backupPath,
                duration: Date.now() - startTime
            };

            this.backupLog.push(backupInfo);
            console.log(`[BackupManager] Respaldo creado: ${backupName} (${backupInfo.duration}ms)`);

            // Limpiar respaldos antiguos
            await this.cleanOldBackups();

            return backupInfo;

        } catch (error) {
            console.error('[BackupManager] Error creando respaldo:', error);
            throw error;
        } finally {
            this.isBackingUp = false;
        }
    }

    /**
     * Restaura la base de datos desde un respaldo
     * @param {string} backupPath - Ruta del respaldo
     * @param {Object} options - Opciones de restauración
     * @returns {Promise<Object>} Información de la restauración
     */
    async restoreBackup(backupPath, options = {}) {
        const startTime = Date.now();

        try {
            // Verificar que el respaldo existe
            if (!await fs.pathExists(backupPath)) {
                throw new Error('Archivo de respaldo no encontrado');
            }

            // Leer metadatos
            const metaPath = backupPath + '.meta.json';
            let metadata = null;

            if (await fs.pathExists(metaPath)) {
                metadata = await fs.readJSON(metaPath);
            }

            // Crear respaldo de seguridad de la BD actual antes de restaurar
            if (!options.skipCurrentBackup) {
                await this.createBackup({ auto: false, preRestore: true });
            }

            // Leer datos del respaldo
            let data = await fs.readFile(backupPath);

            // Desencriptar si es necesario
            if (metadata?.encrypted && this.encryptionEnabled && this.encryptionKey) {
                data = this._decrypt(data);
            }

            // Descomprimir si es necesario
            if (metadata?.compressed || backupPath.endsWith('.gz')) {
                data = await gunzip(data);
            }

            // Verificar integridad si hay hash disponible
            if (metadata?.hash) {
                const hash = crypto.createHash('sha256').update(data).digest('hex');
                if (hash !== metadata.hash) {
                    throw new Error('Error de integridad: hash no coincide');
                }
            }

            // Restaurar base de datos
            await fs.writeFile(this.databasePath, data);

            const restoreInfo = {
                backupPath,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                size: data.length,
                verified: !!metadata?.hash
            };

            console.log(`[BackupManager] Base de datos restaurada (${restoreInfo.duration}ms)`);

            return restoreInfo;

        } catch (error) {
            console.error('[BackupManager] Error restaurando respaldo:', error);
            throw error;
        }
    }

    /**
     * Lista todos los respaldos disponibles
     * @returns {Promise<Array>} Lista de respaldos
     */
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.endsWith('.meta.json')) continue;

                const filePath = path.join(this.backupDir, file);
                const metaPath = filePath + '.meta.json';

                let metadata = null;
                if (await fs.pathExists(metaPath)) {
                    metadata = await fs.readJSON(metaPath);
                }

                const stats = await fs.stat(filePath);

                backups.push({
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    metadata
                });
            }

            // Ordenar por fecha de creación (más reciente primero)
            backups.sort((a, b) => b.created - a.created);

            return backups;

        } catch (error) {
            console.error('[BackupManager] Error listando respaldos:', error);
            return [];
        }
    }

    /**
     * Elimina respaldos antiguos según la política de retención
     * @returns {Promise<number>} Número de respaldos eliminados
     */
    async cleanOldBackups() {
        try {
            const backups = await this.listBackups();

            if (backups.length <= this.maxBackups) {
                return 0;
            }

            const toDelete = backups.slice(this.maxBackups);
            let deleted = 0;

            for (const backup of toDelete) {
                try {
                    await fs.remove(backup.path);

                    // Eliminar archivo de metadatos
                    const metaPath = backup.path + '.meta.json';
                    if (await fs.pathExists(metaPath)) {
                        await fs.remove(metaPath);
                    }

                    deleted++;
                } catch (error) {
                    console.error(`[BackupManager] Error eliminando ${backup.filename}:`, error);
                }
            }

            if (deleted > 0) {
                console.log(`[BackupManager] ${deleted} respaldo(s) antiguo(s) eliminado(s)`);
            }

            return deleted;

        } catch (error) {
            console.error('[BackupManager] Error limpiando respaldos:', error);
            return 0;
        }
    }

    /**
     * Elimina un respaldo específico
     * @param {string} backupPath - Ruta del respaldo
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async deleteBackup(backupPath) {
        try {
            await fs.remove(backupPath);

            const metaPath = backupPath + '.meta.json';
            if (await fs.pathExists(metaPath)) {
                await fs.remove(metaPath);
            }

            console.log(`[BackupManager] Respaldo eliminado: ${backupPath}`);
            return true;

        } catch (error) {
            console.error('[BackupManager] Error eliminando respaldo:', error);
            return false;
        }
    }

    /**
     * Obtiene estadísticas de respaldos
     * @returns {Promise<Object>} Estadísticas
     */
    async getStatistics() {
        const backups = await this.listBackups();

        const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
        const autoBackups = backups.filter(b => b.metadata?.type === 'auto').length;
        const manualBackups = backups.filter(b => b.metadata?.type === 'manual').length;

        return {
            total: backups.length,
            autoBackups,
            manualBackups,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            oldestBackup: backups[backups.length - 1]?.created,
            newestBackup: backups[0]?.created,
            autoBackupEnabled: !!this.autoBackupTimer,
            backupDirectory: this.backupDir
        };
    }

    /**
     * Verifica la integridad de un respaldo
     * @param {string} backupPath - Ruta del respaldo
     * @returns {Promise<Object>} Resultado de la verificación
     */
    async verifyBackup(backupPath) {
        try {
            const metaPath = backupPath + '.meta.json';

            if (!await fs.pathExists(metaPath)) {
                return { valid: false, error: 'Metadatos no encontrados' };
            }

            const metadata = await fs.readJSON(metaPath);
            let data = await fs.readFile(backupPath);

            // Desencriptar si es necesario
            if (metadata.encrypted && this.encryptionEnabled && this.encryptionKey) {
                data = this._decrypt(data);
            }

            // Descomprimir si es necesario
            if (metadata.compressed) {
                data = await gunzip(data);
            }

            // Verificar hash
            const hash = crypto.createHash('sha256').update(data).digest('hex');
            const valid = hash === metadata.hash;

            return {
                valid,
                hash,
                expectedHash: metadata.hash,
                size: data.length,
                metadata
            };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Encripta datos
     * @private
     */
    _encrypt(data) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

        return Buffer.concat([iv, encrypted]);
    }

    /**
     * Desencripta datos
     * @private
     */
    _decrypt(data) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = data.slice(0, 16);
        const encrypted = data.slice(16);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
}

module.exports = BackupManager;
