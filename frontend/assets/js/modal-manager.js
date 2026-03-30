/* ============================================
   MODAL MANAGER - Lógica reutilizable de modales
   ============================================ */

class ModalManager {
    constructor(modalId = 'modal-formulario', formId = 'formulario', titleId = 'modal-title') {
        this.modal = document.getElementById(modalId);
        this.form = document.getElementById(formId);
        this.titleEl = document.getElementById(titleId);
        this.currentAction = null;
        this.onSubmit = null;

        this.setupHandlers();
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
                } else {
                    input.value = data[fieldId];
                }
            }
        });
    }

    getFormData() {
        return {
            codigo: document.getElementById('field-codigo').value,
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
}

// Instancia global
const modalManager = new ModalManager();
