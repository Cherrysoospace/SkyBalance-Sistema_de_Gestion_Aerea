/* ============================================
   INDEX PAGE SCRIPT
   Handles initial JSON load and routing
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 SkyBalance iniciando...');

    // Verificar conectividad con backend
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
    const modeSelect = document.getElementById('load-mode');

    // Habilitar botón solo cuando hay archivo seleccionado
    filePicker.addEventListener('change', () => {
        btnCargar.disabled = !filePicker.files[0];
        // Mostrar nombre del archivo si existe un label para eso
        const nameEl = document.getElementById('file-name');
        if (nameEl) nameEl.textContent = filePicker.files[0]?.name ?? '';
    });

    btnCargar.addEventListener('click', handleLoad);

    // Si ya hay un árbol cargado en el backend, mostrar botones de navegación rápida
    await checkExistingTree();
});

// Verifica si ya existe un árbol en el backend y muestra accesos rápidos
async function checkExistingTree() {
    try {
        const data = await apiClient.getTree();
        if (data && data.tree) {
            console.log('✅ Árbol existente detectado en backend');
            showQuickAccess();
        }
    } catch (e) {
        // No hay árbol cargado, flujo normal
    }
}

// Maneja la carga del JSON y redirige según el modo elegido
async function handleLoad() {
    const file      = document.getElementById('file-picker').files[0];
    const mode      = document.getElementById('load-mode').value;
    const depthEl   = document.getElementById('depth-limit');
    const depthLimit = depthEl?.value ? parseInt(depthEl.value) : null;
    const btnCargar = document.getElementById('btn-cargar');

    if (!file) return;

    btnCargar.disabled = true;
    btnCargar.textContent = 'Cargando...';
    hideError();

    try {
        // 1. Cargar el JSON en el backend
        await apiClient.loadTreeFromJSON(file);
        console.log(`✅ JSON cargado en modo: ${mode}`);

        // 2. Aplicar profundidad límite si se especificó
        if (depthLimit) {
            await apiClient.setDepthLimit(depthLimit);
            console.log(`✅ Profundidad límite: ${depthLimit}`);
        }

        // 3. Redirigir según el modo
        if (mode === 'insertion') {
            // Inserción genera AVL + BST → ir a comparación
            window.location.href = './pages/comparacion.html';
        } else {
            // Topología genera solo AVL → ir a gestión de nodos
            window.location.href = './pages/gestion-nodos.html';
        }

    } catch (error) {
        console.error('❌ Error cargando JSON:', error);
        showError('Error al cargar el archivo. Verifica que sea un JSON válido con el formato correcto.');
        btnCargar.disabled = false;
        btnCargar.textContent = 'Cargar';
    }
}

// Muestra accesos rápidos cuando ya hay árbol cargado
function showQuickAccess() {
    const heroButtons = document.querySelector('.hero-buttons');
    if (!heroButtons) return;

    const notice = document.createElement('p');
    notice.style.cssText = 'color: var(--text-muted, #888); font-size: 0.85rem; margin-top: 0.5rem;';
    notice.textContent = '✅ Hay un árbol cargado en el sistema';
    heroButtons.appendChild(notice);
}

// Muestra mensaje de error en la UI
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
