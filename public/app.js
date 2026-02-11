// ==================== ESTADO GLOBAL ====================

let estadoActual = {
  proyectos: [],
  tareas: [],
  documentos: [],
  registrosTiempo: [],
  checklists: [],
  alertas: [],
  vistaActual: 'dashboard',
  filtros: {},
  usuario: {
    nombre: 'Usuario',
    email: 'usuario@ejemplo.com'
  }
};

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando Gestor Virtual...');

  // Aplicar tema guardado
  if (typeof configManager !== 'undefined') {
    configManager.aplicarTema();
  }

  // Inicializar navegación dinámica
  inicializarNavegacionDinamica();

  // Inicializar sidebar toggle
  inicializarSidebarToggle();

  // Inicializar búsqueda global
  inicializarBusquedaGlobal();

  // Inicializar notificaciones
  if (typeof inicializarNotificacionesUI !== 'undefined') {
    inicializarNotificacionesUI();
  }

  // Cargar datos
  await cargarDatos();

  // Mostrar vista inicial
  const vistaInicial = configManager.obtenerConfiguracion().vista_inicial || 'dashboard';
  cambiarVista(vistaInicial);

  console.log('✅ Gestor Virtual iniciado correctamente');
});

// ==================== NAVEGACIÓN DINÁMICA ====================

function inicializarNavegacionDinamica() {
  const config = configManager.obtenerConfiguracion();
  const modulosActivos = config.modulos_activos;

  // Definición completa de módulos
  const MODULOS_DISPONIBLES = {
    dashboard: {
      id: 'dashboard',
      nombre: 'Dashboard',
      icono: '📊',
      vista: 'dashboard',
      seccion: 'Principal',
      orden: 1,
      badge: null,
      funcion: mostrarDashboard
    },
    proyectos: {
      id: 'proyectos',
      nombre: 'Proyectos',
      icono: '📁',
      vista: 'proyectos',
      seccion: 'Principal',
      orden: 2,
      badge: () => estadoActual.proyectos.filter(p => p.estado === 'activo').length,
      funcion: mostrarProyectos
    },
    tareas: {
      id: 'tareas',
      nombre: 'Tareas',
      icono: '✅',
      vista: 'tareas',
      seccion: 'Principal',
      orden: 3,
      badge: () => estadoActual.tareas.filter(t => t.estado === 'pendiente').length,
      funcion: mostrarTareas
    },
    documentos: {
      id: 'documentos',
      nombre: 'Documentos',
      icono: '📄',
      vista: 'documentos',
      seccion: 'Gestión',
      orden: 4,
      badge: null,
      funcion: mostrarDocumentos
    },
    ocr: {
      id: 'ocr',
      nombre: 'Procesador OCR',
      icono: '🔍',
      vista: 'ocr',
      seccion: 'Gestión',
      orden: 5,
      badge: null,
      funcion: mostrarProcesadorOCR
    },
    checklists: {
      id: 'checklists',
      nombre: 'Auditorías INVEA',
      icono: '📋',
      vista: 'checklists',
      seccion: 'Cumplimiento',
      orden: 6,
      badge: null,
      funcion: mostrarChecklists
    },
    marcoJuridico: {
      id: 'marcoJuridico',
      nombre: 'Marco Jurídico',
      icono: '⚖️',
      vista: 'marcoJuridico',
      seccion: 'Cumplimiento',
      orden: 7,
      badge: () => estadoActual.alertas?.length || 0,
      funcion: mostrarMarcoJuridico
    },
    organizadorArchivos: {
      id: 'organizadorArchivos',
      nombre: 'Organizador',
      icono: '📂',
      vista: 'organizadorArchivos',
      seccion: 'Gestión',
      orden: 8,
      badge: null,
      funcion: mostrarOrganizadorArchivos
    },
    reportes: {
      id: 'reportes',
      nombre: 'Reportes',
      icono: '📈',
      vista: 'reportes',
      seccion: 'Análisis',
      orden: 9,
      badge: null,
      funcion: mostrarReportes
    },
    chatbot: {
      id: 'chatbot',
      nombre: 'Asistente 🤖',
      icono: '🤖',
      vista: 'chatbot',
      seccion: 'Análisis',
      orden: 10,
      badge: null,
      funcion: mostrarChatbot
    }
  };


  // Filtrar módulos activos
  const modulosParaMostrar = modulosActivos
    .map(id => MODULOS_DISPONIBLES[id])
    .filter(m => m !== undefined)
    .sort((a, b) => a.orden - b.orden);

  // Agrupar por sección
  const modulosPorSeccion = {};
  modulosParaMostrar.forEach(modulo => {
    if (!modulosPorSeccion[modulo.seccion]) {
      modulosPorSeccion[modulo.seccion] = [];
    }
    modulosPorSeccion[modulo.seccion].push(modulo);
  });

  // Renderizar sidebar
  renderizarSidebar(modulosPorSeccion);
}

function renderizarSidebar(modulosPorSeccion) {
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (!sidebarNav) return;

  let html = '';

  Object.entries(modulosPorSeccion).forEach(([seccion, modulos]) => {
    html += `
      <div class="nav-section">
        <div class="nav-section-title">${seccion}</div>
        ${modulos.map(modulo => {
      const badge = typeof modulo.badge === 'function' ? modulo.badge() : modulo.badge;
      return `
            <a href="#" class="nav-item" data-view="${modulo.vista}" data-modulo="${modulo.id}">
              <span class="nav-icon">${modulo.icono}</span>
              <span class="nav-text">${modulo.nombre}</span>
              ${badge && badge > 0 ? `<span class="nav-badge">${badge}</span>` : ''}
            </a>
          `;
    }).join('')}
      </div>
    `;
  });

  sidebarNav.innerHTML = html;

  // Agregar event listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const vista = item.dataset.view;
      cambiarVista(vista);
    });
  });
}

function actualizarBadges() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const moduloId = item.dataset.modulo;
    const badge = item.querySelector('.nav-badge');

    // Calcular nuevo valor del badge
    let nuevoValor = 0;
    switch (moduloId) {
      case 'proyectos':
        nuevoValor = estadoActual.proyectos.filter(p => p.estado === 'activo').length;
        break;
      case 'tareas':
        nuevoValor = estadoActual.tareas.filter(t => t.estado === 'pendiente').length;
        break;
      case 'alertas': // Fallback para compatibilidad
        nuevoValor = estadoActual.alertas.filter(a => !a.leida).length;
        break;
      case 'marcoJuridico':
        nuevoValor = estadoActual.alertas.length; // Las alertas cargadas ya son las no leídas
        break;
    }

    if (nuevoValor > 0) {
      if (badge) {
        badge.textContent = nuevoValor;
      } else {
        const newBadge = document.createElement('span');
        newBadge.className = 'nav-badge';
        newBadge.textContent = nuevoValor;
        item.appendChild(newBadge);
      }
    } else if (badge) {
      badge.remove();
    }
  });
}

// ==================== CAMBIO DE VISTA ====================

function cambiarVista(vista) {
  console.log('📍 Cambiando a vista:', vista);

  // Actualizar estado
  estadoActual.vistaActual = vista;

  // Actualizar navegación activa
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === vista) {
      item.classList.add('active');
    }
  });

  // Mostrar vista correspondiente
  const contentArea = document.getElementById('contentArea');
  if (!contentArea) return;

  // Mostrar loading
  contentArea.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Cargando ${vista}...</p>
    </div>
  `;

  // Ejecutar función de vista con delay para animación
  setTimeout(() => {
    switch (vista) {
      case 'dashboard':
        mostrarDashboard();
        break;
      case 'proyectos':
        mostrarProyectos();
        break;
      case 'tareas':
        mostrarTareas();
        break;
      case 'tiempo':
        mostrarRegistroTiempo();
        break;
      case 'documentos':
        mostrarDocumentos();
        break;
      case 'ocr':
        if (typeof mostrarProcesadorOCR !== 'undefined') {
          mostrarProcesadorOCR();
        } else {
          mostrarVistaNoDisponible('OCR');
        }
        break;
      case 'checklists':
        if (typeof mostrarChecklists !== 'undefined') {
          mostrarChecklists();
        } else {
          mostrarVistaNoDisponible('Auditorías');
        }
        break;
      case 'marcoJuridico':
        if (typeof mostrarMarcoJuridico !== 'undefined') {
          mostrarMarcoJuridico();
        } else {
          mostrarVistaNoDisponible('Marco Jurídico');
        }
        break;
      case 'alertas':
        mostrarAlertas();
        break;
      case 'organizadorArchivos':
        mostrarOrganizadorArchivos();
        break;
      case 'reportes':
        mostrarReportes();
        break;
      case 'sistema_aprendizaje':
        mostrarSistemaAprendizaje();
        break;
      case 'chatbot':
        mostrarChatbot();
        break;
      default:

        mostrarVistaNoDisponible(vista);
    }
  }, 300);
}

function mostrarVistaNoDisponible(nombreVista) {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div style="text-align: center; padding: 100px 20px;">
      <div style="font-size: 64px; margin-bottom: 20px;">🚧</div>
      <h2 style="color: var(--color-primario); margin-bottom: 10px;">Vista en Desarrollo</h2>
      <p style="color: var(--color-texto-secundario);">
        La vista de ${nombreVista} estará disponible próximamente.
      </p>
      <button class="btn btn-primary" onclick="cambiarVista('dashboard')" style="margin-top: 20px;">
        ← Volver al Dashboard
      </button>
    </div>
  `;
}

// ==================== CARGAR DATOS ====================

async function cargarDatos() {
  try {
    console.log('📥 Cargando datos...');

    // Cargar proyectos
    const proyectosRes = await window.electronAPI.obtenerProyectos({});
    if (proyectosRes.success) {
      estadoActual.proyectos = proyectosRes.data;
    }

    // Cargar tareas
    const tareasRes = await window.electronAPI.obtenerTareas({});
    if (tareasRes.success) {
      estadoActual.tareas = tareasRes.data;
    }

    // Cargar alertas reales
    const alertasRes = await window.electronAPI.obtenerAlertasPendientes();
    if (alertasRes.success) {
      estadoActual.alertas = alertasRes.data;
    } else {
      estadoActual.alertas = [];
    }

    // Actualizar badges
    actualizarBadges();

    console.log('✅ Datos cargados correctamente');
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    sistemaNotificaciones?.notificarError(
      'Error al Cargar',
      'No se pudieron cargar los datos de la aplicación'
    );
  }
}

// ==================== DASHBOARD ====================

async function mostrarDashboard() {
  const config = configManager.obtenerConfiguracion('dashboard');
  const widgets = config.widgets || ['estadisticas', 'alertas', 'marco_juridico', 'tareas_recientes', 'proyectos_activos'];

  const widgetsHtml = await Promise.all(widgets.map(widget => renderizarWidget(widget)));

  const html = `
    <div class="header">
      <div>
        <h1>📊 Dashboard</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Bienvenido, ${estadoActual.usuario.nombre}
        </p>
      </div>
      <button class="btn btn-primary" onclick="mostrarConfiguracion()">
        ⚙️ Personalizar Dashboard
      </button>
    </div>

    <div class="dashboard-widgets">
      ${widgetsHtml.join('')}
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
}

async function renderizarWidget(tipo) {
  switch (tipo) {
    case 'estadisticas':
      return renderizarWidgetEstadisticas();
    case 'alertas':
      return renderizarWidgetAlertas();
    case 'marco_juridico':
      if (typeof renderizarWidgetMarcoJuridico === 'function') {
        return await renderizarWidgetMarcoJuridico();
      }
      return '';
    case 'tareas_recientes':
      return renderizarWidgetTareasRecientes();
    case 'proyectos_activos':
      return renderizarWidgetProyectosActivos();
    case 'grafico_tiempo':
      return renderizarWidgetGraficoTiempo();
    case 'calendario':
      return renderizarWidgetCalendario();
    default:
      return '';
  }
}

async function renderizarWidgetMarcoJuridico() {
  try {
    const [statsRes, alertasRes] = await Promise.all([
      window.electronAPI.obtenerEstadisticasMarcoJuridico(),
      window.electronAPI.obtenerAlertasNormativas()
    ]);

    const stats = statsRes.success ? statsRes.data : { total: 0, alertasPendientes: 0 };
    const alertas = alertasRes.success ? alertasRes.data : [];

    return `
      <div class="card widget-marco-juridico">
        <div class="card-header">
          <h3 class="card-title">⚖️ Marco Jurídico</h3>
          <button class="btn btn-sm btn-secondary" onclick="cambiarVista('marcoJuridico')">→</button>
        </div>
        <div class="card-body">
          <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <div style="flex: 1; text-align: center; padding: 10px; background: var(--color-fondo); border-radius: 8px;">
              <span style="display: block; font-size: 24px; font-weight: bold;">${stats.total}</span>
              <span style="font-size: 12px; color: var(--color-texto-secundario);">Normativas</span>
            </div>
            <div style="flex: 1; text-align: center; padding: 10px; background: var(--color-fondo); border-radius: 8px;">
              <span style="display: block; font-size: 24px; font-weight: bold; color: var(--color-advertencia);">${stats.alertasPendientes}</span>
              <span style="font-size: 12px; color: var(--color-texto-secundario);">Alertas</span>
            </div>
          </div>

          ${alertas.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <strong>Últimas Alertas:</strong>
              ${alertas.slice(0, 3).map(alerta => `
                <div style="display: flex; align-items: center; gap: 10px; font-size: 13px;">
                  <span>${alerta.tipo_alerta === 'CRITICA' ? '🔴' : '🟡'}</span>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${alerta.mensaje}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color: var(--color-texto-secundario); font-size: 13px; margin: 10px 0 0 0; text-align: center;">
              No hay alertas pendientes
            </p>
          `}
        </div>
        <div class="card-footer" style="margin-top: auto; padding-top: 15px;">
          <button class="btn btn-sm btn-secondary w-100" onclick="cambiarVista('marcoJuridico')">
            Ver Todo →
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error renderizando widget marco jurídico:', error);
    return '';
  }
}

function renderizarWidgetEstadisticas() {
  const totalProyectos = estadoActual.proyectos.length;
  const proyectosActivos = estadoActual.proyectos.filter(p => p.estado === 'activo').length;
  const tareasPendientes = estadoActual.tareas.filter(t => t.estado === 'pendiente').length;
  const tareasCompletadas = estadoActual.tareas.filter(t => t.estado === 'completada').length;

  return `
    <div class="stats-grid" style="grid-column: 1 / -1;">
      <div class="stat-card">
        <h3>Total Proyectos</h3>
        <div class="value">${totalProyectos}</div>
        <div class="change positive">↑ ${proyectosActivos} activos</div>
      </div>
      <div class="stat-card">
        <h3>Tareas Pendientes</h3>
        <div class="value" style="color: var(--color-advertencia);">${tareasPendientes}</div>
        <div class="change">${tareasCompletadas} completadas</div>
      </div>
      <div class="stat-card">
        <h3>Auditorías</h3>
        <div class="value" style="color: var(--color-info);">0</div>
        <div class="change">Este mes</div>
      </div>
      <div class="stat-card">
        <h3>Documentos</h3>
        <div class="value" style="color: var(--color-exito);">0</div>
        <div class="change">Todos vigentes</div>
      </div>
    </div>
  `;
}

function renderizarWidgetAlertas() {
  return `
    <div class="card" style="grid-column: span 2;">
      <div class="card-header">
        <h3 class="card-title">🔔 Alertas Recientes</h3>
        <button class="btn btn-sm btn-secondary" onclick="cambiarVista('alertas')">Ver Todas</button>
      </div>
      <div class="card-body">
        ${estadoActual.alertas.length > 0 ? `
          <div class="alertas-lista">
            ${estadoActual.alertas.slice(0, 5).map(alerta => `
              <div class="alerta-item">
                <span class="alerta-icono">${alerta.icono}</span>
                <div class="alerta-contenido">
                  <strong>${alerta.titulo}</strong>
                  <p>${alerta.mensaje}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 40px; color: var(--color-texto-secundario);">
            <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
            <p>No hay alertas pendientes</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderizarWidgetTareasRecientes() {
  const tareasRecientes = estadoActual.tareas
    .filter(t => t.estado === 'pendiente')
    .slice(0, 5);

  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">✅ Tareas Pendientes</h3>
        <button class="btn btn-sm btn-secondary" onclick="cambiarVista('tareas')">Ver Todas</button>
      </div>
      <div class="card-body">
        ${tareasRecientes.length > 0 ? `
          <div class="tareas-lista">
            ${tareasRecientes.map(tarea => `
              <div class="tarea-item">
                <input type="checkbox" onchange="completarTareaRapida('${tarea.id}')">
                <div>
                  <strong>${tarea.titulo}</strong>
                  <p style="font-size: 12px; color: var(--color-texto-secundario);">
                    ${tarea.fecha_vencimiento ? `Vence: ${formatearFecha(tarea.fecha_vencimiento)}` : 'Sin fecha'}
                  </p>
                </div>
                <span class="badge badge-${obtenerClasePrioridad(tarea.prioridad)}">${tarea.prioridad || 'media'}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 40px; color: var(--color-texto-secundario);">
            <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
            <p>No hay tareas pendientes</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderizarWidgetProyectosActivos() {
  const proyectosActivos = estadoActual.proyectos
    .filter(p => p.estado === 'activo')
    .slice(0, 5);

  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📁 Proyectos Activos</h3>
        <button class="btn btn-sm btn-secondary" onclick="cambiarVista('proyectos')">Ver Todos</button>
      </div>
      <div class="card-body">
        ${proyectosActivos.length > 0 ? `
          <div class="proyectos-lista">
            ${proyectosActivos.map(proyecto => `
              <div class="proyecto-item" onclick="verDetalleProyecto('${proyecto.id}')">
                <div class="proyecto-icono">📁</div>
                <div class="proyecto-info">
                  <strong>${proyecto.nombre}</strong>
                  <p style="font-size: 12px; color: var(--color-texto-secundario);">
                    ${proyecto.cliente || 'Sin cliente'}
                  </p>
                </div>
                <span class="badge badge-info">${proyecto.clasificacion || 'General'}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 40px; color: var(--color-texto-secundario);">
            <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
            <p>No hay proyectos activos</p>
            <button class="btn btn-primary" onclick="mostrarFormularioProyecto()" style="margin-top: 15px;">
              Crear Proyecto
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderizarWidgetGraficoTiempo() {
  return `
    <div class="card" style="grid-column: span 2;">
      <div class="card-header">
        <h3 class="card-title">⏱️ Tiempo Trabajado</h3>
      </div>
      <div class="card-body">
        <div style="text-align: center; padding: 40px; color: var(--color-texto-secundario);">
          <p>Gráfico de tiempo en desarrollo</p>
        </div>
      </div>
    </div>
  `;
}

function renderizarWidgetCalendario() {
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📅 Calendario</h3>
      </div>
      <div class="card-body">
        <div style="text-align: center; padding: 40px; color: var(--color-texto-secundario);">
          <p>Calendario en desarrollo</p>
        </div>
      </div>
    </div>
  `;
}

// ==================== SIDEBAR TOGGLE ====================

function inicializarSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');

  if (!sidebar || !toggle) return;

  const config = configManager.obtenerConfiguracion('sidebar');
  if (!config.expandido) {
    sidebar.classList.add('collapsed');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const icon = toggle.querySelector('span:first-child');
    const expandido = !sidebar.classList.contains('collapsed');

    icon.textContent = expandido ? '◀' : '▶';

    configManager.actualizarConfiguracion('sidebar', { expandido });
  });
}

// ==================== BÚSQUEDA GLOBAL ====================

function inicializarBusquedaGlobal() {
  const searchInput = document.getElementById('globalSearch');
  if (!searchInput) return;

  let timeoutId;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      realizarBusquedaGlobal(e.target.value);
    }, 300);
  });
}

function realizarBusquedaGlobal(termino) {
  if (!termino || termino.length < 2) {
    ocultarResultadosBusqueda();
    return;
  }

  const resultados = {
    proyectos: estadoActual.proyectos.filter(p =>
      p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      (p.cliente && p.cliente.toLowerCase().includes(termino.toLowerCase()))
    ),
    tareas: estadoActual.tareas.filter(t =>
      t.titulo.toLowerCase().includes(termino.toLowerCase()) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(termino.toLowerCase()))
    )
  };

  mostrarResultadosBusqueda(resultados, termino);
}

function mostrarResultadosBusqueda(resultados, termino) {
  let panelResultados = document.getElementById('resultadosBusqueda');

  if (!panelResultados) {
    panelResultados = document.createElement('div');
    panelResultados.id = 'resultadosBusqueda';
    panelResultados.className = 'resultados-busqueda-panel';
    document.body.appendChild(panelResultados);
  }

  const totalResultados = resultados.proyectos.length + resultados.tareas.length;

  panelResultados.innerHTML = `
    <div class="resultados-header">
      <h4>Resultados para "${termino}"</h4>
      <button onclick="ocultarResultadosBusqueda()">×</button>
    </div>
    <div class="resultados-contenido">
      ${totalResultados === 0 ? `
        <p style="text-align: center; padding: 20px; color: var(--color-texto-secundario);">
          No se encontraron resultados
        </p>
      ` : ''}
      
      ${resultados.proyectos.length > 0 ? `
        <div class="resultados-seccion">
          <h5>📁 Proyectos (${resultados.proyectos.length})</h5>
          ${resultados.proyectos.map(p => `
            <div class="resultado-item" onclick="verDetalleProyecto('${p.id}'); ocultarResultadosBusqueda();">
              <strong>${p.nombre}</strong>
              <p>${p.cliente || 'Sin cliente'}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${resultados.tareas.length > 0 ? `
        <div class="resultados-seccion">
          <h5>✅ Tareas (${resultados.tareas.length})</h5>
          ${resultados.tareas.map(t => `
            <div class="resultado-item" onclick="verDetalleTarea('${t.id}'); ocultarResultadosBusqueda();">
              <strong>${t.titulo}</strong>
              <p>${t.descripcion || 'Sin descripción'}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  panelResultados.classList.add('active');
}

function ocultarResultadosBusqueda() {
  const panel = document.getElementById('resultadosBusqueda');
  if (panel) {
    panel.classList.remove('active');
  }
}

// ==================== UTILIDADES ====================

function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function obtenerClasePrioridad(prioridad) {
  switch (prioridad) {
    case 'alta': return 'danger';
    case 'media': return 'warning';
    case 'baja': return 'info';
    default: return 'secondary';
  }
}

function obtenerClaseEstado(estado) {
  switch (estado) {
    case 'completada': return 'success';
    case 'en_proceso': return 'warning';
    case 'pendiente': return 'secondary';
    default: return 'info';
  }
}

async function completarTareaRapida(tareaId) {
  const resultado = await window.electronAPI.actualizarTarea(tareaId, { estado: 'completada' });
  if (resultado.success) {
    await cargarDatos();
    mostrarDashboard();
    sistemaNotificaciones?.notificarExito('Tarea Completada', 'La tarea se marcó como completada');
  }
}

// ==================== EXPORTAR FUNCIONES GLOBALES ====================

window.cambiarVista = cambiarVista;
window.cargarDatos = cargarDatos;
window.actualizarBadges = actualizarBadges;
window.completarTareaRapida = completarTareaRapida;
