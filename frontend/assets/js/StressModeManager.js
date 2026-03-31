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
                this._enableRelatedButtons();
                console.log('✅ Modo Estrés ACTIVADO');
            } else {
                btn.classList.remove('active');
                this._disableRelatedButtons();
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
     * Habilita botones relacionados
     * @private
     */
    _enableRelatedButtons() {
        const btnRebalance = document.getElementById(this.config.rebalanceButton);
        const btnAudit = document.getElementById(this.config.auditButton);

        if (btnRebalance) btnRebalance.disabled = false;
        if (btnAudit) btnAudit.disabled = false;

        console.log('✅ Botones ACTIVADOS: Rebalanceo Global y Auditoría AVL');
    }

    /**
     * Desactiva botones relacionados
     * @private
     */
    _disableRelatedButtons() {
        const btnRebalance = document.getElementById(this.config.rebalanceButton);
        const btnAudit = document.getElementById(this.config.auditButton);

        if (btnRebalance) btnRebalance.disabled = true;
        if (btnAudit) btnAudit.disabled = true;

        console.log('✅ Botones DESACTIVADOS: Rebalanceo Global y Auditoría AVL');
    }
}
