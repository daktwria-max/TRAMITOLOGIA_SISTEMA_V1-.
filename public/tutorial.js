/* ================================================
   TUTORIAL SYSTEM - TRAMITOLOGIA CDMX
   Sistema de Tutorial Interactivo con Tooltips
   ================================================ */

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;

        // Definición de pasos del tutorial
        this.steps = [
            {
                target: '.logo',
                title: '¡Bienvenido a TRAMITOLOGIA CDMX! 👋',
                content: 'Sistema profesional de gestión de trámites administrativos. Te mostraremos las funciones principales en unos segundos.',
                position: 'right',
                highlightPadding: 10
            },
            {
                target: '.sidebar-nav',
                title: 'Navegación Principal 📍',
                content: 'Desde aquí accedes a todas las secciones: Proyectos, Tareas, Documentos, y más. Las secciones están organizadas por categorías.',
                position: 'right',
                highlightPadding: 15
            },
            {
                target: '[data-view="proyectos"]',
                title: 'Proyectos 📁',
                content: 'Organiza tus expedientes y trámites por proyectos. Cada proyecto puede contener tareas, documentos y un seguimiento completo.',
                position: 'right',
                highlightPadding: 8
            },
            {
                target: '[data-view="tareas"]',
                title: 'Gestión de Tareas ✅',
                content: 'Crea, asigna y da seguimiento a tareas. Puedes establecer prioridades, fechas límite y vincularlas a proyectos.',
                position: 'right',
                highlightPadding: 8
            },
            {
                target: '[data-view="documentos"]',
                title: 'Documentos 📄',
                content: 'Gestiona todos tus archivos en un solo lugar. Organiza documentos por proyecto, categoría o etiquetas.',
                position: 'right',
                highlightPadding: 8
            },
            {
                target: '[data-view="ocr"]',
                title: 'OCR - Digitalización 🔍',
                content: 'Convierte imágenes y PDFs escaneados en texto editable automáticamente usando reconocimiento óptico de caracteres.',
                position: 'right',
                highlightPadding: 8
            },
            {
                target: '[data-view="checklists"]',
                title: 'Auditorías y Checklists 📋',
                content: 'Crea listas de verificación para auditorías INVEA, cumplimiento normativo y control de calidad.',
                position: 'right',
                highlightPadding: 8
            },
            {
                target: '.search-bar',
                title: 'Búsqueda Global 🔎',
                content: 'Encuentra rápidamente cualquier proyecto, tarea o documento usando la búsqueda global.',
                position: 'bottom',
                highlightPadding: 8
            },
            {
                target: '.content-area',
                title: '¡Todo Listo! 🎉',
                content: 'Ya conoces las funciones principales. Puedes reiniciar este tutorial en cualquier momento desde Configuración.',
                position: 'center',
                highlightPadding: 0
            }
        ];
    }

    // Iniciar tutorial
    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.currentStep = 0;
        this.createElements();
        this.showStep(0);
    }

    // Crear elementos del tutorial
    createElements() {
        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        document.body.appendChild(this.overlay);

        // Tooltip container
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tutorial-tooltip';
        this.tooltip.innerHTML = `
      <div class="tutorial-tooltip-header">
        <h3 class="tutorial-tooltip-title"></h3>
        <button class="tutorial-close-btn" aria-label="Cerrar tutorial">×</button>
      </div>
      <div class="tutorial-tooltip-content"></div>
      <div class="tutorial-tooltip-footer">
        <div class="tutorial-progress">
          <span class="tutorial-progress-text">Paso <span class="current">1</span> de <span class="total">${this.steps.length}</span></span>
        </div>
        <div class="tutorial-controls">
          <button class="tutorial-btn tutorial-btn-skip">Saltar</button>
          <button class="tutorial-btn tutorial-btn-previous">← Anterior</button>
          <button class="tutorial-btn tutorial-btn-primary tutorial-btn-next">Siguiente →</button>
        </div>
      </div>
      <div class="tutorial-arrow"></div>
    `;
        document.body.appendChild(this.tooltip);

        // Event listeners
        this.tooltip.querySelector('.tutorial-close-btn').addEventListener('click', () => this.skip());
        this.tooltip.querySelector('.tutorial-btn-skip').addEventListener('click', () => this.skip());
        this.tooltip.querySelector('.tutorial-btn-previous').addEventListener('click', () => this.previous());
        this.tooltip.querySelector('.tutorial-btn-next').addEventListener('click', () => this.next());
        this.overlay.addEventListener('click', () => this.next());
    }

    // Mostrar paso específico
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        // Actualizar contenido
        this.tooltip.querySelector('.tutorial-tooltip-title').textContent = step.title;
        this.tooltip.querySelector('.tutorial-tooltip-content').textContent = step.content;
        this.tooltip.querySelector('.tutorial-progress .current').textContent = stepIndex + 1;

        // Actualizar botones
        const prevBtn = this.tooltip.querySelector('.tutorial-btn-previous');
        const nextBtn = this.tooltip.querySelector('.tutorial-btn-next');

        prevBtn.disabled = stepIndex === 0;
        prevBtn.style.display = stepIndex === 0 ? 'none' : 'inline-flex';

        if (stepIndex === this.steps.length - 1) {
            nextBtn.textContent = '¡Comenzar! ✨';
        } else {
            nextBtn.textContent = 'Siguiente →';
        }

        // Posicionar tooltip
        this.positionTooltip(step);

        // Resaltar elemento
        this.highlightElement(step);

        // Animación de entrada
        requestAnimationFrame(() => {
            this.tooltip.classList.add('tutorial-tooltip-visible');
        });
    }

    // Posicionar tooltip
    positionTooltip(step) {
        const target = document.querySelector(step.target);
        if (!target) {
            // Si no hay target, centrar
            this.tooltip.style.left = '50%';
            this.tooltip.style.top = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const arrow = this.tooltip.querySelector('.tutorial-arrow');

        let left, top, arrowClass;

        switch (step.position) {
            case 'right':
                left = rect.right + 20;
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                arrowClass = 'tutorial-arrow-left';
                break;
            case 'left':
                left = rect.left - tooltipRect.width - 20;
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                arrowClass = 'tutorial-arrow-right';
                break;
            case 'bottom':
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.bottom + 20;
                arrowClass = 'tutorial-arrow-top';
                break;
            case 'top':
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                top = rect.top - tooltipRect.height - 20;
                arrowClass = 'tutorial-arrow-bottom';
                break;
            default:
                left = window.innerWidth / 2 - tooltipRect.width / 2;
                top = window.innerHeight / 2 - tooltipRect.height / 2;
                arrowClass = '';
        }

        // Ajustar si se sale de la pantalla
        if (left < 20) left = 20;
        if (left + tooltipRect.width > window.innerWidth - 20) {
            left = window.innerWidth - tooltipRect.width - 20;
        }
        if (top < 20) top = 20;
        if (top + tooltipRect.height > window.innerHeight - 20) {
            top = window.innerHeight - tooltipRect.height - 20;
        }

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
        this.tooltip.style.transform = 'none';

        // Actualizar flecha
        arrow.className = 'tutorial-arrow ' + arrowClass;
    }

    // Resaltar elemento
    highlightElement(step) {
        // Remover resaltado anterior
        const prevHighlight = document.querySelector('.tutorial-highlight');
        if (prevHighlight) {
            prevHighlight.classList.remove('tutorial-highlight');
        }

        const target = document.querySelector(step.target);
        if (!target) return;

        target.classList.add('tutorial-highlight');

        // Hacer scroll si es necesario
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Siguiente paso
    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.tooltip.classList.remove('tutorial-tooltip-visible');
            setTimeout(() => {
                this.showStep(this.currentStep + 1);
            }, 200);
        } else {
            this.complete();
        }
    }

    // Paso anterior
    previous() {
        if (this.currentStep > 0) {
            this.tooltip.classList.remove('tutorial-tooltip-visible');
            setTimeout(() => {
                this.showStep(this.currentStep - 1);
            }, 200);
        }
    }

    // Saltar tutorial
    skip() {
        if (confirm('¿Seguro que quieres saltar el tutorial? Puedes reiniciarlo desde Configuración.')) {
            this.complete();
        }
    }

    // Completar tutorial
    complete() {
        this.isActive = false;

        // Animación de salida
        this.tooltip.classList.remove('tutorial-tooltip-visible');
        this.overlay.classList.add('tutorial-overlay-hide');

        setTimeout(() => {
            // Limpiar elementos
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            if (this.tooltip && this.tooltip.parentNode) {
                this.tooltip.parentNode.removeChild(this.tooltip);
            }

            // Remover resaltado
            const highlight = document.querySelector('.tutorial-highlight');
            if (highlight) {
                highlight.classList.remove('tutorial-highlight');
            }

            this.overlay = null;
            this.tooltip = null;

            // Guardar que el tutorial se completó
            localStorage.setItem('tramitologia_tutorial_completed', 'true');
        }, 300);
    }

    // Verificar si es la primera vez
    static isFirstTime() {
        return !localStorage.getItem('tramitologia_tutorial_completed');
    }

    // Reiniciar tutorial manualmente
    static restart() {
        localStorage.removeItem('tramitologia_tutorial_completed');
        const tutorial = new TutorialSystem();
        tutorial.start();
    }
}

// Exponer globalmente
window.TutorialSystem = TutorialSystem;

// Auto-iniciar en primer uso
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que la UI esté lista
    setTimeout(() => {
        if (TutorialSystem.isFirstTime()) {
            console.log('🎓 Primer uso detectado - Iniciando tutorial');
            const tutorial = new TutorialSystem();
            tutorial.start();
        }
    }, 1500);
});
