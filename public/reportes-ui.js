// ==================== VISTA DE REPORTES ====================

function mostrarReportes() {
    const html = `
    <div class="header">
      <h1>📈 Reportes y Exportación</h1>
      <p style="color: var(--color-texto-secundario); margin-top: 5px;">
        Genera reportes profesionales en PDF de tus proyectos y auditorías
      </p>
    </div>

    <!-- Tipos de Reportes -->
    <div class="reportes-grid">
      <!-- Reporte de Proyecto -->
      <div class="reporte-card">
        <div class="reporte-icon">📁</div>
        <h3>Reporte de Proyecto</h3>
        <p>Genera un reporte completo con toda la información de un proyecto específico</p>
        <div class="reporte-features">
          <span>✓ Información general</span>
          <span>✓ Documentos adjuntos</span>
          <span>✓ Tareas y progreso</span>
          <span>✓ Registro de tiempo</span>
        </div>
        <button class="btn btn-primary" onclick="mostrarSelectorProyecto()">
          Generar Reporte
        </button>
      </div>

      <!-- Reporte de Auditoría -->
      <div class="reporte-card">
        <div class="reporte-icon">📋</div>
        <h3>Reporte de Auditoría INVEA</h3>
        <p>Exporta el checklist de auditoría preventiva con todos los detalles</p>
        <div class="reporte-features">
          <span>✓ Resumen ejecutivo</span>
          <span>✓ Detalle por sección</span>
          <span>✓ Plan de acción</span>
          <span>✓ Firmas y validación</span>
        </div>
        <button class="btn btn-primary" onclick="mostrarSelectorAuditoria()">
          Generar Reporte
        </button>
      </div>

      <!-- Reporte General -->
      <div class="reporte-card">
        <div class="reporte-icon">📊</div>
        <h3>Reporte General</h3>
        <p>Resumen de todas las actividades en un período de tiempo</p>
        <div class="reporte-features">
          <span>✓ Estadísticas generales</span>
          <span>✓ Proyectos por estado</span>
          <span>✓ Tareas completadas</span>
          <span>✓ Gráficos y análisis</span>
        </div>
        <button class="btn btn-primary" onclick="mostrarFormularioReporteGeneral()">
          Generar Reporte
        </button>
      </div>

      <!-- Exportación de Datos -->
      <div class="reporte-card">
        <div class="reporte-icon">💾</div>
        <h3>Exportar Datos</h3>
        <p>Exporta todos tus datos en formato JSON para respaldo</p>
        <div class="reporte-features">
          <span>✓ Todos los proyectos</span>
          <span>✓ Tareas y documentos</span>
          <span>✓ Configuración</span>
          <span>✓ Formato portable</span>
        </div>
        <button class="btn btn-secondary" onclick="exportarTodosDatos()">
          Exportar Datos
        </button>
      </div>
    </div>

    <!-- Historial de Reportes -->
    <div class="card mt-xl">
      <div class="card-header">
        <h3 class="card-title">📜 Historial de Reportes Generados</h3>
        <button class="btn btn-sm btn-secondary" onclick="limpiarHistorialReportes()">
          🗑️ Limpiar Historial
        </button>
      </div>
      <div class="card-body">
        <div id="historialReportes">
          ${renderizarHistorialReportes()}
        </div>
      </div>
    </div>
  `;

    document.getElementById('contentArea').innerHTML = html;
}

// ==================== SELECTOR DE PROYECTO ====================

async function mostrarSelectorProyecto() {
    const proyectosRes = await window.electronAPI.obtenerProyectos({});

    if (!proyectosRes.success || proyectosRes.data.length === 0) {
        sistemaNotificaciones.notificarAdvertencia(
            'Sin Proyectos',
            'No hay proyectos disponibles para generar reportes'
        );
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalSelectorProyecto';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📁 Seleccionar Proyecto</h2>
        <button class="close-btn" onclick="cerrarModal('modalSelectorProyecto')">×</button>
      </div>
      
      <div style="margin-bottom: var(--espaciado-lg);">
        <input type="text" 
               class="form-control" 
               placeholder="🔍 Buscar proyecto..." 
               id="buscarProyectoReporte"
               oninput="filtrarProyectosReporte(this.value)">
      </div>

      <div class="proyectos-selector" id="listaProyectosReporte">
        ${proyectosRes.data.map(proyecto => `
          <div class="proyecto-selector-item" data-nombre="${proyecto.nombre.toLowerCase()}">
            <div class="proyecto-selector-info">
              <div class="proyecto-selector-icono">📁</div>
              <div>
                <strong>${proyecto.nombre}</strong>
                <p style="font-size: 12px; color: var(--color-texto-secundario); margin: 0;">
                  ${proyecto.cliente || 'Sin cliente'} • ${proyecto.clasificacion || 'General'}
                </p>
              </div>
            </div>
            <button class="btn btn-primary" onclick="generarReporteProyectoUI('${proyecto.id}')">
              Generar
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

function filtrarProyectosReporte(termino) {
    const items = document.querySelectorAll('.proyecto-selector-item');
    items.forEach(item => {
        const nombre = item.dataset.nombre;
        if (nombre.includes(termino.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ==================== SELECTOR DE AUDITORÍA ====================

async function mostrarSelectorAuditoria() {
    const proyectosRes = await window.electronAPI.obtenerProyectos({});

    if (!proyectosRes.success || proyectosRes.data.length === 0) {
        sistemaNotificaciones.notificarAdvertencia(
            'Sin Proyectos',
            'No hay proyectos con auditorías disponibles'
        );
        return;
    }

    // Obtener checklists de todos los proyectos
    let todosChecklists = [];
    for (const proyecto of proyectosRes.data) {
        const checklistsRes = await window.electronAPI.obtenerChecklistsProyecto(proyecto.id);
        if (checklistsRes.success) {
            checklistsRes.data.forEach(c => {
                todosChecklists.push({
                    ...c,
                    proyecto_nombre: proyecto.nombre
                });
            });
        }
    }

    if (todosChecklists.length === 0) {
        sistemaNotificaciones.notificarAdvertencia(
            'Sin Auditorías',
            'No hay auditorías disponibles para generar reportes'
        );
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalSelectorAuditoria';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📋 Seleccionar Auditoría</h2>
        <button class="close-btn" onclick="cerrarModal('modalSelectorAuditoria')">×</button>
      </div>

      <div class="auditoria-selector">
        ${todosChecklists.map(checklist => {
        const nivelRiesgo = calcularNivelRiesgoLocal(checklist.puntuacion_total);
        return `
            <div class="auditoria-selector-item">
              <div class="auditoria-selector-info">
                <div>
                  <strong>${checklist.proyecto_nombre}</strong>
                  <p style="font-size: 12px; color: var(--color-texto-secundario); margin: 4px 0 0 0;">
                    Fecha: ${formatearFecha(checklist.fecha_auditoria)} • 
                    Puntuación: <span style="color: ${nivelRiesgo.color}; font-weight: 600;">${checklist.puntuacion_total}%</span>
                  </p>
                </div>
              </div>
              <button class="btn btn-primary" onclick="generarReporteChecklistUI('${checklist.id}')">
                Generar
              </button>
            </div>
          `;
    }).join('')}
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

// ==================== FORMULARIO REPORTE GENERAL ====================

function mostrarFormularioReporteGeneral() {
    const hoy = new Date().toISOString().split('T')[0];
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalReporteGeneral';

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📊 Reporte General de Actividades</h2>
        <button class="close-btn" onclick="cerrarModal('modalReporteGeneral')">×</button>
      </div>
      
      <form onsubmit="generarReporteGeneralUI(event)">
        <div class="form-group">
          <label>Fecha de Inicio</label>
          <input type="date" 
                 class="form-control" 
                 name="fecha_inicio" 
                 value="${hace30Dias}"
                 required>
        </div>

        <div class="form-group">
          <label>Fecha de Fin</label>
          <input type="date" 
                 class="form-control" 
                 name="fecha_fin" 
                 value="${hoy}"
                 required>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" name="incluir_graficos" checked>
            Incluir gráficos estadísticos
          </label>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" name="incluir_detalles" checked>
            Incluir detalles de proyectos
          </label>
        </div>

        <div style="display: flex; gap: var(--espaciado-md); justify-content: flex-end; margin-top: var(--espaciado-lg);">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalReporteGeneral')">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            Generar Reporte
          </button>
        </div>
      </form>
    </div>
  `;

    document.body.appendChild(modal);
}

// ==================== FUNCIONES DE GENERACIÓN ====================

async function generarReporteProyectoUI(proyectoId) {
    cerrarModal('modalSelectorProyecto');

    // Mostrar loading
    sistemaNotificaciones.notificarInfo(
        'Generando Reporte',
        'Por favor espera mientras se genera el PDF...'
    );

    try {
        const resultado = await window.electronAPI.generarReporteProyecto(proyectoId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Reporte Generado',
                'El reporte se ha guardado exitosamente'
            );

            // Guardar en historial
            guardarEnHistorial({
                tipo: 'proyecto',
                proyecto_id: proyectoId,
                ruta: resultado.ruta,
                fecha: new Date().toISOString()
            });

            // Preguntar si desea abrir
            if (confirm('¿Deseas abrir el reporte ahora?')) {
                await window.electronAPI.previsualizarPDF(resultado.ruta);
            }

            // Actualizar vista
            mostrarReportes();
        } else {
            sistemaNotificaciones.notificarError(
                'Error',
                resultado.mensaje || 'No se pudo generar el reporte'
            );
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'Ocurrió un error al generar el reporte'
        );
    }
}

async function generarReporteChecklistUI(checklistId) {
    cerrarModal('modalSelectorAuditoria');

    sistemaNotificaciones.notificarInfo(
        'Generando Reporte',
        'Por favor espera mientras se genera el PDF de auditoría...'
    );

    try {
        const resultado = await window.electronAPI.generarReporteChecklist(checklistId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Reporte Generado',
                'El reporte de auditoría se ha guardado exitosamente'
            );

            guardarEnHistorial({
                tipo: 'auditoria',
                checklist_id: checklistId,
                ruta: resultado.ruta,
                fecha: new Date().toISOString()
            });

            if (confirm('¿Deseas abrir el reporte ahora?')) {
                await window.electronAPI.previsualizarPDF(resultado.ruta);
            }

            mostrarReportes();
        } else {
            sistemaNotificaciones.notificarError(
                'Error',
                resultado.mensaje || 'No se pudo generar el reporte'
            );
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'Ocurrió un error al generar el reporte'
        );
    }
}

async function generarReporteGeneralUI(event) {
    event.preventDefault();
    cerrarModal('modalReporteGeneral');

    const formData = new FormData(event.target);
    const opciones = {
        fechaInicio: formData.get('fecha_inicio'),
        fechaFin: formData.get('fecha_fin'),
        incluirGraficos: formData.get('incluir_graficos') === 'on',
        incluirDetalles: formData.get('incluir_detalles') === 'on'
    };

    sistemaNotificaciones.notificarInfo(
        'Generando Reporte',
        'Por favor espera mientras se genera el reporte general...'
    );

    try {
        const resultado = await window.electronAPI.generarReporteGeneral(opciones);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Reporte Generado',
                'El reporte general se ha guardado exitosamente'
            );

            guardarEnHistorial({
                tipo: 'general',
                opciones: opciones,
                ruta: resultado.ruta,
                fecha: new Date().toISOString()
            });

            if (confirm('¿Deseas abrir el reporte ahora?')) {
                await window.electronAPI.previsualizarPDF(resultado.ruta);
            }

            mostrarReportes();
        } else {
            sistemaNotificaciones.notificarError(
                'Error',
                resultado.mensaje || 'No se pudo generar el reporte'
            );
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'Ocurrió un error al generar el reporte'
        );
    }
}

// ==================== EXPORTAR DATOS ====================

async function exportarTodosDatos() {
    if (!confirm('¿Estás seguro de exportar todos los datos? Esto puede tardar unos momentos.')) {
        return;
    }

    sistemaNotificaciones.notificarInfo(
        'Exportando Datos',
        'Preparando exportación de todos los datos...'
    );

    try {
        // Recopilar todos los datos
        const datos = {
            proyectos: estadoActual.proyectos,
            tareas: estadoActual.tareas,
            configuracion: configManager.obtenerConfiguracion(),
            fecha_exportacion: new Date().toISOString(),
            version: '1.0'
        };

        const nombreArchivo = `Backup_GestorVirtual_${new Date().toISOString().split('T')[0]}.json`;
        const resultado = await window.electronAPI.exportarDatosJSON(datos, nombreArchivo);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Datos Exportados',
                'Todos los datos se han exportado exitosamente'
            );

            guardarEnHistorial({
                tipo: 'backup',
                ruta: resultado.ruta,
                fecha: new Date().toISOString()
            });
        } else {
            sistemaNotificaciones.notificarError(
                'Error',
                resultado.mensaje || 'No se pudieron exportar los datos'
            );
        }
    } catch (error) {
        console.error('Error exportando datos:', error);
        sistemaNotificaciones.notificarError(
            'Error',
            'Ocurrió un error al exportar los datos'
        );
    }
}

// ==================== HISTORIAL ====================

function guardarEnHistorial(reporte) {
    let historial = JSON.parse(localStorage.getItem('historial_reportes') || '[]');
    historial.unshift(reporte);

    // Mantener solo los últimos 50
    historial = historial.slice(0, 50);

    localStorage.setItem('historial_reportes', JSON.stringify(historial));
}

function obtenerHistorial() {
    return JSON.parse(localStorage.getItem('historial_reportes') || '[]');
}

function renderizarHistorialReportes() {
    const historial = obtenerHistorial();

    if (historial.length === 0) {
        return `
      <div style="text-align: center; padding: 40px; color: var(--color-texto-secundario);">
        <div style="font-size: 48px; margin-bottom: 10px;">📜</div>
        <p>No hay reportes generados aún</p>
      </div>
    `;
    }

    return `
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Fecha</th>
          <th>Detalles</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${historial.map(reporte => `
          <tr>
            <td>
              <span class="badge badge-info">
                ${obtenerNombreTipoReporte(reporte.tipo)}
              </span>
            </td>
            <td>${formatearFecha(reporte.fecha)}</td>
            <td>${obtenerDetallesReporte(reporte)}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="abrirReporteHistorial('${reporte.ruta}')">
                👁️ Abrir
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function obtenerNombreTipoReporte(tipo) {
    const nombres = {
        'proyecto': 'Proyecto',
        'auditoria': 'Auditoría',
        'general': 'General',
        'backup': 'Backup'
    };
    return nombres[tipo] || tipo;
}

function obtenerDetallesReporte(reporte) {
    switch (reporte.tipo) {
        case 'proyecto':
            const proyecto = estadoActual.proyectos.find(p => p.id === reporte.proyecto_id);
            return proyecto ? proyecto.nombre : 'Proyecto eliminado';
        case 'auditoria':
            return 'Auditoría INVEA';
        case 'general':
            return `${reporte.opciones?.fechaInicio} - ${reporte.opciones?.fechaFin}`;
        case 'backup':
            return 'Respaldo completo';
        default:
            return 'N/A';
    }
}

async function abrirReporteHistorial(ruta) {
    try {
        await window.electronAPI.previsualizarPDF(ruta);
    } catch (error) {
        sistemaNotificaciones.notificarError(
            'Error',
            'No se pudo abrir el archivo. Es posible que haya sido movido o eliminado.'
        );
    }
}

function limpiarHistorialReportes() {
    if (confirm('¿Estás seguro de limpiar el historial? Los archivos PDF no se eliminarán.')) {
        localStorage.removeItem('historial_reportes');
        mostrarReportes();
        sistemaNotificaciones.notificarExito(
            'Historial Limpiado',
            'El historial de reportes ha sido limpiado'
        );
    }
}

// ==================== UTILIDADES ====================

function calcularNivelRiesgoLocal(puntuacion) {
    if (puntuacion >= 90) return { nivel: 'BAJO', color: '#2ecc71', mensaje: 'Excelente cumplimiento' };
    if (puntuacion >= 75) return { nivel: 'MEDIO', color: '#f39c12', mensaje: 'Cumplimiento aceptable' };
    if (puntuacion >= 60) return { nivel: 'ALTO', color: '#e67e22', mensaje: 'Riesgo de sanción' };
    return { nivel: 'CRÍTICO', color: '#e74c3c', mensaje: 'Riesgo de clausura' };
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}
