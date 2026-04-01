/* ============================================
   QUEUE MANAGER - Gestión de Concurrencia Simulada
   Responsabilidades separadas según SOLID
   ============================================ */

export class QueueManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.queue = [];
        this.isProcessing = false;
    }

    /**
     * RESPONSABILIDAD 1: Encolar inserciones
     * Agrega un vuelo a la cola y actualiza la UI
     */
    async enqueueInsertion(flightData) {
        try {
            const response = await this.apiClient.enqueueInsertion(flightData);
            console.log('✅ Vuelo encolado:', flightData.codigo);
            await this.updateQueueDisplay();
            return response;
        } catch (error) {
            console.error('❌ Error al encolar:', error);
            throw error;
        }
    }

    /**
     * RESPONSABILIDAD 2: Obtener y mostrar cola pendiente
     * Consume GET /queue/ y actualiza la lista visual
     */
    async updateQueueDisplay() {
        try {
            const response = await this.apiClient.getQueue();
            this.queue = response.items || [];
            
            const queueContainer = document.getElementById('queue-list-container');
            if (!queueContainer) return;

            if (this.queue.length === 0) {
                queueContainer.innerHTML = '<div class="queue-empty">No hay vuelos en cola</div>';
                return;
            }

            queueContainer.innerHTML = this.queue.map((item, index) => `
                <div class="queue-item">
                    <span class="queue-index">${index + 1}</span>
                    <span class="queue-codigo">${item.codigo}</span>
                    <span class="queue-ruta">${item.origen} → ${item.destino}</span>
                </div>
            `).join('');

            console.log(`📋 Cola actualizada: ${this.queue.length} pendientes`);
        } catch (error) {
            console.error('❌ Error actualizando cola:', error);
        }
    }

    /**
     * RESPONSABILIDAD 3: Procesar cola con pasos
     * Obtiene los pasos de inserción desde el backend
     */
    async processQueueWithSteps() {
        if (this.isProcessing) {
            console.warn('⚠️ La cola ya está siendo procesada');
            return null;
        }

        this.isProcessing = true;
        try {
            const response = await this.apiClient.processQueueWithSteps();
            console.log(`✅ Cola procesada: ${response.result.processed} inserciones`);
            return response;
        } catch (error) {
            console.error('❌ Error procesando cola:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * RESPONSABILIDAD 4: Animar pasos con callbacks
     * Ejecuta cada paso con pausa y callbacks para visualización
     */
    async animateStepsWithCallbacks(steps, {
        onStepStart = null,
        onStepComplete = null,
        onConflict = null,
        stepDuration = 1000
    } = {}) {
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // Callback al iniciar paso
            if (onStepStart) {
                onStepStart(step, i + 1);
            }

            // Detectar conflictos de balance crítico
            if (step.balance_criticos && step.balance_criticos.length > 0) {
                if (onConflict) {
                    onConflict(step, step.balance_criticos);
                }
            }

            // Esperar antes del siguiente paso
            await new Promise(resolve => setTimeout(resolve, stepDuration));

            // Callback al completar paso
            if (onStepComplete) {
                onStepComplete(step, i + 1);
            }
        }
    }

    /**
     * RESPONSABILIDAD 5: Limpiar cola después de procesamiento exitoso
     */
    async clearQueue() {
        this.queue = [];
        const queueContainer = document.getElementById('queue-list-container');
        if (queueContainer) {
            queueContainer.innerHTML = '<div class="queue-empty">Cola vacía</div>';
        }
        console.log('🗑️ Cola limpiada');
    }

    /**
     * RESPONSABILIDAD 6: Obtener estado actual de la cola
     */
    getQueueState() {
        return {
            items: this.queue,
            count: this.queue.length,
            isProcessing: this.isProcessing
        };
    }
}
