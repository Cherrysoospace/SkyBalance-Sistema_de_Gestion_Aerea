/**
 * QueueOrchestrator.js
 * Responsabilidad Única: Orquestar flujo de cola
 * SOLID Compliance: SRP + Facade Pattern
 *
 * Coordina:
 * - QueueState: Estado
 * - QueueAPIClient: Comunicación
 * - QueueUIRenderer: Visualización
 *
 * Mantiene compatibilidad con API pública del antiguo QueueManager
 */

export class QueueOrchestrator {
    constructor(state, apiClient, uiRenderer) {
        this.state = state;
        this.apiClient = apiClient;
        this.uiRenderer = uiRenderer;
    }

    /**
     * Encolar un vuelo
     * Llamada API + actualizar estado + actualizar UI
     */
    async enqueueInsertion(flightData) {
        try {
            // 1. Comunicar con backend
            await this.apiClient.enqueue(flightData);

            // 2. Actualizar estado interno
            this.state.add(flightData);

            // 3. Actualizar UI
            await this.updateQueueDisplay();

            console.log(`✅ Flujo: Vuelo ${flightData.codigo} encolado completamente`);
        } catch (error) {
            console.error('❌ Flujo: Error en enqueue:', error);
            throw error;
        }
    }

    /**
     * Actualizar display de la cola
     * Obtener lista del backend, actualizar estado, renderizar UI
     */
    async updateQueueDisplay() {
        try {
            // 1. Obtener cola del backend
            const items = await this.apiClient.fetchQueue();

            // 2. Actualizar estado
            this.state.setItems(items);

            // 3. Renderizar UI
            this.uiRenderer.render(items);

            console.log(`✅ Flujo: Display actualizado (${items.length} items)`);
        } catch (error) {
            console.error('❌ Flujo: Error actualizando display:', error);
        }
    }

    /**
     * Procesar cola con pasos (obtener steps para animación)
     * Retorna pasos para que QueueProcessingAnimationManager los procese
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
     * Limpiar cola completamente
     * Backend + estado + UI
     */
    async clearQueue() {
        try {
            // 1. Limpiar en backend (si es necesario)
            await this.apiClient.clearRemote();

            // 2. Limpiar estado
            this.state.clear();

            // 3. Limpiar UI
            this.uiRenderer.clear();

            console.log(`✅ Flujo: Cola limpiada completamente`);
        } catch (error) {
            console.error('❌ Flujo: Error limpiando cola:', error);
        }
    }

    /**
     * Obtener estado actual de la cola
     * Compatible con API pública anterior
     */
    getQueueState() {
        return this.state.getState();
    }

    /**
     * Getter para acceso directo al estado
     * (útil para debugging)
     */
    getState() {
        return this.state;
    }

    /**
     * Getter para acceso directo al renderer
     * (útil para debugging o control fino)
     */
    getUIRenderer() {
        return this.uiRenderer;
    }

    /**
     * Getter para acceso directo al API client
     * (útil para debugging o control fino)
     */
    getAPIClient() {
        return this.apiClient;
    }
}
