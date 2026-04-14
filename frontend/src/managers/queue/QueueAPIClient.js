/**
 * QueueAPIClient.js
 * Single Responsibility: Backend communication
 * SOLID Compliance: SRP - HTTP calls only
 *
 * Encapsulates:
 * - Calls to /queue/* endpoints
 * - API error handling
 * - Request/response normalization
 */

export class QueueAPIClient {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    /**
        * Enqueue a flight in the backend
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
        * Fetch current queue items
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
        * Fetch queue processing steps
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
        * Clear the backend queue
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
