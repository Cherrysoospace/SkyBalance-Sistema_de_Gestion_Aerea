/**
 * MetricsManager.js
 * Single Responsibility: Manage metrics and their visualization
 * SOLID Compliance: SRP + DIP
 */

class MetricsManager {
    /**
    * @param {APIClient} apiClient - Injected API client
    * @param {Object} config - DOM element configuration
     */
    constructor(apiClient, config = {}) {
        this.apiClient = apiClient;
        this.config = {
            metricsPanel: 'metrics-panel',
            metricsModal: 'modal-metricas',
            metricsContent: 'metrics-content',
            ...config
        };
    }

    /**
        * Updates condensed metrics in the top panel
        * SRP: Responsible only for updating the quick panel
     */
    async updateMetricsPanel() {
        try {
            const metrics = await this.apiClient.getMetrics();
            if (!metrics) {
                console.debug('MetricsManager: No metrics available');
                return;
            }

            const el = document.getElementById(this.config.metricsPanel);
            if (!el) return;

            const totalRotations = Object.values(metrics.rotaciones || {})
                .reduce((a, b) => a + b, 0);

            el.innerHTML = this._buildPanelHTML(metrics, totalRotations);
            console.log('✅ Métricas del panel actualizadas');

        } catch (error) {
            console.error('❌ Error actualizando panel de métricas:', error);
        }
    }

    /**
        * Opens the full analytics metrics modal
        * SRP: Responsible for loading and showing the modal
     */
    async openMetricsModal() {
        try {
            const metrics = await this.apiClient.getMetrics();
            if (!metrics) {
                throw new Error('No hay métricas disponibles');
            }

            const modal = document.getElementById(this.config.metricsModal);
            const content = document.getElementById(this.config.metricsContent);

            if (!modal || !content) {
                throw new Error('Elementos DOM no encontrados');
            }

            // Build HTML content
            content.innerHTML = this._buildMetricsHTML(metrics);

            // Show modal
            modal.classList.remove('hidden');
            modal.classList.add('show');
            console.log('✅ Modal de métricas abierto');

        } catch (error) {
            console.error('❌ Error en modal de métricas:', error);
            alert('Error al cargar las métricas: ' + error.message);
        }
    }

    /**
        * Closes the metrics modal
        * SRP: Responsible only for closing the modal
     */
    closeMetricsModal() {
        const modal = document.getElementById(this.config.metricsModal);
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
            console.log('✅ Modal de métricas cerrado');
        }
    }

    /**
        * Sets up modal event listeners
        * DIP: Tells the controller how to wire events
     */
    setupEventListeners(onClose) {
        const modal = document.getElementById(this.config.metricsModal);
        if (!modal) return;

        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', onClose);
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                onClose();
            }
        });
    }

    // ========================================
    // PRIVATE METHODS - HTML building
    // ========================================

    /**
        * Builds HTML for the quick metrics panel
     * @private
     */
    _buildPanelHTML(metrics, totalRotations) {
        return `
            <span class="metric-badge">
                <i class="fas fa-arrows-alt-v"></i> Altura: ${metrics.alturaActual ?? 0}
            </span>
            <span class="metric-badge">
                <i class="fas fa-leaf"></i> Hojas: ${metrics.hojas ?? 0}
            </span>
            <span class="metric-badge">
                <i class="fas fa-redo"></i> Rotaciones: ${totalRotations || 0}
            </span>
        `;
    }

    /**
        * Builds full HTML for the metrics modal
     * @private
     */
    _buildMetricsHTML(metrics) {
        const rotaciones = metrics.rotaciones || {};
        const totalRotaciones = Object.values(rotaciones).reduce((a, b) => a + b, 0);

        const rotacionesDetallado = metrics.rotacionesDetallado || {};
        const ultimoRebalanceo = rotacionesDetallado.ultimoRebalanceoGlobal || {};
        const totalUltimoRebalanceo = Object.values(ultimoRebalanceo).reduce((a, b) => a + b, 0);

        const bfs = metrics.bfs || [];
        const dfs = metrics.dfs || {};

        return `
            ${this._buildHeightSection(metrics)}
            ${this._buildLeavesSection(metrics)}
            ${this._buildRotationsSection(totalRotaciones, rotaciones)}
            ${this._buildCancellationsSection(metrics)}
            ${this._buildRotationBreakdownSection(totalUltimoRebalanceo, ultimoRebalanceo)}
            ${this._buildBFSSection(bfs)}
            ${this._buildDFSSection(dfs)}
            ${this._buildInfoFooter()}
        `;
    }

    _buildHeightSection(metrics) {
        return `
            <div class="metrics-section">
                <h3><i class="fas fa-ruler"></i> Altura del Árbol</h3>
                <div class="metric-value">${metrics.alturaActual ?? 0}</div>
                <p class="metric-desc">altura actual del árbol (distancia máxima de la raíz a una hoja)</p>
            </div>
        `;
    }

    _buildLeavesSection(metrics) {
        return `
            <div class="metrics-section">
                <h3><i class="fas fa-leaf"></i> Cantidad de Hojas</h3>
                <div class="metric-value">${metrics.hojas ?? 0}</div>
                <p class="metric-desc">nodos sin hijos izquierdo ni derecho</p>
            </div>
        `;
    }

    _buildRotationsSection(totalRotaciones, rotaciones) {
        return `
            <div class="metrics-section">
                <h3><i class="fas fa-redo"></i> Rotaciones Realizadas</h3>
                <div class="metric-value">${totalRotaciones}</div>
                <div class="rotations-table">
                    <div class="rotation-row">
                        <span class="rotation-type">Simple Izquierda (RR)</span>
                        <span class="rotation-count">${rotaciones.RR || 0}</span>
                    </div>
                    <div class="rotation-row">
                        <span class="rotation-type">Simple Derecha (LL)</span>
                        <span class="rotation-count">${rotaciones.LL || 0}</span>
                    </div>
                    <div class="rotation-row">
                        <span class="rotation-type">Doble Derecha-Izquierda (RL)</span>
                        <span class="rotation-count">${rotaciones.RL || 0}</span>
                    </div>
                    <div class="rotation-row">
                        <span class="rotation-type">Doble Izquierda-Derecha (LR)</span>
                        <span class="rotation-count">${rotaciones.LR || 0}</span>
                    </div>
                </div>
                <p class="metric-desc">categorización de todas las rotaciones realizadas durante la sesión</p>
            </div>
        `;
    }

    _buildCancellationsSection(metrics) {
        return `
            <div class="metrics-section">
                <h3><i class="fas fa-ban"></i> Cancelaciones Masivas</h3>
                <div class="metric-value">${metrics.cancelacionesMasivas ?? 0}</div>
                <p class="metric-desc">subárboles completos eliminados (operación de cancelación)</p>
            </div>
        `;
    }

    _buildRotationBreakdownSection(totalUltimoRebalanceo, ultimoRebalanceo) {
        const detailsHTML = totalUltimoRebalanceo > 0 ? `
            <div class="breakdown-details">
                <div class="breakdown-row">
                    <span class="rotation-type">LL:</span>
                    <span>${ultimoRebalanceo.LL || 0}</span>
                </div>
                <div class="breakdown-row">
                    <span class="rotation-type">RR:</span>
                    <span>${ultimoRebalanceo.RR || 0}</span>
                </div>
                <div class="breakdown-row">
                    <span class="rotation-type">LR:</span>
                    <span>${ultimoRebalanceo.LR || 0}</span>
                </div>
                <div class="breakdown-row">
                    <span class="rotation-type">RL:</span>
                    <span>${ultimoRebalanceo.RL || 0}</span>
                </div>
            </div>
        ` : '<div class="breakdown-note">Sin rebalanceo global ejecutado aún</div>';

        return `
            <div class="metrics-section">
                <h3><i class="fas fa-chart-bar"></i> Desglose de Rotaciones</h3>
                <div class="rotations-breakdown">
                    <div class="breakdown-item">
                        <span class="breakdown-label">Último Rebalanceo Global:</span>
                        <span class="breakdown-value">${totalUltimoRebalanceo} rotaciones</span>
                    </div>
                    ${detailsHTML}
                </div>
                <p class="metric-desc">rastrea rotaciones acumuladas vs. rotaciones del último rebalanceo global para validar que se mantienen correctamente</p>
            </div>
        `;
    }

    _buildBFSSection(bfs) {
        const traversalHTML = bfs.length > 0
            ? bfs.map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
            : '<span class="empty-traversal">Árbol vacío</span>';

        return `
            <div class="metrics-section">
                <h3><i class="fas fa-arrows-alt"></i> Recorrido en Anchura (BFS)</h3>
                <div class="traversal-list">
                    ${traversalHTML}
                </div>
                <p class="metric-desc">orden de visita por niveles (izquierda a derecha)</p>
            </div>
        `;
    }

    _buildDFSSection(dfs) {
        const inOrderHTML = (dfs.inOrder || []).length > 0
            ? (dfs.inOrder || []).map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
            : '<span class="empty-traversal">Árbol vacío</span>';

        const preOrderHTML = (dfs.preOrder || []).length > 0
            ? (dfs.preOrder || []).map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
            : '<span class="empty-traversal">Árbol vacío</span>';

        const postOrderHTML = (dfs.posOrder || []).length > 0
            ? (dfs.posOrder || []).map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
            : '<span class="empty-traversal">Árbol vacío</span>';

        return `
            <div class="metrics-section">
                <h3><i class="fas fa-code-branch"></i> Recorrido en Profundidad (DFS)</h3>
                
                <div class="dfs-subsection">
                    <h4>Inorden</h4>
                    <div class="traversal-list">${inOrderHTML}</div>
                </div>

                <div class="dfs-subsection">
                    <h4>Preorden</h4>
                    <div class="traversal-list">${preOrderHTML}</div>
                </div>

                <div class="dfs-subsection">
                    <h4>Postorden</h4>
                    <div class="traversal-list">${postOrderHTML}</div>
                </div>

                <p class="metric-desc">diferentes formas de recorrer el árbol en profundidad</p>
            </div>
        `;
    }

    _buildInfoFooter() {
        return `
            <div class="metrics-info">
                <i class="fas fa-info-circle"></i>
                <span>Las métricas se actualizan en tiempo real con cada operación sobre el árbol.</span>
            </div>
        `;
    }
}

export { MetricsManager };
