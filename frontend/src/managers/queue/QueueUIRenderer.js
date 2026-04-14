/**
 * QueueUIRenderer.js
 * Single Responsibility: Render the queue list UI
 * SOLID Compliance: SRP - DOM manipulation only
 *
 * Encapsulates:
 * - DOM element selection
 * - HTML generation
 * - UI updates
 */

export class QueueUIRenderer {
    constructor(containerId = 'queue-list-container') {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
    }

    /**
        * Render item list
     */
    render(items) {
        if (!this.container) {
            console.warn('⚠️ Container no encontrado:', this.containerId);
            return;
        }

        if (!items || items.length === 0) {
            this.container.innerHTML = '<div class="queue-empty">No hay vuelos en cola</div>';
            console.log('📋 UI: Cola vacía mostrada');
            return;
        }

        this.container.innerHTML = items.map((item, index) => `
            <div class="queue-item" data-codigo="${item.codigo}">
                <span class="queue-index">${index + 1}</span>
                <span class="queue-codigo">${item.codigo}</span>
                <span class="queue-ruta">${item.origen} → ${item.destino}</span>
            </div>
        `).join('');

        console.log(`📋 UI: ${items.length} items renderizados`);
    }

    /**
        * Remove a single item from the queue
     */
    removeItem(code) {
        if (!this.container) return;

        const item = this.container.querySelector(`[data-codigo="${code}"]`);
        if (item) {
            item.remove();
            console.log(`🗑️ UI: Item removido visualmente: ${code}`);
        }
    }

    /**
        * Clear the container completely
     */
    clear() {
        if (!this.container) return;

        this.container.innerHTML = '<div class="queue-empty">Cola vacía</div>';
        console.log('🗑️ UI: Container limpiado');
    }

    /**
        * Check whether the container exists
     */
    isReady() {
        return !!this.container;
    }

    /**
        * Get the container element
     */
    getContainer() {
        return this.container;
    }

    /**
        * Show processing state in the UI
     */
    setProcessing(isProcessing) {
        if (!this.container) return;

        if (isProcessing) {
            this.container.style.opacity = '0.6';
            this.container.style.pointerEvents = 'none';
        } else {
            this.container.style.opacity = '1';
            this.container.style.pointerEvents = 'auto';
        }
    }
}
