/**
 * QueueOrchestrator.js
 * Single Responsibility: Orchestrate queue flow
 * SOLID Compliance: SRP + Facade Pattern
 *
 * Coordinates:
 * - QueueState: State
 * - QueueAPIClient: Communication
 * - QueueUIRenderer: Rendering
 *
 * Keeps compatibility with the legacy QueueManager public API
 */

export class QueueOrchestrator {
    constructor(state, apiClient, uiRenderer) {
        this.state = state;
        this.apiClient = apiClient;
        this.uiRenderer = uiRenderer;
    }

    /**
     * Enqueue a flight
     * API call + update state + update UI
     */
    async enqueueInsertion(flightData) {
        try {
            // 1. Talk to backend
            await this.apiClient.enqueue(flightData);

            // 2. Update internal state
            this.state.add(flightData);

            // 3. Update UI
            await this.updateQueueDisplay();

            console.log(`✅ Flujo: Vuelo ${flightData.codigo} encolado completamente`);
        } catch (error) {
            console.error('❌ Flujo: Error en enqueue:', error);
            throw error;
        }
    }

    /**
     * Update queue display
     * Fetch from backend, update state, render UI
     */
    async updateQueueDisplay() {
        try {
            // 1. Fetch queue from backend
            const items = await this.apiClient.fetchQueue();

            // 2. Update state
            this.state.setItems(items);

            // 3. Render UI
            this.uiRenderer.render(items);

            console.log(`✅ Flujo: Display actualizado (${items.length} items)`);
        } catch (error) {
            console.error('❌ Flujo: Error actualizando display:', error);
        }
    }

    /**
        * Process queue with steps (fetch steps for animation)
        * Returns steps so QueueProcessingAnimationManager can process them
     */
    async processQueueWithSteps() {
        if (this.state.isProcessingQueue()) {
            console.warn('⚠️ Flujo: La cola ya está siendo procesada');
            return null;
        }

        this.state.setProcessing(true);
        try {
            const response = await this.apiClient.processQueueWithSteps();
            console.log(`✅ Flujo: Steps obtenidos para procesamiento`);
            return response;
        } catch (error) {
            console.error('❌ Flujo: Error procesando steps:', error);
            throw error;
        } finally {
            this.state.setProcessing(false);
        }
    }

    /**
     * Clear queue completely
     * Backend + state + UI
     */
    async clearQueue() {
        try {
            // 1. Clear in backend (if needed)
            await this.apiClient.clearRemote();

            // 2. Clear state
            this.state.clear();

            // 3. Clear UI
            this.uiRenderer.clear();

            console.log(`✅ Flujo: Cola limpiada completamente`);
        } catch (error) {
            console.error('❌ Flujo: Error limpiando cola:', error);
        }
    }

    /**
        * Get current queue state
        * Compatible with the legacy public API
     */
    getQueueState() {
        return this.state.getState();
    }

    /**
        * Getter for direct state access
        * (useful for debugging)
     */
    getState() {
        return this.state;
    }

    /**
        * Getter for direct renderer access
        * (useful for debugging or fine-grained control)
     */
    getUIRenderer() {
        return this.uiRenderer;
    }

    /**
        * Getter for direct API client access
        * (useful for debugging or fine-grained control)
     */
    getAPIClient() {
        return this.apiClient;
    }
}
