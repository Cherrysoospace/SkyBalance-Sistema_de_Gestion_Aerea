/* ============================================
   GESTION NODOS PAGE SCRIPT
   ============================================ */

let selectedNode = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cargando página de Gestión de Nodos...');

    // Verificar conectividad con backend
    try {
        await apiClient.healthCheck();
        console.log('✅ Conexión con backend exitosa');
    } catch (error) {
        console.error('❌ No se puede conectar con el backend:', error);
        alert('Error: No se puede conectar con el backend en localhost:8000');
    }

    // Cargar el árbol inicial
    await loadTree();

    // Event listeners para botones de acción
    document.getElementById('btnDeshacer').addEventListener('click', undoAction);
    document.getElementById('btnAdicionar').addEventListener('click', () => abrirFormularioAdicionar());
    document.getElementById('btnModificar').addEventListener('click', () => abrirFormularioModificar());
    document.getElementById('btnEliminacion').addEventListener('click', () => abrirFormularioEliminar());
    document.getElementById('btnCancelar').addEventListener('click', cancelarVuelo);
    document.getElementById('btnExportar').addEventListener('click', exportTree);

    // Configurar handler de submit del modal
    modalManager.setSubmitHandler(procesarFormulario);
});

// Abrir formulario para adicionar
function abrirFormularioAdicionar() {
    modalManager.open('adicionar', 'Adicionar Nodo', {
        visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                       'field-pasajeros', 'field-precioBase', 'field-promocion',
                       'field-prioridad', 'field-alerta']
    });
}

// Abrir formulario para modificar
function abrirFormularioModificar() {
    if (!selectedNode) {
        alert('Selecciona un nodo primero');
        return;
    }

    modalManager.open('modificar', 'Modificar Nodo', {
        visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                       'field-pasajeros', 'field-precioBase', 'field-promocion',
                       'field-prioridad', 'field-alerta'],
        prefill: {
            'field-codigo': selectedNode.codigo,
            'field-origen': selectedNode.origen || '',
            'field-destino': selectedNode.destino || '',
            'field-horaSalida': selectedNode.horaSalida || '',
            'field-pasajeros': selectedNode.pasajeros || 0,
            'field-precioBase': selectedNode.precioBase || 0,
            'field-promocion': selectedNode.promocion || false,
            'field-prioridad': selectedNode.prioridad || 0,
            'field-alerta': selectedNode.alerta || false
        }
    });
}

// Abrir formulario para eliminar
function abrirFormularioEliminar() {
    if (!selectedNode) {
        alert('Selecciona un nodo primero');
        return;
    }

    modalManager.open('eliminar', 'Eliminar Nodo', {
        visibleFields: ['field-codigo'],
        prefill: {
            'field-codigo': selectedNode.codigo
        }
    });
}

// Procesar envío del formulario
async function procesarFormulario(action, formData) {
    try {
        if (action === 'adicionar') {
            await apiClient.insertNode(formData.codigo, formData.origen, formData.destino,
                                      formData.horaSalida, formData.pasajeros, formData.precioBase);
            console.log('✅ Nodo adicionado:', formData.codigo);
        } else if (action === 'modificar') {
            await apiClient.updateNode(formData.codigo, formData);
            console.log('✅ Nodo modificado:', formData.codigo);
        } else if (action === 'eliminar') {
            await apiClient.deleteNode(formData.codigo);
            console.log('✅ Nodo eliminado:', formData.codigo);
        }

        await loadTree();
    } catch (error) {
        console.error('❌ Error en operación:', error);
        alert('Error: ' + error.message);
    }
}

// Cargar el árbol desde la API
async function loadTree() {
    try {
        const data = await apiClient.getTree();
        console.log('✅ Árbol cargado:', data);
        renderTree(data);
        await updateMetrics();
    } catch (error) {
        console.error('❌ Error cargando el árbol:', error);
        document.getElementById('tree-container').innerHTML = '<p>Error al cargar el árbol</p>';
    }
}

// Renderizar el árbol con D3 - muestra estructura jerárquica con nodos clickeables
function renderTree(treeData) {
    const container = document.getElementById('tree-container');
    container.innerHTML = '';

    if (!treeData || !treeData.tree) {
        container.innerHTML = '<p style="color:var(--text-muted)">Árbol vacío — carga un JSON primero</p>';
        return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const root = d3.hierarchy(treeData.tree, d => {
        const children = [];
        if (d.left) children.push(d.left);
        if (d.right) children.push(d.right);
        return children.length ? children : null;
    });

    const treeLayout = d3.tree().size([width - 80, height - 100]);
    treeLayout(root);

    const svg = d3.select(container).append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g').attr('transform', 'translate(40, 60)');

    // Links (conexiones entre nodos)
    g.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#555')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y));

    // Nodes (nodos del árbol)
    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            selectedNode = d.data;
            // Resetear color de todos los nodos
            g.selectAll('circle').attr('stroke', '#333').attr('stroke-width', 1.5);
            // Resaltar seleccionado
            d3.select(event.currentTarget).select('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 3);
            console.log('📍 Nodo seleccionado:', selectedNode.codigo);
        });

    node.append('circle')
        .attr('r', 28)
        .attr('fill', d => d.data.critico ? '#e74c3c' : '#c084fc')  // rojo si crítico, lila si normal
        .attr('stroke', '#333')
        .attr('stroke-width', 1.5);

    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .attr('font-size', '11px')
        .attr('fill', '#fff')
        .attr('font-weight', '600')
        .text(d => d.data.codigo);

    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('font-size', '10px')
        .attr('fill', '#fff')
        .text(d => `$${d.data.precioFinal ?? d.data.precioBase}`);
}

// Deshacer última acción
async function undoAction() {
    try {
        await apiClient.undoLast();
        console.log('✅ Acción deshecha');
        await loadTree();
    } catch (error) {
        console.error('❌ Error deshaciendo:', error);
        alert('No hay acciones para deshacer');
    }
}

// Cancelar vuelo - cancela el nodo seleccionado y toda su descendencia
async function cancelarVuelo() {
    if (!selectedNode) {
        alert('Selecciona un nodo primero');
        return;
    }

    if (!confirm(`¿Cancelar vuelo ${selectedNode.codigo} y toda su descendencia?`)) {
        return;
    }

    try {
        await apiClient.cancelSubtree(selectedNode.codigo);
        console.log('✅ Vuelo cancelado:', selectedNode.codigo);
        selectedNode = null;
        await loadTree();
    } catch (error) {
        console.error('❌ Error cancelando vuelo:', error);
        alert('Error: ' + error.message);
    }
}

// Exportar árbol a JSON
async function exportTree() {
    try {
        const data = await apiClient.getTree();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'arbol_avl.json';
        a.click();
        URL.revokeObjectURL(url);
        console.log('✅ Árbol exportado');
    } catch (error) {
        console.error('❌ Error exportando:', error);
    }
}

// Actualizar métricas del árbol
async function updateMetrics() {
    try {
        const metrics = await apiClient.getMetrics();
        const el = document.getElementById('metrics-panel');
        if (el) {
            el.innerHTML = `
                Altura: ${metrics.altura} &nbsp;|&nbsp;
                Hojas: ${metrics.hojas} &nbsp;|&nbsp;
                Rotaciones: ${metrics.rotaciones_total}
            `;
        }
    } catch (e) {
        // Silencioso si no hay métricas aún
    }
}
