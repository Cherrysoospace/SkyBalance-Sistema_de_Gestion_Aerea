/**
 * StressModeManager.js
 * Single Responsibility: Manage Stress Mode and its state
 * SOLID Compliance: SRP + DIP
 */

class StressModeManager {
    /**
    * @param {APIClient} apiClient - Injected API client
    * @param {Object} config - DOM element configuration
     */
    constructor(apiClient, config = {}) {
        this.apiClient = apiClient;
        this.enabled = false;
        this.config = {
            stressModeButton: 'btnModoEstres',
            rebalanceButton: 'btnRebalanceo',
            auditButton: 'btnAuditar',
            concurrencyButtons: ['btnProgramarInsercion', 'btnProcesarCola'],
            ...config
        };
    }

    /**
        * Toggles Stress Mode state
        * DIP: UI update logic is delegated via callback
     */
    async toggle(onStateChange) {
        try {
            const btn = document.getElementById(this.config.stressModeButton);
            if (!btn) throw new Error('Botón Modo Estrés no encontrado');

            btn.classList.add('activating');
            this.enabled = !this.enabled;

            // API change
            await this.apiClient.setStressMode(this.enabled);
            console.log('✅ Modo Estrés actualizado:', this.enabled);

            // Update UI through callback (DIP)
            if (onStateChange) {
                onStateChange(this.enabled);
            }

            btn.classList.remove('activating');

            if (this.enabled) {
                btn.classList.add('active');
                this._enableAnalysisButtons();
                this._disableConcurrencyButtons();
                console.log('✅ Modo Estrés ACTIVADO');
            } else {
                btn.classList.remove('active');
                this._disableAnalysisButtons();
                this._enableConcurrencyButtons();
                console.log('✅ Modo Estrés DESACTIVADO');
            }

        } catch (error) {
            console.error('❌ Error al cambiar Modo Estrés:', error);
            this.enabled = !this.enabled; // Revert
            const btn = document.getElementById(this.config.stressModeButton);
            if (btn) btn.classList.remove('activating');
            throw error;
        }
    }

    /**
     * Gets the current Stress Mode state
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Synchronize manager and UI with backend stress mode state.
     * @param {boolean} enabled - Backend stress mode status
     */
    setState(enabled) {
        this.enabled = Boolean(enabled);

        const btn = document.getElementById(this.config.stressModeButton);
        if (btn) {
            btn.classList.remove('activating');
            if (this.enabled) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        if (this.enabled) {
            this._enableAnalysisButtons();
            this._disableConcurrencyButtons();
        } else {
            this._disableAnalysisButtons();
            this._enableConcurrencyButtons();
        }
    }

    /**
        * Enables analytics buttons (only in stress mode)
     * @private
     */
    _enableAnalysisButtons() {
        const btnRebalance = document.getElementById(this.config.rebalanceButton);
        const btnAudit = document.getElementById(this.config.auditButton);

        if (btnRebalance) btnRebalance.disabled = false;
        if (btnAudit) btnAudit.disabled = false;

        console.log('✅ Botones de análisis HABILITADOS: Rebalanceo Global y Auditoría AVL');
    }

    /**
        * Disables analytics buttons (outside stress mode)
     * @private
     */
    _disableAnalysisButtons() {
        const btnRebalance = document.getElementById(this.config.rebalanceButton);
        const btnAudit = document.getElementById(this.config.auditButton);

        if (btnRebalance) btnRebalance.disabled = true;
        if (btnAudit) btnAudit.disabled = true;

        console.log('✅ Botones de análisis DESHABILITADOS: Rebalanceo Global y Auditoría AVL');
    }

    /**
        * Disables concurrency buttons (when stress mode is active)
     * @private
     */
    _disableConcurrencyButtons() {
        this.config.concurrencyButtons.forEach(buttonId => {
            const btn = document.getElementById(buttonId);
            if (btn) btn.disabled = true;
        });

        console.log('✅ Botones de concurrencia DESHABILITADOS');
    }

    /**
        * Enables concurrency buttons (when stress mode is inactive)
     * @private
     */
    _enableConcurrencyButtons() {
        this.config.concurrencyButtons.forEach(buttonId => {
            const btn = document.getElementById(buttonId);
            if (btn) btn.disabled = false;
        });

        console.log('✅ Botones de concurrencia HABILITADOS');
    }
}

export { StressModeManager };
