// ==================== VISTA DE TAREAS ====================

function mostrarTareas() {
    const html = `
    <div class="header">
      <div>
        <h1>✅ Tareas</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Gestiona todas tus tareas y actividades
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="mostrarFiltrosTareas()">
          🔍 Filtros
        </button>
        <button class="btn btn-primary" onclick="mostrarFormularioTarea()">
          ➕ Nueva Tarea
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-grid" style="margin-bottom: var(--espaciado-xl);">
      <div class="stat-card">
        <h3>Total Tareas</h3>
        <div class="value">${estadoActual.tareas.length}</div>
      </div>
      <div class="stat-card">
        <h3>Pendientes</h3>
        <div class="value" style="color: var(--color-advertencia);">
          ${estadoActual.tareas.filter(t => t.estado === 'pendiente').length}
        </div>
      </div>
      <div class="stat-card">
        <h3>En Proceso</h3>
        <div class="value" style="color: var(--color-info);">
          ${estadoActual.tareas.filter(t => t.estado === 'en_proceso').length}
        </div>
      </div>
      <div class="stat-card">
        <h3>Completadas</h3>
        <div class="value" style="color: var(--color-exito);">
          ${estadoActual.tareas.filter(t => t.estado === 'completada').length}
        </div>
      </div>
    </div>

    <!-- Tabs de filtrado -->
    <div class="tabs-container">
      <button class="tab-btn active" data-filtro="todas" onclick="filtrarTareasPorEstado('todas')">
        Todas (${estadoActual.tareas.length})
      </button>
      <button class="tab-btn" data-filtro="pendiente" onclick="filtrarTareasPorEstado('pendiente')">
        Pendientes (${estadoActual.tareas.filter(t => t.estado === 'pendiente').length})
      </button>
      <button class="tab-btn" data-filtro="en_proceso" onclick="filtrarTareasPorEstado('en_proceso')">
        En Proceso (${estadoActual.tareas.filter(t => t.estado === 'en_proceso').length})
      </button>
      <button class="tab-btn" data-filtro="completada" onclick="filtrarTareasPorEstado('completada')">
        Completadas (${estadoActual.tareas.filter(t => t.estado === 'completada').length})
      </button>
    </div>

    <!-- Vista de tareas -->
    <div class="tareas-vista-selector" style="margin-bottom: var(--espaciado-md);">
      <button class="btn btn-sm ${estadoActual.vistaTareas !== 'kanban' ? 'btn-primary' : 'btn-secondary'}" 
              onclick="cambiarVistaTareas('lista')">
        📋 Lista
      </button>
      <button class="btn btn-sm ${estadoActual.vistaTareas === 'kanban' ? 'btn-primary' : 'btn-secondary'}" 
              onclick="cambiarVistaTareas('kanban')">
        📊 Kanban
      </button>
    </div>

    <!-- Contenedor de tareas -->
    <div id="contenedorTareas">
      ${estadoActual.vistaTareas === 'kanban' ? renderizarVistaKanban() : renderizarVistaLista(estadoActual.tareas)}
    </div>
  `;

    document.getElementById('contentArea').innerHTML = html;
}

// ==================== VISTA LISTA ====================

function renderizarVistaLista(tareas) {
    if (tareas.length === 0) {
        return `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No hay tareas</h3>
        <p>Crea tu primera tarea para comenzar</p>
        <button class="btn btn-primary" onclick="mostrarFormularioTarea()">
          ➕ Crear Tarea
        </button>
      </div>
    `;
    }

    // Agrupar por prioridad
    const tareasPorPrioridad = {
        alta: tareas.filter(t => t.prioridad === 'alta'),
        media: tareas.filter(t => t.prioridad === 'media'),
        baja: tareas.filter(t => t.prioridad === 'baja')
    };

    return `
    <div class="tareas-lista-completa">
      ${Object.entries(tareasPorPrioridad).map(([prioridad, tareasGrupo]) => {
        if (tareasGrupo.length === 0) return '';

        return `
          <div class="tareas-grupo">
            <h3 class="tareas-grupo-titulo">
              <span class="badge badge-${obtenerClasePrioridad(prioridad)}">
                ${prioridad.toUpperCase()}
              </span>
              <span>${tareasGrupo.length} tarea${tareasGrupo.length !== 1 ? 's' : ''}</span>
            </h3>
            
            <div class="tareas-grupo-items">
              ${tareasGrupo.map(tarea => renderizarTareaCard(tarea)).join('')}
            </div>
          </div>
        `;
    }).join('')}
    </div>
  `;
}

function renderizarTareaCard(tarea) {
    const proyecto = estadoActual.proyectos.find(p => p.id === tarea.proyecto_id);
    const vencida = tarea.fecha_vencimiento && new Date(tarea.fecha_vencimiento) < new Date() && tarea.estado !== 'completada';

    return `
    <div class="tarea-card ${vencida ? 'tarea-vencida' : ''}" data-estado="${tarea.estado}">
      <div class="tarea-card-header">
        <input type="checkbox" 
               ${tarea.estado === 'completada' ? 'checked' : ''}
               onchange="toggleTareaEstado('${tarea.id}', this.checked)"
               class="tarea-checkbox">
        
        <div class="tarea-card-titulo" onclick="verDetalleTarea('${tarea.id}')">
          <h4 ${tarea.estado === 'completada' ? 'style="text-decoration: line-through; opacity: 0.6;"' : ''}>
            ${tarea.titulo}
          </h4>
          ${proyecto ? `
            <span class="tarea-proyecto">📁 ${proyecto.nombre}</span>
          ` : ''}
        </div>

        <button class="btn-icon" onclick="mostrarMenuTarea(event, '${tarea.id}')">
          ⋮
        </button>
      </div>

      ${tarea.descripcion ? `
        <p class="tarea-card-descripcion">${tarea.descripcion.substring(0, 150)}${tarea.descripcion.length > 150 ? '...' : ''}</p>
      ` : ''}

      <div class="tarea-card-footer">
        <div class="tarea-card-meta">
          <span class="badge badge-${obtenerClaseEstado(tarea.estado)}">
            ${tarea.estado || 'pendiente'}
          </span>
          ${tarea.fecha_vencimiento ? `
            <span class="tarea-fecha ${vencida ? 'tarea-fecha-vencida' : ''}">
              📅 ${formatearFecha(tarea.fecha_vencimiento)}
            </span>
          ` : ''}
        </div>
        
        <button class="btn btn-sm btn-secondary" onclick="verDetalleTarea('${tarea.id}')">
          Ver Detalle →
        </button>
      </div>
    </div>
  `;
}

// ==================== VISTA KANBAN ====================

function renderizarVistaKanban() {
    const columnas = [
        { id: 'pendiente', titulo: 'Pendientes', color: '#94a3b8' },
        { id: 'en_proceso', titulo: 'En Proceso', color: '#3498db' },
        { id: 'completada', titulo: 'Completadas', color: '#2ecc71' }
    ];

    return `
    <div class="kanban-board">
      ${columnas.map(columna => {
        const tareas = estadoActual.tareas.filter(t => t.estado === columna.id);

        return `
          <div class="kanban-columna" data-estado="${columna.id}">
            <div class="kanban-columna-header" style="border-color: ${columna.color};">
              <h3>${columna.titulo}</h3>
              <span class="kanban-count">${tareas.length}</span>
            </div>
            
            <div class="kanban-columna-body">
              ${tareas.map(tarea => renderizarTareaKanban(tarea)).join('')}
              
              ${tareas.length === 0 ? `
                <div class="kanban-empty">
                  <p>No hay tareas</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
    }).join('')}
    </div>
  `;
}

function renderizarTareaKanban(tarea) {
    const proyecto = estadoActual.proyectos.find(p => p.id === tarea.proyecto_id);
    const vencida = tarea.fecha_vencimiento && new Date(tarea.fecha_vencimiento) < new Date() && tarea.estado !== 'completada';

    return `
    <div class="kanban-card ${vencida ? 'tarea-vencida' : ''}" 
         draggable="true"
         ondragstart="iniciarArrastreTarea(event, '${tarea.id}')"
         onclick="verDetalleTarea('${tarea.id}')">
      
      <div class="kanban-card-header">
        <span class="badge badge-${obtenerClasePrioridad(tarea.prioridad || 'media')}">
          ${tarea.prioridad || 'media'}
        </span>
        <button class="btn-icon-small" onclick="event.stopPropagation(); mostrarMenuTarea(event, '${tarea.id}')">
          ⋮
        </button>
      </div>

      <h4>${tarea.titulo}</h4>
      
      ${tarea.descripcion ? `
        <p class="kanban-card-descripcion">${tarea.descripcion.substring(0, 80)}${tarea.descripcion.length > 80 ? '...' : ''}</p>
      ` : ''}

      <div class="kanban-card-footer">
        ${proyecto ? `
          <span class="kanban-proyecto">📁 ${proyecto.nombre}</span>
        ` : ''}
        ${tarea.fecha_vencimiento ? `
          <span class="kanban-fecha ${vencida ? 'tarea-fecha-vencida' : ''}">
            📅 ${formatearFechaCorta(tarea.fecha_vencimiento)}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

// ==================== DRAG & DROP KANBAN ====================

let tareaArrastrandoId = null;

function iniciarArrastreTarea(event, tareaId) {
    tareaArrastrandoId = tareaId;
    event.dataTransfer.effectAllowed = 'move';
}

// Agregar event listeners para las columnas
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('dragover', (e) => {
        if (e.target.closest('.kanban-columna-body')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    document.addEventListener('drop', async (e) => {
        const columna = e.target.closest('.kanban-columna-body');
        if (columna && tareaArrastrandoId) {
            e.preventDefault();

            const nuevoEstado = columna.parentElement.dataset.estado;
            await cambiarEstadoTarea(tareaArrastrandoId, nuevoEstado);
            tareaArrastrandoId = null;
        }
    });
});

async function cambiarEstadoTarea(tareaId, nuevoEstado) {
    try {
        const resultado = await window.electronAPI.actualizarTarea(tareaId, { estado: nuevoEstado });

        if (resultado.success) {
            await cargarDatos();
            mostrarTareas();

            sistemaNotificaciones.notificarExito(
                'Estado Actualizado',
                `La tarea se movió a ${nuevoEstado.replace('_', ' ')}`
            );
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo actualizar el estado de la tarea'
        );
    }
}

// ==================== FILTRADO ====================

function filtrarTareasPorEstado(estado) {
    // Actualizar tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filtro === estado) {
            btn.classList.add('active');
        }
    });

    // Filtrar tareas
    let tareasFiltradas = estadoActual.tareas;
    if (estado !== 'todas') {
        tareasFiltradas = estadoActual.tareas.filter(t => t.estado === estado);
    }

    // Actualizar vista
    const contenedor = document.getElementById('contenedorTareas');
    if (estadoActual.vistaTareas === 'kanban') {
        contenedor.innerHTML = renderizarVistaKanban();
    } else {
        contenedor.innerHTML = renderizarVistaLista(tareasFiltradas);
    }
}

function cambiarVistaTareas(vista) {
    estadoActual.vistaTareas = vista;
    mostrarTareas();
}

function mostrarFiltrosTareas() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalFiltrosTareas';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>🔍 Filtros Avanzados</h2>
        <button class="close-btn" onclick="cerrarModal('modalFiltrosTareas')">×</button>
      </div>
      
      <form onsubmit="aplicarFiltrosTareas(event)">
        <div class="form-group">
          <label>Buscar</label>
          <input type="text" class="form-control" name="busqueda" placeholder="Título o descripción...">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Estado</label>
            <select class="form-control" name="estado">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completada</option>
            </select>
          </div>

          <div class="form-group">
            <label>Prioridad</label>
            <select class="form-control" name="prioridad">
              <option value="">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
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
          <label>
            <input type="checkbox" name="solo_vencidas">
            Solo tareas vencidas
          </label>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="limpiarFiltrosTareas()">
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

function aplicarFiltrosTareas(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    let tareasFiltradas = [...estadoActual.tareas];

    // Busqueda
    const busqueda = formData.get('busqueda')?.toLowerCase();
    if (busqueda) {
        tareasFiltradas = tareasFiltradas.filter(t =>
            t.titulo.toLowerCase().includes(busqueda) ||
            (t.descripcion && t.descripcion.toLowerCase().includes(busqueda))
        );
    }

    // Estado
    const estado = formData.get('estado');
    if (estado) {
        tareasFiltradas = tareasFiltradas.filter(t => t.estado === estado);
    }

    // Prioridad
    const prioridad = formData.get('prioridad');
    if (prioridad) {
        tareasFiltradas = tareasFiltradas.filter(t => t.prioridad === prioridad);
    }

    // Proyecto
    const proyectoId = formData.get('proyecto_id');
    if (proyectoId) {
        tareasFiltradas = tareasFiltradas.filter(t => t.proyecto_id === proyectoId);
    }

    // Solo vencidas
    if (formData.get('solo_vencidas')) {
        const hoy = new Date();
        tareasFiltradas = tareasFiltradas.filter(t =>
            t.fecha_vencimiento &&
            new Date(t.fecha_vencimiento) < hoy &&
            t.estado !== 'completada'
        );
    }

    document.getElementById('contenedorTareas').innerHTML = renderizarVistaLista(tareasFiltradas);
    cerrarModal('modalFiltrosTareas');
}

function limpiarFiltrosTareas() {
    cerrarModal('modalFiltrosTareas');
    mostrarTareas();
}

// ==================== FORMULARIO TAREA ====================

function mostrarFormularioTarea(proyectoId = null, tareaId = null) {
    const esEdicion = !!tareaId;
    const tarea = esEdicion ? estadoActual.tareas.find(t => t.id === tareaId) : null;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalFormularioTarea';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${esEdicion ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}</h2>
        <button class="close-btn" onclick="cerrarModal('modalFormularioTarea')">×</button>
      </div>
      
      <form onsubmit="guardarTarea(event, ${esEdicion ? `'${tareaId}'` : 'null'})">
        <div class="form-group">
          <label>Título *</label>
          <input type="text" 
                 class="form-control" 
                 name="titulo" 
                 value="${tarea?.titulo || ''}"
                 placeholder="Ej: Revisar documentación de protección civil"
                 required>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea class="form-control" 
                    name="descripcion" 
                    rows="4"
                    placeholder="Describe la tarea...">${tarea?.descripcion || ''}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Proyecto</label>
            <select class="form-control" name="proyecto_id">
              <option value="">Sin proyecto</option>
              ${estadoActual.proyectos.map(p => `
                <option value="${p.id}" ${(proyectoId === p.id || tarea?.proyecto_id === p.id) ? 'selected' : ''}>
                  ${p.nombre}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Estado</label>
            <select class="form-control" name="estado">
              <option value="pendiente" ${!tarea || tarea?.estado === 'pendiente' ? 'selected' : ''}>
                Pendiente
              </option>
              <option value="en_proceso" ${tarea?.estado === 'en_proceso' ? 'selected' : ''}>
                En Proceso
              </option>
              <option value="completada" ${tarea?.estado === 'completada' ? 'selected' : ''}>
                Completada
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Prioridad</label>
            <select class="form-control" name="prioridad">
              <option value="baja" ${tarea?.prioridad === 'baja' ? 'selected' : ''}>
                Baja
              </option>
              <option value="media" ${!tarea || tarea?.prioridad === 'media' ? 'selected' : ''}>
                Media
              </option>
              <option value="alta" ${tarea?.prioridad === 'alta' ? 'selected' : ''}>
                Alta
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Fecha de Vencimiento</label>
            <input type="date" 
                   class="form-control" 
                   name="fecha_vencimiento" 
                   value="${tarea?.fecha_vencimiento || ''}">
          </div>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalFormularioTarea')">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            ${esEdicion ? 'Guardar Cambios' : 'Crear Tarea'}
          </button>
        </div>
      </form>
    </div>
  `;

    document.body.appendChild(modal);
}

async function guardarTarea(event, tareaId) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const datos = Object.fromEntries(formData);

    try {
        let resultado;
        if (tareaId) {
            resultado = await window.electronAPI.actualizarTarea(tareaId, datos);
        } else {
            resultado = await window.electronAPI.crearTarea(datos);
        }

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                tareaId ? 'Tarea Actualizada' : 'Tarea Creada',
                `La tarea "${datos.titulo}" se ha guardado correctamente`
            );

            cerrarModal('modalFormularioTarea');
            await cargarDatos();
            mostrarTareas();
        } else {
            sistemaNotificaciones.notificarError(
                'Error',
                resultado.error || 'No se pudo guardar la tarea'
            );
        }
    } catch (error) {
        console.error('Error guardando tarea:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'Ocurrió un error al guardar la tarea'
        );
    }
}

// ==================== DETALLE DE TAREA ====================

function verDetalleTarea(tareaId) {
    const tarea = estadoActual.tareas.find(t => t.id === tareaId);
    if (!tarea) return;

    const proyecto = estadoActual.proyectos.find(p => p.id === tarea.proyecto_id);
    const vencida = tarea.fecha_vencimiento && new Date(tarea.fecha_vencimiento) < new Date() && tarea.estado !== 'completada';

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalDetalleTarea';

    modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>✅ ${tarea.titulo}</h2>
        <button class="close-btn" onclick="cerrarModal('modalDetalleTarea')">×</button>
      </div>
      
      <div class="tarea-detalle">
        <div class="tarea-detalle-meta">
          <span class="badge badge-${obtenerClaseEstado(tarea.estado)}">
            ${tarea.estado || 'pendiente'}
          </span>
          <span class="badge badge-${obtenerClasePrioridad(tarea.prioridad || 'media')}">
            ${tarea.prioridad || 'media'}
          </span>
          ${vencida ? `
            <span class="badge badge-danger">
              ⚠️ Vencida
            </span>
          ` : ''}
        </div>

        ${proyecto ? `
          <div class="tarea-detalle-proyecto">
            <strong>📁 Proyecto:</strong>
            <a href="#" onclick="verDetalleProyecto('${proyecto.id}'); cerrarModal('modalDetalleTarea');">
              ${proyecto.nombre}
            </a>
          </div>
        ` : ''}

        ${tarea.descripcion ? `
          <div class="tarea-detalle-seccion">
            <h4>Descripción</h4>
            <p>${tarea.descripcion}</p>
          </div>
        ` : ''}

        ${tarea.fecha_vencimiento ? `
          <div class="tarea-detalle-seccion">
            <h4>Fecha de Vencimiento</h4>
            <p class="${vencida ? 'text-danger' : ''}">
              📅 ${formatearFecha(tarea.fecha_vencimiento)}
              ${vencida ? ' (Vencida)' : ''}
            </p>
          </div>
        ` : ''}

        <div class="tarea-detalle-acciones">
          <button class="btn btn-secondary" onclick="mostrarFormularioTarea(null, '${tarea.id}')">
            ✏️ Editar
          </button>
          ${tarea.estado !== 'completada' ? `
            <button class="btn btn-success" onclick="completarTareaDirecta('${tarea.id}')">
              ✓ Marcar como Completada
            </button>
          ` : `
            <button class="btn btn-warning" onclick="reabrirTarea('${tarea.id}')">
              ↩️ Reabrir Tarea
            </button>
          `}
          <button class="btn btn-danger" onclick="eliminarTarea('${tarea.id}')">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

// ==================== ACCIONES ====================

async function toggleTareaEstado(tareaId, completada) {
    const nuevoEstado = completada ? 'completada' : 'pendiente';
    await cambiarEstadoTarea(tareaId, nuevoEstado);
}

async function completarTareaDirecta(tareaId) {
    await cambiarEstadoTarea(tareaId, 'completada');
    cerrarModal('modalDetalleTarea');
}

async function reabrirTarea(tareaId) {
    await cambiarEstadoTarea(tareaId, 'pendiente');
    cerrarModal('modalDetalleTarea');
}

async function eliminarTarea(tareaId) {
    const tarea = estadoActual.tareas.find(t => t.id === tareaId);

    if (!confirm(`¿Estás seguro de eliminar la tarea "${tarea.titulo}"?`)) {
        return;
    }

    try {
        const resultado = await window.electronAPI.eliminarTarea(tareaId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Tarea Eliminada',
                `La tarea "${tarea.titulo}" ha sido eliminada`
            );

            cerrarModal('modalDetalleTarea');
            await cargarDatos();
            mostrarTareas();
        }
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo eliminar la tarea'
        );
    }
}

function mostrarMenuTarea(event, tareaId) {
    event.stopPropagation();

    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    menu.innerHTML = `
    <button onclick="verDetalleTarea('${tareaId}')">
      👁️ Ver Detalle
    </button>
    <button onclick="mostrarFormularioTarea(null, '${tareaId}')">
      ✏️ Editar
    </button>
    <button onclick="completarTareaDirecta('${tareaId}')">
      ✓ Completar
    </button>
    <hr>
    <button onclick="eliminarTarea('${tareaId}')" style="color: var(--color-peligro);">
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

function formatearFechaCorta(fecha) {
    if (!fecha) return 'N/A';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

// Inicializar vista por defecto
if (!estadoActual.vistaTareas) {
    estadoActual.vistaTareas = 'lista';
}
