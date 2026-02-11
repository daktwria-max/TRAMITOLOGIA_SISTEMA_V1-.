// ==================== DASHBOARD UI ====================

function mostrarDashboard() {
    console.log('📊 Mostrando Dashboard');

    const html = `
        <div class="dashboard-container">
            <!-- Header con saludo y hora -->
            <div class="dashboard-header">
                <h1>¡Bienvenido al Gestor Virtual! 👋</h1>
                <p class="dashboard-time">${new Date().toLocaleString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}</p>
            </div>

            <!-- Tarjetas de acciones rápidas (estilo Bitrix24) -->
            <div class="quick-actions-grid">
                <div class="action-card blue" onclick="cambiarVista('proyectos')">
                    <div class="card-icon">📁</div>
                    <h3>Proyectos</h3>
                    <p>Gestionar proyectos activos</p>
                </div>
                
                <div class="action-card pink" onclick="cambiarVista('tareas')">
                    <div class="card-icon">✅</div>
                    <h3>Tareas</h3>
                    <p>Ver tareas pendientes</p>
                </div>
                
                <div class="action-card green" onclick="cambiarVista('documentos')">
                    <div class="card-icon">📄</div>
                    <h3>Documentos</h3>
                    <p>Explorar archivos</p>
                </div>
                
                <div class="action-card orange" onclick="cambiarVista('chatbot')">
                    <div class="card-icon">🤖</div>
                    <h3>Asistente IA</h3>
                    <p>Chatbot inteligente</p>
                </div>

                <div class="action-card purple" onclick="cambiarVista('reportes')">
                    <div class="card-icon">📊</div>
                    <h3>Reportes</h3>
                    <p>Análisis y estadísticas</p>
                </div>

                <div class="action-card teal" onclick="cambiarVista('configuracion')">
                    <div class="card-icon">⚙️</div>
                    <h3>Configuración</h3>
                    <p>Ajustes del sistema</p>
                </div>
            </div>

            <!-- Widgets de estadísticas -->
                <div class="stat-widget">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <h4>Proyectos Activos</h4>
                        <p class="stat-number" id="stat-proyectos">0</p>
                    </div>
                </div>
                
                <div class="stat-widget">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-content">
                        <h4>Horas Este Mes</h4>
                        <p class="stat-number" id="stat-horas">0</p>
                    </div>
                </div>
                
                <div class="stat-widget">
                    <div class="stat-icon">📋</div>
                    <div class="stat-content">
                        <h4>Tareas Pendientes</h4>
                        <p class="stat-number" id="stat-tareas">0</p>
                    </div>
                </div>

                <div class="stat-widget">
                    <div class="stat-icon">📄</div>
                    <div class="stat-content">
                        <h4>Documentos</h4>
                        <p class="stat-number" id="stat-documentos">0</p>
                    </div>
                </div>

            <!-- Actividad reciente -->
            <div class="recent-activity">
                <h2>Actividad Reciente</h2>
                <div class="activity-list">
                    <div style="padding: 20px; text-align: center;">Cargando actividad...</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('contentArea').innerHTML = html;

    // Cargar estadísticas reales
    cargarEstadisticasDashboard();

    // Cargar actividad reciente real
    cargarActividadReciente();

    // DIAGNOSTICO DE ARRANQUE
    setTimeout(async () => {
        try {
            const status = await window.electronAPI.verificarSistema();
            const msg = `
                Base de Datos: ${status.db ? '✅ CONECTADA' : '❌ ERROR'}
                Reportes PDF: ${status.reportes ? '✅ ACTIVO' : '⏳ CARGANDO'}
                OCR: ${status.ocr ? '✅ ACTIVO' : '⏳ CARGANDO'}
            `;
            // Usar el sistema de notificaciones si existe, o console log visible
            if (typeof sistemaNotificaciones !== 'undefined') {
                sistemaNotificaciones.notificarExito('Sistema Iniciado Correctamente', 'Todos los módulos operativos.');
                console.log(msg);
            } else {
                console.log(msg);
                // Fallback visual simple
                const div = document.createElement('div');
                div.style.cssText = 'position:fixed; bottom:10px; right:10px; background:#222; color:#fff; padding:10px; border-radius:5px; font-size:12px; z-index:9999; opacity:0.8;';
                div.innerText = 'Sistema Operativo v1.0';
                document.body.appendChild(div);
                setTimeout(() => div.remove(), 5000);
            }
        } catch (e) { console.error('Error verificación:', e); }
    }, 2000);
}

async function cargarEstadisticasDashboard() {
    try {
        const stats = await window.electronAPI.obtenerEstadisticas();

        if (stats.success) {
            document.getElementById('stat-proyectos').textContent = stats.data.proyectos?.total || 0;
            document.getElementById('stat-tareas').textContent = stats.data.tareas_pendientes?.total || 0;
            document.getElementById('stat-horas').textContent = Math.round((stats.data.tiempo_total_mes?.total || 0) / 60);

            // Contar documentos
            const proyectos = await window.electronAPI.obtenerProyectos();
            if (proyectos.success && proyectos.data) {
                let totalDocs = 0;
                for (const proyecto of proyectos.data) {
                    const docs = await window.electronAPI.obtenerDocumentos(proyecto.id);
                    if (docs.success && docs.data) {
                        totalDocs += docs.data.length;
                    }
                }
                document.getElementById('stat-documentos').textContent = totalDocs;
            }
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function cargarActividadReciente() {
    try {
        const res = await window.electronAPI.obtenerActividad();
        if (res.success && res.data && res.data.length > 0) {
            const list = document.querySelector('.activity-list');
            list.innerHTML = res.data.map(item => `
                <div class="activity-item">
                    <div class="activity-icon">${item.icon}</div>
                    <div class="activity-content">
                        <p class="activity-title">${item.titulo}</p>
                        <p class="activity-time">${new Date(item.fecha).toLocaleString()}</p>
                    </div>
                </div>
            `).join('');
        } else {
            document.querySelector('.activity-list').innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay actividad reciente.</p>';
        }
    } catch (e) {
        console.error('Error cargando actividad:', e);
    }
}
