/**
 * DOCUMENT VIEWER - SISTEMA DE VISUALIZACIÓN INTEGRADO
 * Visor universal de documentos con soporte para múltiples formatos
 * @version 1.0.0
 */

// ==================== CONFIGURACIÓN ====================
const ViewerConfig = {
    PDF: {
        scale: 1.5,
        maxScale: 3.0,
        minScale: 0.5,
        scaleStep: 0.25,
        enableTextSelection: true,
        enableAnnotations: true
    },
    IMAGE: {
        maxZoom: 5,
        minZoom: 0.1,
        zoomStep: 0.2,
        enablePan: true,
        enableRotate: true
    },
    OFFICE: {
        useGoogleViewer: true,
        useMicrosoftViewer: false,
        fallbackToPDF: true
    },
    GENERAL: {
        enableFullscreen: true,
        enableDownload: true,
        enablePrint: true,
        showToolbar: true,
        theme: 'light' // 'light' | 'dark'
    }
};

// ==================== VISOR BASE ====================
class DocumentViewer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.config = { ...ViewerConfig.GENERAL, ...options };
        this.currentDocument = null;
        this.viewerInstance = null;
        this.isFullscreen = false;

        this.init();
    }

    init() {
        if (!this.container) {
            throw new Error('Container no encontrado');
        }

        this.createViewerStructure();
        this.setupEventListeners();
        console.log('✅ DocumentViewer inicializado');
    }

    createViewerStructure() {
        this.container.innerHTML = `
            <div class="document-viewer ${this.config.theme}">
                <!-- Toolbar -->
                <div class="viewer-toolbar" id="viewerToolbar">
                    <div class="toolbar-left">
                        <button class="toolbar-btn" id="btnClose" title="Cerrar (Esc)">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                            </svg>
                        </button>
                        <div class="toolbar-divider"></div>
                        <span class="document-title" id="documentTitle">Sin documento</span>
                    </div>

                    <div class="toolbar-center" id="viewerControls">
                        <!-- Los controles específicos se insertan aquí -->
                    </div>

                    <div class="toolbar-right">
                        <button class="toolbar-btn" id="btnDownload" title="Descargar">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="btnPrint" title="Imprimir">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"/>
                            </svg>
                        </button>
                        <button class="toolbar-btn" id="btnFullscreen" title="Pantalla completa (F)">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Contenedor principal -->
                <div class="viewer-content" id="viewerContent">
                    <div class="viewer-loading" id="viewerLoading">
                        <div class="loading-spinner"></div>
                        <p>Cargando documento...</p>
                    </div>
                </div>

                <!-- Info panel -->
                <div class="viewer-info" id="viewerInfo">
                    <div class="info-content">
                        <span class="info-item" id="infoPages"></span>
                        <span class="info-item" id="infoSize"></span>
                        <span class="info-item" id="infoZoom"></span>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Botón cerrar
        document.getElementById('btnClose')?.addEventListener('click', () => this.close());

        // Botón descargar
        document.getElementById('btnDownload')?.addEventListener('click', () => this.download());

        // Botón imprimir
        document.getElementById('btnPrint')?.addEventListener('click', () => this.print());

        // Botón pantalla completa
        document.getElementById('btnFullscreen')?.addEventListener('click', () => this.toggleFullscreen());

        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Fullscreen change
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
        });
    }

    async open(documentPath, documentInfo = {}) {
        try {
            this.showLoading();
            this.currentDocument = { path: documentPath, ...documentInfo };

            // Actualizar título
            const titleElement = document.getElementById('documentTitle');
            if (titleElement) {
                titleElement.textContent = documentInfo.nombre || 'Documento';
            }

            // Determinar tipo de documento y abrir visor apropiado
            const extension = this.getFileExtension(documentPath);
            const viewer = this.getViewerForExtension(extension);

            if (viewer) {
                this.viewerInstance = new viewer(this);
                await this.viewerInstance.load(documentPath, documentInfo);
                this.hideLoading();
            } else {
                throw new Error(`Formato no soportado: ${extension}`);
            }

            // Mostrar el visor
            this.container.style.display = 'block';

        } catch (error) {
            console.error('Error abriendo documento:', error);
            this.showError(error.message);
        }
    }

    close() {
        if (this.viewerInstance && this.viewerInstance.destroy) {
            this.viewerInstance.destroy();
        }

        this.viewerInstance = null;
        this.currentDocument = null;
        this.container.style.display = 'none';

        // Salir de pantalla completa si está activo
        if (this.isFullscreen) {
            document.exitFullscreen();
        }
    }

    async download() {
        if (!this.currentDocument) return;

        try {
            await window.documentAPI.showInFolder(this.currentDocument.path);
        } catch (error) {
            console.error('Error descargando:', error);
        }
    }

    print() {
        if (this.viewerInstance && this.viewerInstance.print) {
            this.viewerInstance.print();
        } else {
            window.print();
        }
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    updateFullscreenButton() {
        const btn = document.getElementById('btnFullscreen');
        if (btn) {
            btn.title = this.isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)';
        }
    }

    handleKeyboard(e) {
        if (!this.currentDocument) return;

        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'f':
            case 'F':
                if (!e.ctrlKey && !e.metaKey) {
                    this.toggleFullscreen();
                }
                break;
            case 'p':
            case 'P':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.print();
                }
                break;
        }

        // Delegar al visor específico
        if (this.viewerInstance && this.viewerInstance.handleKeyboard) {
            this.viewerInstance.handleKeyboard(e);
        }
    }

    getFileExtension(path) {
        return path.split('.').pop().toLowerCase();
    }

    getViewerForExtension(extension) {
        const viewers = {
            'pdf': PDFViewer,
            'jpg': ImageViewer,
            'jpeg': ImageViewer,
            'png': ImageViewer,
            'gif': ImageViewer,
            'bmp': ImageViewer,
            'webp': ImageViewer,
            'svg': ImageViewer,
            'doc': OfficeViewer,
            'docx': OfficeViewer,
            'xls': OfficeViewer,
            'xlsx': OfficeViewer,
            'ppt': OfficeViewer,
            'pptx': OfficeViewer,
            'txt': TextViewer
        };

        return viewers[extension];
    }

    showLoading() {
        const loading = document.getElementById('viewerLoading');
        if (loading) loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('viewerLoading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const content = document.getElementById('viewerContent');
        if (content) {
            content.innerHTML = `
                <div class="viewer-error">
                    <svg width="64" height="64" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
                    </svg>
                    <h3>Error al cargar el documento</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="documentViewer.close()">Cerrar</button>
                </div>
            `;
        }
        this.hideLoading();
    }

    updateInfo(info) {
        if (info.pages) {
            const pagesElement = document.getElementById('infoPages');
            if (pagesElement) pagesElement.textContent = `Página ${info.currentPage} de ${info.totalPages}`;
        }

        if (info.zoom) {
            const zoomElement = document.getElementById('infoZoom');
            if (zoomElement) zoomElement.textContent = `${Math.round(info.zoom * 100)}%`;
        }

        if (info.size) {
            const sizeElement = document.getElementById('infoSize');
            if (sizeElement) sizeElement.textContent = info.size;
        }
    }
}

// ==================== VISOR PDF ====================
class PDFViewer {
    constructor(parentViewer) {
        this.parent = parentViewer;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = ViewerConfig.PDF.scale;
        this.rotation = 0;
        this.canvas = null;
        this.ctx = null;
    }

    async load(path, info) {
        try {
            // Crear controles específicos de PDF
            this.createControls();

            // Crear canvas
            const content = document.getElementById('viewerContent');
            content.innerHTML = `
                <div class="pdf-container">
                    <canvas id="pdfCanvas"></canvas>
                </div>
            `;

            this.canvas = document.getElementById('pdfCanvas');
            this.ctx = this.canvas.getContext('2d');

            // Cargar PDF usando PDF.js (si está disponible)
            // Por ahora, mostraremos una imagen de placeholder
            await this.renderPlaceholder(info);

        } catch (error) {
            throw new Error('Error cargando PDF: ' + error.message);
        }
    }

    async renderPlaceholder(info) {
        // Placeholder hasta integrar PDF.js
        const content = document.getElementById('viewerContent');
        content.innerHTML = `
            <div class="pdf-placeholder">
                <div class="placeholder-icon">📄</div>
                <h3>${info.nombre}</h3>
                <p>Visor PDF en desarrollo</p>
                <p class="text-muted">Se integrará PDF.js para renderizado completo</p>
                <div class="placeholder-actions">
                    <button class="btn btn-primary" onclick="documentViewer.download()">
                        Descargar PDF
                    </button>
                    <button class="btn btn-secondary" onclick="window.documentAPI.open('${this.parent.currentDocument.path.replace(/\\/g, '\\\\')}')">
                        Abrir con aplicación externa
                    </button>
                </div>
            </div>
        `;

        this.parent.updateInfo({
            pages: true,
            currentPage: 1,
            totalPages: 1
        });
    }

    createControls() {
        const controls = document.getElementById('viewerControls');
        controls.innerHTML = `
            <button class="toolbar-btn" id="btnPrevPage" title="Página anterior">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
                </svg>
            </button>
            <span class="page-indicator">
                <input type="number" id="pageInput" value="1" min="1" max="1" class="page-input">
                <span>/ <span id="totalPages">1</span></span>
            </span>
            <button class="toolbar-btn" id="btnNextPage" title="Página siguiente">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                </svg>
            </button>
            <div class="toolbar-divider"></div>
            <button class="toolbar-btn" id="btnZoomOut" title="Alejar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"/>
                </svg>
            </button>
            <span class="zoom-indicator" id="zoomLevel">150%</span>
            <button class="toolbar-btn" id="btnZoomIn" title="Acercar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
                </svg>
            </button>
            <button class="toolbar-btn" id="btnRotate" title="Rotar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                </svg>
            </button>
        `;

        // Event listeners
        document.getElementById('btnPrevPage')?.addEventListener('click', () => this.prevPage());
        document.getElementById('btnNextPage')?.addEventListener('click', () => this.nextPage());
        document.getElementById('btnZoomIn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('btnZoomOut')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('btnRotate')?.addEventListener('click', () => this.rotate());
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderPage();
        }
    }

    nextPage() {
        // Implementar cuando tengamos el total de páginas
        this.currentPage++;
        this.renderPage();
    }

    zoomIn() {
        this.scale = Math.min(this.scale + ViewerConfig.PDF.scaleStep, ViewerConfig.PDF.maxScale);
        this.renderPage();
        this.parent.updateInfo({ zoom: this.scale });
    }

    zoomOut() {
        this.scale = Math.max(this.scale - ViewerConfig.PDF.scaleStep, ViewerConfig.PDF.minScale);
        this.renderPage();
        this.parent.updateInfo({ zoom: this.scale });
    }

    rotate() {
        this.rotation = (this.rotation + 90) % 360;
        this.renderPage();
    }

    renderPage() {
        // Implementar renderizado con PDF.js
        console.log(`Renderizando página ${this.currentPage} con zoom ${this.scale} y rotación ${this.rotation}`);
    }

    handleKeyboard(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'PageUp':
                this.prevPage();
                break;
            case 'ArrowRight':
            case 'PageDown':
                this.nextPage();
                break;
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
            case '_':
                this.zoomOut();
                break;
            case 'r':
            case 'R':
                this.rotate();
                break;
        }
    }

    print() {
        // Implementar impresión de PDF
        window.print();
    }

    destroy() {
        this.pdfDoc = null;
        this.canvas = null;
        this.ctx = null;
    }
}

// ==================== VISOR DE IMÁGENES ====================
class ImageViewer {
    constructor(parentViewer) {
        this.parent = parentViewer;
        this.image = null;
        this.zoom = 1;
        this.rotation = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.translateX = 0;
        this.translateY = 0;
    }

    async load(path, info) {
        try {
            this.createControls();

            const content = document.getElementById('viewerContent');
            content.innerHTML = `
                <div class="image-container" id="imageContainer">
                    <img id="viewerImage" src="file://${path}" alt="${info.nombre}">
                </div>
            `;

            this.image = document.getElementById('viewerImage');
            this.setupImageEvents();

            // Esperar a que la imagen cargue
            await new Promise((resolve, reject) => {
                this.image.onload = resolve;
                this.image.onerror = reject;
            });

            this.updateImageInfo();

        } catch (error) {
            throw new Error('Error cargando imagen: ' + error.message);
        }
    }

    createControls() {
        const controls = document.getElementById('viewerControls');
        controls.innerHTML = `
            <button class="toolbar-btn" id="btnZoomOut" title="Alejar (-)">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"/>
                </svg>
            </button>
            <span class="zoom-indicator" id="zoomLevel">100%</span>
            <button class="toolbar-btn" id="btnZoomIn" title="Acercar (+)">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
                </svg>
            </button>
            <button class="toolbar-btn" id="btnZoomReset" title="Tamaño original (0)">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"/>
                </svg>
            </button>
            <div class="toolbar-divider"></div>
            <button class="toolbar-btn" id="btnRotateLeft" title="Rotar izquierda">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
                </svg>
            </button>
            <button class="toolbar-btn" id="btnRotateRight" title="Rotar derecha (R)">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"/>
                </svg>
            </button>
            <button class="toolbar-btn" id="btnFitScreen" title="Ajustar a pantalla">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z"/>
                </svg>
            </button>
        `;

        // Event listeners
        document.getElementById('btnZoomIn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('btnZoomOut')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('btnZoomReset')?.addEventListener('click', () => this.resetZoom());
        document.getElementById('btnRotateLeft')?.addEventListener('click', () => this.rotateLeft());
        document.getElementById('btnRotateRight')?.addEventListener('click', () => this.rotateRight());
        document.getElementById('btnFitScreen')?.addEventListener('click', () => this.fitToScreen());
    }

    setupImageEvents() {
        const container = document.getElementById('imageContainer');

        // Zoom con rueda del mouse
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        });

        // Pan con arrastre
        this.image.addEventListener('mousedown', (e) => {
            if (this.zoom > 1) {
                this.isDragging = true;
                this.startX = e.clientX - this.translateX;
                this.startY = e.clientY - this.translateY;
                this.image.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.translateX = e.clientX - this.startX;
                this.translateY = e.clientY - this.startY;
                this.updateTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            if (this.image) {
                this.image.style.cursor = this.zoom > 1 ? 'grab' : 'default';
            }
        });
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom + ViewerConfig.IMAGE.zoomStep, ViewerConfig.IMAGE.maxZoom);
        this.updateTransform();
        this.updateZoomIndicator();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - ViewerConfig.IMAGE.zoomStep, ViewerConfig.IMAGE.minZoom);
        if (this.zoom === 1) {
            this.translateX = 0;
            this.translateY = 0;
        }
        this.updateTransform();
        this.updateZoomIndicator();
    }

    resetZoom() {
        this.zoom = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
        this.updateZoomIndicator();
    }

    rotateLeft() {
        this.rotation = (this.rotation - 90 + 360) % 360;
        this.updateTransform();
    }

    rotateRight() {
        this.rotation = (this.rotation + 90) % 360;
        this.updateTransform();
    }

    fitToScreen() {
        const container = document.getElementById('imageContainer');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imageWidth = this.image.naturalWidth;
        const imageHeight = this.image.naturalHeight;

        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        this.zoom = Math.min(scaleX, scaleY) * 0.9;

        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
        this.updateZoomIndicator();
    }

    updateTransform() {
        if (this.image) {
            this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.zoom}) rotate(${this.rotation}deg)`;
            this.image.style.cursor = this.zoom > 1 ? 'grab' : 'default';
        }
    }

    updateZoomIndicator() {
        const indicator = document.getElementById('zoomLevel');
        if (indicator) {
            indicator.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    updateImageInfo() {
        const size = `${this.image.naturalWidth} × ${this.image.naturalHeight}`;
        this.parent.updateInfo({ size, zoom: this.zoom });
    }

    handleKeyboard(e) {
        switch (e.key) {
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
            case '_':
                this.zoomOut();
                break;
            case '0':
                this.resetZoom();
                break;
            case 'r':
            case 'R':
                this.rotateRight();
                break;
            case 'ArrowLeft':
                if (this.zoom > 1) {
                    this.translateX += 50;
                    this.updateTransform();
                }
                break;
            case 'ArrowRight':
                if (this.zoom > 1) {
                    this.translateX -= 50;
                    this.updateTransform();
                }
                break;
            case 'ArrowUp':
                if (this.zoom > 1) {
                    this.translateY += 50;
                    this.updateTransform();
                }
                break;
            case 'ArrowDown':
                if (this.zoom > 1) {
                    this.translateY -= 50;
                    this.updateTransform();
                }
                break;
        }
    }

    destroy() {
        this.image = null;
    }
}

// ==================== VISOR DE OFFICE ====================
class OfficeViewer {
    constructor(parentViewer) {
        this.parent = parentViewer;
    }

    async load(path, info) {
        const content = document.getElementById('viewerContent');

        content.innerHTML = `
            <div class="office-viewer">
                <div class="office-placeholder">
                    <div class="placeholder-icon">📄</div>
                    <h3>${info.nombre}</h3>
                    <p>Documentos de Office requieren aplicación externa</p>
                    <div class="placeholder-actions">
                        <button class="btn btn-primary" onclick="window.documentAPI.open('${path.replace(/\\/g, '\\\\')}')">
                            Abrir con aplicación predeterminada
                        </button>
                        <button class="btn btn-secondary" onclick="window.documentAPI.showInFolder('${path.replace(/\\/g, '\\\\')}')">
                            Mostrar en carpeta
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createControls() {
        // Sin controles específicos
        document.getElementById('viewerControls').innerHTML = '';
    }

    destroy() {
        // Cleanup
    }
}

// ==================== VISOR DE TEXTO ====================
class TextViewer {
    constructor(parentViewer) {
        this.parent = parentViewer;
        this.fontSize = 14;
    }

    async load(path, info) {
        try {
            this.createControls();

            // Leer archivo de texto usando API segura
            const result = await window.documentAPI.readFile(path);

            if (!result.success) {
                throw new Error(result.error);
            }

            const container = document.getElementById('viewerContent');
            container.innerHTML = `
                <div class="text-viewer">
                    <pre id="textContent">${this.escapeHtml(result.data)}</pre>
                </div>
            `;

            this.updateFontSize();

        } catch (error) {
            throw new Error('Error cargando archivo de texto: ' + error.message);
        }
    }

    createControls() {
        const controls = document.getElementById('viewerControls');
        controls.innerHTML = `
            <button class="toolbar-btn" id="btnFontSmaller" title="Reducir fuente">
                A-
            </button>
            <span class="font-indicator" id="fontSize">14px</span>
            <button class="toolbar-btn" id="btnFontLarger" title="Aumentar fuente">
                A+
            </button>
        `;

        document.getElementById('btnFontSmaller')?.addEventListener('click', () => this.decreaseFontSize());
        document.getElementById('btnFontLarger')?.addEventListener('click', () => this.increaseFontSize());
    }

    increaseFontSize() {
        this.fontSize = Math.min(this.fontSize + 2, 32);
        this.updateFontSize();
    }

    decreaseFontSize() {
        this.fontSize = Math.max(this.fontSize - 2, 8);
        this.updateFontSize();
    }

    updateFontSize() {
        const textContent = document.getElementById('textContent');
        if (textContent) {
            textContent.style.fontSize = `${this.fontSize}px`;
        }

        const indicator = document.getElementById('fontSize');
        if (indicator) {
            indicator.textContent = `${this.fontSize}px`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Cleanup
    }
}
