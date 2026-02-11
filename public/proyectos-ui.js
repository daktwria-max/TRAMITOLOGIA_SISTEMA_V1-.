// ==================== VISTA DE PROYECTOS ====================

function mostrarProyectos() {
  const html = `
    <div class="header">
      <div>
        <h1>📁 Proyectos</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Gestiona todos tus proyectos de protección civil
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="mostrarFiltrosProyectos()">
          🔍 Filtros
        </button>
        <button class="btn btn-primary" onclick="mostrarFormularioProyecto()">
          ➕ Nuevo Proyecto
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-grid" style="margin-bottom: var(--espaciado-xl);">
      <div class="stat-card">
        <h3>Total Proyectos</h3>
        <div class="value">${estadoActual.proyectos.length}</div>
      </div>
      <div class="stat-card">
        <h3>Activos</h3>
        <div class="value" style="color: var(--color-exito);">
          ${estadoActual.proyectos.filter(p => p.estado === 'activo').length}
        </div>
      </div>
      <div class="stat-card">
        <h3>Completados</h3>
        <div class="value" style="color: var(--color-info);">
          ${estadoActual.proyectos.filter(p => p.estado === 'completado').length}
        </div>
      </div>
      <div class="stat-card">
        <h3>Pausados</h3>
        <div class="value" style="color: var(--color-advertencia);">
          ${estadoActual.proyectos.filter(p => p.estado === 'pausado').length}
        </div>
      </div>
    </div>

    <!-- Tabs de filtrado -->
    <div class="tabs-container">
      <button class="tab-btn active" data-filtro="todos" onclick="filtrarProyectosPorEstado('todos')">
        Todos (${estadoActual.proyectos.length})
      </button>
      <button class="tab-btn" data-filtro="activo" onclick="filtrarProyectosPorEstado('activo')">
        Activos (${estadoActual.proyectos.filter(p => p.estado === 'activo').length})
      </button>
      <button class="tab-btn" data-filtro="completado" onclick="filtrarProyectosPorEstado('completado')">
        Completados (${estadoActual.proyectos.filter(p => p.estado === 'completado').length})
      </button>
      <button class="tab-btn" data-filtro="pausado" onclick="filtrarProyectosPorEstado('pausado')">
        Pausados (${estadoActual.proyectos.filter(p => p.estado === 'pausado').length})
      </button>
    </div>

    <!-- Lista de proyectos -->
    <div class="proyectos-container" id="listaProyectos">
      ${renderizarListaProyectos(estadoActual.proyectos)}
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
}

function renderizarListaProyectos(proyectos) {
  if (proyectos.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <h3>No hay proyectos</h3>
        <p>Crea tu primer proyecto para comenzar</p>
        <button class="btn btn-primary" onclick="mostrarFormularioProyecto()">
          ➕ Crear Proyecto
        </button>
      </div>
    `;
  }

  return `
    <div class="proyectos-grid">
      ${proyectos.map(proyecto => `
        <div class="proyecto-card" data-estado="${proyecto.estado}">
          <div class="proyecto-card-header">
            <div class="proyecto-card-icon">📁</div>
            <div class="proyecto-card-menu">
              <button class="btn-icon" onclick="mostrarMenuProyecto(event, '${proyecto.id}')">
                ⋮
              </button>
            </div>
          </div>
          
          <div class="proyecto-card-body" onclick="verDetalleProyecto('${proyecto.id}')">
            <h3>${proyecto.nombre}</h3>
            <p class="proyecto-cliente">${proyecto.cliente || 'Sin cliente'}</p>
            
            <div class="proyecto-meta">
              <span class="badge badge-${obtenerClaseEstado(proyecto.estado)}">
                ${proyecto.estado || 'activo'}
              </span>
              ${proyecto.clasificacion ? `
                <span class="badge badge-info">
                  ${proyecto.clasificacion}
                </span>
              ` : ''}
            </div>

            ${proyecto.descripcion ? `
              <p class="proyecto-descripcion">${proyecto.descripcion.substring(0, 100)}${proyecto.descripcion.length > 100 ? '...' : ''}</p>
            ` : ''}

            <div class="proyecto-stats">
              <div class="proyecto-stat">
                <span class="proyecto-stat-icon">✅</span>
                <span class="proyecto-stat-value">${obtenerTareasProyecto(proyecto.id).length}</span>
                <span class="proyecto-stat-label">Tareas</span>
              </div>
              <div class="proyecto-stat">
                <span class="proyecto-stat-icon">📄</span>
                <span class="proyecto-stat-value">${obtenerDocumentosProyecto(proyecto.id).length}</span>
                <span class="proyecto-stat-label">Docs</span>
              </div>
              <div class="proyecto-stat">
                <span class="proyecto-stat-icon">⏱️</span>
                <span class="proyecto-stat-value">${calcularHorasProyecto(proyecto.id)}h</span>
                <span class="proyecto-stat-label">Horas</span>
              </div>
            </div>
          </div>

          <div class="proyecto-card-footer">
            <span class="proyecto-fecha">
              ${proyecto.fecha_inicio ? formatearFecha(proyecto.fecha_inicio) : 'Sin fecha'}
            </span>
            <button class="btn btn-sm btn-primary" onclick="verDetalleProyecto('${proyecto.id}')">
              Ver Detalle →
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== FILTRADO ====================

function filtrarProyectosPorEstado(estado) {
  // Actualizar tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filtro === estado) {
      btn.classList.add('active');
    }
  });

  // Filtrar proyectos
  let proyectosFiltrados = estadoActual.proyectos;
  if (estado !== 'todos') {
    proyectosFiltrados = estadoActual.proyectos.filter(p => p.estado === estado);
  }

  // Actualizar lista
  document.getElementById('listaProyectos').innerHTML = renderizarListaProyectos(proyectosFiltrados);
}

function mostrarFiltrosProyectos() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalFiltrosProyectos';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>🔍 Filtros Avanzados</h2>
        <button class="close-btn" onclick="cerrarModal('modalFiltrosProyectos')">×</button>
      </div>
      
      <form onsubmit="aplicarFiltrosProyectos(event)">
        <div class="form-group">
          <label>Buscar por nombre o cliente</label>
          <input type="text" class="form-control" name="busqueda" placeholder="Escribe para buscar...">
        </div>

        <div class="form-group">
          <label>Estado</label>
          <select class="form-control" name="estado">
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="completado">Completado</option>
            <option value="pausado">Pausado</option>
          </select>
        </div>

        <div class="form-group">
          <label>Clasificación</label>
          <select class="form-control" name="clasificacion">
            <option value="">Todas</option>
            <option value="BAJO_IMPACTO">Bajo Impacto</option>
            <option value="IMPACTO_VECINAL">Impacto Vecinal</option>
            <option value="IMPACTO_ZONAL">Impacto Zonal</option>
          </select>
        </div>

        <div class="form-group">
          <label>Ordenar por</label>
          <select class="form-control" name="ordenar">
            <option value="nombre">Nombre</option>
            <option value="fecha_inicio">Fecha de Inicio</option>
            <option value="fecha_creacion">Fecha de Creación</option>
          </select>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="limpiarFiltrosProyectos()">
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

function aplicarFiltrosProyectos(event) {
  event.preventDefault();
  const formData = new FormData(event.target);

  let proyectosFiltrados = [...estadoActual.proyectos];

  // Busqueda
  const busqueda = formData.get('busqueda')?.toLowerCase();
  if (busqueda) {
    proyectosFiltrados = proyectosFiltrados.filter(p =>
      p.nombre.toLowerCase().includes(busqueda) ||
      (p.cliente && p.cliente.toLowerCase().includes(busqueda))
    );
  }

  // Estado
  const estado = formData.get('estado');
  if (estado) {
    proyectosFiltrados = proyectosFiltrados.filter(p => p.estado === estado);
  }

  // Clasificación
  const clasificacion = formData.get('clasificacion');
  if (clasificacion) {
    proyectosFiltrados = proyectosFiltrados.filter(p => p.clasificacion === clasificacion);
  }

  // Ordenar
  const ordenar = formData.get('ordenar');
  proyectosFiltrados.sort((a, b) => {
    if (ordenar === 'nombre') {
      return a.nombre.localeCompare(b.nombre);
    } else if (ordenar === 'fecha_inicio') {
      return new Date(b.fecha_inicio || 0) - new Date(a.fecha_inicio || 0);
    } else {
      return new Date(b.creado_en || 0) - new Date(a.creado_en || 0);
    }
  });

  document.getElementById('listaProyectos').innerHTML = renderizarListaProyectos(proyectosFiltrados);
  cerrarModal('modalFiltrosProyectos');
}

function limpiarFiltrosProyectos() {
  cerrarModal('modalFiltrosProyectos');
  mostrarProyectos();
}

// ==================== FORMULARIO PROYECTO ====================

function mostrarFormularioProyecto(proyectoId = null) {
  const esEdicion = !!proyectoId;
  const proyecto = esEdicion ? estadoActual.proyectos.find(p => p.id === proyectoId) : null;

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalFormularioProyecto';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>${esEdicion ? '✏️ Editar Proyecto' : '➕ Nuevo Proyecto'}</h2>
        <button class="close-btn" onclick="cerrarModal('modalFormularioProyecto')">×</button>
      </div>
      
      <form onsubmit="guardarProyecto(event, ${esEdicion ? `'${proyectoId}'` : 'null'})">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre del Proyecto *</label>
            <input type="text" 
                   class="form-control" 
                   name="nombre" 
                   value="${proyecto?.nombre || ''}"
                   placeholder="Ej: Restaurante El Buen Sabor"
                   required>
          </div>

          <div class="form-group">
            <label>Cliente</label>
            <input type="text" 
                   class="form-control" 
                   name="cliente" 
                   value="${proyecto?.cliente || ''}"
                   placeholder="Nombre del cliente">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Clasificación *</label>
            <select class="form-control" name="clasificacion" required>
              <option value="">Seleccionar...</option>
              <option value="BAJO_IMPACTO" ${proyecto?.clasificacion === 'BAJO_IMPACTO' ? 'selected' : ''}>
                Bajo Impacto
              </option>
              <option value="IMPACTO_VECINAL" ${proyecto?.clasificacion === 'IMPACTO_VECINAL' ? 'selected' : ''}>
                Impacto Vecinal
              </option>
              <option value="IMPACTO_ZONAL" ${proyecto?.clasificacion === 'IMPACTO_ZONAL' ? 'selected' : ''}>
                Impacto Zonal
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Estado</label>
            <select class="form-control" name="estado">
              <option value="activo" ${!proyecto || proyecto?.estado === 'activo' ? 'selected' : ''}>
                Activo
              </option>
              <option value="pausado" ${proyecto?.estado === 'pausado' ? 'selected' : ''}>
                Pausado
              </option>
              <option value="completado" ${proyecto?.estado === 'completado' ? 'selected' : ''}>
                Completado
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Dirección</label>
          <input type="text" 
                 class="form-control" 
                 name="direccion" 
                 value="${proyecto?.direccion || ''}"
                 placeholder="Calle, número, colonia, delegación">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Fecha de Inicio</label>
            <input type="date" 
                   class="form-control" 
                   name="fecha_inicio" 
                   value="${proyecto?.fecha_inicio || ''}">
          </div>

          <div class="form-group">
            <label>Fecha Estimada de Fin</label>
            <input type="date" 
                   class="form-control" 
                   name="fecha_fin_estimada" 
                   value="${proyecto?.fecha_fin_estimada || ''}">
          </div>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea class="form-control" 
                    name="descripcion" 
                    rows="4"
                    placeholder="Describe el proyecto...">${proyecto?.descripcion || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Notas Adicionales</label>
          <textarea class="form-control" 
                    name="notas" 
                    rows="3"
                    placeholder="Notas internas...">${proyecto?.notas || ''}</textarea>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalFormularioProyecto')">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            ${esEdicion ? 'Guardar Cambios' : 'Crear Proyecto'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

async function guardarProyecto(event, proyectoId) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const datos = Object.fromEntries(formData);

  try {
    let resultado;
    if (proyectoId) {
      resultado = await window.electronAPI.actualizarProyecto(proyectoId, datos);
    } else {
      // Generar ID y mapear campos para nuevo proyecto
      const nuevoProyecto = {
        ...datos,
        id: crypto.randomUUID(), // Generar UUID para el proyecto
        fecha_fin: datos.fecha_fin_estimada || null, // Mapear fecha fin
        creado_en: new Date().toISOString()
      };
      resultado = await window.electronAPI.crearProyecto(nuevoProyecto);
    }

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        proyectoId ? 'Proyecto Actualizado' : 'Proyecto Creado',
        `El proyecto "${datos.nombre}" se ha guardado correctamente`
      );

      cerrarModal('modalFormularioProyecto');
      await cargarDatos();
      mostrarProyectos();
    } else {
      sistemaNotificaciones.notificarError(
        'Error',
        resultado.error || 'No se pudo guardar el proyecto'
      );
    }
  } catch (error) {
    console.error('Error guardando proyecto:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'Ocurrió un error al guardar el proyecto'
    );
  }
}

// ==================== DETALLE DE PROYECTO ====================

async function verDetalleProyecto(proyectoId) {
  const proyecto = estadoActual.proyectos.find(p => p.id === proyectoId);
  if (!proyecto) {
    sistemaNotificaciones.notificarError('Error', 'Proyecto no encontrado');
    return;
  }

  // Cargar datos relacionados
  const tareasRes = await window.electronAPI.obtenerTareas({ proyecto_id: proyectoId });
  const documentosRes = await window.electronAPI.obtenerDocumentos(proyectoId);
  const tiempoRes = await window.electronAPI.obtenerRegistrosTiempo({ proyecto_id: proyectoId });

  const tareas = tareasRes.success ? tareasRes.data : [];
  const documentos = documentosRes.success ? documentosRes.data : [];
  const registrosTiempo = tiempoRes.success ? tiempoRes.data : [];

  const html = `
    <div class="header">
      <div>
        <button class="btn btn-secondary" onclick="mostrarProyectos()" style="margin-bottom: 10px;">
          ← Volver a Proyectos
        </button>
        <h1>📁 ${proyecto.nombre}</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          ${proyecto.cliente || 'Sin cliente'} • ${proyecto.clasificacion || 'Sin clasificación'}
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="mostrarFormularioProyecto('${proyecto.id}')">
          ✏️ Editar
        </button>
        <button class="btn btn-secondary" onclick="generarReporteProyectoUI('${proyecto.id}')">
          📄 Generar PDF
        </button>
        <button class="btn btn-danger" onclick="eliminarProyecto('${proyecto.id}')">
          🗑️ Eliminar
        </button>
      </div>
    </div>

    <!-- Información del Proyecto -->
    <div class="proyecto-detalle-grid">
      <!-- Columna Principal -->
      <div class="proyecto-detalle-main">
        <!-- Información General -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">📋 Información General</h3>
            <span class="badge badge-${obtenerClaseEstado(proyecto.estado)}">
              ${proyecto.estado || 'activo'}
            </span>
          </div>
          <div class="card-body">
            <div class="info-grid">
              ${proyecto.direccion ? `
                <div class="info-item">
                  <span class="info-label">📍 Dirección</span>
                  <span class="info-value">${proyecto.direccion}</span>
                </div>
              ` : ''}
              ${proyecto.fecha_inicio ? `
                <div class="info-item">
                  <span class="info-label">📅 Fecha de Inicio</span>
                  <span class="info-value">${formatearFecha(proyecto.fecha_inicio)}</span>
                </div>
              ` : ''}
              ${proyecto.fecha_fin_estimada ? `
                <div class="info-item">
                  <span class="info-label">🎯 Fecha Estimada de Fin</span>
                  <span class="info-value">${formatearFecha(proyecto.fecha_fin_estimada)}</span>
                </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">🏷️ Clasificación</span>
                <span class="info-value">${proyecto.clasificacion || 'No especificada'}</span>
              </div>
            </div>

            ${proyecto.descripcion ? `
              <div style="margin-top: var(--espaciado-lg);">
                <h4 style="color: var(--color-primario); margin-bottom: var(--espaciado-sm);">Descripción</h4>
                <p style="color: var(--color-texto); line-height: 1.6;">${proyecto.descripcion}</p>
              </div>
            ` : ''}

            ${proyecto.notas ? `
              <div style="margin-top: var(--espaciado-lg);">
                <h4 style="color: var(--color-primario); margin-bottom: var(--espaciado-sm);">Notas</h4>
                <p style="color: var(--color-texto-secundario); line-height: 1.6; font-style: italic;">${proyecto.notas}</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Tareas -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">✅ Tareas (${tareas.length})</h3>
            <button class="btn btn-sm btn-primary" onclick="mostrarFormularioTarea('${proyecto.id}')">
              ➕ Nueva Tarea
            </button>
          </div>
          <div class="card-body">
            ${tareas.length > 0 ? `
              <div class="tareas-lista-detalle">
                ${tareas.slice(0, 5).map(tarea => `
                  <div class="tarea-item-detalle">
                    <input type="checkbox" 
                           ${tarea.estado === 'completada' ? 'checked' : ''}
                           onchange="toggleTareaEstado('${tarea.id}', this.checked)">
                    <div class="tarea-item-info">
                      <strong>${tarea.titulo}</strong>
                      <p>${tarea.descripcion || 'Sin descripción'}</p>
                    </div>
                    <span class="badge badge-${obtenerClasePrioridad(tarea.prioridad)}">
                      ${tarea.prioridad || 'media'}
                    </span>
                  </div>
                `).join('')}
              </div>
              ${tareas.length > 5 ? `
                <button class="btn btn-secondary" onclick="cambiarVista('tareas')" style="width: 100%; margin-top: var(--espaciado-md);">
                  Ver todas las tareas (${tareas.length})
                </button>
              ` : ''}
            ` : `
              <div class="empty-state-small">
                <p>No hay tareas creadas</p>
                <button class="btn btn-sm btn-primary" onclick="mostrarFormularioTarea('${proyecto.id}')">
                  Crear Primera Tarea
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- Documentos -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📄 Documentos (${documentos.length})</h3>
            <button class="btn btn-sm btn-primary" onclick="subirDocumento('${proyecto.id}')">
              ➕ Subir Documento
            </button>
          </div>
          <div class="card-body">
            ${documentos.length > 0 ? `
              <div class="documentos-lista-detalle">
                ${documentos.slice(0, 5).map(doc => `
                  <div class="documento-item-detalle">
                    <div class="documento-icon">${obtenerIconoDocumento(doc.tipo)}</div>
                    <div class="documento-info">
                      <strong>${doc.nombre}</strong>
                      <p>${doc.tipo || 'General'} • ${formatearFecha(doc.fecha_subida)}</p>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="abrirDocumento('${doc.id}')">
                      Abrir
                    </button>
                  </div>
                `).join('')}
              </div>
              ${documentos.length > 5 ? `
                <button class="btn btn-secondary" onclick="cambiarVista('documentos')" style="width: 100%; margin-top: var(--espaciado-md);">
                  Ver todos los documentos (${documentos.length})
                </button>
              ` : ''}
            ` : `
              <div class="empty-state-small">
                <p>No hay documentos subidos</p>
                <button class="btn btn-sm btn-primary" onclick="subirDocumento('${proyecto.id}')">
                  Subir Primer Documento
                </button>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Columna Lateral -->
      <div class="proyecto-detalle-sidebar">
        <!-- Estadísticas -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">📊 Estadísticas</h3>
          </div>
          <div class="card-body">
            <div class="stats-vertical">
              <div class="stat-vertical-item">
                <span class="stat-vertical-value">${tareas.length}</span>
                <span class="stat-vertical-label">Total Tareas</span>
              </div>
              <div class="stat-vertical-item">
                <span class="stat-vertical-value" style="color: var(--color-exito);">
                  ${tareas.filter(t => t.estado === 'completada').length}
                </span>
                <span class="stat-vertical-label">Completadas</span>
              </div>
              <div class="stat-vertical-item">
                <span class="stat-vertical-value" style="color: var(--color-advertencia);">
                  ${tareas.filter(t => t.estado === 'pendiente').length}
                </span>
                <span class="stat-vertical-label">Pendientes</span>
              </div>
              <div class="stat-vertical-item">
                <span class="stat-vertical-value" style="color: var(--color-info);">
                  ${registrosTiempo.reduce((sum, r) => sum + (r.horas || 0), 0).toFixed(1)}h
                </span>
                <span class="stat-vertical-label">Horas Trabajadas</span>
              </div>
              <div class="stat-vertical-item">
                <span class="stat-vertical-value">${documentos.length}</span>
                <span class="stat-vertical-label">Documentos</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones Rápidas -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚡ Acciones Rápidas</h3>
          </div>
          <div class="card-body">
            <div class="acciones-rapidas">
              <button class="btn btn-secondary" onclick="mostrarFormularioTarea('${proyecto.id}')" style="width: 100%;">
                ✅ Nueva Tarea
              </button>
              <button class="btn btn-secondary" onclick="subirDocumento('${proyecto.id}')" style="width: 100%;">
                📄 Subir Documento
              </button>
              <button class="btn btn-secondary" onclick="registrarTiempo('${proyecto.id}')" style="width: 100%;">
                ⏱️ Registrar Tiempo
              </button>
              <button class="btn btn-secondary" onclick="iniciarAuditoria('${proyecto.id}')" style="width: 100%;">
                📋 Iniciar Auditoría
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
}

// ==================== MENÚ CONTEXTUAL ====================

function mostrarMenuProyecto(event, proyectoId) {
  event.stopPropagation();

  // Remover menús existentes
  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.top = `${event.clientY}px`;
  menu.style.left = `${event.clientX}px`;

  menu.innerHTML = `
    <button onclick="verDetalleProyecto('${proyectoId}')">
      👁️ Ver Detalle
    </button>
    <button onclick="mostrarFormularioProyecto('${proyectoId}')">
      ✏️ Editar
    </button>
    <button onclick="generarReporteProyectoUI('${proyectoId}')">
      📄 Generar PDF
    </button>
    <hr>
    <button onclick="duplicarProyecto('${proyectoId}')">
      📋 Duplicar
    </button>
    <button onclick="eliminarProyecto('${proyectoId}')" style="color: var(--color-peligro);">
      🗑️ Eliminar
    </button>
  `;

  document.body.appendChild(menu);

  // Cerrar al hacer clic fuera
  setTimeout(() => {
    document.addEventListener('click', function cerrarMenu() {
      menu.remove();
      document.removeEventListener('click', cerrarMenu);
    });
  }, 10);
}

// ==================== ACCIONES ====================

async function eliminarProyecto(proyectoId) {
  const proyecto = estadoActual.proyectos.find(p => p.id === proyectoId);

  if (!confirm(`¿Estás seguro de eliminar el proyecto "${proyecto.nombre}"?\n\nEsta acción no se puede deshacer y eliminará todas las tareas y documentos asociados.`)) {
    return;
  }

  try {
    const resultado = await window.electronAPI.eliminarProyecto(proyectoId);

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        'Proyecto Eliminado',
        `El proyecto "${proyecto.nombre}" ha sido eliminado`
      );

      await cargarDatos();
      mostrarProyectos();
    } else {
      sistemaNotificaciones.notificarError(
        'Error',
        'No se pudo eliminar el proyecto'
      );
    }
  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'Ocurrió un error al eliminar el proyecto'
    );
  }
}

async function duplicarProyecto(proyectoId) {
  const proyecto = estadoActual.proyectos.find(p => p.id === proyectoId);

  const nuevoProyecto = {
    ...proyecto,
    nombre: `${proyecto.nombre} (Copia)`,
    estado: 'activo'
  };

  delete nuevoProyecto.id;
  delete nuevoProyecto.creado_en;

  try {
    const resultado = await window.electronAPI.crearProyecto(nuevoProyecto);

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        'Proyecto Duplicado',
        `Se ha creado una copia de "${proyecto.nombre}"`
      );

      await cargarDatos();
      mostrarProyectos();
    }
  } catch (error) {
    console.error('Error duplicando proyecto:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'No se pudo duplicar el proyecto'
    );
  }
}

function iniciarAuditoria(proyectoId) {
  // Redirigir a checklists con el proyecto preseleccionado
  cambiarVista('checklists');
  setTimeout(() => {
    if (typeof iniciarNuevaAuditoria !== 'undefined') {
      iniciarNuevaAuditoria(proyectoId);
    }
  }, 500);
}

// ==================== UTILIDADES ====================

function obtenerTareasProyecto(proyectoId) {
  return estadoActual.tareas.filter(t => t.proyecto_id === proyectoId);
}

function obtenerDocumentosProyecto(proyectoId) {
  // Simulado por ahora
  return [];
}

function calcularHorasProyecto(proyectoId) {
  // Simulado por ahora
  return 0;
}

function obtenerIconoDocumento(tipo) {
  const iconos = {
    'AVISO_FUNCIONAMIENTO': '📋',
    'PERMISO_IMPACTO_ZONAL': '📜',
    'POLIZA_SEGURO': '🛡️',
    'DICTAMEN_TECNICO': '🔧',
    'PROGRAMA_INTERNO': '🚨',
    'PDF': '📄',
    'IMAGEN': '🖼️'
  };
  return iconos[tipo] || '📄';
}

function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function obtenerClaseEstado(estado) {
  const clases = {
    'activo': 'success',
    'completado': 'info',
    'pausado': 'warning',
    'cancelado': 'danger'
  };
  return clases[estado] || 'secondary';
}

function obtenerClasePrioridad(prioridad) {
  const clases = {
    'alta': 'danger',
    'media': 'warning',
    'baja': 'info'
  };
  return clases[prioridad] || 'secondary';
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}
