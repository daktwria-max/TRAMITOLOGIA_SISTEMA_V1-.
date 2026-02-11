// ==================== SISTEMA DE TEMAS ====================

const TEMAS = {
    oscuro_profesional: {
        nombre: 'Oscuro Profesional',
        colores: {
            primario: '#e94560',
            secundario: '#0f3460',
            acento: '#16213e',
            fondo: '#1a1a2e',
            texto: '#e4e4e4',
            textoSecundario: '#94a3b8',
            exito: '#2ecc71',
            advertencia: '#f39c12',
            peligro: '#e74c3c',
            info: '#3498db'
        },
        fuente: {
            principal: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            codigo: 'Monaco, Consolas, "Courier New", monospace'
        },
        espaciado: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px'
        },
        bordes: {
            radio: '12px',
            radioSmall: '6px',
            radioLarge: '16px'
        },
        sombras: {
            sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
            md: '0 4px 8px rgba(0, 0, 0, 0.2)',
            lg: '0 8px 16px rgba(0, 0, 0, 0.3)',
            xl: '0 12px 24px rgba(0, 0, 0, 0.4)'
        }
    },

    claro_moderno: {
        nombre: 'Claro Moderno',
        colores: {
            primario: '#2563eb',
            secundario: '#f1f5f9',
            acento: '#e2e8f0',
            fondo: '#ffffff',
            texto: '#1e293b',
            textoSecundario: '#64748b',
            exito: '#10b981',
            advertencia: '#f59e0b',
            peligro: '#ef4444',
            info: '#06b6d4'
        },
        fuente: {
            principal: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            codigo: 'Monaco, Consolas, "Courier New", monospace'
        },
        espaciado: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px'
        },
        bordes: {
            radio: '8px',
            radioSmall: '4px',
            radioLarge: '12px'
        },
        sombras: {
            sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
            md: '0 4px 6px rgba(0, 0, 0, 0.07)',
            lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
            xl: '0 20px 25px rgba(0, 0, 0, 0.15)'
        }
    },

    azul_corporativo: {
        nombre: 'Azul Corporativo',
        colores: {
            primario: '#1e40af',
            secundario: '#1e3a8a',
            acento: '#3b82f6',
            fondo: '#0f172a',
            texto: '#f1f5f9',
            textoSecundario: '#94a3b8',
            exito: '#059669',
            advertencia: '#d97706',
            peligro: '#dc2626',
            info: '#0891b2'
        },
        fuente: {
            principal: '"Inter", -apple-system, sans-serif',
            codigo: '"Fira Code", monospace'
        },
        espaciado: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px'
        },
        bordes: {
            radio: '10px',
            radioSmall: '5px',
            radioLarge: '15px'
        },
        sombras: {
            sm: '0 2px 4px rgba(0, 0, 0, 0.2)',
            md: '0 4px 8px rgba(0, 0, 0, 0.3)',
            lg: '0 8px 16px rgba(0, 0, 0, 0.4)',
            xl: '0 12px 24px rgba(0, 0, 0, 0.5)'
        }
    },

    verde_natural: {
        nombre: 'Verde Natural',
        colores: {
            primario: '#059669',
            secundario: '#064e3b',
            acento: '#10b981',
            fondo: '#022c22',
            texto: '#ecfdf5',
            textoSecundario: '#86efac',
            exito: '#22c55e',
            advertencia: '#eab308',
            peligro: '#ef4444',
            info: '#14b8a6'
        },
        fuente: {
            principal: '"Poppins", sans-serif',
            codigo: '"Source Code Pro", monospace'
        },
        espaciado: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px'
        },
        bordes: {
            radio: '14px',
            radioSmall: '7px',
            radioLarge: '20px'
        },
        sombras: {
            sm: '0 2px 4px rgba(0, 0, 0, 0.15)',
            md: '0 4px 8px rgba(0, 0, 0, 0.25)',
            lg: '0 8px 16px rgba(0, 0, 0, 0.35)',
            xl: '0 12px 24px rgba(0, 0, 0, 0.45)'
        }
    }
};

// ==================== CONFIGURACIÓN DE USUARIO ====================

const CONFIGURACION_DEFAULT = {
    tema: 'oscuro_profesional',
    sidebar: {
        expandido: true,
        ancho: 250,
        posicion: 'izquierda'
    },
    dashboard: {
        layout: 'grid',
        widgets: ['estadisticas', 'alertas', 'tareas_recientes', 'proyectos_activos']
    },
    notificaciones: {
        habilitadas: true,
        sonido: true,
        desktop: true
    },
    idioma: 'es',
    formato_fecha: 'DD/MM/YYYY',
    zona_horaria: 'America/Mexico_City',
    accesibilidad: {
        alto_contraste: false,
        tamano_fuente: 'normal',
        animaciones: true
    },
    modulos_activos: [
        'dashboard',
        'proyectos',
        'tareas',
        'tiempo',
        'documentos',
        'ocr',
        'checklists',
        'reportes',
        'alertas',
        'marcoJuridico',
        'sistema_aprendizaje',
        'chatbot'
    ]
};


// ==================== GESTIÓN DE CONFIGURACIÓN ====================

class ConfiguracionManager {
    constructor() {
        this.config = this.cargarConfiguracion();
        this.tema = TEMAS[this.config.tema];
    }

    cargarConfiguracion() {
        const configGuardada = localStorage.getItem('gestor_virtual_config');
        if (configGuardada) {
            try {
                return { ...CONFIGURACION_DEFAULT, ...JSON.parse(configGuardada) };
            } catch (e) {
                console.error('Error cargando configuración:', e);
                return CONFIGURACION_DEFAULT;
            }
        }
        return CONFIGURACION_DEFAULT;
    }

    guardarConfiguracion() {
        localStorage.setItem('gestor_virtual_config', JSON.stringify(this.config));
        this.aplicarTema();
    }

    cambiarTema(nombreTema) {
        if (TEMAS[nombreTema]) {
            this.config.tema = nombreTema;
            this.tema = TEMAS[nombreTema];
            this.guardarConfiguracion();
            return true;
        }
        return false;
    }

    aplicarTema() {
        const tema = this.tema;
        const root = document.documentElement;

        // Aplicar variables CSS
        Object.entries(tema.colores).forEach(([nombre, valor]) => {
            root.style.setProperty(`--color-${nombre}`, valor);
        });

        root.style.setProperty('--fuente-principal', tema.fuente.principal);
        root.style.setProperty('--fuente-codigo', tema.fuente.codigo);

        Object.entries(tema.espaciado).forEach(([nombre, valor]) => {
            root.style.setProperty(`--espaciado-${nombre}`, valor);
        });

        Object.entries(tema.bordes).forEach(([nombre, valor]) => {
            root.style.setProperty(`--borde-${nombre}`, valor);
        });

        Object.entries(tema.sombras).forEach(([nombre, valor]) => {
            root.style.setProperty(`--sombra-${nombre}`, valor);
        });

        // Aplicar clase de tema al body
        document.body.className = `tema-${this.config.tema}`;
    }

    actualizarConfiguracion(seccion, valores) {
        this.config[seccion] = { ...this.config[seccion], ...valores };
        this.guardarConfiguracion();
    }

    obtenerConfiguracion(seccion) {
        return seccion ? this.config[seccion] : this.config;
    }

    resetearConfiguracion() {
        this.config = { ...CONFIGURACION_DEFAULT };
        this.tema = TEMAS[this.config.tema];
        this.guardarConfiguracion();
    }

    moduloActivo(nombreModulo) {
        return this.config.modulos_activos.includes(nombreModulo);
    }

    toggleModulo(nombreModulo) {
        const index = this.config.modulos_activos.indexOf(nombreModulo);
        if (index > -1) {
            this.config.modulos_activos.splice(index, 1);
        } else {
            this.config.modulos_activos.push(nombreModulo);
        }
        this.guardarConfiguracion();
    }
}

// Instancia global
const configManager = new ConfiguracionManager();

// ==================== EXPORTAR ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TEMAS,
        CONFIGURACION_DEFAULT,
        ConfiguracionManager,
        configManager
    };
}
