/* ============================================
   COMPARACION PAGE SCRIPT
   ============================================ */

// ========================================
// IMPORTS (Module System)
// ========================================
import { apiClient } from '../../api/apiClient.js';

// D3 is loaded from a CDN in the HTML (available as a global)

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

    // Navigation listener
    const btnVolver = document.getElementById('btn-volver');

    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }

    // Try to silently load an existing tree from the backend
    await tryLoadExisting();
});

// Use current backend state only; if no tree exists, show informative message.
async function tryLoadExisting() {
    try {
        const currentState = await apiClient.getTree();
        if (currentState && currentState.tree) {
            const loaded = await loadComparison(currentState);
            if (loaded) {
                showResults();
            } else {
                showLoadSection();
            }
        } else {
            // No tree available, show the load section
            showLoadSection();
        }
    } catch (e) {
        // On fetch error, keep info section visible.
        showLoadSection();
    }
}

// Show results section and hide the load section
function showResults() {
    document.getElementById('load-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
}

// Show load section and hide results
function showLoadSection() {
    document.getElementById('load-section').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
}

// Load AVL and BST to show side-by-side
async function loadComparison(currentState = null) {
    try {
        const comparisonData = await apiClient.getComparison();
        console.log('📊 Datos de comparación recibidos:', comparisonData);

        // Check for errors (TOPOLOGIA load)
        if (comparisonData.error) {
            // Fallback: render current AVL tree even when BST comparison is unavailable.
            const state = currentState || await apiClient.getTree();
            if (state && state.tree) {
                renderCurrentTreeOnly(state, comparisonData.message || comparisonData.error);
                return true;
            }
            return false;
        }

        clearInlineNotice();
        updateComparisonStats(comparisonData);
        console.log('✅ Stats actualizados');
        console.log('📌 AVL tree:', comparisonData.avl?.tree);
        console.log('📌 BST tree:', comparisonData.bst?.tree);

        renderTree(comparisonData.avl?.tree, 'avl-tree-container', 'AVL');
        renderTree(comparisonData.bst?.tree, 'bst-tree-container', 'BST');
        return true;
    } catch (error) {
        console.error('❌ Error cargando comparación:', error);
        // If comparison endpoint fails but current tree exists, still render AVL current state.
        try {
            const state = currentState || await apiClient.getTree();
            if (state && state.tree) {
                renderCurrentTreeOnly(state, 'No fue posible comparar BST vs AVL en este momento.');
                return true;
            }
        } catch (fallbackError) {
            console.error('❌ Error en fallback de comparación:', fallbackError);
        }
        return false;
    }
}

function renderCurrentTreeOnly(state, message) {
    showInlineNotice(message || 'Mostrando árbol AVL actual.');

    // Render AVL current tree + stats from current state.
    updateComparisonStats({
        avl: {
            tree: state.tree,
            metrics: state.metrics || {},
        },
        bst: {
            tree: null,
            metrics: {},
        },
    });

    renderTree(state.tree, 'avl-tree-container', 'AVL');
    renderTree(null, 'bst-tree-container', 'BST');
}

function showInlineNotice(message) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;

    let notice = document.getElementById('comparison-inline-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'comparison-inline-notice';
        notice.style.margin = '0 0 1rem 0';
        notice.style.padding = '0.75rem 1rem';
        notice.style.borderRadius = '10px';
        notice.style.background = '#fff4e5';
        notice.style.border = '1px solid #f5c26b';
        notice.style.color = '#8a5800';
        resultsSection.insertBefore(notice, resultsSection.firstChild);
    }
    notice.textContent = message;
}

function clearInlineNotice() {
    const notice = document.getElementById('comparison-inline-notice');
    if (notice) {
        notice.remove();
    }
}

// Shows an error popup when trying to compare with TOPOLOGIA
function showComparisonError(errorData) {
    // Create modal
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
            Para comparar, primero construye el árbol actual en Gestión de Nodos o Inicio con modo INSERCION.
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

    // Attach event to the button
    document.getElementById('close-error-popup').addEventListener('click', () => {
        modal.remove();
    });

    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Add animation
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

// Unified function to render a tree with D3 (AVL or BST)
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

    // Color: red=critical, lilac=normal AVL, blue=normal BST
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
