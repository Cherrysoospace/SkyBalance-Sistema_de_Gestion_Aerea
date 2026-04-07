/**
 * QueueAPIClient.js
 * Responsabilidad Única: Comunicación con backend
 * SOLID Compliance: SRP - Solo llamadas HTTP
 *
 * Encapsula:
 * - Llamadas a /queue/* endpoints
 * - Manejo de errores de API
 * - Request/response normalization
 */

export class QueueAPIClient {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    /**
     * Encolar un vuelo en el backend
     */
    async enqueue(flightData) {
        try {
            const response = await this.apiClient.enqueueInsertion(flightData);
            console.log('✅ API: Vuelo encolado correctamente');
            return response;
        } catch (error) {
            console.error('❌ API Error - Enqueue:', error);
            throw error;
        }
    }

    /**
     * Obtener lista actual de la cola
     */
    async fetchQueue() {
        try {
            const response = await this.apiClient.getQueue();
            const items = response.items || [];
            console.log(`✅ API: Cola obtenida (${items.length} items)`);
            return items;
        } catch (error) {
            console.error('❌ API Error - Fetch Queue:', error);
            throw error;
        }
    }

    /**
     * Obtener pasos de procesamiento de la cola
     */
    async processQueueWithSteps() {
        try {
            const response = await this.apiClient.processQueueWithSteps();
            console.log(`✅ API: Pasos obtenidos (${response.result?.processed || 0} inserciones)`);
            return response;
        } catch (error) {
            console.error('❌ API Error - Process Queue Steps:', error);
            throw error;
        }
    }

    /**
     * Limpiar cola en backend
     */
    async clearRemote() {
        try {
            const response = await this.apiClient.clearQueue();
            console.log('✅ API: Cola limpiada en backend');
            return response;
        } catch (error) {
            console.error('❌ API Error - Clear Queue:', error);
            throw error;
        }
    }
}
