/**
 * RebalanceAnimationManager.js
 * Responsabilidad Única: Gestionar animación de rebalanceo global
 * SOLID Compliance: SRP + OCP + DIP
 */

class RebalanceAnimationManager {
    /**
     * @param {APIClient} apiClient - Cliente API inyectado
     * @param {Object} config - Configuración de elementos DOM y animación
     */
    constructor(apiClient, config = {}) {
        this.apiClient = apiClient;
        this.config = {
            rebalanceButton: 'btnRebalanceo',
            rebalancePanel: 'rebalance-panel',
            rotationsList: 'rotations-list',
            progressBar: 'progress-bar',
            rotationCounter: 'rotation-counter',
            animationConfig: window.REBALANCE_ANIMATION_CONFIG || this._getFallbackConfig(),
            ...config
        };
        this.rebalanceEngine = null;
        this.rotationQueueAnimator = null;
    }

    /**
     * Ejecuta rebalanceo global con animación paso a paso
     * SRP: Responsable solo de orquestar la animación
     */
    async execute(stressModeEnabled, onComplete) {
        if (!stressModeEnabled) {
            throw new Error('Modo Estrés debe estar activo');
        }

        if (!confirm('¿Ejecutar rebalanceo global del árbol? Esta operación puede ser costosa.')) {
            return false;
        }

        const btn = document.getElementById(this.config.rebalanceButton);
        if (!btn) throw new Error('Botón Rebalanceo no encontrado');

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rebalanceando...';

            // Obtener detalles de rebalanceo
            const response = await this.apiClient.globalRebalanceAnimated();
            console.log('✅ Respuesta de rebalanceo:', response);

            const steps = response.result?.steps || [];
            const summary = response.result?.summary || {};

            if (steps.length === 0) {
                alert('El árbol ya está balanceado. No se necesitan rotaciones.');
                if (onComplete) await onComplete();
                return true;
            }

            // Ejecutar animación
            await this._animateRotations(steps, summary, response.tree);

            // Callback de finalización
            if (onComplete) {
                await onComplete();
            }

            return true;

        } catch (error) {
            console.error('❌ Error en rebalanceo global:', error);
            throw error;

        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-balance-scale"></i> Rebalanceo Global';
        }
    }

    /**
     * Anima las rotaciones paso a paso
     * OCP: Extensible para diferentes estrategias de animación
     * @private
     */
    async _animateRotations(steps, summary, initialTree) {
        const panel = document.getElementById(this.config.rebalancePanel);
        const rotationsList = document.getElementById(this.config.rotationsList);
        const progressBar = document.getElementById(this.config.progressBar);
        const rotationCounter = document.getElementById(this.config.rotationCounter);

        if (!rotationsList || !progressBar || !rotationCounter) {
            throw new Error('Elementos del panel de animación no encontrados');
        }

        panel.classList.add('active');
        rotationsList.innerHTML = '';

        const totalRotations = steps.length;
        console.log(`🎬 Iniciando animación de ${totalRotations} rotaciones`);

        // Inicializar motor de animación si no existe
        if (!this.rebalanceEngine) {
            this.rebalanceEngine = new RebalanceAnimationEngine('#tree-container');
        }

        // Renderizar árbol inicial
        this.rebalanceEngine.renderInitialTree(
            { tree: steps[0]?.tree_snapshot || initialTree.tree },
            { width: 800, height: 500 }
        );

        // Crear cola de rotaciones (OCP: Extensible)
        this.rotationQueueAnimator = new RotationQueueAnimator(this.rebalanceEngine);

        // Encolar rotaciones
        for (const step of steps) {
            this.rotationQueueAnimator.enqueue(step);
        }

        // Procesar cola con callbacks de progreso
        await this.rotationQueueAnimator.processQueue(
            async (progress) => this._onRotationProgress(progress, progressBar, rotationCounter, rotationsList)
        );

        // Mostrar resumen
        this._showSummaryInPanel(summary, rotationsList);

        // Mantener panel visible
        await this._sleep(this.config.animationConfig.PANEL_DISPLAY_TIME_AFTER_COMPLETE);

        // Mostrar alerta final si está configurado
        if (this.config.animationConfig.SHOW_FINAL_ALERT) {
            this._showRebalanceSummary(steps, summary);
        }
    }

    /**
     * Maneja actualización de progreso de rotación
     * DIP: Callback desacoplado
     * @private
     */
    async _onRotationProgress(progress, progressBar, rotationCounter, rotationsList) {
        const percent = (progress.current / progress.total) * 100;
        progressBar.style.width = percent + '%';
        rotationCounter.textContent = `${progress.current}/${progress.total} rotaciones`;

        // Crear elemento visual
        const messageEl = this._createRotationMessage(progress.step, progress.current === progress.total);
        rotationsList.appendChild(messageEl);

        if (this.config.animationConfig.AUTO_SCROLL_PANEL) {
            messageEl.scrollIntoView({ behavior: 'smooth' });
        }

        console.log(`✅ Rotación ${progress.current}/${progress.total}: ${progress.step.type}`);

        // Aplicar animación (se marca después de procesar)
        messageEl.classList.remove('processing');
        messageEl.classList.add('done');
    }

    /**
     * Crea elemento HTML para mensaje de rotación
     * SRP: Responsable solo de crear elemento visual
     * @private
     */
    _createRotationMessage(rotation, isLast) {
        const div = document.createElement('div');
        div.className = 'rotation-message processing';

        const typeEl = document.createElement('div');
        typeEl.className = 'rotation-type';
        typeEl.textContent = `Rotación ${rotation.type}`;

        const nodeEl = document.createElement('div');
        nodeEl.className = 'rotation-node';
        nodeEl.textContent = `Nodo: ${rotation.node_codigo}`;

        div.appendChild(typeEl);
        div.appendChild(nodeEl);

        return div;
    }

    /**
     * Muestra resumen de rotaciones en el panel
     * @private
     */
    _showSummaryInPanel(summary, container) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'rebalance-summary';

        const title = document.createElement('div');
        title.className = 'summary-title';
        title.innerHTML = '<i class="fas fa-check-circle"></i> Resumen de Rotaciones';
        summaryDiv.appendChild(title);

        const rotationTypes = ['LL', 'RR', 'LR', 'RL'];
        for (const type of rotationTypes) {
            const count = summary[type] || 0;
            const row = this._createSummaryRow(type, count);
            summaryDiv.appendChild(row);
        }

        // Fila de total
        const totalRow = this._createTotalRow(summary);
        summaryDiv.appendChild(totalRow);

        container.appendChild(summaryDiv);
    }

    /**
     * Crea fila de resumen individual
     * @private
     */
    _createSummaryRow(type, count) {
        const row = document.createElement('div');
        row.className = 'summary-row';

        const label = document.createElement('span');
        label.className = 'summary-label';
        label.textContent = `Rotación ${type}:`;

        const countEl = document.createElement('span');
        countEl.className = 'summary-count';
        countEl.textContent = count;

        row.appendChild(label);
        row.appendChild(countEl);
        return row;
    }

    /**
     * Crea fila de total
     * @private
     */
    _createTotalRow(summary) {
        const row = document.createElement('div');
        row.className = 'summary-row';
        row.style.borderTop = '2px solid var(--primary-color)';
        row.style.marginTop = '0.75rem';
        row.style.paddingTop = '0.75rem';

        const label = document.createElement('span');
        label.className = 'summary-label';
        label.style.fontWeight = '700';
        label.style.color = 'var(--primary-dark)';
        label.textContent = 'Total:';

        const countEl = document.createElement('span');
        countEl.className = 'summary-count';
        countEl.style.fontSize = '1.1rem';
        countEl.style.color = 'var(--success-color)';
        const total = Object.values(summary).reduce((a, b) => a + b, 0);
        countEl.textContent = total;

        row.appendChild(label);
        row.appendChild(countEl);
        return row;
    }

    /**
     * Muestra alerta final con resumen
     * @private
     */
    _showRebalanceSummary(rotations, summary) {
        const LL = summary.LL || 0;
        const RR = summary.RR || 0;
        const LR = summary.LR || 0;
        const RL = summary.RL || 0;
        const total = LL + RR + LR + RL;

        const summaryText = `
✅ Rebalanceo Global Completado

Total de Rotaciones: ${total}
├─ Rotación LL: ${LL}
├─ Rotación RR: ${RR}
├─ Rotación LR: ${LR}
└─ Rotación RL: ${RL}

El árbol ha sido rebalanceado exitosamente.
        `.trim();

        console.log(summaryText);
        alert(summaryText);
    }

    /**
     * Sleep/delay utility
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene configuración fallback si no está cargada
     * @private
     */
    _getFallbackConfig() {
        return {
            DELAY_BETWEEN_ROTATIONS: 800,
            NODE_HIGHLIGHT_DURATION: 600,
            SHOW_FINAL_ALERT: true,
            PROGRESS_BAR_ANIMATION: 300,
            AUTO_SCROLL_PANEL: true,
            PANEL_DISPLAY_TIME_AFTER_COMPLETE: 2000,
            DEBUG_MODE: false
        };
    }
}
