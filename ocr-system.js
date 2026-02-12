/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA OCR COMPLETO - KODIFICADOR
 * Sistema de reconocimiento óptico de caracteres offline con funcionalidades avanzadas
 * Versión: 2.0.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CARACTERÍSTICAS:
 * - Procesamiento OCR offline con Tesseract.js
 * - Conversión PDF a imágenes con PDF.js
 * - Procesamiento por lotes (batch)
 * - Comparación de documentos
 * - Historial con búsqueda full-text
 * - Extracción inteligente de datos
 * - Caché de resultados
 * - Integración completa con Electron
 * 
 * DEPENDENCIAS REQUERIDAS:
 * npm install tesseract.js pdfjs-dist canvas better-sqlite3 diff natural
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: IMPORTS Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const Tesseract = require('tesseract.js');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const EventEmitter = require('events');
const Database = require('better-sqlite3');
const Diff = require('diff');
const natural = require('natural');
const crypto = require('crypto');

// Configuración Global
const OCRConfig = {
    languages: ['spa', 'eng'],
    tessdataPath: null,
    pdfScale: 2.0,
    imageQuality: 0.95,
    maxConcurrentPages: 3,
    cacheResults: true,
    maxConcurrentJobs: 3,
    retryAttempts: 2,
    retryDelay: 5000,
    similarityThreshold: 0.7,
    historyDbPath: null
};

// Estados de Trabajo
const JobStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PAUSED: 'paused'
};

// Tipos de Cambio
const ChangeType = {
    ADDED: 'added',
    REMOVED: 'removed',
    MODIFIED: 'modified',
    UNCHANGED: 'unchanged'
};

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: SERVICIO DE INICIALIZACIÓN DE TESSERACT
// ═══════════════════════════════════════════════════════════════════════════

class TesseractInitService {
    static initialized = false;
    static initPromise = null;

    static async initialize() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._performInitialization();
        await this.initPromise;
        this.initialized = true;
    }

    static async _performInitialization() {
        try {
            console.log('🔧 Inicializando TesseractInitService...');

            const app = require('electron').app || require('@electron/remote').app;
            const userDataPath = app.getPath('userData');
            const tessDataPath = path.join(userDataPath, 'tessdata');

            await fs.mkdir(tessDataPath, { recursive: true });

            const langFiles = ['spa.traineddata', 'eng.traineddata'];
            const resourcesPath = path.join(__dirname, 'resources', 'tessdata');

            for (const langFile of langFiles) {
                const targetFile = path.join(tessDataPath, langFile);

                try {
                    await fs.access(targetFile);
                    console.log(`✓ ${langFile} ya existe`);
                } catch {
                    console.log(`📥 Copiando ${langFile}...`);
                    const sourceFile = path.join(resourcesPath, langFile);

                    try {
                        const data = await fs.readFile(sourceFile);
                        await fs.writeFile(targetFile, data);
                        console.log(`✓ ${langFile} copiado exitosamente`);
                    } catch (error) {
                        console.warn(`⚠️ No se pudo copiar ${langFile}, se descargará automáticamente`);
                    }
                }
            }

            OCRConfig.tessdataPath = tessDataPath;
            console.log('✅ TesseractInitService inicializado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando TesseractInitService:', error);
            throw error;
        }
    }

    static async checkModels() {
        if (!OCRConfig.tessdataPath) {
            throw new Error('TesseractInitService no ha sido inicializado');
        }

        const langFiles = ['spa.traineddata', 'eng.traineddata'];
        const status = {};

        for (const langFile of langFiles) {
            const filePath = path.join(OCRConfig.tessdataPath, langFile);
            try {
                const stats = await fs.stat(filePath);
                status[langFile] = {
                    exists: true,
                    size: stats.size,
                    path: filePath
                };
            } catch {
                status[langFile] = {
                    exists: false,
                    size: 0,
                    path: filePath
                };
            }
        }

        return status;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: PIPELINE OCR
// ═══════════════════════════════════════════════════════════════════════════

class OcrPipeline {
    constructor() {
        this.worker = null;
        this.isProcessing = false;
    }

    async initializeWorker() {
        if (this.worker) return;

        console.log('🔧 Inicializando Tesseract Worker...');

        this.worker = await Tesseract.createWorker({
            langPath: OCRConfig.tessdataPath,
            cachePath: OCRConfig.tessdataPath,
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`📝 Progreso OCR: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        await this.worker.loadLanguage(OCRConfig.languages.join('+'));
        await this.worker.initialize(OCRConfig.languages.join('+'));

        console.log('✅ Tesseract Worker inicializado');
    }

    async processDocument(pdfPath, progressCallback = null) {
        if (this.isProcessing) {
            throw new Error('Ya hay un documento en procesamiento');
        }

        this.isProcessing = true;

        try {
            console.log('📄 Procesando documento:', pdfPath);

            await this.initializeWorker();

            if (progressCallback) progressCallback({ stage: 'pdf_conversion', progress: 0 });
            const images = await this.convertPdfToImages(pdfPath);
            console.log(`✓ PDF convertido a ${images.length} imagen(es)`);

            const allText = [];
            for (let i = 0; i < images.length; i++) {
                if (progressCallback) {
                    progressCallback({
                        stage: 'ocr_processing',
                        progress: (i / images.length),
                        page: i + 1,
                        totalPages: images.length
                    });
                }

                console.log(`🔍 Procesando página ${i + 1}/${images.length}...`);
                const { data: { text } } = await this.worker.recognize(images[i]);
                allText.push(text);
            }

            if (progressCallback) progressCallback({ stage: 'data_extraction', progress: 0.9 });
            const extractedData = this.extractStructuredData(allText.join('\n'));

            if (progressCallback) progressCallback({ stage: 'complete', progress: 1 });

            console.log('✅ Documento procesado exitosamente');
            return extractedData;

        } catch (error) {
            console.error('❌ Error procesando documento:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async convertPdfToImages(pdfPath) {
        try {
            const data = await fs.readFile(pdfPath);
            const loadingTask = pdfjsLib.getDocument({ data });
            const pdf = await loadingTask.promise;

            const images = [];
            const numPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: OCRConfig.pdfScale });

                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const imageBuffer = canvas.toBuffer('image/png');
                images.push(imageBuffer);
            }

            return images;

        } catch (error) {
            console.error('Error convirtiendo PDF a imágenes:', error);
            throw new Error('No se pudo convertir el PDF: ' + error.message);
        }
    }

    extractStructuredData(text) {
        console.log('📊 Extrayendo datos estructurados...');

        return {
            tipoDocumento: this.detectDocumentType(text),
            razonSocial: this.extractRazonSocial(text),
            fecha: this.extractFecha(text),
            ubicacion: this.extractUbicacion(text),
            rfc: this.extractRFC(text),
            folio: this.extractFolio(text),
            textoCompleto: text,
            confianza: 0.85
        };
    }

    detectDocumentType(text) {
        const textLower = text.toLowerCase();
        const patterns = {
            'Dictamen de Protección Civil': /dictamen.*protecci[oó]n\s+civil/i,
            'Programa Interno': /programa\s+interno/i,
            'Constancia': /constancia/i,
            'Acta': /acta/i,
            'Contrato': /contrato/i,
            'Factura': /factura|comprobante\s+fiscal/i,
            'Certificado': /certificado/i
        };

        for (const [tipo, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) return tipo;
        }

        return 'Documento General';
    }

    extractRazonSocial(text) {
        const patterns = [
            /raz[oó]n\s+social[:\s]+([^\n]+)/i,
            /empresa[:\s]+([^\n]+)/i,
            /denominaci[oó]n[:\s]+([^\n]+)/i,
            /([A-ZÁÉÍÓÚÑ\s]+(?:S\.A\.|S\.C\.|S\. DE R\.L\.|DE C\.V\.))/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) return match[1].trim();
        }

        return 'No detectado';
    }

    extractFecha(text) {
        const patterns = [
            /fecha[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
            /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i,
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1] || match[0];
        }

        return 'No detectada';
    }

    extractUbicacion(text) {
        const patterns = [
            /direcci[oó]n[:\s]+([^\n]+)/i,
            /domicilio[:\s]+([^\n]+)/i,
            /ubicaci[oó]n[:\s]+([^\n]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) return match[1].trim();
        }

        return 'No detectada';
    }

    extractRFC(text) {
        const rfcPattern = /[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}/g;
        const matches = text.match(rfcPattern);
        return matches ? matches[0] : 'No detectado';
    }

    extractFolio(text) {
        const patterns = [
            /folio[:\s]+([A-Z0-9\-]+)/i,
            /n[uú]mero[:\s]+([A-Z0-9\-]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) return match[1].trim();
        }

        return 'No detectado';
    }

    async cleanup() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            console.log('🧹 Worker de Tesseract terminado');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: GESTOR DE CACHÉ
// ═══════════════════════════════════════════════════════════════════════════

class OcrCacheManager {
    constructor() {
        this.cache = new Map();
        this.maxSize = 50;
    }

    async generateKey(filePath) {
        const stats = await fs.stat(filePath);
        const data = `${filePath}-${stats.size}-${stats.mtime.getTime()}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    async get(filePath) {
        const key = await this.generateKey(filePath);
        return this.cache.get(key);
    }

    async set(filePath, result) {
        const key = await this.generateKey(filePath);

        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: SERVICIO OCR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

class OcrService {
    constructor() {
        this.pipeline = new OcrPipeline();
        this.cacheManager = new OcrCacheManager();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        console.log('🚀 Inicializando OcrService...');
        await TesseractInitService.initialize();

        const modelStatus = await TesseractInitService.checkModels();
        console.log('📦 Estado de modelos:', modelStatus);

        this.initialized = true;
        console.log('✅ OcrService inicializado correctamente');
    }

    async processDocument(filePath, options = {}) {
        if (!this.initialized) await this.initialize();

        if (OCRConfig.cacheResults && !options.forceReprocess) {
            const cached = await this.cacheManager.get(filePath);
            if (cached) {
                console.log('📦 Resultado obtenido del caché');
                return cached.result;
            }
        }

        const result = await this.pipeline.processDocument(
            filePath,
            options.progressCallback
        );

        if (OCRConfig.cacheResults) {
            await this.cacheManager.set(filePath, result);
        }

        return result;
    }

    async processImage(imagePath, options = {}) {
        if (!this.initialized) await this.initialize();

        await this.pipeline.initializeWorker();

        const { data: { text, confidence } } = await this.pipeline.worker.recognize(imagePath);

        return {
            textoCompleto: text,
            confianza: confidence / 100,
            ...this.pipeline.extractStructuredData(text)
        };
    }

    async cleanup() {
        await this.pipeline.cleanup();
        this.cacheManager.clear();
        this.initialized = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 6: PROCESAMIENTO POR LOTES
// ═══════════════════════════════════════════════════════════════════════════

class OcrJob {
    constructor(filePath, options = {}) {
        this.id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.filePath = filePath;
        this.fileName = path.basename(filePath);
        this.options = options;
        this.status = JobStatus.PENDING;
        this.progress = 0;
        this.result = null;
        this.error = null;
        this.startTime = null;
        this.endTime = null;
        this.priority = options.priority || 0;
    }

    getDuration() {
        if (!this.startTime) return 0;
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    toJSON() {
        return {
            id: this.id,
            filePath: this.filePath,
            fileName: this.fileName,
            status: this.status,
            progress: this.progress,
            result: this.result,
            error: this.error,
            duration: this.getDuration(),
            priority: this.priority
        };
    }
}

class BatchProcessor extends EventEmitter {
    constructor(ocrService, options = {}) {
        super();
        this.ocrService = ocrService;
        this.maxConcurrent = options.maxConcurrent || OCRConfig.maxConcurrentJobs;
        this.retryAttempts = options.retryAttempts || OCRConfig.retryAttempts;
        this.retryDelay = options.retryDelay || OCRConfig.retryDelay;

        this.jobs = new Map();
        this.queue = [];
        this.processing = new Set();
        this.isPaused = false;
        this.isProcessing = false;
    }

    addJob(filePath, options = {}) {
        const job = new OcrJob(filePath, options);
        this.jobs.set(job.id, job);
        this.queue.push(job.id);

        this.emit('job:added', job.toJSON());

        if (!this.isProcessing && !this.isPaused) {
            this.startProcessing();
        }

        return job.id;
    }

    addJobs(filePaths, options = {}) {
        return filePaths.map(filePath => this.addJob(filePath, options));
    }

    async startProcessing() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.emit('batch:started');

        while (this.queue.length > 0 && !this.isPaused) {
            while (this.processing.size >= this.maxConcurrent) {
                await this.sleep(100);
            }

            const jobId = this.getNextJob();
            if (!jobId) break;

            this.processJob(jobId);
        }

        while (this.processing.size > 0) {
            await this.sleep(100);
        }

        this.isProcessing = false;
        this.emit('batch:completed', this.getStatistics());
    }

    getNextJob() {
        if (this.queue.length === 0) return null;

        this.queue.sort((a, b) => {
            const jobA = this.jobs.get(a);
            const jobB = this.jobs.get(b);
            return jobB.priority - jobA.priority;
        });

        return this.queue.shift();
    }

    async processJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        this.processing.add(jobId);
        job.status = JobStatus.PROCESSING;
        job.startTime = Date.now();

        this.emit('job:started', job.toJSON());

        let attempts = 0;
        let success = false;

        while (attempts <= this.retryAttempts && !success) {
            try {
                const progressCallback = (progress) => {
                    job.progress = progress.progress;
                    this.emit('job:progress', {
                        jobId: job.id,
                        ...progress
                    });
                };

                const result = await this.ocrService.processDocument(
                    job.filePath,
                    { ...job.options, progressCallback }
                );

                job.result = result;
                job.status = JobStatus.COMPLETED;
                job.endTime = Date.now();
                success = true;

                this.emit('job:completed', job.toJSON());

            } catch (error) {
                attempts++;

                if (attempts > this.retryAttempts) {
                    job.error = error.message;
                    job.status = JobStatus.FAILED;
                    job.endTime = Date.now();

                    this.emit('job:failed', {
                        ...job.toJSON(),
                        attempts
                    });
                } else {
                    this.emit('job:retry', {
                        jobId: job.id,
                        attempt: attempts,
                        maxAttempts: this.retryAttempts
                    });

                    await this.sleep(this.retryDelay);
                }
            }
        }

        this.processing.delete(jobId);
    }

    pause() {
        this.isPaused = true;
        this.emit('batch:paused');
    }

    resume() {
        this.isPaused = false;
        this.emit('batch:resumed');

        if (!this.isProcessing && this.queue.length > 0) {
            this.startProcessing();
        }
    }

    cancelJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        if (job.status === JobStatus.PENDING) {
            const index = this.queue.indexOf(jobId);
            if (index > -1) this.queue.splice(index, 1);
        }

        job.status = JobStatus.CANCELLED;
        job.endTime = Date.now();

        this.emit('job:cancelled', job.toJSON());
        return true;
    }

    cancelAll() {
        const pendingJobs = [...this.queue];
        pendingJobs.forEach(jobId => this.cancelJob(jobId));

        this.processing.forEach(jobId => {
            const job = this.jobs.get(jobId);
            if (job) job.status = JobStatus.CANCELLED;
        });

        this.queue = [];
        this.isPaused = true;

        this.emit('batch:cancelled');
    }

    getJob(jobId) {
        const job = this.jobs.get(jobId);
        return job ? job.toJSON() : null;
    }

    getAllJobs() {
        return Array.from(this.jobs.values()).map(job => job.toJSON());
    }

    getJobsByStatus(status) {
        return Array.from(this.jobs.values())
            .filter(job => job.status === status)
            .map(job => job.toJSON());
    }

    getStatistics() {
        const jobs = Array.from(this.jobs.values());

        const stats = {
            total: jobs.length,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            totalDuration: 0,
            averageDuration: 0,
            successRate: 0
        };

        jobs.forEach(job => {
            stats[job.status]++;
            if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
                stats.totalDuration += job.getDuration();
            }
        });

        if (stats.completed > 0) {
            stats.averageDuration = stats.totalDuration / stats.completed;
            stats.successRate = (stats.completed / (stats.completed + stats.failed)) * 100;
        }

        return stats;
    }

    clearCompleted() {
        const completedJobs = Array.from(this.jobs.entries())
            .filter(([, job]) => job.status === JobStatus.COMPLETED);

        completedJobs.forEach(([jobId]) => {
            this.jobs.delete(jobId);
        });

        this.emit('jobs:cleared', completedJobs.length);
    }

    exportResults() {
        const completedJobs = this.getJobsByStatus(JobStatus.COMPLETED);

        return {
            timestamp: new Date().toISOString(),
            statistics: this.getStatistics(),
            results: completedJobs.map(job => ({
                fileName: job.fileName,
                filePath: job.filePath,
                duration: job.duration,
                result: job.result
            }))
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        this.cancelAll();
        this.jobs.clear();
        this.queue = [];
        this.processing.clear();
        this.removeAllListeners();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 7: COMPARADOR DE DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════

class DocumentComparator {
    constructor(options = {}) {
        this.config = {
            similarityThreshold: OCRConfig.similarityThreshold,
            ignoreCase: true,
            ignoreWhitespace: true,
            contextLines: 3,
            ...options
        };
        this.tokenizer = new natural.WordTokenizer();
    }

    compare(doc1, doc2) {
        console.log('🔍 Comparando documentos...');

        const comparison = {
            timestamp: new Date().toISOString(),
            document1: this.getDocumentInfo(doc1),
            document2: this.getDocumentInfo(doc2),
            textComparison: this.compareText(doc1.textoCompleto, doc2.textoCompleto),
            fieldComparison: this.compareFields(doc1, doc2),
            similarity: 0,
            changeScore: 0,
            summary: null
        };

        comparison.similarity = this.calculateSimilarity(
            doc1.textoCompleto,
            doc2.textoCompleto
        );

        comparison.changeScore = this.calculateChangeScore(comparison);
        comparison.summary = this.generateSummary(comparison);

        return comparison;
    }

    getDocumentInfo(doc) {
        return {
            tipoDocumento: doc.tipoDocumento,
            razonSocial: doc.razonSocial,
            fecha: doc.fecha,
            rfc: doc.rfc,
            folio: doc.folio,
            textLength: doc.textoCompleto ? doc.textoCompleto.length : 0
        };
    }

    compareText(text1, text2) {
        let t1 = text1 || '';
        let t2 = text2 || '';

        if (this.config.ignoreCase) {
            t1 = t1.toLowerCase();
            t2 = t2.toLowerCase();
        }

        if (this.config.ignoreWhitespace) {
            t1 = t1.replace(/\s+/g, ' ').trim();
            t2 = t2.replace(/\s+/g, ' ').trim();
        }

        const diff = Diff.diffWords(t1, t2);

        const changes = [];
        let addedCount = 0;
        let removedCount = 0;
        let unchangedCount = 0;

        diff.forEach((part) => {
            const change = {
                type: part.added ? ChangeType.ADDED :
                    part.removed ? ChangeType.REMOVED :
                        ChangeType.UNCHANGED,
                value: part.value,
                count: part.count || 0
            };

            if (part.added) addedCount += part.count;
            else if (part.removed) removedCount += part.count;
            else unchangedCount += part.count;

            changes.push(change);
        });

        const lineDiff = Diff.diffLines(text1, text2);

        return {
            wordDiff: changes,
            lineDiff: lineDiff,
            statistics: {
                added: addedCount,
                removed: removedCount,
                unchanged: unchangedCount,
                total: addedCount + removedCount + unchangedCount
            }
        };
    }

    compareFields(doc1, doc2) {
        const fields = [
            'tipoDocumento',
            'razonSocial',
            'fecha',
            'ubicacion',
            'rfc',
            'folio'
        ];

        const fieldComparisons = {};

        fields.forEach(field => {
            const val1 = doc1[field] || '';
            const val2 = doc2[field] || '';

            fieldComparisons[field] = {
                value1: val1,
                value2: val2,
                changed: val1 !== val2,
                similarity: this.calculateStringSimilarity(val1, val2)
            };
        });

        return fieldComparisons;
    }

    calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;

        const tokens1 = new Set(this.tokenizer.tokenize(text1.toLowerCase()));
        const tokens2 = new Set(this.tokenizer.tokenize(text2.toLowerCase()));

        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);

        const jaccard = intersection.size / union.size;
        const levenshtein = this.calculateLevenshteinSimilarity(text1, text2);

        return (jaccard * 0.6 + levenshtein * 0.4);
    }

    calculateLevenshteinSimilarity(str1, str2) {
        const distance = natural.LevenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);

        if (maxLength === 0) return 1;
        return 1 - (distance / maxLength);
    }

    calculateStringSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;

        return this.calculateLevenshteinSimilarity(
            str1.toLowerCase(),
            str2.toLowerCase()
        );
    }

    calculateChangeScore(comparison) {
        const textStats = comparison.textComparison.statistics;
        const totalChanges = textStats.added + textStats.removed;
        const totalWords = textStats.total;

        if (totalWords === 0) return 0;

        const changePercentage = (totalChanges / totalWords) * 100;
        return Math.min(100, changePercentage);
    }

    generateSummary(comparison) {
        const summary = {
            overallStatus: '',
            significantChanges: [],
            minorChanges: [],
            recommendations: []
        };

        if (comparison.similarity > 0.95) {
            summary.overallStatus = 'Documentos casi idénticos';
        } else if (comparison.similarity > 0.8) {
            summary.overallStatus = 'Documentos muy similares con cambios menores';
        } else if (comparison.similarity > 0.6) {
            summary.overallStatus = 'Documentos similares con cambios significativos';
        } else {
            summary.overallStatus = 'Documentos sustancialmente diferentes';
        }

        Object.entries(comparison.fieldComparison).forEach(([field, data]) => {
            if (data.changed) {
                const change = {
                    field: this.formatFieldName(field),
                    oldValue: data.value1,
                    newValue: data.value2,
                    similarity: data.similarity
                };

                if (data.similarity < 0.5) {
                    summary.significantChanges.push(change);
                } else {
                    summary.minorChanges.push(change);
                }
            }
        });

        if (comparison.changeScore > 50) {
            summary.recommendations.push('Se detectaron cambios sustanciales. Revisar manualmente.');
        }

        if (comparison.fieldComparison.razonSocial?.changed) {
            summary.recommendations.push('La razón social ha cambiado. Verificar identidad del documento.');
        }

        return summary;
    }

    formatFieldName(field) {
        const names = {
            tipoDocumento: 'Tipo de Documento',
            razonSocial: 'Razón Social',
            fecha: 'Fecha',
            ubicacion: 'Ubicación',
            rfc: 'RFC',
            folio: 'Folio'
        };
        return names[field] || field;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 8: GESTOR DE HISTORIAL
// ═══════════════════════════════════════════════════════════════════════════

class HistoryManager {
    constructor(dbPath) {
        this.dbPath = dbPath || OCRConfig.historyDbPath || path.join(process.cwd(), 'data', 'ocr-history.db');
        this.db = null;
        this.initialize();
    }

    initialize() {
        const dir = path.dirname(this.dbPath);
        if (!fsSync.existsSync(dir)) {
            fsSync.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');

        this.createTables();

        console.log('✅ HistoryManager inicializado:', this.dbPath);
    }

    createTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER,
                processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processing_duration INTEGER,
                tipo_documento TEXT,
                razon_social TEXT,
                fecha TEXT,
                ubicacion TEXT,
                rfc TEXT,
                folio TEXT,
                texto_completo TEXT,
                confianza REAL,
                tags TEXT,
                notes TEXT,
                UNIQUE(file_path, processed_at)
            )
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_file_name ON documents(file_name);
            CREATE INDEX IF NOT EXISTS idx_processed_at ON documents(processed_at);
            CREATE INDEX IF NOT EXISTS idx_tipo_documento ON documents(tipo_documento);
            CREATE INDEX IF NOT EXISTS idx_razon_social ON documents(razon_social);
            CREATE INDEX IF NOT EXISTS idx_rfc ON documents(rfc);
        `);

        this.db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                file_name,
                tipo_documento,
                razon_social,
                texto_completo,
                content='documents',
                content_rowid='id'
            )
        `);

        this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
                INSERT INTO documents_fts(rowid, file_name, tipo_documento, razon_social, texto_completo)
                VALUES (new.id, new.file_name, new.tipo_documento, new.razon_social, new.texto_completo);
            END;
        `);
    }

    saveDocument(filePath, result, metadata = {}) {
        const stmt = this.db.prepare(`
            INSERT INTO documents (
                file_path, file_name, file_size, processing_duration,
                tipo_documento, razon_social, fecha, ubicacion, rfc, folio,
                texto_completo, confianza, tags, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
            filePath,
            path.basename(filePath),
            metadata.fileSize || 0,
            metadata.duration || 0,
            result.tipoDocumento || null,
            result.razonSocial || null,
            result.fecha || null,
            result.ubicacion || null,
            result.rfc || null,
            result.folio || null,
            result.textoCompleto || null,
            result.confianza || 0,
            metadata.tags ? JSON.stringify(metadata.tags) : null,
            metadata.notes || null
        );

        return info.lastInsertRowid;
    }

    search(query, filters = {}) {
        let sql = 'SELECT * FROM documents WHERE 1=1';
        const params = [];

        if (query) {
            sql = `
                SELECT d.* FROM documents d
                INNER JOIN documents_fts fts ON d.id = fts.rowid
                WHERE documents_fts MATCH ?
            `;
            params.push(query);
        }

        if (filters.tipoDocumento) {
            sql += ' AND tipo_documento = ?';
            params.push(filters.tipoDocumento);
        }

        if (filters.dateFrom) {
            sql += ' AND processed_at >= ?';
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            sql += ' AND processed_at <= ?';
            params.push(filters.dateTo);
        }

        sql += ` ORDER BY processed_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(filters.limit);
        }

        return this.db.prepare(sql).all(...params);
    }

    getRecent(limit = 50) {
        return this.db.prepare(`
            SELECT * FROM documents
            ORDER BY processed_at DESC
            LIMIT ?
        `).all(limit);
    }

    getSummary() {
        const totalDocs = this.db.prepare('SELECT COUNT(*) as count FROM documents').get();
        const avgConfidence = this.db.prepare('SELECT AVG(confianza) as avg FROM documents').get();

        const typeDistribution = this.db.prepare(`
            SELECT tipo_documento, COUNT(*) as count
            FROM documents
            GROUP BY tipo_documento
            ORDER BY count DESC
        `).all();

        return {
            totalDocuments: totalDocs.count,
            averageConfidence: avgConfidence.avg || 0,
            typeDistribution
        };
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 9: EXPORTAR MÓDULOS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
    // Servicios principales
    OcrService,
    TesseractInitService,
    OcrPipeline,
    OcrCacheManager,

    // Procesamiento por lotes
    BatchProcessor,
    OcrJob,
    JobStatus,

    // Comparación
    DocumentComparator,
    ChangeType,

    // Historial
    HistoryManager,

    // Configuración
    OCRConfig
};

// ═══════════════════════════════════════════════════════════════════════════
// FIN DEL SISTEMA OCR COMPLETO
// ═══════════════════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   SISTEMA OCR COMPLETO - KODIFICADOR                      ║
║                            Versión 2.0.0                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ✓ Procesamiento OCR Offline                                             ║
║  ✓ Conversión PDF a Imágenes                                             ║
║  ✓ Procesamiento por Lotes                                               ║
║  ✓ Comparación de Documentos                                             ║
║  ✓ Historial con Búsqueda Full-Text                                      ║
║  ✓ Extracción Inteligente de Datos                                       ║
║  ✓ Sistema de Caché                                                      ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);
