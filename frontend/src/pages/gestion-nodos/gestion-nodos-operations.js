/**
 * GestionNodosOperations.js
 * Single Responsibility: Node CRUD operations
 * SOLID Compliance: SRP - Operations and forms only
 *
 * Encapsulates:
 * - Opening modal forms
 * - Processing submissions
 * - API operations (insert, update, delete)
 * - Export
 */

export class GestionNodosOperations {
    /**
    * @param {ApiClient} apiClient - API client
    * @param {ModalManager} modalManager - Modal manager
    * @param {QueueManager} queueManager - Queue manager
     */
    constructor(apiClient, modalManager, queueManager) {
        this.apiClient = apiClient;
        this.modalManager = modalManager;
        this.queueManager = queueManager;
        this.selectedNode = null;
    }

    /**
        * Selected node setter
        * @param {Object} node - selected tree node
     */
    setSelectedNode(node) {
        this.selectedNode = node;
    }

    /**
        * Selected node getter
     */
    getSelectedNode() {
        return this.selectedNode;
    }

    /**
        * CRUD: Open form to ADD a node
     */
    openAddForm() {
        this.modalManager.open('adicionar', 'Adicionar Nodo', {
            visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                           'field-pasajeros', 'field-precioBase', 'field-promocion',
                           'field-prioridad', 'field-alerta']
        });
    }

    /**
        * CRUD: Open form to EDIT a node
     */
    openEditForm() {
        if (!this.selectedNode) {
            alert('Selecciona un nodo primero');
            return;
        }

        this.modalManager.open('modificar', 'Modificar Nodo', {
            visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                           'field-pasajeros', 'field-precioBase', 'field-promocion',
                           'field-prioridad', 'field-alerta'],
            prefill: {
                'field-codigo': this.selectedNode.codigo,
                'field-origen': this.selectedNode.origen || '',
                'field-destino': this.selectedNode.destino || '',
                'field-horaSalida': this.selectedNode.horaSalida || '',
                'field-pasajeros': this.selectedNode.pasajeros || 0,
                'field-precioBase': this.selectedNode.precioBase || 0,
                'field-promocion': this.selectedNode.promocion || false,
                'field-prioridad': this.selectedNode.prioridad || 0,
                'field-alerta': this.selectedNode.alerta || false
            }
        });
    }

    /**
        * CRUD: Open form to DELETE a node
     */
    openDeleteForm() {
        if (!this.selectedNode) {
            alert('Selecciona un nodo primero');
            return;
        }

        this.modalManager.open('eliminar', 'Eliminar Nodo', {
            visibleFields: ['field-codigo'],
            prefill: {
                'field-codigo': this.selectedNode.codigo
            }
        });
    }

    /**
        * Concurrent operations: Open form to SCHEDULE an INSERTION into the queue
     */
    openEnqueueForm() {
        this.modalManager.open('enqueue', 'Programar Inserción de Vuelo', {
            visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                           'field-pasajeros', 'field-precioBase', 'field-promocion',
                           'field-prioridad', 'field-alerta']
        });
    }

    /**
        * Process CRUD form submission
        * Central router that handles all operations
     *
     * @param {string} action - 'adicionar' | 'modificar' | 'eliminar' | 'enqueue'
        * @param {Object} formData - form data
        * @returns {Promise<Object>} operation result
     */
    async processFormSubmit(action, formData) {
        try {
            const payload = this._normalizeFormData(formData);
            console.log('📤 Enviando payload:', payload);

            if (action === 'adicionar') {
                await this.apiClient.insertNode(payload);
                console.log('✅ Nodo adicionado:', payload.codigo);
                this.selectedNode = null;

            } else if (action === 'modificar') {
                const originalCode = this.selectedNode?.codigo;
                if (!originalCode) {
                    throw new Error('No hay nodo seleccionado para modificar.');
                }

                if (payload.codigo !== originalCode) {
                    alert('⚠️ El ID del nodo no se puede modificar.');
                }

                const immutablePayload = {
                    ...payload,
                    codigo: originalCode,
                };

                await this.apiClient.updateNode(originalCode, immutablePayload);
                console.log('✅ Nodo modificado:', originalCode);

            } else if (action === 'eliminar') {
                await this.apiClient.deleteNode(payload.codigo);
                console.log('✅ Nodo eliminado:', payload.codigo);
                this.selectedNode = null;

            } else if (action === 'enqueue') {
                // Concurrency simulation: enqueue flight
                await this.queueManager.enqueueInsertion(payload);
                console.log('✅ Vuelo programado en cola:', payload.codigo);

                // Update queued flights list
                await this.queueManager.updateQueueDisplay();

                // Enable processing button
                const btnProcesar = document.getElementById('btnProcesarCola');
                if (btnProcesar) {
                    btnProcesar.disabled = false;
                }

                this.modalManager.close();
                return payload;
            }

            return payload;

        } catch (error) {
            console.error('❌ Error en operación:', error);
            alert('Error: ' + (error.response?.data?.detail || error.message));
            throw error;
        }
    }

    /**
        * Operation: CANCEL flight (cancels node and descendants)
     */
    async cancelFlight() {
        if (!this.selectedNode) {
            alert('Selecciona un nodo primero');
            return false;
        }

        if (!confirm(`¿Cancelar vuelo ${this.selectedNode.codigo} y toda su descendencia?`)) {
            return false;
        }

        try {
            await this.apiClient.cancelSubtree(this.selectedNode.codigo);
            console.log('✅ Vuelo cancelado:', this.selectedNode.codigo);
            this.selectedNode = null;
            return true;

        } catch (error) {
            console.error('❌ Error cancelando vuelo:', error);
            alert('Error: ' + error.message);
            return false;
        }
    }

    /**
        * Operation: EXPORT tree to JSON
     */
    async exportTree() {
        try {
            const data = await this.apiClient.getTree();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'arbol_avl.json';
            a.click();
            URL.revokeObjectURL(url);
            console.log('✅ Árbol exportado');

        } catch (error) {
            console.error('❌ Error exportando:', error);
            alert('Error al exportar: ' + error.message);
        }
    }

    /**
        * Normalize form data into correct types
     * @private
     */
    _normalizeFormData(formData) {
        return {
            codigo: formData.codigo || '',
            origen: formData.origen || '',
            destino: formData.destino || '',
            horaSalida: formData.horaSalida || '',
            pasajeros: Number.isNaN(parseInt(formData.pasajeros)) ? 0 : parseInt(formData.pasajeros),
            precioBase: Number.isNaN(parseFloat(formData.precioBase)) ? 0 : parseFloat(formData.precioBase),
            promocion: !!formData.promocion,
            prioridad: Number.isNaN(parseInt(formData.prioridad)) ? 0 : parseInt(formData.prioridad),
            alerta: !!formData.alerta,
        };
    }
}
