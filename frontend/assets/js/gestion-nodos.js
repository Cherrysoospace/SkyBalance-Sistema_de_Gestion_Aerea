/* ============================================
   GESTION NODOS PAGE SCRIPT
   ============================================ */

// Configuración fallback por si animation-config.js no se carga
if (typeof REBALANCE_ANIMATION_CONFIG === 'undefined') {
    window.REBALANCE_ANIMATION_CONFIG = {
        DELAY_BETWEEN_ROTATIONS: 800,
        NODE_HIGHLIGHT_DURATION: 600,
        SHOW_FINAL_ALERT: true,
        PROGRESS_BAR_ANIMATION: 300,
        AUTO_SCROLL_PANEL: true,
        PANEL_DISPLAY_TIME_AFTER_COMPLETE: 2000,
        DEBUG_MODE: false
    };
    console.log('⚠️ Usando configuración fallback para animación (animation-config.js no está disponible)');
}

let selectedNode = null;
let stressModeEnabled = false;

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

    // Event listeners para Modo Estrés y Rebalanceo Global
    document.getElementById('btnModoEstres').addEventListener('click', toggleStressMode);
    document.getElementById('btnRebalanceo').addEventListener('click', ejecutarRebalanceoGlobal);

    // Event listener para Ver Métricas Analíticas
    document.getElementById('btnMetricas').addEventListener('click', abrirModalMetricas);

    // Configurar cierre del modal de métricas
    const modalMetricas = document.getElementById('modal-metricas');
    const closeBtn = modalMetricas.querySelector('.close-modal');
    closeBtn.addEventListener('click', cerrarModalMetricas);
    window.addEventListener('click', (e) => {
        if (e.target === modalMetricas) {
            cerrarModalMetricas();
        }
    });

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
        if (metrics) {
            const el = document.getElementById('metrics-panel');
            if (el) {
                const totalRotations = Object.values(metrics.rotaciones || {}).reduce((a, b) => a + b, 0);
                el.innerHTML = `
                    <span class="metric-badge">
                        <i class="fas fa-arrows-alt-v"></i> Altura: ${metrics.alturaActual ?? 0}
                    </span>
                    <span class="metric-badge">
                        <i class="fas fa-leaf"></i> Hojas: ${metrics.hojas ?? 0}
                    </span>
                    <span class="metric-badge">
                        <i class="fas fa-redo"></i> Rotaciones: ${totalRotations || 0}
                    </span>
                `;
            }
        }
    } catch (e) {
        // Silencioso si no hay métricas aún
        console.debug('updateMetrics: No hay métricas disponibles aún');
    }
}

// Abrir modal de Métricas Analíticas
async function abrirModalMetricas() {
    try {
        const metrics = await apiClient.getMetrics();
        if (!metrics) {
            alert('No hay métricas disponibles');
            return;
        }

        const modalMetricas = document.getElementById('modal-metricas');
        const contenido = document.getElementById('metrics-content');

        // Procesar rotaciones
        const rotaciones = metrics.rotaciones || {};
        const totalRotaciones = Object.values(rotaciones).reduce((a, b) => a + b, 0);

        // Procesar recorridos
        const bfs = metrics.bfs || [];
        const dfs = metrics.dfs || {};

        // Construir el contenido HTML
        let html = `
            <div class="metrics-section">
                <h3><i class="fas fa-ruler"></i> Altura del Árbol</h3>
                <div class="metric-value">${metrics.alturaActual ?? 0}</div>
                <p class="metric-desc">altura actual del árbol (distancia máxima de la raíz a una hoja)</p>
            </div>

            <div class="metrics-section">
                <h3><i class="fas fa-leaf"></i> Cantidad de Hojas</h3>
                <div class="metric-value">${metrics.hojas ?? 0}</div>
                <p class="metric-desc">nodos sin hijos izquierdo ni derecho</p>
            </div>

            <div class="metrics-section">
                <h3><i class="fas fa-redo"></i> Rotaciones Realizadas</h3>
                <div class="metric-value">${totalRotaciones}</div>
                <div class="rotations-table">
                    <div class="rotation-row">
                        <span class="rotation-type">Simple Izquierda (RR)</span>
                        <span class="rotation-count">${rotaciones.RR || 0}</span>
                    </div>
                    <div class="rotation-row">
                        <span class="rotation-type">Simple Derecha (LL)</span>
                        <span class="rotation-count">${rotaciones.LL || 0}</span>
                    </div>
                    <div class="rotation-row">
                        <span class="rotation-type">Doble Derecha-Izquierda (RL)</span>
                        <span class="rotation-count">${rotaciones.RL || 0}</span>
                    </div>
                    <div class="rotation-row">
                        <span class="rotation-type">Doble Izquierda-Derecha (LR)</span>
                        <span class="rotation-count">${rotaciones.LR || 0}</span>
                    </div>
                </div>
                <p class="metric-desc">categorización de todas las rotaciones realizadas durante la sesión</p>
            </div>

            <div class="metrics-section">
                <h3><i class="fas fa-ban"></i> Cancelaciones Masivas</h3>
                <div class="metric-value">${metrics.cancelacionesMasivas ?? 0}</div>
                <p class="metric-desc">subárboles completos eliminados (operación de cancelación)</p>
            </div>

            <div class="metrics-section">
                <h3><i class="fas fa-arrows-alt"></i> Recorrido en Anchura (BFS)</h3>
                <div class="traversal-list">
                    ${bfs.length > 0 
                        ? bfs.map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
                        : '<span class="empty-traversal">Árbol vacío</span>'
                    }
                </div>
                <p class="metric-desc">orden de visita por niveles (izquierda a derecha)</p>
            </div>

            <div class="metrics-section">
                <h3><i class="fas fa-code-branch"></i> Recorrido en Profundidad (DFS)</h3>
                
                <div class="dfs-subsection">
                    <h4>Inorden</h4>
                    <div class="traversal-list">
                        ${(dfs.inOrder || []).length > 0 
                            ? (dfs.inOrder || []).map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
                            : '<span class="empty-traversal">Árbol vacío</span>'
                        }
                    </div>
                </div>

                <div class="dfs-subsection">
                    <h4>Preorden</h4>
                    <div class="traversal-list">
                        ${(dfs.preOrder || []).length > 0 
                            ? (dfs.preOrder || []).map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
                            : '<span class="empty-traversal">Árbol vacío</span>'
                        }
                    </div>
                </div>

                <div class="dfs-subsection">
                    <h4>Postorden</h4>
                    <div class="traversal-list">
                        ${(dfs.posOrder || []).length > 0 
                            ? (dfs.posOrder || []).map(codigo => `<span class="traversal-item">${codigo}</span>`).join('')
                            : '<span class="empty-traversal">Árbol vacío</span>'
                        }
                    </div>
                </div>

                <p class="metric-desc">diferentes formas de recorrer el árbol en profundidad</p>
            </div>

            <div class="metrics-info">
                <i class="fas fa-info-circle"></i>
                <span>Las métricas se actualizan en tiempo real con cada operación sobre el árbol.</span>
            </div>
        `;

        contenido.innerHTML = html;
        
        // Mostrar modal
        modalMetricas.classList.remove('hidden');
        modalMetricas.classList.add('show');
        console.log('✅ Modal de métricas abierto');

    } catch (error) {
        console.error('❌ Error cargando métricas:', error);
        alert('Error al cargar las métricas: ' + error.message);
    }
}

// Cerrar modal de Métricas Analíticas
function cerrarModalMetricas() {
    const modalMetricas = document.getElementById('modal-metricas');
    modalMetricas.classList.remove('show');
    modalMetricas.classList.add('hidden');
    console.log('✅ Modal de métricas cerrado');
}

/* ============================================
   Modo Estrés y Rebalanceo Global
   ============================================ */

// Toggle para activar/desactivar Modo Estrés
async function toggleStressMode() {
    const btn = document.getElementById('btnModoEstres');
    const btnRebalance = document.getElementById('btnRebalanceo');

    try {
        stressModeEnabled = !stressModeEnabled;
        
        // Llamar a la API para cambiar el modo estrés
        const response = await apiClient.setStressMode(stressModeEnabled);
        console.log('✅ Modo Estrés actualizado:', stressModeEnabled);

        // Actualizar visual del botón Modo Estrés
        if (stressModeEnabled) {
            btn.classList.add('active');
            btnRebalance.disabled = false;
            console.log('🔴 Modo Estrés ACTIVADO - Rebalanceo Global HABILITADO');
        } else {
            btn.classList.remove('active');
            btnRebalance.disabled = true;
            console.log('🟢 Modo Estrés DESACTIVADO - Rebalanceo Global DESHABILITADO');
        }

        // Recargar el árbol para reflejar cambios
        await loadTree();
    } catch (error) {
        console.error('❌ Error al cambiar Modo Estrés:', error);
        stressModeEnabled = !stressModeEnabled; // Revertir estado
        alert('Error: ' + (error.response?.data?.detail || error.message));
    }
}

// Ejecutar Rebalanceo Global con Animación Paso a Paso
async function ejecutarRebalanceoGlobal() {
    if (!stressModeEnabled) {
        alert('El Modo Estrés debe estar activo para usar Rebalanceo Global');
        return;
    }

    if (!confirm('¿Ejecutar rebalanceo global del árbol? Esta operación puede ser costosa.')) {
        return;
    }

    const btn = document.getElementById('btnRebalanceo');
    
    try {
        btn.disabled = true;
        btn.textContent = '⏳ Rebalanceando...';
        
        // Obtener detalles paso a paso del rebalanceo global
        const response = await apiClient.globalRebalanceAnimated();
        console.log('✅ Rebalanceo Global completado:', response);
        
        const steps = response.result?.steps || [];
        const summary = response.result?.summary || {};
        
        if (steps.length === 0) {
            alert('El árbol ya está balanceado. No se necesitan rotaciones.');
            await loadTree();
        } else {
            // Animar cada rotación paso a paso con redibujado del árbol
            await animateRotationsWithTreeRedraw(steps, summary, response.tree);
            
            // Mostrar resumen final
            showRebalanceSummary(steps, summary);
        }
    } catch (error) {
        console.error('❌ Error en rebalanceo global:', error);
        alert('Error: ' + (error.response?.data?.detail || error.message));
    } finally {
        btn.disabled = !stressModeEnabled;
        btn.innerHTML = '<i class="fas fa-balance-scale"></i> Rebalanceo Global';
    }
}

// Animar cada rotación CON REDIBUJADO del árbol
async function animateRotationsWithTreeRedraw(steps, summary, initialTree) {
    const panel = document.getElementById('rebalance-panel');
    const rotationsList = document.getElementById('rotations-list');
    const progressBar = document.getElementById('progress-bar');
    const rotationCounter = document.getElementById('rotation-counter');
    
    panel.classList.add('active');
    rotationsList.innerHTML = '';
    
    const totalRotations = steps.length;
    console.log(`🎬 Iniciando animación de ${totalRotations} rotaciones con redibujado`);
    
    for (let i = 0; i < totalRotations; i++) {
        const step = steps[i];
        const progress = ((i + 1) / totalRotations) * 100;
        
        // Actualizar barra de progreso
        progressBar.style.width = progress + '%';
        rotationCounter.textContent = `${i + 1}/${totalRotations} rotaciones`;
        
        // REDIBUJAR el árbol con el snapshot después de esta rotación
        const treeData = {
            tree: step.tree_snapshot
        };
        renderTree(treeData);
        
        // Resaltar el nodo que fue rotado
        highlightNodeForRotation(step.node_codigo);
        
        // Crear elemento de mensaje
        const messageEl = createRotationMessage(step, i === totalRotations - 1);
        rotationsList.appendChild(messageEl);
        
        // Scroll automático al último mensaje
        messageEl.scrollIntoView({ behavior: 'smooth' });
        
        // Esperar antes de la siguiente rotación
        if (i < totalRotations - 1) {
            await sleep(REBALANCE_ANIMATION_CONFIG.DELAY_BETWEEN_ROTATIONS);
        }
        
        // Marcar mensaje como hecho
        messageEl.classList.remove('processing');
        messageEl.classList.add('done');
        
        console.log(`✅ Rotación ${i + 1}/${totalRotations}: ${step.type} en nodo ${step.node_codigo}`);
    }
    
    // Mostrar resumen en el panel
    showSummaryInPanel(summary, rotationsList);
    
    // Mantener el panel visible antes de mostrar alerta final
    await sleep(REBALANCE_ANIMATION_CONFIG.PANEL_DISPLAY_TIME_AFTER_COMPLETE);
}

// Animar cada rotación con pausa visual y mensajes
async function animateRotations(rotations, summary) {
    const panel = document.getElementById('rebalance-panel');
    const rotationsList = document.getElementById('rotations-list');
    const progressBar = document.getElementById('progress-bar');
    const rotationCounter = document.getElementById('rotation-counter');
    
    panel.classList.add('active');
    rotationsList.innerHTML = '';
    
    const totalRotations = rotations.length;
    console.log(`🎬 Iniciando animación de ${totalRotations} rotaciones`);
    
    for (let i = 0; i < totalRotations; i++) {
        const rotation = rotations[i];
        const progress = ((i + 1) / totalRotations) * 100;
        
        // Actualizar barra de progreso
        progressBar.style.width = progress + '%';
        rotationCounter.textContent = `${i + 1}/${totalRotations} rotaciones`;
        
        // Crear elemento de mensaje
        const messageEl = createRotationMessage(rotation, i === totalRotations - 1);
        rotationsList.appendChild(messageEl);
        
        // Scroll automático al último mensaje
        messageEl.scrollIntoView({ behavior: 'smooth' });
        
        // Resaltar nodo en el árbol
        highlightNodeForRotation(rotation.node_codigo);
        
        // Esperar antes de la siguiente rotación
        if (i < totalRotations - 1) {
            await sleep(REBALANCE_ANIMATION_CONFIG.DELAY_BETWEEN_ROTATIONS);
        }
        
        // Marcar mensaje como hecho
        messageEl.classList.remove('processing');
        messageEl.classList.add('done');
        
        console.log(`✅ Rotación ${i + 1}/${totalRotations}: ${rotation.type} en nodo ${rotation.node_codigo}`);
    }
    
    // Mostrar resumen en el panel
    showSummaryInPanel(summary, rotationsList);
    
    // Mantener el panel visible antes de mostrar alerta final
    await sleep(REBALANCE_ANIMATION_CONFIG.PANEL_DISPLAY_TIME_AFTER_COMPLETE);
}

// Crear elemento HTML para cada mensaje de rotación
function createRotationMessage(rotation, isLast) {
    const div = document.createElement('div');
    div.className = 'rotation-message processing';
    
    const typeEl = document.createElement('div');
    typeEl.className = 'rotation-type';
    typeEl.textContent = `Rotación ${rotation.type}`;
    
    const nodeEl = document.createElement('div');
    nodeEl.className = 'rotation-node';
    nodeEl.textContent = `Nodo: ${rotation.node_codigo}`;
    
    div.appendChild(typeEl);
    div.appendChild(nodeEl);
    
    return div;
}

// Resaltar el nodo siendo rotado en el árbol
function highlightNodeForRotation(nodoCodigo) {
    const container = document.getElementById('tree-container');
    const svg = container.querySelector('svg');
    
    if (!svg) return;
    
    // Remover resaltado anterior
    svg.querySelectorAll('circle.rotating').forEach(circle => {
        circle.classList.remove('rotating');
    });
    
    // Buscar y resaltar el nodo actual
    // El primer texto de cada grupo es el código del nodo
    const groups = svg.querySelectorAll('g.node');
    let found = false;
    
    groups.forEach(group => {
        const textElements = group.querySelectorAll('text');
        if (textElements.length > 0) {
            const nodeCodeText = textElements[0].textContent?.trim();
            if (nodeCodeText === nodoCodigo.toString()) {
                const circle = group.querySelector('circle');
                if (circle) {
                    circle.classList.add('rotating');
                    found = true;
                    console.log(`📍 Nodo resaltado: ${nodoCodigo}`);
                }
            }
        }
    });
    
    if (!found) {
        console.warn(`⚠️ No se encontró nodo visual para: ${nodoCodigo}`);
    }
}

// Mostrar resumen de rotaciones en el panel
function showSummaryInPanel(summary, container) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'rebalance-summary';
    
    const title = document.createElement('div');
    title.className = 'summary-title';
    title.innerHTML = '<i class="fas fa-check-circle"></i> Resumen de Rotaciones';
    summaryDiv.appendChild(title);
    
    const rotationTypes = ['LL', 'RR', 'LR', 'RL'];
    for (const type of rotationTypes) {
        const count = summary[type] || 0;
        const row = document.createElement('div');
        row.className = 'summary-row';
        
        const label = document.createElement('span');
        label.className = 'summary-label';
        label.textContent = `Rotación ${type}:`;
        
        const countEl = document.createElement('span');
        countEl.className = 'summary-count';
        countEl.textContent = count;
        
        row.appendChild(label);
        row.appendChild(countEl);
        summaryDiv.appendChild(row);
    }
    
    const totalRow = document.createElement('div');
    totalRow.className = 'summary-row';
    totalRow.style.borderTop = '2px solid var(--primary-color)';
    totalRow.style.marginTop = '0.75rem';
    totalRow.style.paddingTop = '0.75rem';
    
    const totalLabel = document.createElement('span');
    totalLabel.className = 'summary-label';
    totalLabel.style.fontWeight = '700';
    totalLabel.style.color = 'var(--primary-dark)';
    totalLabel.textContent = 'Total:';
    
    const totalCount = document.createElement('span');
    totalCount.className = 'summary-count';
    totalCount.style.fontSize = '1.1rem';
    totalCount.style.color = 'var(--success-color)';
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    totalCount.textContent = total;
    
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalCount);
    summaryDiv.appendChild(totalRow);
    
    container.appendChild(summaryDiv);
}

// Mostrar resumen final en un alert o notificación
function showRebalanceSummary(rotations, summary) {
    const LL = summary.LL || 0;
    const RR = summary.RR || 0;
    const LR = summary.LR || 0;
    const RL = summary.RL || 0;
    const total = LL + RR + LR + RL;
    
    const summaryText = `
✅ Rebalanceo Global Completado

Total de Rotaciones: ${total}
├─ Rotación LL: ${LL}
├─ Rotación RR: ${RR}
├─ Rotación LR: ${LR}
└─ Rotación RL: ${RL}

El árbol ha sido rebalanceado exitosamente.
    `.trim();
    
    console.log(summaryText);
    
    // Mostrar alert solo si está configurado
    if (typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' && REBALANCE_ANIMATION_CONFIG.SHOW_FINAL_ALERT) {
        alert(summaryText);
    } else if (typeof REBALANCE_ANIMATION_CONFIG === 'undefined') {
        // Fallback si animation-config no se cargó
        alert(summaryText);
    }
}

// Función auxiliar para sleep/delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
