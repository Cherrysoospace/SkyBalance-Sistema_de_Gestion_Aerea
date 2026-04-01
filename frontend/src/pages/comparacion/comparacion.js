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
    const btnExportar = document.getElementById('btn-exportar');
    const btnVolver = document.getElementById('btn-volver');
    const btnGuardarVersion = document.getElementById('btn-guardar-version');
    const btnRestaurarVersion = document.getElementById('btn-restaurar-version');

    if (btnExportar) btnExportar.addEventListener('click', exportComparison);
    if (btnVolver) {
        btnVolver.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }
    if (btnGuardarVersion) btnGuardarVersion.addEventListener('click', saveVersion);
    if (btnRestaurarVersion) btnRestaurarVersion.addEventListener('click', restoreVersion);

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

        updateComparisonStats(comparisonData);
        console.log('✅ Stats actualizados');
        console.log('📌 AVL tree:', comparisonData.avl?.tree);
        console.log('📌 BST tree:', comparisonData.bst?.tree);

        renderTree(comparisonData.avl?.tree, 'avl-tree-container', 'AVL');
        renderTree(comparisonData.bst?.tree, 'bst-tree-container', 'BST');

        await loadVersions();
    } catch (error) {
        console.error('❌ Error cargando comparación:', error);
    }
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

async function exportComparison() {
    try {
        const data = await apiClient.getComparison();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'comparacion_avl_bst.json';
        a.click();
        URL.revokeObjectURL(url);
        console.log('Comparación exportada');
    } catch (error) {
        console.error('Error exportando:', error);
        alert('Error al exportar');
    }
}

// Carga y muestra las versiones guardadas en el selector
async function loadVersions() {
    try {
        const versions = await apiClient.listVersions();
        const selector = document.getElementById('version-selector');
        selector.innerHTML = '<option value="">-- Selecciona versión --</option>';
        versions.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = `${v.name} (${new Date(v.timestamp).toLocaleString()})`;
            selector.appendChild(opt);
        });
        console.log(`✅ ${versions.length} versiones cargadas`);
    } catch (e) {
        console.error('❌ Error cargando versiones:', e);
    }
}

// Guarda el estado actual del árbol con un nombre
async function saveVersion() {
    const input = document.getElementById('version-name');
    const name  = input.value.trim();
    if (!name) { alert('Ingresa un nombre para la versión'); return; }
    try {
        await apiClient.saveVersion(name);
        input.value = '';
        await loadVersions();
        console.log(`✅ Versión "${name}" guardada`);
    } catch (e) {
        console.error('❌ Error guardando versión:', e);
        alert('Error al guardar versión');
    }
}

// Restaura el árbol a la versión seleccionada
async function restoreVersion() {
    const selector = document.getElementById('version-selector');
    const name = selector.value;
    if (!name) { alert('Selecciona una versión primero'); return; }
    if (!confirm(`¿Restaurar árbol a la versión "${name}"?`)) return;
    try {
        await apiClient.restoreVersion(name);
        await loadComparison();
        console.log(`✅ Versión "${name}" restaurada`);
    } catch (e) {
        console.error('❌ Error restaurando versión:', e);
        alert('Error al restaurar versión');
    }
}
