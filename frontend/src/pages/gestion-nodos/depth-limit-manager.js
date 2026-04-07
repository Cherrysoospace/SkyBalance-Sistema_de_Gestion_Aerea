/**
 * DepthLimitManager.js
 * Responsabilidad Única: Gestionar la profundidad máxima del árbol
 * SOLID Compliance: SRP - Solo gestión de depth limit
 *
 * Encapsula:
 * - Modal para capturar profundidad
 * - Persistencia en localStorage
 * - Validación
 */

export class DepthLimitManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.STORAGE_KEY = 'currentDepthLimit';
        this.MIN_DEPTH = 2;
    }

    /**
     * Mostrar modal pidiendo la profundidad máxima del árbol
     * Obligatorio antes de cargar cualquier archivo
     *
     * @param {File} file - Archivo a cargar
     * @param {HTMLElement} button - Botón "Cargar" para actualizar estado
     * @returns {Promise<number>} profundidad ingresada
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

            // Enfocar en el input automáticamente
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
                    // Cargar el archivo con profundidad
                    const response = await this.apiClient.loadTreeFromJSON(file, depthLimit);
                    console.log('✅ JSON cargado. depthLimit retornado:', response?.depthLimit);

                    // Guardar en localStorage
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

            // Permitir Enter para confirmar
            depthInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitBtn.click();
            });
        });
    }

    /**
     * Cargar depth limit desde localStorage
     * @returns {number|null} profundidad guardada o null
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
     * Guardar depth limit en localStorage
     * @param {number} value - profundidad a guardar
     */
    saveToStorage(value) {
        localStorage.setItem(this.STORAGE_KEY, value.toString());
        console.log('💾 depthLimit guardado en localStorage:', value);
    }

    /**
     * Actualizar el input de profundidad en la UI
     * @param {number} value - valor a asignar
     */
    updateInputUI(value) {
        const inputDepthLimit = document.getElementById('input-depth-limit');
        if (inputDepthLimit) {
            inputDepthLimit.value = value;
            console.log('✅ Input de profundidad actualizado a:', value);
        }
    }

    /**
     * Validar un valor de profundidad
     * @param {number} value - valor a validar
     * @returns {boolean} true si es válido
     */
    isValid(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= this.MIN_DEPTH;
    }
}
