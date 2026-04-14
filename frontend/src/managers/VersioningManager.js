/**
 * VersioningManager.js
 * Single Responsibility: Manage persistent tree versioning
 * SOLID Compliance: SRP + DIP + Open/Closed
 * 
 * This component is responsible for:
 * - Saving tree versions with specific names
 * - Listing available versions
 * - Restoring saved versions
 * - Updating the versioning UI
 */

export class VersioningManager {
    /**
     * Constructor with dependency injection
     * @param {ApiClient} apiClient - Injected API client
     * @param {Object} config - DOM element configuration
     */
    constructor(apiClient, config = {}) {
        this.apiClient = apiClient;
        
        // DOM element configuration
        this.config = {
            versioningPanel: 'versioning-panel',
            versioningModal: 'modal-versioning',
            versionNameInput: 'version-name-input',
            saveVersionBtn: 'btn-save-version',
            versionsListContainer: 'versions-list-container',
            refreshVersionsBtn: 'btn-refresh-versions',
            ...config
        };

        // Local state
        this.versions = [];
        this.selectedVersionName = null;

        this.setupHandlers();
    }

    /**
        * Sets up component event listeners
        * SRP: Responsible only for wiring handlers
     */
    setupHandlers() {
        const saveBtn = document.getElementById(this.config.saveVersionBtn);
        const refreshBtn = document.getElementById(this.config.refreshVersionsBtn);
        const nameInput = document.getElementById(this.config.versionNameInput);

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveVersion());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshVersionsList());
        }

        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSaveVersion();
                }
            });
        }

        // Use one listener for all restore and delete buttons.
        const listContainer = document.getElementById(this.config.versionsListContainer);
        if (listContainer) {
            listContainer.addEventListener('click', (e) => this._handleListActions(e));
        }

        // Close modal
        const modal = document.getElementById(this.config.versioningModal);
        if (modal) {
            const closeBtn = modal.querySelector('.close-modal');
            const closeBtnFooter = modal.querySelector('.btn-close-versioning');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeVersioningPanel());
            }
            if (closeBtnFooter) {
                closeBtnFooter.addEventListener('click', () => this.closeVersioningPanel());
            }

            // Close when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeVersioningPanel();
                }
            });
        }
    }

    /**
        * Opens the versioning panel/modal
        * SRP: Responsible for showing the UI
     */
    async openVersioningPanel() {
        try {
            const modal = document.getElementById(this.config.versioningModal);
            if (!modal) {
                throw new Error('Modal de versionado no encontrado en el DOM');
            }

            // Clear input
            const nameInput = document.getElementById(this.config.versionNameInput);
            if (nameInput) {
                nameInput.value = '';
                nameInput.focus();
            }

            // Load versions
            await this.refreshVersionsList();

            // Show modal
            modal.classList.remove('hidden');
            modal.classList.add('show');
            console.log('✅ Panel de versionado abierto');

        } catch (error) {
            console.error('❌ Error abriendo panel de versionado:', error);
            alert('Error al abrir versionado: ' + error.message);
        }
    }

    /**
        * Closes the versioning panel/modal
        * SRP: Responsible only for closing the modal
     */
    closeVersioningPanel() {
        const modal = document.getElementById(this.config.versioningModal);
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
            console.log('✅ Panel de versionado cerrado');
        }
    }

    /**
        * Handles the save version event
        * DIP: Delegates the request to apiClient
     */
    async handleSaveVersion() {
        try {
            const nameInput = document.getElementById(this.config.versionNameInput);
            const versionName = nameInput?.value?.trim();

            if (!versionName) {
                alert('Por favor ingresa un nombre para la versión');
                nameInput?.focus();
                return;
            }

            // Validate that the name is unique
            if (this.versions.some(v => v.name === versionName)) {
                alert(`Ya existe una versión con el nombre "${versionName}"`);
                return;
            }

            console.log('💾 Guardando versión:', versionName);
            const saveBtn = document.getElementById(this.config.saveVersionBtn);
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            // Call API
            const response = await this.apiClient.post('/versions/', { name: versionName });

            // Clear input
            nameInput.value = '';

            // Update list
            await this.refreshVersionsList();

            saveBtn.disabled = false;
            saveBtn.textContent = originalText;

            console.log('✅ Versión guardada exitosamente:', response);
            alert(`✅ Versión "${versionName}" guardada correctamente`);

        } catch (error) {
            console.error('❌ Error guardando versión:', error);
            alert('Error al guardar versión: ' + error.message);
            const saveBtn = document.getElementById(this.config.saveVersionBtn);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar versión';
        }
    }

    /**
        * Reloads the list of available versions
        * SRP: Responsible for updating the list
     */
    async refreshVersionsList() {
        try {
            console.log('🔄 Refrescando lista de versiones...');
            
            this.versions = await this.apiClient.get('/versions/');
            
            const container = document.getElementById(this.config.versionsListContainer);
            if (!container) {
                throw new Error('Contenedor de versiones no encontrado');
            }

            if (this.versions.length === 0) {
                container.innerHTML = '<p class="no-versions">No hay versiones guardadas aún</p>';
                console.log('ℹ️ No hay versiones guardadas');
                return;
            }

            // Build versions list
            const html = this.versions
                .map((version, index) => this._buildVersionItemHTML(version, index))
                .join('');

            container.innerHTML = html;

            console.log(`✅ Lista de versiones actualizada: ${this.versions.length} versiones`);

        } catch (error) {
            console.error('❌ Error refrescando lista de versiones:', error);
            const container = document.getElementById(this.config.versionsListContainer);
            if (container) {
                container.innerHTML = `<p class="error-message">❌ Error cargando versiones: ${error.message}</p>`;
            }
        }
    }

    /**
        * Handles the restore version event
        * DIP: Delegates the request to apiClient
     */
    async handleRestoreVersion(versionName) {
        try {
            const confirmed = confirm(`¿Restaurar la versión "${versionName}"?\n\nLa versión actual se guardará en el historial de deshacer.`);
            if (!confirmed) {
                return;
            }

            console.log('🔄 Restaurando versión:', versionName);

            const restoreBtn = document.querySelector(`[data-action="restore"][data-version="${this._escapeSelector(versionName)}"]`);
            if (restoreBtn) {
                restoreBtn.disabled = true;
                restoreBtn.textContent = 'Restaurando...';
            }

            // Call API
            const response = await this.apiClient.post('/versions/restore', { name: versionName });

            if (restoreBtn) {
                restoreBtn.disabled = false;
                restoreBtn.textContent = 'Restaurar';
            }

            console.log('✅ Versión restaurada:', response);

            // Emit event so gestion-nodos.js reloads the tree
            this._emitVersionRestored(versionName);

            alert(`✅ Versión "${versionName}" restaurada correctamente`);

        } catch (error) {
            console.error('❌ Error restaurando versión:', error);
            alert('Error al restaurar versión: ' + error.message);
            const restoreBtn = document.querySelector(`[data-action="restore"][data-version="${this._escapeSelector(versionName)}"]`);
            if (restoreBtn) {
                restoreBtn.disabled = false;
                restoreBtn.textContent = 'Restaurar';
            }
        }
    }

    /**
        * Handles version deletion (future extension - Open/Closed Principle)
        * Note: There is currently no DELETE endpoint in the backend, but this is ready for it
     */
    async handleDeleteVersion(versionName) {
        try {
            const confirmed = confirm(`¿Eliminar la versión "${versionName}"?\n\nEsta acción no se puede deshacer.`);
            if (!confirmed) {
                return;
            }

            console.log('🗑️ Eliminando versión:', versionName);

            // Note: This endpoint does not exist in the current backend
            // It can be added without modifying this class (Open/Closed Principle)
            if (this.apiClient.delete) {
                await this.apiClient.delete(`/versions/${versionName}`);
                console.log('✅ Versión eliminada');
                await this.refreshVersionsList();
                alert(`✅ Versión "${versionName}" eliminada correctamente`);
            } else {
                console.warn('⚠️ Eliminación de versiones no soportada en el backend');
                alert('La eliminación de versiones no está disponible aún');
            }

        } catch (error) {
            console.error('❌ Error eliminando versión:', error);
            alert('Error al eliminar versión: ' + error.message);
        }
    }

    /**
        * Emits a custom event to notify that a version was restored
        * Communication pattern between components without direct coupling
     */
    _emitVersionRestored(versionName) {
        const event = new CustomEvent('versionRestored', {
            detail: { versionName }
        });
        document.dispatchEvent(event);
    }

    /**
        * Builds the HTML for a version item
        * SRP: Private method to generate markup
     */
    _buildVersionItemHTML(version, index) {
        const timestamp = new Date(version.timestamp).toLocaleString('es-ES');
        const versionName = this._escapeHTML(version.name);
        const versionAttr = this._escapeHTML(version.name);

        return `
            <div class="version-item" data-version="${versionAttr}">
                <div class="version-info">
                    <div class="version-name">
                        <span class="version-badge">#${index + 1}</span>
                        <strong>${versionName}</strong>
                    </div>
                    <div class="version-timestamp">
                        <i class="fas fa-clock"></i> ${timestamp}
                    </div>
                </div>
                <div class="version-actions">
                    <button class="btn-action-small restore" data-action="restore" data-version="${versionAttr}" title="Restaurar esta versión">
                        <i class="fas fa-undo"></i> Restaurar
                    </button>
                    <button class="btn-action-small delete" data-action="delete" data-version="${versionAttr}" title="Eliminar esta versión">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    _handleListActions(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const versionName = button.dataset.version;
        if (!versionName) {
            return;
        }

        if (action === 'restore') {
            this.handleRestoreVersion(versionName);
            return;
        }

        if (action === 'delete') {
            this.handleDeleteVersion(versionName);
        }
    }

    _escapeHTML(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    _escapeSelector(value) {
        return String(value)
            .replaceAll('\\', '\\\\')
            .replaceAll('"', '\\"');
    }

    /**
        * Cleans up event listeners
        * Cleanup pattern to avoid memory leaks (Open/Closed - extensible)
     */
    cleanup() {
        const saveBtn = document.getElementById(this.config.saveVersionBtn);
        const refreshBtn = document.getElementById(this.config.refreshVersionsBtn);

        if (saveBtn) {
            saveBtn.replaceWith(saveBtn.cloneNode(true));
        }
        if (refreshBtn) {
            refreshBtn.replaceWith(refreshBtn.cloneNode(true));
        }

        console.log('✅ VersioningManager limpiado');
    }
}
