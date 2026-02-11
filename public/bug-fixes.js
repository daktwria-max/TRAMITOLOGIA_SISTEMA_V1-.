// ==================== CORRECCIONES DE BUGS ====================

// Bug Fix 1: Prevenir múltiples clics en botones
function prevenirMultiplesClics() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && !btn.disabled) {
            // Deshabilitar temporalmente
            btn.disabled = true;
            setTimeout(() => {
                btn.disabled = false;
            }, 500);
        }
    });
}

// Bug Fix 2: Cerrar modales con tecla ESC
function habilitarCerrarModalesConESC() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modales = document.querySelectorAll('.modal.active');
            modales.forEach(modal => {
                const closeBtn = modal.querySelector('.close-btn');
                if (closeBtn) closeBtn.click();
            });
        }
    });
}

// Bug Fix 3: Validar formularios antes de enviar
function validarFormulariosAutomaticamente() {
    document.addEventListener('submit', (e) => {
        const form = e.target;
        const inputs = form.querySelectorAll('[required]');

        let valido = true;
        inputs.forEach(input => {
            if (!input.value.trim()) {
                valido = false;
                input.classList.add('input-error');

                // Remover clase después de 2 segundos
                setTimeout(() => {
                    input.classList.remove('input-error');
                }, 2000);
            }
        });

        if (!valido) {
            e.preventDefault();
            sistemaNotificaciones?.notificarAdvertencia(
                'Campos Requeridos',
                'Por favor completa todos los campos obligatorios'
            );
        }
    });
}

// Bug Fix 4: Limpiar inputs al cerrar modales
function limpiarInputsAlCerrarModales() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('modal')) {
                    // Modal fue removido, limpiar cualquier estado temporal
                    const forms = node.querySelectorAll('form');
                    forms.forEach(form => form.reset());
                }
            });
        });
    });

    observer.observe(document.body, { childList: true });
}

// Bug Fix 5: Prevenir pérdida de datos al recargar
function prevenirPerdidaDeDatos() {
    let hayDatosNoGuardados = false;

    // Detectar cambios en formularios
    document.addEventListener('input', (e) => {
        if (e.target.closest('form')) {
            hayDatosNoGuardados = true;
        }
    });

    // Limpiar flag al guardar
    document.addEventListener('submit', () => {
        hayDatosNoGuardados = false;
    });

    // Advertir antes de cerrar
    window.addEventListener('beforeunload', (e) => {
        if (hayDatosNoGuardados) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
}

// Bug Fix 6: Manejar errores de red
function manejarErroresDeRed() {
    window.addEventListener('online', () => {
        sistemaNotificaciones?.notificarExito(
            'Conexión Restaurada',
            'La conexión a internet se ha restablecido'
        );
    });

    window.addEventListener('offline', () => {
        sistemaNotificaciones?.notificarAdvertencia(
            'Sin Conexión',
            'No hay conexión a internet. Algunas funciones pueden no estar disponibles'
        );
    });
}

// Bug Fix 7: Scroll suave al cambiar de vista
function scrollSuaveAlCambiarVista() {
    const cambiarVistaOriginal = window.cambiarVista;

    window.cambiarVista = function (vista) {
        // Scroll al inicio
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.scrollTop = 0;
        }

        // Llamar a la función original
        return cambiarVistaOriginal.call(this, vista);
    };
}

// Bug Fix 8: Formatear fechas correctamente en todos los navegadores
function normalizarFechas() {
    // Crear función global para formatear fechas consistentemente
    window.formatearFechaSegura = function (fecha) {
        if (!fecha) return 'N/A';

        try {
            // Asegurar que la fecha tenga el formato correcto
            let d;
            if (fecha.includes('T')) {
                d = new Date(fecha);
            } else {
                // Agregar hora para evitar problemas de zona horaria
                d = new Date(fecha + 'T12:00:00');
            }

            if (isNaN(d.getTime())) {
                return 'Fecha inválida';
            }

            return d.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Error en fecha';
        }
    };
}

// Bug Fix 9: Prevenir inyección de HTML
function sanitizarHTML() {
    window.sanitizarTexto = function (texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    };
}

// Bug Fix 10: Manejar errores de localStorage
function manejarErroresLocalStorage() {
    const setItemOriginal = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key, value) {
        try {
            setItemOriginal.call(this, key, value);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('LocalStorage lleno. Limpiando datos antiguos...');
                sistemaNotificaciones?.notificarAdvertencia(
                    'Almacenamiento Lleno',
                    'Se están limpiando datos antiguos para liberar espacio'
                );

                // Limpiar datos antiguos
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('cache_') || key.startsWith('temp_')) {
                        keysToRemove.push(key);
                    }
                }

                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Intentar guardar nuevamente
                try {
                    setItemOriginal.call(this, key, value);
                } catch (e) {
                    console.error('No se pudo guardar en localStorage:', e);
                }
            } else {
                console.error('Error en localStorage:', error);
            }
        }
    };
}

// Bug Fix 11: Debounce para búsquedas
function crearDebounce() {
    window.debounce = function (func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
}

// Bug Fix 12: Lazy loading de imágenes
function habilitarLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        // Observar todas las imágenes con data-src
        const observarImagenes = () => {
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        };

        // Observar al cargar y cuando cambie el DOM
        observarImagenes();

        const mutationObserver = new MutationObserver(observarImagenes);
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Bug Fix 13: Manejo de errores global
function configurarManejoGlobalErrores() {
    window.addEventListener('error', (event) => {
        console.error('Error global capturado:', event.error);

        // No mostrar notificación para errores de recursos
        if (event.filename) {
            return;
        }

        sistemaNotificaciones?.notificarError(
            'Error Inesperado',
            'Ocurrió un error. Por favor recarga la aplicación si el problema persiste.'
        );
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promesa rechazada no manejada:', event.reason);

        sistemaNotificaciones?.notificarError(
            'Error de Operación',
            'No se pudo completar la operación. Intenta nuevamente.'
        );
    });
}

// Bug Fix 14: Optimizar rendimiento de listas largas
function optimizarListasLargas() {
    window.renderizarListaPaginada = function (items, renderFn, contenedorId, itemsPorPagina = 20) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        let paginaActual = 0;
        const totalPaginas = Math.ceil(items.length / itemsPorPagina);

        function renderizarPagina(pagina) {
            const inicio = pagina * itemsPorPagina;
            const fin = inicio + itemsPorPagina;
            const itemsPagina = items.slice(inicio, fin);

            const html = itemsPagina.map(renderFn).join('');

            if (pagina === 0) {
                contenedor.innerHTML = html;
            } else {
                contenedor.innerHTML += html;
            }
        }

        // Renderizar primera página
        renderizarPagina(0);

        // Infinite scroll
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && paginaActual < totalPaginas - 1) {
                paginaActual++;
                renderizarPagina(paginaActual);
            }
        });

        // Observar el último elemento
        const observarUltimoElemento = () => {
            const ultimoElemento = contenedor.lastElementChild;
            if (ultimoElemento) {
                observer.observe(ultimoElemento);
            }
        };

        observarUltimoElemento();
    };
}

// Bug Fix 15: Validación de datos antes de enviar a la BD
function validarDatosAntesDeGuardar() {
    const funcionesOriginales = {
        crearProyecto: window.electronAPI?.crearProyecto,
        crearTarea: window.electronAPI?.crearTarea
    };

    if (window.electronAPI) {
        // Validar proyectos
        window.electronAPI.crearProyecto = async function (datos) {
            if (!datos.nombre || datos.nombre.trim().length === 0) {
                throw new Error('El nombre del proyecto es requerido');
            }
            if (!datos.clasificacion) {
                throw new Error('La clasificación del proyecto es requerida');
            }
            return funcionesOriginales.crearProyecto.call(this, datos);
        };

        // Validar tareas
        window.electronAPI.crearTarea = async function (datos) {
            if (!datos.titulo || datos.titulo.trim().length === 0) {
                throw new Error('El título de la tarea es requerido');
            }
            return funcionesOriginales.crearTarea.call(this, datos);
        };
    }
}

// ==================== INICIALIZAR TODAS LAS CORRECCIONES ====================

function inicializarCorrecciones() {
    console.log('🔧 Aplicando correcciones de bugs...');

    try {
        prevenirMultiplesClics();
        habilitarCerrarModalesConESC();
        validarFormulariosAutomaticamente();
        limpiarInputsAlCerrarModales();
        prevenirPerdidaDeDatos();
        manejarErroresDeRed();
        scrollSuaveAlCambiarVista();
        normalizarFechas();
        sanitizarHTML();
        manejarErroresLocalStorage();
        crearDebounce();
        habilitarLazyLoading();
        configurarManejoGlobalErrores();
        optimizarListasLargas();
        validarDatosAntesDeGuardar();

        console.log('✅ Correcciones aplicadas exitosamente');
    } catch (error) {
        console.error('❌ Error aplicando correcciones:', error);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCorrecciones);
} else {
    inicializarCorrecciones();
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { inicializarCorrecciones };
}
