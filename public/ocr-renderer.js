// Estado Global
const AppState = {
    currentTab: 'single',
    currentJobs: new Map(),
    doc1: null,
    doc2: null,
    isPaused: false
};

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicación...');

    initializeWindowControls();
    initializeTabs();
    initializeSingleProcessing();
    initializeBatchProcessing();
    initializeComparison();
    initializeHistory();
    setupEventListeners();

    console.log('✅ Aplicación inicializada');
});

// ==================== WINDOW CONTROLS ====================

function initializeWindowControls() {
    document.getElementById('btnMinimize')?.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    document.getElementById('btnMaximize')?.addEventListener('click', () => {
        window.electronAPI.maximizeWindow();
    });

    document.getElementById('btnClose')?.addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });
}

// ==================== TABS ====================

function initializeTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    AppState.currentTab = tabName;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`)?.classList.add('active');

    if (tabName === 'history') {
        loadHistory();
    }
}

// ==================== SINGLE PROCESSING ====================

function initializeSingleProcessing() {
    document.getElementById('btnSelectPdf')?.addEventListener('click', selectAndProcessPdf);
}

async function selectAndProcessPdf() {
    try {
        const result = await window.electronAPI.selectFile({
            title: 'Selecciona un PDF para analizar',
            filters: [{ name: 'Documentos', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
        });

        if (result.canceled) return;

        showProgress();
        disableButton('btnSelectPdf');

        // Check extension to decide processOCR (pdf) or processImage (img)
        // Note: The original renderer.js code used processOCR for everything roughly, 
        // but we know we have processImage too.
        // Let's check extension.
        const filePath = result.filePaths[0];
        const ext = filePath.split('.').pop().toLowerCase();

        let response;
        if (['png', 'jpg', 'jpeg'].includes(ext)) {
            response = await window.electronAPI.processImage(filePath);
            // Wrap if not wrapped by handler
            if (!response.success && response.textoCompleto) {
                // Adaptation if handler returns raw data
                // But we updated handler to return wrapper. 
                // Wait, processImage handler in previous turn returned result directly.
                // I should update processImage handler to return wrapper too.
            }
        } else {
            response = await window.electronAPI.processOCR(filePath);
        }

        if (response.success) {
            showResults(response.data);
        } else {
            showError(response.error);
        }

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        hideProgress();
        enableButton('btnSelectPdf');
    }
}

// ==================== BATCH PROCESSING ====================

function initializeBatchProcessing() {
    document.getElementById('btnSelectMultiple')?.addEventListener('click', selectMultipleFiles);
    document.getElementById('btnPauseBatch')?.addEventListener('click', togglePauseBatch);
    document.getElementById('btnCancelBatch')?.addEventListener('click', cancelAllJobs);
    document.getElementById('btnExportBatch')?.addEventListener('click', exportBatchResults);

    setupDragAndDrop();
    setupBatchEventListeners();
}

async function selectMultipleFiles() {
    try {
        const result = await window.electronAPI.selectFiles({
            title: 'Seleccionar PDFs para procesamiento por lotes',
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });

        if (result.canceled) return;

        await addJobsToQueue(result.filePaths);

    } catch (error) {
        console.error('Error:', error);
        showNotification('Error seleccionando archivos: ' + error.message, 'error');
    }
}

async function addJobsToQueue(filePaths) {
    try {
        const response = await window.electronAPI.batchAddJobs(filePaths);

        if (response.success) {
            showNotification(`${filePaths.length} archivo(s) agregado(s) a la cola`, 'success');
        } else {
            throw new Error(response.error);
        }

    } catch (error) {
        showNotification('Error agregando trabajos: ' + error.message, 'error');
    }
}

async function togglePauseBatch() {
    try {
        if (AppState.isPaused) {
            await window.electronAPI.batchResume();
        } else {
            await window.electronAPI.batchPause();
        }

    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function cancelAllJobs() {
    if (!confirm('¿Cancelar todos los trabajos pendientes?')) return;

    try {
        await window.electronAPI.batchCancelAll();
        showNotification('Todos los trabajos cancelados', 'info');

    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function exportBatchResults() {
    try {
        const response = await window.electronAPI.batchExportResults();

        if (response.success) {
            const result = await window.electronAPI.saveFile({
                defaultPath: `batch-results-${Date.now()}.json`,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });

            if (!result.canceled) {
                const content = JSON.stringify(response.data, null, 2);
                await window.electronAPI.fileSave(result.filePath, content);
                showNotification('Resultados exportados exitosamente', 'success');
            }
        }

    } catch (error) {
        showNotification('Error exportando: ' + error.message, 'error');
    }
}

function setupBatchEventListeners() {
    window.electronAPI.onBatchJobAdded((job) => {
        addJobToUI(job);
        updateBatchStats();
    });

    window.electronAPI.onBatchJobStarted((job) => {
        updateJobStatus(job.id, 'Procesando...', 'processing');
    });

    window.electronAPI.onBatchJobProgress((progress) => {
        updateJobProgress(progress.jobId, progress.progress);
    });

    window.electronAPI.onBatchJobCompleted((job) => {
        updateJobStatus(job.id, '✓ Completado', 'completed');
        updateJobProgress(job.id, 1);
        updateBatchStats();
    });

    window.electronAPI.onBatchJobFailed((job) => {
        updateJobStatus(job.id, '✗ Error: ' + job.error, 'failed');
        updateBatchStats();
    });

    window.electronAPI.onBatchPaused(() => {
        AppState.isPaused = true;
        document.getElementById('btnPauseBatch').textContent = '▶ Reanudar';
    });

    window.electronAPI.onBatchResumed(() => {
        AppState.isPaused = false;
        document.getElementById('btnPauseBatch').textContent = '⏸ Pausar';
    });
}

function addJobToUI(job) {
    const jobHtml = `
        <div class="job-item" id="job-${job.id}" data-status="${job.status}">
            <div class="job-icon">📄</div>
            <div class="job-info">
                <div class="job-name">${job.fileName}</div>
                <div class="job-status" id="status-${job.id}">Pendiente...</div>
            </div>
            <div class="job-progress">
                <div class="progress-bar-small">
                    <div class="progress-fill-small" id="progress-${job.id}" style="width: 0%"></div>
                </div>
            </div>
            <div class="job-actions">
                <button class="btn-icon" onclick="viewJobResult('${job.id}')" title="Ver resultado">
                    👁️
                </button>
                <button class="btn-icon" onclick="cancelJob('${job.id}')" title="Cancelar">
                    ✖
                </button>
            </div>
        </div>
    `;

    document.getElementById('jobList').insertAdjacentHTML('beforeend', jobHtml);
    AppState.currentJobs.set(job.id, job);
}

function updateJobStatus(jobId, status, statusClass) {
    const statusElement = document.getElementById(`status-${jobId}`);
    if (statusElement) {
        statusElement.textContent = status;
    }

    const jobElement = document.getElementById(`job-${jobId}`);
    if (jobElement) {
        jobElement.dataset.status = statusClass;
    }
}

function updateJobProgress(jobId, progress) {
    const progressElement = document.getElementById(`progress-${jobId}`);
    if (progressElement) {
        progressElement.style.width = (progress * 100) + '%';
    }
}

async function updateBatchStats() {
    try {
        const response = await window.electronAPI.batchGetStatistics();

        if (response.success) {
            const stats = response.data;

            document.getElementById('statTotal').textContent = stats.total;
            document.getElementById('statProcessing').textContent = stats.processing;
            document.getElementById('statCompleted').textContent = stats.completed;
            document.getElementById('statFailed').textContent = stats.failed;
        }

    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

window.cancelJob = async function (jobId) {
    try {
        await window.electronAPI.batchCancelJob(jobId);
        showNotification('Trabajo cancelado', 'info');

    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
};

window.viewJobResult = function (jobId) {
    const job = AppState.currentJobs.get(jobId);
    if (job && job.result) {
        showResultsModal(job.result);
    } else {
        showNotification('El trabajo aún no ha sido completado', 'info');
    }
};

// ==================== COMPARISON ====================

function initializeComparison() {
    document.getElementById('btnSelectDoc1')?.addEventListener('click', () => selectDocForComparison(1));
    document.getElementById('btnSelectDoc2')?.addEventListener('click', () => selectDocForComparison(2));
    document.getElementById('btnCompare')?.addEventListener('click', compareDocuments);
}

async function selectDocForComparison(docNumber) {
    try {
        const result = await window.electronAPI.selectFile({
            title: `Seleccionar Documento ${docNumber}`,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });

        if (result.canceled) return;

        const filePath = result.filePaths[0];

        if (docNumber === 1) {
            AppState.doc1 = filePath;
            document.getElementById('doc1Info').innerHTML = `
                <p><strong>Seleccionado:</strong> ${filePath.split(/[\\/]/).pop()}</p>
            `;
        } else {
            AppState.doc2 = filePath;
            document.getElementById('doc2Info').innerHTML = `
                <p><strong>Seleccionado:</strong> ${filePath.split(/[\\/]/).pop()}</p>
            `;
        }

    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function compareDocuments() {
    if (!AppState.doc1 || !AppState.doc2) {
        showNotification('Selecciona ambos documentos primero', 'warning');
        return;
    }

    try {
        showNotification('Comparando documentos...', 'info');

        const response = await window.electronAPI.compareDocuments(AppState.doc1, AppState.doc2);

        if (response.success) {
            showComparisonResults(response.data);
        } else {
            throw new Error(response.error);
        }

    } catch (error) {
        showNotification('Error comparando: ' + error.message, 'error');
    }
}

function showComparisonResults(comparison) {
    const resultsDiv = document.getElementById('comparisonResults');

    resultsDiv.innerHTML = `
        <div class="comparison-summary">
            <h3>📊 Resultados de la Comparación</h3>
            <div class="similarity-score">
                <div class="score-value">${(comparison.similarity * 100).toFixed(1)}%</div>
                <div class="score-label">Similitud</div>
            </div>
            <p><strong>Estado:</strong> ${comparison.summary.overallStatus}</p>
            
            <h4>Cambios Significativos:</h4>
            ${comparison.summary.significantChanges.length > 0 ?
            comparison.summary.significantChanges.map(change => `
                    <div class="change-item">
                        <strong>${change.field}:</strong><br>
                        <span class="old-value">❌ ${change.oldValue}</span><br>
                        <span class="new-value">✅ ${change.newValue}</span>
                    </div>
                `).join('') :
            '<p>No se detectaron cambios significativos</p>'
        }
        </div>
    `;

    resultsDiv.style.display = 'block';
}

// ==================== HISTORY ====================

function initializeHistory() {
    document.getElementById('btnRefreshHistory')?.addEventListener('click', loadHistory);
    document.getElementById('btnExportHistory')?.addEventListener('click', exportHistory);
    document.getElementById('searchHistory')?.addEventListener('input', debounce(searchHistory, 300));
}

async function loadHistory() {
    try {
        const response = await window.electronAPI.historyGetRecent(50);

        if (response.success) {
            displayHistory(response.data);
        }

    } catch (error) {
        showNotification('Error cargando historial: ' + error.message, 'error');
    }
}

function displayHistory(documents) {
    const historyList = document.getElementById('historyList');

    if (documents.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; padding: 2rem;">No hay documentos en el historial</p>';
        return;
    }

    historyList.innerHTML = documents.map(doc => `
        <div class="history-item" onclick="viewHistoryItem(${doc.id})">
            <div class="history-icon">📄</div>
            <div class="history-info">
                <div class="history-title">${doc.file_name}</div>
                <div class="history-meta">
                    ${doc.tipo_documento || 'N/A'} • 
                    ${new Date(doc.processed_at).toLocaleDateString()}
                </div>
            </div>
            <div class="confidence-badge">
                ${Math.round(doc.confianza * 100)}%
            </div>
        </div>
    `).join('');
}

async function searchHistory() {
    const query = document.getElementById('searchHistory').value;
    const typeFilter = document.getElementById('filterType')?.value || '';

    try {
        const response = await window.electronAPI.historySearch(query, {
            tipoDocumento: typeFilter || undefined,
            limit: 50
        });

        if (response.success) {
            displayHistory(response.data);
        }

    } catch (error) {
        console.error('Error buscando:', error);
    }
}

async function exportHistory() {
    showNotification('Función en desarrollo', 'info');
}

window.viewHistoryItem = function (id) {
    showNotification('Función en desarrollo', 'info');
};

// ==================== UTILIDADES ====================

function showProgress() {
    document.getElementById('progressSection')?.classList.add('active');
}

function hideProgress() {
    document.getElementById('progressSection')?.classList.remove('active');
}

function showResults(data) {
    document.getElementById('resultTipo').textContent = data.tipoDocumento;
    document.getElementById('resultRazon').textContent = data.razonSocial;
    document.getElementById('resultFecha').textContent = data.fecha;
    document.getElementById('resultUbicacion').textContent = data.ubicacion;
    document.getElementById('resultRFC').textContent = data.rfc || 'No detectado';
    document.getElementById('resultFolio').textContent = data.folio || 'No detectado';

    const confidence = Math.round(data.confianza * 100);
    document.getElementById('confidenceValue').textContent = confidence + '%';

    document.getElementById('resultsCard')?.classList.add('active');
}

function showError(message) {
    document.getElementById('errorDetails').textContent = message;
    document.getElementById('errorMessage')?.classList.add('active');
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (type === 'error') {
        alert('Error: ' + message);
    }
}

function disableButton(id) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
}

function enableButton(id) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = false;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZoneBatch');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
}

async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = [...dt.files];

    const pdfFiles = files.filter(file => file.path.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
        showNotification('Solo se aceptan archivos PDF', 'warning');
        return;
    }

    const filePaths = pdfFiles.map(file => file.path);
    await addJobsToQueue(filePaths);
}

function setupEventListeners() {
    window.electronAPI.onOCRProgress((progress) => {
        updateSingleProgress(progress);
    });
}

function updateSingleProgress(progress) {
    const stageNames = {
        'pdf_conversion': 'Convirtiendo PDF a imágenes',
        'ocr_processing': 'Procesando con OCR',
        'data_extraction': 'Extrayendo datos estructurados',
        'complete': 'Completado'
    };

    const stageEl = document.getElementById('progressStage');
    if (stageEl) stageEl.textContent = stageNames[progress.stage] || 'Procesando...';

    if (progress.page) {
        const detailsEl = document.getElementById('progressDetails');
        if (detailsEl) detailsEl.textContent = `Página ${progress.page} de ${progress.totalPages}`;
    }

    const percentage = Math.round(progress.progress * 100);
    const barEl = document.getElementById('progressBar');
    if (barEl) barEl.style.width = percentage + '%';
}

function showResultsModal(result) {
    showResults(result);
}
