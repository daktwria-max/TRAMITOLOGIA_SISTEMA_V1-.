// ==================== VISTA DE OCR ====================

function mostrarProcesadorOCR() {
  const html = `
    <div class="header">
      <div>
        <h1>🔍 Procesador OCR</h1>
        <p style="color: var(--color-texto-secundario); margin-top: 5px;">
          Extrae texto e información de documentos escaneados
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="mostrarHistorialOCR()">
          📜 Historial
        </button>
        <button class="btn btn-primary" onclick="iniciarProcesamientoOCR()">
          ➕ Procesar Documento
        </button>
      </div>
    </div>

    <!-- Información del OCR -->
    <div class="ocr-info-cards">
      <div class="info-card">
        <div class="info-card-icon">📄</div>
        <div class="info-card-content">
          <h3>Formatos Soportados</h3>
          <p>JPG, PNG, PDF, TIFF, BMP</p>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-icon">🌐</div>
        <div class="info-card-content">
          <h3>Idioma</h3>
          <p>Español (México)</p>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-icon">⚡</div>
        <div class="info-card-content">
          <h3>Procesamiento</h3>
          <p>Local (sin internet)</p>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-icon">🔒</div>
        <div class="info-card-content">
          <h3>Privacidad</h3>
          <p>100% Seguro</p>
        </div>
      </div>
    </div>

    <!-- Área de procesamiento -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 Área de Procesamiento</h3>
      </div>
      <div class="card-body">
        <div class="ocr-dropzone" id="ocrDropzone" onclick="seleccionarArchivoOCR()">
          <div class="ocr-dropzone-content">
            <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
            <h3>Arrastra un documento aquí</h3>
            <p>o haz clic para seleccionar</p>
            <small>Formatos: JPG, PNG, PDF (máx. 10MB)</small>
          </div>
        </div>

        <div id="ocrResultado" style="display: none;">
          <!-- Aquí se mostrará el resultado -->
        </div>
      </div>
    </div>

    <!-- Documentos procesados recientemente -->
    <div class="card mt-xl">
      <div class="card-header">
        <h3 class="card-title">📚 Procesados Recientemente</h3>
      </div>
      <div class="card-body">
        <div id="documentosRecientes">
          ${renderizarDocumentosRecientes()}
        </div>
      </div>
    </div>
  `;

  document.getElementById('contentArea').innerHTML = html;
  configurarDragAndDropOCR();
}

// ==================== DRAG & DROP ====================

function configurarDragAndDropOCR() {
  const dropzone = document.getElementById('ocrDropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('ocr-dropzone-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('ocr-dropzone-active');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      procesarArchivoOCR(files[0]);
    }
  }, false);
}

// ==================== SELECCIONAR ARCHIVO ====================

async function seleccionarArchivoOCR() {
  try {
    const resultado = await window.electronAPI.seleccionarImagenOCR();

    if (resultado.success) {
      await procesarArchivoOCRPorRuta(resultado.ruta);
    }
  } catch (error) {
    console.error('Error seleccionando archivo:', error);
    sistemaNotificaciones.notificarError(
      'Error',
      'No se pudo seleccionar el archivo'
    );
  }
}

function procesarArchivoOCR(archivo) {
  if (archivo && archivo.path) {
    procesarArchivoOCRPorRuta(archivo.path);
  } else {
    sistemaNotificaciones.notificarError('Error', 'No se pudo obtener la ruta del archivo');
  }
}

// ==================== PROCESAR ARCHIVO ====================

async function procesarArchivoOCRPorRuta(rutaArchivo) {
  const dropzone = document.getElementById('ocrDropzone');
  const resultadoDiv = document.getElementById('ocrResultado');

  // Mostrar loading
  dropzone.style.display = 'none';
  resultadoDiv.style.display = 'block';
  resultadoDiv.innerHTML = `
    <div class="ocr-loading">
      <div class="spinner-large"></div>
      <h3>Procesando documento...</h3>
      <p>Esto puede tardar unos segundos</p>
      <div class="ocr-progress">
        <div class="ocr-progress-bar" id="ocrProgressBar"></div>
      </div>
    </div>
  `;

  try {
    // Procesar con OCR
    const resultado = await window.electronAPI.procesarDocumentoOCR(rutaArchivo);

    if (resultado.success) {
      mostrarResultadoOCR(resultado, rutaArchivo);
      guardarEnHistorialOCR(resultado, rutaArchivo);

      sistemaNotificaciones.notificarExito(
        'Procesamiento Completo',
        `Se extrajo texto con ${resultado.confianza.toFixed(1)}% de confianza`
      );
    } else {
      throw new Error(resultado.error || 'Error procesando documento');
    }
  } catch (error) {
    console.error('Error en OCR:', error);

    resultadoDiv.innerHTML = `
      <div class="ocr-error">
        <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
        <h3>Error al Procesar</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="reiniciarOCR()">
          Intentar Nuevamente
        </button>
      </div>
    `;

    sistemaNotificaciones.notificarError(
      'Error en OCR',
      error.message
    );
  }
}

// ==================== MOSTRAR RESULTADO ====================

function mostrarResultadoOCR(resultado, rutaArchivo) {
  const resultadoDiv = document.getElementById('ocrResultado');

  resultadoDiv.innerHTML = `
    <div class="ocr-resultado">
      <!-- Header del resultado -->
      <div class="ocr-resultado-header">
        <div>
          <h3>✅ Procesamiento Completado</h3>
          <p>Confianza: <strong>${resultado.confianza.toFixed(1)}%</strong> • 
             Palabras: <strong>${resultado.palabras}</strong> • 
             Líneas: <strong>${resultado.lineas}</strong></p>
        </div>
        <div class="ocr-resultado-actions">
          <button class="btn btn-sm btn-secondary" onclick="copiarTextoOCR()">
            📋 Copiar Texto
          </button>
          <button class="btn btn-sm btn-secondary" onclick="exportarResultadoOCR()">
            💾 Exportar
          </button>
          <button class="btn btn-sm btn-primary" onclick="reiniciarOCR()">
            🔄 Procesar Otro
          </button>
        </div>
      </div>

      <!-- Tipo de documento detectado -->
      ${resultado.tipoDocumento !== 'DESCONOCIDO' ? `
        <div class="ocr-tipo-documento">
          <span class="badge badge-info">
            ${formatearTipoDocumento(resultado.tipoDocumento)}
          </span>
        </div>
      ` : ''}

      <!-- Datos extraídos -->
      ${renderizarDatosExtraidos(resultado.datos, resultado.datosEspecificos)}

      <!-- Texto completo -->
      <div class="ocr-texto-completo">
        <h4>📄 Texto Extraído</h4>
        <div class="ocr-texto-container" id="textoOCR">
          <pre>${resultado.texto}</pre>
        </div>
      </div>

      <!-- Acciones adicionales -->
      <div class="ocr-acciones-adicionales">
        <button class="btn btn-secondary" onclick="crearProyectoDesdeOCR()">
          📁 Crear Proyecto con estos Datos
        </button>
        <button class="btn btn-secondary" onclick="agregarAProyectoExistente()">
          ➕ Agregar a Proyecto Existente
        </button>
      </div>
    </div>
  `;

  // Guardar resultado globalmente para otras funciones
  window.ultimoResultadoOCR = resultado;
}

function renderizarDatosExtraidos(datos, datosEspecificos) {
  let html = '<div class="ocr-datos-extraidos">';

  // Datos específicos del tipo de documento
  if (datosEspecificos && Object.keys(datosEspecificos).length > 0) {
    html += '<h4>🎯 Datos Específicos del Documento</h4>';
    html += '<div class="datos-grid">';

    Object.entries(datosEspecificos).forEach(([key, value]) => {
      if (value) {
        html += `
          <div class="dato-item">
            <span class="dato-label">${formatearClave(key)}</span>
            <span class="dato-value">${value}</span>
          </div>
        `;
      }
    });

    html += '</div>';
  }

  // Datos generales extraídos
  html += '<h4>📊 Datos Generales Extraídos</h4>';
  html += '<div class="datos-grid">';

  if (datos.fechas && datos.fechas.length > 0) {
    html += `
      <div class="dato-item">
        <span class="dato-label">📅 Fechas</span>
        <span class="dato-value">${datos.fechas.join(', ')}</span>
      </div>
    `;
  }

  if (datos.emails && datos.emails.length > 0) {
    html += `
      <div class="dato-item">
        <span class="dato-label">📧 Emails</span>
        <span class="dato-value">${datos.emails.join(', ')}</span>
      </div>
    `;
  }

  if (datos.telefonos && datos.telefonos.length > 0) {
    html += `
      <div class="dato-item">
        <span class="dato-label">📞 Teléfonos</span>
        <span class="dato-value">${datos.telefonos.join(', ')}</span>
      </div>
    `;
  }

  if (datos.rfc && datos.rfc.length > 0) {
    html += `
      <div class="dato-item">
        <span class="dato-label">🏢 RFC</span>
        <span class="dato-value">${datos.rfc.join(', ')}</span>
      </div>
    `;
  }

  if (datos.direcciones && datos.direcciones.length > 0) {
    html += `
      <div class="dato-item">
        <span class="dato-label">📍 Direcciones</span>
        <span class="dato-value">${datos.direcciones.join(', ')}</span>
      </div>
    `;
  }

  html += '</div></div>';
  return html;
}

// ==================== ACCIONES ====================

function copiarTextoOCR() {
  const texto = window.ultimoResultadoOCR?.texto;
  if (!texto) return;

  navigator.clipboard.writeText(texto).then(() => {
    sistemaNotificaciones.notificarExito(
      'Texto Copiado',
      'El texto se ha copiado al portapapeles'
    );
  }).catch(err => {
    console.error('Error copiando texto:', err);
    sistemaNotificaciones.notificarError(
      'Error',
      'No se pudo copiar el texto'
    );
  });
}

function exportarResultadoOCR() {
  const resultado = window.ultimoResultadoOCR;
  if (!resultado) return;

  const datos = {
    fecha: new Date().toISOString(),
    confianza: resultado.confianza,
    tipoDocumento: resultado.tipoDocumento,
    texto: resultado.texto,
    datosExtraidos: resultado.datos,
    datosEspecificos: resultado.datosEspecificos
  };

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ocr_resultado_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  sistemaNotificaciones.notificarExito(
    'Resultado Exportado',
    'El resultado se ha guardado como JSON'
  );
}

function reiniciarOCR() {
  document.getElementById('ocrDropzone').style.display = 'flex';
  document.getElementById('ocrResultado').style.display = 'none';
  document.getElementById('ocrResultado').innerHTML = '';
  window.ultimoResultadoOCR = null;
}

async function crearProyectoDesdeOCR() {
  const resultado = window.ultimoResultadoOCR;
  if (!resultado) return;

  // Pre-llenar formulario con datos extraídos
  mostrarFormularioProyecto();

  // Esperar a que se cree el modal
  setTimeout(() => {
    const form = document.querySelector('#modalFormularioProyecto form');
    if (!form) return;

    // Intentar llenar campos automáticamente
    if (resultado.datosEspecificos?.establecimiento) {
      const nombreInput = form.querySelector('[name="nombre"]');
      if (nombreInput) nombreInput.value = resultado.datosEspecificos.establecimiento;
    }

    if (resultado.datos.direcciones && resultado.datos.direcciones.length > 0) {
      const direccionInput = form.querySelector('[name="direccion"]');
      if (direccionInput) direccionInput.value = resultado.datos.direcciones[0];
    }

    sistemaNotificaciones.notificarInfo(
      'Datos Pre-llenados',
      'Revisa y completa la información del proyecto'
    );
  }, 500);
}

function agregarAProyectoExistente() {
  // Mostrar selector de proyecto y agregar como nota
  sistemaNotificaciones.notificarInfo(
    'Función en Desarrollo',
    'Esta función estará disponible próximamente'
  );
}

// ==================== HISTORIAL ====================

function guardarEnHistorialOCR(resultado, rutaArchivo) {
  let historial = JSON.parse(localStorage.getItem('historial_ocr') || '[]');

  historial.unshift({
    fecha: new Date().toISOString(),
    archivo: rutaArchivo.split('/').pop(),
    tipoDocumento: resultado.tipoDocumento,
    confianza: resultado.confianza,
    palabras: resultado.palabras,
    resultado: resultado
  });

  // Mantener solo los últimos 20
  historial = historial.slice(0, 20);

  localStorage.setItem('historial_ocr', JSON.stringify(historial));
}

function renderizarDocumentosRecientes() {
  const historial = JSON.parse(localStorage.getItem('historial_ocr') || '[]');

  if (historial.length === 0) {
    return `
      <div class="empty-state-small">
        <p>No hay documentos procesados recientemente</p>
      </div>
    `;
  }

  return `
    <div class="documentos-recientes-lista">
      ${historial.slice(0, 5).map(item => `
        <div class="documento-reciente-item">
          <div class="documento-reciente-icon">📄</div>
          <div class="documento-reciente-info">
            <strong>${item.archivo}</strong>
            <p>${formatearFecha(item.fecha)} • Confianza: ${item.confianza.toFixed(1)}%</p>
          </div>
          <span class="badge badge-info">${formatearTipoDocumento(item.tipoDocumento)}</span>
          <button class="btn btn-sm btn-secondary" onclick="verResultadoOCRHistorial('${item.fecha}')">
            Ver
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function verResultadoOCRHistorial(fecha) {
  const historial = JSON.parse(localStorage.getItem('historial_ocr') || '[]');
  const item = historial.find(h => h.fecha === fecha);

  if (item) {
    window.ultimoResultadoOCR = item.resultado;
    mostrarResultadoOCR(item.resultado, item.archivo);

    // Scroll al resultado
    document.getElementById('ocrResultado').scrollIntoView({ behavior: 'smooth' });
  }
}

function mostrarHistorialOCR() {
  const historial = JSON.parse(localStorage.getItem('historial_ocr') || '[]');

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modalHistorialOCR';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h2>📜 Historial de OCR</h2>
        <button class="close-btn" onclick="cerrarModal('modalHistorialOCR')">×</button>
      </div>
      
      <div class="modal-body">
        ${historial.length > 0 ? `
          <div class="historial-ocr-lista">
            ${historial.map(item => `
              <div class="historial-ocr-item">
                <div class="historial-ocr-info">
                  <strong>${item.archivo}</strong>
                  <p>${formatearFecha(item.fecha)}</p>
                  <div style="display: flex; gap: 10px; margin-top: 8px;">
                    <span class="badge badge-info">${formatearTipoDocumento(item.tipoDocumento)}</span>
                    <span class="badge badge-secondary">Confianza: ${item.confianza.toFixed(1)}%</span>
                    <span class="badge badge-secondary">${item.palabras} palabras</span>
                  </div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="verResultadoOCRHistorial('${item.fecha}'); cerrarModal('modalHistorialOCR');">
                  Ver Resultado
                </button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state-small">
            <p>No hay documentos en el historial</p>
          </div>
        `}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ==================== UTILIDADES ====================

function formatearTipoDocumento(tipo) {
  const tipos = {
    'AVISO_FUNCIONAMIENTO': 'Aviso de Funcionamiento',
    'POLIZA_SEGURO': 'Póliza de Seguro',
    'DICTAMEN_TECNICO': 'Dictamen Técnico',
    'PROGRAMA_INTERNO': 'Programa Interno',
    'PERMISO': 'Permiso',
    'DESCONOCIDO': 'Documento General'
  };
  return tipos[tipo] || tipo;
}

function formatearClave(clave) {
  return clave
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatearFecha(fecha) {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

function iniciarProcesamientoOCR() {
  seleccionarArchivoOCR();
}
