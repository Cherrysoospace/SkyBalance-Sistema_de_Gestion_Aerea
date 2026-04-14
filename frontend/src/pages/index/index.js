/* ============================================
   INDEX PAGE SCRIPT
   Handles initial JSON load and routing
   ============================================ */

// ========================================
// IMPORTS (Module System)
// ========================================
import { apiClient } from '../../api/apiClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 FAC Airways iniciando...');

    // Verify backend connectivity
    try {
        await apiClient.healthCheck();
        console.log('✅ Backend conectado');
    } catch (error) {
        console.error('❌ Backend no disponible:', error);
        showError('No se puede conectar con el backend en localhost:8000');
        return;
    }

    const filePicker = document.getElementById('file-picker');
    const btnCargar  = document.getElementById('btn-cargar');

    // Enable button only when a file is selected
    filePicker.addEventListener('change', () => {
        btnCargar.disabled = !filePicker.files[0];
        // Show the file name if there is a label for it
        const nameEl = document.getElementById('file-name');
        if (nameEl) nameEl.textContent = filePicker.files[0]?.name ?? '';
    });

    btnCargar.addEventListener('click', handleLoad);

    // If a tree is already loaded in the backend, show quick navigation
    await checkExistingTree();
});

// Checks whether a tree already exists in the backend and shows quick access
async function checkExistingTree() {
    try {
        const data = await apiClient.getTree();
        if (data && data.tree) {
            console.log('✅ Árbol existente detectado en backend');
            showQuickAccess();
        }
    } catch (e) {
        // No tree loaded, normal flow
    }
}

// Handles JSON load and redirects based on the mode detected by the backend
async function handleLoad() {
    const file       = document.getElementById('file-picker').files[0];
    const depthEl    = document.getElementById('depth-limit');
    const depthLimit = depthEl?.value ? parseInt(depthEl.value) : null;
    const btnCargar  = document.getElementById('btn-cargar');

    if (!file) return;

    if (!depthLimit || depthLimit < 2) {
        showError('❌ Debes especificar una profundidad máxima mayor o igual a 2');
        return;
    }

    btnCargar.disabled = true;
    btnCargar.textContent = 'Cargando...';
    hideError();

    try {
        // Send file + depthLimit to the backend
        const response = await apiClient.loadTreeFromJSON(file, depthLimit);
        const mode = response?.info?.mode;
        console.log(`✅ JSON cargado — modo detectado: ${mode}, nodos: ${response?.info?.nodos}, depthLimit: ${depthLimit}`);

        // ✅ Store depthLimit in localStorage BEFORE redirecting
        localStorage.setItem('currentDepthLimit', depthLimit);
        console.log('💾 depthLimit guardado en localStorage:', depthLimit);

        // Redirect based on the mode returned by the backend
        if (mode === 'INSERCION') {
            window.location.href = './pages/comparacion.html';
        } else {
            // TOPOLOGIA or other → node management
            window.location.href = './pages/gestion-nodos.html';
        }

    } catch (error) {
        console.error('❌ Error cargando JSON:', error);
        showError('❌ Error al cargar el archivo: ' + error.message);
        btnCargar.disabled = false;
        btnCargar.textContent = 'Cargar';
    }
}

// Shows quick access when a tree is already loaded
function showQuickAccess() {
    const heroButtons = document.querySelector('.hero-buttons');
    if (!heroButtons) return;

    const notice = document.createElement('p');
    notice.style.cssText = 'color: var(--text-muted, #888); font-size: 0.85rem; margin-top: 0.5rem;';
    notice.textContent = '✅ Hay un árbol cargado en el sistema';
    heroButtons.appendChild(notice);
}

// Shows an error message in the UI
function showError(msg) {
    let errorEl = document.getElementById('load-error');
    if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.id = 'load-error';
        errorEl.style.cssText = 'color: #e74c3c; margin-top: 0.5rem; font-size: 0.9rem;';
        document.querySelector('.tree-viewer .controls')?.appendChild(errorEl);
    }
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}

function hideError() {
    const errorEl = document.getElementById('load-error');
    if (errorEl) errorEl.style.display = 'none';
}
