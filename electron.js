console.log('DEBUG: Electron process starting...');
/**
 * ELECTRON.JS - INTEGRACIÓN CON MÓDULOS AVANZADOS
 * Transacciones, Respaldos Automáticos y Rate Limiting
 * @version 2.1.0
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

// Importar módulos avanzados
// Importar módulos avanzados
console.log('DEBUG: Importing advanced modules...');
const TransactionManager = require('./transaction-manager');
const BackupManager = require('./backup-manager');
const RateLimiter = require('./rate-limiter');
const DocumentManager = require('./document-manager');
const { registerDocumentHandlers } = require('./electron-document-handlers');
const { registerOcrHandlers, cleanupOcrService } = require('./ocr-electron-handler');
console.log('DEBUG: Advanced modules imported.');

// ==================== CONFIGURACIÓN Y CONSTANTES ====================
const CONFIG = {
    LOG_PATH: path.join(__dirname, 'APP_LOG.txt'),
    DOCS_FOLDER: 'TRAMITOLOGIA_REPORTES',
    WINDOW: {
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768
    },
    MODULES_LOAD_DELAY: 1500
};

// ==================== SISTEMA DE LOGGING MEJORADO ====================
class Logger {
    static log(msg, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${msg}\n`;

        try {
            fs.appendFileSync(CONFIG.LOG_PATH, logEntry);
            if (level === 'ERROR') console.error(logEntry);
            else console.log(logEntry);
        } catch (e) {
            console.error('Error escribiendo log:', e);
        }
    }

    static error(msg, error) {
        this.log(`${msg} - ${error?.message || error}`, 'ERROR');
        if (error?.stack) this.log(error.stack, 'STACK');
    }

    static warn(msg) { this.log(msg, 'WARN'); }
    static info(msg) { this.log(msg, 'INFO'); }
}

// ==================== GESTOR DE ESTADO GLOBAL ====================
class AppState {
    constructor() {
        this.window = null;
        this.database = null;
        this.modules = {
            reportGenerator: null,
            ocrProcessor: null,
            optimizer: null
        };
        this.isReady = false;
    }

    setWindow(win) { this.window = win; }
    setDatabase(db) { this.database = db; }
    setModule(name, module) { this.modules[name] = module; }
    getModule(name) { return this.modules[name]; }

    isModuleReady(name) { return !!this.modules[name]; }

    getSystemStatus() {
        return {
            database: !!this.database,
            reportGenerator: this.isModuleReady('reportGenerator'),
            ocrProcessor: this.isModuleReady('ocrProcessor'),
            optimizer: this.isModuleReady('optimizer'),
            version: app.getVersion()
        };
    }
}

const appState = new AppState();
let transactionManager;
let backupManager;
let rateLimiter;

// ==================== VALIDADORES ====================
class Validators {
    static isValidPath(filePath) {
        try {
            return filePath && typeof filePath === 'string' && fs.existsSync(filePath);
        } catch {
            return false;
        }
    }

    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9._-]/gi, '_').substring(0, 255);
    }

    static isValidProjectId(id) {
        return id && (typeof id === 'string' || typeof id === 'number');
    }

    static validateDocumentData(doc) {
        if (!doc) throw new Error('Documento inválido');
        if (!doc.proyecto_id) throw new Error('ID de proyecto requerido');
        if (!doc.nombre) throw new Error('Nombre de documento requerido');
        return true;
    }
}

// ==================== GESTOR DE ARCHIVOS SEGURO ====================
class FileManager {
    static async copyDocumentSafely(sourcePath, projectId) {
        // Validar origen
        if (!Validators.isValidPath(sourcePath)) {
            throw new Error('Archivo de origen no válido o no existe');
        }

        const fileName = path.basename(sourcePath);
        const sanitizedName = Validators.sanitizeFilename(fileName);

        // Crear estructura de carpetas por proyecto
        const projectFolder = path.join(
            app.getPath('userData'),
            'documentos',
            `proyecto_${projectId}`
        );

        await fs.ensureDir(projectFolder);

        // Generar nombre único con hash
        const timestamp = Date.now();
        const hash = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(sanitizedName);
        const baseName = path.basename(sanitizedName, ext);
        const uniqueName = `${timestamp}_${hash}_${baseName}${ext}`;

        const targetPath = path.join(projectFolder, uniqueName);

        // Copiar con verificación
        await fs.copy(sourcePath, targetPath, { overwrite: false });

        // Verificar integridad
        const sourceStats = await fs.stat(sourcePath);
        const targetStats = await fs.stat(targetPath);

        if (sourceStats.size !== targetStats.size) {
            await fs.remove(targetPath);
            throw new Error('Error de integridad en copia de archivo');
        }

        return targetPath;
    }

    static async openDocument(filePath) {
        if (!Validators.isValidPath(filePath)) {
            throw new Error('Archivo no encontrado');
        }

        const result = await shell.openPath(filePath);
        if (result) {
            throw new Error(`Error abriendo documento: ${result}`);
        }
    }

    static async ensureReportsDirectory() {
        const reportsPath = path.join(app.getPath('documents'), CONFIG.DOCS_FOLDER);
        await fs.ensureDir(reportsPath);
        return reportsPath;
    }
}

// ==================== CREACIÓN DE VENTANA ====================
function createWindow() {
    appState.setWindow(new BrowserWindow({
        ...CONFIG.WINDOW,
        frame: false,
        titleBarStyle: 'hidden',
        icon: path.join(__dirname, 'resources', 'icon.png'),
        backgroundColor: '#1a1a1a',
        show: false, // Mostrar solo cuando esté listo
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    }));

    const win = appState.window;

    // Mostrar ventana cuando esté lista
    win.once('ready-to-show', () => {
        win.show();
        Logger.info('Ventana principal mostrada');
    });

    win.loadFile('public/index.html');
    win.removeMenu();
    win.setMenu(null);

    // Manejo de errores de carga
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        Logger.error('Error cargando interfaz', errorDescription);
    });
}

// ==================== INICIALIZACIÓN DE BASE DE DATOS ====================
async function initializeDatabase() {
    try {
        const db = require('./database');
        await db.initDatabase();
        appState.setDatabase(db);
        Logger.info('Base de datos inicializada correctamente');
        return db;
    } catch (error) {
        Logger.error('Error crítico inicializando base de datos', error);
        throw error;
    }
}

// ==================== CARGA DE MÓDULOS OPCIONALES ====================
async function loadOptionalModules() {
    const modules = [
        { name: 'reportGenerator', file: 'report-generator.js', key: 'ReportGenerator' },
        { name: 'ocrProcessor', file: 'ocr-processor.js', key: 'OCRProcessor' },
        { name: 'optimizer', file: 'performance-optimizer.js', key: 'Optimizer' }
    ];

    for (const module of modules) {
        try {
            const modulePath = path.join(__dirname, module.file);

            if (!fs.existsSync(modulePath)) {
                Logger.warn(`Módulo ${module.name} no encontrado (${module.file})`);
                continue;
            }

            const ModuleClass = require(modulePath);

            if (module.name === 'optimizer') {
                const optimizer = new ModuleClass();
                if (appState.database?.db?.db) {
                    optimizer.crearIndices(appState.database.db.db);
                }
                optimizer.limpiarMemoria();
                appState.setModule(module.name, optimizer);
            } else {
                appState.setModule(module.name, ModuleClass);
            }

            Logger.info(`Módulo ${module.name} cargado exitosamente`);
        } catch (error) {
            Logger.error(`Error cargando módulo ${module.name}`, error);
        }
    }
}

// ==================== INICIALIZACIÓN DE MÓDULOS AVANZADOS ====================
async function initializeAdvancedModules() {
    console.log('DEBUG: Initializing advanced modules...');
    try {
        const dbPath = path.join(app.getPath('userData'), 'tramitologia.db');

        // 1. Transaction Manager
        if (appState.database?.db) {
            console.log('DEBUG: Initializing TransactionManager...');
            transactionManager = new TransactionManager(appState.database.db);
            Logger.info('TransactionManager inicializado');


            // Limpiar transacciones antiguas cada 5 minutos
            setInterval(() => {
                const cleaned = transactionManager.cleanupStaleTransactions();
                if (cleaned > 0) {
                    Logger.warn(`${cleaned} transacciones obsoletas limpiadas`);
                }
            }, 300000);
        }

        // 2. Backup Manager
        console.log('DEBUG: Initializing BackupManager...');
        // Usar la misma ruta que la base de datos
        const actualDbPath = appState.database.getDatabasePath ? appState.database.getDatabasePath() : dbPath;
        console.log(`DEBUG: BackupManager path: ${actualDbPath}`);
        backupManager = new BackupManager(actualDbPath, {
            maxBackups: 10,
            autoBackupInterval: 3600000, // 1 hora
            compressionEnabled: true,
            encryptionEnabled: false // Cambiar a true y configurar clave en producción
        });

        // Iniciar respaldos automáticos
        backupManager.startAutoBackup();
        Logger.info('BackupManager inicializado con respaldos automáticos');

        // 3. Rate Limiter
        rateLimiter = new RateLimiter({
            limits: {
                ocr: { maxRequests: 10, windowMs: 60000, cost: 10 },
                pdf: { maxRequests: 20, windowMs: 60000, cost: 5 },
                backup: { maxRequests: 5, windowMs: 300000, cost: 20 },
                database: { maxRequests: 100, windowMs: 60000, cost: 1 },
                fileUpload: { maxRequests: 50, windowMs: 60000, cost: 2 }
            }
        });
        Logger.info('RateLimiter inicializado');

        // 4. Document Manager
        const documentManager = new DocumentManager();
        await documentManager.initialize();
        registerDocumentHandlers(documentManager, rateLimiter, appState.database);

        Logger.info('DocumentManager inicializado y handlers registrados');

        // 5. OCR System
        registerOcrHandlers();
        Logger.info('Sistema OCR registrado');

    } catch (error) {
        Logger.error('Error inicializando módulos avanzados', error);
        throw error;
    }
}

// ==================== MANEJADORES IPC - VENTANA ====================
ipcMain.handle('window-minimize', () => appState.window?.minimize());
ipcMain.handle('window-maximize', () => {
    const win = appState.window;
    if (!win) return;
    win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.handle('window-close', () => appState.window?.close());

// ==================== MANEJADORES IPC - SISTEMA ====================
ipcMain.handle('verificar-sistema', () => appState.getSystemStatus());

ipcMain.handle('obtener-estadisticas-rendimiento', () => {
    const optimizer = appState.getModule('optimizer');
    return optimizer ? optimizer.obtenerEstadisticas() : { error: 'Optimizador no disponible' };
});

ipcMain.handle('limpiar-cache-sistema', () => {
    const optimizer = appState.getModule('optimizer');
    if (optimizer) {
        optimizer.limpiarMemoria();
        return { success: true };
    }
    return { success: false, error: 'Optimizador no disponible' };
});

// ==================== MANEJADORES IPC - PROYECTOS ====================
ipcMain.handle('obtener-proyectos', async (event, filtros) => {
    try {
        const data = appState.database.obtenerProyectos(filtros || {});
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo proyectos', error);
        return { success: false, error: error.message };
    }
});

// Crear proyecto con transacción
ipcMain.handle('crear-proyecto', async (event, proyecto) => {
    try {
        const result = await transactionManager.execute(async () => {
            const data = appState.database.crearProyecto(proyecto);

            // Crear registro de auditoría
            appState.database.db.run(
                'INSERT INTO auditoria (accion, entidad, entidad_id, usuario) VALUES (?, ?, ?, ?)',
                ['CREATE', 'proyecto', data.id, 'system']
            );

            Logger.info(`Proyecto creado con transacción: ${data.id}`);
            return data;
        });

        return { success: true, data: result };
    } catch (error) {
        Logger.error('Error creando proyecto', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('obtener-proyecto', async (event, id) => {
    try {
        if (!Validators.isValidProjectId(id)) {
            throw new Error('ID de proyecto inválido');
        }
        const data = appState.database.obtenerProyectoPorId(id);
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo proyecto', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - TAREAS ====================
ipcMain.handle('obtener-tareas', async (event, filtros) => {
    try {
        const data = appState.database.obtenerTareas(filtros || {});
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo tareas', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('crear-tarea', async (event, tarea) => {
    try {
        const data = appState.database.crearTarea(tarea);
        Logger.info(`Tarea creada: ${data.id}`);
        return { success: true, data };
    } catch (error) {
        Logger.error('Error creando tarea', error);
        return { success: false, error: error.message };
    }
});

// Actualizar tarea con transacción
ipcMain.handle('actualizar-tarea', async (event, { id, updates }) => {
    try {
        await transactionManager.execute(async () => {
            const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
            const values = Object.values(updates);

            appState.database.db.run(
                `UPDATE tareas SET ${setClause}, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`,
                [...values, id]
            );

            // Registro de auditoría (si existe tabla, si no, ignorar o comentar)
            try {
                appState.database.db.run(
                    'INSERT INTO auditoria (accion, entidad, entidad_id, detalles) VALUES (?, ?, ?, ?)',
                    ['UPDATE', 'tarea', id, JSON.stringify(updates)]
                );
            } catch (e) { /* Ignorar si no existe tabla auditoria aun */ }
        });

        Logger.info(`Tarea actualizada: ${id}`);
        return { success: true };
    } catch (error) {
        Logger.error('Error actualizando tarea', error);
        return { success: false, error: error.message };
    }
});

// Operación batch con transacción
ipcMain.handle('ejecutar-batch', async (event, operations) => {
    try {
        const results = await transactionManager.executeBatch(
            operations.map(op => async (db) => {
                // Ejecutar cada operación
                return db.run(op.sql, op.params);
            })
        );

        return { success: true, results };
    } catch (error) {
        Logger.error('Error en operación batch', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - DOCUMENTOS ====================
ipcMain.handle('obtener-documentos', async (event, proyectoId) => {
    try {
        const data = appState.database.obtenerDocumentos(proyectoId);
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo documentos', error);
        return { success: false, error: error.message };
    }
});

// Subir documento con rate limiting
ipcMain.handle('agregar-documento', async (event, doc) => {
    try {
        const result = await rateLimiter.execute('fileUpload', async () => {
            Logger.info(`Agregando documento: ${JSON.stringify(doc)}`);

            Validators.validateDocumentData(doc);

            const sourcePath = doc.archivo?.path || doc.ruta;
            if (!sourcePath) throw new Error('Ruta de archivo no especificada');

            const targetPath = await FileManager.copyDocumentSafely(sourcePath, doc.proyecto_id);

            const docSeguro = {
                id: doc.id || crypto.randomUUID(),
                proyecto_id: doc.proyecto_id,
                nombre: doc.nombre,
                tipo: doc.tipo || path.extname(sourcePath).substring(1),
                ruta: targetPath,
                fecha_subida: new Date().toISOString(),
                tamano: (await fs.stat(targetPath)).size
            };

            return appState.database.agregarDocumento(docSeguro);
        });

        Logger.info(`Documento agregado exitosamente: ${result.id}`);
        return { success: true, data: result };
    } catch (error) {
        if (error.rateLimitInfo) {
            return {
                success: false,
                error: `Límite de subida de archivos excedido. Intente en ${error.retryAfter} segundos.`
            };
        }

        Logger.error('Error agregando documento', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('abrir-documento', async (event, ruta) => {
    try {
        await FileManager.openDocument(ruta);
        return { success: true };
    } catch (error) {
        Logger.error('Error abriendo documento', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - REPORTES PDF ====================
ipcMain.handle('generar-reporte-proyecto', async (event, proyectoId) => {
    const ReportGenerator = appState.getModule('reportGenerator');

    if (!ReportGenerator) {
        return { success: false, mensaje: 'Generador de reportes no disponible' };
    }

    try {
        Logger.info(`Generando reporte para proyecto: ${proyectoId}`);

        // Obtener datos completos
        const datosProyecto = appState.database.obtenerDatosCompletosProyecto(proyectoId);
        if (!datosProyecto) {
            throw new Error('Proyecto no encontrado');
        }

        // Preparar datos del reporte
        const reportData = {
            titulo: `Reporte de Proyecto: ${datosProyecto.nombre}`,
            fecha: new Date().toLocaleDateString('es-MX'),
            proyecto: datosProyecto,
            resumen: `Cliente: ${datosProyecto.cliente || 'N/A'} | Estado: ${datosProyecto.estado} | Ubicación: ${datosProyecto.direccion}`,
            items: (datosProyecto.tareas_asociadas || []).map(t => ({
                concepto: 'Tarea',
                descripcion: t.titulo,
                estado: t.estado,
                prioridad: t.prioridad
            }))
        };

        // Generar PDF
        const generator = new ReportGenerator();
        const reportsPath = await FileManager.ensureReportsDirectory();

        const filename = `Reporte_${Validators.sanitizeFilename(datosProyecto.nombre)}_${Date.now()}.pdf`;
        const finalPath = path.join(reportsPath, filename);

        await generator.generarPDF(reportData, finalPath);

        Logger.info(`Reporte generado: ${finalPath}`);
        return { success: true, ruta: finalPath };

    } catch (error) {
        Logger.error('Error generando reporte', error);
        return { success: false, mensaje: error.message };
    }
});

// Generar PDF con rate limiting
ipcMain.handle('generar-reporte-pdf', async (event, { data, filename }) => {
    const ReportGenerator = appState.getModule('reportGenerator');

    if (!ReportGenerator) {
        throw new Error('Sistema de reportes no disponible');
    }

    try {
        const result = await rateLimiter.execute('pdf', async () => {
            const generator = new ReportGenerator();
            const reportsPath = await FileManager.ensureReportsDirectory();

            const sanitizedFilename = filename
                ? Validators.sanitizeFilename(filename)
                : `Reporte_${Date.now()}.pdf`;

            const finalPath = path.join(reportsPath, sanitizedFilename);

            Logger.info(`Generando PDF: ${finalPath}`);
            return await generator.generarPDF(data, finalPath);
        });

        return { success: true, ...result };
    } catch (error) {
        if (error.rateLimitInfo) {
            return {
                success: false,
                error: `Límite de generación de PDFs excedido. Intente en ${error.retryAfter} segundos.`,
                rateLimitInfo: error.rateLimitInfo
            };
        }

        Logger.error('Error generando PDF', error);
        throw error;
    }
});

ipcMain.handle('previsualizar-pdf', async (event, ruta) => {
    try {
        await FileManager.openDocument(ruta);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - OCR ====================
// Procesar OCR con rate limiting
ipcMain.handle('procesar-ocr', async (event, { imagePath }) => {
    const OCRProcessor = appState.getModule('ocrProcessor');

    if (!OCRProcessor) {
        return { error: 'Módulo OCR no disponible' };
    }

    try {
        // Aplicar rate limiting
        const result = await rateLimiter.executeWithQueue('ocr', async () => {
            if (!Validators.isValidPath(imagePath)) {
                throw new Error('Ruta de imagen inválida');
            }

            const processor = new OCRProcessor();
            await processor.init();

            Logger.info(`Procesando OCR: ${imagePath}`);
            const ocrResult = await processor.procesarImagen(imagePath);

            await processor.close();
            return ocrResult;
        });

        return result;
    } catch (error) {
        if (error.rateLimitInfo) {
            Logger.warn(`Rate limit OCR excedido. Reintentar en ${error.retryAfter}s`);
            return {
                error: `Límite de solicitudes excedido. Intente en ${error.retryAfter} segundos.`,
                rateLimitInfo: error.rateLimitInfo
            };
        }

        Logger.error('Error procesando OCR', error);
        return { error: error.message };
    }
});

// ==================== MANEJADORES IPC - ALERTAS ====================
ipcMain.handle('obtener-alertas', async () => {
    try {
        const data = appState.database.obtenerAlertasPendientes();
        return { success: true, data: data || [] };
    } catch (error) {
        Logger.error('Error obteniendo alertas', error);
        return { success: false, error: error.message, data: [] };
    }
});

ipcMain.handle('obtener-alertas-pendientes', async () => {
    return ipcMain.emit('obtener-alertas');
});

ipcMain.handle('marcar-alerta-leida', async (event, id) => {
    try {
        appState.database.db.run(
            'UPDATE alertas SET leida = 1, fecha_lectura = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        return { success: true };
    } catch (error) {
        Logger.error('Error marcando alerta como leída', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - CHECKLISTS ====================
ipcMain.handle('obtener-checklists-proyecto', async (event, proyectoId) => {
    try {
        const data = appState.database.db.all(
            'SELECT * FROM checklists_auditoria WHERE proyecto_id = ? ORDER BY fecha_auditoria DESC',
            [proyectoId]
        );
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo checklists', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('crear-checklist', async (event, checklist) => {
    try {
        const id = checklist.id || crypto.randomUUID();

        appState.database.db.run(
            `INSERT INTO checklists_auditoria 
            (id, proyecto_id, tipo_checklist, clasificacion, fecha_auditoria, auditor, puntuacion_total) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                checklist.proyecto_id,
                checklist.tipo_checklist,
                checklist.clasificacion,
                checklist.fecha_auditoria || new Date().toISOString(),
                checklist.auditor,
                0
            ]
        );

        Logger.info(`Checklist creado: ${id}`);
        return { success: true, data: { id } };
    } catch (error) {
        Logger.error('Error creando checklist', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('obtener-checklist', async (event, id) => {
    try {
        const data = appState.database.obtenerChecklist(id);
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo checklist', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('obtener-items-checklist', async (event, checklistId) => {
    try {
        const data = appState.database.obtenerItemsChecklist(checklistId);
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo items de checklist', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('crear-checklist-item', async (event, item) => {
    try {
        const id = crypto.randomUUID();

        appState.database.db.run(
            `INSERT INTO checklist_items 
            (id, checklist_id, seccion, item, descripcion, cumple, observaciones) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                item.checklist_id,
                item.seccion,
                item.numero_item || item.item,
                item.descripcion,
                item.cumple ? 1 : 0,
                item.observaciones || ''
            ]
        );

        return { success: true, data: { id } };
    } catch (error) {
        Logger.error('Error creando item de checklist', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('actualizar-checklist-item', async (event, { id, updates }) => {
    try {
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates).map(v =>
            typeof v === 'boolean' ? (v ? 1 : 0) : v
        );

        appState.database.db.run(
            `UPDATE checklist_items SET ${setClause} WHERE id = ?`,
            [...values, id]
        );

        return { success: true };
    } catch (error) {
        Logger.error('Error actualizando item de checklist', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('actualizar-checklist', async (event, { id, updates }) => {
    try {
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);

        appState.database.db.run(
            `UPDATE checklists_auditoria SET ${setClause} WHERE id = ?`,
            [...values, id]
        );

        return { success: true };
    } catch (error) {
        Logger.error('Error actualizando checklist', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - ESTADÍSTICAS ====================
ipcMain.handle('obtener-estadisticas', async () => {
    try {
        const proyectos = appState.database.obtenerProyectos({});
        const tareas = appState.database.obtenerTareas({});
        const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

        let tiempoTotalMes = 0;
        try {
            const registrosTiempo = appState.database.db.all(
                `SELECT SUM(duracion) as total FROM registros_tiempo 
                 WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`
            );
            tiempoTotalMes = registrosTiempo[0]?.total || 0;
        } catch { }

        return {
            success: true,
            data: {
                proyectos: { total: proyectos.length },
                tareas_pendientes: { total: tareasPendientes.length },
                tiempo_total_mes: { total: tiempoTotalMes },
                documentos: { total: appState.database.obtenerDocumentos().length }
            }
        };
    } catch (error) {
        Logger.error('Error obteniendo estadísticas', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('obtener-actividad', async () => {
    try {
        const data = appState.database.obtenerActividadReciente();
        return { success: true, data };
    } catch (error) {
        Logger.error('Error obteniendo actividad', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - BACKUPS ====================

// Crear respaldo manual
ipcMain.handle('crear-backup', async () => {
    try {
        const result = await rateLimiter.execute('backup', async () => {
            return await backupManager.createBackup({ auto: false });
        });

        return { success: true, data: result };
    } catch (error) {
        if (error.rateLimitInfo) {
            return {
                success: false,
                error: `Límite de respaldos excedido. Intente en ${error.retryAfter} segundos.`
            };
        }

        Logger.error('Error creando respaldo', error);
        return { success: false, error: error.message };
    }
});

// Listar respaldos disponibles
ipcMain.handle('listar-backups', async () => {
    try {
        const backups = await backupManager.listBackups();
        return { success: true, data: backups };
    } catch (error) {
        Logger.error('Error listando respaldos', error);
        return { success: false, error: error.message };
    }
});

// Restaurar desde respaldo
ipcMain.handle('restaurar-backup', async (event, backupPath) => {
    try {
        const result = await backupManager.restoreBackup(backupPath);

        // Reiniciar base de datos después de restaurar
        await initializeDatabase();

        return { success: true, data: result };
    } catch (error) {
        Logger.error('Error restaurando respaldo', error);
        return { success: false, error: error.message };
    }
});

// Eliminar respaldo
ipcMain.handle('eliminar-backup', async (event, backupPath) => {
    try {
        const result = await backupManager.deleteBackup(backupPath);
        return { success: true, deleted: result };
    } catch (error) {
        Logger.error('Error eliminando respaldo', error);
        return { success: false, error: error.message };
    }
});

// Verificar integridad de respaldo
ipcMain.handle('verificar-backup', async (event, backupPath) => {
    try {
        const result = await backupManager.verifyBackup(backupPath);
        return { success: true, data: result };
    } catch (error) {
        Logger.error('Error verificando respaldo', error);
        return { success: false, error: error.message };
    }
});

// Obtener estadísticas de respaldos
ipcMain.handle('obtener-estadisticas-backups', async () => {
    try {
        const stats = await backupManager.getStatistics();
        return { success: true, data: stats };
    } catch (error) {
        Logger.error('Error obteniendo estadísticas de respaldos', error);
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - TRANSACCIONES ====================

// Obtener transacciones activas
ipcMain.handle('obtener-transacciones-activas', () => {
    try {
        const transactions = transactionManager.getActiveTransactions();
        return { success: true, data: transactions };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener log de transacciones
ipcMain.handle('obtener-log-transacciones', (event, limit) => {
    try {
        const log = transactionManager.getTransactionLog(limit);
        return { success: true, data: log };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener estadísticas de transacciones
ipcMain.handle('obtener-estadisticas-transacciones', () => {
    try {
        const stats = transactionManager.getStatistics();
        return { success: true, data: stats };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== MANEJADORES IPC - RATE LIMITING ====================

// Obtener estadísticas de rate limiting
ipcMain.handle('obtener-estadisticas-rate-limit', () => {
    try {
        const stats = rateLimiter.getStatistics();
        return { success: true, data: stats };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener información de límites para una operación
ipcMain.handle('obtener-info-rate-limit', (event, operation) => {
    try {
        const info = rateLimiter.getInfo(operation);
        return { success: true, data: info };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Resetear límite para una operación
ipcMain.handle('resetear-rate-limit', (event, operation) => {
    try {
        rateLimiter.reset(operation);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== DIAGNÓSTICO AVANZADO ====================
ipcMain.handle('verificar-sistema-avanzado', async () => {
    try {
        const baseStatus = appState.getSystemStatus();
        const transactionStats = transactionManager?.getStatistics() || null;
        const backupStats = await backupManager?.getStatistics() || null;
        const rateLimitStats = rateLimiter?.getStatistics() || null;

        return {
            ...baseStatus,
            modules: {
                transactionManager: !!transactionManager,
                backupManager: !!backupManager,
                rateLimiter: !!rateLimiter
            },
            statistics: {
                transactions: transactionStats,
                backups: backupStats,
                rateLimit: rateLimitStats
            }
        };
    } catch (error) {
        Logger.error('Error en diagnóstico avanzado', error);
        return { error: error.message };
    }
});


// ==================== MANEJADORES IPC - DIÁLOGOS ====================
ipcMain.handle('seleccionar-archivo', async () => {
    const { dialog } = require('electron');
    try {
        const result = await dialog.showOpenDialog(appState.window, {
            properties: ['openFile'],
            filters: [
                { name: 'Todos los archivos', extensions: ['*'] },
                { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] },
                { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true };
        }

        return { success: true, ruta: result.filePaths[0] };
    } catch (error) {
        Logger.error('Error en selector de archivos', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('seleccionar-imagen-ocr', async () => {
    const { dialog } = require('electron');
    try {
        const result = await dialog.showOpenDialog(appState.window, {
            properties: ['openFile'],
            filters: [
                { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'pdf', 'tiff'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true };
        }

        return { success: true, ruta: result.filePaths[0] };
    } catch (error) {
        Logger.error('Error en selector de imágenes OCR', error);
        return { success: false, error: error.message };
    }
});

// ==================== INICIALIZACIÓN DE LA APLICACIÓN ====================
app.whenReady().then(async () => {
    Logger.info('=== Iniciando aplicación TRAMITOLOGIA (Modo Producción Avanzado) ===');

    try {
        // 1. Inicializar base de datos
        await initializeDatabase();

        // 2. Inicializar gestores avanzados
        await initializeAdvancedModules();

        // 3. Crear ventana principal
        createWindow();

        // 4. Cargar módulos opcionales
        setTimeout(async () => {
            await loadOptionalModules();
            appState.isReady = true;
            Logger.info('=== Aplicación completamente inicializada ===');
        }, CONFIG.MODULES_LOAD_DELAY);

    } catch (error) {
        Logger.error('Error crítico durante inicialización', error);
        app.quit();
    }
});

// ==================== EVENTOS DE CICLO DE VIDA ====================
app.on('window-all-closed', () => {
    Logger.info('Todas las ventanas cerradas');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', async () => {
    Logger.info('Cerrando aplicación y limpiando recursos...');

    try {
        // Detener respaldos automáticos
        if (backupManager) {
            backupManager.stopAutoBackup();
        }

        // Limpiar rate limiter
        if (rateLimiter) {
            rateLimiter.destroy();
        }

        // Cerrar base de datos
        if (appState.database?.close) {
            appState.database.close();
        }

        Logger.info('Recursos limpiados correctamente');
    } catch (error) {
        Logger.error('Error limpiando recursos', error);
    }
});

// ==================== MANEJO DE ERRORES NO CAPTURADOS ====================
process.on('uncaughtException', (error) => {
    Logger.error('Excepción no capturada', error);
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Promesa rechazada no manejada', reason);
});
