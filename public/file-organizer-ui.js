// ==================== ORGANIZADOR DE ARCHIVOS ====================

let carpetasCache = [];
let archivosCache = [];
let carpetaActual = null;
let tiposArchivoConfig = {};
let archivosSeleccionados = new Set();

function mostrarOrganizadorArchivos() {
    const html = `
    <div class="header">
      <div>
        <h1>📂 Organizador de Archivos</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Escanea, clasifica y organiza tus archivos automáticamente
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="verHistorialOrganizacion()">
          📜 Historial
        </button>
        <button class="btn btn-primary" onclick="seleccionarCarpetaEscanear()">
          ➕ Escanear Carpeta
        </button>
      </div>
    </div>

    <!-- Carpetas escaneadas -->
    <div class="organizador-container">
      <!-- Sidebar de carpetas -->
      <div class="organizador-sidebar">
        <div class="organizador-sidebar-header">
          <h3>📁 Carpetas Escaneadas</h3>
        </div>
        <div id="listaCarpetasEscaneadas">
          <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
          </div>
        </div>
      </div>

      <!-- Contenido principal -->
      <div class="organizador-main">
        <div id="contenidoOrganizador">
          <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <h3>No hay carpetas escaneadas</h3>
            <p>Escanea una carpeta para comenzar a organizar tus archivos</p>
            <button class="btn btn-primary" onclick="seleccionarCarpetaEscanear()">
              ➕ Escanear Primera Carpeta
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

    document.getElementById('contentArea').innerHTML = html;
    cargarConfiguracionTipos();
    cargarCarpetasEscaneadas();
}

// ==================== CARGAR DATOS ====================

async function cargarConfiguracionTipos() {
    try {
        const resultado = await window.electronAPI.obtenerConfigTiposArchivo();
        if (resultado.success) {
            tiposArchivoConfig = resultado.data;
        }
    } catch (error) {
        console.error('Error cargando configuración de tipos:', error);
    }
}

async function cargarCarpetasEscaneadas() {
    try {
        const resultado = await window.electronAPI.obtenerCarpetasEscaneadas();

        if (resultado.success) {
            carpetasCache = resultado.data;
            renderizarListaCarpetas(resultado.data);

            // Si hay carpetas, seleccionar la primera
            if (resultado.data.length > 0 && !carpetaActual) {
                verDetalleCarpeta(resultado.data[0].id);
            }
        }
    } catch (error) {
        console.error('Error cargando carpetas:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudieron cargar las carpetas escaneadas'
        );
    }
}

function renderizarListaCarpetas(carpetas) {
    const contenedor = document.getElementById('listaCarpetasEscaneadas');

    if (carpetas.length === 0) {
        contenedor.innerHTML = `
      <div class="empty-state-small">
        <p style="text-align: center; color: var(--color-texto-secundario); font-size: 13px;">
          No hay carpetas escaneadas
        </p>
      </div>
    `;
        return;
    }

    contenedor.innerHTML = `
    <div class="carpetas-lista">
      ${carpetas.map(carpeta => renderizarItemCarpeta(carpeta)).join('')}
    </div>
  `;
}

function renderizarItemCarpeta(carpeta) {
    const esActiva = carpetaActual === carpeta.id;
    const ultimoEscaneo = carpeta.ultimo_escaneo
        ? new Date(carpeta.ultimo_escaneo).toLocaleDateString('es-MX', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Nunca';

    return `
    <div class="carpeta-item ${esActiva ? 'active' : ''}" 
         onclick="verDetalleCarpeta('${carpeta.id}')">
      <div class="carpeta-item-icon">📁</div>
      <div class="carpeta-item-info">
        <strong>${carpeta.nombre}</strong>
        <p>${carpeta.total_archivos || 0} archivos</p>
        <span class="carpeta-item-fecha">${ultimoEscaneo}</span>
      </div>
      <button class="btn-icon-small" 
              onclick="event.stopPropagation(); mostrarMenuCarpeta(event, '${carpeta.id}')"
              title="Más opciones">
        ⋮
      </button>
    </div>
  `;
}

// ==================== ESCANEAR CARPETA ====================

async function seleccionarCarpetaEscanear() {
    try {
        const resultado = await window.electronAPI.seleccionarCarpetaEscanear();

        if (resultado.canceled) {
            return;
        }

        if (resultado.success) {
            await escanearCarpeta(resultado.ruta);
        }
    } catch (error) {
        console.error('Error seleccionando carpeta:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo seleccionar la carpeta'
        );
    }
}

async function escanearCarpeta(rutaCarpeta) {
    const notifId = sistemaNotificaciones.notificarInfo(
        'Escaneando...',
        'Analizando archivos en la carpeta. Esto puede tardar unos momentos...',
        0 // No auto-cerrar
    );

    try {
        const resultado = await window.electronAPI.escanearCarpeta(rutaCarpeta);

        sistemaNotificaciones.cerrarNotificacion(notifId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Escaneo Completado',
                `Se encontraron ${resultado.totalArchivos} archivos`
            );

            // Recargar lista de carpetas
            await cargarCarpetasEscaneadas();

            // Mostrar detalle de la carpeta escaneada
            verDetalleCarpeta(resultado.carpetaId);

        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }

    } catch (error) {
        sistemaNotificaciones.cerrarNotificacion(notifId);
        console.error('Error escaneando carpeta:', error);
        sistemaNotificaciones.notificarError(
            'Error en Escaneo',
            error.message
        );
    }
}

// ==================== VER DETALLE DE CARPETA ====================

async function verDetalleCarpeta(carpetaId) {
    carpetaActual = carpetaId;
    archivosSeleccionados.clear();

    // Actualizar UI de lista
    document.querySelectorAll('.carpeta-item').forEach(item => {
        item.classList.remove('active');
    });
    event?.target?.closest('.carpeta-item')?.classList.add('active');

    const contenedor = document.getElementById('contenidoOrganizador');
    contenedor.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Cargando archivos...</p>
    </div>
  `;

    try {
        // Cargar estadísticas y archivos en paralelo
        const [statsRes, archivosRes] = await Promise.all([
            window.electronAPI.obtenerEstadisticasCarpeta(carpetaId),
            window.electronAPI.obtenerArchivosCarpeta(carpetaId, {})
        ]);

        if (statsRes.success && archivosRes.success) {
            archivosCache = archivosRes.data;
            renderizarDetalleCarpeta(statsRes.data, archivosRes.data);
        }

    } catch (error) {
        console.error('Error cargando detalle:', error);
        contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Error al cargar</h3>
        <p>${error.message}</p>
      </div>
    `;
    }
}

function renderizarDetalleCarpeta(stats, archivos) {
    const contenedor = document.getElementById('contenidoOrganizador');

    const html = `
    <!-- Header de carpeta -->
    <div class="carpeta-detalle-header">
      <div>
        <h2>📁 ${stats.nombre}</h2>
        <p style="color: var(--color-texto-secundario); margin-top: 5px; font-size: 13px;">
          ${stats.ruta}
        </p>
      </div>
      <div class="carpeta-detalle-actions">
        <button class="btn btn-secondary" onclick="reescanearCarpeta('${stats.id}')">
          🔄 Re-escanear
        </button>
        <button class="btn btn-secondary" onclick="abrirCarpetaExploradorFn('${stats.ruta}')">
          📂 Abrir en Explorador
        </button>
        <button class="btn btn-primary" onclick="mostrarOpcionesOrganizar('${stats.id}')">
          🗂️ Organizar Archivos
        </button>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="organizador-stats">
      <div class="organizador-stat-card">
        <div class="organizador-stat-icon">📄</div>
        <div class="organizador-stat-info">
          <span class="organizador-stat-value">${stats.total_archivos || 0}</span>
          <span class="organizador-stat-label">Total Archivos</span>
        </div>
      </div>
      <div class="organizador-stat-card">
        <div class="organizador-stat-icon">💾</div>
        <div class="organizador-stat-info">
          <span class="organizador-stat-value">${formatearTamano(stats.total_tamano || 0)}</span>
          <span class="organizador-stat-label">Tamaño Total</span>
        </div>
      </div>
      <div class="organizador-stat-card">
        <div class="organizador-stat-icon">🗑️</div>
        <div class="organizador-stat-info">
          <span class="organizador-stat-value">${stats.enPapelera || 0}</span>
          <span class="organizador-stat-label">En Papelera</span>
        </div>
      </div>
      <div class="organizador-stat-card">
        <div class="organizador-stat-icon">📊</div>
        <div class="organizador-stat-info">
          <span class="organizador-stat-value">${stats.porTipo?.length || 0}</span>
          <span class="organizador-stat-label">Tipos Diferentes</span>
        </div>
      </div>
    </div>

    <!-- Distribución por tipo -->
    <div class="tipos-distribucion">
      <h3>📊 Distribución por Tipo</h3>
      <div class="tipos-grid">
        ${renderizarDistribucionTipos(stats.porTipo || [])}
      </div>
    </div>

    <!-- Filtros y acciones -->
    <div class="archivos-toolbar">
      <div class="archivos-filtros">
        <select class="form-control" id="filtroTipoArchivo" onchange="aplicarFiltrosArchivos()">
          <option value="">Todos los tipos</option>
          ${Object.entries(tiposArchivoConfig).map(([key, config]) => `
            <option value="${key}">${config.icono} ${config.nombre}</option>
          `).join('')}
        </select>

        <input type="text" 
               class="form-control" 
               id="busquedaArchivos" 
               placeholder="Buscar archivos..."
               oninput="debounce(aplicarFiltrosArchivos, 300)()">

        <button class="btn btn-secondary" onclick="limpiarFiltrosArchivos()">
          Limpiar
        </button>
      </div>

      <div class="archivos-acciones">
        <span id="contadorSeleccion" style="color: var(--color-texto-secundario); font-size: 13px;">
          0 seleccionados
        </span>
        <button class="btn btn-secondary" 
                id="btnSeleccionarTodos" 
                onclick="seleccionarTodosArchivos()">
          ☑️ Seleccionar Todos
        </button>
        <button class="btn btn-danger" 
                id="btnMoverPapelera" 
                onclick="moverSeleccionadosPapelera()"
                disabled>
          🗑️ Mover a Papelera
        </button>
      </div>
    </div>

    <!-- Lista de archivos -->
    <div id="listaArchivos">
      ${renderizarListaArchivos(archivos)}
    </div>
  `;

    contenedor.innerHTML = html;
}

function renderizarDistribucionTipos(porTipo) {
    if (porTipo.length === 0) {
        return '<p style="color: var(--color-texto-secundario);">No hay archivos</p>';
    }

    return porTipo.map(tipo => {
        const config = tiposArchivoConfig[tipo.tipo_archivo] || tiposArchivoConfig.otros;
        const porcentaje = 100; // Para la barra visual

        return `
      <div class="tipo-card" onclick="filtrarPorTipo('${tipo.tipo_archivo}')">
        <div class="tipo-card-header">
          <span class="tipo-icon" style="font-size: 32px;">${config.icono}</span>
          <span class="tipo-badge" style="background: ${config.color};">
            ${tipo.cantidad}
          </span>
        </div>
        <div class="tipo-card-body">
          <strong>${config.nombre}</strong>
          <p>${formatearTamano(tipo.tamano_total || 0)}</p>
        </div>
      </div>
    `;
    }).join('');
}

function renderizarListaArchivos(archivos) {
    if (archivos.length === 0) {
        return `
      <div class="empty-state-small">
        <p>No se encontraron archivos</p>
      </div>
    `;
    }

    return `
    <div class="archivos-tabla">
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="checkboxTodos" onchange="toggleSeleccionTodos(this)">
            </th>
            <th style="width: 50px;">Tipo</th>
            <th>Nombre</th>
            <th style="width: 120px;">Tamaño</th>
            <th style="width: 150px;">Modificado</th>
            <th style="width: 100px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${archivos.map(archivo => renderizarFilaArchivo(archivo)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderizarFilaArchivo(archivo) {
    const config = tiposArchivoConfig[archivo.tipo_archivo] || tiposArchivoConfig.otros;
    const fechaMod = new Date(archivo.fecha_modificacion).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const esSeleccionado = archivosSeleccionados.has(archivo.id);

    return `
    <tr class="archivo-row ${esSeleccionado ? 'selected' : ''} ${archivo.en_papelera ? 'en-papelera' : ''}"
        data-archivo-id="${archivo.id}">
      <td>
        <input type="checkbox" 
               class="checkbox-archivo"
               ${esSeleccionado ? 'checked' : ''}
               onchange="toggleSeleccionArchivo('${archivo.id}', this.checked)">
      </td>
      <td>
        <span style="font-size: 24px;" title="${config.nombre}">${config.icono}</span>
      </td>
      <td>
        <div class="archivo-nombre">
          <strong>${archivo.nombre}</strong>
          ${archivo.en_papelera ? '<span class="badge badge-danger">En Papelera</span>' : ''}
        </div>
      </td>
      <td>${formatearTamano(archivo.tamano)}</td>
      <td>${fechaMod}</td>
      <td>
        <div class="archivo-acciones">
          <button class="btn-icon-small" 
                  onclick="abrirArchivoFn('${archivo.ruta_completa}')"
                  title="Abrir">
            👁️
          </button>
          <button class="btn-icon-small" 
                  onclick="mostrarMenuArchivo(event, '${archivo.id}')"
                  title="Más">
            ⋮
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ==================== SELECCIÓN DE ARCHIVOS ====================

function toggleSeleccionArchivo(archivoId, seleccionado) {
    if (seleccionado) {
        archivosSeleccionados.add(archivoId);
    } else {
        archivosSeleccionados.delete(archivoId);
    }

    actualizarUISeleccion();
}

function toggleSeleccionTodos(checkbox) {
    const checkboxes = document.querySelectorAll('.checkbox-archivo');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        const archivoId = cb.closest('.archivo-row').dataset.archivoId;
        toggleSeleccionArchivo(archivoId, checkbox.checked);
    });
}

function seleccionarTodosArchivos() {
    const archivosVisibles = document.querySelectorAll('.archivo-row');
    archivosVisibles.forEach(row => {
        const archivoId = row.dataset.archivoId;
        archivosSeleccionados.add(archivoId);
        const checkbox = row.querySelector('.checkbox-archivo');
        if (checkbox) checkbox.checked = true;
        row.classList.add('selected');
    });

    actualizarUISeleccion();
}

function actualizarUISeleccion() {
    const contador = document.getElementById('contadorSeleccion');
    const btnPapelera = document.getElementById('btnMoverPapelera');

    if (contador) {
        contador.textContent = `${archivosSeleccionados.size} seleccionados`;
    }

    if (btnPapelera) {
        btnPapelera.disabled = archivosSeleccionados.size === 0;
    }

    // Actualizar filas
    document.querySelectorAll('.archivo-row').forEach(row => {
        const archivoId = row.dataset.archivoId;
        if (archivosSeleccionados.has(archivoId)) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });
}

// ==================== MOVER A PAPELERA ====================

async function moverSeleccionadosPapelera() {
    if (archivosSeleccionados.size === 0) {
        return;
    }

    const confirmacion = await confirmarAccion(
        '¿Mover a Papelera?',
        `Se moverán ${archivosSeleccionados.size} archivo(s) a la papelera del sistema. Esta acción puede revertirse desde la papelera de reciclaje.`
    );

    if (!confirmacion) return;

    const archivosIds = Array.from(archivosSeleccionados);

    const notifId = sistemaNotificaciones.notificarInfo(
        'Moviendo a Papelera...',
        'Procesando archivos...',
        0
    );

    try {
        const resultado = await window.electronAPI.moverArchivosPapelera(archivosIds);

        sistemaNotificaciones.cerrarNotificacion(notifId);

        if (resultado.success) {
            const { exitosos, fallidos, errores } = resultado.data;

            if (exitosos > 0) {
                sistemaNotificaciones.notificarExito(
                    'Archivos Movidos',
                    `${exitosos} archivo(s) movidos a la papelera`
                );
            }

            if (fallidos > 0) {
                sistemaNotificaciones.notificarAdvertencia(
                    'Algunos Errores',
                    `${fallidos} archivo(s) no pudieron moverse`
                );
                console.error('Errores:', errores);
            }

            // Limpiar selección
            archivosSeleccionados.clear();

            // Recargar vista
            await verDetalleCarpeta(carpetaActual);

        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }

    } catch (error) {
        sistemaNotificaciones.cerrarNotificacion(notifId);
        console.error('Error moviendo a papelera:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            error.message
        );
    }
}

// ==================== ORGANIZAR ARCHIVOS ====================

async function mostrarOpcionesOrganizar(carpetaId) {
    const carpeta = carpetasCache.find(c => c.id === carpetaId);
    if (!carpeta) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalOrganizar';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>🗂️ Organizar Archivos</h2>
        <button class="close-btn" onclick="cerrarModal('modalOrganizar')">×</button>
      </div>

      <div class="modal-body">
        <p style="margin-bottom: var(--espaciado-lg);">
          Los archivos se organizarán automáticamente en carpetas según su tipo.
        </p>

        <div class="form-group">
          <label>Carpeta de origen:</label>
          <input type="text" class="form-control" value="${carpeta.ruta}" readonly>
        </div>

        <div class="form-group">
          <label>Carpeta de destino:</label>
          <div style="display: flex; gap: var(--espaciado-sm);">
            <input type="text" 
                   class="form-control" 
                   id="carpetaDestino" 
                   value="${carpeta.ruta}"
                   readonly>
            <button class="btn btn-secondary" onclick="seleccionarCarpetaDestino()">
              📂 Cambiar
            </button>
          </div>
          <small style="color: var(--color-texto-secundario);">
            Se crearán subcarpetas por tipo de archivo
          </small>
        </div>

        <div class="alert alert-info">
          <strong>ℹ️ Información:</strong>
          <ul style="margin: 10px 0 0 20px;">
            <li>Los archivos se moverán a carpetas según su tipo</li>
            <li>Se crearán carpetas: Documentos, Imágenes, Videos, etc.</li>
            <li>Los archivos duplicados se renombrarán automáticamente</li>
            <li>Esta acción puede tardar varios minutos</li>
          </ul>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button class="btn btn-secondary" onclick="cerrarModal('modalOrganizar')">
            Cancelar
          </button>
          <button class="btn btn-primary" onclick="ejecutarOrganizacion('${carpetaId}')">
            🗂️ Organizar Ahora
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

async function seleccionarCarpetaDestino() {
    try {
        const resultado = await window.electronAPI.seleccionarCarpetaEscanear();

        if (!resultado.canceled && resultado.success) {
            document.getElementById('carpetaDestino').value = resultado.ruta;
        }
    } catch (error) {
        console.error('Error seleccionando carpeta destino:', error);
    }
}

async function ejecutarOrganizacion(carpetaId) {
    const carpetaDestino = document.getElementById('carpetaDestino').value;

    if (!carpetaDestino) {
        sistemaNotificaciones.notificarAdvertencia(
            'Carpeta Requerida',
            'Selecciona una carpeta de destino'
        );
        return;
    }

    cerrarModal('modalOrganizar');

    const notifId = sistemaNotificaciones.notificarInfo(
        'Organizando Archivos...',
        'Moviendo archivos a sus carpetas correspondientes. Esto puede tardar varios minutos...',
        0
    );

    try {
        const resultado = await window.electronAPI.organizarPorTipo(carpetaId, carpetaDestino);

        sistemaNotificaciones.cerrarNotificacion(notifId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Organización Completada',
                `${resultado.movidos} archivos organizados exitosamente`
            );

            if (resultado.errores && resultado.errores.length > 0) {
                console.warn('Errores durante organización:', resultado.errores);
                sistemaNotificaciones.notificarAdvertencia(
                    'Algunos Errores',
                    `${resultado.errores.length} archivos no pudieron moverse`
                );
            }

            // Re-escanear carpeta
            await reescanearCarpeta(carpetaId);

        } else {
            throw new Error(resultado.error || 'Error desconocido');
        }

    } catch (error) {
        sistemaNotificaciones.cerrarNotificacion(notifId);
        console.error('Error organizando archivos:', error);
        sistemaNotificaciones.notificarError(
            'Error en Organización',
            error.message
        );
    }
}

// ==================== FILTROS ====================

function aplicarFiltrosArchivos() {
    const tipoSeleccionado = document.getElementById('filtroTipoArchivo')?.value;
    const busqueda = document.getElementById('busquedaArchivos')?.value.toLowerCase();

    let archivosFiltrados = [...archivosCache];

    // Filtrar por tipo
    if (tipoSeleccionado) {
        archivosFiltrados = archivosFiltrados.filter(a => a.tipo_archivo === tipoSeleccionado);
    }

    // Filtrar por búsqueda
    if (busqueda) {
        archivosFiltrados = archivosFiltrados.filter(a =>
            a.nombre.toLowerCase().includes(busqueda)
        );
    }

    // Re-renderizar lista
    const contenedor = document.getElementById('listaArchivos');
    if (contenedor) {
        contenedor.innerHTML = renderizarListaArchivos(archivosFiltrados);
    }
}

function limpiarFiltrosArchivos() {
    document.getElementById('filtroTipoArchivo').value = '';
    document.getElementById('busquedaArchivos').value = '';
    aplicarFiltrosArchivos();
}

function filtrarPorTipo(tipo) {
    document.getElementById('filtroTipoArchivo').value = tipo;
    aplicarFiltrosArchivos();
}

// ==================== ACCIONES ====================

async function reescanearCarpeta(carpetaId) {
    const carpeta = carpetasCache.find(c => c.id === carpetaId);
    if (!carpeta) return;

    await escanearCarpeta(carpeta.ruta);
}

async function abrirCarpetaExploradorFn(ruta) {
    try {
        await window.electronAPI.abrirCarpetaExplorador(ruta);
    } catch (error) {
        console.error('Error abriendo carpeta:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo abrir la carpeta'
        );
    }
}

async function abrirArchivoFn(ruta) {
    try {
        await window.electronAPI.abrirArchivo(ruta);
    } catch (error) {
        console.error('Error abriendo archivo:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo abrir el archivo'
        );
    }
}

function mostrarMenuCarpeta(event, carpetaId) {
    event.stopPropagation();

    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const carpeta = carpetasCache.find(c => c.id === carpetaId);
    if (!carpeta) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    menu.innerHTML = `
    <button onclick="verDetalleCarpeta('${carpetaId}')">
      👁️ Ver Detalle
    </button>
    <button onclick="reescanearCarpeta('${carpetaId}')">
      🔄 Re-escanear
    </button>
    <button onclick="abrirCarpetaExploradorFn('${carpeta.ruta}')">
      📂 Abrir en Explorador
    </button>
    <button onclick="mostrarOpcionesOrganizar('${carpetaId}')">
      🗂️ Organizar Archivos
    </button>
    <button onclick="eliminarCarpetaEscaneada('${carpetaId}')" style="color: var(--color-peligro);">
      🗑️ Eliminar de Lista
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

function mostrarMenuArchivo(event, archivoId) {
    event.stopPropagation();

    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const archivo = archivosCache.find(a => a.id === archivoId);
    if (!archivo) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    menu.innerHTML = `
    <button onclick="abrirArchivoFn('${archivo.ruta_completa}')">
      👁️ Abrir
    </button>
    <button onclick="copiarRutaArchivo('${archivo.ruta_completa}')">
      📋 Copiar Ruta
    </button>
    <button onclick="moverArchivoIndividualPapelera('${archivoId}')" style="color: var(--color-peligro);">
      🗑️ Mover a Papelera
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

async function moverArchivoIndividualPapelera(archivoId) {
    archivosSeleccionados.clear();
    archivosSeleccionados.add(archivoId);
    await moverSeleccionadosPapelera();
}

function copiarRutaArchivo(ruta) {
    navigator.clipboard.writeText(ruta).then(() => {
        sistemaNotificaciones.notificarExito(
            'Ruta Copiada',
            'La ruta del archivo se copió al portapapeles'
        );
    });
}

async function eliminarCarpetaEscaneada(carpetaId) {
    const confirmacion = await confirmarAccion(
        '¿Eliminar Carpeta de la Lista?',
        'Esto solo eliminará el registro de escaneo. Los archivos NO se eliminarán del disco.'
    );

    if (!confirmacion) return;

    try {
        const resultado = await window.electronAPI.eliminarCarpetaEscaneada(carpetaId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Carpeta Eliminada',
                'La carpeta se eliminó de la lista'
            );

            // Recargar lista
            await cargarCarpetasEscaneadas();

        } else {
            throw new Error(resultado.error);
        }

    } catch (error) {
        console.error('Error eliminando carpeta:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            error.message
        );
    }
}

// ==================== HISTORIAL ====================

async function verHistorialOrganizacion() {
    try {
        const resultado = await window.electronAPI.obtenerHistorialOrganizacion(20);

        if (!resultado.success) {
            throw new Error('Error obteniendo historial');
        }

        const historial = resultado.data;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'modalHistorialOrg';

        modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2>📜 Historial de Organización</h2>
          <button class="close-btn" onclick="cerrarModal('modalHistorialOrg')">×</button>
        </div>

        <div class="modal-body">
          ${historial.length > 0 ? `
            <div class="historial-lista">
              ${historial.map(item => renderizarHistorialItem(item)).join('')}
            </div>
          ` : `
            <div class="empty-state-small">
              <p>No hay historial de acciones</p>
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
    const fecha = new Date(item.fecha).toLocaleString('es-MX');
    const detalles = item.detalles ? JSON.parse(item.detalles) : {};

    const iconos = {
        'ESCANEO': '🔍',
        'MOVER_PAPELERA': '🗑️',
        'ORGANIZAR_POR_TIPO': '🗂️'
    };

    return `
    <div class="historial-item">
      <div class="historial-item-header">
        <div>
          <span style="font-size: 20px;">${iconos[item.accion] || '📋'}</span>
          <strong>${item.accion.replace(/_/g, ' ')}</strong>
        </div>
        <span style="font-size: 12px; color: var(--color-texto-secundario);">${fecha}</span>
      </div>
      <div class="historial-item-body">
        ${item.carpeta_nombre ? `<p>📁 ${item.carpeta_nombre}</p>` : ''}
        <p>📊 ${item.archivos_afectados} archivo(s) afectados</p>
        ${detalles.movidos ? `<p>✅ ${detalles.movidos} movidos exitosamente</p>` : ''}
        ${detalles.errores ? `<p style="color: var(--color-peligro);">❌ ${detalles.errores} errores</p>` : ''}
      </div>
    </div>
  `;
}

// ==================== UTILIDADES ====================

function formatearTamano(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

async function confirmarAccion(titulo, mensaje) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'modalConfirmacion';

        modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>${titulo}</h2>
        </div>
        <div class="modal-body">
          <p>${mensaje}</p>
        </div>
        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; padding: var(--espaciado-lg);">
          <button class="btn btn-secondary" onclick="responderConfirmacion(false)">
            Cancelar
          </button>
          <button class="btn btn-primary" onclick="responderConfirmacion(true)">
            Confirmar
          </button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        window.responderConfirmacion = (respuesta) => {
            modal.remove();
            delete window.responderConfirmacion;
            resolve(respuesta);
        };
    });
}
