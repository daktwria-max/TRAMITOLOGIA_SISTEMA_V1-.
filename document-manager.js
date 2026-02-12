/**
 * DOCUMENT MANAGER - SISTEMA COMPLETO DE GESTIÓN DE DOCUMENTOS
 * Manejo robusto de archivos con validación, seguridad y optimización
 * @version 2.0.0
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const mime = require('mime-types');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
    ALLOWED_EXTENSIONS: [
        // Documentos
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.rtf', '.odt', '.ods', '.odp',
        // Imágenes
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
        // CAD y técnicos
        '.dwg', '.dxf', '.dwf',
        // Comprimidos
        '.zip', '.rar', '.7z',
        // Otros
        '.csv', '.xml', '.json'
    ],
    MIME_TYPES_ALLOWED: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/zip'
    ],
    THUMBNAIL_SIZE: 200,
    ENABLE_VERSIONING: true,
    ENABLE_THUMBNAILS: true,
    ENABLE_HASH_VERIFICATION: true
};

// ==================== VALIDADORES ====================
class DocumentValidators {
    /**
     * Valida que el archivo existe
     */
    static async validateFileExists(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Ruta de archivo inválida');
        }

        const exists = await fs.pathExists(filePath);
        if (!exists) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }

        return true;
    }

    /**
     * Valida la extensión del archivo
     */
    static validateExtension(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        if (!CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
            throw new Error(
                `Extensión no permitida: ${ext}. ` +
                `Extensiones válidas: ${CONFIG.ALLOWED_EXTENSIONS.join(', ')}`
            );
        }

        return ext;
    }

    /**
     * Valida el tamaño del archivo
     */
    static async validateFileSize(filePath) {
        const stats = await fs.stat(filePath);

        if (stats.size > CONFIG.MAX_FILE_SIZE) {
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            const maxMB = (CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(2);
            throw new Error(
                `Archivo demasiado grande: ${sizeMB}MB. Máximo permitido: ${maxMB}MB`
            );
        }

        return stats.size;
    }

    /**
     * Valida el tipo MIME del archivo
     */
    static async validateMimeType(filePath) {
        const mimeType = mime.lookup(filePath);

        if (!mimeType || !CONFIG.MIME_TYPES_ALLOWED.includes(mimeType)) {
            throw new Error(
                `Tipo de archivo no permitido: ${mimeType || 'desconocido'}`
            );
        }

        return mimeType;
    }

    /**
     * Valida los metadatos del documento
     */
    static validateMetadata(metadata) {
        const required = ['proyecto_id', 'nombre'];

        for (const field of required) {
            if (!metadata[field]) {
                throw new Error(`Campo requerido: ${field}`);
            }
        }

        // Validar nombre de archivo
        if (metadata.nombre.length > 255) {
            throw new Error('Nombre de archivo demasiado largo (máx. 255 caracteres)');
        }

        // Sanitizar nombre
        const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
        if (invalidChars.test(metadata.nombre)) {
            throw new Error('Nombre de archivo contiene caracteres inválidos');
        }

        return true;
    }

    /**
     * Validación completa del archivo
     */
    static async validateFile(filePath, metadata) {
        await this.validateFileExists(filePath);
        this.validateExtension(filePath);
        await this.validateFileSize(filePath);
        await this.validateMimeType(filePath);
        this.validateMetadata(metadata);

        return true;
    }
}

// ==================== UTILIDADES DE ARCHIVO ====================
class FileUtils {
    /**
     * Calcula el hash SHA-256 de un archivo
     */
    static async calculateFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Genera un nombre único para el archivo
     */
    static generateUniqueFilename(originalName) {
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');

        return `${baseName}_${timestamp}_${random}${ext}`;
    }

    /**
     * Sanitiza el nombre de archivo
     */
    static sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 255);
    }

    /**
     * Obtiene información del archivo
     */
    static async getFileInfo(filePath) {
        const stats = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = mime.lookup(filePath);
        const hash = CONFIG.ENABLE_HASH_VERIFICATION
            ? await this.calculateFileHash(filePath)
            : null;

        return {
            size: stats.size,
            extension: ext,
            mimeType,
            hash,
            created: stats.birthtime,
            modified: stats.mtime
        };
    }

    /**
     * Copia archivo de forma segura
     */
    static async safeCopy(source, destination) {
        // Asegurar que el directorio destino existe
        await fs.ensureDir(path.dirname(destination));

        // Copiar con verificación
        await fs.copy(source, destination, {
            overwrite: false,
            errorOnExist: true
        });

        // Verificar integridad si está habilitado
        if (CONFIG.ENABLE_HASH_VERIFICATION) {
            const sourceHash = await this.calculateFileHash(source);
            const destHash = await this.calculateFileHash(destination);

            if (sourceHash !== destHash) {
                await fs.remove(destination);
                throw new Error('Error de integridad: los hashes no coinciden');
            }
        }

        return destination;
    }

    /**
     * Mueve archivo de forma segura (copia + elimina original)
     */
    static async safeMove(source, destination) {
        await this.safeCopy(source, destination);
        await fs.remove(source);
        return destination;
    }
}

// ==================== GESTOR DE VERSIONES ====================
class VersionManager {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    /**
     * Crea una nueva versión de un documento
     */
    async createVersion(documentId, filePath) {
        const versionDir = path.join(this.baseDir, 'versions', documentId);
        await fs.ensureDir(versionDir);

        const timestamp = Date.now();
        const ext = path.extname(filePath);
        const versionFile = path.join(versionDir, `v_${timestamp}${ext}`);

        await FileUtils.safeCopy(filePath, versionFile);

        return {
            version: timestamp,
            path: versionFile,
            size: (await fs.stat(versionFile)).size
        };
    }

    /**
     * Lista todas las versiones de un documento
     */
    async listVersions(documentId) {
        const versionDir = path.join(this.baseDir, 'versions', documentId);

        if (!await fs.pathExists(versionDir)) {
            return [];
        }

        const files = await fs.readdir(versionDir);
        const versions = [];

        for (const file of files) {
            const filePath = path.join(versionDir, file);
            const stats = await fs.stat(filePath);
            const versionMatch = file.match(/v_(\d+)/);

            if (versionMatch) {
                versions.push({
                    version: parseInt(versionMatch[1]),
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime
                });
            }
        }

        return versions.sort((a, b) => b.version - a.version);
    }

    /**
     * Restaura una versión específica
     */
    async restoreVersion(documentId, version, targetPath) {
        const versionDir = path.join(this.baseDir, 'versions', documentId);
        const versionFile = path.join(versionDir, `v_${version}${path.extname(targetPath)}`);

        if (!await fs.pathExists(versionFile)) {
            throw new Error(`Versión ${version} no encontrada`);
        }

        await FileUtils.safeCopy(versionFile, targetPath);
        return targetPath;
    }

    /**
     * Elimina versiones antiguas (mantiene las últimas N)
     */
    async cleanupOldVersions(documentId, keepLast = 5) {
        const versions = await this.listVersions(documentId);

        if (versions.length <= keepLast) {
            return 0;
        }

        const toDelete = versions.slice(keepLast);
        let deleted = 0;

        for (const version of toDelete) {
            try {
                await fs.remove(version.path);
                deleted++;
            } catch (error) {
                console.error(`Error eliminando versión ${version.version}:`, error);
            }
        }

        return deleted;
    }
}

// ==================== GESTOR PRINCIPAL DE DOCUMENTOS ====================
class DocumentManager {
    constructor(options = {}) {
        this.baseDir = options.baseDir || path.join(app.getPath('userData'), 'data', 'docs');
        this.versionManager = new VersionManager(this.baseDir);
        this.config = { ...CONFIG, ...options };
    }

    /**
     * Inicializa el gestor de documentos
     */
    async initialize() {
        await fs.ensureDir(this.baseDir);
        await fs.ensureDir(path.join(this.baseDir, 'versions'));
        await fs.ensureDir(path.join(this.baseDir, 'thumbnails'));

        console.log('✅ DocumentManager inicializado:', this.baseDir);
    }

    /**
     * Obtiene el directorio de un proyecto
     */
    getProjectDirectory(projectId) {
        return path.join(this.baseDir, projectId);
    }

    /**
     * Agrega un documento nuevo
     */
    async addDocument(sourceFilePath, metadata) {
        try {
            // 1. Validación completa
            await DocumentValidators.validateFile(sourceFilePath, metadata);

            // 2. Obtener información del archivo
            const fileInfo = await FileUtils.getFileInfo(sourceFilePath);

            // 3. Generar nombre único
            const uniqueFilename = FileUtils.generateUniqueFilename(metadata.nombre);

            // 4. Determinar ruta destino
            const projectDir = this.getProjectDirectory(metadata.proyecto_id);
            const targetPath = path.join(projectDir, uniqueFilename);

            // 5. Copiar archivo de forma segura
            await FileUtils.safeCopy(sourceFilePath, targetPath);

            // 6. Crear versión inicial si está habilitado
            let versionInfo = null;
            if (this.config.ENABLE_VERSIONING) {
                versionInfo = await this.versionManager.createVersion(
                    metadata.id || crypto.randomUUID(),
                    targetPath
                );
            }

            // 7. Preparar registro completo
            const document = {
                id: metadata.id || crypto.randomUUID(),
                proyecto_id: metadata.proyecto_id,
                nombre: metadata.nombre,
                nombre_archivo: uniqueFilename,
                tipo: fileInfo.extension.substring(1),
                mime_type: fileInfo.mimeType,
                ruta: targetPath,
                ruta_relativa: path.relative(this.baseDir, targetPath),
                tamanio: fileInfo.size,
                hash: fileInfo.hash,
                version: versionInfo ? versionInfo.version : 1,
                fecha_subida: new Date().toISOString(),
                fecha_modificacion: fileInfo.modified.toISOString(),
                notas: metadata.notas || null,
                etiquetas: metadata.etiquetas || null,
                fecha_vencimiento: metadata.fecha_vencimiento || null
            };

            console.log(`✅ Documento agregado: ${document.nombre} (${(fileInfo.size / 1024).toFixed(2)}KB)`);

            return document;

        } catch (error) {
            console.error('❌ Error agregando documento:', error);
            throw error;
        }
    }

    /**
     * Actualiza un documento existente (nueva versión)
     */
    async updateDocument(documentId, newFilePath, currentPath) {
        try {
            // Validar nuevo archivo
            await DocumentValidators.validateFileExists(newFilePath);
            const ext = DocumentValidators.validateExtension(newFilePath);
            await DocumentValidators.validateFileSize(newFilePath);

            // Crear versión del archivo actual
            if (this.config.ENABLE_VERSIONING && await fs.pathExists(currentPath)) {
                await this.versionManager.createVersion(documentId, currentPath);
            }

            // Reemplazar archivo
            await FileUtils.safeCopy(newFilePath, currentPath);

            // Obtener nueva información
            const fileInfo = await FileUtils.getFileInfo(currentPath);

            // Limpiar versiones antiguas
            if (this.config.ENABLE_VERSIONING) {
                await this.versionManager.cleanupOldVersions(documentId, 5);
            }

            return {
                tamanio: fileInfo.size,
                hash: fileInfo.hash,
                fecha_modificacion: new Date().toISOString(),
                version: Date.now()
            };

        } catch (error) {
            console.error('❌ Error actualizando documento:', error);
            throw error;
        }
    }

    /**
     * Elimina un documento
     */
    async deleteDocument(documentPath, documentId) {
        try {
            // Eliminar archivo principal
            if (await fs.pathExists(documentPath)) {
                await fs.remove(documentPath);
            }

            // Eliminar versiones
            if (this.config.ENABLE_VERSIONING) {
                const versionDir = path.join(this.baseDir, 'versions', documentId);
                if (await fs.pathExists(versionDir)) {
                    await fs.remove(versionDir);
                }
            }

            console.log(`🗑️ Documento eliminado: ${documentId}`);
            return true;

        } catch (error) {
            console.error('❌ Error eliminando documento:', error);
            throw error;
        }
    }

    /**
     * Mueve un documento a otro proyecto
     */
    async moveDocument(documentPath, fromProjectId, toProjectId, filename) {
        try {
            const newProjectDir = this.getProjectDirectory(toProjectId);
            const newPath = path.join(newProjectDir, filename);

            await FileUtils.safeMove(documentPath, newPath);

            return {
                ruta: newPath,
                ruta_relativa: path.relative(this.baseDir, newPath)
            };

        } catch (error) {
            console.error('❌ Error moviendo documento:', error);
            throw error;
        }
    }

    /**
     * Verifica la integridad de un documento
     */
    async verifyIntegrity(documentPath, expectedHash) {
        if (!this.config.ENABLE_HASH_VERIFICATION) {
            return { valid: true, message: 'Verificación deshabilitada' };
        }

        try {
            if (!await fs.pathExists(documentPath)) {
                return { valid: false, message: 'Archivo no encontrado' };
            }

            const currentHash = await FileUtils.calculateFileHash(documentPath);

            if (currentHash !== expectedHash) {
                return {
                    valid: false,
                    message: 'Hash no coincide',
                    expected: expectedHash,
                    current: currentHash
                };
            }

            return { valid: true, hash: currentHash };

        } catch (error) {
            return { valid: false, message: error.message };
        }
    }

    /**
     * Obtiene estadísticas de documentos
     */
    async getStatistics(projectId = null) {
        try {
            const targetDir = projectId
                ? this.getProjectDirectory(projectId)
                : this.baseDir;

            if (!await fs.pathExists(targetDir)) {
                return { count: 0, totalSize: 0 };
            }

            let count = 0;
            let totalSize = 0;
            const extensions = {};

            const processDirectory = async (dir) => {
                const items = await fs.readdir(dir);

                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        await processDirectory(itemPath);
                    } else {
                        count++;
                        totalSize += stats.size;

                        const ext = path.extname(item).toLowerCase();
                        extensions[ext] = (extensions[ext] || 0) + 1;
                    }
                }
            };

            await processDirectory(targetDir);

            return {
                count,
                totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                extensions,
                directory: targetDir
            };

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return { count: 0, totalSize: 0, error: error.message };
        }
    }

    /**
     * Lista versiones de un documento
     */
    async listVersions(documentId) {
        return await this.versionManager.listVersions(documentId);
    }

    /**
     * Restaura una versión específica
     */
    async restoreVersion(documentId, version, targetPath) {
        return await this.versionManager.restoreVersion(documentId, version, targetPath);
    }
}

module.exports = DocumentManager;
module.exports.DocumentValidators = DocumentValidators;
module.exports.FileUtils = FileUtils;
module.exports.CONFIG = CONFIG;
