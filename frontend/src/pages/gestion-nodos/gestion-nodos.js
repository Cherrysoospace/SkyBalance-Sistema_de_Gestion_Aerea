/* ============================================
   GESTION NODOS PAGE SCRIPT
   Refactorizado para cumplir con principios SOLID
   ============================================ */

// ========================================
// IMPORTS (Module System)
// ========================================
import { apiClient } from '../../api/apiClient.js';
import { modalManager } from '../../components/modalManager.js';
import { MetricsManager } from '../../utils/MetricsManager.js';
import { StressModeManager } from '../../utils/StressModeManager.js';
import { RebalanceAnimationManager } from '../../utils/RebalanceAnimationManager.js';
import { VersioningManager } from '../../utils/VersioningManager.js';
import { QueueManager } from '../../utils/QueueManager.js';
import { QueueProcessingAnimationManager } from '../../utils/QueueProcessingAnimationManager.js';
import { LeastProfitableNodeManager } from '../../utils/LeastProfitableNodeManager.js';
import { initializeAuditManager } from '../../utils/avl-audit-manager.js';

// D3 es cargado desde CDN en el HTML (disponible como global)

// ========================================
// ESTADO ENCAPSULADO (SRP)
// ========================================
let selectedNode = null;

// ========================================
// MANAGERS INYECTADOS (DIP)
// ========================================
let metricsManager = null;
let stressModeManager = null;
let rebalanceManager = null;
let versioningManager = null;
let queueManager = null;
let queueProcessingAnimationManager = null;
let leastProfitableNodeManager = null;
let auditManager = null; // Será inicializado con initializeAuditManager()

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Gestión de Nodos con arquitectura SOLID...');

    // Verificar conectividad con backend
    try {
        await apiClient.healthCheck();
        console.log('✅ Conexión con backend exitosa');
    } catch (error) {
        console.error('❌ No se puede conectar con el backend:', error);
        alert('Error: No se puede conectar con el backend en localhost:8000');
        return;
    }

    // ========================================
    // INICIALIZAR AUDIT MANAGER LEGACY (requerido para AuditAVLManager)
    // ========================================
    auditManager = initializeAuditManager(apiClient);

    // ========================================
    // INICIALIZAR MANAGERS (DIP - Inyección)
    // ========================================
    initializeManagers();

    // ✅ RESTAURAR depthLimit desde localStorage MÁS TEMPRANO
    const savedDepthLimit = localStorage.getItem('currentDepthLimit');
    if (savedDepthLimit) {
        const inputDepthLimit = document.getElementById('input-depth-limit');
        if (inputDepthLimit) {
            inputDepthLimit.value = savedDepthLimit;
            console.log('✅ depthLimit restaurado desde localStorage:', savedDepthLimit);
        }
    }

    // Cargar el árbol inicial
    await loadTree();

    // ✅ VERIFICAR que el valor se mantuvo después de loadTree()
    const finalValue = document.getElementById('input-depth-limit')?.value;
    console.log('📍 Valor del input después de loadTree():', finalValue);

    // ========================================
    // INICIALIZAR LEAST PROFITABLE NODE MANAGER (después de cargar árbol)
    // ========================================
    if (leastProfitableNodeManager) {
        try {
            const treeData = await apiClient.getTree();
            await leastProfitableNodeManager.initialize(treeData);
        } catch (e) {
            console.error('❌ Error inicializando LeastProfitableNodeManager en DOMContentLoaded:', e);
        }
    }

    // ========================================
    // EVENT LISTENERS - Operaciones CRUD
    // ========================================
    document.getElementById('btnDeshacer').addEventListener('click', undoAction);
    document.getElementById('btnAdicionar').addEventListener('click', () => abrirFormularioAdicionar());
    document.getElementById('btnModificar').addEventListener('click', () => abrirFormularioModificar());
    document.getElementById('btnEliminacion').addEventListener('click', () => abrirFormularioEliminar());
    document.getElementById('btnCancelar').addEventListener('click', cancelarVuelo);
    document.getElementById('btnExportar').addEventListener('click', exportTree);

    // ========================================
    // EVENT LISTENERS - Simulación de Concurrencia
    // ========================================
    document.getElementById('btnProgramarInsercion').addEventListener('click', () => abrirFormularioProgramarInsercion());
    document.getElementById('btnProcesarCola').addEventListener('click', () => procesarColaPasoAPaso());

    // ========================================
    // EVENT LISTENERS - Profundidad Máxima
    // ========================================
    const btnUpdateDepth = document.getElementById('btn-update-depth');
    const inputDepthLimit = document.getElementById('input-depth-limit');

    if (btnUpdateDepth && inputDepthLimit) {
        btnUpdateDepth.addEventListener('click', async () => {
            const depthValue = parseInt(inputDepthLimit.value);
            if (isNaN(depthValue) || depthValue < 2) {
                alert('❌ Ingresa un número válido mayor o igual a 2');
                return;
            }

            try {
                const response = await apiClient.setDepthLimit(depthValue);
                console.log('✅ Profundidad máxima actualizada a:', depthValue);
                await loadTree(); // Recargar árbol con nueva profundidad
            } catch (e) {
                console.error('❌ Error actualizando profundidad:', e);
                alert('❌ Error: ' + e.message);
            }
        });

        // Permitir Enter para actualizar
        inputDepthLimit.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnUpdateDepth.click();
        });
    }

    // ========================================
    // EVENT LISTENERS - Modo Estrés & Análisis
    // ========================================
    document.getElementById('btnModoEstres').addEventListener('click', onToggleStressMode);
    document.getElementById('btnRebalanceo').addEventListener('click', onExecuteRebalance);
    document.getElementById('btnAuditar').addEventListener('click', onExecuteAudit);
    document.getElementById('btnMetricas').addEventListener('click', onOpenMetrics);
    document.getElementById('btnVersionado').addEventListener('click', onOpenVersioning);

    // ========================================
    // CONFIGURAR MODALES (DIP)
    // ========================================
    metricsManager.setupEventListeners(() => metricsManager.closeMetricsModal());
    auditManager.setupEventListeners(() => auditManager.closeReport());

    // Configurar handler de submit del modal
    modalManager.setSubmitHandler(procesarFormulario);

    // ========================================
    // ESCUCHAR EVENTOS DE VERSIONADO
    // ========================================
    document.addEventListener('versionRestored', async (event) => {
        console.log('📢 Evento versionRestored recibido:', event.detail.versionName);
        await loadTree();
        await metricsManager.updateMetricsPanel();
    });

    // ========================================
    // ESCUCHAR EVENTOS DE ELIMINACIÓN POR MENOR RENTABILIDAD
    // ========================================
    document.addEventListener('leastProfitableNodeRemoved', async (event) => {
        console.log('📢 Evento leastProfitableNodeRemoved recibido:', event.detail);
        console.log(`   ✅ Nodo ${event.detail.codigo} eliminado`);
        console.log(`   📊 Total removidos: ${event.detail.removed}`);
        
        // Actualizar árbol y métricas
        await loadTree();
        await metricsManager.updateMetricsPanel();
    });

    // ========================================
    // CARGA DE JSON DESDE ESTA PÁGINA
    // ========================================
    const filePicker = document.getElementById('file-picker-gestion');
    const btnCargar = document.getElementById('btn-cargar-gestion');

    if (filePicker && btnCargar) {
        filePicker.addEventListener('change', () => {
            btnCargar.disabled = !filePicker.files[0];
        });
        btnCargar.addEventListener('click', async () => {
            const file = filePicker.files[0];
            if (!file) return;
            await mostrarModalDepthLimit(file, btnCargar);
        });
    }
});

// ========================================
// INICIALIZACIÓN DE MANAGERS (SRP)
// ========================================

/**
 * Muestra un modal pidiendo la profundidad máxima del árbol
 * Obligatorio antes de cargar cualquier archivo
 */
async function mostrarModalDepthLimit(file, btnCargar) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h2>⚖️ Profundidad Máxima del Árbol</h2>
                <p>Ingresa la profundidad máxima permitida para el árbol. Este parámetro se usa para calcular el precio final de los vuelos.</p>
                <div class="form-group">
                    <label for="depth-input">Profundidad máxima (mínimo 2):</label>
                    <input type="number" id="depth-input" min="2" placeholder="Ej: 5, 10, 15" required>
                </div>
                <div class="form-buttons" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn-cancel" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn-submit">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const depthInput = modal.querySelector('#depth-input');
        const submitBtn = modal.querySelector('.btn-submit');
        const cancelBtn = modal.querySelector('.btn-cancel');

        // Enfocar en el input automáticamente
        depthInput.focus();
        
        // 📝 LOG PARA DEBUG
        console.log('📍 Modal abierto, input vacío listo para entrada');

        submitBtn.addEventListener('click', async () => {
            const inputValue = depthInput.value.trim();
            console.log('📍 Valor capturado del input:', inputValue);
            
            const depthLimit = parseInt(inputValue);
            console.log('📍 depthLimit parseado:', depthLimit);

            if (isNaN(depthLimit) || depthLimit < 2) {
                alert('❌ Ingresa un número válido mayor o igual a 2');
                console.warn('⚠️ Validación fallida:', { inputValue, depthLimit, isNaN: isNaN(depthLimit) });
                return;
            }

            modal.remove();
            btnCargar.disabled = true;
            btnCargar.textContent = 'Cargando...';

            // ✅ ACTUALIZAR EL INPUT INMEDIATAMENTE (antes de cualquier async)
            const inputDepthLimit = document.getElementById('input-depth-limit');
            if (inputDepthLimit) {
                inputDepthLimit.value = depthLimit;
                console.log('✅ INPUT ACTUALIZADO INMEDIATAMENTE A:', depthLimit);
                console.log('📍 Verificación del DOM:', document.getElementById('input-depth-limit').value);
            } else {
                console.error('❌ NO ENCONTRÉ EL ELEMENTO input-depth-limit en el DOM');
            }

            try {
                // Cargar el archivo con la API
                const response = await apiClient.loadTreeFromJSON(file, depthLimit);
                console.log('✅ JSON cargado. depthLimit retornado:', response?.depthLimit);
                
                // Recargar el árbol en la pantalla
                await loadTree();
                
                // ✅ VERIFICAR que el valor sigue siendo el correcto después de loadTree()
                const finalInputValue = document.getElementById('input-depth-limit')?.value;
                console.log('📍 Valor del input DESPUÉS de loadTree():', finalInputValue);
            } catch (e) {
                console.error('❌ Error cargando JSON:', e);
                alert('❌ Error al cargar el archivo: ' + e.message);
            } finally {
                btnCargar.disabled = false;
                btnCargar.textContent = 'Cargar';
            }

            resolve();
        });

        cancelBtn.addEventListener('click', () => resolve());

        // Permitir Enter para confirmar
        depthInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitBtn.click();
        });
    });
}

/**
 * Inicializa todos los managers con inyección de dependencias
 * Cumple con DIP - todos dependen de abstracciones (apiClient)
 */
function initializeManagers() {
    console.log('📦 Inicializando managers...');

    try {
        metricsManager = new MetricsManager(apiClient);
        console.log('  ✅ MetricsManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando MetricsManager:', e);
    }

    try {
        stressModeManager = new StressModeManager(apiClient);
        console.log('  ✅ StressModeManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando StressModeManager:', e);
    }

    try {
        rebalanceManager = new RebalanceAnimationManager(apiClient);
        rebalanceManager.setupCloseButton();
        console.log('  ✅ RebalanceAnimationManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando RebalanceAnimationManager:', e);
    }

    try {
        versioningManager = new VersioningManager(apiClient);
        console.log('  ✅ VersioningManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando VersioningManager:', e);
    }

    try {
        queueManager = new QueueManager(apiClient);
        console.log('  ✅ QueueManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando QueueManager:', e);
    }

    try {
        queueProcessingAnimationManager = new QueueProcessingAnimationManager(apiClient);
        window.queueProcessingAnimationManager = queueProcessingAnimationManager; // Exponer globalmente para debugging
        console.log('  ✅ QueueProcessingAnimationManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando QueueProcessingAnimationManager:', e);
    }

    try {
        leastProfitableNodeManager = new LeastProfitableNodeManager(apiClient, {
            button: 'btnEliminarMenorRentabilidad',
            highlightColor: '#ff6b6b',
            highlightStroke: 4
        });
        console.log('  ✅ LeastProfitableNodeManager inicializado');
    } catch (e) {
        console.error('  ❌ Error inicializando LeastProfitableNodeManager:', e);
    }

    // Nota: auditManager (AVLAuditManager) ya está inicializado globalmente
    if (!auditManager) {
        console.error('  ❌ auditManager no está inicializado');
    } else {
        console.log('  ✅ auditManager disponible');
    }

    console.log('✅ Todos los managers inicializados correctamente');
    
    // Exponer managers globalmente para debugging en console
    window.managers = {
        metricsManager,
        stressModeManager,
        rebalanceManager,
        versioningManager,
        queueManager,
        queueProcessingAnimationManager,
        leastProfitableNodeManager,
        auditManager
    };
    console.log('🔍 Managers disponibles en window.managers para debugging');
}

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
        } else if (action === 'enqueue') {
            // Simulación de Concurrencia: Encolar vuelo
            await queueManager.enqueueInsertion(payload);
            console.log('✅ Vuelo programado en cola:', payload.codigo);
            // Actualizar list de vuelos en cola
            await queueManager.updateQueueDisplay();
            // Habilitar botón de procesamiento
            const btnProcesar = document.getElementById('btnProcesarCola');
            if (btnProcesar) {
                btnProcesar.disabled = false;
            }
            modalManager.close();
            return;
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
        await metricsManager.updateMetricsPanel();
        
        // Actualizar datos en el LeastProfitableNodeManager
        if (leastProfitableNodeManager) {
            leastProfitableNodeManager.updateTreeData(data);
        }
        
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

    console.log('\n🌳 === RENDER TREE DEBUG ===');
    console.log('📊 treeData recibido:', treeData);
    console.log('📊 treeData.tree:', treeData.tree);
    console.log('📊 Campos del nodo raíz:', Object.keys(treeData.tree));

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
        .attr('data-node-code', d => d.data.codigo)  // ✨ Agregar identificador para animaciones FLIP
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

    // DEBUG: Verificar qué se renderizó
    const renderedTexts = container.querySelectorAll('text');
    const renderedCodes = Array.from(renderedTexts)
        .map(t => t.textContent.trim())
        .filter(t => t && !t.startsWith('$') && t.length < 20);
    console.log(`✅ RENDERIZADO: ${renderedCodes.length} códigos: [${renderedCodes.join(', ')}]`);
    console.log('🌳 === FIN RENDER TREE ===\n');
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

// ========================================
// MÉTRICAS (Delegado a MetricsManager)
// ========================================

/**
 * Handler para abrir modal de métricas
 * DIP: Solo orquesta, la lógica está en MetricsManager
 */
async function onOpenMetrics() {
    try {
        await metricsManager.openMetricsModal();
    } catch (error) {
        console.error('❌ Error abriendo modal de métricas:', error);
        alert('Error al cargar métricas: ' + error.message);
    }
}

/* ============================================
   MODO ESTRÉS Y REBALANCEO (Delegado a Managers)
   ============================================ */

/**
 * Handler para toggle de Modo Estrés
 * DIP: StressModeManager maneja la lógica y estado
 */
async function onToggleStressMode() {
    try {
        await stressModeManager.toggle(async (enabled) => {
            // Callback: recargar árbol cuando cambia el estado
            await loadTree();
        });
    } catch (error) {
        console.error('❌ Error en Modo Estrés:', error);
        alert('Error: ' + (error.response?.data?.detail || error.message));
    }
}

/**
 * Handler para ejecutar rebalanceo global
 * DIP: RebalanceAnimationManager maneja toda la animación
 */
async function onExecuteRebalance() {
    try {
        await rebalanceManager.execute(
            stressModeManager.isEnabled(),
            async () => {
                // Callback: recargar árbol cuando completa
                await loadTree();
            }
        );
    } catch (error) {
        console.error('❌ Error en rebalanceo:', error);
        alert('Error: ' + (error.response?.data?.detail || error.message));
    }
}

/* ============================================
   AUDITORÍA AVL (Delegado a AVLAuditManager)
   ============================================ */

/**
 * Handler para ejecutar auditoría AVL
 * DIP: AVLAuditManager maneja toda la lógica
 */
async function onExecuteAudit() {
    try {
        const auditResult = await auditManager.executeWithUI(
            stressModeManager.isEnabled()
        );
        
        // Mostrar reporte en modal
        auditManager.showReport(auditResult);

    } catch (error) {
        console.error('❌ Error en auditoría:', error);
        alert('Error en auditoría: ' + error.message);
    }
}

/* ============================================
   VERSIONADO PERSISTENTE
   ============================================ */

/**
 * Handler para abrir el panel de versionado
 * DIP: VersioningManager maneja toda la lógica
 */
async function onOpenVersioning() {
    try {
        await versioningManager.openVersioningPanel();
    } catch (error) {
        console.error('❌ Error abriendo versionado:', error);
        alert('Error: ' + (error.response?.data?.detail || error.message));
    }
}

/* ============================================
   SIMULACIÓN DE CONCURRENCIA - COLA DE INSERCIONES
   ============================================ */

/**
 * Abrir formulario para programar una inserción en la cola
 */
function abrirFormularioProgramarInsercion() {
    modalManager.open('enqueue', 'Programar Inserción de Vuelo', {
        visibleFields: ['field-codigo', 'field-origen', 'field-destino', 'field-horaSalida',
                       'field-pasajeros', 'field-precioBase', 'field-promocion',
                       'field-prioridad', 'field-alerta']
    });
}

/**
 * Procesar cola paso a paso con animación
 */
async function procesarColaPasoAPaso() {
    const queueState = queueManager.getQueueState();
    
    if (queueState.count === 0) {
        alert('⚠️ No hay vuelos en la cola');
        return;
    }

    const btnProcesarCola = document.getElementById('btnProcesarCola');
    let originalContent = ''; // Declarar fuera del try para que sea accesible en finally
    
    try {
        // 1️⃣ DESABILITAR BOTÓN Y MOSTRAR ESTADO DE CARGA
        btnProcesarCola.disabled = true;
        originalContent = btnProcesarCola.innerHTML;
        btnProcesarCola.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        console.log('🚀 === INICIANDO PROCESAMIENTO DE COLA PASO A PASO ===');
        console.log(`📋 Cola con ${queueState.count} vuelos pendientes`);
        
        // 2️⃣ OBTENER TODOS LOS PASOS DESDE EL BACKEND (UNA SOLA LLAMADA)
        console.log('📡 Obteniendo pasos desde el backend...');
        const { steps, summary } = await queueProcessingAnimationManager.fetchSteps();
        console.log(`✅ Obtenidos ${steps.length} pasos del servidor`);
        
        // 3️⃣ PROCESAR PASOS SECUENCIALMENTE CON ANIMACIONES
        await queueProcessingAnimationManager.processStepsSequentially(steps, {
            // Callback inicial
            onStarting: async () => {
                console.log('🎬 Iniciando secuencia de animaciones...');
            },
            
            // Callback para actualizar árbol
            onUpdateTree: async (step) => {
                console.log(`🌳 Renderizando árbol con inserción de ${step.codigo_insertado}`);
                if (step.tree) {
                    console.log(`   📊 step.tree existe. Estructura:`, step.tree);
                    console.log(`   📊 step.tree.tree existe:`, !!step.tree.tree);
                    
                    // El backend devuelve step.tree como el nodo raíz directo
                    // Pero renderTree() espera {tree: ..., metrics: ...}
                    // Entonces envolverlo en la estructura correcta
                    const treeDataForRender = {
                        tree: step.tree,
                        metrics: step.metrics || {}
                    };
                    console.log(`   ✅ Envolviendo en estructura correcta para renderTree`);
                    renderTree(treeDataForRender);
                } else {
                    console.error(`   ❌ step.tree NO EXISTE!`);
                }
            },
            
            // Callback para animar entrada de nodo
            onAnimateNodeEntry: async (nodeCode, duration) => {
                await queueProcessingAnimationManager.animateNodeEntry(nodeCode, duration);
            },
            
            // Callback para mostrar rotación
            onShowRotationBadge: async (rotation, duration) => {
                await queueProcessingAnimationManager.animateRotationBadge(rotation, duration);
            },
            
            // Callback para remover de cola
            onRemoveFromQueue: async (flightCode, duration) => {
                await queueProcessingAnimationManager.removeFromQueueDisplay(flightCode, duration);
            },
            
            // Callback para actualizar métricas
            onUpdateMetrics: async () => {
                if (metricsManager) {
                    await metricsManager.updateMetricsPanel();
                }
            },
            
            // Callback final
            onFinished: async (allSteps) => {
                console.log('🎉 Todos los pasos procesados correctamente');
                
                // Mostrar resumen final con animación
                await queueProcessingAnimationManager.showSummary(allSteps, summary);
                
                // Limpiar cola del backend
                await queueManager.clearQueue();
                
                // Recargar árbol final
                await loadTree();
            }
        });
        
        console.log('✅ === PROCESAMIENTO COMPLETADO EXITOSAMENTE ===\n');
        
    } catch (error) {
        console.error('❌ Error procesando cola:', error);
        alert('❌ Error procesando cola:\n' + (error.response?.data?.detail || error.message));
        
    } finally {
        // 4️⃣ REHABILITAR BOTÓN
        btnProcesarCola.disabled = false;
        btnProcesarCola.innerHTML = originalContent;
        console.log('✅ Botón Procesar Cola rehabilitado');
    }
}

/**
 * NOTA: Las funciones showProcessingIndicator() y showConflictsPanel()
 * se han reemplazado por funciones más sofisticadas en QueueProcessingAnimationManager:
 * - animateConflict(): Muestra alerta de conflicto con animación
 * - processStepsSequentially(): Orquesta toda la animación
 * 
 * El QueueProcessingAnimationManager mantiene la responsabilidad única
 * de gestionar animaciones durante el procesamiento de cola (SOLID SRP).
 */

