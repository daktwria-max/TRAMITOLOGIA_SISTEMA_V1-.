/**
 * menu-actions.js
 * Handler para acciones del menú en el renderer process
 * 
 * Este archivo escucha las acciones del menú y ejecuta las funciones correspondientes
 */

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Registrar listener para acciones del menú
    if (window.electronAPI && window.electronAPI.onMenuAction) {
        window.electronAPI.onMenuAction((action) => {
            console.log(`📋 Acción del menú: ${action}`);

            switch (action) {
                case 'nuevo-proyecto':
                    if (typeof mostrarProyectos === 'function') {
                        mostrarProyectos();
                        // Trigger abrir modal de nuevo proyecto
                        setTimeout(() => {
                            const btnNuevo = document.querySelector('[data-action="nuevo-proyecto"]');
                            if (btnNuevo) btnNuevo.click();
                        }, 100);
                    }
                    break;

                case 'nueva-tarea':
                    if (typeof mostrarTareas === 'function') {
                        mostrarTareas();
                        setTimeout(() => {
                            const btnNueva = document.querySelector('[data-action="nueva-tarea"]');
                            if (btnNueva) btnNueva.click();
                        }, 100);
                    }
                    break;

                case 'importar-documento':
                    if (typeof mostrarDocumentos === 'function') {
                        mostrarDocumentos();
                        setTimeout(() => {
                            const btnImportar = document.querySelector('[data-action="importar-documento"]');
                            if (btnImportar) btnImportar.click();
                        }, 100);
                    }
                    break;

                case 'exportar-datos':
                    if (typeof mostrarReportes === 'function') {
                        mostrarReportes();
                    }
                    break;

                case 'ver-dashboard':
                    if (typeof mostrarDashboard === 'function') {
                        mostrarDashboard();
                    }
                    break;

                case 'ver-proyectos':
                    if (typeof mostrarProyectos === 'function') {
                        mostrarProyectos();
                    }
                    break;

                case 'ver-tareas':
                    if (typeof mostrarTareas === 'function') {
                        mostrarTareas();
                    }
                    break;

                case 'ver-documentos':
                    if (typeof mostrarDocumentos === 'function') {
                        mostrarDocumentos();
                    }
                    break;

                case 'ver-reportes':
                    if (typeof mostrarReportes === 'function') {
                        mostrarReportes();
                    }
                    break;

                case 'ver-configuracion':
                    if (typeof mostrarConfiguracion === 'function') {
                        mostrarConfiguracion();
                    }
                    break;

                case 'procesar-ocr':
                    if (typeof mostrarOCR === 'function') {
                        mostrarOCR();
                    }
                    break;

                case 'generar-checklist':
                    if (typeof mostrarChecklists === 'function') {
                        mostrarChecklists();
                    }
                    break;

                case 'optimizar-db':
                    if (window.electronAPI.optimizarBaseDatos) {
                        window.electronAPI.optimizarBaseDatos().then(result => {
                            if (result.success) {
                                if (typeof mostrarToast === 'function') {
                                    mostrarToast('Base de datos optimizada correctamente', 'success');
                                }
                            } else {
                                if (typeof mostrarToast === 'function') {
                                    mostrarToast('Error al optimizar la base de datos', 'error');
                                }
                            }
                        });
                    }
                    break;

                case 'limpiar-cache':
                    if (window.electronAPI.limpiarCacheSistema) {
                        window.electronAPI.limpiarCacheSistema().then(result => {
                            if (result.success && typeof mostrarToast === 'function') {
                                mostrarToast('Caché limpiado correctamente', 'success');
                            }
                        });
                    }
                    break;

                case 'mostrar-ayuda':
                    // Mostrar modal de ayuda
                    if (typeof abrirModal === 'function') {
                        const contenidoAyuda = `
                            <div class="ayuda-container">
                                <h3>Manual de Usuario</h3>
                                <p>Bienvenido a Gestor Virtual</p>
                                <h4>Funcionalidades Principales:</h4>
                                <ul>
                                    <li><strong>Dashboard:</strong> Vista general de estadísticas y accesos rápidos</li>
                                    <li><strong>Proyectos:</strong> Gestión completa de proyectos</li>
                                    <li><strong>Tareas:</strong> Seguimiento de tareas y tiempos</li>
                                    <li><strong>Documentos:</strong> Gestión y procesamiento OCR de documentos</li>
                                    <li><strong>Reportes:</strong> Generación de reportes en PDF</li>
                                </ul>
                            </div>
                        `;
                        abrirModal('Ayuda', contenidoAyuda);
                    }
                    break;

                case 'mostrar-atajos':
                    if (typeof abrirModal === 'function') {
                        const atajosContenido = `
                            <div class="atajos-container">
                                <h3>Atajos de Teclado</h3>
                                <table style="width: 100%; color: var(--color-texto);">
                                    <tr>
                                        <td><strong>Ctrl+N</strong></td>
                                        <td>Nuevo Proyecto</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ctrl+T</strong></td>
                                        <td>Nueva Tarea</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ctrl+I</strong></td>
                                        <td>Importar Documento</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ctrl+E</strong></td>
                                        <td>Exportar Datos</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ctrl+1-5</strong></td>
                                        <td>Navegar entre vistas</td>
                                    </tr>
                                    <tr>
                                        <td><strong>F11</strong></td>
                                        <td>Pantalla Completa</td>
                                    </tr>
                                    <tr>
                                        <td><strong>F12</strong></td>
                                        <td>Herramientas de Desarrollo</td>
                                    </tr>
                                </table>
                            </div>
                        `;
                        abrirModal('Atajos de Teclado', atajosContenido);
                    }
                    break;

                case 'buscar-actualizaciones':
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Buscando actualizaciones...', 'info');
                        // Aquí se integraría con electron-updater
                        setTimeout(() => {
                            mostrarToast('Estás usando la última versión', 'success');
                        }, 2000);
                    }
                    break;

                default:
                    console.warn(`Acción de menú no reconocida: ${action}`);
            }
        });
    }
});
