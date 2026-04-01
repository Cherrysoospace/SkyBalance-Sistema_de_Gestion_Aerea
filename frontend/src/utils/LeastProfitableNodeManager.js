/**
 * LeastProfitableNodeManager.js
 * Responsabilidad Única: Gestionar la eliminación de nodos por menor rentabilidad
 * SOLID Compliance: SRP + OCP + DIP
 * 
 * Flujo:
 * 1. Calcular/obtener nodo de menor rentabilidad
 * 2. Resaltarlo visualmente en el árbol
 * 3. Mostrar confirmación con datos del nodo
 * 4. Si confirma: eliminar y actualizar árbol
 */

class LeastProfitableNodeManager {
    /**
     * @param {APIClient} apiClient - Cliente API inyectado
     * @param {Object} config - Configuración personalizada
     */
    constructor(apiClient, config = {}) {
        this.apiClient = apiClient;
        this.config = {
            button: 'btnEliminarMenorRentabilidad',
            highlightColor: '#ff6b6b',      // Color para resaltar nodo
            highlightStroke: 4,              // Grosor del borde
            modalId: 'modal-confirm-elimination',
            ...config
        };
        this.highlightedNode = null;
        this.treeData = null;
    }

    /**
     * Inicializar el manager: obtener árbol y configurar listeners
     * @param {Object} initialTreeData - Datos iniciales del árbol
     */
    async initialize(initialTreeData) {
        this.treeData = initialTreeData;
        this._setupEventListeners();
        console.log('✅ LeastProfitableNodeManager inicializado');
    }

    /**
     * Actualizar los datos del árbol (se llama después de loadTree)
     * @param {Object} newTreeData - Nuevos datos del árbol
     */
    updateTreeData(newTreeData) {
        this.treeData = newTreeData;
        this.highlightedNode = null; // Limpiar resaltado anterior
    }

    /**
     * Configurar event listeners del botón
     * @private
     */
    _setupEventListeners() {
        const button = document.getElementById(this.config.button);
        if (button) {
            button.addEventListener('click', () => this._onButtonClick());
        }
    }

    /**
     * Handler del botón - inicia el flujo completo
     * @private
     */
    async _onButtonClick() {
        if (!this.treeData?.tree) {
            alert('❌ El árbol está vacío. Carga datos primero.');
            return;
        }

        try {
            // Paso 1: Encontrar el nodo de menor rentabilidad
            const leastProfitableNode = this._findLeastProfitableNode(this.treeData.tree);

            if (!leastProfitableNode) {
                alert('❌ No hay nodos en el árbol');
                return;
            }

            // Paso 2: Guardar en variable global para resaltado
            this.highlightedNode = leastProfitableNode;

            // Paso 3: Resaltar el nodo en el árbol
            this._highlightNode(leastProfitableNode.codigo);

            // Paso 4: Mostrar confirmación con datos
            await this._showConfirmationModal(leastProfitableNode);

        } catch (error) {
            console.error('❌ Error en operación:', error);
            alert('Error: ' + error.message);
        }
    }

    /**
     * Encontrar recursivamente el nodo de menor rentabilidad
     * Fórmula: rentabilidad = pasajeros × precioBase – promoción + penalización
     * Desempates: profundidad DESC, código DESC
     * 
     * @private
     * @param {Object} node - Nodo a procesar
     * @param {number} depth - Profundidad actual
     * @param {Array} candidates - Array de candidatos acumulados
     * @returns {Array} Candidatos en formato [rentabilidad, profundidad, código, nodo]
     */
    _collectCandidates(node, depth = 0, candidates = []) {
        if (!node) return candidates;

        // Calcular rentabilidad según fórmula del requerimiento
        const rentability = this._calculateRentability(node);

        // Almacenar: [rentabilidad, profundidad, código, referencia del nodo]
        candidates.push({
            rentability,
            depth,
            codigo: node.codigo,
            node: node
        });

        // Procesar hijos recursivamente
        if (node.izquierdo) {
            this._collectCandidates(node.izquierdo, depth + 1, candidates);
        }
        if (node.derecho) {
            this._collectCandidates(node.derecho, depth + 1, candidates);
        }

        return candidates;
    }

    /**
     * Calcular rentabilidad de un nodo
     * Fórmula: rentabilidad = pasajeros × precioBase – promoción + penalización
     * 
     * @private
     * @param {Object} node - Nodo del árbol
     * @returns {number} Rentabilidad calculada
     */
    _calculateRentability(node) {
        const pasajeros = node.pasajeros || 0;
        const precioBase = node.precioBase || 0;
        
        // Descuento por promoción: 10% del precioBase si aplica
        const descuentoPromocion = (node.promocion) ? precioBase * 0.1 : 0;
        
        // Penalización: 25% del precioBase si es crítico
        const penalizacion = (node.critico) ? precioBase * 0.25 : 0;
        
        // Fórmula final
        return (pasajeros * precioBase) - descuentoPromocion + penalizacion;
    }

    /**
     * Encontrar el nodo de menor rentabilidad
     * Desempates: 1) Mayor profundidad 2) Código más grande
     * 
     * @private
     * @param {Object} treeRoot - Raíz del árbol
     * @returns {Object|null} Nodo de menor rentabilidad
     */
    _findLeastProfitableNode(treeRoot) {
        if (!treeRoot) return null;

        // Recopilar todos los candidatos
        const candidates = this._collectCandidates(treeRoot);

        if (candidates.length === 0) return null;

        // Ordenar por: rentabilidad ASC, profundidad DESC, código DESC
        candidates.sort((a, b) => {
            if (a.rentability !== b.rentability) {
                return a.rentability - b.rentability; // Menor rentabilidad primero
            }
            if (a.depth !== b.depth) {
                return b.depth - a.depth; // Mayor profundidad primero
            }
            // Comparación numérica para códigos (ej: SB050)
            const codeA = parseInt(a.codigo.replace(/[^0-9]/g, '')) || 0;
            const codeB = parseInt(b.codigo.replace(/[^0-9]/g, '')) || 0;
            return codeB - codeA; // Código más grande primero
        });

        // Retornar el primero (menor rentabilidad con desempates aplicados)
        return candidates[0].node;
    }

    /**
     * Resaltar nodo en el árbol visualmente
     * @private
     * @param {string} nodoCodigo - Código del nodo a resaltar
     */
    _highlightNode(nodoCodigo) {
        // Buscar el círculo del nodo en el DOM
        const nodeElements = document.querySelectorAll('[data-node-code]');

        nodeElements.forEach(el => {
            if (el.getAttribute('data-node-code') === nodoCodigo) {
                // Resaltar: cambiar color de fondo y borde
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
     * Mostrar modal de confirmación con datos del nodo
     * @private
     * @param {Object} node - Nodo seleccionado
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

        // Crear elemento modal
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = html;
        document.body.appendChild(modalDiv);

        // Configurar botón de confirmación
        modalDiv.querySelector('.btn-confirm-elimination').addEventListener('click', async () => {
            modalDiv.remove();
            await this._executeElimination(node.codigo);
        });
    }

    /**
     * Ejecutar la eliminación del nodo
     * @private
     * @param {string} codigo - Código del nodo a eliminar
     */
    async _executeElimination(codigo) {
        const button = document.getElementById(this.config.button);

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

            // Llamar al endpoint del backend
            const response = await this.apiClient.removeLeastProfitable();

            if (response && response.result && response.result.removed > 0) {
                console.log(`✅ Nodo ${codigo} eliminado exitosamente`);
                console.log(`   Nodos removidos: ${response.result.removed}`);

                // Mostrar notificación de éxito
                this._showSuccessNotification(response.result);

                // Dispatchear evento personalizado para que gestion-nodos.js actualice
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
            
            // Mejorar mensaje de error para el usuario
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
     * Mostrar notificación de éxito
     * @private
     * @param {Object} result - Resultado de la operación
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
