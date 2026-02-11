// ==================== PANEL DE RENDIMIENTO ====================

async function mostrarPanelRendimiento() {
    try {
        const resultado = await window.electronAPI.obtenerEstadisticasRendimiento();

        if (!resultado.success) {
            throw new Error('Error obteniendo estadísticas');
        }

        const stats = resultado.data;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'modalRendimiento';

        modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h2>⚡ Rendimiento del Sistema</h2>
          <button class="close-btn" onclick="cerrarModal('modalRendimiento')">×</button>
        </div>

        <div class="modal-body">
          <!-- CPU -->
          <div class="performance-section">
            <h3>🖥️ CPU</h3>
            <div class="performance-grid">
              <div class="performance-item">
                <strong>Núcleos:</strong>
                <span>${stats.cpu.nucleos}</span>
              </div>
              <div class="performance-item">
                <strong>Uso Usuario:</strong>
                <span>${(stats.cpu.uso.user / 1000).toFixed(2)}ms</span>
              </div>
              <div class="performance-item">
                <strong>Uso Sistema:</strong>
                <span>${(stats.cpu.uso.system / 1000).toFixed(2)}ms</span>
              </div>
            </div>
          </div>

          <!-- Memoria -->
          <div class="performance-section">
            <h3>💾 Memoria</h3>
            <div class="performance-grid">
              <div class="performance-item">
                <strong>Total:</strong>
                <span>${stats.memoria.total.toFixed(2)} GB</span>
              </div>
              <div class="performance-item">
                <strong>Libre:</strong>
                <span>${stats.memoria.libre.toFixed(2)} GB</span>
              </div>
              <div class="performance-item">
                <strong>Proceso:</strong>
                <span>${stats.memoria.proceso.toFixed(2)} MB</span>
              </div>
            </div>
            <div class="memory-bar">
              <div class="memory-fill" 
                   style="width: ${((stats.memoria.total - stats.memoria.libre) / stats.memoria.total) * 100}%;">
              </div>
            </div>
          </div>

          <!-- Caché -->
          <div class="performance-section">
            <h3>🗄️ Caché</h3>
            <div class="performance-grid">
              <div class="performance-item">
                <strong>Tamaño:</strong>
                <span>${stats.cache.tamaño} / ${stats.cache.maxTamaño}</span>
              </div>
              <div class="performance-item">
                <strong>Aciertos:</strong>
                <span>${stats.cache.aciertos}</span>
              </div>
              <div class="performance-item">
                <strong>Fallos:</strong>
                <span>${stats.cache.fallos}</span>
              </div>
              <div class="performance-item">
                <strong>Tasa de Acierto:</strong>
                <span>${stats.cache.tasaAcierto}</span>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="performance-actions">
            <button class="btn btn-secondary" onclick="limpiarCacheSistema()">
              🧹 Limpiar Caché
            </button>
            <button class="btn btn-secondary" onclick="optimizarBaseDatos()">
              🔧 Optimizar Base de Datos
            </button>
            <button class="btn btn-primary" onclick="actualizarEstadisticasRendimiento()">
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error mostrando panel de rendimiento:', error);
        sistemaNotificaciones.notificarError('Error', error.message);
    }
}

async function limpiarCacheSistema() {
    const notifId = sistemaNotificaciones.notificarInfo(
        'Limpiando Caché...',
        'Esto puede tardar unos momentos',
        0
    );

    try {
        const resultado = await window.electronAPI.limpiarCacheSistema();

        sistemaNotificaciones.cerrarNotificacion(notifId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Caché Limpiado',
                'El caché del sistema ha sido limpiado exitosamente'
            );

            await actualizarEstadisticasRendimiento();
        }

    } catch (error) {
        sistemaNotificaciones.cerrarNotificacion(notifId);
        console.error('Error limpiando caché:', error);
        sistemaNotificaciones.notificarError('Error', error.message);
    }
}

async function optimizarBaseDatos() {
    const notifId = sistemaNotificaciones.notificarInfo(
        'Optimizando Base de Datos...',
        'Esto puede tardar varios minutos',
        0
    );

    try {
        const resultado = await window.electronAPI.optimizarBaseDatos();

        sistemaNotificaciones.cerrarNotificacion(notifId);

        if (resultado.success) {
            sistemaNotificaciones.notificarExito(
                'Base de Datos Optimizada',
                'La base de datos ha sido optimizada exitosamente'
            );
        }

    } catch (error) {
        sistemaNotificaciones.cerrarNotificacion(notifId);
        console.error('Error optimizando base de datos:', error);
        sistemaNotificaciones.notificarError('Error', error.message);
    }
}

async function actualizarEstadisticasRendimiento() {
    cerrarModal('modalRendimiento');
    await mostrarPanelRendimiento();
}
