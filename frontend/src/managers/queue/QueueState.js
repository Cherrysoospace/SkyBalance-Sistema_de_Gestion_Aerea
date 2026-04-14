/**
 * QueueState.js
 * Single Responsibility: Manage queue state
 * SOLID Compliance: SRP - Data + getters/setters only
 *
 * Encapsulates:
 * - items: Array of queued flights
 * - isProcessing: Processing flag
 * - Methods to update state in a controlled way
 */

export class QueueState {
    constructor() {
        this.items = [];
        this.isProcessing = false;
    }

    /**
        * Add a flight to the queue
     */
    add(flightData) {
        this.items.push(flightData);
        console.log(`✅ Vuelo agregado a estado: ${flightData.codigo}. Total: ${this.items.length}`);
    }

    /**
        * Remove a flight from the queue
     */
    remove(code) {
        this.items = this.items.filter(item => item.codigo !== code);
        console.log(`🗑️ Vuelo removido: ${code}. Restantes: ${this.items.length}`);
    }

    /**
        * Replace the entire queue state
     */
    setItems(items) {
        this.items = items || [];
        console.log(`📋 Cola actualizada con ${this.items.length} items`);
    }

    /**
        * Get all items
     */
    getItems() {
        return this.items;
    }

    /**
        * Get item count
     */
    getCount() {
        return this.items.length;
    }

    /**
        * Set processing flag
     */
    setProcessing(value) {
        this.isProcessing = value;
        console.log(`⏳ Estado procesamiento: ${value ? 'INICIADO' : 'FINALIZADO'}`);
    }

    /**
        * Check whether the queue is being processed
     */
    isProcessingQueue() {
        return this.isProcessing;
    }

    /**
        * Clear the queue
     */
    clear() {
        this.items = [];
        this.isProcessing = false;
        console.log('🗑️ Cola limpiada completamente');
    }

    /**
        * Get full state
     */
    getState() {
        return {
            items: this.items,
            count: this.items.length,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Check whether the queue is empty
     */
    isEmpty() {
        return this.items.length === 0;
    }
}
