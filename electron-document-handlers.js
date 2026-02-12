/**
 * ELECTRON IPC HANDLERS - DOCUMENTOS
 * Handlers mejorados para gestión completa de documentos
 * @version 2.0.0
 */

const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { shell } = require('electron');

/**
 * Registra todos los handlers IPC para documentos
 */
function registerDocumentHandlers(documentManager, rateLimiter, database) {

    // ==================== SELECCIÓN DE ARCHIVOS ====================

    /**
     * Abre diálogo nativo para seleccionar archivo
     */
    ipcMain.handle('document:select-file', async (event, options = {}) => {
        try {
            const result = await dialog.showOpenDialog({
                title: options.title || 'Seleccionar Documento',
                properties: ['openFile'],
                filters: options.filters || [
                    { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] },
                    { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
                    { name: 'Todos los archivos', extensions: ['*'] }
                ]
            });

            if (result.canceled) {
                return { success: false, canceled: true };
            }

            const filePath = result.filePaths[0];
            const stats = await fs.stat(filePath);

            return {
                success: true,
                filePath,
                fileName: path.basename(filePath),
                fileSize: stats.size,
                fileSizeMB: (stats.size / 1024 / 1024).toFixed(2)
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Abre diálogo para seleccionar múltiples archivos
     */
    ipcMain.handle('document:select-multiple-files', async (event, options = {}) => {
        try {
            const result = await dialog.showOpenDialog({
                title: options.title || 'Seleccionar Documentos',
                properties: ['openFile', 'multiSelections'],
                filters: options.filters || [
                    { name: 'Todos los archivos', extensions: ['*'] }
                ]
            });

            if (result.canceled) {
                return { success: false, canceled: true };
            }

            const files = [];
            for (const filePath of result.filePaths) {
                const stats = await fs.stat(filePath);
                files.push({
                    path: filePath,
                    name: path.basename(filePath),
                    size: stats.size,
                    sizeMB: (stats.size / 1024 / 1024).toFixed(2)
                });
            }

            return { success: true, files };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== AGREGAR DOCUMENTOS ====================

    /**
     * Agrega un documento con rate limiting y validación completa
     */
    ipcMain.handle('document:add', async (event, documentData) => {
        try {
            // Rate limiting
            const result = await rateLimiter.execute('fileUpload', async () => {

                // Agregar documento usando DocumentManager
                const document = await documentManager.addDocument(
                    documentData.ruta,
                    {
                        id: documentData.id,
                        proyecto_id: documentData.proyecto_id,
                        nombre: documentData.nombre,
                        notas: documentData.notas,
                        etiquetas: documentData.etiquetas,
                        fecha_vencimiento: documentData.fecha_vencimiento
                    }
                );

                // Guardar en base de datos
                await database.agregarDocumento(document);

                return document;
            });

            return { success: true, data: result };

        } catch (error) {
            // Manejo de rate limiting
            if (error.rateLimitInfo) {
                return {
                    success: false,
                    rateLimited: true,
                    error: `Límite de subida excedido. Intente en ${error.retryAfter} segundos.`,
                    retryAfter: error.retryAfter
                };
            }

            return { success: false, error: error.message };
        }
    });

    /**
     * Agrega múltiples documentos en batch
     */
    ipcMain.handle('document:add-batch', async (event, documents) => {
        try {
            const results = [];
            const errors = [];

            for (let i = 0; i < documents.length; i++) {
                try {
                    const result = await rateLimiter.execute('fileUpload', async () => {
                        const doc = documents[i];

                        const document = await documentManager.addDocument(
                            doc.ruta,
                            {
                                proyecto_id: doc.proyecto_id,
                                nombre: doc.nombre,
                                notas: doc.notas
                            }
                        );

                        await database.agregarDocumento(document);
                        return document;
                    });

                    results.push(result);

                } catch (error) {
                    errors.push({
                        index: i,
                        file: documents[i].nombre,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                uploaded: results.length,
                failed: errors.length,
                results,
                errors
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== ACTUALIZAR DOCUMENTOS ====================

    /**
     * Actualiza un documento existente (nueva versión)
     */
    ipcMain.handle('document:update', async (event, { documentId, newFilePath, currentPath }) => {
        try {
            const updates = await documentManager.updateDocument(
                documentId,
                newFilePath,
                currentPath
            );

            // Actualizar en base de datos
            await database.actualizarDocumento(documentId, updates);

            return { success: true, data: updates };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Actualiza metadatos de un documento
     */
    ipcMain.handle('document:update-metadata', async (event, { documentId, metadata }) => {
        try {
            await database.actualizarDocumento(documentId, metadata);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== ELIMINAR DOCUMENTOS ====================

    /**
     * Elimina un documento
     */
    ipcMain.handle('document:delete', async (event, { documentId, documentPath }) => {
        try {
            // Eliminar archivo físico
            await documentManager.deleteDocument(documentPath, documentId);

            // Eliminar de base de datos
            await database.eliminarDocumento(documentId);

            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Elimina múltiples documentos
     */
    ipcMain.handle('document:delete-batch', async (event, documents) => {
        try {
            const results = { deleted: 0, failed: 0, errors: [] };

            for (const doc of documents) {
                try {
                    await documentManager.deleteDocument(doc.ruta, doc.id);
                    await database.eliminarDocumento(doc.id);
                    results.deleted++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        id: doc.id,
                        name: doc.nombre,
                        error: error.message
                    });
                }
            }

            return { success: true, ...results };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== OPERACIONES DE ARCHIVO ====================

    /**
     * Abre un documento con la aplicación predeterminada
     */
    ipcMain.handle('document:open', async (event, documentPath) => {
        try {
            if (!await fs.pathExists(documentPath)) {
                throw new Error('Archivo no encontrado');
            }

            await shell.openPath(documentPath);
            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Muestra el documento en el explorador de archivos
     */
    ipcMain.handle('document:show-in-folder', async (event, documentPath) => {
        try {
            if (!await fs.pathExists(documentPath)) {
                throw new Error('Archivo no encontrado');
            }

            shell.showItemInFolder(documentPath);
            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Copia un documento a otra ubicación
     */
    ipcMain.handle('document:copy-to', async (event, { sourcePath, destinationDir }) => {
        try {
            const fileName = path.basename(sourcePath);
            const destPath = path.join(destinationDir, fileName);

            await fs.copy(sourcePath, destPath);

            return { success: true, path: destPath };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Mueve un documento a otro proyecto
     */
    ipcMain.handle('document:move-to-project', async (event, { documentId, documentPath, fromProjectId, toProjectId, filename }) => {
        try {
            const newPaths = await documentManager.moveDocument(
                documentPath,
                fromProjectId,
                toProjectId,
                filename
            );

            // Actualizar en base de datos
            await database.actualizarDocumento(documentId, {
                proyecto_id: toProjectId,
                ruta: newPaths.ruta,
                ruta_relativa: newPaths.ruta_relativa
            });

            return { success: true, ...newPaths };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== VERSIONES ====================

    /**
     * Lista versiones de un documento
     */
    ipcMain.handle('document:list-versions', async (event, documentId) => {
        try {
            const versions = await documentManager.listVersions(documentId);
            return { success: true, versions };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Restaura una versión específica
     */
    ipcMain.handle('document:restore-version', async (event, { documentId, version, targetPath }) => {
        try {
            await documentManager.restoreVersion(documentId, version, targetPath);

            // Actualizar fecha de modificación en BD
            await database.actualizarDocumento(documentId, {
                fecha_modificacion: new Date().toISOString()
            });

            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== VERIFICACIÓN E INTEGRIDAD ====================

    /**
     * Verifica la integridad de un documento
     */
    ipcMain.handle('document:verify-integrity', async (event, { documentPath, expectedHash }) => {
        try {
            const result = await documentManager.verifyIntegrity(documentPath, expectedHash);
            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Verifica si un archivo existe
     */
    ipcMain.handle('document:check-exists', async (event, documentPath) => {
        try {
            const exists = await fs.pathExists(documentPath);
            return { success: true, exists };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ==================== ESTADÍSTICAS ====================

    /**
     * Obtiene estadísticas de documentos
     */
    ipcMain.handle('document:get-statistics', async (event, projectId = null) => {
        try {
            const stats = await documentManager.getStatistics(projectId);
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtiene información detallada de un archivo
     */
    ipcMain.handle('document:get-file-info', async (event, filePath) => {
        try {
            const FileUtils = require('./document-manager').FileUtils;
            const info = await FileUtils.getFileInfo(filePath);
            return { success: true, data: info };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Lee el contenido de un archivo de texto
     */
    ipcMain.handle('document:read-file', async (event, filePath) => {
        try {
            if (!await fs.pathExists(filePath)) {
                throw new Error('Archivo no encontrado');
            }
            const content = await fs.readFile(filePath, 'utf-8');
            return { success: true, data: content };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    console.log('✅ Handlers de documentos registrados');
}

module.exports = { registerDocumentHandlers };
