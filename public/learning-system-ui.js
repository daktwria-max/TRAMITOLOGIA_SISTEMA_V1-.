// ==================== SISTEMA DE APRENDIZAJE MEJORADO ====================

let estadisticasAprendizaje = null;
let sugerenciasPendientes = [];
let estadisticasExtraccion = null;

function mostrarSistemaAprendizaje() {
  const html = `
    <div class="header">
      <div>
        <h1>🧠 Sistema de Aprendizaje</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Aprende de tus archivos y conversaciones para mejorar continuamente
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="verEstadisticasExtraccion()">
          📊 Estadísticas de Extracción
        </button>
        <button class="btn btn-secondary" onclick="verConocimientoBase()">
          📚 Base de Conocimiento
        </button>
        <button class="btn btn-primary" onclick="mostrarOpcionesAprendizaje()">
          ➕ Entrenar Sistema
        </button>
      </div>
    </div>

    <!-- Estadísticas de Aprendizaje -->
    <div id="estadisticasAprendizaje">
      <div class="loading">
        <div class="spinner"></div>
        <p>Cargando estadísticas...</p>
      </div>
    </div>

    <!-- Tabs de contenido -->
    <div class="tabs-container">
      <div class="tabs-header">
        <button class="tab-btn active" onclick="cambiarTabAprendizaje('sugerencias')">
          💡 Sugerencias
        </button>
        <button class="tab-btn" onclick="cambiarTabAprendizaje('patrones')">
          🔍 Patrones
        </button>
        <button class="tab-btn" onclick="cambiarTabAprendizaje('conversaciones')">
          💬 Conversaciones
        </button>
        <button class="tab-btn" onclick="cambiarTabAprendizaje('documentos')">
          📄 Documentos
        </button>
        <button class="tab-btn" onclick="cambiarTabAprendizaje('datos')">
          🗂️ Datos Extraídos
        </button>
        <button class="tab-btn" onclick="cambiarTabAprendizaje('asistente')">
          🤖 Asistente Virtual
        </button>
      </div>


      <div class="tabs-content">
        <div id="tabSugerencias" class="tab-content active">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>

        <div id="tabPatrones" class="tab-content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>

        <div id="tabConversaciones" class="tab-content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>

        <div id="tabDocumentos" class="tab-content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>

        <div id="tabDatos" class="tab-content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>

        <div id="tabAsistente" class="tab-content">
          <div class="chatbot-container">
            <div class="chatbot-messages" id="chatbotMessages">
              <div class="message assistant">
                <div class="message-content">
                  ¡Hola! Soy tu asistente inteligente de Protección Civil. 
                  He aprendido de tus documentos y puedo resolver tus dudas sobre trámites, 
                  requisitos, costos y normatividad. ¿En qué puedo ayudarte?
                </div>
              </div>
            </div>
            <div class="chatbot-input-area">
              <div class="chatbot-suggestions" id="chatbotSuggestions">
                <!-- Sugerencias dinámicas -->
              </div>
              <div class="input-group">
                <input type="text" id="chatbotInput" placeholder="Escribe tu duda aquí..." onkeypress="if(event.key === 'Enter') enviarMensajeChatbot()">
                <button class="btn btn-primary" onclick="enviarMensajeChatbot()">
                  <span>Enviar</span>
                  <i>✈️</i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
  cargarDatosAprendizaje();
}

// ==================== CARGAR DATOS ====================

async function cargarDatosAprendizaje() {
  try {
    const statsRes = await window.electronAPI.obtenerEstadisticasAprendizaje();
    if (statsRes.success) {
      estadisticasAprendizaje = statsRes.data;
      renderizarEstadisticas(statsRes.data);
    }

    await cargarSugerencias();

  } catch (error) {
    console.error('Error cargando datos de aprendizaje:', error);
  }
}

function renderizarEstadisticas(stats) {
  const contenedor = document.getElementById('estadisticasAprendizaje');

  const calidadColor = stats.calidad_extraccion_promedio >= 0.8 ? 'var(--color-exito)' :
    stats.calidad_extraccion_promedio >= 0.6 ? 'var(--color-advertencia)' :
      'var(--color-peligro)';

  contenedor.innerHTML = `
    <div class="learning-stats">
      <div class="learning-stat-card">
        <div class="learning-stat-icon">📚</div>
        <div class="learning-stat-info">
          <span class="learning-stat-value">${stats.total_conocimientos || 0}</span>
          <span class="learning-stat-label">Conocimientos</span>
        </div>
      </div>

      <div class="learning-stat-card">
        <div class="learning-stat-icon">🔍</div>
        <div class="learning-stat-info">
          <span class="learning-stat-value">${stats.total_patrones || 0}</span>
          <span class="learning-stat-label">Patrones</span>
        </div>
      </div>

      <div class="learning-stat-card">
        <div class="learning-stat-icon">💬</div>
        <div class="learning-stat-info">
          <span class="learning-stat-value">${stats.total_conversaciones || 0}</span>
          <span class="learning-stat-label">Conversaciones</span>
        </div>
      </div>

      <div class="learning-stat-card">
        <div class="learning-stat-icon">📄</div>
        <div class="learning-stat-info">
          <span class="learning-stat-value">${stats.total_documentos || 0}</span>
          <span class="learning-stat-label">Documentos</span>
        </div>
      </div>

      <div class="learning-stat-card highlight">
        <div class="learning-stat-icon">💡</div>
        <div class="learning-stat-info">
          <span class="learning-stat-value">${stats.sugerencias_pendientes || 0}</span>
          <span class="learning-stat-label">Sugerencias Pendientes</span>
        </div>
      </div>

      <div class="learning-stat-card" style="border-left-color: ${calidadColor};">
        <div class="learning-stat-icon">✨</div>
        <div class="learning-stat-info">
          <span class="learning-stat-value" style="color: ${calidadColor};">
            ${Math.round((stats.calidad_extraccion_promedio || 0) * 100)}%
          </span>
          <span class="learning-stat-label">Calidad Extracción</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== TABS ====================

function cambiarTabAprendizaje(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  switch (tab) {
    case 'sugerencias':
      document.getElementById('tabSugerencias').classList.add('active');
      cargarSugerencias();
      break;
    case 'patrones':
      document.getElementById('tabPatrones').classList.add('active');
      cargarPatrones();
      break;
    case 'conversaciones':
      document.getElementById('tabConversaciones').classList.add('active');
      cargarConversaciones();
      break;
    case 'documentos':
      document.getElementById('tabDocumentos').classList.add('active');
      cargarDocumentos();
      break;
    case 'datos':
      document.getElementById('tabDatos').classList.add('active');
      cargarDatosExtraidos();
      break;
    case 'asistente':
      document.getElementById('tabAsistente').classList.add('active');
      inicializarChatbotUI();
      break;
  }

}

// ==================== DATOS EXTRAÍDOS (NUEVO) ====================

async function cargarDatosExtraidos() {
  const contenedor = document.getElementById('tabDatos');

  try {
    const resultado = await window.electronAPI.obtenerEstadisticasExtraccion();

    if (resultado.success) {
      estadisticasExtraccion = resultado.data;
      renderizarDatosExtraidos(resultado.data, contenedor);
    }

  } catch (error) {
    console.error('Error cargando datos extraídos:', error);
    contenedor.innerHTML = `
      <div class="empty-state">
        <p>Error cargando datos extraídos</p>
      </div>
    `;
  }
}

function renderizarDatosExtraidos(stats, contenedor) {
  if (!stats.datos_extraidos_por_tipo || stats.datos_extraidos_por_tipo.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🗂️</div>
        <h3>No hay datos extraídos</h3>
        <p>Analiza documentos para extraer datos estructurados automáticamente</p>
      </div>
    `;
    return;
  }

  const iconosPorTipo = {
    'folios': '📋',
    'fechas': '📅',
    'vigencias': '⏰',
    'rfcs': '🆔',
    'direcciones': '📍',
    'telefonos': '📞',
    'emails': '📧',
    'normas': '📜',
    'articulos': '📖',
    'responsables': '👤',
    'empresas': '🏢'
  };

  contenedor.innerHTML = `
    <div class="datos-extraidos-header">
      <div class="datos-stats-summary">
        <div class="stat-item">
          <strong>${stats.total_documentos || 0}</strong>
          <span>Documentos Analizados</span>
        </div>
        <div class="stat-item">
          <strong>${Math.round((stats.calidad_promedio || 0) * 100)}%</strong>
          <span>Calidad Promedio</span>
        </div>
        <div class="stat-item">
          <strong>${stats.datos_extraidos_por_tipo.reduce((sum, d) => sum + d.cantidad, 0)}</strong>
          <span>Datos Extraídos</span>
        </div>
      </div>

      <div class="datos-acciones">
        <button class="btn btn-secondary" onclick="exportarDatosExtraidos('json')">
          📥 Exportar JSON
        </button>
        <button class="btn btn-secondary" onclick="exportarDatosExtraidos('csv')">
          📊 Exportar Excel
        </button>
        <button class="btn btn-primary" onclick="buscarEnDatosExtraidos()">
          🔍 Buscar Datos
        </button>
      </div>
    </div>

    <div class="datos-por-tipo-grid">
      ${stats.datos_extraidos_por_tipo.map(tipo => `
        <div class="dato-tipo-card" onclick="verDetallesTipoDato('${tipo.tipo_dato}')">
          <div class="dato-tipo-icon">${iconosPorTipo[tipo.tipo_dato] || '📄'}</div>
          <div class="dato-tipo-info">
            <strong>${tipo.tipo_dato.replace(/_/g, ' ').toUpperCase()}</strong>
            <span class="dato-tipo-cantidad">${tipo.cantidad} registros</span>
          </div>
          <div class="dato-tipo-arrow">→</div>
        </div>
      `).join('')}
    </div>

    <div class="documentos-por-tipo-section">
      <h3>📊 Documentos por Tipo</h3>
      <div class="documentos-tipo-lista">
        ${stats.documentos_por_tipo.map(tipo => `
          <div class="documento-tipo-item">
            <div class="documento-tipo-nombre">
              ${tipo.tipo_documento.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div class="documento-tipo-barra">
              <div class="documento-tipo-progreso" 
                   style="width: ${(tipo.cantidad / stats.total_documentos) * 100}%;">
              </div>
            </div>
            <div class="documento-tipo-cantidad">
              ${tipo.cantidad}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function verDetallesTipoDato(tipoDato) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalDetallesDato';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px;">
      <div class="modal-header">
        <h2>🗂️ ${tipoDato.replace(/_/g, ' ').toUpperCase()}</h2>
        <button class="close-btn" onclick="cerrarModal('modalDetallesDato')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <input type="text" 
                 class="form-control" 
                 id="buscarEnTipoDato" 
                 placeholder="Buscar en ${tipoDato}..."
                 oninput="debounce(() => buscarPorTipoDato('${tipoDato}'), 500)()">
        </div>

        <div id="resultadosTipoDato">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando datos...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Cargar datos iniciales
  await buscarPorTipoDato(tipoDato);
}

async function buscarPorTipoDato(tipoDato, valor = '') {
  const contenedor = document.getElementById('resultadosTipoDato');
  if (!contenedor) return;

  try {
    const resultado = await window.electronAPI.buscarPorDatoEstructurado(tipoDato, valor);

    if (resultado.success && resultado.data.length > 0) {
      contenedor.innerHTML = `
        <div class="datos-resultado-lista">
          ${resultado.data.map(dato => renderizarDatoExtraido(dato)).join('')}
        </div>
      `;
    } else {
      contenedor.innerHTML = `
        <div class="empty-state-small">
          <p>No se encontraron resultados</p>
        </div>
      `;
    }

  } catch (error) {
    console.error('Error buscando datos:', error);
    contenedor.innerHTML = `
      <div class="empty-state-small">
        <p>Error en la búsqueda</p>
      </div>
    `;
  }
}

function renderizarDatoExtraido(dato) {
  let datoMostrar = dato.dato;
  try {
    const parsed = JSON.parse(dato.dato);
    if (typeof parsed === 'object') {
      datoMostrar = Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
  } catch (e) { }

  const confianzaColor = dato.confianza >= 0.8 ? 'var(--color-exito)' :
    dato.confianza >= 0.6 ? 'var(--color-advertencia)' :
      'var(--color-info)';

  return `
    <div class="dato-extraido-item">
      <div class="dato-extraido-header">
        <strong>${datoMostrar}</strong>
        <span class="confianza-badge" style="background: ${confianzaColor};">
          ${Math.round(dato.confianza * 100)}%
        </span>
      </div>
      <div class="dato-extraido-body">
        <p><strong>Documento:</strong> ${dato.nombre_archivo}</p>
        <p><strong>Tipo:</strong> ${dato.tipo_documento.replace(/_/g, ' ')}</p>
        ${dato.contexto ? `<p><strong>Contexto:</strong> ${dato.contexto}</p>` : ''}
      </div>
      <div class="dato-extraido-footer">
        <span style="font-size: 11px; color: var(--color-texto-secundario);">
          Extraído: ${new Date(dato.fecha_extraccion).toLocaleDateString('es-MX')}
        </span>
        <button class="btn btn-sm btn-secondary" onclick="verDocumentoCompleto('${dato.documento_id}')">
          Ver Documento
        </button>
      </div>
    </div>
  `;
}

async function verDocumentoCompleto(documentoId) {
  try {
    const resultado = await window.electronAPI.obtenerDocumentoCompleto(documentoId);

    if (resultado.success) {
      mostrarModalDocumentoCompleto(resultado.data);
    }

  } catch (error) {
    console.error('Error obteniendo documento:', error);
    sistemaNotificaciones.notificarError('Error', error.message);
  }
}

function mostrarModalDocumentoCompleto(documento) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalDocumentoCompleto';

  let datosEstructurados = {};
  try {
    datosEstructurados = JSON.parse(documento.datos_estructurados || '{}');
  } catch (e) { }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 1000px;">
      <div class="modal-header">
        <h2>📄 ${documento.nombre_archivo}</h2>
        <button class="close-btn" onclick="cerrarModal('modalDocumentoCompleto')">×</button>
      </div>

      <div class="modal-body">
        <div class="documento-completo-info">
          <div class="info-row">
            <strong>Tipo:</strong>
            <span>${documento.tipo_documento.replace(/_/g, ' ').toUpperCase()}</span>
          </div>
          <div class="info-row">
            <strong>Páginas:</strong>
            <span>${documento.numero_paginas || 'N/A'}</span>
          </div>
          <div class="info-row">
            <strong>Calidad:</strong>
            <span>${Math.round((documento.calidad_extraccion || 0) * 100)}%</span>
          </div>
          <div class="info-row">
            <strong>Relevancia:</strong>
            <span>${Math.round((documento.relevancia || 0) * 100)}%</span>
          </div>
        </div>

        <div class="documento-datos-estructurados">
          <h3>🗂️ Datos Estructurados Extraídos</h3>
          <div class="datos-estructurados-grid">
            ${Object.entries(datosEstructurados).map(([tipo, valores]) => {
    if (!Array.isArray(valores) || valores.length === 0) return '';
    return `
                <div class="dato-estructurado-grupo">
                  <strong>${tipo.replace(/_/g, ' ').toUpperCase()}</strong>
                  <ul>
                    ${valores.slice(0, 5).map(v => {
      const valor = typeof v === 'object' ? JSON.stringify(v) : v;
      return `<li>${valor}</li>`;
    }).join('')}
                    ${valores.length > 5 ? `<li><em>... y ${valores.length - 5} más</em></li>` : ''}
                  </ul>
                </div>
              `;
  }).join('')}
          </div>
        </div>

        <div class="documento-contenido-preview">
          <h3>📝 Vista Previa del Contenido</h3>
          <div class="contenido-texto">
            ${documento.contenido_extraido || 'No hay contenido disponible'}
          </div>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button class="btn btn-secondary" onclick="abrirArchivoFn('${documento.ruta}')">
            📂 Abrir Archivo Original
          </button>
          <button class="btn btn-primary" onclick="cerrarModal('modalDocumentoCompleto')">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function exportarDatosExtraidos(formato) {
  const notifId = sistemaNotificaciones.notificarInfo(
    'Exportando...',
    `Generando archivo ${formato.toUpperCase()}...`,
    0
  );

  try {
    const resultado = await window.electronAPI.exportarDatosExtraidos(formato);

    sistemaNotificaciones.cerrarNotificacion(notifId);

    if (resultado.success) {
      sistemaNotificaciones.notificarExito(
        'Exportación Exitosa',
        `Archivo guardado en: ${resultado.ruta}`
      );
    } else {
      throw new Error(resultado.error);
    }

  } catch (error) {
    sistemaNotificaciones.cerrarNotificacion(notifId);
    console.error('Error exportando datos:', error);
    sistemaNotificaciones.notificarError('Error', error.message);
  }
}

function buscarEnDatosExtraidos() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalBuscarDatos';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>🔍 Buscar en Datos Extraídos</h2>
        <button class="close-btn" onclick="cerrarModal('modalBuscarDatos')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Tipo de Dato:</label>
          <select class="form-control" id="tipoDatoBuscar">
            <option value="">Todos los tipos</option>
            <option value="folios">Folios</option>
            <option value="fechas">Fechas</option>
            <option value="vigencias">Vigencias</option>
            <option value="rfcs">RFCs</option>
            <option value="direcciones">Direcciones</option>
            <option value="telefonos">Teléfonos</option>
            <option value="emails">Emails</option>
            <option value="normas">Normas</option>
            <option value="articulos">Artículos</option>
            <option value="responsables">Responsables</option>
            <option value="empresas">Empresas</option>
          </select>
        </div>

        <div class="form-group">
          <label>Valor a Buscar:</label>
          <input type="text" 
                 class="form-control" 
                 id="valorBuscar" 
                 placeholder="Ej: NOM-002, RFC, nombre...">
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="cerrarModal('modalBuscarDatos')">
            Cancelar
          </button>
          <button class="btn btn-primary" onclick="ejecutarBusquedaDatos()">
            🔍 Buscar
          </button>
        </div>

        <div id="resultadosBusquedaDatos" style="margin-top: var(--espaciado-lg);"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function ejecutarBusquedaDatos() {
  const tipo = document.getElementById('tipoDatoBuscar').value;
  const valor = document.getElementById('valorBuscar').value;

  if (!valor) {
    sistemaNotificaciones.notificarAdvertencia(
      'Valor Requerido',
      'Ingresa un valor para buscar'
    );
    return;
  }

  const contenedor = document.getElementById('resultadosBusquedaDatos');
  contenedor.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Buscando...</p>
    </div>
  `;

  try {
    const resultado = await window.electronAPI.buscarPorDatoEstructurado(tipo || 'folios', valor);

    if (resultado.success && resultado.data.length > 0) {
      contenedor.innerHTML = `
        <h4 style="margin-bottom: var(--espaciado-md);">
          Se encontraron ${resultado.data.length} resultados
        </h4>
        <div class="datos-resultado-lista">
          ${resultado.data.map(dato => renderizarDatoExtraido(dato)).join('')}
        </div>
      `;
    } else {
      contenedor.innerHTML = `
        <div class="empty-state-small">
          <p>No se encontraron resultados</p>
        </div>
      `;
    }

  } catch (error) {
    console.error('Error en búsqueda:', error);
    contenedor.innerHTML = `
      <div class="empty-state-small">
        <p>Error en la búsqueda</p>
      </div>
    `;
  }
}

// ==================== ESTADÍSTICAS DE EXTRACCIÓN ====================

async function verEstadisticasExtraccion() {
  try {
    const resultado = await window.electronAPI.obtenerEstadisticasExtraccion();

    if (!resultado.success) {
      throw new Error('Error obteniendo estadísticas');
    }

    const stats = resultado.data;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalEstadisticasExtraccion';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h2>📊 Estadísticas de Extracción de Datos</h2>
          <button class="close-btn" onclick="cerrarModal('modalEstadisticasExtraccion')">×</button>
        </div>

        <div class="modal-body">
          <div class="stats-grid">
            <div class="stat-card-large">
              <div class="stat-icon">📄</div>
              <div class="stat-value">${stats.total_documentos || 0}</div>
              <div class="stat-label">Documentos Analizados</div>
            </div>

            <div class="stat-card-large">
              <div class="stat-icon">✨</div>
              <div class="stat-value">${Math.round((stats.calidad_promedio || 0) * 100)}%</div>
              <div class="stat-label">Calidad Promedio</div>
            </div>

            <div class="stat-card-large">
              <div class="stat-icon">🗂️</div>
              <div class="stat-value">
                ${stats.datos_extraidos_por_tipo ? stats.datos_extraidos_por_tipo.reduce((sum, d) => sum + d.cantidad, 0) : 0}
              </div>
              <div class="stat-label">Datos Extraídos</div>
            </div>
          </div>

          <div class="chart-section">
            <h3>📊 Distribución de Tipos de Documentos</h3>
            <div class="chart-bars">
              ${stats.documentos_por_tipo ? stats.documentos_por_tipo.map(tipo => `
                <div class="chart-bar-item">
                  <div class="chart-bar-label">
                    ${tipo.tipo_documento.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div class="chart-bar-container">
                    <div class="chart-bar-fill" 
                         style="width: ${(tipo.cantidad / stats.total_documentos) * 100}%;">
                    </div>
                  </div>
                  <div class="chart-bar-value">${tipo.cantidad}</div>
                </div>
              `).join('') : '<p>No hay datos</p>'}
            </div>
          </div>

          <div class="chart-section">
            <h3>🗂️ Tipos de Datos Extraídos</h3>
            <div class="chart-bars">
              ${stats.datos_extraidos_por_tipo ? stats.datos_extraidos_por_tipo.map(tipo => {
      const maxCantidad = Math.max(...stats.datos_extraidos_por_tipo.map(t => t.cantidad));
      return `
                  <div class="chart-bar-item">
                    <div class="chart-bar-label">
                      ${tipo.tipo_dato.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div class="chart-bar-container">
                      <div class="chart-bar-fill" 
                           style="width: ${(tipo.cantidad / maxCantidad) * 100}%; background: var(--color-exito);">
                      </div>
                    </div>
                    <div class="chart-bar-value">${tipo.cantidad}</div>
                  </div>
                `;
    }).join('') : '<p>No hay datos</p>'}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

  } catch (error) {
    console.error('Error mostrando estadísticas:', error);
    sistemaNotificaciones.notificarError('Error', error.message);
  }
}

// ==================== ASISTENTE VIRTUAL (CHATBOT) ====================

let conversacionActiva = [];

async function inicializarChatbotUI() {
  const contenedorMensajes = document.getElementById('chatbotMessages');
  const contenedorSugerencias = document.getElementById('chatbotSuggestions');
  
  try {
    const resultado = await window.electronAPI.obtenerHistorialChatbot();
    
    if (resultado.success && resultado.data.length > 0) {
      conversacionActiva = resultado.data;
      renderizarHistorialChatbot();
    } else {
      // Sugerencias iniciales si no hay historial
      mostrarSugerenciasChatbot([
        '¿Qué requisitos necesito para el Aviso de Funcionamiento?',
        '¿Cuánto cuesta un dictamen estructural?',
        '¿Qué normas aplican para mi establecimiento?',
        '¿Qué es el Programa Interno de PC?'
      ]);
    }

    // Enfocar input
    setTimeout(() => {
      document.getElementById('chatbotInput').focus();
    }, 100);

  } catch (error) {
    console.error('Error inicializando chatbot UI:', error);
  }
}

async function enviarMensajeChatbot() {
  const input = document.getElementById('chatbotInput');
  const mensaje = input.value.trim();
  
  if (!mensaje) return;

  // Limpiar input
  input.value = '';

  // Mostrar mensaje del usuario inmediatamente
  agregarMensajeUI('usuario', mensaje);

  // Mostrar indicador de carga
  const loadingId = mostrarCargandoChatbot();

  try {
    const resultado = await window.electronAPI.enviarMensajeChatbot(mensaje);

    // Quitar indicador de carga
    quitarCargandoChatbot(loadingId);

    if (resultado.texto) {
      agregarMensajeUI('assistant', resultado.texto);
      
      // Mostrar sugerencias si las hay
      if (resultado.sugerencias && resultado.sugerencias.length > 0) {
        mostrarSugerenciasChatbot(resultado.sugerencias);
      }
    }

  } catch (error) {
    quitarCargandoChatbot(loadingId);
    console.error('Error enviando mensaje al chatbot:', error);
    agregarMensajeUI('assistant', 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentar de nuevo?');
  }
}

function agregarMensajeUI(rol, texto) {
  const contenedor = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = `message ${rol}`;
  
  // Procesar markdown básico (negritas)
  const textoProcesado = texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  div.innerHTML = `
    <div class="message-content">
      ${textoProcesado}
    </div>
    <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
  `;
  
  contenedor.appendChild(div);
  
  // Scroll al final
  contenedor.scrollTop = contenedor.scrollHeight;
}

function mostrarSugerenciasChatbot(sugerencias) {
  const contenedor = document.getElementById('chatbotSuggestions');
  contenedor.innerHTML = sugerencias.map(s => `
    <button class="suggestion-chip" onclick="usarSugerenciaChatbot('${s}')">
      ${s}
    </button>
  `).join('');
}

function usarSugerenciaChatbot(sugerencia) {
  document.getElementById('chatbotInput').value = sugerencia;
  enviarMensajeChatbot();
}

function mostrarCargandoChatbot() {
  const contenedor = document.getElementById('chatbotMessages');
  const id = 'loading-' + Date.now();
  const div = document.createElement('div');
  div.className = 'message assistant loading-message';
  div.id = id;
  div.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  contenedor.appendChild(div);
  contenedor.scrollTop = contenedor.scrollHeight;
  return id;
}

function quitarCargandoChatbot(id) {
  const elem = document.getElementById(id);
  if (elem) elem.remove();
}

function renderizarHistorialChatbot() {
  const contenedor = document.getElementById('chatbotMessages');
  contenedor.innerHTML = '';
  
  conversacionActiva.forEach(msg => {
    agregarMensajeUI(msg.rol, msg.mensaje);
  });
}

async function limpiarChatbot() {
  try {
    await window.electronAPI.limpiarHistorialChatbot();
    conversacionActiva = [];
    document.getElementById('chatbotMessages').innerHTML = `
      <div class="message assistant">
        <div class="message-content">
          Historial limpiado. ¿En qué más puedo ayudarte?
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error limpiando chatbot:', error);
  }
}

// ==================== FUNCIONES HEREDADAS ====================


async function cargarSugerencias() {
  const contenedor = document.getElementById('tabSugerencias');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Buscando sugerencias...</p>
    </div>
  `;

  try {
    const sugerencias = await window.electronAPI.obtenerSugerenciasPendientes();

    if (sugerencias.length > 0) {
      contenedor.innerHTML = `
        <div class="sugerencias-grid">
          ${sugerencias.map(s => `
            <div class="sugerencia-card">
              <div class="sugerencia-header">
                <span class="badge badge-primary">${s.tipo_sugerencia}</span>
                <span class="confianza">${Math.round(s.confianza * 100)}% confianza</span>
              </div>
              <p class="sugerencia-texto">${s.sugerencia}</p>
              ${s.contexto ? `<div class="sugerencia-contexto">${s.contexto}</div>` : ''}
              <div class="sugerencia-acciones">
                <button class="btn btn-sm btn-primary" onclick="aplicarSugerencia('${s.id}')">
                  Aplicar
                </button>
                <button class="btn btn-sm btn-secondary" onclick="ignorarSugerencia('${s.id}')">
                  Ignorar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      contenedor.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <h3>Todo está en orden</h3>
          <p>No hay sugerencias pendientes en este momento.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error cargando sugerencias:', error);
    contenedor.innerHTML = '<p class="error">Error cargando sugerencias</p>';
  }
}

async function cargarPatrones() {
  const contenedor = document.getElementById('tabPatrones');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Analizando patrones...</p>
    </div>
  `;

  try {
    const patrones = await window.electronAPI.obtenerPatronesIdentificados(20);

    if (patrones.length > 0) {
      contenedor.innerHTML = `
        <div class="patrones-list">
          ${patrones.map(p => `
            <div class="patron-item">
              <div class="patron-icon">🔍</div>
              <div class="patron-info">
                <h4>${p.tipo_patron.toUpperCase()}</h4>
                <p>${p.patron}</p>
                <div class="patron-meta">
                  <span>Frecuencia: ${p.frecuencia}</span>
                  <span>Confianza: ${Math.round(p.confianza * 100)}%</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      contenedor.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No se han detectado patrones</h3>
          <p>El sistema necesita analizar más datos para identificar patrones.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error cargando patrones:', error);
    contenedor.innerHTML = '<p class="error">Error cargando patrones</p>';
  }
}

async function cargarConversaciones() {
  const contenedor = document.getElementById('tabConversaciones');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="toolbar-actions" style="margin-bottom: var(--espaciado-lg);">
      <button class="btn btn-primary" onclick="mostrarFormularioConversacion()">
        ➕ Nueva Conversación
      </button>
    </div>
    <div id="listaConversaciones">
      <div class="loading">
        <div class="spinner"></div>
        <p>Cargando conversaciones...</p>
      </div>
    </div>
  `;

  const lista = document.getElementById('listaConversaciones');

  try {
    const conversaciones = await window.electronAPI.obtenerConversacionesAnalizadas(20);

    if (conversaciones.length > 0) {
      lista.innerHTML = `
        <div class="conversaciones-grid">
          ${conversaciones.map(c => `
            <div class="conversacion-card">
              <div class="conversacion-header">
                <h3>${c.titulo || 'Sin título'}</h3>
                <span class="fecha">${new Date(c.fecha_conversacion).toLocaleDateString()}</span>
              </div>
              <p class="conversacion-preview">${c.contenido.substring(0, 100)}...</p>
              <div class="tags">
                ${JSON.parse(c.temas_identificados || '[]').slice(0, 3).map(t =>
        `<span class="tag">${t.tema}</span>`
      ).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h3>No hay conversaciones analizadas</h3>
          <p>Sube una conversación para comenzar el análisis.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error cargando conversaciones:', error);
    lista.innerHTML = '<p class="error">Error cargando conversaciones</p>';
  }
}

async function cargarDocumentos() {
  const contenedor = document.getElementById('tabDocumentos');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Cargando documentos...</p>
    </div>
  `;

  try {
    const documentos = await window.electronAPI.obtenerDocumentosAnalizados(20);

    if (documentos.length > 0) {
      contenedor.innerHTML = `
        <div class="documentos-lista">
          ${documentos.map(d => `
            <div class="documento-item" onclick="verDocumentoCompleto('${d.id}')">
              <div class="documento-icon">📄</div>
              <div class="documento-info">
                <h4>${d.nombre_archivo}</h4>
                <p>Tipo: ${d.tipo_documento.replace(/_/g, ' ')}</p>
              </div>
              <div class="documento-meta">
                <span class="badge badge-secondary">${Math.round(d.relevancia * 100)}% relevancia</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      contenedor.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>No hay documentos analizados</h3>
          <p>Analiza carpetas para poblar esta sección.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error cargando documentos:', error);
    contenedor.innerHTML = '<p class="error">Error cargando documentos</p>';
  }
}

function mostrarOpcionesAprendizaje() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalOpcionesAprendizaje';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Entrenar Sistema</h2>
        <button class="close-btn" onclick="cerrarModal('modalOpcionesAprendizaje')">×</button>
      </div>
      <div class="modal-body">
        <div class="opciones-grid">
          <div class="opcion-card" onclick="analizarCarpetaGestoria()">
            <div class="opcion-icon">📂</div>
            <h3>Analizar Carpeta</h3>
            <p>Escanear documentos y expedientes existentes</p>
          </div>
          
          <div class="opcion-card" onclick="mostrarFormularioConversacion(); cerrarModal('modalOpcionesAprendizaje')">
            <div class="opcion-icon">💬</div>
            <h3>Analizar Conversación</h3>
            <p>Procesar chat o transcripción con cliente</p>
          </div>

          <div class="opcion-card" onclick="generarSugerenciasManual()">
            <div class="opcion-icon">💡</div>
            <h3>Generar Sugerencias</h3>
            <p>Forzar análisis y búsqueda de mejoras</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function analizarCarpetaGestoria() {
  try {
    const carpeta = await window.electronAPI.abrirCarpetaExplorador();
    if (carpeta) {
      sistemaNotificaciones.notificarInfo('Iniciando análisis', 'Esto puede tomar varios minutos...');
      cerrarModal('modalOpcionesAprendizaje');

      const resultado = await window.electronAPI.analizarCarpetaGestoria(carpeta);

      if (resultado.success) {
        sistemaNotificaciones.notificarExito('Análisis completado',
          `Se analizaron ${resultado.resultados.archivos_analizados} archivos.`);
        cargarDatosAprendizaje(); // Recargar datos
      } else {
        throw new Error(resultado.error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    sistemaNotificaciones.notificarError('Error en análisis', error.message);
  }
}

function mostrarFormularioConversacion() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalNuevaConversacion';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Nueva Conversación</h2>
        <button class="close-btn" onclick="cerrarModal('modalNuevaConversacion')">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="tituloConversacion" class="form-control" placeholder="Ej: Cliente Restaurante Centro">
        </div>
        <div class="form-group">
          <label>Contenido</label>
          <textarea id="contenidoConversacion" class="form-control" rows="10" placeholder="Pega aquí la conversación..."></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="cerrarModal('modalNuevaConversacion')">Cancelar</button>
          <button class="btn btn-primary" onclick="procesarConversacion()">Analizar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function procesarConversacion() {
  const titulo = document.getElementById('tituloConversacion').value;
  const contenido = document.getElementById('contenidoConversacion').value;

  if (!contenido) return;

  try {
    sistemaNotificaciones.notificarInfo('Procesando...', 'Analizando estructura y contenido...');

    const resultado = await window.electronAPI.analizarConversacion(contenido, { titulo });

    if (resultado.success) {
      cerrarModal('modalNuevaConversacion');
      sistemaNotificaciones.notificarExito('Conversación procesada', 'Se ha extraído conocimiento nuevo.');
      cargarDatosAprendizaje();
    }
  } catch (error) {
    sistemaNotificaciones.notificarError('Error', error.message);
  }
}

async function generarSugerenciasManual() {
  try {
    sistemaNotificaciones.notificarInfo('Generando...', 'Buscando oportunidades de mejora...');
    await window.electronAPI.generarSugerencias();
    sistemaNotificaciones.notificarExito('Listo', 'Sugerencias actualizadas');
    cargarSugerencias();
  } catch (error) {
    sistemaNotificaciones.notificarError('Error', error.message);
  }
}

async function verConocimientoBase() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalConocimiento';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h2>📚 Base de Conocimiento</h2>
        <button class="close-btn" onclick="cerrarModal('modalConocimiento')">×</button>
      </div>
      <div class="modal-body">
        <div class="search-box">
          <input type="text" id="buscadorConocimiento" class="form-control" placeholder="Buscar en el conocimiento aprendido...">
          <button class="btn btn-primary" onclick="buscarEnConocimiento()">Buscar</button>
        </div>
        <div id="listaConocimiento" class="conocimiento-lista">
          <p class="text-center text-muted">Realiza una búsqueda para ver resultados</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function buscarEnConocimiento() {
  const consulta = document.getElementById('buscadorConocimiento').value;
  if (!consulta) return;

  const lista = document.getElementById('listaConocimiento');
  lista.innerHTML = '<div class="spinner"></div>';

  try {
    const resultados = await window.electronAPI.buscarConocimiento(consulta);

    if (resultados.length > 0) {
      lista.innerHTML = resultados.map(r => `
        <div class="conocimiento-item">
          <div class="conocimiento-header">
            <span class="badge badge-info">${r.categoria}</span>
            <span class="relevancia">${Math.round(r.relevancia * 100)}% relevancia</span>
          </div>
          <p class="conocimiento-texto">${r.contenido}</p>
          <div class="conocimiento-meta">Fuente: ${r.fuente}</div>
        </div>
      `).join('');
    } else {
      lista.innerHTML = '<p class="text-center">No se encontraron resultados</p>';
    }
  } catch (error) {
    console.error(error);
    lista.innerHTML = '<p class="error">Error en la búsqueda</p>';
  }
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

// Utilidad para debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
