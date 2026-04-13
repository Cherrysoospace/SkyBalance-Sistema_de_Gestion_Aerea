/**
 * StressModeManager.js
 * Responsabilidad Única: Gestionar Modo Estrés y su estado
 * SOLID Compliance: SRP + DIP
 */

class StressModeManager {
    /**
     * @param {APIClient} apiClient - Cliente API inyectado
     * @param {Object} config - Configuración de elementos DOM
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
     * Alterna el estado del Modo Estrés
     * DIP: La lógica de UI actualización es delicada al callback
     */
    async toggle(onStateChange) {
        try {
            const btn = document.getElementById(this.config.stressModeButton);
            if (!btn) throw new Error('Botón Modo Estrés no encontrado');

            btn.classList.add('activating');
            this.enabled = !this.enabled;

            // Cambio en API
            await this.apiClient.setStressMode(this.enabled);
            console.log('✅ Modo Estrés actualizado:', this.enabled);

            // Actualizar UI a través de callback (DIP)
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
            this.enabled = !this.enabled; // Revertir
            const btn = document.getElementById(this.config.stressModeButton);
            if (btn) btn.classList.remove('activating');
            throw error;
        }
    }

    /**
     * Obtiene el estado actual del Modo Estrés
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
     * Habilita botones de análisis (solo en modo estrés)
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
     * Desactiva botones de análisis (fuera del modo estrés)
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
     * Desactiva botones de concurrencia (cuando modo estrés está activo)
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
     * Habilita botones de concurrencia (cuando modo estrés está inactivo)
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
