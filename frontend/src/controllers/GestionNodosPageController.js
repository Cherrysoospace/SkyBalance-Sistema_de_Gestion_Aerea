/**
 * GestionNodosPageController.js
 * Responsabilidad Única: Orquestar toda la página de Gestión de Nodos
 * SOLID Compliance: SRP + DIP - Coordinador central
 *
 * Este es el orquestador que:
 * - Inicializa managers
 * - Configura event listeners
 * - Coordina flujos de negocio
 * - Maneja eventos personalizados
 * - Delega responsabilidades específicas a sus módulos
 */

import { TreeUIRenderer } from '../renderers/TreeUIRenderer.js';
import { DepthLimitManager } from '../pages/gestion-nodos/depth-limit-manager.js';
import { GestionNodosOperations } from '../pages/gestion-nodos/gestion-nodos-operations.js';
import { MetricsManager } from '../managers/MetricsManager.js';
import { StressModeManager } from '../managers/StressModeManager.js';
import { RebalanceAnimationManager } from '../managers/RebalanceAnimationManager.js';
import { VersioningManager } from '../managers/VersioningManager.js';
import { QueueManager } from '../managers/queue/index.js';
import { QueueProcessingAnimationManager } from '../managers/QueueProcessingAnimationManager.js';
import { LeastProfitableNodeManager } from '../managers/LeastProfitableNodeManager.js';

export class GestionNodosPageController {
    /**
     * @param {ApiClient} apiClient - Cliente API inyectado
     * @param {ModalManager} modalManager - Gestor de modales inyectado
     * @param {AVLAuditManager} auditManager - Auditor AVL inyectado
     */
    constructor(apiClient, modalManager, auditManager) {
        this.apiClient = apiClient;
        this.modalManager = modalManager;
        this.auditManager = auditManager;

        // Inicializar componentes de la página
        this.treeRenderer = new TreeUIRenderer('tree-container', 'load-section');
        this.depthLimitManager = new DepthLimitManager(apiClient);
        this.operations = new GestionNodosOperations(apiClient, modalManager, null); // QueueManager se inyecta después

        // Managers especializados
        this.managers = {
            metricsManager: null,
            stressModeManager: null,
            rebalanceManager: null,
            versioningManager: null,
            queueManager: null,
            queueProcessingAnimationManager: null,
            leastProfitableNodeManager: null,
            auditManager: auditManager
        };

        console.log('✅ GestionNodosPageController inicializado');
    }

    /**
     * Inicialización principal de la página
     * Llamar en DOMContentLoaded
     */
    async initialize() {
        console.log('🚀 Inicializando página de Gestión de Nodos...');

        try {
            // 1️⃣ Verificar conectividad con backend
            await this.apiClient.healthCheck();
            console.log('✅ Conexión con backend exitosa');

            // 2️⃣ Inicializar todos los managers
            await this._initializeManagers();

            // 3️⃣ Inyectar queueManager en operations
            this.operations.queueManager = this.managers.queueManager;

            // 4️⃣ Restaurar depth limit desde localStorage
            const savedDepthLimit = this.depthLimitManager.loadFromStorage();
            if (savedDepthLimit) {
                this.depthLimitManager.updateInputUI(savedDepthLimit);
            }

            // 5️⃣ Cargar árbol inicial
            await this.loadTree();

            // 5.1️⃣ Sync stress mode from backend to avoid hidden non-autobalance state
            await this._syncStressModeFromBackend();

            // 6️⃣ Inicializar LeastProfitableNodeManager con árbol actual
            if (this.managers.leastProfitableNodeManager) {
                try {
                    const treeData = await this.apiClient.getTree();
                    await this.managers.leastProfitableNodeManager.initialize(treeData);
                } catch (e) {
                    console.error('❌ Error inicializando LeastProfitableNodeManager:', e);
                }
            }

            // 7️⃣ Configurar event listeners
            this._setupEventListeners();

            // 8️⃣ Escuchar eventos personalizados
            this._setupCustomEventListeners();

            // 9️⃣ Exponer managers globalmente para debugging
            this._exposeManagersForDebugging();

        } catch (error) {
            console.error('❌ Error inicializando página:', error);
            alert('Error: No se puede conectar con el backend en localhost:8000');
        }
    }

    /**
     * Cargar árbol desde la API y renderizar
     */
    async loadTree() {
        try {
            const data = await this.apiClient.getTree();

            if (!data || !data.tree) {
                this.treeRenderer.showLoadingSection();
                return;
            }

            this.treeRenderer.hideLoadingSection();
            this.treeRenderer.render(data, (node) => this._handleNodeSelection(node));
            await this.managers.metricsManager.updateMetricsPanel();

            // Actualizar datos en el LeastProfitableNodeManager
            if (this.managers.leastProfitableNodeManager) {
                this.managers.leastProfitableNodeManager.updateTreeData(data);
            }

            console.log('✅ Árbol cargado y renderizado');

        } catch (error) {
            console.error('❌ Error cargando el árbol:', error);
            this.treeRenderer.showLoadingSection();
        }
    }

    /**
     * INICIALIZACIÓN DE MANAGERS
     * @private
     */
    async _initializeManagers() {
        console.log('📦 Inicializando managers...');

        try {
            this.managers.metricsManager = new MetricsManager(this.apiClient);
            console.log('  ✅ MetricsManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando MetricsManager:', e);
        }

        try {
            this.managers.stressModeManager = new StressModeManager(this.apiClient);
            console.log('  ✅ StressModeManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando StressModeManager:', e);
        }

        try {
            this.managers.rebalanceManager = new RebalanceAnimationManager(this.apiClient);
            this.managers.rebalanceManager.setupCloseButton();
            console.log('  ✅ RebalanceAnimationManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando RebalanceAnimationManager:', e);
        }

        try {
            this.managers.versioningManager = new VersioningManager(this.apiClient);
            console.log('  ✅ VersioningManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando VersioningManager:', e);
        }

        try {
            this.managers.queueManager = new QueueManager(this.apiClient);
            console.log('  ✅ QueueManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando QueueManager:', e);
        }

        try {
            this.managers.queueProcessingAnimationManager = new QueueProcessingAnimationManager(this.apiClient);
            window.queueProcessingAnimationManager = this.managers.queueProcessingAnimationManager;
            console.log('  ✅ QueueProcessingAnimationManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando QueueProcessingAnimationManager:', e);
        }

        try {
            this.managers.leastProfitableNodeManager = new LeastProfitableNodeManager(this.apiClient, {
                button: 'btnEliminarMenorRentabilidad',
                highlightColor: '#ff6b6b',
                highlightStroke: 4
            });
            console.log('  ✅ LeastProfitableNodeManager inicializado');
        } catch (e) {
            console.error('  ❌ Error inicializando LeastProfitableNodeManager:', e);
        }

        console.log('✅ Todos los managers inicializados correctamente');
    }

    /**
     * Read backend metrics and sync stress mode state in UI/manager.
     * @private
     */
    async _syncStressModeFromBackend() {
        try {
            const metrics = await this.apiClient.getMetrics();
            const stressEnabled = Boolean(metrics?.modoEstres);

            if (this.managers.stressModeManager) {
                this.managers.stressModeManager.setState(stressEnabled);
                console.log(`✅ Modo Estrés sincronizado desde backend: ${stressEnabled ? 'ACTIVO' : 'INACTIVO'}`);
            }
        } catch (error) {
            console.error('❌ Error sincronizando Modo Estrés desde backend:', error);
        }
    }

    /**
     * SETUP DE EVENT LISTENERS
     * @private
     */
    _setupEventListeners() {
        // --- BOTONES CRUD ---
        this._setupButton('btnDeshacer', () => this._handleUndo());
        this._setupButton('btnAdicionar', () => this.operations.openAddForm());
        this._setupButton('btnModificar', () => this.operations.openEditForm());
        this._setupButton('btnEliminacion', () => this.operations.openDeleteForm());
        this._setupButton('btnCancelar', () => this._handleCancelFlight());
        this._setupButton('btnExportar', () => this.operations.exportTree());

        // --- BOTONES CONCURRENCIA ---
        this._setupButton('btnProgramarInsercion', () => this.operations.openEnqueueForm());
        this._setupButton('btnProcesarCola', () => this._handleProcessQueue());

        // --- PROFUNDIDAD MÁXIMA ---
        this._setupDepthLimitControls();

        // --- BOTONES ANÁLISIS ---
        this._setupButton('btnModoEstres', () => this._handleToggleStressMode());
        this._setupButton('btnRebalanceo', () => this._handleExecuteRebalance());
        this._setupButton('btnAuditar', () => this._handleExecuteAudit());
        this._setupButton('btnMetricas', () => this._handleOpenMetrics());
        this._setupButton('btnVersionado', () => this._handleOpenVersioning());

        // --- CONFIGURAR MODALES ---
        this.managers.metricsManager.setupEventListeners(() => this.managers.metricsManager.closeMetricsModal());
        this.auditManager.setupEventListeners(() => this.auditManager.closeReport());

        // --- FORMULARIO MODAL ---
        this.modalManager.setSubmitHandler((action, formData) => this._handleFormSubmit(action, formData));

        // --- CARGA DE JSON ---
        this._setupFileLoading();

        console.log('✅ Event listeners configurados');
    }

    /**
     * SETUP DE EVENTOS PERSONALIZADOS
     * @private
     */
    _setupCustomEventListeners() {
        // Evento: Versión restaurada
        document.addEventListener('versionRestored', async (event) => {
            console.log('📢 Evento versionRestored:', event.detail.versionName);
            await this.loadTree();
            await this.managers.metricsManager.updateMetricsPanel();
        });

        // Evento: Nodo eliminado por menor rentabilidad
        document.addEventListener('leastProfitableNodeRemoved', async (event) => {
            console.log('📢 Evento leastProfitableNodeRemoved:', event.detail);
            await this.loadTree();
            await this.managers.metricsManager.updateMetricsPanel();
        });

        console.log('✅ Custom event listeners configurados');
    }

    /**
     * HANDLERS DE EVENTOS
     */

    async _handleUndo() {
        try {
            await this.apiClient.undoLast();
            console.log('✅ Acción deshecha');
            await this.loadTree();
        } catch (error) {
            console.error('❌ Error deshaciendo:', error);
            alert('No hay acciones para deshacer');
        }
    }

    async _handleCancelFlight() {
        const success = await this.operations.cancelFlight();
        if (success) {
            await this.loadTree();
        }
    }

    async _handleFormSubmit(action, formData) {
        try {
            await this.operations.processFormSubmit(action, formData);
            await this.loadTree();
        } catch (error) {
            console.error('❌ Error procesando formulario:', error);
        }
    }

    async _handleProcessQueue() {
        const queueState = this.managers.queueManager.getQueueState();

        if (queueState.count === 0) {
            alert('⚠️ No hay vuelos en la cola');
            return;
        }

        const btnProcesarCola = document.getElementById('btnProcesarCola');
        const originalContent = btnProcesarCola.innerHTML;

        try {
            btnProcesarCola.disabled = true;
            btnProcesarCola.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            console.log('🚀 === INICIANDO PROCESAMIENTO DE COLA PASO A PASO ===');

            const { steps, summary } = await this.managers.queueProcessingAnimationManager.fetchSteps();
            console.log(`✅ Obtenidos ${steps.length} pasos del servidor`);

            await this.managers.queueProcessingAnimationManager.processStepsSequentially(steps, {
                onStarting: async () => {
                    console.log('🎬 Iniciando secuencia de animaciones...');
                },

                onUpdateTree: async (step) => {
                    if (step.tree) {
                        const treeDataForRender = {
                            tree: step.tree,
                            metrics: step.metrics || {}
                        };
                        this.treeRenderer.render(treeDataForRender, (node) => this._handleNodeSelection(node));
                    }
                },

                onAnimateNodeEntry: async (nodeCode, duration) => {
                    await this.managers.queueProcessingAnimationManager.animateNodeEntry(nodeCode, duration);
                },

                onShowRotationBadge: async (rotation, duration) => {
                    await this.managers.queueProcessingAnimationManager.animateRotationBadge(rotation, duration);
                },

                onRemoveFromQueue: async (flightCode, duration) => {
                    await this.managers.queueProcessingAnimationManager.removeFromQueueDisplay(flightCode, duration);
                },

                onUpdateMetrics: async () => {
                    await this.managers.metricsManager.updateMetricsPanel();
                },

                onFinished: async (allSteps) => {
                    console.log('🎉 Todos los pasos procesados correctamente');
                    await this.managers.queueProcessingAnimationManager.showSummary(allSteps, summary);
                    await this.managers.queueManager.clearQueue();
                    await this.loadTree();
                }
            });

            console.log('✅ === PROCESAMIENTO COMPLETADO EXITOSAMENTE ===\n');

        } catch (error) {
            console.error('❌ Error procesando cola:', error);
            alert('❌ Error procesando cola:\n' + (error.response?.data?.detail || error.message));

        } finally {
            btnProcesarCola.disabled = false;
            btnProcesarCola.innerHTML = originalContent;
        }
    }

    async _handleToggleStressMode() {
        try {
            await this.managers.stressModeManager.toggle(async (enabled) => {
                await this.loadTree();
            });
        } catch (error) {
            console.error('❌ Error en Modo Estrés:', error);
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    }

    async _handleExecuteRebalance() {
        try {
            await this.managers.rebalanceManager.execute(
                this.managers.stressModeManager.isEnabled(),
                async () => {
                    await this.loadTree();
                }
            );
        } catch (error) {
            console.error('❌ Error en rebalanceo:', error);
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    }

    async _handleExecuteAudit() {
        try {
            const auditResult = await this.auditManager.executeWithUI(
                this.managers.stressModeManager.isEnabled()
            );
            this.auditManager.showReport(auditResult);
        } catch (error) {
            console.error('❌ Error en auditoría:', error);
            alert('Error en auditoría: ' + error.message);
        }
    }

    async _handleOpenMetrics() {
        try {
            await this.managers.metricsManager.openMetricsModal();
        } catch (error) {
            console.error('❌ Error abriendo modal de métricas:', error);
            alert('Error al cargar métricas: ' + error.message);
        }
    }

    async _handleOpenVersioning() {
        try {
            await this.managers.versioningManager.openVersioningPanel();
        } catch (error) {
            console.error('❌ Error abriendo versionado:', error);
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    }

    _handleNodeSelection(node) {
        this.operations.setSelectedNode(node);
        console.log('📍 Nodo seleccionado en controller:', node.codigo);
    }

    /**
     * SETUP DE CONTROLES
     * @private
     */

    _setupButton(buttonId, handler) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    }

    _setupDepthLimitControls() {
        const btnUpdateDepth = document.getElementById('btn-update-depth');
        const inputDepthLimit = document.getElementById('input-depth-limit');

        if (btnUpdateDepth && inputDepthLimit) {
            btnUpdateDepth.addEventListener('click', async () => {
                const depthValue = parseInt(inputDepthLimit.value);
                if (!this.depthLimitManager.isValid(depthValue)) {
                    alert('❌ Ingresa un número válido mayor o igual a 2');
                    return;
                }

                try {
                    await this.apiClient.setDepthLimit(depthValue);
                    console.log('✅ Profundidad máxima actualizada a:', depthValue);
                    this.depthLimitManager.saveToStorage(depthValue);
                    await this.loadTree();
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
    }

    _setupFileLoading() {
        const filePicker = document.getElementById('file-picker-gestion');
        const btnCargar = document.getElementById('btn-cargar-gestion');

        if (filePicker && btnCargar) {
            filePicker.addEventListener('change', () => {
                btnCargar.disabled = !filePicker.files[0];
            });

            btnCargar.addEventListener('click', async () => {
                const file = filePicker.files[0];
                if (!file) return;

                const depthLimit = await this.depthLimitManager.showModal(file, btnCargar);
                if (depthLimit) {
                    this.depthLimitManager.updateInputUI(depthLimit);
                    await this.loadTree();
                }
            });
        }
    }

    /**
     * DEBUG: Exponer managers globalmente
     * @private
     */
    _exposeManagersForDebugging() {
        window.managers = this.managers;
        console.log('🔍 Managers disponibles en window.managers para debugging');
    }
}
