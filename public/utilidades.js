// ==================== UTILIDADES GLOBALES ====================

/**
 * Escapar HTML para prevenir XSS
 */
function escaparHTML(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Formatear fecha en formato corto
 */
function formatearFechaCorta(fecha) {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Mostrar toast de notificación
 */
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${tipo === 'success' ? '#2ecc71' : tipo === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Abrir modal
 */
function abrirModal(titulo, contenido) {
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="cerrarModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>${titulo}</h2>
                <button class="modal-close" onclick="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
                ${contenido}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

/**
 * Cerrar modal
 */
function cerrarModal(modalId = 'modal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    } else {
        // Fallback: Si no se encuentra por ID, buscar cualquier modal activo
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            setTimeout(() => activeModal.remove(), 300);
        }
    }
}

/**
 * Confirmar acción
 */
function confirmar(mensaje, callback) {
    const contenido = `
        <p style="margin-bottom: 24px; font-size: 16px;">${mensaje}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="cerrarModal(); (${callback})()">Confirmar</button>
        </div>
    `;
    abrirModal('Confirmar', contenido);
}

// Estilos CSS para modales y toasts
const estilosUtilidades = document.createElement('style');
estilosUtilidades.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .modal.active {
        opacity: 1;
    }
    
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
    }
    
    .modal-content {
        position: relative;
        background: var(--color-secundario);
        border-radius: 16px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .modal.active .modal-content {
        transform: scale(1);
    }
    
    .modal-header {
        padding: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .modal-header h2 {
        margin: 0;
        font-size: 24px;
        color: var(--color-texto);
    }
    
    .modal-close {
        background: none;
        border: none;
        color: var(--color-texto);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s ease;
    }
    
    .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .modal-body {
        padding: 24px;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-label {
        display: block;
        margin-bottom: 8px;
        color: var(--color-texto);
        font-weight: 500;
        font-size: 14px;
    }
    
    .form-input,
    .form-textarea,
    .form-select {
        width: 100%;
        padding: 12px 16px;
        background: var(--color-acento);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: var(--color-texto);
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s ease;
    }
    
    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
        outline: none;
        border-color: var(--color-primario);
    }
    
    .form-textarea {
        min-height: 100px;
        resize: vertical;
    }
    
    .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    
    .btn-primary {
        background: var(--color-primario);
        color: white;
    }
    
    .btn-primary:hover {
        background: color-mix(in srgb, var(--color-primario) 85%, black);
        transform: translateY(-2px);
    }
    
    .btn-secondary {
        background: var(--color-acento);
        color: var(--color-texto);
    }
    
    .btn-secondary:hover {
        background: color-mix(in srgb, var(--color-acento) 85%, white);
    }
    
    .btn-danger {
        background: var(--color-peligro);
        color: white;
    }
    
    .btn-danger:hover {
        background: color-mix(in srgb, var(--color-peligro) 85%, black);
    }
    
    .btn-success {
        background: var(--color-exito);
        color: white;
    }
    
    .btn-success:hover {
        background: color-mix(in srgb, var(--color-exito) 85%, black);
    }
    
    .section-container {
        padding: 30px;
        max-width: 1600px;
        margin: 0 auto;
    }
    
    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 32px;
    }
    
    .section-header h1 {
        font-size: 32px;
        font-weight: 700;
        color: var(--color-texto);
        margin: 0;
    }
    
    .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 24px;
    }
    
    .card {
        background: var(--color-secundario);
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }
    
    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }
    
    .card-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-texto);
        margin: 0;
    }
    
    .card-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .badge-activo {
        background: var(--color-exito);
        color: white;
    }
    
    .badge-pendiente {
        background: var(--color-advertencia);
        color: white;
    }
    
    .badge-completado {
        background: var(--color-info);
        color: white;
    }
    
    .card-description {
        color: var(--color-texto-secundario);
        font-size: 14px;
        margin-bottom: 16px;
        line-height: 1.5;
    }
    
    .card-meta {
        display: flex;
        gap: 16px;
        font-size: 13px;
        color: var(--color-texto-secundario);
        margin-bottom: 16px;
    }
    
    .card-actions {
        display: flex;
        gap: 8px;
    }
    
    .empty-state {
        text-align: center;
        padding: 60px 20px;
    }
    
    .empty-state-icon {
        font-size: 64px;
        margin-bottom: 16px;
    }
    
    .empty-state h3 {
        font-size: 24px;
        color: var(--color-texto);
        margin-bottom: 8px;
    }
    
    .empty-state p {
        color: var(--color-texto-secundario);
        margin-bottom: 24px;
    }
`;

document.head.appendChild(estilosUtilidades);

console.log('✅ Utilidades globales cargadas');
