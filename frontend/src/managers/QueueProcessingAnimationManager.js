/**
 * QueueProcessingAnimationManager - Gestor de animaciones para procesamiento de cola
 * Orquesta la visualización paso a paso de inserciones en árbol AVL con rotaciones
 */

import { QUEUE_ANIMATION_CONFIG } from '../utils/animation-config.js';

export class QueueProcessingAnimationManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.isProcessing = false;
        this.config = QUEUE_ANIMATION_CONFIG;
    }

    // ════════════════════════════════════════════════════════════════
    // API & COMUNICACIÓN
    // ════════════════════════════════════════════════════════════════

    async fetchSteps() {
        try {
            console.log('📡 Obteniendo pasos de procesamiento desde API...');
            const response = await this.apiClient.processQueueWithSteps();
            
            if (!response.result?.steps) {
                throw new Error('Respuesta inválida: no hay steps en la respuesta');
            }

            const { steps, summary = {} } = response.result;
            console.log(`✅ ${steps.length} pasos obtenidos del servidor`);
            
            return { steps, summary };
        } catch (error) {
            console.error('❌ Error al obtener pasos:', error);
            throw error;
        }
    }

    // ════════════════════════════════════════════════════════════════
    // ORQUESTACIÓN PRINCIPAL
    // ════════════════════════════════════════════════════════════════

    async processStepsSequentially(steps, callbacks = {}) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        try {
            if (callbacks.onStarting) await callbacks.onStarting();

            for (let i = 0; i < steps.length; i++) {
                await this._processStep(steps[i], i, steps.length, callbacks);
                if (i < steps.length - 1) {
                    await this._delay(this.config.STEP_DURATION_MS);
                }
            }

            if (callbacks.onFinished) await callbacks.onFinished(steps);
            console.log('✅ Procesamiento de cola completado');
        } catch (error) {
            console.error('❌ Error durante procesamiento:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async _processStep(step, stepIndex, totalSteps, callbacks) {
        try {
            console.log(`\n📍 PASO ${stepIndex + 1}/${totalSteps}: ${step.codigo_insertado}`);

            // 1. Detectar si hay desbalances
            const hasConflicts = step.balance_criticos?.length > 0;

            // 2. Renderizar árbol DESBALANCEADO (PRE-ROTACIÓN) si hay conflictos
            if (hasConflicts && step.tree_pre_rotation && callbacks.onUpdateTree) {
                console.log(`🌳 Renderizando árbol DESBALANCEADO con nuevo nodo...`);
                await callbacks.onUpdateTree({ 
                    tree: step.tree_pre_rotation, 
                    metrics: step.metrics || {} 
                });
                await this._delay(150);
            } else if (!hasConflicts && callbacks.onUpdateTree) {
                // Si no hay conflictos, renderizar el árbol normalmente
                await callbacks.onUpdateTree(step);
                await this._delay(150);
            }

            // 3. Capturar posiciones ANTES de cualquier animación
            const initialPositions = this._captureNodePositions();

            // 4. Animar entrada del nodo
            if (callbacks.onAnimateNodeEntry) {
                console.log(`✨ Animando entrada del nodo...`);
                await callbacks.onAnimateNodeEntry(step.codigo_insertado, this.config.NODE_ENTRY_DURATION_MS);
            }

            // 5. MOSTRAR ALERTA DE DESBALANCE PRIMERO (sobre árbol desbalanceado)
            if (hasConflicts) {
                console.log(`⚠️ MOSTRANDO DESBALANCE: Detectados ${step.balance_criticos.length} conflicto(s)`);
                for (const conflict of step.balance_criticos) {
                    console.log(`   → Nodo ${conflict.codigo_nodo} | Factor: ${conflict.factor_balance}`);
                    await this.animateConflict(
                        conflict.codigo_nodo, 
                        conflict.factor_balance, 
                        conflict.tipo_desbalance
                    );
                }
                console.log(`✅ Alerta de desbalance completada - Factor de balance WAS VISIBLE`);
            }

            // 6. SOLO DESPUÉS de mostrar la alerta, renderizar árbol POST-ROTACIÓN
            if (hasConflicts && step.tree_post_rotation && callbacks.onUpdateTree) {
                console.log(`🔄 Actualizando a árbol REBALANCEADO...`);
                await callbacks.onUpdateTree({ 
                    tree: step.tree_post_rotation, 
                    metrics: step.metrics || {} 
                });
                await this._delay(150);
            }

            // 7. Animar rotaciones (FLIP)
            if (step.rotaciones?.length > 0) {
                console.log(`🔄 ${step.rotaciones.length} rotación(es) a animar`);
                for (const rotation of step.rotaciones) {
                    if (initialPositions.size > 0) {
                        console.log(`   → Animando FLIP para rotación ${rotation.tipo}`);
                        await this._animateRotationFLIP(initialPositions, this.config.ROTATION_ANIMATION_DURATION_MS);
                    }
                    if (callbacks.onShowRotationBadge) {
                        await callbacks.onShowRotationBadge(rotation, this.config.ROTATION_BADGE_DURATION_MS);
                    }
                }
            }

            // 5. Limpiar: remover de cola y actualizar métricas
            if (callbacks.onRemoveFromQueue) {
                await callbacks.onRemoveFromQueue(step.codigo_insertado, this.config.QUEUE_ITEM_REMOVAL_DURATION_MS);
            }
            if (callbacks.onUpdateMetrics) {
                await callbacks.onUpdateMetrics();
            }

            console.log(`✅ PASO ${stepIndex + 1} completado`);
        } catch (error) {
            console.error(`❌ Error en PASO ${stepIndex + 1}:`, error);
            throw error;
        }
    }

    // ════════════════════════════════════════════════════════════════
    // ANIMACIONES DE NODOS
    // ════════════════════════════════════════════════════════════════

    async animateNodeEntry(nodeCode, duration = this.config.NODE_ENTRY_DURATION_MS) {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const svgContainer = document.getElementById('tree-container');
                    if (!svgContainer) return resolve();

                    const allTexts = svgContainer.querySelectorAll('text');
                    let targetCircle = null;

                    // Buscar elemento por código exacto
                    for (let textEl of allTexts) {
                        if (textEl.textContent.trim() === nodeCode.trim()) {
                            const parent = textEl.closest('g');
                            if (parent) {
                                targetCircle = parent.querySelector('circle');
                                if (targetCircle) break;
                            }
                        }
                    }

                    if (targetCircle) {
                        targetCircle.style.animation = `nodeEntryAnimation ${duration}ms ease-out`;
                        setTimeout(resolve, duration);
                    } else {
                        console.warn(`⚠️ Nodo ${nodeCode} no encontrado en SVG`);
                        resolve();
                    }
                } catch (error) {
                    console.error('❌ Error en animateNodeEntry:', error);
                    resolve();
                }
            }, this.config.ANIMATION_DELAY_MS);
        });
    }

    async animateRotationBadge(rotation, duration = this.config.ROTATION_BADGE_DURATION_MS) {
        return new Promise((resolve) => {
            const badge = document.createElement('div');
            badge.className = 'rotation-badge-floating';
            badge.textContent = { 'LL': '↙️ LL', 'RR': '↗️ RR', 'LR': '⬆️ LR', 'RL': '⬆️ RL' }[rotation.tipo] || `Rotación ${rotation.tipo}`;
            badge.setAttribute('data-rotation-type', rotation.tipo);
            
            const container = document.getElementById('tree-container');
            if (!container) return resolve();

            container.appendChild(badge);
            setTimeout(() => badge.style.animation = `rotateBadgeIn ${this.config.ROTATION_BADGE_ENTER_DURATION}ms ease-out`, 10);
            setTimeout(() => {
                badge.style.animation = `rotateBadgeOut ${this.config.ROTATION_BADGE_EXIT_DURATION}ms ease-in forwards`;
                setTimeout(() => { badge.remove(); resolve(); }, this.config.ROTATION_BADGE_EXIT_DURATION);
            }, duration - this.config.ROTATION_BADGE_EXIT_DURATION);
        });
    }

    async animateConflict(nodeCode, balanceFactor, tipoDesbalance = '') {
        return new Promise((resolve) => {
            try {
                const svgContainer = document.getElementById('tree-container');
                if (!svgContainer) return resolve();

                const svgElement = svgContainer.querySelector('svg');
                if (!svgElement) return resolve();

                const nodeElement = svgElement.querySelector(`g[data-node-code="${nodeCode.trim()}"]`);
                if (!nodeElement) {
                    console.warn(`⚠️ Nodo ${nodeCode} no encontrado`);
                    return resolve();
                }

                // Mostrar alerta visual
                nodeElement.classList.add('conflict-node-alert');
                
                const tooltip = document.createElement('div');
                tooltip.className = 'conflict-node-tooltip';
                const balanceSign = balanceFactor > 0 ? '+' : '';
                const balanceColor = balanceFactor > 0 ? '#ff6b6b' : '#4ecdc4';
                
                tooltip.innerHTML = `<div class="tooltip-content"><div class="tooltip-label">FACTOR DE BALANCE</div><div class="tooltip-value" style="color: ${balanceColor}; font-size: 24px; font-weight: bold;">${balanceSign}${balanceFactor}</div><div class="tooltip-type">${tipoDesbalance}</div><div class="tooltip-icon">⚠️</div></div>`;
                document.body.appendChild(tooltip);

                const nodeRect = nodeElement.getBoundingClientRect();
                tooltip.style.cssText = `position:fixed;left:${nodeRect.left + nodeRect.width / 2 - 70}px;top:${nodeRect.top - 100}px;`;

                const alertDuration = this.config.CONFLICT_ALERT_VISIBLE_MIN_DURATION || 1000;
                const exitDuration = this.config.CONFLICT_TOOLTIP_EXIT_DURATION || 300;
                const rotationDelay = this.config.CONFLICT_TO_ROTATION_DELAY || 300;
                const resolveDuration = this.config.CONFLICT_RESOLUTION_DURATION || 500;
                const totalTime = alertDuration + exitDuration + rotationDelay + resolveDuration;

                requestAnimationFrame(() => tooltip.classList.add('tooltip-visible'));
                
                setTimeout(() => { tooltip.classList.add('tooltip-hidden'); }, alertDuration);
                setTimeout(() => { tooltip.remove(); }, alertDuration + exitDuration);
                setTimeout(() => { 
                    nodeElement.classList.remove('conflict-node-alert');
                    nodeElement.classList.add('conflict-node-resolved');
                }, alertDuration + exitDuration + rotationDelay);
                setTimeout(() => {
                    nodeElement.classList.remove('conflict-node-resolved');
                    resolve();
                }, totalTime);
            } catch (error) {
                console.error('❌ Error en animateConflict:', error);
                resolve();
            }
        });
    }

    // ════════════════════════════════════════════════════════════════
    // UI & METRICAS
    // ════════════════════════════════════════════════════════════════

    async removeFromQueueDisplay(flightCode, duration = this.config.QUEUE_ITEM_REMOVAL_DURATION_MS) {
        return new Promise((resolve) => {
            try {
                const queueContainer = document.getElementById('queue-list-container');
                if (!queueContainer) return resolve();

                const items = queueContainer.querySelectorAll('.queue-item');
                let targetItem = null;

                for (let item of items) {
                    const codeSpan = item.querySelector('.queue-codigo');
                    if (codeSpan?.textContent.trim() === flightCode.trim()) {
                        targetItem = item;
                        break;
                    }
                }

                if (targetItem) {
                    targetItem.style.animation = `queueItemRemoval ${duration}ms ease-in forwards`;
                    setTimeout(() => {
                        targetItem.remove();
                        const counter = document.getElementById('queue-count');
                        if (counter) counter.textContent = Math.max(0, parseInt(counter.textContent) - 1);
                        if (queueContainer.querySelectorAll('.queue-item').length === 0) {
                            queueContainer.innerHTML = '<div class="queue-empty">🎉 Cola vacía</div>';
                        }
                        resolve();
                    }, duration);
                } else {
                    resolve();
                }
            } catch (error) {
                console.error('Error removiendo de cola:', error);
                resolve();
            }
        });
    }

    async showSummary(steps, summary = {}) {
        return new Promise((resolve) => {
            const totalFlights = steps.length;
            const totalRotations = summary.total_rotations || 0;
            const totalConflicts = steps.reduce((acc, s) => acc + (s.balance_criticos?.length || 0), 0);

            const summaryHtml = `
                <div class="queue-processing-summary">
                    <div class="summary-header"><h3>✅ Procesamiento Completado</h3></div>
                    <div class="summary-stats">
                        <div class="stat-item"><div class="stat-content"><div class="stat-label">Vuelos</div><div class="stat-value">${totalFlights}</div></div></div>
                        <div class="stat-item"><div class="stat-content"><div class="stat-label">Rotaciones</div><div class="stat-value">${totalRotations}</div></div></div>
                        <div class="stat-item"><div class="stat-content"><div class="stat-label">Conflictos</div><div class="stat-value">${totalConflicts}</div></div></div>
                    </div>
                    <button class="btn-summary-close">✕ Cerrar</button>
                </div>
            `;

            let summaryContainer = document.getElementById('queue-summary-container');
            if (!summaryContainer) {
                summaryContainer = document.createElement('div');
                summaryContainer.id = 'queue-summary-container';
                document.body.appendChild(summaryContainer);
            }

            summaryContainer.innerHTML = summaryHtml;
            summaryContainer.style.animation = `summarySlidIn ${this.config.SUMMARY_ANIMATION_DURATION}ms ease-out`;
            summaryContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-summary-close')) {
                    summaryContainer.style.animation = `summarySlideOut ${this.config.SUMMARY_ANIMATION_DURATION}ms ease-in forwards`;
                    setTimeout(() => resolve(), this.config.SUMMARY_ANIMATION_DURATION);
                }
            });
            setTimeout(() => summaryContainer.querySelector('.btn-summary-close')?.click(), 10000);
        });
    }

    // ════════════════════════════════════════════════════════════════
    // ROTACIONES Y UTILIDADES
    // ════════════════════════════════════════════════════════════════

    _captureNodePositions() {
        const positions = new Map();
        const nodeElements = document.querySelectorAll('#tree-container g[data-node-code]');
        const containerRect = document.querySelector('#tree-container')?.getBoundingClientRect();
        
        if (!containerRect) return positions;

        nodeElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const code = element.getAttribute('data-node-code');
            positions.set(code, {
                centerX: rect.x - containerRect.x + rect.width / 2,
                centerY: rect.y - containerRect.y + rect.height / 2
            });
        });
        return positions;
    }

    async _animateRotationFLIP(initialPositions, duration = this.config.ROTATION_ANIMATION_DURATION_MS) {
        return new Promise((resolve) => {
            try {
                if (initialPositions.size === 0) return resolve();

                const nodeElements = document.querySelectorAll('#tree-container g[data-node-code]');
                const containerRect = document.querySelector('#tree-container')?.getBoundingClientRect();
                if (!containerRect) return resolve();

                const animations = [];
                const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

                nodeElements.forEach(element => {
                    const rect = element.getBoundingClientRect();
                    const code = element.getAttribute('data-node-code');
                    const centerX = rect.x - containerRect.x + rect.width / 2;
                    const centerY = rect.y - containerRect.y + rect.height / 2;
                    
                    const initialPos = initialPositions.get(code);
                    if (initialPos) {
                        const deltaX = initialPos.centerX - centerX;
                        const deltaY = initialPos.centerY - centerY;

                        element.style.transition = 'none';
                        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                        animations.push({
                            element,
                            initialDeltaX: deltaX,
                            initialDeltaY: deltaY
                        });
                    }
                });

                const startTime = performance.now();
                const animateFrame = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = easeInOutCubic(progress);

                    animations.forEach(anim => {
                        anim.element.style.transform = `translate(${anim.initialDeltaX * (1 - eased)}px, ${anim.initialDeltaY * (1 - eased)}px)`;
                    });

                    if (progress < 1) {
                        requestAnimationFrame(animateFrame);
                    } else {
                        animations.forEach(anim => { anim.element.style.transform = 'none'; });
                        resolve();
                    }
                };

                requestAnimationFrame(animateFrame);
            } catch (error) {
                console.error('❌ ERROR en _animateRotationFLIP:', error);
                resolve();
            }
        });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
