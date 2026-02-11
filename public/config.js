// ==================== GESTOR DE CONFIGURACIÓN ====================

const CONFIG_DEFAULT = {
    tema: 'oscuro', // 'oscuro', 'claro', 'sistema'
    vista_inicial: 'dashboard',
    modulos_activos: [
        'dashboard',
        'proyectos',
        'tareas',
        'documentos',
        'ocr',
        'checklists',
        'marcoJuridico',
        'organizadorArchivos',
        'reportes',
        'sistema_aprendizaje' // NUEVO
    ],
    dashboard: {
        widgets: ['estadisticas', 'alertas', 'marco_juridico', 'tareas_recientes', 'proyectos_activos']
    },
    notificaciones: {
        sonido: true,
        escritorio: true,
        email: false
    },
    sidebar: {
        expandido: true
    }
};

class ConfigManager {
    constructor() {
        this.config = this.cargarConfiguracion();
    }

    cargarConfiguracion() {
        try {
            const savedConfig = localStorage.getItem('gestor_config');
            return savedConfig ? { ...CONFIG_DEFAULT, ...JSON.parse(savedConfig) } : CONFIG_DEFAULT;
        } catch (e) {
            console.error('Error cargando configuración:', e);
            return CONFIG_DEFAULT;
        }
    }

    guardarConfiguracion() {
        try {
            localStorage.setItem('gestor_config', JSON.stringify(this.config));
        } catch (e) {
            console.error('Error guardando configuración:', e);
        }
    }

    obtenerConfiguracion(clave = null) {
        if (clave) {
            return this.config[clave];
        }
        return this.config;
    }

    actualizarConfiguracion(clave, valor) {
        if (typeof valor === 'object' && !Array.isArray(valor)) {
            this.config[clave] = { ...this.config[clave], ...valor };
        } else {
            this.config[clave] = valor;
        }
        this.guardarConfiguracion();

        // Aplicar cambios inmediatos
        if (clave === 'tema') {
            this.aplicarTema();
        }
    }

    aplicarTema() {
        const tema = this.config.tema;
        const root = document.documentElement;

        if (tema === 'claro') {
            root.style.setProperty('--color-fondo', '#f4f6f8');
            root.style.setProperty('--color-secundario', '#ffffff');
            root.style.setProperty('--color-acento', '#e1e4e8');
            root.style.setProperty('--color-texto', '#2c3e50');
            root.style.setProperty('--color-texto-secundario', '#607d8b');
        } else {
            // Tema oscuro (por defecto)
            root.style.setProperty('--color-fondo', '#1a1a2e');
            root.style.setProperty('--color-secundario', '#0f3460');
            root.style.setProperty('--color-acento', '#16213e');
            root.style.setProperty('--color-texto', '#e4e4e4');
            root.style.setProperty('--color-texto-secundario', '#94a3b8');
        }
    }
}

// Instancia global
const configManager = new ConfigManager();
