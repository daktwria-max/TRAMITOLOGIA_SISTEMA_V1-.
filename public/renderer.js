// Estado Global
const AppState = {
    currentTab: 'single',
    currentJobs: new Map(),
    doc1: null,
    doc2: null,
    isPaused: false
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];

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
    setupSingleDragAndDrop();
}

async function selectAndProcessPdf() {
    try {
        const result = await window.electronAPI.selectFile({
            title: 'Selecciona un PDF para analizar',
            filters: [{ name: 'Documentos', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
            // NOTE: Updated filter to include images as per system capabilities
        });

        if (result.canceled) return;

        showProgress();
        disableButton('btnSelectPdf');

        const filePath = result.filePaths[0];
        const ext = filePath.split('.').pop().toLowerCase();
        let response;

        // Intelligent dispatch based on extension
        if (['png', 'jpg', 'jpeg'].includes(ext)) {
            response = await window.electronAPI.processImage(filePath);
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
            filters: [{ name: 'Documentos', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
        });

        if (result.canceled) return;

        const validPaths = [];
        const errors = [];

        for (const filePath of result.filePaths) {
            // Validate duplication
            if (checkDuplicateJob(filePath)) {
                errors.push(`${filePath.split(/[\\/]/).pop()} ya está en la cola`);
                continue;
            }
            validPaths.push(filePath);
        }

        if (errors.length > 0) {
            showNotification(`Algunos archivos no se agregaron:\n${errors.join('\n')}`, 'warning');
        }

        if (validPaths.length > 0) {
            await addJobsToQueue(validPaths);
        }

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
            filters: [{ name: 'Documentos', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
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

    const validPaths = [];
    const errors = [];

    for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
            errors.push(`${file.name}: ${validation.error}`);
            continue;
        }

        if (checkDuplicateJob(file.path)) {
            errors.push(`${file.name}: Ya está en la cola`);
            continue;
        }

        validPaths.push(file.path);
    }

    if (errors.length > 0) {
        showNotification(`Problemas con algunos archivos:\n${errors.join('\n')}`, 'warning');
    }

    if (validPaths.length > 0) {
        await addJobsToQueue(validPaths);
    }
}

function validateFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Formato no soportado (Solo PDF e Imágenes)' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'Excede el tamaño máximo (100MB)' };
    }

    return { valid: true };
}

function checkDuplicateJob(filePath) {
    for (const job of AppState.currentJobs.values()) {
        if (job.filePath === filePath && job.status !== 'completed' && job.status !== 'failed') {
            return true;
        }
    }
    return false;
}

function setupSingleDragAndDrop() {
    const dropZone = document.getElementById('singleTab');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', () => {
        dropZone.classList.add('drag-active-overlay');
        const overlay = document.getElementById('singleDragOverlay') || createDragOverlay(dropZone);
        overlay.style.display = 'flex';
    });

    dropZone.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-active-overlay');
            const overlay = document.getElementById('singleDragOverlay');
            if (overlay) overlay.style.display = 'none';
        }
    });

    dropZone.addEventListener('drop', async (e) => {
        dropZone.classList.remove('drag-active-overlay');
        const overlay = document.getElementById('singleDragOverlay');
        if (overlay) overlay.style.display = 'none';

        const dt = e.dataTransfer;
        const files = [...dt.files];

        if (files.length > 0) {
            const file = files[0];
            const validation = validateFile(file);

            if (!validation.valid) {
                showNotification(validation.error, 'error');
                return;
            }

            // Process the single file
            // We need to call the processing logic directly or mock selection result
            // Since selectAndProcessPdf uses dialog, we extract the logic to a shareable function
            // or simply call processOCR/Image directly.

            await processSingleFile(file.path);
        }
    });
}

function createDragOverlay(parent) {
    const overlay = document.createElement('div');
    overlay.id = 'singleDragOverlay';
    overlay.className = 'drag-overlay';
    overlay.innerHTML = `
        <div class="overlay-content">
            <div class="overlay-icon">📄</div>
            <h3>Suelta el archivo aquí</h3>
            <p>Para procesarlo inmediatamente</p>
        </div>
    `;
    parent.appendChild(overlay);
    // Make sure parent is relative so overlay works
    if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }
    return overlay;
}

async function processSingleFile(filePath) {
    showProgress();
    disableButton('btnSelectPdf');

    try {
        const ext = filePath.split('.').pop().toLowerCase();
        let response;

        if (['png', 'jpg', 'jpeg'].includes(ext)) {
            response = await window.electronAPI.processImage(filePath);
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

    document.getElementById('progressStage').textContent = stageNames[progress.stage] || 'Procesando...';

    if (progress.page) {
        document.getElementById('progressDetails').textContent =
            `Página ${progress.page} de ${progress.totalPages}`;
    }

    const percentage = Math.round(progress.progress * 100);
    document.getElementById('progressBar').style.width = percentage + '%';
}

function showResultsModal(result) {
    showResults(result);
}
