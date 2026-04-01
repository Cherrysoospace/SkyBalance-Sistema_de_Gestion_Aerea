/**
 * QueueProcessingAnimationManager.js
 * 
 * Gestor especializado para animaciones fluidas durante el procesamiento
 * paso a paso de la cola de inserciones.
 * 
 * ARQUITECTURA SOLID:
 * S: Cada responsabilidad en su propia función (fetchSteps, animateStep, etc.)
 * O: Extensible sin modificar renderTree existente
 * L: Funciones intercambiables sin romper el flujo
 * I: No fuerza dependencias innecesarias
 * D: Depende de abstracciones (callbacks), no de implementaciones
 * 
 * CONFIGURACIÓN:
 * Todas las duraciones y parámetros de animación vienen de QUEUE_ANIMATION_CONFIG
 */

import { QUEUE_ANIMATION_CONFIG } from './animation-config.js';

export class QueueProcessingAnimationManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.isProcessing = false;
        this.currentStepIndex = 0;
        this.totalSteps = 0;
        this.config = QUEUE_ANIMATION_CONFIG;
    }

    /**
     * RESPONSABILIDAD 1: Obtener pasos del backend
     * SRP: Una única tarea - comunicación con API
     * 
     * @returns {Promise<Object>} { steps, summary }
     */
    async fetchSteps() {
        try {
            console.log('📡 Obteniendo pasos de procesamiento desde API...');
            const response = await this.apiClient.processQueueWithSteps();
            
            if (!response.result || !Array.isArray(response.result.steps)) {
                throw new Error('Respuesta inválida: no hay steps en la respuesta');
            }

            const steps = response.result.steps;
            const summary = response.result.summary || {};
            
            console.log(`✅ ${steps.length} pasos obtenidos del servidor`);
            
            // DEBUG: Verificar estructura del primer step
            if (steps.length > 0) {
                console.log(`\n📋 ESTRUCTURA DE STEPS - Primer paso:`);
                const firstStep = steps[0];
                console.log(`   Keys principales:`, Object.keys(firstStep));
                console.log(`   codigo_insertado:`, firstStep.codigo_insertado);
                console.log(`   tree existe:`, !!firstStep.tree);
                if (firstStep.tree) {
                    console.log(`   tree.tree existe:`, !!firstStep.tree.tree);
                    if (firstStep.tree.tree) {
                        console.log(`   tree.tree keys:`, Object.keys(firstStep.tree.tree).slice(0, 8));
                        console.log(`   tree.tree.codigo:`, firstStep.tree.tree.codigo);
                    }
                }
                console.log('');
            }
            
            return { steps, summary };
        } catch (error) {
            console.error('❌ Error al obtener pasos:', error);
            throw error;
        }
    }

    /**
     * RESPONSABILIDAD 2: Orquestar procesamiento completo
     * DIP: Depende de callbacks (abstracciones), no de implementaciones
     * 
     * @param {Array} steps - Array de pasos
     * @param {Object} callbacks - Callbacks {onStarting, onStepComplete, onFinished}
     */
    async processStepsSequentially(steps, callbacks = {}) {
        if (this.isProcessing) {
            console.warn('⚠️ Procesamiento ya en curso');
            return;
        }

        this.isProcessing = true;
        this.totalSteps = steps.length;
        this.currentStepIndex = 0;

        try {
            // Callback inicial
            if (callbacks.onStarting) {
                await callbacks.onStarting();
            }

            // Procesar cada paso
            for (let i = 0; i < steps.length; i++) {
                this.currentStepIndex = i + 1;
                const step = steps[i];
                
                console.log(`\n📍 PASO ${this.currentStepIndex}/${this.totalSteps}: Procesando inserción...`);
                
                // Animar este paso
                await this._animateStep(step, i, steps.length, callbacks);
                
                // Pausa entre pasos
                if (i < steps.length - 1) {
                    console.log(`⏳ Pausa ${this.config.STEP_DURATION_MS}ms antes del siguiente paso...`);
                    await this._delay(this.config.STEP_DURATION_MS);
                }
            }

            // Callback final
            if (callbacks.onFinished) {
                await callbacks.onFinished(steps);
            }

            console.log('✅ Procesamiento de cola completado');

        } catch (error) {
            console.error('❌ Error durante procesamiento:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * RESPONSABILIDAD 3: Orquestar animación de un paso individual
     * ARQUITECTURA SOLID:
     * - SRP: Responsabilidad única de orquestar la secuencia completa
     * - OCP: Extensible sin modificar esta función
     * - DIP: Depende de abstracciones (callbacks), no implementaciones
     * 
     * SECUENCIA OBLIGATORIA:
     * 1. INSERCIÓN NORMAL: Renderizar árbol, animar entrada de nodo
     * 2. DETECCIÓN DE DESBALANCE: Si balance_criticos existe
     * 3. ALERTA VISUAL: Pulso + tooltip del nodo desbalanceado (min 1s visible)
     * 4. ESPERA: Delay corto para percepción del usuario
     * 5. ROTACIÓN: Ejecutar FLIP si ocurrió
     * 6. RESOLUCIÓN: Nodo vuelve a estado normal
     * 7. LIMPIEZA: Quitar de cola, actualizar métricas
     * 
     * @private
     */
    async _animateStep(step, stepIndex, totalSteps, callbacks) {
        try {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`📍 PASO ${stepIndex + 1}/${totalSteps}: ${step.codigo_insertado}`);
            console.log(`${'═'.repeat(60)}`);

            // ═══════════════════════════════════════════════════════════
            // FASE 1: INSERCIÓN NORMAL
            // ═══════════════════════════════════════════════════════════
            console.log(`\n[FASE 1️⃣] INSERCIÓN NORMAL - Renderizar nodo en posición inicial`);

            // ═══════════════════════════════════════════════════════════
            // FASE 1.1: RENDERIZAR ÁRBOL PRE-ROTACIÓN (si hay desbalance)
            // ═══════════════════════════════════════════════════════════
            
            // Revisar si hay conflictos de balance ANTES de renderizar
            const conflictosArray = step.balance_criticos || [];
            const hasConflicts = conflictosArray && Array.isArray(conflictosArray) && conflictosArray.length > 0;
            
            if (hasConflicts && step.tree_pre_rotation) {
                console.log(`   🌳 ÁRBOL PRE-ROTACIÓN: Renderizando árbol DESBALANCEADO con nuevo nodo ${step.codigo_insertado}...`);
                
                // Usar tree_pre_rotation para mostrar el árbol ANTES de las rotaciones
                const preRotationData = {
                    tree: step.tree_pre_rotation,
                    metrics: step.metrics || {}
                };
                
                if (callbacks.onUpdateTree) {
                    await callbacks.onUpdateTree(preRotationData);
                    await this._delay(150); // Esperar render de D3
                    console.log(`   ✅ Árbol pre-rotación renderizado`);
                }
            } else {
                console.log(`   🌳 Renderizando árbol con nuevo nodo ${step.codigo_insertado}...`);
                if (callbacks.onUpdateTree) {
                    await callbacks.onUpdateTree(step);
                    await this._delay(150); // Esperar render de D3
                    console.log(`   ✅ Árbol renderizado`);
                }
            }

            // Capturar posiciones iniciales DESPUÉS de renderizar árbol PRE-ROTACIÓN si hay rotaciones
            let initialPositions = new Map();
            if (step.rotaciones && step.rotaciones.length > 0) {
                const nodeElements = document.querySelectorAll('#tree-container g[data-node-code]');
                const containerRect = document.querySelector('#tree-container')?.getBoundingClientRect();
                
                if (containerRect) {
                    nodeElements.forEach(element => {
                        const rect = element.getBoundingClientRect();
                        const code = element.getAttribute('data-node-code');
                        initialPositions.set(code, {
                            x: rect.x - containerRect.x,
                            y: rect.y - containerRect.y,
                            centerX: rect.x - containerRect.x + rect.width / 2,
                            centerY: rect.y - containerRect.y + rect.height / 2
                        });
                    });
                    console.log(`   ✅ Capturadas posiciones PRE-ROTACIÓN para animación FLIP: ${initialPositions.size} nodos`);
                }
            }

            // Animar entrada del nodo recién insertado
            if (callbacks.onAnimateNodeEntry) {
                console.log(`   ✨ Animando entrada del nodo (${this.config.NODE_ENTRY_DURATION_MS}ms)...`);
                await callbacks.onAnimateNodeEntry(
                    step.codigo_insertado,
                    this.config.NODE_ENTRY_DURATION_MS
                );
                console.log(`   ✅ Animación de entrada completada`);
            }

            // ═══════════════════════════════════════════════════════════
            // FASE 2: DETECCIÓN Y ALERTA DE DESBALANCE
            // ═══════════════════════════════════════════════════════════
            let hadConflict = false;
            
            // DEBUG: Ver qué campos tiene el step
            console.log(`\n🔍 [FASE 2 DEBUG] Campos del step: ${Object.keys(step).join(', ')}`);
            console.log(`   step.balance_criticos:`, step.balance_criticos);
            console.log(`   step.tree_pre_rotation:`, !!step.tree_pre_rotation);
            console.log(`   step.tree_post_rotation:`, !!step.tree_post_rotation);
            
            if (conflictosArray && Array.isArray(conflictosArray) && conflictosArray.length > 0) {
                console.log(`\n[FASE 2️⃣] DETECCIÓN DE DESBALANCE - ${conflictosArray.length} conflicto(s) detectado(s)`);
                hadConflict = true;

                // Procesar cada conflicto detectado
                for (const conflict of conflictosArray) {
                    const nodeCode = conflict.codigo_nodo;
                    const balanceFactor = conflict.factor_balance;
                    const tipoDesbalance = conflict.tipo_desbalance;
                    const alturaIzq = conflict.altura_izquierda;
                    const alturaDer = conflict.altura_derecha;
                    
                    console.log(`   ⚠️ FACTOR DE BALANCE DETECTADO: Nodo ${nodeCode}`);
                    console.log(`      Factor: ${balanceFactor} (Fuera de rango [-1, 0, +1])`);
                    console.log(`      Tipo: ${tipoDesbalance}`);
                    console.log(`      Alturas: Izq=${alturaIzq}, Der=${alturaDer}`);
                    
                    // Ejecutar animación de conflicto en el nodo
                    console.log(`   🎬 Iniciando alerta visual del FACTOR DE BALANCE...`);
                    await this.animateConflict(nodeCode, balanceFactor, tipoDesbalance);
                    console.log(`   ✅ Alerta visual completada - Factor de balance VISIBLE ${this.config.CONFLICT_ALERT_VISIBLE_MIN_DURATION || 1000}ms`);
                }
                
                // ═══════════════════════════════════════════════════════════
                // FASE 2.1: RENDERIZAR ÁRBOL POST-ROTACIÓN (después de alerta)
                // ═══════════════════════════════════════════════════════════
                if (hadConflict && step.tree_post_rotation) {
                    console.log(`\n   🌳 ÁRBOL POST-ROTACIÓN: Renderizando árbol REBALANCEADO tras completar alertas...`);
                    
                    // Usar tree_post_rotation para mostrar el árbol DESPUÉS de las rotaciones
                    const postRotationData = {
                        tree: step.tree_post_rotation,
                        metrics: step.metrics || {}
                    };
                    
                    if (callbacks.onUpdateTree) {
                        await callbacks.onUpdateTree(postRotationData);
                        await this._delay(150); // Esperar render de D3
                        console.log(`   ✅ Árbol post-rotación renderizado - REBALANCEO COMPLETADO`);
                    }
                }

            } else {
                console.log(`\n[FASE 2️⃣] SIN DESBALANCE - El árbol está balanceado después de inserción`);
            }

            // ═══════════════════════════════════════════════════════════
            // FASE 3: ANIMACIÓN DE ROTACIÓN (si ocurrió)
            // ═══════════════════════════════════════════════════════════
            if (step.rotaciones && step.rotaciones.length > 0) {
                console.log(`\n[FASE 3️⃣] ROTACIÓN AVL - ${step.rotaciones.length} rotación(es) a ejecutar`);

                // Ejecutar FLIP para cada rotación
                for (const rotation of step.rotaciones) {
                    console.log(`   🔄 Ejecutando: ${rotation.tipo}`);
                    
                    if (initialPositions.size > 0) {
                        console.log(`   🎬 Animando movimiento FLIP (${this.config.ROTATION_ANIMATION_DURATION_MS}ms)...`);
                        await this._animateRotationFLIP(
                            initialPositions,
                            this.config.ROTATION_ANIMATION_DURATION_MS
                        );
                        console.log(`   ✅ Movimiento FLIP completado`);
                    }

                    // Mostrar badge de tipo de rotación
                    if (callbacks.onShowRotationBadge) {
                        console.log(`   📌 Mostrando badge: ${rotation.tipo}`);
                        await callbacks.onShowRotationBadge(
                            rotation,
                            this.config.ROTATION_BADGE_DURATION_MS
                        );
                        console.log(`   ✅ Badge desaparecido`);
                    }
                }
            } else {
                console.log(`\n[FASE 3️⃣] SIN ROTACIÓN - El árbol ya está balanceado tras inserción`);
            }

            // ═══════════════════════════════════════════════════════════
            // FASE 4: LIMPIEZA Y FINALIZACIÓN
            // ═══════════════════════════════════════════════════════════
            console.log(`\n[FASE 4️⃣] LIMPIEZA - Remover de cola y actualizar métricas`);

            // Quitar vuelo de la cola
            if (callbacks.onRemoveFromQueue) {
                console.log(`   👋 Removiendo ${step.codigo_insertado} de la cola...`);
                await callbacks.onRemoveFromQueue(
                    step.codigo_insertado,
                    this.config.QUEUE_ITEM_REMOVAL_DURATION_MS
                );
                console.log(`   ✅ Removido de cola`);
            }

            // Actualizar métricas
            if (callbacks.onUpdateMetrics) {
                await callbacks.onUpdateMetrics();
                console.log(`   ✅ Métricas actualizadas`);
            }

            console.log(`\n✅ PASO ${stepIndex + 1} COMPLETADO EXITOSAMENTE`);
            console.log(`${'═'.repeat(60)}\n`);

        } catch (error) {
            console.error(`\n❌ ERROR en PASO ${stepIndex + 1}:`, error);
            console.error(`${'═'.repeat(60)}\n`);
            throw error;
        }
    }

    /**
     * RESPONSABILIDAD 4: Animar entrada de nodo (fade-in + scale)
     * LSP: Función intercambiable
     * 
     * @param {String} nodeCode - Código del nodo a animar
     * @param {Number} duration - Duración en ms
     */
    async animateNodeEntry(nodeCode, duration = this.config.NODE_ENTRY_DURATION_MS) {
        return new Promise((resolve) => {
            // Buscar el nodo en el SVG con delay para asegurar que está renderizado
            setTimeout(() => {
                try {
                    const svgContainer = document.getElementById('tree-container');
                    if (!svgContainer) {
                        console.warn(`⚠️ Contenedor SVG no encontrado`);
                        resolve();
                        return;
                    }

                    // DEBUGGING: Ver estructura actual del SVG
                    const allCircles = svgContainer.querySelectorAll('circle');
                    const allTexts = svgContainer.querySelectorAll('text');
                    
                    console.log(`\n🔍 === DEBUG animateNodeEntry para ${nodeCode} ===`);
                    console.log(`   Círculos totales en SVG: ${allCircles.length}`);
                    console.log(`   Elementos text totales: ${allTexts.length}`);
                    
                    // Extraer TODOS los códigos de nodos únicos
                    const allNodeCodes = new Set();
                    for (let text of allTexts) {
                        const content = text.textContent.trim();
                        if (content && !content.startsWith('$') && content.length < 20) {
                            allNodeCodes.add(content);
                        }
                    }
                    console.log(`   Códigos encontrados: [${Array.from(allNodeCodes).join(', ')}]`);
                    console.log(`   Buscando: "${nodeCode}"`);

                    let targetCircle = null;

                    // Búsqueda EXACTA
                    for (let textEl of allTexts) {
                        const textContent = textEl.textContent.trim();
                        if (textContent === nodeCode.trim()) {
                            const parent = textEl.closest('g');
                            if (parent) {
                                targetCircle = parent.querySelector('circle');
                                if (targetCircle) {
                                    console.log(`   ✅ Encontrado con búsqueda exacta`);
                                    break;
                                }
                            }
                        }
                    }

                    // Si no encontró, intentar búsqueda flexible
                    if (!targetCircle) {
                        console.log(`   ⚠️ No encontrado con búsqueda exacta. Intentando flexible...`);
                        
                        for (let circle of allCircles) {
                            const parent = circle.closest('g');
                            if (parent) {
                                const textsInGroup = parent.querySelectorAll('text');
                                let found = false;
                                for (let textEl of textsInGroup) {
                                    if (textEl.textContent.includes(nodeCode.trim())) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (found) {
                                    targetCircle = circle;
                                    console.log(`   ✅ Encontrado con búsqueda flexible`);
                                    break;
                                }
                            }
                        }
                    }

                    if (targetCircle) {
                        try {
                            targetCircle.style.animation = `none`;
                            targetCircle.offsetHeight;
                            targetCircle.style.animation = `nodeEntryAnimation ${duration}ms ease-out`;
                            console.log(`   🎬 Animación aplicada correctamente`);
                            setTimeout(resolve, duration);
                        } catch (e) {
                            console.error(`   ❌ Error aplicando animación: ${e.message}`);
                            resolve();
                        }
                    } else {
                        console.error(`   ❌ NO ENCONTRADO: "${nodeCode}" no existe en el SVG`);
                        console.error(`   Verifica que renderTree() esté insertando este nodo`);
                        resolve();
                    }
                } catch (error) {
                    console.error('❌ Error crítico en animateNodeEntry:', error);
                    resolve();
                }
            }, this.config.ANIMATION_DELAY_MS);
        });
    }

    /**
     * RESPONSABILIDAD 5: Mostrar badge de rotación flotante
     * LSP: Función intercambiable
     * 
     * @param {Object} rotation - { tipo: 'LL'|'RR'|'LR'|'RL', nodo: 'codigo' }
     * @param {Number} duration - Duración en ms
     */
    async animateRotationBadge(rotation, duration = this.config.ROTATION_BADGE_DURATION_MS) {
        return new Promise((resolve) => {
            // Crear badge flotante
            const badge = document.createElement('div');
            badge.className = 'rotation-badge-floating';
            
            const rotationLabels = {
                'LL': '↙️ Rotación LL',
                'RR': '↗️ Rotación RR',
                'LR': '⬆️ Rotación LR',
                'RL': '⬆️ Rotación RL'
            };

            badge.textContent = rotationLabels[rotation.tipo] || `Rotación ${rotation.tipo}`;
            badge.setAttribute('data-rotation-type', rotation.tipo);
            
            const container = document.getElementById('tree-container');
            if (container) {
                container.appendChild(badge);
                
                // Animar entrada
                setTimeout(() => {
                    badge.style.animation = `rotateBadgeIn ${this.config.ROTATION_BADGE_ENTER_DURATION}ms ease-out`;
                }, 10);

                // Animar salida y remover
                setTimeout(() => {
                    badge.style.animation = `rotateBadgeOut ${this.config.ROTATION_BADGE_EXIT_DURATION}ms ease-in forwards`;
                    
                    setTimeout(() => {
                        badge.remove();
                        resolve();
                    }, this.config.ROTATION_BADGE_EXIT_DURATION);
                }, duration - this.config.ROTATION_BADGE_EXIT_DURATION);
            } else {
                resolve();
            }
        });
    }

    /**
     * RESPONSABILIDAD 6A: Animar conflicto de balance en el nodo del árbol
     * SRP: ÚNICA RESPONSABILIDAD - Visualizar el conflicto en el nodo
     * 
     * Esta función es INDEPENDIENTE y está separada de animateStep():
     * - Añade clases CSS que disparan pulse/shake en el nodo
     * - Crea y muestra un tooltip con factor de balance
     * - Mantiene la alerta visible mínimo CONFLICT_ALERT_VISIBLE_MIN_DURATION
     * - Anima la salida de los indicadores visuales
     * 
     * @param {String} nodeCode - Código del nodo desbalanceado
     * @param {Number} balanceFactor - Factor de balance (ej: -2, 2)
     * @param {String} tipoDesbalance - Tipo de desbalance ("izquierda pesada" o "derecha pesada")
     * @returns {Promise} Resuelve cuando terminan todas las animaciones
     * @public
     */
    async animateConflict(nodeCode, balanceFactor, tipoDesbalance = '') {
        return new Promise((resolve) => {
            try {
                console.log(`\n⚠️ CONFLICTO DETECTADO: Nodo ${nodeCode}`);
                console.log(`   Factor de balance ANTES de rotación: ${balanceFactor > 0 ? '+' : ''}${balanceFactor}`);
                console.log(`   Tipo de desbalance: ${tipoDesbalance}`);

                const svgContainer = document.getElementById('tree-container');
                if (!svgContainer) {
                    console.error('❌ tree-container no encontrado');
                    return resolve();
                }

                const svgElement = svgContainer.querySelector('svg');
                if (!svgElement) {
                    console.error('❌ SVG no encontrado en tree-container');
                    return resolve();
                }

                // Buscar el elemento g del nodo usando data-node-code
                let nodeElement = svgElement.querySelector(`g[data-node-code="${nodeCode.trim()}"]`);

                if (!nodeElement) {
                    console.warn(`⚠️ Nodo ${nodeCode} no encontrado. Códigos disponibles:`);
                    const allGs = Array.from(svgElement.querySelectorAll('g[data-node-code]'))
                        .map(g => g.getAttribute('data-node-code'));
                    console.warn(`   [${allGs.join(', ')}]`);
                    return resolve();
                }

                console.log(`✅ [1/5] Nodo encontrado, activando alerta visual con FACTOR DE BALANCE`);
                
                // PASO 1: Agregar clase de pulso al nodo
                nodeElement.classList.add('conflict-node-alert');

                // Crear tooltip mejorado que muestre el factor de balance claramente
                const tooltip = document.createElement('div');
                tooltip.className = 'conflict-node-tooltip';
                
                // Mostrar factor de balance de forma prominente
                const balanceSign = balanceFactor > 0 ? '+' : '';
                const balanceColor = balanceFactor > 0 ? '#ff6b6b' : '#4ecdc4'; // Rojo para izq pesada, azul para der pesada
                
                tooltip.innerHTML = `
                    <div class="tooltip-content">
                        <div class="tooltip-label">FACTOR DE BALANCE</div>
                        <div class="tooltip-value" style="color: ${balanceColor}; font-size: 24px; font-weight: bold;">
                            ${balanceSign}${balanceFactor}
                        </div>
                        <div class="tooltip-type">${tipoDesbalance}</div>
                        <div class="tooltip-icon">⚠️ DESBALANCE</div>
                    </div>
                `;
                
                // Agregar tooltip al body
                document.body.appendChild(tooltip);

                // Posicionar tooltip sobre el nodo
                const nodeRect = nodeElement.getBoundingClientRect();
                tooltip.style.position = 'fixed';
                tooltip.style.left = (nodeRect.left + nodeRect.width / 2 - 70) + 'px';
                tooltip.style.top = (nodeRect.top - 100) + 'px';

                // PASO 2: Mostrar tooltip con animación
                requestAnimationFrame(() => {
                    tooltip.classList.add('tooltip-visible');
                    console.log(`✅ [2/5] Tooltip visible - FACTOR DE BALANCE MOSTRADO`);
                });

                // Obtener duraciones
                const alertDuration = this.config.CONFLICT_ALERT_VISIBLE_MIN_DURATION || 1000;
                const exitDuration = this.config.CONFLICT_TOOLTIP_EXIT_DURATION || 300;
                const rotationDelay = this.config.CONFLICT_TO_ROTATION_DELAY || 300;
                const resolveDuration = this.config.CONFLICT_RESOLUTION_DURATION || 500;

                // Cronograma EXACTO
                const totalTime = alertDuration + exitDuration + rotationDelay + resolveDuration;
                console.log(`   Cronograma: Alert(${alertDuration}ms) + Exit(${exitDuration}ms) + Delay(${rotationDelay}ms) + Resolve(${resolveDuration}ms) = ${totalTime}ms total`);

                // T1: PASO 3 - Completar alerta visual, iniciar salida tooltip
                setTimeout(() => {
                    console.log(`✅ [3/5] Alerta completada (${alertDuration}ms), factor de balance visible ${alertDuration}ms, iniciando salida tooltip...`);
                    tooltip.classList.remove('tooltip-visible');
                    tooltip.classList.add('tooltip-hidden');
                }, alertDuration);

                // T2: PASO 4 - Remover tooltip del DOM
                setTimeout(() => {
                    console.log(`✅ [4/5] Tooltip removido (${alertDuration + exitDuration}ms), esperando rotación...`);
                    tooltip.remove();
                }, alertDuration + exitDuration);

                // T3: PASO 5 - Iniciar transición a "resolved"
                setTimeout(() => {
                    console.log(`✅ [5/5] Entrando a resolved state (${alertDuration + exitDuration + rotationDelay}ms) para transición...`);
                    nodeElement.classList.remove('conflict-node-alert');
                    nodeElement.classList.add('conflict-node-resolved');
                }, alertDuration + exitDuration + rotationDelay);

                // FINAL: Limpiar y RESOLVER PROMISE
                setTimeout(() => {
                    nodeElement.classList.remove('conflict-node-resolved');
                    console.log(`   ✅ FACTOR DE BALANCE MOSTRADO COMPLETAMENTE (${totalTime}ms) - LISTO PARA ROTACIÓN\n`);
                    resolve(); // ← AQUÍ y SOLO AQUÍ resolvemos la promise
                }, totalTime);  // Este es el tiempo TOTAL

            } catch (error) {
                console.error('❌ Error en animateConflict:', error);
                resolve();
            }
        });
    }

    /**
     * RESPONSABILIDAD 7: Remover vuelo de cola con animación
     * LSP: Función intercambiable
     * 
     * @param {String} flightCode - Código del vuelo a remover
     * @param {Number} duration - Duración en ms
     */
    async removeFromQueueDisplay(flightCode, duration = this.config.QUEUE_ITEM_REMOVAL_DURATION_MS) {
        return new Promise((resolve) => {
            try {
                // Buscar el item en la lista de cola
                const queueContainer = document.getElementById('queue-list-container');
                if (!queueContainer) {
                    resolve();
                    return;
                }

                const items = queueContainer.querySelectorAll('.queue-item');
                let targetItem = null;

                for (let item of items) {
                    const codeSpan = item.querySelector('.queue-codigo');
                    if (codeSpan && codeSpan.textContent.trim() === flightCode.trim()) {
                        targetItem = item;
                        break;
                    }
                }

                if (targetItem) {
                    // Animar salida
                    targetItem.style.animation = `queueItemRemoval ${duration}ms ease-in forwards`;
                    
                    setTimeout(() => {
                        targetItem.remove();
                        
                        // Actualizar contador
                        const counter = document.getElementById('queue-count');
                        if (counter) {
                            const count = Math.max(0, parseInt(counter.textContent) - 1);
                            counter.textContent = count;
                        }

                        // Si cola vacía, mostrar mensaje
                        const items = queueContainer.querySelectorAll('.queue-item');
                        if (items.length === 0) {
                            queueContainer.innerHTML = '<div class="queue-empty">🎉 Cola vacía</div>';
                        }

                        resolve();
                    }, duration);
                } else {
                    console.warn(`⚠️ Item ${flightCode} no encontrado en cola`);
                    resolve();
                }
            } catch (error) {
                console.error('Error removiendo de cola:', error);
                resolve();
            }
        });
    }

    /**
     * RESPONSABILIDAD 8: Mostrar resumen final
     * LSP: Función intercambiable
     * 
     * @param {Array} steps - Array completo de pasos
     * @param {Object} summary - Resumen del procesamiento
     */
    async showSummary(steps, summary = {}) {
        return new Promise((resolve) => {
            // Contar estadísticas
            const totalFlights = steps.length;
            const totalRotations = (summary.total_rotations || 0);
            
            // Contar rotaciones por tipo
            const rotationsByType = {};
            if (summary.rotations_by_type) {
                Object.assign(rotationsByType, summary.rotations_by_type);
            }

            // Contar conflictos
            const totalConflicts = steps.reduce((acc, step) => {
                return acc + (step.balance_criticos ? step.balance_criticos.length : 0);
            }, 0);

            // Crear modal de resumen
            const summaryHtml = `
                <div class="queue-processing-summary">
                    <div class="summary-header">
                        <i class="fas fa-check-circle"></i>
                        <h3>✅ Procesamiento Completado</h3>
                    </div>
                    
                    <div class="summary-stats">
                        <div class="stat-item">
                            <div class="stat-icon flights">🛫</div>
                            <div class="stat-content">
                                <div class="stat-label">Vuelos Insertados</div>
                                <div class="stat-value">${totalFlights}</div>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon rotations">🔄</div>
                            <div class="stat-content">
                                <div class="stat-label">Rotaciones Totales</div>
                                <div class="stat-value">${totalRotations}</div>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon conflicts ${totalConflicts > 0 ? 'alert' : ''}">⚠️</div>
                            <div class="stat-content">
                                <div class="stat-label">Conflictos Detectados</div>
                                <div class="stat-value">${totalConflicts}</div>
                            </div>
                        </div>
                    </div>

                    ${Object.keys(rotationsByType).length > 0 ? `
                        <div class="summary-rotations">
                            <h4>Rotaciones por Tipo:</h4>
                            <div class="rotation-breakdown">
                                ${Object.entries(rotationsByType).map(([type, count]) => `
                                    <div class="rotation-item">
                                        <span class="rotation-type-label">${type}</span>
                                        <span class="rotation-count">${count}x</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <button class="btn-summary-close">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            `;

            // Buscar o crear contenedor de resumen
            let summaryContainer = document.getElementById('queue-summary-container');
            if (!summaryContainer) {
                summaryContainer = document.createElement('div');
                summaryContainer.id = 'queue-summary-container';
                document.body.appendChild(summaryContainer);
            }

            summaryContainer.innerHTML = summaryHtml;
            summaryContainer.style.display = 'block';
            summaryContainer.style.animation = `summarySlidIn ${this.config.SUMMARY_ANIMATION_DURATION}ms ease-out`;

            // Event listener para cerrar
            const closeBtn = summaryContainer.querySelector('.btn-summary-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    summaryContainer.style.animation = `summarySlideOut ${this.config.SUMMARY_ANIMATION_DURATION}ms ease-in forwards`;
                    setTimeout(() => {
                        summaryContainer.style.display = 'none';
                        resolve();
                    }, this.config.SUMMARY_ANIMATION_DURATION);
                });
            }

            // Auto-cerrar después de 10 segundos
            setTimeout(() => {
                if (summaryContainer.style.display !== 'none') {
                    closeBtn?.click();
                }
            }, 10000);
        });
    }

    /**
     * ANIMACIÓN FLIP OPTIMIZADA: Ejecuta la animación entre posiciones inicial y final capturadas
     * Recibe posiciones iniciales ya capturadas ANTES de la actualización del árbol
     * 
     * @param {Map} initialPositions - Map de posiciones iniciales capturadas antes de rotación
     * @param {number} duration - Duración de la animación en ms
     * @returns {Promise}
     * @private
     */
    async _animateRotationFLIP(initialPositions, duration = this.config.ROTATION_ANIMATION_DURATION_MS) {
        return new Promise((resolve) => {
            try {
                if (initialPositions.size === 0) {
                    console.warn('⚠️ ROTATION FLIP: Sin posiciones iniciales para animar');
                    return resolve();
                }

                // L (LAST): Capturar posiciones finales DESPUÉS de renderTree
                const nodeElements = document.querySelectorAll('#tree-container g[data-node-code]');
                const containerRect = document.querySelector('#tree-container')?.getBoundingClientRect();
                const finalPositions = new Map();
                const animations = [];

                if (!containerRect) {
                    console.warn('❌ ROTATION FLIP: Contenedor no encontrado');
                    return resolve();
                }

                nodeElements.forEach(element => {
                    const rect = element.getBoundingClientRect();
                    const code = element.getAttribute('data-node-code');
                    const centerX = rect.x - containerRect.x + rect.width / 2;
                    const centerY = rect.y - containerRect.y + rect.height / 2;
                    
                    finalPositions.set(code, {
                        x: rect.x - containerRect.x,
                        y: rect.y - containerRect.y,
                        centerX,
                        centerY
                    });

                    const initialPos = initialPositions.get(code);
                    if (initialPos) {
                        // I (INVERT): Calcular delta para volver a posición inicial
                        const deltaX = initialPos.centerX - centerX;
                        const deltaY = initialPos.centerY - centerY;

                        animations.push({
                            element,
                            code,
                            deltaX,
                            deltaY,
                            initialDeltaX: deltaX,
                            initialDeltaY: deltaY
                        });
                    }
                });

                console.log(`✅ ROTATION FLIP - L(LAST): ${finalPositions.size} finales | I(INVERT): ${animations.length} nodos invertidos`);

                // Aplicar transformaciones inversas inmediatamente
                animations.forEach(anim => {
                    anim.element.style.transition = 'none';
                    anim.element.style.transform = `translate(${anim.deltaX}px, ${anim.deltaY}px)`;
                });

                // P (PLAY): Animar suavemente de vuelta a posiciones finales
                const startTime = performance.now();
                const easeInOutCubic = (t) => {
                    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                };

                const animateFrame = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = easeInOutCubic(progress);

                    animations.forEach(anim => {
                        const currentX = anim.initialDeltaX * (1 - eased);
                        const currentY = anim.initialDeltaY * (1 - eased);
                        anim.element.style.transform = `translate(${currentX}px, ${currentY}px)`;
                    });

                    if (progress < 1) {
                        requestAnimationFrame(animateFrame);
                    } else {
                        // Limpiar transforms cuando complete
                        animations.forEach(anim => {
                            anim.element.style.transform = 'none';
                            anim.element.style.transition = '';
                        });
                        console.log(`✅ ROTATION FLIP - P(PLAY): Animación completada en ${duration}ms`);
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

    /**
     * ANIMACIÓN FLIP: Renderiza rotación con animación suave de posiciones de nodos
     * Técnica: First, Last, Invert, Play
     * @param {Object} rotationData - {tipo: 'LL'|'RR'|'LR'|'RL', nodoId: código del nodo raíz de rotación}
     * @param {string} rotationType - Tipo de rotación para mostrar en badge
     * @param {number} duration - Duración de la animación en ms
     * @returns {Promise} Resuelve cuando la animación completa
     * @public
     */
    async animateRotation(rotationData, rotationType = 'LL', duration = this.config.ROTATION_ANIMATION_DURATION_MS) {
        return new Promise((resolve) => {
            try {
                // F (FIRST): Capturar posiciones iniciales antes de rotación
                const positionsMap = new Map();
                const nodeElements = document.querySelectorAll('#tree-container g[data-node-code]');
                
                if (nodeElements.length === 0) {
                    console.warn('❌ ROTATION: No nodes found for animation');
                    return resolve();
                }

                nodeElements.forEach(element => {
                    const rect = element.getBoundingClientRect();
                    const containerRect = document.querySelector('#tree-container').getBoundingClientRect();
                    const code = element.getAttribute('data-node-code');
                    
                    positionsMap.set(code, {
                        initial: {
                            x: rect.x - containerRect.x,
                            y: rect.y - containerRect.y,
                            centerX: rect.x - containerRect.x + rect.width / 2,
                            centerY: rect.y - containerRect.y + rect.height / 2
                        },
                        transform: window.getComputedStyle(element).transform
                    });
                });

                console.log(`✅ ROTATION FLIP - F(FIRST): Capturadas ${positionsMap.size} posiciones iniciales`);

                // L (LAST): Renderizar estado final (el árbol ya está actualizado en DOM con step.tree)
                // El renderTree() callback ya ocurrió, así que simplemente medimos nuevas posiciones
                this._delay(50).then(() => {
                    const nodeElementsAfter = document.querySelectorAll('#tree-container g[data-node-code]');
                    const finalPositions = new Map();
                    
                    nodeElementsAfter.forEach(element => {
                        const rect = element.getBoundingClientRect();
                        const containerRect = document.querySelector('#tree-container').getBoundingClientRect();
                        const code = element.getAttribute('data-node-code');
                        
                        finalPositions.set(code, {
                            x: rect.x - containerRect.x,
                            y: rect.y - containerRect.y,
                            centerX: rect.x - containerRect.x + rect.width / 2,
                            centerY: rect.y - containerRect.y + rect.height / 2
                        });
                    });

                    console.log(`✅ ROTATION FLIP - L(LAST): Capturadas ${finalPositions.size} posiciones finales`);

                    // I (INVERT): Calcular deltas y aplicar transformaciones inversas
                    const animations = [];
                    positionsMap.forEach((initialData, code) => {
                        const finalPos = finalPositions.get(code);
                        if (!finalPos) return;

                        // Calcular delta (movimiento necesario)
                        const deltaX = initialData.initial.centerX - finalPos.centerX;
                        const deltaY = initialData.initial.centerY - finalPos.centerY;
                        
                        // Invertir: aplicar transform que vuelva a posición inicial
                        const element = document.querySelector(`#tree-container g[data-node-code="${code}"]`);
                        if (element) {
                            element.style.transition = 'transform 0ms ease-in-out';
                            element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                            animations.push({
                                element,
                                deltaX,
                                deltaY,
                                targetX: 0,
                                targetY: 0
                            });
                        }
                    });

                    console.log(`✅ ROTATION FLIP - I(INVERT): Aplicadas ${animations.length} transformaciones inversas`);

                    // P (PLAY): Animar de vuelta a la posición final usando requestAnimationFrame
                    const startTime = performance.now();
                    
                    const easeInOutCubic = (t) => {
                        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    };

                    const animateFrame = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = easeInOutCubic(progress);

                        animations.forEach(anim => {
                            const currentX = anim.deltaX + (anim.targetX - anim.deltaX) * eased;
                            const currentY = anim.deltaY + (anim.targetY - anim.deltaY) * eased;
                            anim.element.style.transform = `translate(${currentX}px, ${currentY}px)`;
                        });

                        if (progress < 1) {
                            requestAnimationFrame(animateFrame);
                        } else {
                            // Limpiar transform cuando se complete
                            animations.forEach(anim => {
                                anim.element.style.transform = 'none';
                                anim.element.style.transition = '';
                            });
                            console.log(`✅ ROTATION FLIP - P(PLAY): Animación completada en ${duration}ms`);
                            resolve();
                        }
                    };

                    requestAnimationFrame(animateFrame);
                });

            } catch (error) {
                console.error('❌ ERROR en animateRotation:', error);
                resolve();
            }
        });
    }

    /**
     * UTILIDAD: Función de delay envuelta en Promise
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtener estado actual del procesamiento
     */
    getProcessingState() {
        return {
            isProcessing: this.isProcessing,
            currentStep: this.currentStepIndex,
            totalSteps: this.totalSteps
        };
    }
}
