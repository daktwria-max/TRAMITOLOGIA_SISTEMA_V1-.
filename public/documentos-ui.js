/**
 * DOCUMENTOS UI - SISTEMA COMPLETO v2.0.0
 * Gestión de documentos con Drag & Drop, Versiones, Batch Upload y Visor Integrado
 */

// Estado global
let documentState = {
  currentPath: 'root',
  viewMode: 'grid',
  selectedFiles: new Set(),
  documents: [],
  filter: 'todos',
  sort: 'fecha_desc',
  searchQuery: ''
};

const MAX_DOC_SIZE = 200 * 1024 * 1024; // 200MB
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'js'];

// ==================== INICIALIZACIÓN ====================

async function mostrarDocumentos() {
  const container = document.getElementById('contentArea');

  // 1. Estructura Base
  container.innerHTML = `
        <div class="page-header">
            <div class="header-content">
                <div>
                    <h1>📄 Gestión de Documentos</h1>
                    <p class="text-muted">Administra, organiza y visualiza tus archivos</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="iniciarSlideshow()">
                        🖼️ Presentación
                    </button>
                    <button class="btn btn-secondary" onclick="abrirGaleriaImagenes()">
                        📷 Galería
                    </button>
                    <button class="btn btn-primary" onclick="abrirModalSubida()">
                        ☁️ Subir Documento
                    </button>
                </div>
            </div>
        </div>

        <!-- Toolbar de Selección -->
        <div class="selection-toolbar" id="selectionToolbar">
            <div class="selection-count">0 seleccionados</div>
            <div class="selection-actions">
                <button class="btn btn-sm" onclick="compararSeleccionados()">⚖️ Comparar</button>
                <button class="btn btn-sm" onclick="descargarSeleccionados()">📥 Descargar</button>
                <button class="btn btn-sm" onclick="eliminarSeleccionados()">🗑️ Eliminar</button>
                <button class="btn btn-sm" onclick="cancelarSeleccion()">✕ Cancelar</button>
            </div>
        </div>

        <!-- Estadísticas Rápidas -->
        <div class="estadisticas-section">
            <div class="stats-grid" id="statsGrid">
                <div class="loading-spinner">Cargando estadísticas...</div>
            </div>
        </div>

        <!-- Toolbar Principal -->
        <div class="toolbar">
            <div class="toolbar-left">
                <div class="search-box">
                    <input type="text" 
                           class="search-input" 
                           placeholder="Buscar documentos..." 
                           oninput="handleSearch(this.value)">
                </div>
                <select class="filter-select" onchange="handleFilter(this.value)">
                    <option value="todos">Todos los archivos</option>
                    <option value="pdf">📄 PDF</option>
                    <option value="imagen">🖼️ Imágenes</option>
                    <option value="office">📝 Office</option>
                    <option value="otros">📦 Otros</option>
                </select>
            </div>
            <div class="toolbar-right">
                <span class="contador" id="docCount">0 documentos</span>
                <div class="view-toggle">
                    <button class="btn-icon active" onclick="cambiarVista('grid')" title="Vista Cuadrícula">
                        📱
                    </button>
                    <button class="btn-icon" onclick="cambiarVista('list')" title="Vista Lista">
                        equiv
                    </button>
                </div>
            </div>
        </div>

        <!-- Zona de Drop -->
        <div class="drop-zone" id="dropZone">
            <div class="drop-zone-content">
                <div class="drop-zone-icon">☁️</div>
                <h3>Arrastra y suelta archivos aquí</h3>
                <p>O haz clic para seleccionar</p>
            </div>
        </div>

        <!-- Contenedor de Documentos -->
        <div class="main-content" id="documentosContainer">
            <div class="loading-spinner">Cargando documentos...</div>
        </div>

        <!-- Container del Visor (Inyectado dinámicamente) -->
        <div id="documentViewerContainer" style="display: none;"></div>

        <!-- Modal de Subida -->
        <div class="modal-overlay" id="uploadModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Subir Documentos</h3>
                    <button class="modal-close" onclick="cerrarModalSubida()">×</button>
                </div>
                <div class="modal-body">
                    <div class="upload-batch-container" id="uploadBatchList"></div>
                    <div class="form-actions" style="margin-top: 1rem;">
                        <button class="btn btn-secondary" onclick="cerrarModalSubida()">Cancelar</button>
                        <button class="btn btn-primary" onclick="iniciarSubidaBatch()">Iniciar Subida</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // 2. Inicializar Eventos y Visor
  setupDragAndDrop();
  initDocumentViewer();

  // 3. Cargar Datos
  await cargarEstadisticas();
  await cargarDocumentos();
}

// ==================== VISOR INTEGRATION ====================

let documentViewer = null;

function initDocumentViewer() {
  if (!documentViewer && typeof DocumentViewer !== 'undefined') {
    documentViewer = new DocumentViewer('documentViewerContainer', {
      theme: 'dark',
      enableFullscreen: true,
      enableDownload: true,
      enablePrint: true
    });
  }
}

async function abrirDocumento(docIdOrPath) {
  // Soporte para llamar con ID o con ruta directa (para compatibilidad)
  let doc = documentState.documents.find(d => d.id === docIdOrPath);

  if (!doc && typeof docIdOrPath === 'string') {
    // Si no encontramos por ID, intentamos buscar por ruta o crear objeto temporal
    doc = documentState.documents.find(d => d.ruta === docIdOrPath);
    if (!doc) {
      // Objeto temporal si es ruta directa
      doc = {
        ruta: docIdOrPath,
        nombre: docIdOrPath.split(/[\\/]/).pop(),
        tipo: docIdOrPath.split('.').pop().toLowerCase(),
        id: 'temp-' + Date.now()
      };
    }
  }

  if (!doc) {
    alert('Documento no encontrado');
    return;
  }

  try {
    const checkResult = await window.documentAPI.checkExists(doc.ruta);

    if (!checkResult.success || !checkResult.exists) {
      throw new Error('El archivo no existe en el sistema');
    }

    const extension = doc.tipo.toLowerCase();
    const viewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'txt'];

    if (viewableExtensions.includes(extension) && documentViewer) {
      await documentViewer.open(doc.ruta, {
        nombre: doc.nombre,
        tipo: doc.tipo,
        tamanio: doc.tamanio,
        id: doc.id
      });
    } else {
      const resultado = await window.documentAPI.open(doc.ruta);
      if (!resultado.success) {
        throw new Error(resultado.error);
      }
    }
  } catch (error) {
    console.error('Error abriendo documento:', error);
    alert('Error: ' + error.message);
  }
}

// ==================== GALERÍA & SLIDESHOW ====================

function abrirGaleriaImagenes() {
  const imagenes = documentState.documents.filter(doc =>
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(doc.tipo.toLowerCase())
  );

  if (imagenes.length === 0) {
    alert('No hay imágenes para mostrar');
    return;
  }

  // Aquí podríamos implementar una vista de galería más elaborada
  // Por ahora, filtramos la vista principal
  const select = document.querySelector('.filter-select');
  if (select) {
    select.value = 'imagen';
    handleFilter('imagen');
  }
}

let slideshowInterval = null;
let slideshowIndex = 0;
let slideshowImages = [];

function iniciarSlideshow() {
  slideshowImages = documentState.documents.filter(doc =>
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(doc.tipo.toLowerCase())
  );

  if (slideshowImages.length === 0) {
    alert('No hay imágenes para la presentación');
    return;
  }

  slideshowIndex = 0;

  // Crear modal de slideshow si no existe
  let modal = document.getElementById('slideshowModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'slideshowModal';
    modal.className = 'modal-overlay active';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
        <div class="modal-container" style="max-width: 90vw; height: 90vh; display: flex; flex-direction: column;">
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000;">
                <img id="slideshowImage" src="" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
            <div style="padding: 1rem; background: #fff; display: flex; justify-content: space-between; align-items: center;">
                <h4 id="slideshowTitle" style="margin: 0;"></h4>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" onclick="prevSlide()">←</button>
                    <button class="btn btn-secondary" onclick="toggleSlideshow()" id="btnPlayPause">⏸</button>
                    <button class="btn btn-secondary" onclick="nextSlide()">→</button>
                    <button class="btn btn-danger" onclick="cerrarSlideshow()">Salir</button>
                </div>
            </div>
        </div>
    `;

  actualizarSlide();
  slideshowInterval = setInterval(nextSlide, 3000);
}

function actualizarSlide() {
  const img = document.getElementById('slideshowImage');
  const title = document.getElementById('slideshowTitle');
  const doc = slideshowImages[slideshowIndex];

  if (img && doc) {
    img.src = `file://${doc.ruta}`;
    title.textContent = `${doc.nombre} (${slideshowIndex + 1}/${slideshowImages.length})`;
  }
}

function nextSlide() {
  slideshowIndex = (slideshowIndex + 1) % slideshowImages.length;
  actualizarSlide();
}

function prevSlide() {
  slideshowIndex = (slideshowIndex - 1 + slideshowImages.length) % slideshowImages.length;
  actualizarSlide();
}

function toggleSlideshow() {
  const btn = document.getElementById('btnPlayPause');
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    if (btn) btn.textContent = '▶';
  } else {
    slideshowInterval = setInterval(nextSlide, 3000);
    if (btn) btn.textContent = '⏸';
  }
}

function cerrarSlideshow() {
  if (slideshowInterval) clearInterval(slideshowInterval);
  const modal = document.getElementById('slideshowModal');
  if (modal) modal.remove();
}

// ==================== LOGICA PRINCIPAL ====================

async function cargarDocumentos() {
  try {
    const docs = await window.documentAPI.obtenerDocumentos(null);
    documentState.documents = docs;
    renderizarDocumentos();
    actualizarContador();
  } catch (error) {
    console.error('Error cargando documentos:', error);
  }
}

function renderizarDocumentos() {
  const container = document.getElementById('documentosContainer');
  const docs = filtrarDocumentos(documentState.documents);

  if (docs.length === 0) {
    container.innerHTML = `
            <div class="estado-vacio">
                <div class="estado-vacio-icon">📭</div>
                <h3>No hay documentos</h3>
                <p>Sube tu primer archivo o ajusta los filtros</p>
            </div>
        `;
    return;
  }

  if (documentState.viewMode === 'grid') {
    renderGrid(docs, container);
  } else {
    renderList(docs, container);
  }
}

function renderGrid(docs, container) {
  container.innerHTML = `
        <div class="documentos-grid">
            ${docs.map(doc => crearTarjetaDocumento(doc)).join('')}
        </div>
    `;
}

function renderList(docs, container) {
  container.innerHTML = `
        <div class="documentos-list">
            <table class="documentos-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Tamaño</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${docs.map(doc => crearFilaDocumento(doc)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function crearTarjetaDocumento(doc) {
  const icon = obtenerIconoArchivo(doc.tipo);
  const size = formatearTamano(doc.tamanio);
  const date = new Date(doc.fecha_subida).toLocaleDateString();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(doc.tipo.toLowerCase());

  // Para imágenes usamos su propia ruta, para PDFs un icono grande
  const previewContent = isImage
    ? `<img src="file://${doc.ruta}" class="documento-thumb" alt="${doc.nombre}" loading="lazy">`
    : `<div class="documento-icon">${icon}</div>`;

  return `
        <div class="documento-card" onclick="seleccionarDocumento('${doc.id}')" ondblclick="abrirDocumento('${doc.id}')">
            ${doc.version > 1 ? `<span class="version-badge">v${doc.version}</span>` : ''}
            <div class="documento-preview ${isImage ? 'has-image' : ''}">
                ${previewContent}
            </div>
            <div class="documento-info">
                <div class="documento-nombre" title="${doc.nombre}">${doc.nombre}</div>
                <div class="documento-meta">
                    <span class="meta-item">📅 ${date}</span>
                    <span class="meta-item">📦 ${size}</span>
                </div>
            </div>
            <div class="documento-acciones">
                <button class="btn-icon-small" onclick="event.stopPropagation(); abrirDocumento('${doc.id}')" title="Ver">
                    👁️
                </button>
                <button class="btn-icon-small" onclick="event.stopPropagation(); verVersiones('${doc.id}')" title="Versiones">
                    🕒
                </button>
                <button class="btn-icon-small" onclick="event.stopPropagation(); confirmarEliminar('${doc.id}')" title="Eliminar">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

function crearFilaDocumento(doc) {
  const icon = obtenerIconoArchivo(doc.tipo);
  const size = formatearTamano(doc.tamanio);
  const date = new Date(doc.fecha_subida).toLocaleDateString();

  return `
        <tr class="documento-row" onclick="seleccionarDocumento('${doc.id}')" ondblclick="abrirDocumento('${doc.id}')">
            <td class="documento-nombre-cell">
                <span class="documento-icon-small">${icon}</span>
                ${doc.nombre}
                ${doc.version > 1 ? `<span class="version-badge-small">v${doc.version}</span>` : ''}
            </td>
            <td>${doc.tipo.toUpperCase()}</td>
            <td>${size}</td>
            <td>${date}</td>
            <td class="acciones-cell">
                <button class="btn-icon-small" onclick="event.stopPropagation(); abrirDocumento('${doc.id}')">👁️</button>
                <button class="btn-icon-small" onclick="event.stopPropagation(); verVersiones('${doc.id}')">🕒</button>
                <button class="btn-icon-small" style="color: var(--danger-color);" onclick="event.stopPropagation(); confirmarEliminar('${doc.id}')">🗑️</button>
            </td>
        </tr>
    `;
}

// ==================== DRAG & DROP & UPLOAD ====================

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-active'), false);
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'), false);
  dropZone.addEventListener('drop', handleDrop, false);

  dropZone.addEventListener('click', async () => {
    const result = await window.documentAPI.selectMultipleFiles();
    if (result.success) {
      prepararSubidaBatch(result.files);
    }
  });
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  document.getElementById('dropZone').classList.remove('drag-active');

  const validFiles = [];
  const errors = [];

  Array.from(files).forEach(f => {
    const validation = validateDoc(f);
    if (validation.valid) {
      validFiles.push({
        path: f.path,
        name: f.name,
        size: f.size
      });
    } else {
      errors.push(`${f.name}: ${validation.error}`);
    }
  });

  if (errors.length > 0) {
    alert(`Algunos archivos no se pudieron agregar:\n${errors.join('\n')}`);
  }

  if (validFiles.length > 0) {
    prepararSubidaBatch(validFiles);
  }
}

function validateDoc(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Tipo de archivo no permitido por seguridad' };
  }

  // Check size
  if (file.size > MAX_DOC_SIZE) {
    return { valid: false, error: 'Excede el tamaño máximo (200MB)' };
  }

  // Check duplicates in queue
  const isDuplicateQueue = colaSubida.some(item => item.path === file.path);
  if (isDuplicateQueue) {
    return { valid: false, error: 'Ya está en la cola de subida' };
  }

  return { valid: true };
}

let colaSubida = [];

function prepararSubidaBatch(files) {
  colaSubida = [...colaSubida, ...files.map(f => ({
    ...f,
    status: 'pending',
    proyecto_id: 'general'
  }))];

  actualizarListaBatch();
  document.getElementById('uploadModal').classList.add('active');
}

function actualizarListaBatch() {
  const list = document.getElementById('uploadBatchList');
  list.innerHTML = colaSubida.map((file, index) => `
        <div class="upload-batch-item">
            <div class="batch-item-icon">📄</div>
            <div class="batch-item-info">
                <strong>${file.name}</strong>
                <span>${formatearTamano(file.size)}</span>
            </div>
            <div class="batch-item-status ${file.status === 'success' ? 'status-success' : ''}">
                ${file.status}
            </div>
            ${file.status === 'pending' ? `
                <button class="btn-icon-small" onclick="removerDeCola(${index})">×</button>
            ` : ''}
        </div>
    `).join('');

  if (colaSubida.length > 0) {
    list.insertAdjacentHTML('beforeend', `
            <div style="text-align: right; margin-top: 0.5rem;">
                <button class="btn btn-sm btn-danger" onclick="limpiarCola()">🗑️ Limpiar Todo</button>
            </div>
        `);
  }
}

async function iniciarSubidaBatch() {
  for (let i = 0; i < colaSubida.length; i++) {
    if (colaSubida[i].status !== 'pending') continue;

    colaSubida[i].status = 'uploading';
    actualizarListaBatch();

    try {
      const result = await window.documentAPI.add({
        ruta: colaSubida[i].path,
        nombre: colaSubida[i].name,
        proyecto_id: 'general',
        tipo: 'documento',
        notas: 'Subido desde UI'
      });

      if (result.success) {
        colaSubida[i].status = 'success';
      } else {
        colaSubida[i].status = 'error';
        console.error(result.error);
      }
    } catch (error) {
      colaSubida[i].status = 'error';
    }
    actualizarListaBatch();
  }

  await cargarEstadisticas();
  await cargarDocumentos();
}

function cerrarModalSubida() {
  document.getElementById('uploadModal').classList.remove('active');
  colaSubida = [];
}

function abrirModalSubida() {
  document.getElementById('dropZone').click();
}

function removerDeCola(index) {
  colaSubida.splice(index, 1);
  actualizarListaBatch();
}

function limpiarCola() {
  colaSubida = [];
  actualizarListaBatch();
}

// ==================== UTILIDADES ====================

async function cargarEstadisticas() {
  try {
    const stats = await window.documentAPI.getStatistics();
    if (stats.success) {
      const data = stats.data;
      const grid = document.getElementById('statsGrid');
      if (grid) {
        grid.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon">📄</div>
                        <div class="stat-info">
                            <div class="stat-value">${data.count}</div>
                            <div class="stat-label">Total Documentos</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💾</div>
                        <div class="stat-info">
                            <div class="stat-value">${data.totalSizeMB} MB</div>
                            <div class="stat-label">Espacio Usado</div>
                        </div>
                    </div>
                `;
      }
    }
  } catch (error) {
    console.error('Error cargando estadísticas', error);
  }
}

function obtenerIconoArchivo(tipo) {
  const iconos = {
    'pdf': '📕',
    'doc': '📘', 'docx': '📘',
    'xls': '📗', 'xlsx': '📗',
    'jpg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
    'zip': '📦', 'txt': '📝'
  };
  return iconos[tipo] || '📄';
}

function formatearTamano(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function filtrarDocumentos(docs) {
  const query = documentState.searchQuery.toLowerCase();
  const filter = documentState.filter;

  return docs.filter(doc => {
    const matchesSearch = doc.nombre.toLowerCase().includes(query);
    let matchesFilter = true;

    if (filter !== 'todos') {
      if (filter === 'imagen') {
        matchesFilter = ['jpg', 'jpeg', 'png', 'gif'].includes(doc.tipo);
      } else if (filter === 'office') {
        matchesFilter = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(doc.tipo);
      } else {
        matchesFilter = doc.tipo === filter;
      }
    }

    return matchesSearch && matchesFilter;
  });
}

function handleSearch(query) {
  documentState.searchQuery = query;
  renderizarDocumentos();
}

function handleFilter(filter) {
  documentState.filter = filter;
  renderizarDocumentos();
}

function cambiarVista(mode) {
  documentState.viewMode = mode;
  renderizarDocumentos();
}

function actualizarContador() {
  const el = document.getElementById('docCount');
  if (el) el.textContent = `${documentState.documents.length} documentos`;
}

async function confirmarEliminar(id) {
  if (confirm('¿Estás seguro de eliminar este documento?')) {
    const doc = documentState.documents.find(d => d.id === id);
    if (doc) {
      await window.documentAPI.delete({ documentId: id, documentPath: doc.ruta });
      await cargarDocumentos();
      await cargarEstadisticas();
    }
  }
}

// Global functions for HTML access
window.mostrarDocumentos = mostrarDocumentos;
window.iniciarSlideshow = iniciarSlideshow;
window.abrirGaleriaImagenes = abrirGaleriaImagenes;
window.abrirModalSubida = abrirModalSubida;
window.cerrarModalSubida = cerrarModalSubida;
window.iniciarSubidaBatch = iniciarSubidaBatch;
window.cambiarVista = cambiarVista;
window.handleSearch = handleSearch;
window.handleFilter = handleFilter;
window.removerDeCola = removerDeCola;
window.limpiarCola = limpiarCola;
