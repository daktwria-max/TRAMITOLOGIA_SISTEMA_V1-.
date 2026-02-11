// ==================== VISTA DE MARCO JURÍDICO ====================

let marcoJuridicoCache = [];
let alertasCache = [];

function mostrarMarcoJuridico() {
    const html = `
    <div class="header">
      <div>
        <h1>⚖️ Marco Jurídico</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Mantente actualizado con las últimas normativas y regulaciones
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="verHistorialActualizaciones()">
          📜 Historial
        </button>
        <button class="btn btn-secondary" onclick="configurarActualizaciones()">
          ⚙️ Configurar
        </button>
        <button class="btn btn-primary" onclick="buscarActualizacionesManual()">
          🔄 Buscar Actualizaciones
        </button>
      </div>
    </div>

    <!-- Alertas importantes -->
    <div id="alertasNormativas" style="margin-bottom: var(--espaciado-xl);">
      <div class="loading">
        <div class="spinner"></div>
        <p>Cargando alertas...</p>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="stats-grid" style="margin-bottom: var(--espaciado-xl);">
      <div class="stat-card">
        <h3>Total Normativas</h3>
        <div class="value" id="totalNormativas">0</div>
      </div>
      <div class="stat-card">
        <h3>Alertas Pendientes</h3>
        <div class="value" style="color: var(--color-advertencia);" id="alertasPendientes">0</div>
      </div>
      <div class="stat-card">
        <h3>Última Actualización</h3>
        <div class="value" style="font-size: 14px;" id="ultimaActualizacion">-</div>
      </div>
      <div class="stat-card">
        <h3>Búsqueda Automática</h3>
        <div class="value" style="font-size: 14px;" id="estadoBusqueda">Activa</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="marco-juridico-filtros">
      <div class="filtros-row">
        <select class="form-control" id="filtroTipo" onchange="aplicarFiltrosMarcoJuridico()">
          <option value="">Todos los tipos</option>
          <option value="DECRETO">Decretos</option>
          <option value="NORMA_FEDERAL">Normas Federales</option>
          <option value="ACTUALIZACION_INVEA">Actualizaciones INVEA</option>
          <option value="COMUNICADO_SGIRPC">Comunicados SGIRPC</option>
        </select>

        <select class="form-control" id="filtroRelevancia" onchange="aplicarFiltrosMarcoJuridico()">
          <option value="">Todas las relevancia</option>
          <option value="10">Crítica (10)</option>
          <option value="8">Alta (8-9)</option>
          <option value="6">Media (6-7)</option>
          <option value="0">Baja (1-5)</option>
        </select>

        <input type="text" 
               class="form-control" 
               id="filtroBusqueda" 
               placeholder="Buscar por título o descripción..."
               oninput="debounce(aplicarFiltrosMarcoJuridico, 500)()">

        <button class="btn btn-secondary" onclick="limpiarFiltrosMarcoJuridico()">
          Limpiar Filtros
        </button>
      </div>
    </div>

    <!-- Lista de normativas -->
    <div id="listaNormativas">
      <div class="loading">
        <div class="spinner"></div>
        <p>Cargando normativas...</p>
      </div>
    </div>
  `;

    document.getElementById('contentArea').innerHTML = html;
    cargarDatosMarcoJuridico();
}

// ==================== CARGAR DATOS ====================

async function cargarDatosMarcoJuridico() {
    try {
        // Cargar en paralelo
        const [statsRes, alertasRes, normativasRes] = await Promise.all([
            window.electronAPI.obtenerEstadisticasMarcoJuridico(),
            window.electronAPI.obtenerAlertasNormativas(),
            window.electronAPI.obtenerMarcoJuridico({ limite: 100 })
        ]);

        // Actualizar estadísticas
        if (statsRes.success) {
            actualizarEstadisticasMarcoJuridico(statsRes.data);
        }

        // Cargar alertas
        if (alertasRes.success) {
            alertasCache = alertasRes.data;
            renderizarAlertas(alertasRes.data);
        }

        // Cargar normativas
        if (normativasRes.success) {
            marcoJuridicoCache = normativasRes.data;
            renderizarNormativas(normativasRes.data);
        }

    } catch (error) {
        console.error('Error cargando datos:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudieron cargar los datos del marco jurídico'
        );
    }
}

function actualizarEstadisticasMarcoJuridico(stats) {
    document.getElementById('totalNormativas').textContent = stats.total || 0;
    document.getElementById('alertasPendientes').textContent = stats.alertasPendientes || 0;

    if (stats.ultimaActualizacion) {
        const fecha = new Date(stats.ultimaActualizacion);
        document.getElementById('ultimaActualizacion').textContent =
            fecha.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else {
        document.getElementById('ultimaActualizacion').textContent = 'Nunca';
    }
}

// ==================== RENDERIZAR ALERTAS ====================

function renderizarAlertas(alertas) {
    const contenedor = document.getElementById('alertasNormativas');

    if (alertas.length === 0) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = `
    <div class="alertas-normativas-container">
      <div class="alertas-header">
        <h3>🚨 Alertas Normativas</h3>
        <button class="btn btn-sm btn-secondary" onclick="marcarTodasAlertasLeidas()">
          Marcar todas como leídas
        </button>
      </div>
      <div class="alertas-lista">
        ${alertas.map(alerta => renderizarAlerta(alerta)).join('')}
      </div>
    </div>
  `;
}

function renderizarAlerta(alerta) {
    const iconos = {
        'CRITICA': '🔴',
        'IMPORTANTE': '🟡',
        'ACTUALIZACION': '🔵'
    };

    const colores = {
        'CRITICA': 'var(--color-peligro)',
        'IMPORTANTE': 'var(--color-advertencia)',
        'ACTUALIZACION': 'var(--color-info)'
    };

    return `
    <div class="alerta-item" style="border-left-color: ${colores[alerta.tipo_alerta]};">
      <div class="alerta-icon">${iconos[alerta.tipo_alerta] || '📢'}</div>
      <div class="alerta-content">
        <div class="alerta-tipo" style="color: ${colores[alerta.tipo_alerta]};">
          ${alerta.tipo_alerta}
        </div>
        <p class="alerta-mensaje">${alerta.mensaje}</p>
        ${alerta.titulo ? `
          <p class="alerta-titulo">${alerta.titulo}</p>
        ` : ''}
        <span class="alerta-fecha">${formatearFechaRelativa(alerta.creado_en)}</span>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="marcarAlertaLeida('${alerta.id}')">
        ✓
      </button>
    </div>
  `;
}

async function marcarAlertaLeida(alertaId) {
    try {
        await window.electronAPI.marcarAlertaLeida(alertaId);

        // Actualizar cache
        alertasCache = alertasCache.filter(a => a.id !== alertaId);
        renderizarAlertas(alertasCache);

        // Actualizar contador
        const statsRes = await window.electronAPI.obtenerEstadisticasMarcoJuridico();
        if (statsRes.success) {
            actualizarEstadisticasMarcoJuridico(statsRes.data);
        }

    } catch (error) {
        console.error('Error marcando alerta:', error);
    }
}

async function marcarTodasAlertasLeidas() {
    try {
        for (const alerta of alertasCache) {
            await window.electronAPI.marcarAlertaLeida(alerta.id);
        }

        alertasCache = [];
        renderizarAlertas([]);

        sistemaNotificaciones.notificarExito(
            'Alertas Leídas',
            'Todas las alertas han sido marcadas como leídas'
        );

        // Actualizar estadísticas
        const statsRes = await window.electronAPI.obtenerEstadisticasMarcoJuridico();
        if (statsRes.success) {
            actualizarEstadisticasMarcoJuridico(statsRes.data);
        }

    } catch (error) {
        console.error('Error marcando alertas:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudieron marcar todas las alertas'
        );
    }
}

// ==================== RENDERIZAR NORMATIVAS ====================

function renderizarNormativas(normativas) {
    const contenedor = document.getElementById('listaNormativas');

    if (normativas.length === 0) {
        contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚖️</div>
        <h3>No hay normativas</h3>
        <p>Realiza una búsqueda para encontrar actualizaciones</p>
        <button class="btn btn-primary" onclick="buscarActualizacionesManual()">
          🔄 Buscar Actualizaciones
        </button>
      </div>
    `;
        return;
    }

    // Agrupar por fecha
    const porFecha = agruparPorFecha(normativas);

    contenedor.innerHTML = `
    <div class="normativas-timeline">
      ${Object.entries(porFecha).map(([fecha, items]) => `
        <div class="timeline-grupo">
          <div class="timeline-fecha">
            <h3>${formatearFechaGrupo(fecha)}</h3>
            <span class="badge badge-info">${items.length} normativa${items.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="timeline-items">
            ${items.map(item => renderizarNormativaCard(item)).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderizarNormativaCard(normativa) {
    const relevanciaColor = obtenerColorRelevancia(normativa.relevancia);
    const tags = normativa.tags ? normativa.tags.split(',').map(t => t.trim()) : [];

    return `
    <div class="normativa-card">
      <div class="normativa-card-header">
        <div class="normativa-tipo">
          <span class="badge badge-secondary">${formatearTipoNormativa(normativa.tipo)}</span>
          <span class="normativa-relevancia" style="background: ${relevanciaColor};">
            ${normativa.relevancia}/10
          </span>
        </div>
        <button class="btn-icon" onclick="mostrarMenuNormativa(event, '${normativa.id}')">
          ⋮
        </button>
      </div>

      <div class="normativa-card-body" onclick="verDetalleNormativa('${normativa.id}')">
        <h4>${normativa.titulo}</h4>
        
        ${normativa.descripcion ? `
          <p class="normativa-descripcion">${normativa.descripcion.substring(0, 200)}${normativa.descripcion.length > 200 ? '...' : ''}</p>
        ` : ''}

        ${tags.length > 0 ? `
          <div class="normativa-tags">
            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}

        <div class="normativa-meta">
          <span>📅 ${formatearFecha(normativa.fecha_publicacion)}</span>
          ${normativa.fecha_vigencia ? `
            <span>⏰ Vigencia: ${formatearFecha(normativa.fecha_vigencia)}</span>
          ` : ''}
          <span>📍 ${normativa.fuente}</span>
        </div>
      </div>

      <div class="normativa-card-footer">
        <button class="btn btn-sm btn-secondary" onclick="abrirFuenteNormativa('${normativa.url_fuente}')">
          🔗 Ver Fuente
        </button>
        <button class="btn btn-sm btn-primary" onclick="verDetalleNormativa('${normativa.id}')">
          Ver Detalle →
        </button>
      </div>
    </div>
  `;
}

// ==================== DETALLE DE NORMATIVA ====================

function verDetalleNormativa(normativaId) {
    const normativa = marcoJuridicoCache.find(n => n.id === normativaId);
    if (!normativa) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalDetalleNormativa';

    const relevanciaColor = obtenerColorRelevancia(normativa.relevancia);
    const tags = normativa.tags ? normativa.tags.split(',').map(t => t.trim()) : [];

    modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h2>⚖️ ${normativa.titulo}</h2>
        <button class="close-btn" onclick="cerrarModal('modalDetalleNormativa')">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Tipo y relevancia -->
        <div class="normativa-detalle-header">
          <span class="badge badge-secondary">${formatearTipoNormativa(normativa.tipo)}</span>
          <span class="normativa-relevancia-large" style="background: ${relevanciaColor};">
            Relevancia: ${normativa.relevancia}/10
          </span>
        </div>

        <!-- Descripción -->
        ${normativa.descripcion ? `
          <div class="normativa-detalle-seccion">
            <h4>📄 Descripción</h4>
            <p>${normativa.descripcion}</p>
          </div>
        ` : ''}

        <!-- Fechas -->
        <div class="normativa-detalle-seccion">
          <h4>📅 Fechas Importantes</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Fecha de Publicación</span>
              <span class="info-value">${formatearFecha(normativa.fecha_publicacion)}</span>
            </div>
            ${normativa.fecha_vigencia ? `
              <div class="info-item">
                <span class="info-label">Fecha de Vigencia</span>
                <span class="info-value">${formatearFecha(normativa.fecha_vigencia)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Fuente -->
        <div class="normativa-detalle-seccion">
          <h4>📍 Fuente</h4>
          <p>${normativa.fuente}</p>
          <a href="#" onclick="abrirFuenteNormativa('${normativa.url_fuente}'); return false;" class="link-externo">
            🔗 Abrir fuente original
          </a>
        </div>

        <!-- Tags -->
        ${tags.length > 0 ? `
          <div class="normativa-detalle-seccion">
            <h4>🏷️ Etiquetas</h4>
            <div class="normativa-tags">
              ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Acciones -->
        <div class="normativa-detalle-acciones">
          <button class="btn btn-secondary" onclick="compartirNormativa('${normativa.id}')">
            📤 Compartir
          </button>
          <button class="btn btn-secondary" onclick="exportarNormativaPDF('${normativa.id}')">
            📄 Exportar PDF
          </button>
          <button class="btn btn-primary" onclick="abrirFuenteNormativa('${normativa.url_fuente}')">
            🔗 Ver Fuente Original
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

// ==================== BÚSQUEDA MANUAL ====================

async function buscarActualizacionesManual() {
    const btnBuscar = event.target;
    btnBuscar.disabled = true;
    btnBuscar.innerHTML = '⏳ Buscando...';

    try {
        sistemaNotificaciones.notificarInfo(
            'Búsqueda Iniciada',
            'Consultando fuentes oficiales. Esto puede tardar unos minutos...'
        );

        const resultado = await window.electronAPI.buscarActualizacionesMarcoJuridico();

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Búsqueda Completada',
                `Se encontraron ${resultado.items_nuevos} nuevas normativas de ${resultado.items_encontrados} consultadas`
            );

            // Recargar datos
            await cargarDatosMarcoJuridico();

            // Mostrar resumen
            mostrarResumenBusqueda(resultado);
        } else {
            throw new Error(resultado.error || 'Error en la búsqueda');
        }

    } catch (error) {
        console.error('Error en búsqueda:', error);
        sistemaNotificaciones.notificarError(
            'Error en Búsqueda',
            error.message
        );
    } finally {
        btnBuscar.disabled = false;
        btnBuscar.innerHTML = '🔄 Buscar Actualizaciones';
    }
}

function mostrarResumenBusqueda(resultado) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalResumenBusqueda';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📊 Resumen de Búsqueda</h2>
        <button class="close-btn" onclick="cerrarModal('modalResumenBusqueda')">×</button>
      </div>
      
      <div class="modal-body">
        <div class="resumen-stats">
          <div class="resumen-stat-item">
            <div class="resumen-stat-value">${resultado.fuentes_consultadas}</div>
            <div class="resumen-stat-label">Fuentes Consultadas</div>
          </div>
          <div class="resumen-stat-item">
            <div class="resumen-stat-value">${resultado.items_encontrados}</div>
            <div class="resumen-stat-label">Items Encontrados</div>
          </div>
          <div class="resumen-stat-item">
            <div class="resumen-stat-value" style="color: var(--color-exito);">${resultado.items_nuevos}</div>
            <div class="resumen-stat-label">Nuevas Normativas</div>
          </div>
          <div class="resumen-stat-item">
            <div class="resumen-stat-value" style="color: ${resultado.errores.length > 0 ? 'var(--color-peligro)' : 'var(--color-exito)'};">
              ${resultado.errores.length}
            </div>
            <div class="resumen-stat-label">Errores</div>
          </div>
        </div>

        ${resultado.errores.length > 0 ? `
          <div class="alert alert-warning" style="margin-top: 20px;">
            <strong>⚠️ Advertencia:</strong> Algunas fuentes no pudieron ser consultadas.
            <details style="margin-top: 10px;">
              <summary>Ver errores</summary>
              <ul style="margin: 10px 0 0 20px;">
                ${resultado.errores.map(e => `<li>${e.fuente}: ${e.error}</li>`).join('')}
              </ul>
            </details>
          </div>
        ` : ''}

        <p style="margin-top: 20px; color: var(--color-texto-secundario);">
          Búsqueda realizada: ${new Date(resultado.fecha).toLocaleString('es-MX')}
        </p>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

// ==================== FILTROS ====================

function aplicarFiltrosMarcoJuridico() {
    const tipo = document.getElementById('filtroTipo')?.value;
    const relevancia = document.getElementById('filtroRelevancia')?.value;
    const busqueda = document.getElementById('filtroBusqueda')?.value.toLowerCase();

    let normativasFiltradas = [...marcoJuridicoCache];

    // Filtrar por tipo
    if (tipo) {
        normativasFiltradas = normativasFiltradas.filter(n => n.tipo === tipo);
    }

    // Filtrar por relevancia
    if (relevancia) {
        const rel = parseInt(relevancia);
        if (rel === 10) {
            normativasFiltradas = normativasFiltradas.filter(n => n.relevancia >= 10);
        } else if (rel === 8) {
            normativasFiltradas = normativasFiltradas.filter(n => n.relevancia >= 8 && n.relevancia < 10);
        } else if (rel === 6) {
            normativasFiltradas = normativasFiltradas.filter(n => n.relevancia >= 6 && n.relevancia < 8);
        } else {
            normativasFiltradas = normativasFiltradas.filter(n => n.relevancia < 6);
        }
    }

    // Filtrar por búsqueda
    if (busqueda) {
        normativasFiltradas = normativasFiltradas.filter(n =>
            n.titulo.toLowerCase().includes(busqueda) ||
            (n.descripcion && n.descripcion.toLowerCase().includes(busqueda)) ||
            (n.tags && n.tags.toLowerCase().includes(busqueda))
        );
    }

    renderizarNormativas(normativasFiltradas);
}

function limpiarFiltrosMarcoJuridico() {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroRelevancia').value = '';
    document.getElementById('filtroBusqueda').value = '';
    renderizarNormativas(marcoJuridicoCache);
}

// ==================== CONFIGURACIÓN ====================

function configurarActualizaciones() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalConfiguracion';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚙️ Configuración de Actualizaciones</h2>
        <button class="close-btn" onclick="cerrarModal('modalConfiguracion')">×</button>
      </div>
      
      <form onsubmit="guardarConfiguracionActualizaciones(event)">
        <div class="form-group">
          <label>
            <input type="checkbox" id="busquedaAutomatica" checked>
            Activar búsqueda automática diaria
          </label>
        </div>

        <div class="form-group">
          <label>Hora de búsqueda automática</label>
          <input type="time" class="form-control" name="hora" value="08:00">
          <small style="color: var(--color-texto-secundario);">
            La aplicación buscará actualizaciones automáticamente a esta hora
          </small>
        </div>

        <div class="form-group">
          <label>Fuentes a consultar</label>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label>
              <input type="checkbox" name="fuente" value="gaceta_cdmx" checked>
              Gaceta Oficial CDMX
            </label>
            <label>
              <input type="checkbox" name="fuente" value="dof" checked>
              Diario Oficial de la Federación
            </label>
            <label>
              <input type="checkbox" name="fuente" value="invea" checked>
              INVEA CDMX
            </label>
            <label>
              <input type="checkbox" name="fuente" value="proteccion_civil" checked>
              Secretaría de Gestión Integral de Riesgos
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="notificacionesEscritorio" checked>
            Mostrar notificaciones de escritorio para nuevas normativas
          </label>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalConfiguracion')">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  `;

    document.body.appendChild(modal);
}

async function guardarConfiguracionActualizaciones(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const busquedaActiva = document.getElementById('busquedaAutomatica').checked;
    const hora = formData.get('hora');

    try {
        if (busquedaActiva) {
            await window.electronAPI.programarBusquedaAutomatica(hora);
            sistemaNotificaciones.notificarExito(
                'Configuración Guardada',
                `Búsqueda automática programada para las ${hora}`
            );
        } else {
            await window.electronAPI.detenerBusquedaAutomatica();
            sistemaNotificaciones.notificarInfo(
                'Búsqueda Desactivada',
                'La búsqueda automática ha sido desactivada'
            );
        }

        // Guardar en configuración local
        configManager.actualizarConfiguracion('marco_juridico', {
            busqueda_automatica: busquedaActiva,
            hora_busqueda: hora,
            notificaciones_escritorio: document.getElementById('notificacionesEscritorio').checked
        });

        cerrarModal('modalConfiguracion');

    } catch (error) {
        console.error('Error guardando configuración:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo guardar la configuración'
        );
    }
}

// ==================== HISTORIAL ====================

async function verHistorialActualizaciones() {
    try {
        const resultado = await window.electronAPI.obtenerHistorialActualizaciones(20);

        if (!resultado.success) {
            throw new Error('Error obteniendo historial');
        }

        const historial = resultado.data;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'modalHistorial';

        modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2>📜 Historial de Actualizaciones</h2>
          <button class="close-btn" onclick="cerrarModal('modalHistorial')">×</button>
        </div>
        
        <div class="modal-body">
          ${historial.length > 0 ? `
            <div class="historial-lista">
              ${historial.map(item => renderizarHistorialItem(item)).join('')}
            </div>
          ` : `
            <div class="empty-state-small">
              <p>No hay historial de búsquedas</p>
            </div>
          `}
        </div>
      </div>
    `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error mostrando historial:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo cargar el historial'
        );
    }
}

function renderizarHistorialItem(item) {
    const detalles = item.detalles ? JSON.parse(item.detalles) : {};
    const estadoColor = item.estado === 'EXITOSO' ? 'var(--color-exito)' : 'var(--color-advertencia)';

    return `
    <div class="historial-item">
      <div class="historial-item-header">
        <div>
          <strong>${formatearFechaCompleta(item.fecha_busqueda)}</strong>
          <span class="badge" style="background: ${estadoColor}; margin-left: 10px;">
            ${item.estado}
          </span>
        </div>
      </div>
      <div class="historial-item-body">
        <div class="historial-stats-mini">
          <span>📊 ${item.items_encontrados} encontrados</span>
          <span>✨ ${item.items_nuevos} nuevos</span>
          ${detalles.errores && detalles.errores.length > 0 ? `
            <span style="color: var(--color-peligro);">⚠️ ${detalles.errores.length} errores</span>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==================== ACCIONES ====================

function abrirFuenteNormativa(url) {
    if (url) {
        window.electronAPI.abrirEnlaceExterno(url);
    }
}

function compartirNormativa(normativaId) {
    const normativa = marcoJuridicoCache.find(n => n.id === normativaId);
    if (!normativa) return;

    const texto = `${normativa.titulo}\n\n${normativa.descripcion || ''}\n\nFuente: ${normativa.url_fuente}`;

    navigator.clipboard.writeText(texto).then(() => {
        sistemaNotificaciones.notificarExito(
            'Copiado',
            'La información ha sido copiada al portapapeles'
        );
    });
}

function exportarNormativaPDF(normativaId) {
    sistemaNotificaciones.notificarInfo(
        'Función en Desarrollo',
        'La exportación a PDF estará disponible próximamente'
    );
}

function mostrarMenuNormativa(event, normativaId) {
    event.stopPropagation();

    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const normativa = marcoJuridicoCache.find(n => n.id === normativaId);
    if (!normativa) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    menu.innerHTML = `
    <button onclick="verDetalleNormativa('${normativaId}')">
      👁️ Ver Detalle
    </button>
    <button onclick="abrirFuenteNormativa('${normativa.url_fuente}')">
      🔗 Abrir Fuente
    </button>
    <button onclick="compartirNormativa('${normativaId}')">
      📤 Compartir
    </button>
    <button onclick="exportarNormativaPDF('${normativaId}')">
      📄 Exportar PDF
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

function agruparPorFecha(normativas) {
    const grupos = {};

    normativas.forEach(normativa => {
        const fecha = normativa.fecha_publicacion;
        if (!grupos[fecha]) {
            grupos[fecha] = [];
        }
        grupos[fecha].push(normativa);
    });

    return grupos;
}

function formatearFechaGrupo(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (d.toDateString() === hoy.toDateString()) {
        return 'Hoy';
    } else if (d.toDateString() === ayer.toDateString()) {
        return 'Ayer';
    } else {
        return d.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatearFechaCompleta(fecha) {
    const d = new Date(fecha);
    return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatearFechaRelativa(fecha) {
    const d = new Date(fecha);
    const ahora = new Date();
    const diff = ahora - d;

    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 60) {
        return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    } else if (horas < 24) {
        return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    } else if (dias < 7) {
        return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    } else {
        return formatearFecha(fecha);
    }
}

function formatearTipoNormativa(tipo) {
    const tipos = {
        'DECRETO': 'Decreto',
        'NORMA_FEDERAL': 'Norma Federal',
        'ACTUALIZACION_INVEA': 'Actualización INVEA',
        'COMUNICADO_SGIRPC': 'Comunicado SGIRPC'
    };
    return tipos[tipo] || tipo;
}

function obtenerColorRelevancia(relevancia) {
    if (relevancia >= 9) return '#e74c3c'; // Rojo
    if (relevancia >= 7) return '#e67e22'; // Naranja
    if (relevancia >= 5) return '#f39c12'; // Amarillo
    return '#3498db'; // Azul
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}
