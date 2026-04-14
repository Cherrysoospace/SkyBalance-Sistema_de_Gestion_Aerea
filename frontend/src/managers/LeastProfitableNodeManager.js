/**
 * LeastProfitableNodeManager.js
 * Single Responsibility: Manage node deletion by lowest profitability
 * SOLID Compliance: SRP + OCP + DIP
 * 
 * Flow:
 * 1. Compute/fetch the least profitable node
 * 2. Highlight it visually in the tree
 * 3. Show a confirmation dialog with node details
 * 4. If confirmed: delete and update the tree
 */

class LeastProfitableNodeManager {
    /**
     * @param {APIClient} apiClient - Injected API client
     * @param {Object} config - Custom configuration
     */
    constructor(apiClient, config = {}) {
        this.apiClient = apiClient;
        this.config = {
            button: 'btnEliminarMenorRentabilidad',
            highlightColor: '#ff6b6b',      // Node highlight color
            highlightStroke: 4,              // Border width
            modalId: 'modal-confirm-elimination',
            ...config
        };
        this.highlightedNode = null;
        this.treeData = null;
    }

    /**
     * Initialize the manager: store tree and set up listeners
     * @param {Object} initialTreeData - Initial tree data
     */
    async initialize(initialTreeData) {
        this.treeData = initialTreeData;
        this._setupEventListeners();
        console.log('✅ LeastProfitableNodeManager inicializado');
    }

    /**
     * Update the tree data (called after loadTree)
     * @param {Object} newTreeData - New tree data
     */
    updateTreeData(newTreeData) {
        this.treeData = newTreeData;
        this.highlightedNode = null; // Clear previous highlight
    }

    /**
     * Set up the button event listeners
     * @private
     */
    _setupEventListeners() {
        const button = document.getElementById(this.config.button);
        if (button) {
            button.addEventListener('click', () => this._onButtonClick());
        }
    }

    /**
     * Button handler - starts the full flow
     * @private
     */
    async _onButtonClick() {
        if (!this.treeData?.tree) {
            alert('❌ El árbol está vacío. Carga datos primero.');
            return;
        }

        try {
            // Step 1: Find the least profitable node
            const leastProfitableNode = this._findLeastProfitableNode(this.treeData.tree);

            if (!leastProfitableNode) {
                alert('❌ No hay nodos en el árbol');
                return;
            }

            // Step 2: Store it for highlighting
            this.highlightedNode = leastProfitableNode;

            // Step 3: Highlight the node in the tree
            this._highlightNode(leastProfitableNode.codigo);

            // Step 4: Show confirmation with details
            await this._showConfirmationModal(leastProfitableNode);

        } catch (error) {
            console.error('❌ Error en operación:', error);
            alert('Error: ' + error.message);
        }
    }

    /**
     * Recursively collect candidates to determine the least profitable node
     * Formula: profitability = passengers × basePrice – promotionDiscount + penalty
     * Ties: depth DESC, code DESC
     * 
     * @private
     * @param {Object} node - Node to process
     * @param {number} depth - Current depth
     * @param {Array} candidates - Accumulated candidates
     * @returns {Array} Candidate objects in the form { rentability, depth, codigo, node }
     */
    _collectCandidates(node, depth = 0, candidates = []) {
        if (!node) return candidates;

        // Compute profitability based on the requirement formula
        const rentability = this._calculateRentability(node);

        // Store: [profitability, depth, code, node reference]
        candidates.push({
            rentability,
            depth,
            codigo: node.codigo,
            node: node
        });

        // Process children recursively
        if (node.izquierdo) {
            this._collectCandidates(node.izquierdo, depth + 1, candidates);
        }
        if (node.derecho) {
            this._collectCandidates(node.derecho, depth + 1, candidates);
        }

        return candidates;
    }

    /**
     * Compute node profitability
     * Formula: profitability = passengers × basePrice – promotionDiscount + penalty
     * 
     * @private
     * @param {Object} node - Tree node
     * @returns {number} Computed profitability
     */
    _calculateRentability(node) {
        const pasajeros = node.pasajeros || 0;
        const precioBase = node.precioBase || 0;
        
        // Promotion discount: 10% of basePrice if applicable
        const descuentoPromocion = (node.promocion) ? precioBase * 0.1 : 0;
        
        // Penalty: 25% of basePrice if critical
        const penalizacion = (node.critico) ? precioBase * 0.25 : 0;
        
        // Final formula
        return (pasajeros * precioBase) - descuentoPromocion + penalizacion;
    }

    /**
     * Find the least profitable node
     * Ties: 1) Greater depth 2) Larger code
     * 
     * @private
     * @param {Object} treeRoot - Tree root
     * @returns {Object|null} Least profitable node
     */
    _findLeastProfitableNode(treeRoot) {
        if (!treeRoot) return null;

        // Collect all candidates
        const candidates = this._collectCandidates(treeRoot);

        if (candidates.length === 0) return null;

        // Sort by: profitability ASC, depth DESC, code DESC
        candidates.sort((a, b) => {
            if (a.rentability !== b.rentability) {
                return a.rentability - b.rentability; // Lower profitability first
            }
            if (a.depth !== b.depth) {
                return b.depth - a.depth; // Greater depth first
            }
            // Numeric comparison for codes (e.g., SB050)
            const codeA = parseInt(a.codigo.replace(/[^0-9]/g, '')) || 0;
            const codeB = parseInt(b.codigo.replace(/[^0-9]/g, '')) || 0;
            return codeB - codeA; // Larger code first
        });

        // Return the first (lowest profitability with tie-breakers applied)
        return candidates[0].node;
    }

    /**
     * Visually highlight a node in the tree
     * @private
     * @param {string} nodoCodigo - Code of the node to highlight
     */
    _highlightNode(nodoCodigo) {
        // Find the node circle in the DOM
        const nodeElements = document.querySelectorAll('[data-node-code]');

        nodeElements.forEach(el => {
            if (el.getAttribute('data-node-code') === nodoCodigo) {
                // Highlight: change stroke and border styles
                const circle = el.querySelector('circle');
                if (circle) {
                    circle.style.stroke = this.config.highlightColor;
                    circle.style.strokeWidth = this.config.highlightStroke;
                    circle.style.filter = 'drop-shadow(0 0 10px ' + this.config.highlightColor + ')';
                    circle.style.transition = 'all 0.3s ease';
                }
                console.log(`✨ Nodo ${nodoCodigo} resaltado`);
            }
        });
    }

    /**
     * Show a confirmation modal with node details
     * @private
     * @param {Object} node - Selected node
     */
    async _showConfirmationModal(node) {
        const rentability = this._calculateRentability(node);

        const html = `
<div class="modal-overlay confirmation-overlay">
    <div class="modal-content confirmation-modal">
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <h2 style="color: white; margin: 0;">
                <i class="fas fa-exclamation-circle"></i> Confirmar Eliminación
            </h2>
            <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body" style="padding: 2rem;">
            <div class="info-box" style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px;">
                <p style="margin: 0.5rem 0;"><strong>Código del Vuelo:</strong> <span style="font-family: monospace; color: #667eea;">${node.codigo}</span></p>
                <p style="margin: 0.5rem 0;"><strong>Rentabilidad:</strong> <span style="font-family: monospace; color: ${rentability < 0 ? '#e74c3c' : '#27ae60'};">$${rentability.toFixed(2)}</span></p>
                <p style="margin: 0.5rem 0;"><strong>Pasajeros:</strong> <span style="font-family: monospace;">${node.pasajeros}</span></p>
                <p style="margin: 0.5rem 0;"><strong>Ruta:</strong> <span style="font-family: monospace;">${node.origen} → ${node.destino}</span></p>
                <p style="margin: 0.5rem 0;"><strong>Estado:</strong> ${node.critico ? '<span style="color: #e74c3c;">🔴 CRÍTICO</span>' : '<span style="color: #27ae60;">🟢 Normal</span>'}</p>
            </div>

            <div class="warning-box" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem;">
                <p style="margin: 0;">
                    <strong><i class="fas fa-warning"></i> Advertencia:</strong> 
                    Al eliminar este nodo, <strong>TODA su subrama será cancelada</strong>. 
                    Esta acción no puede deshacerse inmediatamente.
                </p>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()" style="padding: 0.75rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn-confirm-elimination" style="padding: 0.75rem 1.5rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-trash"></i> Eliminar Nodo
                </button>
            </div>
        </div>
    </div>
</div>
        `;

        // Create modal element
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = html;
        document.body.appendChild(modalDiv);

        // Wire up the confirmation button
        modalDiv.querySelector('.btn-confirm-elimination').addEventListener('click', async () => {
            modalDiv.remove();
            await this._executeElimination(node.codigo);
        });
    }

    /**
     * Execute the node deletion
     * @private
     * @param {string} codigo - Code of the node to delete
     */
    async _executeElimination(codigo) {
        const button = document.getElementById(this.config.button);

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

            // Call backend endpoint
            const response = await this.apiClient.removeLeastProfitable();

            if (response && response.result && response.result.removed > 0) {
                console.log(`✅ Nodo ${codigo} eliminado exitosamente`);
                console.log(`   Nodos removidos: ${response.result.removed}`);

                // Show success notification
                this._showSuccessNotification(response.result);

                // Dispatch custom event so gestion-nodos.js can refresh
                document.dispatchEvent(new CustomEvent('leastProfitableNodeRemoved', {
                    detail: {
                        codigo: codigo,
                        removed: response.result.removed,
                        tree: response.tree,
                        metrics: response.metrics
                    }
                }));

            } else {
                alert('❌ Error: No se pudo eliminar el nodo');
            }

        } catch (error) {
            console.error('❌ Error eliminando nodo:', error);
            
            // Improve error message for the user
            let errorMessage = error.message;
            if (error.message === 'Failed to fetch') {
                errorMessage = '❌ No se puede conectar con el backend\n\n' +
                    'Asegúrate de que:\n' +
                    '1. El servidor backend está corriendo en http://localhost:8000\n' +
                    '2. Ejecuta: python -m uvicorn main:app --reload\n' +
                    '3. Desde la carpeta: backend/';
            }
            alert(errorMessage);

        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar Menor Rentabilidad';
            this.highlightedNode = null;
        }
    }

    /**
     * Show a success notification
     * @private
     * @param {Object} result - Operation result
     */
    _showSuccessNotification(result) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            <strong>✅ Eliminación exitosa</strong><br>
            Nodos removidos: ${result.removed}
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

export { LeastProfitableNodeManager };
