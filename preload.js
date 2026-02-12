const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Sistema
    verificarSistema: () => ipcRenderer.invoke('verificar-sistema'),
    minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
    closeWindow: () => ipcRenderer.invoke('window-close'),

    // File Selection (Compatible with User's renderer)
    selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
    selectFiles: (options) => ipcRenderer.invoke('dialog:selectFiles', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

    // Dashboard & Estadísticas
    obtenerEstadisticas: () => ipcRenderer.invoke('obtener-estadisticas'),
    obtenerActividad: () => ipcRenderer.invoke('obtener-actividad'),

    // Notificaciones y Alertas
    obtenerAlertasPendientes: () => ipcRenderer.invoke('obtener-alertas-pendientes'),
    marcarAlertaLeida: (id) => ipcRenderer.invoke('marcar-alerta-leida', id),
    obtenerAlertas: () => ipcRenderer.invoke('obtener-alertas'), // Legacy/Backup

    // Proyectos
    crearProyecto: (proyecto) => ipcRenderer.invoke('crear-proyecto', proyecto),
    obtenerProyectos: (filtro) => ipcRenderer.invoke('obtener-proyectos', filtro),
    obtenerProyecto: (id) => ipcRenderer.invoke('obtener-proyecto', id),
    actualizarProyecto: (id, datos) => ipcRenderer.invoke('actualizar-proyecto', id, datos),
    eliminarProyecto: (id) => ipcRenderer.invoke('eliminar-proyecto', id),

    // Tareas
    crearTarea: (tarea) => ipcRenderer.invoke('crear-tarea', tarea),
    obtenerTareas: (filtro) => ipcRenderer.invoke('obtener-tareas', filtro),
    actualizarTarea: (id, datos) => ipcRenderer.invoke('actualizar-tarea', id, datos),
    eliminarTarea: (id) => ipcRenderer.invoke('eliminar-tarea', id),

    // Tiempo
    registrarTiempo: (registro) => ipcRenderer.invoke('registrar-tiempo', registro),
    obtenerRegistrosTiempo: (filtro) => ipcRenderer.invoke('obtener-registros-tiempo', filtro),

    // Dashboard
    obtenerEstadisticas: () => ipcRenderer.invoke('obtener-estadisticas'),
    obtenerActividad: () => ipcRenderer.invoke('obtener-actividad'),

    // Reportes
    obtenerTiempoPorProyecto: (fechaInicio, fechaFin) => ipcRenderer.invoke('obtener-tiempo-por-proyecto', fechaInicio, fechaFin),
    obtenerProductividadDiaria: (fechaInicio, fechaFin) => ipcRenderer.invoke('obtener-productividad-diaria', fechaInicio, fechaFin),

    // Documentos
    seleccionarArchivo: () => ipcRenderer.invoke('seleccionar-archivo'),
    agregarDocumento: (documento) => ipcRenderer.invoke('agregar-documento', documento),
    obtenerDocumentos: (proyecto_id) => ipcRenderer.invoke('obtener-documentos', proyecto_id),
    abrirDocumento: (ruta) => ipcRenderer.invoke('abrir-documento', ruta),

    // Alertas
    crearAlerta: (alerta) => ipcRenderer.invoke('crear-alerta', alerta),
    obtenerAlertasPendientes: () => ipcRenderer.invoke('obtener-alertas-pendientes'),

    // Exportar
    exportarReporte: (datos, nombreArchivo) => ipcRenderer.invoke('exportar-reporte', datos, nombreArchivo),

    // OCR
    procesarOCR: (rutaImagen, opciones) => ipcRenderer.invoke('procesar-ocr', rutaImagen, opciones),
    procesarDocumentoOCR: (rutaDocumento) => ipcRenderer.invoke('procesar-documento-ocr', rutaDocumento),
    seleccionarImagenOCR: () => ipcRenderer.invoke('seleccionar-imagen-ocr'),

    // Listeners para progreso
    onOCRProgreso: (callback) => ipcRenderer.on('ocr-progreso', (event, data) => callback(data)),
    onLoteProgreso: (callback) => ipcRenderer.on('lote-progreso', (event, data) => callback(data)),

    // Checklists
    crearChecklistAuditoria: (datos) => ipcRenderer.invoke('crear-checklist-auditoria', datos),
    obtenerChecklist: (id) => ipcRenderer.invoke('obtener-checklist', id),
    obtenerChecklistsProyecto: (proyecto_id) => ipcRenderer.invoke('obtener-checklists-proyecto', proyecto_id),
    actualizarItemChecklist: (id, datos) => ipcRenderer.invoke('actualizar-item-checklist', id, datos),
    finalizarChecklist: (checklist_id, plan_accion, fecha_proxima) => ipcRenderer.invoke('finalizar-checklist', checklist_id, plan_accion, fecha_proxima),
    generarPlanAccion: (checklist_id) => ipcRenderer.invoke('generar-plan-accion', checklist_id),
    exportarChecklistPDF: (checklist_id) => ipcRenderer.invoke('exportar-checklist-pdf', checklist_id),

    // Reportes y Exportación
    generarReporteProyecto: (proyectoId) => ipcRenderer.invoke('generar-reporte-proyecto', proyectoId),
    generarReporteChecklist: (checklistId) => ipcRenderer.invoke('generar-reporte-checklist', checklistId),
    previsualizarPDF: (ruta) => ipcRenderer.invoke('previsualizar-pdf', ruta),
    generarReporteGeneral: (opciones) => ipcRenderer.invoke('generar-reporte-general', opciones),
    generarReportePersonalizado: (opciones) => ipcRenderer.invoke('generar-reporte-personalizado', opciones),
    previsualizarPDF: (rutaArchivo) => ipcRenderer.invoke('previsualizar-pdf', rutaArchivo),
    exportarDatosJSON: (datos, nombreArchivo) => ipcRenderer.invoke('exportar-datos-json', datos, nombreArchivo),

    // Marco Jurídico
    buscarActualizacionesMarcoJuridico: () => ipcRenderer.invoke('buscar-actualizaciones-marco-juridico'),
    obtenerMarcoJuridico: (filtros) => ipcRenderer.invoke('obtener-marco-juridico', filtros),
    obtenerAlertasNormativas: () => ipcRenderer.invoke('obtener-alertas-normativas'),
    marcarAlertaLeida: (alertaId) => ipcRenderer.invoke('marcar-alerta-leida', alertaId),
    obtenerHistorialActualizaciones: (limite) => ipcRenderer.invoke('obtener-historial-actualizaciones', limite),
    obtenerEstadisticasMarcoJuridico: () => ipcRenderer.invoke('obtener-estadisticas-marco-juridico'),
    programarBusquedaAutomatica: (hora) => ipcRenderer.invoke('programar-busqueda-automatica', hora),
    detenerBusquedaAutomatica: () => ipcRenderer.invoke('detener-busqueda-automatica'),
    exportarMarcoJuridico: () => ipcRenderer.invoke('exportar-marco-juridico'),
    abrirEnlaceExterno: (url) => ipcRenderer.invoke('abrir-enlace-externo', url),

    // Organizador de Archivos
    seleccionarCarpetaEscanear: () => ipcRenderer.invoke('seleccionar-carpeta-escanear'),
    escanearCarpeta: (rutaCarpeta) => ipcRenderer.invoke('escanear-carpeta', rutaCarpeta),
    obtenerCarpetasEscaneadas: () => ipcRenderer.invoke('obtener-carpetas-escaneadas'),
    obtenerArchivosCarpeta: (carpetaId, filtros) => ipcRenderer.invoke('obtener-archivos-carpeta', carpetaId, filtros),
    obtenerEstadisticasCarpeta: (carpetaId) => ipcRenderer.invoke('obtener-estadisticas-carpeta', carpetaId),
    moverArchivosPapelera: (archivosIds) => ipcRenderer.invoke('mover-archivos-papelera', archivosIds),
    organizarPorTipo: (carpetaId, carpetaDestino) => ipcRenderer.invoke('organizar-por-tipo', carpetaId, carpetaDestino),
    buscarArchivos: (termino, carpetaId) => ipcRenderer.invoke('buscar-archivos', termino, carpetaId),
    eliminarCarpetaEscaneada: (carpetaId) => ipcRenderer.invoke('eliminar-carpeta-escaneada', carpetaId),
    obtenerHistorialOrganizacion: (limite) => ipcRenderer.invoke('obtener-historial-organizacion', limite),
    obtenerConfigTiposArchivo: () => ipcRenderer.invoke('obtener-config-tipos-archivo'),
    abrirCarpetaExplorador: (ruta) => ipcRenderer.invoke('abrir-carpeta-explorador', ruta),
    abrirArchivo: (ruta) => ipcRenderer.invoke('abrir-archivo', ruta),

    // Sistema de Aprendizaje
    analizarCarpetaGestoria: (rutaCarpeta, opciones) => ipcRenderer.invoke('analizar-carpeta-gestoria', rutaCarpeta, opciones),
    analizarConversacion: (contenido, metadata) => ipcRenderer.invoke('analizar-conversacion', contenido, metadata),
    buscarConocimiento: (consulta) => ipcRenderer.invoke('buscar-conocimiento', consulta),
    generarSugerencias: (contexto) => ipcRenderer.invoke('generar-sugerencias', contexto),
    obtenerEstadisticasAprendizaje: () => ipcRenderer.invoke('obtener-estadisticas-aprendizaje'),
    obtenerSugerenciasPendientes: () => ipcRenderer.invoke('obtener-sugerencias-pendientes'),
    marcarSugerenciaAplicada: (sugerenciaId) => ipcRenderer.invoke('marcar-sugerencia-aplicada', sugerenciaId),
    obtenerConocimientosCategoria: (categoria, limite) => ipcRenderer.invoke('obtener-conocimientos-categoria', categoria, limite),
    obtenerPatronesIdentificados: (limite) => ipcRenderer.invoke('obtener-patrones-identificados', limite),
    obtenerConversacionesAnalizadas: (limite) => ipcRenderer.invoke('obtener-conversaciones-analizadas', limite),
    obtenerDocumentosAnalizados: (limite) => ipcRenderer.invoke('obtener-documentos-analizados', limite),
    obtenerDatosExtraidosDocumento: (documentoId) => ipcRenderer.invoke('obtener-datos-extraidos-documento', documentoId),
    buscarPorDatoEstructurado: (tipoDato, valor) => ipcRenderer.invoke('buscar-por-dato-estructurado', tipoDato, valor),
    obtenerEstadisticasExtraccion: () => ipcRenderer.invoke('obtener-estadisticas-extraccion'),
    obtenerDocumentoCompleto: (documentoId) => ipcRenderer.invoke('obtener-documento-completo', documentoId),
    exportarDatosExtraidos: (formato) => ipcRenderer.invoke('exportar-datos-extraidos', formato),
    obtenerDocumentosPorCalidad: (calidadMinima) => ipcRenderer.invoke('obtener-documentos-por-calidad', calidadMinima),

    // Chatbot
    procesarMensajeChatbot: (mensaje) => ipcRenderer.invoke('procesar-mensaje-chatbot', mensaje),
    limpiarHistorialChatbot: () => ipcRenderer.invoke('limpiar-historial-chatbot'),
    obtenerHistorialChatbot: () => ipcRenderer.invoke('obtener-historial-chatbot'),
    obtenerContextoChatbot: () => ipcRenderer.invoke('obtener-contexto-chatbot'),

    // Configuración
    obtenerConfiguracion: () => ipcRenderer.invoke('obtener-configuracion'),
    guardarConfiguracion: (config) => ipcRenderer.invoke('guardar-configuracion', config),
    restablecerConfiguracion: () => ipcRenderer.invoke('restablecer-configuracion'),

    // Optimización
    obtenerEstadisticasRendimiento: () => ipcRenderer.invoke('obtener-estadisticas-rendimiento'),
    limpiarCacheSistema: () => ipcRenderer.invoke('limpiar-cache-sistema'),
    optimizarBaseDatos: () => ipcRenderer.invoke('optimizar-base-datos'),
    realizarBackup: () => ipcRenderer.invoke('realizar-backup'),

    // Reportes PDF
    generarReportePDF: (data, filename) => ipcRenderer.invoke('generar-reporte-pdf', { data, filename }),

    // OCR
    procesarOCR: (imagePath) => ipcRenderer.invoke('procesar-ocr', { imagePath }),

    // Escuchar progreso de análisis
    onProgresoAnalisis: (callback) => ipcRenderer.on('progreso-analisis', (event, data) => callback(data)),

    // Menu actions
    onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action)),

    // ==================== UNIFIED OCR SYSTEM ====================

    // OCR & Image Processing
    processOCR: (filePath, options) => ipcRenderer.invoke('ocr:process', filePath, options),
    processImage: (imagePath, options) => ipcRenderer.invoke('ocr:processImage', imagePath, options),

    // Batch Processing
    batchAddJobs: (filePaths, options) => ipcRenderer.invoke('batch:addJobs', filePaths, options),
    batchPause: () => ipcRenderer.invoke('batch:pause'),
    batchResume: () => ipcRenderer.invoke('batch:resume'),
    batchCancelJob: (jobId) => ipcRenderer.invoke('batch:cancelJob', jobId),
    batchCancelAll: () => ipcRenderer.invoke('batch:cancelAll'),
    batchGetStatistics: () => ipcRenderer.invoke('batch:getStatistics'),
    batchGetAllJobs: () => ipcRenderer.invoke('batch:getAllJobs'),
    batchExportResults: () => ipcRenderer.invoke('batch:exportResults'),

    // Document Comparison
    compareDocuments: (doc1Path, doc2Path) => ipcRenderer.invoke('comparison:compare', doc1Path, doc2Path),

    // History
    historySearch: (query, filters) => ipcRenderer.invoke('history:search', query, filters),
    historyGetRecent: (limit) => ipcRenderer.invoke('history:getRecent', limit),
    historyGetSummary: () => ipcRenderer.invoke('history:getSummary'),

    // File Operations (Specific to OCR)
    fileSave: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
    fileExists: (filePath) => ipcRenderer.invoke('file:exists', filePath),

    // Events
    onOCRProgress: (callback) => ipcRenderer.on('ocr:progress', (event, data) => callback(data)),
    onBatchJobAdded: (callback) => ipcRenderer.on('batch:job-added', (event, data) => callback(data)),
    onBatchJobStarted: (callback) => ipcRenderer.on('batch:job-started', (event, data) => callback(data)),
    onBatchJobProgress: (callback) => ipcRenderer.on('batch:job-progress', (event, data) => callback(data)),
    onBatchJobCompleted: (callback) => ipcRenderer.on('batch:job-completed', (event, data) => callback(data)),
    onBatchJobFailed: (callback) => ipcRenderer.on('batch:job-failed', (event, data) => callback(data)),
    onBatchJobCancelled: (callback) => ipcRenderer.on('batch:job-cancelled', (event, data) => callback(data)),
    onBatchStarted: (callback) => ipcRenderer.on('batch:started', (event) => callback()),
    onBatchCompleted: (callback) => ipcRenderer.on('batch:completed', (event, data) => callback(data)),
    onBatchPaused: (callback) => ipcRenderer.on('batch:paused', (event) => callback()),
    onBatchResumed: (callback) => ipcRenderer.on('batch:resumed', (event) => callback())
});

contextBridge.exposeInMainWorld('documentAPI', {
    // Selección de archivos
    selectFile: (options) => ipcRenderer.invoke('document:select-file', options),
    selectMultipleFiles: (options) => ipcRenderer.invoke('document:select-multiple-files', options),

    // Listado
    obtenerDocumentos: (proyecto_id) => ipcRenderer.invoke('obtener-documentos', proyecto_id),

    // CRUD básico
    add: (documentData) => ipcRenderer.invoke('document:add', documentData),
    addBatch: (documents) => ipcRenderer.invoke('document:add-batch', documents),
    update: (data) => ipcRenderer.invoke('document:update', data),
    updateMetadata: (data) => ipcRenderer.invoke('document:update-metadata', data),
    delete: (data) => ipcRenderer.invoke('document:delete', data),
    deleteBatch: (documents) => ipcRenderer.invoke('document:delete-batch', documents),

    // Operaciones de archivo
    open: (documentPath) => ipcRenderer.invoke('document:open', documentPath),
    showInFolder: (documentPath) => ipcRenderer.invoke('document:show-in-folder', documentPath),
    copyTo: (data) => ipcRenderer.invoke('document:copy-to', data),
    moveToProject: (data) => ipcRenderer.invoke('document:move-to-project', data),

    // Versiones
    listVersions: (documentId) => ipcRenderer.invoke('document:list-versions', documentId),
    restoreVersion: (data) => ipcRenderer.invoke('document:restore-version', data),

    // Verificación
    verifyIntegrity: (data) => ipcRenderer.invoke('document:verify-integrity', data),
    checkExists: (documentPath) => ipcRenderer.invoke('document:check-exists', documentPath),

    // Estadísticas
    getStatistics: (projectId) => ipcRenderer.invoke('document:get-statistics', projectId),
    getFileInfo: (filePath) => ipcRenderer.invoke('document:get-file-info', filePath),

    // Lectura
    readFile: (filePath) => ipcRenderer.invoke('document:read-file', filePath)
});
