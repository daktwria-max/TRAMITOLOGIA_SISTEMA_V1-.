// ==================== PANEL DE CONFIGURACIÓN ====================

function mostrarConfiguracion() {
  const config = configManager.obtenerConfiguracion();

  const html = `
    <div class="header">
      <h1>⚙️ Configuración</h1>
      <button class="btn btn-secondary" onclick="cerrarConfiguracion()">
        ← Volver
      </button>
    </div>

    <div style="display: grid; grid-template-columns: 250px 1fr; gap: var(--espaciado-xl);">
      <!-- Menú lateral de configuración -->
      <div class="config-sidebar">
        <div class="config-menu">
          <button class="config-menu-item active" data-section="apariencia">
            <span>🎨</span> Apariencia
          </button>
          <button class="config-menu-item" data-section="modulos">
            <span>🧩</span> Módulos
          </button>
          <button class="config-menu-item" data-section="notificaciones">
            <span>🔔</span> Notificaciones
          </button>
          <button class="config-menu-item" data-section="general">
            <span>⚙️</span> General
          </button>
          <button class="config-menu-item" data-section="accesibilidad">
            <span>♿</span> Accesibilidad
          </button>
          <button class="config-menu-item" data-section="datos">
            <span>💾</span> Datos
          </button>
        </div>
      </div>

      <!-- Contenido de configuración -->
      <div class="config-content" id="configContent">
        ${renderSeccionApariencia(config)}
      </div>
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;

  // Inicializar listeners
  initConfigMenu();
}

function initConfigMenu() {
  document.querySelectorAll('.config-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      // Actualizar active
      document.querySelectorAll('.config-menu-item').forEach(i =>
        i.classList.remove('active')
      );
      item.classList.add('active');

      // Cargar sección
      const section = item.dataset.section;
      cargarSeccionConfig(section);
    });
  });
}

function cargarSeccionConfig(section) {
  const config = configManager.obtenerConfiguracion();
  let html = '';

  switch (section) {
    case 'apariencia':
      html = renderSeccionApariencia(config);
      break;
    case 'modulos':
      html = renderSeccionModulos(config);
      break;
    case 'notificaciones':
      html = renderSeccionNotificaciones(config);
      break;
    case 'general':
      html = renderSeccionGeneral(config);
      break;
    case 'accesibilidad':
      html = renderSeccionAccesibilidad(config);
      break;
    case 'datos':
      html = renderSeccionDatos(config);
      break;
  }

  document.getElementById('configContent').innerHTML = html;
}

// ==================== SECCIÓN APARIENCIA ====================

function renderSeccionApariencia(config) {
  const temasDisponibles = Object.entries(TEMAS);

  return `
    <div class="config-section">
      <h2 style="color: var(--color-primario); margin-bottom: var(--espaciado-lg);">
        🎨 Apariencia
      </h2>

      <!-- Selector de Tema -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Tema de Color</h3>
        </div>
        <div class="card-body">
          <p style="color: var(--color-texto-secundario); margin-bottom: var(--espaciado-md);">
            Selecciona el tema visual de la aplicación
          </p>

          <div class="themes-grid">
            ${temasDisponibles.map(([key, tema]) => `
              <div class="theme-card ${config.tema === key ? 'active' : ''}" 
                   onclick="cambiarTema('${key}')">
                <div class="theme-preview">
                  <div style="background: ${tema.colores.primario}; height: 40%;"></div>
                  <div style="background: ${tema.colores.secundario}; height: 30%;"></div>
                  <div style="background: ${tema.colores.acento}; height: 30%;"></div>
                </div>
                <div class="theme-info">
                  <h4>${tema.nombre}</h4>
                  ${config.tema === key ? '<span class="badge badge-success">Activo</span>' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Configuración de Sidebar -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Barra Lateral</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>
              <input type="checkbox" 
                     ${config.sidebar.expandido ? 'checked' : ''} 
                     onchange="toggleSidebarExpandido(this.checked)">
              Expandida por defecto
            </label>
          </div>

          <div class="form-group">
            <label>Posición</label>
            <select class="form-control" onchange="cambiarPosicionSidebar(this.value)">
              <option value="izquierda" ${config.sidebar.posicion === 'izquierda' ? 'selected' : ''}>
                Izquierda
              </option>
              <option value="derecha" ${config.sidebar.posicion === 'derecha' ? 'selected' : ''}>
                Derecha
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Layout del Dashboard -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Dashboard</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Diseño</label>
            <select class="form-control" onchange="cambiarLayoutDashboard(this.value)">
              <option value="grid" ${config.dashboard.layout === 'grid' ? 'selected' : ''}>
                Cuadrícula
              </option>
              <option value="list" ${config.dashboard.layout === 'list' ? 'selected' : ''}>
                Lista
              </option>
              <option value="compact" ${config.dashboard.layout === 'compact' ? 'selected' : ''}>
                Compacto
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Widgets Visibles</label>
            <div class="widgets-selector">
              ${['estadisticas', 'alertas', 'marco_juridico', 'tareas_recientes', 'proyectos_activos', 'grafico_tiempo', 'calendario'].map(widget => `
                <label class="widget-option">
                  <input type="checkbox" 
                         ${config.dashboard.widgets.includes(widget) ? 'checked' : ''}
                         onchange="toggleWidget('${widget}', this.checked)">
                  ${formatearNombreWidget(widget)}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== SECCIÓN MÓDULOS ====================

function renderSeccionModulos(config) {
  const modulosDisponibles = [
    { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Panel principal con estadísticas', icon: '📊', requerido: true },
    { id: 'proyectos', nombre: 'Proyectos', descripcion: 'Gestión de proyectos y establecimientos', icon: '📁', requerido: true },
    { id: 'tareas', nombre: 'Tareas', descripcion: 'Administración de tareas y actividades', icon: '✅', requerido: false },
    { id: 'tiempo', nombre: 'Registro de Tiempo', descripcion: 'Control de horas trabajadas', icon: '⏱️', requerido: false },
    { id: 'documentos', nombre: 'Documentos', descripcion: 'Gestión documental', icon: '📄', requerido: false },
    { id: 'ocr', nombre: 'OCR', descripcion: 'Reconocimiento óptico de caracteres', icon: '🔍', requerido: false },
    { id: 'checklists', nombre: 'Auditorías INVEA', descripcion: 'Checklists de cumplimiento normativo', icon: '📋', requerido: false },
    { id: 'reportes', nombre: 'Reportes', descripcion: 'Generación de informes y análisis', icon: '📈', requerido: false },
    { id: 'marcoJuridico', nombre: 'Marco Jurídico', descripcion: 'Actualizaciones normativas y regulatorias', icon: '⚖️', requerido: false },
    { id: 'sistema_aprendizaje', nombre: 'Sistema de Aprendizaje', descripcion: 'Análisis inteligente de documentos', icon: '🧠', requerido: false },
    { id: 'chatbot', nombre: 'Asistente Virtual', descripcion: 'Chatbot inteligente de apoyo', icon: '🤖', requerido: false },
    { id: 'alertas', nombre: 'Alertas', descripcion: 'Sistema de notificaciones y recordatorios', icon: '🔔', requerido: false }
  ];


  return `
    <div class="config-section">
      <h2 style="color: var(--color-primario); margin-bottom: var(--espaciado-lg);">
        🧩 Módulos
      </h2>

      <div class="card mb-lg">
        <div class="card-body">
          <p style="color: var(--color-texto-secundario); margin-bottom: var(--espaciado-lg);">
            Activa o desactiva módulos según tus necesidades. Los módulos desactivados no aparecerán en el menú.
          </p>

          <div class="modulos-grid">
            ${modulosDisponibles.map(modulo => {
    const activo = config.modulos_activos.includes(modulo.id);
    return `
                <div class="modulo-card ${activo ? 'active' : ''} ${modulo.requerido ? 'required' : ''}">
                  <div class="modulo-icon">${modulo.icon}</div>
                  <div class="modulo-info">
                    <h4>${modulo.nombre}</h4>
                    <p>${modulo.descripcion}</p>
                  </div>
                  <div class="modulo-toggle">
                    ${modulo.requerido ? `
                      <span class="badge badge-info">Requerido</span>
                    ` : `
                      <label class="switch">
                        <input type="checkbox" 
                               ${activo ? 'checked' : ''}
                               onchange="toggleModulo('${modulo.id}', this.checked)">
                        <span class="slider"></span>
                      </label>
                    `}
                  </div>
                </div>
              `;
  }).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Orden de Módulos</h3>
        </div>
        <div class="card-body">
          <p style="color: var(--color-texto-secundario); margin-bottom: var(--espaciado-md);">
            Arrastra para reordenar los módulos en el menú
          </p>
          <div class="modulos-ordenables" id="modulosOrdenables">
            ${config.modulos_activos.map(id => {
    const modulo = modulosDisponibles.find(m => m.id === id);
    return modulo ? `
                <div class="modulo-ordenable" data-id="${id}">
                  <span class="drag-handle">⋮⋮</span>
                  <span>${modulo.icon} ${modulo.nombre}</span>
                </div>
              ` : '';
  }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== SECCIÓN NOTIFICACIONES ====================

function renderSeccionNotificaciones(config) {
  return `
    <div class="config-section">
      <h2 style="color: var(--color-primario); margin-bottom: var(--espaciado-lg);">
        🔔 Notificaciones
      </h2>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Configuración General</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="switch-label">
              <input type="checkbox" 
                     ${config.notificaciones.habilitadas ? 'checked' : ''}
                     onchange="toggleNotificaciones(this.checked)">
              <span>Habilitar notificaciones</span>
            </label>
          </div>

          <div class="form-group">
            <label class="switch-label">
              <input type="checkbox" 
                     ${config.notificaciones.sonido ? 'checked' : ''}
                     onchange="toggleSonidoNotificaciones(this.checked)">
              <span>Sonido de notificaciones</span>
            </label>
          </div>

          <div class="form-group">
            <label class="switch-label">
              <input type="checkbox" 
                     ${config.notificaciones.desktop ? 'checked' : ''}
                     onchange="toggleNotificacionesDesktop(this.checked)">
              <span>Notificaciones de escritorio</span>
            </label>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Tipos de Alertas</h3>
        </div>
        <div class="card-body">
          <div class="alertas-config">
            <div class="alerta-item">
              <div>
                <h4>Vencimiento de Documentos</h4>
                <p>Alertas cuando un documento está por vencer</p>
              </div>
              <select class="form-control" style="width: 200px;">
                <option value="0">Desactivado</option>
                <option value="7">7 días antes</option>
                <option value="15" selected>15 días antes</option>
                <option value="30">30 días antes</option>
                <option value="45">45 días antes</option>
              </select>
            </div>

            <div class="alerta-item">
              <div>
                <h4>Tareas Pendientes</h4>
                <p>Recordatorios de tareas sin completar</p>
              </div>
              <select class="form-control" style="width: 200px;">
                <option value="0">Desactivado</option>
                <option value="diario" selected>Diario</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>

            <div class="alerta-item">
              <div>
                <h4>Auditorías Programadas</h4>
                <p>Notificaciones de auditorías próximas</p>
              </div>
              <select class="form-control" style="width: 200px;">
                <option value="0">Desactivado</option>
                <option value="1">1 día antes</option>
                <option value="3" selected>3 días antes</option>
                <option value="7">7 días antes</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== SECCIÓN GENERAL ====================

function renderSeccionGeneral(config) {
  return `
    <div class="config-section">
      <h2 style="color: var(--color-primario); margin-bottom: var(--espaciado-lg);">
        ⚙️ Configuración General
      </h2>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Regional</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Idioma</label>
            <select class="form-control" onchange="cambiarIdioma(this.value)">
              <option value="es" ${config.idioma === 'es' ? 'selected' : ''}>Español</option>
              <option value="en" ${config.idioma === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>

          <div class="form-group">
            <label>Formato de Fecha</label>
            <select class="form-control" onchange="cambiarFormatoFecha(this.value)">
              <option value="DD/MM/YYYY" ${config.formato_fecha === 'DD/MM/YYYY' ? 'selected' : ''}>
                DD/MM/YYYY
              </option>
              <option value="MM/DD/YYYY" ${config.formato_fecha === 'MM/DD/YYYY' ? 'selected' : ''}>
                MM/DD/YYYY
              </option>
              <option value="YYYY-MM-DD" ${config.formato_fecha === 'YYYY-MM-DD' ? 'selected' : ''}>
                YYYY-MM-DD
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Zona Horaria</label>
            <select class="form-control" onchange="cambiarZonaHoraria(this.value)">
              <option value="America/Mexico_City" ${config.zona_horaria === 'America/Mexico_City' ? 'selected' : ''}>
                Ciudad de México (GMT-6)
              </option>
              <option value="America/Cancun">Cancún (GMT-5)</option>
              <option value="America/Tijuana">Tijuana (GMT-8)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Empresa</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Nombre de la Empresa</label>
            <input type="text" class="form-control" placeholder="Mi Gestoría de Protección Civil">
          </div>

          <div class="form-group">
            <label>RFC</label>
            <input type="text" class="form-control" placeholder="ABC123456XYZ">
          </div>

          <div class="form-group">
            <label>Correo Electrónico</label>
            <input type="email" class="form-control" placeholder="contacto@migestoria.com">
          </div>

          <div class="form-group">
            <label>Teléfono</label>
            <input type="tel" class="form-control" placeholder="55 1234 5678">
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== SECCIÓN ACCESIBILIDAD ====================

function renderSeccionAccesibilidad(config) {
  return `
    <div class="config-section">
      <h2 style="color: var(--color-primario); margin-bottom: var(--espaciado-lg);">
        ♿ Accesibilidad
      </h2>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Visual</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Tamaño de Fuente</label>
            <select class="form-control" onchange="cambiarTamanoFuente(this.value)">
              <option value="pequena">Pequeña</option>
              <option value="normal" ${config.accesibilidad.tamano_fuente === 'normal' ? 'selected' : ''}>
                Normal
              </option>
              <option value="grande">Grande</option>
              <option value="muy-grande">Muy Grande</option>
            </select>
          </div>

          <div class="form-group">
            <label class="switch-label">
              <input type="checkbox" 
                     ${config.accesibilidad.alto_contraste ? 'checked' : ''}
                     onchange="toggleAltoContraste(this.checked)">
              <span>Alto Contraste</span>
            </label>
          </div>

          <div class="form-group">
            <label class="switch-label">
              <input type="checkbox" 
                     ${config.accesibilidad.animaciones ? 'checked' : ''}
                     onchange="toggleAnimaciones(this.checked)">
              <span>Habilitar Animaciones</span>
            </label>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Navegación</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="switch-label">
              <input type="checkbox" checked>
              <span>Atajos de Teclado</span>
            </label>
            <p style="color: var(--color-texto-secundario); font-size: 12px; margin-top: 8px;">
              Ctrl+K: Búsqueda rápida<br>
              Ctrl+N: Nuevo proyecto<br>
              Ctrl+T: Nueva tarea<br>
              Ctrl+,: Configuración
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== SECCIÓN DATOS ====================

function renderSeccionDatos(config) {
  return `
    <div class="config-section">
      <h2 style="color: var(--color-primario); margin-bottom: var(--espaciado-lg);">
        💾 Gestión de Datos
      </h2>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Respaldo</h3>
        </div>
        <div class="card-body">
          <p style="color: var(--color-texto-secundario); margin-bottom: var(--espaciado-lg);">
            Crea copias de seguridad de todos tus datos
          </p>

          <div class="flex gap-md">
            <button class="btn btn-primary" onclick="exportarDatosCompletos()">
              💾 Exportar Todos los Datos
            </button>
            <button class="btn btn-secondary" onclick="importarDatos()">
              📥 Importar Datos
            </button>
          </div>

          <div style="margin-top: var(--espaciado-lg); padding: var(--espaciado-md); background: var(--color-acento); border-radius: var(--borde-radio-small);">
            <p style="color: var(--color-texto-secundario); font-size: 13px; margin: 0;">
              <strong>Última copia de seguridad:</strong> Nunca<br>
              <strong>Ubicación:</strong> No configurada
            </p>
          </div>
        </div>
      </div>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Estadísticas</h3>
        </div>
        <div class="card-body">
          <div class="stats-simple">
            <div class="stat-simple-item">
              <span class="stat-simple-label">Proyectos</span>
              <span class="stat-simple-value">12</span>
            </div>
            <div class="stat-simple-item">
              <span class="stat-simple-label">Tareas</span>
              <span class="stat-simple-value">48</span>
            </div>
            <div class="stat-simple-item">
              <span class="stat-simple-label">Documentos</span>
              <span class="stat-simple-value">156</span>
            </div>
            <div class="stat-simple-item">
              <span class="stat-simple-label">Auditorías</span>
              <span class="stat-simple-value">8</span>
            </div>
          </div>

          <div style="margin-top: var(--espaciado-lg);">
            <p style="color: var(--color-texto-secundario); font-size: 13px;">
              <strong>Espacio utilizado:</strong> 45.2 MB
            </p>
          </div>
        </div>
      </div>

      <div class="card" style="border: 2px solid var(--color-peligro);">
        <div class="card-header">
          <h3 class="card-title" style="color: var(--color-peligro);">Zona de Peligro</h3>
        </div>
        <div class="card-body">
          <p style="color: var(--color-texto-secundario); margin-bottom: var(--espaciado-lg);">
            Estas acciones son irreversibles. Procede con precaución.
          </p>

          <div class="flex gap-md">
            <button class="btn btn-secondary" onclick="mostrarPanelRendimiento()">
              ⚡ Rendimiento del Sistema
            </button>
            <button class="btn btn-warning" onclick="limpiarCache()">
              🗑️ Limpiar Caché UI
            </button>
            <button class="btn btn-danger" onclick="resetearConfiguracion()">
              ⚠️ Resetear Configuración
            </button>
            <button class="btn btn-danger" onclick="eliminarTodosDatos()">
              💣 Eliminar Todos los Datos
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== FUNCIONES DE CONFIGURACIÓN ====================

function cambiarTema(nombreTema) {
  configManager.cambiarTema(nombreTema);
  mostrarConfiguracion(); // Recargar vista
}

function toggleSidebarExpandido(expandido) {
  configManager.actualizarConfiguracion('sidebar', { expandido });
}

function cambiarPosicionSidebar(posicion) {
  configManager.actualizarConfiguracion('sidebar', { posicion });
  alert('La posición del sidebar se aplicará al reiniciar la aplicación');
}

function cambiarLayoutDashboard(layout) {
  configManager.actualizarConfiguracion('dashboard', { layout });
}

function toggleWidget(widget, activo) {
  const config = configManager.obtenerConfiguracion('dashboard');
  if (activo) {
    config.widgets.push(widget);
  } else {
    config.widgets = config.widgets.filter(w => w !== widget);
  }
  configManager.actualizarConfiguracion('dashboard', config);
}

function toggleModulo(modulo, activo) {
  configManager.toggleModulo(modulo);
  cargarSeccionConfig('modulos');
}

function toggleNotificaciones(habilitadas) {
  configManager.actualizarConfiguracion('notificaciones', { habilitadas });
}

function toggleSonidoNotificaciones(sonido) {
  configManager.actualizarConfiguracion('notificaciones', { sonido });
}

function toggleNotificacionesDesktop(desktop) {
  configManager.actualizarConfiguracion('notificaciones', { desktop });
  if (desktop && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function cambiarIdioma(idioma) {
  configManager.actualizarConfiguracion('general', { idioma });
  alert('El idioma se aplicará al reiniciar la aplicación');
}

function cambiarFormatoFecha(formato) {
  configManager.actualizarConfiguracion('general', { formato_fecha: formato });
}

function cambiarZonaHoraria(zona) {
  configManager.actualizarConfiguracion('general', { zona_horaria: zona });
}

function cambiarTamanoFuente(tamano) {
  configManager.actualizarConfiguracion('accesibilidad', { tamano_fuente: tamano });
  document.documentElement.style.fontSize = {
    'pequena': '14px',
    'normal': '16px',
    'grande': '18px',
    'muy-grande': '20px'
  }[tamano];
}

function toggleAltoContraste(activo) {
  configManager.actualizarConfiguracion('accesibilidad', { alto_contraste: activo });
  document.body.classList.toggle('alto-contraste', activo);
}

function toggleAnimaciones(activo) {
  configManager.actualizarConfiguracion('accesibilidad', { animaciones: activo });
  document.body.classList.toggle('sin-animaciones', !activo);
}

async function exportarDatosCompletos() {
  const datos = {
    proyectos: estadoActual.proyectos,
    tareas: estadoActual.tareas,
    configuracion: configManager.obtenerConfiguracion(),
    fecha_exportacion: new Date().toISOString()
  };

  const resultado = await window.electronAPI.exportarReporte(
    datos,
    `backup-gestor-virtual-${new Date().toISOString().split('T')[0]}.json`
  );

  if (resultado.success) {
    alert('✅ Datos exportados exitosamente');
  }
}

function importarDatos() {
  alert('Función de importación en desarrollo');
}

function limpiarCache() {
  if (confirm('¿Estás seguro de limpiar el caché? Esto puede mejorar el rendimiento.')) {
    localStorage.removeItem('gestor_virtual_cache');
    alert('✅ Caché limpiado');
  }
}

function resetearConfiguracion() {
  if (confirm('¿Estás seguro de resetear toda la configuración a valores por defecto?')) {
    configManager.resetearConfiguracion();
    alert('✅ Configuración reseteada');
    mostrarConfiguracion();
  }
}

function eliminarTodosDatos() {
  const confirmacion = prompt('Esta acción eliminará TODOS los datos. Escribe "ELIMINAR" para confirmar:');
  if (confirmacion === 'ELIMINAR') {
    localStorage.clear();
    alert('⚠️ Todos los datos han sido eliminados. La aplicación se reiniciará.');
    location.reload();
  }
}

function formatearNombreWidget(widget) {
  const nombres = {
    'estadisticas': 'Estadísticas',
    'alertas': 'Alertas Recientes',
    'marco_juridico': 'Marco Jurídico',
    'tareas_recientes': 'Tareas Recientes',
    'proyectos_activos': 'Proyectos Activos',
    'grafico_tiempo': 'Gráfico de Tiempo',
    'calendario': 'Calendario'
  };
  return nombres[widget] || widget;
}

function cerrarConfiguracion() {
  mostrarDashboard();
}

// ==================== ESTILOS ADICIONALES PARA CONFIGURACIÓN ====================

const configStyles = `
  <style>
    .config-sidebar {
      background: var(--color-secundario);
      border-radius: var(--borde-radio);
      padding: var(--espaciado-md);
    }

    .config-menu-item {
      width: 100%;
      padding: var(--espaciado-md);
      background: transparent;
      border: none;
      color: var(--color-texto);
      text-align: left;
      border-radius: var(--borde-radio-small);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--espaciado-sm);
      margin-bottom: var(--espaciado-xs);
      transition: all var(--transicion-rapida);
    }

    .config-menu-item:hover {
      background: var(--color-acento);
    }

    .config-menu-item.active {
      background: var(--color-primario);
      color: white;
      font-weight: 600;
    }

    .themes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--espaciado-md);
    }

    .theme-card {
      border: 2px solid var(--color-acento);
      border-radius: var(--borde-radio);
      overflow: hidden;
      cursor: pointer;
      transition: all var(--transicion-rapida);
    }

    .theme-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--sombra-lg);
    }

    .theme-card.active {
      border-color: var(--color-primario);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primario) 30%, transparent);
    }

    .theme-preview {
      height: 100px;
      display: flex;
      flex-direction: column;
    }

    .theme-info {
      padding: var(--espaciado-md);
      background: var(--color-acento);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .theme-info h4 {
      margin: 0;
      font-size: 14px;
      color: var(--color-texto);
    }

    .modulos-grid {
      display: grid;
      gap: var(--espaciado-md);
    }

    .modulo-card {
      display: flex;
      align-items: center;
      gap: var(--espaciado-md);
      padding: var(--espaciado-md);
      background: var(--color-acento);
      border: 2px solid transparent;
      border-radius: var(--borde-radio);
      transition: all var(--transicion-rapida);
    }

    .modulo-card.active {
      border-color: var(--color-exito);
    }

    .modulo-card.required {
      opacity: 0.7;
    }

    .modulo-icon {
      font-size: 32px;
      min-width: 50px;
      text-align: center;
    }

    .modulo-info {
      flex: 1;
    }

    .modulo-info h4 {
      margin: 0 0 4px 0;
      color: var(--color-texto);
      font-size: 16px;
    }

    .modulo-info p {
      margin: 0;
      color: var(--color-texto-secundario);
      font-size: 13px;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--color-acento);
      transition: .3s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--color-exito);
    }

    input:checked + .slider:before {
      transform: translateX(26px);
    }

    .switch-label {
      display: flex;
      align-items: center;
      gap: var(--espaciado-md);
      cursor: pointer;
    }

    .widgets-selector {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--espaciado-sm);
    }

    .widget-option {
      display: flex;
      align-items: center;
      gap: var(--espaciado-sm);
      padding: var(--espaciado-sm);
      background: var(--color-acento);
      border-radius: var(--borde-radio-small);
      cursor: pointer;
    }

    .alertas-config {
      display: flex;
      flex-direction: column;
      gap: var(--espaciado-md);
    }

    .alerta-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--espaciado-md);
      background: var(--color-acento);
      border-radius: var(--borde-radio-small);
    }

    .alerta-item h4 {
      margin: 0 0 4px 0;
      color: var(--color-texto);
      font-size: 14px;
    }

    .alerta-item p {
      margin: 0;
      color: var(--color-texto-secundario);
      font-size: 12px;
    }

    .stats-simple {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--espaciado-md);
    }

    .stat-simple-item {
      text-align: center;
      padding: var(--espaciado-md);
      background: var(--color-acento);
      border-radius: var(--borde-radio-small);
    }

    .stat-simple-label {
      display: block;
      color: var(--color-texto-secundario);
      font-size: 12px;
      margin-bottom: 4px;
    }

    .stat-simple-value {
      display: block;
      color: var(--color-primario);
      font-size: 24px;
      font-weight: 700;
    }
  </style>
`;

// Inyectar estilos
if (!document.getElementById('config-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'config-styles';
  styleElement.innerHTML = configStyles;
  document.head.appendChild(styleElement);
}
