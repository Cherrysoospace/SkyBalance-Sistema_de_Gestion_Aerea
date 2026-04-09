/* ============================================
   MODAL MANAGER - Lógica reutilizable de modales
   ============================================ */

export class ModalManager {
    constructor(modalId = 'modal-formulario', formId = 'formulario', titleId = 'modal-title') {
        this.modal = document.getElementById(modalId);
        this.form = document.getElementById(formId);
        this.titleEl = document.getElementById(titleId);
        this.currentAction = null;
        this.onSubmit = null;

        this.codeInput = document.getElementById('field-codigo');

        this.setupHandlers();
        this.setupCodeField();
    }

    setupHandlers() {
        const closeBtn = this.modal.querySelector('.close-modal');
        const cancelBtn = this.modal.querySelector('.btn-cancel');

        closeBtn.addEventListener('click', () => this.close());
        cancelBtn.addEventListener('click', () => this.close());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Cerrar modal al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open(action, title, config = {}) {
        this.currentAction = action;
        this.titleEl.textContent = title;
        this.form.reset();
        this.setupCodeField();

        // Aplicar configuración (campos a mostrar/ocultar, pre-llenar datos, etc)
        if (config.visibleFields) {
            this.toggleFields(config.visibleFields);
        }

        if (config.prefill) {
            this.prefillForm(config.prefill);
        }

        this.modal.classList.add('show');
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.remove('show');
        this.modal.classList.add('hidden');
        this.form.reset();
    }

    toggleFields(fieldsToShow = []) {
        const allFields = this.form.querySelectorAll('[data-field]');
        allFields.forEach(field => {
            field.style.display = 'none';
        });

        fieldsToShow.forEach(fieldId => {
            const field = this.form.querySelector(`#${fieldId}`).closest('[data-field]');
            if (field) field.style.display = 'block';
        });
    }

    prefillForm(data) {
        Object.keys(data).forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[fieldId];
                } else if (fieldId === 'field-codigo') {
                    input.value = this.extractNumericCode(data[fieldId]);
                } else {
                    input.value = data[fieldId];
                }
            }
        });
    }

    getFormData() {
        const numericCode = this.normalizeCodeValue(document.getElementById('field-codigo').value);
        return {
            codigo: numericCode,
            origen: document.getElementById('field-origen').value,
            destino: document.getElementById('field-destino').value,
            horaSalida: document.getElementById('field-horaSalida').value,
            pasajeros: parseInt(document.getElementById('field-pasajeros').value) || 0,
            precioBase: parseFloat(document.getElementById('field-precioBase').value) || 0,
            promocion: document.getElementById('field-promocion').checked,
            prioridad: parseInt(document.getElementById('field-prioridad').value) || 0,
            alerta: document.getElementById('field-alerta').checked
        };
    }

    setSubmitHandler(callback) {
        this.onSubmit = callback;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.onSubmit) {
            try {
                const formData = this.getFormData();
                await this.onSubmit(this.currentAction, formData);
                this.close();
            } catch (error) {
                console.error('Error en modal submit:', error);
                throw error;
            }
        }
    }

    setupCodeField() {
        if (!this.codeInput) {
            this.codeInput = document.getElementById('field-codigo');
        }

        if (!this.codeInput || this.codeInput.dataset.codeSanitized === 'true') {
            return;
        }

        this.codeInput.setAttribute('inputmode', 'numeric');
        this.codeInput.setAttribute('maxlength', '3');
        this.codeInput.setAttribute('pattern', '[0-9]{1,3}');

        this.codeInput.addEventListener('input', () => {
            this.codeInput.value = this.extractNumericCode(this.codeInput.value);
        });

        this.codeInput.addEventListener('blur', () => {
            this.codeInput.value = this.extractNumericCode(this.codeInput.value).padStart(3, '0');
        });

        this.codeInput.dataset.codeSanitized = 'true';
    }

    extractNumericCode(value) {
        const raw = String(value || '').trim().toUpperCase();
        const digits = raw.startsWith('SB') ? raw.slice(2) : raw;
        return digits.replace(/\D/g, '').slice(0, 3);
    }

    normalizeCodeValue(value) {
        const digits = this.extractNumericCode(value);
        if (!digits) {
            return '';
        }

        return `SB${digits.padStart(3, '0')}`;
    }
}

// Instancia global exportada
export const modalManager = new ModalManager();
