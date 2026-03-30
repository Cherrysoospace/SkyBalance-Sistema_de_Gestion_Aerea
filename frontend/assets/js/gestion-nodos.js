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

    // Carga de JSON desde esta página
    const filePicker = document.getElementById('file-picker-gestion');
    const btnCargar  = document.getElementById('btn-cargar-gestion');

    if (filePicker && btnCargar) {
        filePicker.addEventListener('change', () => {
            btnCargar.disabled = !filePicker.files[0];
        });
        btnCargar.addEventListener('click', async () => {
            const file = filePicker.files[0];
            if (!file) return;
            btnCargar.disabled = true;
            btnCargar.textContent = 'Cargando...';
            try {
                await apiClient.loadTreeFromJSON(file);
                console.log('✅ JSON cargado desde gestión');
                await loadTree();
            } catch (e) {
                console.error('❌ Error cargando JSON:', e);
                alert('Error al cargar el archivo');
                btnCargar.disabled = false;
                btnCargar.textContent = 'Cargar';
            }
        });
    }
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
        const payload = {
            codigo:      formData.codigo || '',
            origen:      formData.origen      || '',
            destino:     formData.destino      || '',
            horaSalida:  formData.horaSalida   || '',
            pasajeros:   Number.isNaN(parseInt(formData.pasajeros)) ? 0 : parseInt(formData.pasajeros),
            precioBase:  Number.isNaN(parseFloat(formData.precioBase)) ? 0 : parseFloat(formData.precioBase),
            promocion:   !!formData.promocion,
            prioridad:   Number.isNaN(parseInt(formData.prioridad)) ? 0 : parseInt(formData.prioridad),
            alerta:      !!formData.alerta,
        };

        console.log('📤 Enviando payload:', payload);

        if (action === 'adicionar') {
            await apiClient.insertNode(payload);
            console.log('✅ Nodo adicionado:', payload.codigo);
        } else if (action === 'modificar') {
            await apiClient.updateNode(payload.codigo, payload);
            console.log('✅ Nodo modificado:', payload.codigo);
        } else if (action === 'eliminar') {
            await apiClient.deleteNode(payload.codigo);
            console.log('✅ Nodo eliminado:', payload.codigo);
            selectedNode = null;
        }

        await loadTree();
    } catch (error) {
        console.error('❌ Error en operación:', error);
        alert('Error: ' + (error.response?.data?.detail || error.message));
    }
}

// Cargar el árbol desde la API
async function loadTree() {
    try {
        const data = await apiClient.getTree();
        if (!data || !data.tree) {
            mostrarSeccionCarga();
            return;
        }
        ocultarSeccionCarga();
        renderTree(data);
        await updateMetrics();
        console.log('✅ Árbol cargado');
    } catch (error) {
        console.error('❌ Error cargando el árbol:', error);
        mostrarSeccionCarga();
    }
}

function mostrarSeccionCarga() {
    document.getElementById('load-section').classList.remove('hidden');
    document.getElementById('tree-container').classList.add('hidden');
}

function ocultarSeccionCarga() {
    document.getElementById('load-section').classList.add('hidden');
    document.getElementById('tree-container').classList.remove('hidden');
}

// Renderizar el árbol con D3 - muestra estructura jerárquica con nodos clickeables
function renderTree(treeData) {
    const container = document.getElementById('tree-container');
    container.innerHTML = '';

    if (!treeData || !treeData.tree) {
        container.innerHTML = '<p style="color:var(--text-muted)">Árbol vacío — carga un JSON primero</p>';
        return;
    }

    console.log('🔍 DEBUG renderTree - treeData recibido:', treeData);
    console.log('🔍 DEBUG renderTree - treeData.tree:', treeData.tree);
    console.log('🔍 DEBUG - Campos del nodo raíz:', Object.keys(treeData.tree));

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const root = d3.hierarchy(treeData.tree ?? treeData, d => {
        const children = [];
        if (d.left)      children.push(d.left);
        if (d.right)     children.push(d.right);
        if (d.izquierdo) children.push(d.izquierdo);
        if (d.derecho)   children.push(d.derecho);

        console.log(`📍 Nodo ${d.codigo || '?'} - Hijos encontrados: ${children.length}`, {
            left: !!d.left,
            right: !!d.right,
            izquierdo: !!d.izquierdo,
            derecho: !!d.derecho
        });

        return children.length ? children : null;
    });

    console.log(`✅ Árbol procesado - Total nodos: ${root.descendants().length}`);

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
        .text(d => d.data.codigo ?? d.data.codigo);

    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('font-size', '10px')
        .attr('fill', '#fff')
        .text(d => `$${d.data.precioFinal ?? d.data.precioBase ?? '?'}`);
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
