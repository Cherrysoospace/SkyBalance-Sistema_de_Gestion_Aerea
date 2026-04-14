/**
 * DepthLimitManager.js
 * Single Responsibility: Manage the tree's maximum depth
 * SOLID Compliance: SRP - Depth limit management only
 *
 * Encapsulates:
 * - Modal to capture depth
 * - Persistence in localStorage
 * - Validation
 */

export class DepthLimitManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.STORAGE_KEY = 'currentDepthLimit';
        this.MIN_DEPTH = 2;
    }

    /**
        * Show a modal asking for the tree maximum depth
        * Required before loading any file
     *
        * @param {File} file - File to load
        * @param {HTMLElement} button - "Load" button to update state
        * @returns {Promise<number>} entered depth
     */
    async showModal(file, button) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <h2>⚖️ Profundidad Máxima del Árbol</h2>
                    <p>Ingresa la profundidad máxima permitida para el árbol. Este parámetro se usa para calcular el precio final de los vuelos.</p>
                    <div class="form-group">
                        <label for="depth-input">Profundidad máxima (mínimo ${this.MIN_DEPTH}):</label>
                        <input type="number" id="depth-input" min="${this.MIN_DEPTH}" placeholder="Ej: 5, 10, 15" required>
                    </div>
                    <div class="form-buttons" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" class="btn-submit">Aceptar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const depthInput = modal.querySelector('#depth-input');
            const submitBtn = modal.querySelector('.btn-submit');
            const cancelBtn = modal.querySelector('.btn-cancel');

            // Auto-focus the input
            depthInput.focus();
            console.log('📍 Modal de profundidad abierto, input listo para entrada');

            submitBtn.addEventListener('click', async () => {
                const inputValue = depthInput.value.trim();
                console.log('📍 Valor capturado del input:', inputValue);

                const depthLimit = parseInt(inputValue);
                console.log('📍 depthLimit parseado:', depthLimit);

                if (isNaN(depthLimit) || depthLimit < this.MIN_DEPTH) {
                    alert(`❌ Ingresa un número válido mayor o igual a ${this.MIN_DEPTH}`);
                    console.warn('⚠️ Validación fallida:', { inputValue, depthLimit, isNaN: isNaN(depthLimit) });
                    return;
                }

                modal.remove();
                button.disabled = true;
                button.textContent = 'Cargando...';

                try {
                    // Load the file with the depth limit
                    const response = await this.apiClient.loadTreeFromJSON(file, depthLimit);
                    console.log('✅ JSON cargado. depthLimit retornado:', response?.depthLimit);

                    // Save to localStorage
                    this.saveToStorage(depthLimit);
                    console.log('💾 depthLimit guardado en localStorage:', depthLimit);

                    resolve(depthLimit);

                } catch (error) {
                    console.error('❌ Error cargando JSON:', error);
                    alert('❌ Error al cargar el archivo: ' + error.message);
                    resolve(null);

                } finally {
                    button.disabled = false;
                    button.textContent = 'Cargar';
                }
            });

            cancelBtn.addEventListener('click', () => {
                resolve(null);
            });

            // Allow Enter to confirm
            depthInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitBtn.click();
            });
        });
    }

    /**
     * Load depth limit from localStorage
     * @returns {number|null} saved depth or null
     */
    loadFromStorage() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            const value = parseInt(saved);
            console.log('✅ depthLimit restaurado desde localStorage:', value);
            return value;
        }
        return null;
    }

    /**
        * Save depth limit to localStorage
        * @param {number} value - depth to save
     */
    saveToStorage(value) {
        localStorage.setItem(this.STORAGE_KEY, value.toString());
        console.log('💾 depthLimit guardado en localStorage:', value);
    }

    /**
        * Update the depth input in the UI
        * @param {number} value - value to set
     */
    updateInputUI(value) {
        const inputDepthLimit = document.getElementById('input-depth-limit');
        if (inputDepthLimit) {
            inputDepthLimit.value = value;
            console.log('✅ Input de profundidad actualizado a:', value);
        }
    }

    /**
        * Validate a depth value
        * @param {number} value - value to validate
        * @returns {boolean} true if valid
     */
    isValid(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= this.MIN_DEPTH;
    }
}
