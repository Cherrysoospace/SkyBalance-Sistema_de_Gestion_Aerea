/**
 * GestionNodosOperations.js
 * Responsabilidad Única: Operaciones CRUD de nodos
 * SOLID Compliance: SRP - Solo operaciones y formularios
 *
 * Encapsula:
 * - Abrir formularios modales
 * - Procesar envíos
 * - Operaciones de API (insert, update, delete)
 * - Exportación
 */

export class GestionNodosOperations {
    /**
     * @param {ApiClient} apiClient - Cliente API
     * @param {ModalManager} modalManager - Gestor de modales
     * @param {QueueManager} queueManager - Gestor de cola
     */
    constructor(apiClient, modalManager, queueManager) {
        this.apiClient = apiClient;
        this.modalManager = modalManager;
        this.queueManager = queueManager;
        this.selectedNode = null;
    }

    /**
     * Setter para el nodo seleccionado
     * @param {Object} node - nodo del árbol seleccionado
     */
    setSelectedNode(node) {
        this.selectedNode = node;
    }

    /**
     * Getter para el nodo seleccionado
     */
    getSelectedNode() {
        return this.selectedNode;
    }

    /**
     * CRUD: Abrir formulario para ADICIONAR nodo
     */
    openAddForm() {
        this.modalManager.open('adicionar', 'Adicionar Nodo', {
            visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                           'field-pasajeros', 'field-precioBase', 'field-promocion',
                           'field-prioridad', 'field-alerta']
        });
    }

    /**
     * CRUD: Abrir formulario para MODIFICAR nodo
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
     * CRUD: Abrir formulario para ELIMINAR nodo
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
     * Operaciones Concurrentes: Abrir formulario para PROGRAMAR INSERCIÓN en cola
     */
    openEnqueueForm() {
        this.modalManager.open('enqueue', 'Programar Inserción de Vuelo', {
            visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                           'field-pasajeros', 'field-precioBase', 'field-promocion',
                           'field-prioridad', 'field-alerta']
        });
    }

    /**
     * Procesar envío de formulario CRUD
     * Router central que maneja todas las operaciones
     *
     * @param {string} action - 'adicionar' | 'modificar' | 'eliminar' | 'enqueue'
     * @param {Object} formData - datos del formulario
     * @returns {Promise<Object>} resultado de la operación
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
                await this.apiClient.updateNode(payload.codigo, payload);
                console.log('✅ Nodo modificado:', payload.codigo);

            } else if (action === 'eliminar') {
                await this.apiClient.deleteNode(payload.codigo);
                console.log('✅ Nodo eliminado:', payload.codigo);
                this.selectedNode = null;

            } else if (action === 'enqueue') {
                // Simulación de Concurrencia: Encolar vuelo
                await this.queueManager.enqueueInsertion(payload);
                console.log('✅ Vuelo programado en cola:', payload.codigo);

                // Actualizar lista de vuelos en cola
                await this.queueManager.updateQueueDisplay();

                // Habilitar botón de procesamiento
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
     * Operación: CANCELAR vuelo (cancela nodo y descendencia)
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
     * Operación: EXPORTAR árbol a JSON
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
     * Normalizar datos del formulario a tipos correctos
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
