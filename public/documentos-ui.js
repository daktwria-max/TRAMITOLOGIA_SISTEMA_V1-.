// ==================== VISTA DE DOCUMENTOS ====================

function mostrarDocumentos() {
  const html = `
    <div class="header">
      <div>
        <h1>📄 Documentos</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Gestiona todos los documentos de tus proyectos
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="mostrarFiltrosDocumentos()">
          🔍 Filtros
        </button>
        <button class="btn btn-primary" onclick="subirDocumento()">
          ➕ Subir Documento
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-grid" style="margin-bottom: var(--espaciado-xl);">
      <div class="stat-card">
        <h3>Total Documentos</h3>
        <div class="value">${obtenerTotalDocumentos()}</div>
      </div>
      <div class="stat-card">
        <h3>Por Vencer</h3>
        <div class="value" style="color: var(--color-advertencia);">
          ${obtenerDocumentosPorVencer()}
        </div>
      </div>
      <div class="stat-card">
        <h3>Vencidos</h3>
        <div class="value" style="color: var(--color-peligro);">
          ${obtenerDocumentosVencidos()}
        </div>
      </div>
      <div class="stat-card">
        <h3>Vigentes</h3>
        <div class="value" style="color: var(--color-exito);">
          ${obtenerDocumentosVigentes()}
        </div>
      </div>
    </div>

    <!-- Tabs de categorías -->
    <div class="tabs-container">
      <button class="tab-btn active" data-filtro="todos" onclick="filtrarDocumentosPorTipo('todos')">
        Todos (${obtenerTotalDocumentos()})
      </button>
      <button class="tab-btn" data-filtro="AVISO_FUNCIONAMIENTO" onclick="filtrarDocumentosPorTipo('AVISO_FUNCIONAMIENTO')">
        Avisos de Funcionamiento
      </button>
      <button class="tab-btn" data-filtro="POLIZA_SEGURO" onclick="filtrarDocumentosPorTipo('POLIZA_SEGURO')">
        Pólizas de Seguro
      </button>
      <button class="tab-btn" data-filtro="DICTAMEN_TECNICO" onclick="filtrarDocumentosPorTipo('DICTAMEN_TECNICO')">
        Dictámenes Técnicos
      </button>
      <button class="tab-btn" data-filtro="PROGRAMA_INTERNO" onclick="filtrarDocumentosPorTipo('PROGRAMA_INTERNO')">
        Programas Internos
      </button>
    </div>

    <!-- Lista de documentos -->
    <div class="documentos-container" id="listaDocumentos">
      ${renderizarListaDocumentos()}
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
}

async function renderizarListaDocumentos(filtroTipo = 'todos') {
  const documentosPorProyecto = await obtenerTodosDocumentos();

  if (documentosPorProyecto.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h3>No hay documentos</h3>
        <p>Sube tu primer documento para comenzar</p>
        <button class="btn btn-primary" onclick="subirDocumento()">
          ➕ Subir Documento
        </button>
      </div>
    `;
  }

  let html = '';

  for (const { proyecto, documentos } of documentosPorProyecto) {
    let documentosFiltrados = documentos;

    if (filtroTipo !== 'todos') {
      documentosFiltrados = documentos.filter(d => d.tipo === filtroTipo);
    }

    if (documentosFiltrados.length === 0) continue;

    html += `
      <div class="documentos-proyecto-grupo">
        <div class="documentos-proyecto-header">
          <h3>📁 ${proyecto.nombre}</h3>
          <span class="badge badge-info">${documentosFiltrados.length} documento${documentosFiltrados.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="documentos-grid">
          ${documentosFiltrados.map(doc => renderizarDocumentoCard(doc, proyecto)).join('')}
        </div>
      </div>
    `;
  }

  return html || `
    <div class="empty-state">
      <div class="empty-state-icon">📄</div>
      <h3>No hay documentos de este tipo</h3>
    </div>
  `;
}

function renderizarDocumentoCard(documento, proyecto) {
  const vencido = documento.fecha_vencimiento && new Date(documento.fecha_vencimiento) < new Date();
  const porVencer = documento.fecha_vencimiento &&
    new Date(documento.fecha_vencimiento) > new Date() &&
    new Date(documento.fecha_vencimiento) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return `
    <div class="documento-card ${vencido ? 'documento-vencido' : ''} ${porVencer ? 'documento-por-vencer' : ''}">
      <div class="documento-card-header">
        <div class="documento-icon-large">
          ${obtenerIconoDocumento(documento.tipo)}
        </div>
        <button class="btn-icon" onclick="mostrarMenuDocumento(event, '${documento.id}', '${proyecto.id}')">
          ⋮
        </button>
      </div>

      <div class="documento-card-body" onclick="abrirDocumento('${documento.id}', '${proyecto.id}')">
        <h4>${documento.nombre}</h4>
        <p class="documento-tipo">${formatearTipoDocumento(documento.tipo)}</p>

        ${documento.fecha_vencimiento ? `
          <div class="documento-vencimiento ${vencido ? 'vencido' : ''} ${porVencer ? 'por-vencer' : ''}">
            <span class="documento-vencimiento-icon">
              ${vencido ? '❌' : porVencer ? '⚠️' : '✓'}
            </span>
            <span class="documento-vencimiento-texto">
              ${vencido ? 'Vencido' : porVencer ? 'Por vencer' : 'Vigente'} - ${formatearFecha(documento.fecha_vencimiento)}
            </span>
          </div>
        ` : ''}

        <div class="documento-meta">
          <span>📅 ${formatearFecha(documento.fecha_subida)}</span>
          ${documento.tamano ? `
            <span>💾 ${formatearTamano(documento.tamano)}</span>
          ` : ''}
        </div>
      </div>

      <div class="documento-card-footer">
        <button class="btn btn-sm btn-secondary" onclick="abrirDocumento('${documento.id}', '${proyecto.id}')">
          👁️ Ver
        </button>
        <button class="btn btn-sm btn-secondary" onclick="descargarDocumento('${documento.id}', '${proyecto.id}')">
          ⬇️ Descargar
        </button>
      </div>
    </div>
  `;
}

// ==================== OBTENER DOCUMENTOS ====================

async function obtenerTodosDocumentos() {
  const documentosPorProyecto = [];

  for (const proyecto of estadoActual.proyectos) {
    const resultado = await window.electronAPI.obtenerDocumentos(proyecto.id);

    if (resultado.success && resultado.data.length > 0) {
      documentosPorProyecto.push({
        proyecto: proyecto,
        documentos: resultado.data
      });
    }
  }

  return documentosPorProyecto;
}

function obtenerTotalDocumentos() {
  // Simulado por ahora - en producción obtener de la base de datos
  return 0;
}

function obtenerDocumentosPorVencer() {
  // Simulado - documentos que vencen en los próximos 30 días
  return 0;
}

function obtenerDocumentosVencidos() {
  // Simulado - documentos ya vencidos
  return 0;
}

function obtenerDocumentosVigentes() {
  // Simulado - documentos vigentes
  return 0;
}

// ==================== FILTRADO ====================

async function filtrarDocumentosPorTipo(tipo) {
  // Actualizar tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filtro === tipo) {
      btn.classList.add('active');
    }
  });

  // Actualizar lista
  document.getElementById('listaDocumentos').innerHTML = await renderizarListaDocumentos(tipo);
}

function mostrarFiltrosDocumentos() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalFiltrosDocumentos';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>🔍 Filtros Avanzados</h2>
        <button class="close-btn" onclick="cerrarModal('modalFiltrosDocumentos')">×</button>
      </div>
      
      <form onsubmit="aplicarFiltrosDocumentos(event)">
        <div class="form-group">
          <label>Buscar por nombre</label>
          <input type="text" class="form-control" name="busqueda" placeholder="Nombre del documento...">
        </div>

        <div class="form-group">
          <label>Proyecto</label>
          <select class="form-control" name="proyecto_id">
            <option value="">Todos los proyectos</option>
            ${estadoActual.proyectos.map(p => `
              <option value="${p.id}">${p.nombre}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Tipo de Documento</label>
          <select class="form-control" name="tipo">
            <option value="">Todos los tipos</option>
            <option value="AVISO_FUNCIONAMIENTO">Aviso de Funcionamiento</option>
            <option value="PERMISO_IMPACTO_ZONAL">Permiso de Impacto Zonal</option>
            <option value="POLIZA_SEGURO">Póliza de Seguro</option>
            <option value="DICTAMEN_TECNICO">Dictamen Técnico</option>
            <option value="PROGRAMA_INTERNO">Programa Interno</option>
          </select>
        </div>

        <div class="form-group">
          <label>Estado de Vigencia</label>
          <select class="form-control" name="vigencia">
            <option value="">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="por_vencer">Por Vencer (30 días)</option>
            <option value="vencido">Vencidos</option>
          </select>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="limpiarFiltrosDocumentos()">
            Limpiar
          </button>
          <button type="submit" class="btn btn-primary">
            Aplicar Filtros
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

async function aplicarFiltrosDocumentos(event) {
  event.preventDefault();
  // Implementar lógica de filtrado avanzado
  cerrarModal('modalFiltrosDocumentos');
}

function limpiarFiltrosDocumentos() {
  cerrarModal('modalFiltrosDocumentos');
  mostrarDocumentos();
}

// ==================== SUBIR DOCUMENTO ====================

function subirDocumento(proyectoId = null) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalSubirDocumento';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📤 Subir Documento</h2>
        <button class="close-btn" onclick="cerrarModal('modalSubirDocumento')">×</button>
      </div>
      
      <form onsubmit="procesarSubidaDocumento(event)">
        <div class="form-group">
          <label>Proyecto *</label>
          <select class="form-control" name="proyecto_id" required>
            <option value="">Seleccionar proyecto...</option>
            ${estadoActual.proyectos.map(p => `
              <option value="${p.id}" ${proyectoId === p.id ? 'selected' : ''}>
                ${p.nombre}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Nombre del Documento *</label>
          <input type="text" 
                 class="form-control" 
                 name="nombre" 
                 placeholder="Ej: Aviso de Funcionamiento 2024"
                 required>
        </div>

        <div class="form-group">
          <label>Tipo de Documento *</label>
          <select class="form-control" name="tipo" required>
            <option value="">Seleccionar tipo...</option>
            <option value="AVISO_FUNCIONAMIENTO">Aviso de Funcionamiento</option>
            <option value="PERMISO_IMPACTO_ZONAL">Permiso de Impacto Zonal</option>
            <option value="POLIZA_SEGURO">Póliza de Seguro</option>
            <option value="DICTAMEN_TECNICO">Dictamen Técnico</option>
            <option value="PROGRAMA_INTERNO">Programa Interno de Protección Civil</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        <div class="form-group">
          <label>Fecha de Vencimiento</label>
          <input type="date" class="form-control" name="fecha_vencimiento">
          <small style="color: var(--color-texto-secundario);">
            Opcional - Para documentos con vigencia temporal
          </small>
        </div>

        <div class="form-group">
          <label>Archivo *</label>
          <div class="file-upload-area" id="fileUploadArea">
            <input type="file" 
                   id="fileInput" 
                   name="archivo" 
                   accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                   style="display: none;"
                   onchange="mostrarArchivoSeleccionado(this)">
            <div class="file-upload-placeholder" onclick="seleccionarArchivoNativo()">
              <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
              <p>Haz clic para seleccionar un archivo</p>
              <small>PDF, Imágenes o Documentos (Máx. 10MB)</small>
            </div>
            <div class="file-upload-selected" id="fileSelected" style="display: none;">
              <div class="file-icon">📄</div>
              <div class="file-info">
                <strong id="fileName"></strong>
                <p id="filePath" style="font-size: 10px; color: #666;"></p>
              </div>
              <button type="button" class="btn btn-sm btn-danger" onclick="limpiarArchivoSeleccionado()">
                ✕
              </button>
            </div>
            <!-- Campo oculto para guardar la ruta -->
            <input type="hidden" name="ruta_archivo" id="rutaArchivo">
          </div>
        </div>

        <div class="form-group">
          <label>Notas</label>
          <textarea class="form-control" 
                    name="notas" 
                    rows="3"
                    placeholder="Notas adicionales sobre el documento..."></textarea>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalSubirDocumento')">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            📤 Subir Documento
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

async function seleccionarArchivoNativo() {
  try {
    const resultado = await window.electronAPI.seleccionarArchivo();
    if (!resultado.canceled && resultado.filePaths.length > 0) {
      const ruta = resultado.filePaths[0];
      const nombre = ruta.split(/[\\/]/).pop();

      mostrarArchivoSeleccionado(nombre, ruta);
    }
  } catch (error) {
    console.error("Error seleccionando archivo", error);
  }
}

function mostrarArchivoSeleccionado(nombre, ruta) {
  document.querySelector('.file-upload-placeholder').style.display = 'none';
  document.getElementById('fileSelected').style.display = 'flex';
  document.getElementById('fileName').textContent = nombre;
  document.getElementById('filePath').textContent = ruta;

  // Guardar ruta en input oculto para el formulario
  document.getElementById('rutaArchivo').value = ruta;
}

function limpiarArchivoSeleccionado() {
  document.getElementById('rutaArchivo').value = '';
  document.querySelector('.file-upload-placeholder').style.display = 'flex';
  document.getElementById('fileSelected').style.display = 'none';
}

async function procesarSubidaDocumento(event) {
  event.preventDefault();
  const formData = new FormData(event.target);

  const rutaArchivo = formData.get('ruta_archivo');
  if (!rutaArchivo) {
    sistemaNotificaciones.notificarError(
      'Archivo Requerido',
      'Debes seleccionar un archivo para subir'
    );
    return;
  }

  try {
    // Mostrar progreso
    sistemaNotificaciones.notificarInfo(
      'Subiendo Documento',
      'Por favor espera mientras se sube el archivo...'
    );

    const resultado = await window.electronAPI.agregarDocumento({
      proyecto_id: formData.get('proyecto_id'),
      nombre: formData.get('nombre'),
      tipo: formData.get('tipo'),
      fecha_vencimiento: formData.get('fecha_vencimiento') || null,
      notas: formData.get('notas') || null,
      ruta: rutaArchivo // Enviamos la ruta absoluta
    });

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        'Documento Subido',
        `El documento "${formData.get('nombre')}" se ha subido correctamente`
      );

      cerrarModal('modalSubirDocumento');
      mostrarDocumentos();
    } else {
      sistemaNotificaciones.notificarError(
        'Error',
        resultado.error || 'No se pudo subir el documento'
      );
    }
  } catch (error) {
    console.error('Error subiendo documento:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'Ocurrió un error al subir el documento'
    );
  }
}

// ==================== ACCIONES SOBRE DOCUMENTOS ====================

async function abrirDocumento(documentoId, proyectoId) {
  try {
    const resultado = await window.electronAPI.abrirDocumento(proyectoId, documentoId);

    if (!resultado.success) {
      sistemaNotificaciones.notificarError(
        'Error',
        'No se pudo abrir el documento'
      );
    }
  } catch (error) {
    console.error('Error abriendo documento:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'Ocurrió un error al abrir el documento'
    );
  }
}

async function descargarDocumento(documentoId, proyectoId) {
  try {
    const resultado = await window.electronAPI.descargarDocumento(proyectoId, documentoId);

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        'Documento Descargado',
        'El documento se ha guardado correctamente'
      );
    } else {
      sistemaNotificaciones.notificarError(
        'Error',
        'No se pudo descargar el documento'
      );
    }
  } catch (error) {
    console.error('Error descargando documento:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'Ocurrió un error al descargar el documento'
    );
  }
}

async function eliminarDocumento(documentoId, proyectoId) {
  if (!confirm('¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const resultado = await window.electronAPI.eliminarDocumento(proyectoId, documentoId);

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        'Documento Eliminado',
        'El documento ha sido eliminado correctamente'
      );

      mostrarDocumentos();
    } else {
      sistemaNotificaciones.notificarError(
        'Error',
        'No se pudo eliminar el documento'
      );
    }
  } catch (error) {
    console.error('Error eliminando documento:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'Ocurrió un error al eliminar el documento'
    );
  }
}

function mostrarMenuDocumento(event, documentoId, proyectoId) {
  event.stopPropagation();

  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.top = `${event.clientY}px`;
  menu.style.left = `${event.clientX}px`;

  menu.innerHTML = `
    <button onclick="abrirDocumento('${documentoId}', '${proyectoId}')">
      👁️ Abrir
    </button>
    <button onclick="descargarDocumento('${documentoId}', '${proyectoId}')">
      ⬇️ Descargar
    </button>
    <hr>
    <button onclick="eliminarDocumento('${documentoId}', '${proyectoId}')" style="color: var(--color-peligro);">
      🗑️ Eliminar
    </button>
  `;

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function cerrarMenu() {
      menu.remove();
      document.removeEventListener('click', cerrarMenu);
    });
  }, 10);
}

// ==================== UTILIDADES ====================

function obtenerIconoDocumento(tipo) {
  const iconos = {
    'AVISO_FUNCIONAMIENTO': '📋',
    'PERMISO_IMPACTO_ZONAL': '📜',
    'POLIZA_SEGURO': '🛡️',
    'DICTAMEN_TECNICO': '🔧',
    'PROGRAMA_INTERNO': '🚨',
    'PDF': '📄',
    'IMAGEN': '🖼️',
    'OTRO': '📄'
  };
  return iconos[tipo] || '📄';
}

function formatearTipoDocumento(tipo) {
  const nombres = {
    'AVISO_FUNCIONAMIENTO': 'Aviso de Funcionamiento',
    'PERMISO_IMPACTO_ZONAL': 'Permiso de Impacto Zonal',
    'POLIZA_SEGURO': 'Póliza de Seguro',
    'DICTAMEN_TECNICO': 'Dictamen Técnico',
    'PROGRAMA_INTERNO': 'Programa Interno de PC',
    'OTRO': 'Otro Documento'
  };
  return nombres[tipo] || tipo;
}

function formatearTamano(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}
