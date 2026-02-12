/**
 * OCR UI LOGIC
 * Interfaz moderna para el sistema OCR
 */

// Estado global del OCR
let currentOcrResults = null;

/**
 * Renderiza la vista principal del OCR
 */
function mostrarProcesadorOCR() {
  const html = `
    <div class="ocr-container">
        <!-- Header -->
        <div class="ocr-header">
            <h1>🔍 KODIFICADOR OCR</h1>
            <p>Procesamiento PDF 100% Offline</p>
        </div>

        <!-- Action Section -->
        <div class="ocr-action-section">
            <button id="btnSelectPdf" class="btn-ocr-select" onclick="window.selectAndProcessPdf()">
                <span class="btn-icon">📄</span>
                <span>SELECCIONAR ARCHIVO</span>
            </button>
        </div>

        <!-- Progress Section -->
        <div id="progressSection" class="ocr-progress-section">
            <div class="ocr-progress-header">
                <div class="ocr-progress-stage" id="progressStage">Preparando...</div>
                <div class="ocr-progress-details" id="progressDetails">Iniciando procesamiento</div>
            </div>
            <div class="ocr-progress-bar-container">
                <div class="ocr-progress-bar" id="progressBar" style="width: 0%"></div>
            </div>
        </div>

        <!-- Error Message -->
        <div id="errorMessage" class="ocr-error-message">
            <div class="ocr-error-icon">⚠️</div>
            <div class="ocr-error-title">Error de Procesamiento</div>
            <div class="ocr-error-details" id="errorDetails"></div>
        </div>

        <!-- Results Card -->
        <div id="resultsCard" class="ocr-results-card">
            <div class="ocr-results-header">
                <div class="ocr-results-title">📊 Resultados del Análisis</div>
                <div class="ocr-confidence-badge">
                    <span>✓</span>
                    <span id="confidenceValue">85%</span>
                </div>
            </div>

            <div class="ocr-result-item">
                <div class="ocr-result-label">TIPO:</div>
                <div class="ocr-result-value highlight" id="resultTipo">-</div>
            </div>

            <div class="ocr-result-item">
                <div class="ocr-result-label">RAZÓN SOCIAL:</div>
                <div class="ocr-result-value" id="resultRazon">-</div>
            </div>

            <div class="ocr-result-item">
                <div class="ocr-result-label">FECHA:</div>
                <div class="ocr-result-value" id="resultFecha">-</div>
            </div>

            <div class="ocr-result-item">
                <div class="ocr-result-label">UBICACIÓN:</div>
                <div class="ocr-result-value" id="resultUbicacion">-</div>
            </div>

            <div class="ocr-result-item">
                <div class="ocr-result-label">RFC:</div>
                <div class="ocr-result-value" id="resultRFC">-</div>
            </div>

            <div class="ocr-result-item">
                <div class="ocr-result-label">FOLIO:</div>
                <div class="ocr-result-value" id="resultFolio">-</div>
            </div>

            <div class="ocr-results-actions">
                <button class="btn-ocr-action" onclick="window.exportarResultadosOCR()">
                    💾 Exportar JSON
                </button>
                <button class="btn-ocr-action" onclick="window.copiarTextoOCRResult()">
                    📋 Copiar Texto
                </button>
                <button class="btn-ocr-action" onclick="window.nuevoAnalisisOCR()">
                    🔄 Nuevo Análisis
                </button>
            </div>
        </div>
        
        <!-- Historial Link -->
        <div style="text-align: center; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="window.mostrarHistorialOCR()">
                📜 Ver Historial
            </button>
        </div>
    </div>
    `;

  document.getElementById('contentArea').innerHTML = html;
}

// ==================== LÓGICA PRINCIPAL ====================

window.selectAndProcessPdf = async function () {
  try {
    // Seleccionar archivo
    const result = await window.documentAPI.selectFile({
      title: 'Selecciona un documento para analizar',
      filters: [
        { name: 'Documentos', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }
      ]
    });

    if (result.canceled) return;

    const filePath = result.filePaths[0];
    const extension = filePath.split('.').pop().toLowerCase();

    // Ocultar error si existe
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) errorEl.classList.remove('active');

    // Deshabilitar botón
    const btn = document.getElementById('btnSelectPdf');
    if (btn) btn.disabled = true;

    // Mostrar progreso
    showOCRProgress();

    // Procesar documento según tipo
    let data;
    if (['png', 'jpg', 'jpeg'].includes(extension)) {
      data = await window.ocrAPI.processImage(filePath);
    } else {
      data = await window.ocrAPI.processDocument(filePath, (progress) => {
        updateOCRProgress(progress);
      });
    }

    // Mostrar resultados
    showOCRResults(data, filePath);

  } catch (error) {
    console.error('Error:', error);
    showOCRError(error.message);
  } finally {
    const btn = document.getElementById('btnSelectPdf');
    if (btn) btn.disabled = false;
  }
};

function showOCRProgress() {
  const progressSection = document.getElementById('progressSection');
  const resultsCard = document.getElementById('resultsCard');

  if (progressSection) progressSection.classList.add('active');
  if (resultsCard) resultsCard.classList.remove('active');
}

function updateOCRProgress(progress) {
  const stageNames = {
    'pdf_conversion': 'Convirtiendo PDF a imágenes',
    'ocr_processing': 'Procesando con OCR',
    'data_extraction': 'Extrayendo datos estructurados',
    'complete': 'Completado'
  };

  const stageEl = document.getElementById('progressStage');
  const detailsEl = document.getElementById('progressDetails');
  const barEl = document.getElementById('progressBar');

  if (stageEl) stageEl.textContent = stageNames[progress.stage] || 'Procesando...';

  if (progress.page && detailsEl) {
    detailsEl.textContent = `Página ${progress.page} de ${progress.totalPages}`;
  }

  if (barEl) {
    const percentage = Math.round(progress.progress * 100);
    barEl.style.width = percentage + '%';
  }
}

function showOCRResults(data, filePath) {
  currentOcrResults = { ...data, filePath };

  document.getElementById('resultTipo').textContent = data.tipoDocumento || 'No detectado';
  document.getElementById('resultRazon').textContent = data.razonSocial || 'No detectado';
  document.getElementById('resultFecha').textContent = data.fecha || 'No detectado';
  document.getElementById('resultUbicacion').textContent = data.ubicacion || 'No detectado';
  document.getElementById('resultRFC').textContent = data.rfc || 'No detectado';
  document.getElementById('resultFolio').textContent = data.folio || 'No detectado';

  const confidence = Math.round((data.confianza || 0) * 100);
  document.getElementById('confidenceValue').textContent = confidence + '%';

  // Ocultar progreso y mostrar resultados
  document.getElementById('progressSection').classList.remove('active');
  document.getElementById('resultsCard').classList.add('active');
}

function showOCRError(message) {
  const details = document.getElementById('errorDetails');
  const msg = document.getElementById('errorMessage');

  if (details) details.textContent = message;
  if (msg) msg.classList.add('active');

  document.getElementById('progressSection').classList.remove('active');
}

window.exportarResultadosOCR = function () {
  if (!currentOcrResults) return;

  const dataStr = JSON.stringify(currentOcrResults, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `ocr-result-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
};

window.copiarTextoOCRResult = function () {
  if (!currentOcrResults) return;

  const texto = currentOcrResults.textoCompleto;
  navigator.clipboard.writeText(texto).then(() => {
    // Usar sistema de notificaciones si existe, sino alert
    if (window.sistemaNotificaciones) {
      window.sistemaNotificaciones.notificarExito('Texto Copiado', 'Texto copiado al portapapeles');
    } else {
      alert('Texto copiado al portapapeles');
    }
  });
};

window.nuevoAnalisisOCR = function () {
  document.getElementById('resultsCard').classList.remove('active');
  document.getElementById('progressSection').classList.remove('active');
  currentOcrResults = null;

  // Reset inputs if there were any, mainly visual reset
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressStage').textContent = 'Preparando...';
};

// ==================== HISTORIAL (Backend) ====================

window.mostrarHistorialOCR = async function () {
  try {
    const historial = await window.ocrAPI.getHistory(20);

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalHistorialOCR';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2>📜 Historial de OCR</h2>
            <button class="close-btn" onclick="document.getElementById('modalHistorialOCR').remove()">×</button>
          </div>
          
          <div class="modal-body">
            ${historial && historial.length > 0 ? `
              <div class="historial-ocr-lista">
                ${historial.map(item => {
      const data = {
        tipoDocumento: item.tipo_documento,
        razonSocial: item.razon_social,
        fecha: item.fecha,
        ubicacion: item.ubicacion,
        rfc: item.rfc,
        folio: item.folio,
        textoCompleto: item.texto_completo,
        confianza: item.confianza
      };

      // Escapar comillas para el JSON en el onclick
      const dataSafe = JSON.stringify(data).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
      const filePathSafe = item.file_path ? item.file_path.replace(/\\/g, "\\\\") : '';

      return `
                      <div class="card mb-md p-md">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${item.file_name}</strong>
                                <p style="font-size: 0.9em; color: var(--text-secondary);">${new Date(item.processed_at).toLocaleString()}</p>
                            </div>
                            <button class="btn btn-sm btn-select-ocr" onclick='cargarDesdeHistorial(${dataSafe}, "${filePathSafe}")'>
                                Ver Resultado
                            </button>
                        </div>
                        <div style="margin-top: 5px; display: flex; gap: 10px;">
                            <span class="badge badge-info">${item.tipo_documento || 'General'}</span>
                            <span class="badge badge-success">${Math.round((item.confianza || 0) * 100)}%</span>
                        </div>
                      </div>
                    `;
    }).join('')}
              </div>
            ` : `
              <div style="text-align: center; padding: 2rem;">
                <p>No hay documentos en el historial</p>
              </div>
            `}
          </div>
        </div>
      `;

    document.body.appendChild(modal);

  } catch (error) {
    console.error("Error cargando historial:", error);
    alert("Error cargando el historial: " + error.message);
  }
};

window.cargarDesdeHistorial = function (data, filePath) {
  document.getElementById('modalHistorialOCR').remove();
  showOCRResults(data, filePath);
};

// Exportar globalmente
window.mostrarProcesadorOCR = mostrarProcesadorOCR;
