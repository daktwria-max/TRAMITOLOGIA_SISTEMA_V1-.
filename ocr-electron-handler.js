const { ipcMain, dialog } = require('electron');
const { OcrService, BatchProcessor, DocumentComparator, HistoryManager } = require('./ocr-system');
const Logger = require('./logger');

let ocrService = null;
let batchProcessor = null;
let comparator = null;
let historyManager = null;

function registerOcrHandlers() {
    if (ocrService) return; // Ya registrado

    Logger.info('Registrando handlers de OCR...');

    // Inicializar servicios
    ocrService = new OcrService();
    batchProcessor = new BatchProcessor(ocrService);
    comparator = new DocumentComparator();
    // historyManager se inicializará bajo demanda o aquí si tenemos la ruta de user data
    // Para simplificar, lo inicializamos perezosamente o en el primer uso, 
    // pero idealmente deberíamos pasar la ruta. El HistoryManager usa process.cwd()/data por default,
    // lo cual puede no ser ideal en producción. Mejor usar app.getPath('userData').
    // Sin embargo, por ahora usaremos el default del módulo o lo configuraremos.

    // Configurar HistoryManager con ruta correcta en producción si es necesario
    const { app } = require('electron');
    const path = require('path');
    const dbPath = path.join(app.getPath('userData'), 'ocr-history.db');
    historyManager = new HistoryManager(dbPath);

    // ==================== DIALOG HANDLERS ====================

    ipcMain.handle('dialog:selectFile', async (event, options) => {
        const { canceled, filePaths } = await dialog.showOpenDialog(options);
        return { canceled, filePaths };
    });

    ipcMain.handle('dialog:selectFiles', async (event, options) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            ...options,
            properties: ['openFile', 'multiSelections']
        });
        return { canceled, filePaths };
    });

    ipcMain.handle('dialog:saveFile', async (event, options) => {
        const { canceled, filePath } = await dialog.showSaveDialog(options);
        return { canceled, filePath };
    });

    ipcMain.handle('file:exists', async (event, filePath) => {
        const fs = require('fs');
        return fs.existsSync(filePath);
    });

    // ==================== OCR HANDLERS ====================

    // Handler para procesar documento individual
    ipcMain.handle('ocr:process', async (event, filePath) => {
        try {
            Logger.info(`Solicitud OCR recibida para: ${filePath}`);

            // Setup progress forwarding
            const progressCallback = (progress) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('ocr:progress', progress);
                }
            };

            const result = await ocrService.processDocument(filePath, { progressCallback });

            // Guardar en historial
            try {
                historyManager.saveDocument(filePath, result, {
                    fileSize: 0, // Podríamos obtenerlo con fs.stat
                    duration: 0 // Podríamos medirlo
                });
            } catch (histError) {
                Logger.error('Error guardando en historial OCR:', histError);
            }

            return { success: true, data: result };
        } catch (error) {
            Logger.error('Error en procesamiento OCR:', error);
            return { success: false, error: error.message };
        }
    });

    // Handler para procesar imagen
    ipcMain.handle('ocr:processImage', async (event, imagePath) => {
        try {
            const result = await ocrService.processImage(imagePath);
            // Guardar en historial
            try {
                historyManager.saveDocument(imagePath, result, { notes: 'Imagen' });
            } catch (histError) {
                Logger.error('Error guardando en historial OCR (Imagen):', histError);
            }
            return { success: true, data: result };
        } catch (error) {
            Logger.error('Error en procesamiento OCR de imagen:', error);
            return { success: false, error: error.message };
        }
    });

    // Handler para Batch
    ipcMain.handle('batch:addJobs', async (event, filePaths, options) => {
        try {
            Logger.info(`Iniciando lote OCR de ${filePaths.length} archivos`);
            const jobIds = batchProcessor.addJobs(filePaths, options);
            return { success: true, data: jobIds };
        } catch (error) {
            Logger.error('Error en batch OCR:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('batch:pause', async () => {
        batchProcessor.pause();
        return { success: true };
    });

    ipcMain.handle('batch:resume', async () => {
        batchProcessor.resume();
        return { success: true };
    });

    ipcMain.handle('batch:cancelJob', async (event, jobId) => {
        const result = batchProcessor.cancelJob(jobId);
        return { success: result };
    });

    ipcMain.handle('batch:cancelAll', async () => {
        batchProcessor.cancelAll();
        return { success: true };
    });

    ipcMain.handle('batch:getStatistics', async () => {
        return { success: true, data: batchProcessor.getStatistics() };
    });

    ipcMain.handle('batch:getAllJobs', async () => {
        return { success: true, data: batchProcessor.getAllJobs() };
    });

    ipcMain.handle('batch:exportResults', async () => {
        return { success: true, data: batchProcessor.exportResults() };
    });

    // Handler para Comparar
    ipcMain.handle('comparison:compare', async (event, doc1, doc2) => {
        try {
            // Need to read the files content first if they are paths? 
            // The OCR system 'compare' method expects objects (results) or maybe it can handle paths if we look at `ocr-system.js`.
            // Looking at `ocr-system.js` from previous turn: `compare(doc1, doc2)` -> usage: `comparator.compare(result1, result2)`.
            // The frontend passes filePaths? `AppState.doc1 = filePath`.
            // Wait, `compareDocuments` in `renderer.js` calls `window.electronAPI.compareDocuments(AppState.doc1, AppState.doc2)`.
            // So it passes PATHS.
            // But `DocumentComparator.compare` in `ocr-system.js` takes `doc1` and `doc2` objects with `textoCompleto`, `tipoDocumento`, etc.
            // So we need to PROCESS them (or load from history/cache) before comparing.

            // Let's implement logic to get the result object from the path.
            const getResult = async (path) => {
                // Try cache/history first? Or just process it?
                // For now, let's assume we need to process it if not in cache.
                return await ocrService.processDocument(path);
            };

            const result1 = await getResult(doc1);
            const result2 = await getResult(doc2);

            const comparison = comparator.compare(result1, result2);
            return { success: true, data: comparison };
        } catch (error) {
            Logger.error('Error comparando documentos:', error);
            return { success: false, error: error.message };
        }
    });

    // Handlers de Historial
    ipcMain.handle('history:getRecent', async (event, limit) => {
        try {
            const data = historyManager.getRecent(limit || 50);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('history:search', async (event, query, filters) => {
        try {
            const data = historyManager.search(query, filters);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('history:getSummary', async () => {
        try {
            return { success: true, data: historyManager.getSummary() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Check Status
    ipcMain.handle('ocr:checkStatus', async () => {
        return {
            initialized: ocrService.initialized,
            models: await require('./ocr-system').TesseractInitService.checkModels()
        };
    });

    // File Save (Requested by renderer)
    ipcMain.handle('file:save', async (event, filePath, content) => {
        const fs = require('fs/promises');
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Setup Batch Events
    batchProcessor.on('job:added', (job) => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:job-added', job));
    });
    batchProcessor.on('job:started', (job) => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:job-started', job));
    });
    batchProcessor.on('job:progress', (data) => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:job-progress', data));
    });
    batchProcessor.on('job:completed', (job) => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:job-completed', job));
    });
    batchProcessor.on('job:failed', (job) => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:job-failed', job));
    });
    batchProcessor.on('batch:paused', () => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:paused'));
    });
    batchProcessor.on('batch:resumed', () => {
        const windows = require('electron').BrowserWindow.getAllWindows();
        windows.forEach(w => w.webContents.send('batch:resumed'));
    });

    // Clear Cache
    ipcMain.handle('ocr:clearCache', async () => {
        ocrService.cacheManager.clear();
        return true;
    });
}

async function cleanupOcrService() {
    if (ocrService) {
        await ocrService.cleanup();
    }
    if (historyManager) {
        historyManager.close();
    }
}

module.exports = {
    registerOcrHandlers,
    cleanupOcrService
};
