/* ============================================
   COMPARACION PAGE SCRIPT
   ============================================ */

// ========================================
// IMPORTS (Module System)
// ========================================
import { apiClient } from '../../api/apiClient.js';

// D3 es cargado desde CDN en el HTML (disponible como global)

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cargando página de Comparación BST vs AVL...');

    try {
        await apiClient.healthCheck();
        console.log('✅ Conexión con backend exitosa');
    } catch (error) {
        console.error('❌ No se puede conectar con el backend:', error);
        document.querySelector('.comparacion-container').innerHTML =
            '<p style="padding:2rem;text-align:center;color:red">Error: No se puede conectar con el backend</p>';
        return;
    }

    // Listeners de carga
    const filePicker = document.getElementById('file-picker');
    const btnCargar  = document.getElementById('btn-cargar');

    if (filePicker && btnCargar) {
        filePicker.addEventListener('change', () => {
            const file = filePicker.files[0];
            document.getElementById('file-name').textContent = file ? file.name : 'Ningún archivo seleccionado';
            btnCargar.disabled = !file;
        });
        btnCargar.addEventListener('click', handleLoad);
    }

    // Listeners existentes
    const btnVolver = document.getElementById('btn-volver');

    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }

    // Intentar cargar árbol existente en el backend silenciosamente
    await tryLoadExisting();
});

// Intenta cargar árbol existente; si no hay, muestra sección de carga
async function tryLoadExisting() {
    try {
        const avlData = await apiClient.getTree();
        if (avlData && avlData.tree) {
            await loadComparison();
            showResults();
        } else {
            // No hay árbol, mostrar sección de carga
            showLoadSection();
        }
    } catch (e) {
        // Error al obtener árbol, mostrar sección de carga
        showLoadSection();
    }
}

// Maneja la carga del archivo JSON y construcción del árbol
async function handleLoad() {
    const file = document.getElementById('file-picker').files[0];
    if (!file) return;

    const btnCargar = document.getElementById('btn-cargar');
    const errorEl  = document.getElementById('load-error');
    btnCargar.disabled = true;
    btnCargar.textContent = 'Cargando...';
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    try {
        await apiClient.loadTreeFromJSON(file);
        console.log('✅ JSON cargado exitosamente');
        await loadComparison();
        showResults();
    } catch (e) {
        console.error('❌ Error cargando JSON:', e);
        errorEl.textContent = 'Error al cargar el archivo. Verifica que sea un JSON válido.';
        errorEl.classList.remove('hidden');
        btnCargar.disabled = false;
        btnCargar.innerHTML = '<i class="fas fa-upload"></i> Cargar y comparar';
    }
}

// Muestra la sección de resultados y oculta la de carga
function showResults() {
    document.getElementById('load-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
}

// Muestra la sección de carga y oculta resultados
function showLoadSection() {
    document.getElementById('load-section').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
}

// Carga AVL y BST para mostrar lado a lado
async function loadComparison() {
    try {
        const comparisonData = await apiClient.getComparison();
        console.log('📊 Datos de comparación recibidos:', comparisonData);

        // Verificar si hay error (carga de TOPOLOGIA)
        if (comparisonData.error) {
            showComparisonError(comparisonData);
            showLoadSection(); // Volver a mostrar sección de carga
            return;
        }

        updateComparisonStats(comparisonData);
        console.log('✅ Stats actualizados');
        console.log('📌 AVL tree:', comparisonData.avl?.tree);
        console.log('📌 BST tree:', comparisonData.bst?.tree);

        renderTree(comparisonData.avl?.tree, 'avl-tree-container', 'AVL');
        renderTree(comparisonData.bst?.tree, 'bst-tree-container', 'BST');
    } catch (error) {
        console.error('❌ Error cargando comparación:', error);
    }
}

// Muestra popup de error cuando se intenta comparación con TOPOLOGIA
function showComparisonError(errorData) {
    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 450px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;

    modalContent.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
                <circle cx="30" cy="30" r="28" stroke="#e74c3c" stroke-width="2"/>
                <text x="30" y="38" font-size="36" fill="#e74c3c" text-anchor="middle" font-weight="bold">!</text>
            </svg>
        </div>
        <h2 style="margin: 1rem 0; color: #333; font-size: 1.5rem;">Comparación no disponible</h2>
        <p style="color: #666; margin: 1rem 0; line-height: 1.5;">
            Se detectó que se cargó una <strong>TOPOLOGIA</strong> (árbol jerárquico predefinido).
        </p>
        <p style="color: #666; margin: 1rem 0; line-height: 1.5;">
            La comparación entre AVL y BST solo funciona cuando se carga en modo <strong>INSERCION</strong> (vuelos individuales).
        </p>
        <p style="color: #999; margin: 1rem 0; font-size: 0.9rem;">
            Por favor, carga un archivo JSON en modo INSERCION para usar la comparación.
        </p>
        <button id="close-error-popup" style="
            margin-top: 1.5rem;
            padding: 0.75rem 2rem;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s;
        ">Entendido</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Agregar evento al botón
    document.getElementById('close-error-popup').addEventListener('click', () => {
        modal.remove();
    });

    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

function updateComparisonStats(data) {
    // AVL Stats
    if (data.avl) {
        document.getElementById('avl-raiz').textContent = data.avl.tree?.codigo || '-';
        document.getElementById('avl-altura').textContent = data.avl.metrics?.profundidad || data.avl.metrics?.alturaActual || '-';
        document.getElementById('avl-hojas').textContent = data.avl.metrics?.hojas || '-';
    }

    // BST Stats
    if (data.bst) {
        document.getElementById('bst-raiz').textContent = data.bst.tree?.codigo || '-';
        document.getElementById('bst-altura').textContent = data.bst.metrics?.profundidad || data.bst.metrics?.alturaActual || '-';
        document.getElementById('bst-hojas').textContent = data.bst.metrics?.hojas || '-';
    }
}

// Función unificada para renderizar árbol con D3 (AVL o BST)
function renderTree(treeData, containerId, label) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!treeData) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem">
            ${label === 'BST' ? 'BST solo disponible tras carga por inserción' : 'Árbol vacío'}
        </p>`;
        return;
    }

    const width  = container.clientWidth  || 500;
    const height = container.clientHeight || 400;

    const root = d3.hierarchy(treeData, d => {
        const ch = [];
        if (d.left)      ch.push(d.left);
        if (d.right)     ch.push(d.right);
        if (d.izquierdo) ch.push(d.izquierdo);
        if (d.derecho)   ch.push(d.derecho);
        return ch.length ? ch : null;
    });

    d3.tree().size([width - 60, height - 80])(root);

    const svg = d3.select(container).append('svg')
        .attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', 'translate(30,50)');

    // Links
    g.selectAll('.link')
        .data(root.links()).enter()
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', '#555')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

    // Nodes
    const node = g.selectAll('.node')
        .data(root.descendants()).enter()
        .append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`);

    // Color: rojo=crítico, lila=AVL normal, azul=BST normal
    const nodeColor = d => {
        if (d.data.critico) return '#e74c3c';
        return label === 'BST' ? '#3b82f6' : '#c084fc';
    };

    node.append('circle')
        .attr('r', 24)
        .attr('fill', nodeColor)
        .attr('stroke', '#333')
        .attr('stroke-width', 1.5);

    node.append('text')
        .attr('text-anchor', 'middle').attr('dy', '-0.2em')
        .attr('font-size', '10px').attr('fill', '#fff').attr('font-weight', '600')
        .text(d => d.data.codigo);

    node.append('text')
        .attr('text-anchor', 'middle').attr('dy', '1em')
        .attr('font-size', '9px').attr('fill', '#fff')
        .text(d => `h:${d.data.altura ?? '?'} fb:${d.data.factorEquilibrio ?? '?'}`);

    console.log(`✅ Árbol ${label} renderizado — ${root.descendants().length} nodos`);
}
