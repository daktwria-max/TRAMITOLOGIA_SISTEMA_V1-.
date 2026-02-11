
const sistemaNotificaciones = {
    inicializar: () => {
        console.log('🔔 Inicializando Sistema de Notificaciones UI...');
        const btnNotifications = document.getElementById('btnNotifications');

        if (btnNotifications) {
            btnNotifications.addEventListener('click', sistemaNotificaciones.toggleNotificaciones);
            // Cargar inicial
            sistemaNotificaciones.actualizarBadge();

            // Actualizar cada 60 segundos
            setInterval(sistemaNotificaciones.actualizarBadge, 60000);
        } else {
            console.error('❌ Botón de notificaciones no encontrado');
        }
    },

    toggleNotificaciones: async (e) => {
        e.stopPropagation();
        let contenedor = document.getElementById('panelNotificaciones');

        if (contenedor) {
            contenedor.classList.toggle('active');
        } else {
            sistemaNotificaciones.crearPanel();
        }
    },

    crearPanel: async () => {
        const btn = document.getElementById('btnNotifications');
        const panel = document.createElement('div');
        panel.id = 'panelNotificaciones';
        panel.className = 'notificaciones-panel';

        // Posicionar debajo del botón
        const rect = btn.getBoundingClientRect();
        panel.style.top = `${rect.bottom + 10}px`;
        panel.style.right = '20px'; // Alinear a la derecha

        document.body.appendChild(panel);

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.remove('active');
            }
        });

        await sistemaNotificaciones.cargarNotificaciones();
        panel.classList.add('active');
    },

    cargarNotificaciones: async () => {
        const panel = document.getElementById('panelNotificaciones');
        if (!panel) return;

        panel.innerHTML = `
            <div class="notificaciones-header">
                <h3>🔔 Notificaciones</h3>
                <button onclick="sistemaNotificaciones.marcarTodasLeidas()" class="btn-text">Marcar todo leído</button>
            </div>
            <div class="notificaciones-lista" id="listaNotificaciones">
                <div style="padding: 20px; text-align: center;">Cargando...</div>
            </div>
        `;

        try {
            const resultado = await window.electronAPI.obtenerAlertasPendientes();
            const alertas = resultado.success ? resultado.data : [];
            const lista = document.getElementById('listaNotificaciones');

            if (alertas.length === 0) {
                lista.innerHTML = `
                    <div class="empty-state-small">
                        <span style="font-size: 24px;">✓</span>
                        <p>No tienes notificaciones nuevas</p>
                    </div>
                `;
            } else {
                lista.innerHTML = alertas.map(alerta => `
                    <div class="notificacion-item ${alerta.tipo_alerta?.toLowerCase() || 'info'}" onclick="sistemaNotificaciones.verAlerta('${alerta.id}')">
                        <div class="notificacion-icon">
                            ${sistemaNotificaciones.obtenerIcono(alerta.tipo_alerta)}
                        </div>
                        <div class="notificacion-content">
                            <div class="notificacion-titulo">${alerta.titulo || 'Notificación'}</div>
                            <div class="notificacion-mensaje">${alerta.mensaje}</div>
                            <div class="notificacion-fecha">${new Date(alerta.fecha_creacion).toLocaleDateString()}</div>
                        </div>
                        <button class="btn-icon-small" onclick="event.stopPropagation(); sistemaNotificaciones.marcarLeida('${alerta.id}')" title="Marcar leída">
                            ×
                        </button>
                    </div>
                `).join('');
            }

            sistemaNotificaciones.actualizarBadge(alertas.length);

        } catch (error) {
            console.error('Error cargando notificaciones:', error);
            panel.querySelector('#listaNotificaciones').innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--danger);">Error al cargar notificaciones</div>
            `;
        }
    },

    actualizarBadge: async (count = null) => {
        if (count === null) {
            try {
                const res = await window.electronAPI.obtenerAlertasPendientes();
                count = res.success ? res.data.length : 0;
            } catch (e) {
                count = 0;
            }
        }

        const badge = document.querySelector('.topbar-btn-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    marcarLeida: async (id) => {
        try {
            await window.electronAPI.marcarAlertaLeida(id);
            sistemaNotificaciones.cargarNotificaciones(); // Recargar lista
            sistemaNotificaciones.verificarSistema(); // Actualizar estado global
        } catch (error) {
            console.error('Error marcando leída:', error);
        }
    },

    marcarTodasLeidas: async () => {
        // Implementación pendiente en backend, por ahora iteramos (ineficiente pero funcional)
        const res = await window.electronAPI.obtenerAlertasPendientes();
        if (res.success) {
            for (let alerta of res.data) {
                await window.electronAPI.marcarAlertaLeida(alerta.id);
            }
            sistemaNotificaciones.cargarNotificaciones();
        }
    },

    verAlerta: (id) => {
        // Lógica para navegar a la alerta si es necesario
        console.log('Viendo alerta:', id);
    },

    obtenerIcono: (tipo) => {
        switch (tipo) {
            case 'CRITICA': return '🔴';
            case 'ADVERTENCIA': return '⚠️';
            case 'EXITO': return '✅';
            default: return 'ℹ️';
        }
    },

    // Métodos para notificaciones TOAST (emergentes temporales)
    notificarExito: (titulo, mensaje) => sistemaNotificaciones.mostrarToast(titulo, mensaje, 'success'),
    notificarError: (titulo, mensaje) => sistemaNotificaciones.mostrarToast(titulo, mensaje, 'error'),
    notificarInfo: (titulo, mensaje) => sistemaNotificaciones.mostrarToast(titulo, mensaje, 'info'),
    notificarAdvertencia: (titulo, mensaje) => sistemaNotificaciones.mostrarToast(titulo, mensaje, 'warning'),

    mostrarToast: (titulo, mensaje, tipo = 'info') => {
        const container = document.getElementById('toast-container') || sistemaNotificaciones.crearToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `
            <div class="toast-icon">${sistemaNotificaciones.obtenerIconoToast(tipo)}</div>
            <div class="toast-content">
                <div class="toast-title">${titulo}</div>
                <div class="toast-message">${mensaje}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // Auto eliminar
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    crearToastContainer: () => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.className = 'toast-container';
        document.body.appendChild(div);
        return div;
    },

    obtenerIconoToast: (tipo) => {
        switch (tipo) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', sistemaNotificaciones.inicializar);

// Exponer globalmente para uso en otros scripts
window.sistemaNotificaciones = sistemaNotificaciones;
