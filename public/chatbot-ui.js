// ==================== INTERFAZ DE CHATBOT ====================

let chatbotActivo = false;
let mensajesPendientes = [];

function mostrarChatbot() {
  const html = `
    <div class="header">
      <div>
        <h1>🤖 Asistente Virtual</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Tu asistente inteligente de Protección Civil
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="limpiarChatHistorial()">
          🗑️ Limpiar Chat
        </button>
        <button class="btn btn-primary" onclick="mostrarAyudaChatbot()">
          ❓ Ayuda
        </button>
      </div>
    </div>

    <div class="chatbot-container">
      <!-- Área de mensajes -->
      <div class="chatbot-messages" id="chatbotMessages">
        <div class="mensaje-bienvenida">
          <div class="mensaje-avatar">🤖</div>
          <div class="mensaje-contenido">
            <div class="mensaje-texto">
              <strong>¡Hola! Soy tu asistente virtual de Protección Civil.</strong>
              <p>Puedo ayudarte con información sobre trámites, requisitos, costos, tiempos y normatividad.</p>
              <p>¿En qué puedo ayudarte hoy?</p>
            </div>
            <div class="mensaje-sugerencias">
              <button class="sugerencia-btn" onclick="enviarMensajeSugerido('Aviso de funcionamiento')">
                📋 Aviso de funcionamiento
              </button>
              <button class="sugerencia-btn" onclick="enviarMensajeSugerido('Dictamen estructural')">
                🏗️ Dictamen estructural
              </button>
              <button class="sugerencia-btn" onclick="enviarMensajeSugerido('Programa interno')">
                📘 Programa interno
              </button>
              <button class="sugerencia-btn" onclick="enviarMensajeSugerido('Requisitos')">
                📋 Requisitos
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Área de entrada -->
      <div class="chatbot-input-area">
        <div class="chatbot-input-container">
          <textarea 
            id="chatbotInput" 
            class="chatbot-input" 
            placeholder="Escribe tu pregunta aquí..."
            rows="1"
            onkeydown="handleChatbotKeydown(event)"></textarea>
          <button class="chatbot-send-btn" onclick="enviarMensajeChatbot()" id="chatbotSendBtn">
            <span class="send-icon">➤</span>
          </button>
        </div>
        <div class="chatbot-info">
          <span class="chatbot-status" id="chatbotStatus">
            <span class="status-dot"></span> Listo
          </span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;

  // Auto-focus en input
  document.getElementById('chatbotInput').focus();

  chatbotActivo = true;
}

// ==================== ENVÍO DE MENSAJES ====================

async function enviarMensajeChatbot() {
  const input = document.getElementById('chatbotInput');
  const mensaje = input.value.trim();

  if (!mensaje) return;

  // Limpiar input
  input.value = '';
  input.style.height = 'auto';

  // Agregar mensaje del usuario
  agregarMensajeUsuario(mensaje);

  // Mostrar indicador de escritura
  mostrarIndicadorEscritura();

  // Deshabilitar input temporalmente
  input.disabled = true;
  document.getElementById('chatbotSendBtn').disabled = true;
  actualizarEstadoChatbot('Pensando...');

  try {
    // Enviar mensaje al backend
    const respuesta = await window.electronAPI.procesarMensajeChatbot(mensaje);

    // Ocultar indicador de escritura
    ocultarIndicadorEscritura();

    if (respuesta.success) {
      agregarMensajeAsistente(respuesta.data);
    } else {
      throw new Error(respuesta.error);
    }

  } catch (error) {
    console.error('Error enviando mensaje:', error);
    ocultarIndicadorEscritura();
    agregarMensajeError('Disculpa, tuve un problema procesando tu mensaje. Intenta de nuevo.');
  } finally {
    // Rehabilitar input
    input.disabled = false;
    document.getElementById('chatbotSendBtn').disabled = false;
    input.focus();
    actualizarEstadoChatbot('Listo');
  }
}

function enviarMensajeSugerido(mensaje) {
  const input = document.getElementById('chatbotInput');
  input.value = mensaje;
  enviarMensajeChatbot();
}

function handleChatbotKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    enviarMensajeChatbot();
  }
}

// ==================== RENDERIZADO DE MENSAJES ====================

function agregarMensajeUsuario(texto) {
  const container = document.getElementById('chatbotMessages');

  const mensajeDiv = document.createElement('div');
  mensajeDiv.className = 'mensaje-usuario';
  mensajeDiv.innerHTML = `
    <div class="mensaje-contenido">
      <div class="mensaje-texto">${escapeHtml(texto)}</div>
      <div class="mensaje-timestamp">${obtenerHoraActual()}</div>
    </div>
    <div class="mensaje-avatar">👤</div>
  `;

  container.appendChild(mensajeDiv);
  scrollToBottom();
}

function agregarMensajeAsistente(data) {
  const container = document.getElementById('chatbotMessages');

  const mensajeDiv = document.createElement('div');
  mensajeDiv.className = 'mensaje-asistente';

  // Formatear texto con markdown básico
  const textoFormateado = formatearTextoMarkdown(data.texto);

  let html = `
    <div class="mensaje-avatar">🤖</div>
    <div class="mensaje-contenido">
      <div class="mensaje-texto">${textoFormateado}</div>
  `;

  // Agregar sugerencias si existen
  if (data.sugerencias && data.sugerencias.length > 0) {
    html += `
      <div class="mensaje-sugerencias">
        ${data.sugerencias.map(sug => `
          <button class="sugerencia-btn" onclick="enviarMensajeSugerido('${escapeHtml(sug)}')">
            ${escapeHtml(sug)}
          </button>
        `).join('')}
      </div>
    `;
  }

  // Agregar información de confianza si es baja
  if (data.confianza && data.confianza < 0.6) {
    html += `
      <div class="mensaje-advertencia">
        ⚠️ Esta respuesta tiene baja confianza. Considera reformular tu pregunta.
      </div>
    `;
  }

  html += `
      <div class="mensaje-timestamp">${obtenerHoraActual()}</div>
    </div>
  `;

  mensajeDiv.innerHTML = html;
  container.appendChild(mensajeDiv);
  scrollToBottom();
}

function agregarMensajeError(texto) {
  const container = document.getElementById('chatbotMessages');

  const mensajeDiv = document.createElement('div');
  mensajeDiv.className = 'mensaje-error';
  mensajeDiv.innerHTML = `
    <div class="mensaje-avatar">⚠️</div>
    <div class="mensaje-contenido">
      <div class="mensaje-texto">${escapeHtml(texto)}</div>
      <div class="mensaje-timestamp">${obtenerHoraActual()}</div>
    </div>
  `;

  container.appendChild(mensajeDiv);
  scrollToBottom();
}

function mostrarIndicadorEscritura() {
  const container = document.getElementById('chatbotMessages');

  const indicador = document.createElement('div');
  indicador.className = 'mensaje-asistente';
  indicador.id = 'indicadorEscritura';
  indicador.innerHTML = `
    <div class="mensaje-avatar">🤖</div>
    <div class="mensaje-contenido">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  container.appendChild(indicador);
  scrollToBottom();
}

function ocultarIndicadorEscritura() {
  const indicador = document.getElementById('indicadorEscritura');
  if (indicador) {
    indicador.remove();
  }
}

// ==================== UTILIDADES ====================

function formatearTextoMarkdown(texto) {
  // Convertir markdown básico a HTML
  let html = texto;

  // Negritas **texto**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Cursivas *texto*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Listas numeradas
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

  // Listas con guiones
  html = html.replace(/^[-•]\s(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Saltos de línea
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Links (si existen)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  return html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function obtenerHoraActual() {
  const now = new Date();
  return now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  const container = document.getElementById('chatbotMessages');
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function actualizarEstadoChatbot(estado) {
  const statusElement = document.getElementById('chatbotStatus');
  if (statusElement) {
    const dot = statusElement.querySelector('.status-dot');

    if (estado === 'Pensando...') {
      dot.className = 'status-dot status-thinking';
      statusElement.innerHTML = `<span class="status-dot status-thinking"></span> ${estado}`;
    } else {
      dot.className = 'status-dot';
      statusElement.innerHTML = `<span class="status-dot"></span> ${estado}`;
    }
  }
}

// ==================== ACCIONES ====================

async function limpiarChatHistorial() {
  if (!confirm('¿Estás seguro de que quieres limpiar el historial del chat?')) {
    return;
  }

  try {
    await window.electronAPI.limpiarHistorialChatbot();

    // Recargar interfaz
    mostrarChatbot();

    sistemaNotificaciones.notificarExito(
      'Historial Limpiado',
      'El historial del chat ha sido eliminado'
    );

  } catch (error) {
    console.error('Error limpiando historial:', error);
    sistemaNotificaciones.notificarError('Error', error.message);
  }
}

function mostrarAyudaChatbot() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalAyudaChatbot';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>❓ Ayuda del Asistente Virtual</h2>
        <button class="close-btn" onclick="cerrarModal('modalAyudaChatbot')">×</button>
      </div>

      <div class="modal-body">
        <h3>🤖 ¿Qué puedo hacer?</h3>
        <p>Soy tu asistente virtual especializado en Protección Civil. Puedo ayudarte con:</p>

        <div class="ayuda-seccion">
          <h4>📋 Información sobre Trámites</h4>
          <ul>
            <li>Aviso de funcionamiento</li>
            <li>Dictámenes (estructural, eléctrico, gas)</li>
            <li>Programa interno de protección civil</li>
            <li>Capacitaciones y verificaciones</li>
          </ul>
        </div>

        <div class="ayuda-seccion">
          <h4>💡 Consultas Frecuentes</h4>
          <ul>
            <li>Requisitos necesarios para cada trámite</li>
            <li>Costos aproximados</li>
            <li>Tiempos de trámite</li>
            <li>Normatividad aplicable</li>
          </ul>
        </div>

        <div class="ayuda-seccion">
          <h4>🔍 Búsqueda Inteligente</h4>
          <p>Puedo buscar en toda la base de conocimiento del sistema, incluyendo:</p>
          <ul>
            <li>Documentos analizados</li>
            <li>Conversaciones previas</li>
            <li>Patrones identificados</li>
          </ul>
        </div>

        <div class="ayuda-seccion">
          <h4>💬 Ejemplos de Preguntas</h4>
          <div class="ejemplos-grid">
            <button class="ejemplo-btn" onclick="enviarMensajeSugerido('¿Qué necesito para el aviso de funcionamiento?'); cerrarModal('modalAyudaChatbot')">
              ¿Qué necesito para el aviso de funcionamiento?
            </button>
            <button class="ejemplo-btn" onclick="enviarMensajeSugerido('¿Cuánto cuesta un dictamen estructural?'); cerrarModal('modalAyudaChatbot')">
              ¿Cuánto cuesta un dictamen estructural?
            </button>
            <button class="ejemplo-btn" onclick="enviarMensajeSugerido('¿Qué normas aplican para instalaciones eléctricas?'); cerrarModal('modalAyudaChatbot')">
              ¿Qué normas aplican para instalaciones eléctricas?
            </button>
            <button class="ejemplo-btn" onclick="enviarMensajeSugerido('¿Cómo elaboro un programa interno?'); cerrarModal('modalAyudaChatbot')">
              ¿Cómo elaboro un programa interno?
            </button>
          </div>
        </div>

        <div class="ayuda-tips">
          <h4>💡 Consejos para Mejores Respuestas</h4>
          <ul>
            <li>✅ Sé específico en tus preguntas</li>
            <li>✅ Menciona el tipo de establecimiento si es relevante</li>
            <li>✅ Usa las sugerencias que te proporciono</li>
            <li>✅ Si no entiendes algo, pregunta de otra forma</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ==================== WIDGET FLOTANTE ====================

function crearWidgetChatbot() {
  const widget = document.createElement('div');
  widget.className = 'chatbot-widget';
  widget.id = 'chatbotWidget';
  widget.innerHTML = `
    <button class="chatbot-widget-btn" onclick="toggleChatbotWidget()">
      🤖
      <span class="widget-badge" id="widgetBadge" style="display: none;">1</span>
    </button>
  `;

  document.body.appendChild(widget);
}

function toggleChatbotWidget() {
  // Navegar a la sección del chatbot
  cambiarModulo('chatbot');
}

// Inicializar widget al cargar
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    crearWidgetChatbot();
  });
}
