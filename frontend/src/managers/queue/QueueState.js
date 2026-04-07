/**
 * QueueState.js
 * Responsabilidad Única: Gestionar estado de la cola
 * SOLID Compliance: SRP - Solo datos y getters/setters
 *
 * Encapsula:
 * - items: Array de vuelos en cola
 * - isProcessing: Flag de procesamiento
 * - Métodos para modificar estado de forma controlada
 */

export class QueueState {
    constructor() {
        this.items = [];
        this.isProcessing = false;
    }

    /**
     * Agregar vuelo a la cola
     */
    add(flightData) {
        this.items.push(flightData);
        console.log(`✅ Vuelo agregado a estado: ${flightData.codigo}. Total: ${this.items.length}`);
    }

    /**
     * Remover vuelo de la cola
     */
    remove(code) {
        this.items = this.items.filter(item => item.codigo !== code);
        console.log(`🗑️ Vuelo removido: ${code}. Restantes: ${this.items.length}`);
    }

    /**
     * Reemplazar estado completo de la cola
     */
    setItems(items) {
        this.items = items || [];
        console.log(`📋 Cola actualizada con ${this.items.length} items`);
    }

    /**
     * Obtener todos los items
     */
    getItems() {
        return this.items;
    }

    /**
     * Obtener cantidad de items
     */
    getCount() {
        return this.items.length;
    }

    /**
     * Establecer flag de procesamiento
     */
    setProcessing(value) {
        this.isProcessing = value;
        console.log(`⏳ Estado procesamiento: ${value ? 'INICIADO' : 'FINALIZADO'}`);
    }

    /**
     * Verificar si la cola está siendo procesada
     */
    isProcessingQueue() {
        return this.isProcessing;
    }

    /**
     * Limpiar cola
     */
    clear() {
        this.items = [];
        this.isProcessing = false;
        console.log('🗑️ Cola limpiada completamente');
    }

    /**
     * Obtener estado completo
     */
    getState() {
        return {
            items: this.items,
            count: this.items.length,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Verificar si la cola está vacía
     */
    isEmpty() {
        return this.items.length === 0;
    }
}
