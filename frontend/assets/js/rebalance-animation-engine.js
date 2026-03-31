/* ============================================
   MOTOR DE ANIMACIÓN PARA REBALANCEO AVL
   Interpolación suave de posiciones con requestAnimationFrame
   ============================================ */

/**
 * Easing functions para animaciones suaves
 */
const EasingFunctions = {
    // Lineal
    linear: (t) => t,
    
    // Cubic ease-in-out (recomendado)
    easeInOutCubic: (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    
    // Quadratic ease-in-out
    easeInOutQuad: (t) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    
    // Cubic ease-out (rápido al principio, lento al final)
    easeOutCubic: (t) => {
        return 1 - Math.pow(1 - t, 3);
    },
};

/**
 * Clase para gestionar animaciones de rebalanceo
 */
class RebalanceAnimationEngine {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.svg = null;
        this.g = null;
        this.nodeElements = new Map();
        this.isAnimating = false;
        this.animationQueue = [];
        this.treeRoot = null;  // Guardar estructura del árbol inicial
        this.newTreeRoot = null;  // Guardar estructura del árbol NUEVO (después de rotación)
        this.nodeParentMap = new Map();  // Mapeo nodo → padre para recálculo dinámico
        this.nodePositions = new Map();  // Guardar posiciones para interpolación
    }

    /**
     * Renderiza el árbol inicial sin animación
     */
    renderInitialTree(treeData, dimensions = { width: 800, height: 500 }) {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        
        // Crear SVG
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', dimensions.width);
        this.svg.setAttribute('height', dimensions.height);
        this.container.appendChild(this.svg);
        
        // Crear grupo principal
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.g.setAttribute('transform', 'translate(40, 60)');
        this.svg.appendChild(this.g);
        
        // Usar D3 para layout
        const width = dimensions.width - 80;
        const height = dimensions.height - 100;
        
        const root = d3.hierarchy(treeData.tree ?? treeData, d => {
            const children = [];
            if (d.left) children.push(d.left);
            if (d.right) children.push(d.right);
            return children.length ? children : null;
        });
        
        const treeLayout = d3.tree().size([width, height]);
        treeLayout(root);
        
        // Almacenar posiciones iniciales
        this.nodePositions = new Map();
        root.descendants().forEach(node => {
            this.nodePositions.set(node.data.codigo, {
                x: node.x,
                y: node.y,
                data: node.data
            });
        });
        
        // Guardar estructura de árbol inicial
        this.treeRoot = root;
        this.newTreeRoot = root;  // Inicialmente son iguales
        
        // Renderizar árbol inicial
        this._drawTree(root);
    }

    /**
     * Dibuja el árbol en el SVG actual
     */
    _drawTree(root) {
        if (!this.g) return;
        
        // Guardar estructura del árbol para recálculo dinámico de links
        this.treeRoot = root;
        this.nodeParentMap.clear();
        
        // Limpiar grupo
        while (this.g.firstChild) {
            this.g.removeChild(this.g.firstChild);
        }
        
        this.nodeElements.clear();
        
        // Usar d3 para dibujar
        const gSelection = d3.select(this.g);
        
        // Recorrer todos los nodos para mapear relaciones padre-hijo
        root.descendants().forEach(node => {
            if (node.parent) {
                this.nodeParentMap.set(node.data.codigo, {
                    parentCodigo: node.parent.data.codigo,
                    node: node,
                    parentNode: node.parent
                });
            }
        });
        
        // Dibujar links (inicialmente vacíos, se actualizarán dinámicamente)
        const linkGroup = gSelection.append('g').attr('class', 'links-group');
        this._createLinkElements(gSelection, root.links());
        
        // Dibujar nodos
        const nodes = gSelection.selectAll('.node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('data-codigo', d => d.data.codigo)
            .attr('transform', d => `translate(${d.x},${d.y})`);
        
        // Almacenar referencias a elementos
        nodes.each((d, i, elements) => {
            this.nodeElements.set(d.data.codigo, {
                element: elements[i],
                group: d3.select(elements[i]),
                x: d.x,
                y: d.y,
                data: d.data
            });
        });
        
        // Círculos de nodos
        nodes.append('circle')
            .attr('r', 28)
            .attr('fill', d => d.data.critico ? '#e74c3c' : '#c084fc')
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5);
        
        // Texto del código
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.2em')
            .attr('font-size', '11px')
            .attr('fill', '#fff')
            .attr('font-weight', '600')
            .text(d => d.data.codigo);
        
        // Texto del precio
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .attr('font-size', '10px')
            .attr('fill', '#fff')
            .text(d => `$${d.data.precioFinal ?? d.data.precioBase ?? '?'}`);
    }

    /**
     * Crea elementos de links en el SVG
     */
    _createLinkElements(gSelection, links) {
        gSelection.selectAll('.link').remove();
        
        gSelection.selectAll('.link')
            .data(links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#555')
            .attr('stroke-width', 1.5)
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));
    }

    /**
     * Anima la transición del árbol de una estructura a otra
     * @param {Object} newTreeData - Estructura del árbol nuevo
     * @param {number} duration - Duración en ms (si no especifica, usa configuración)
     * @param {string} easingName - Nombre de la función de easing (si no especifica, usa configuración)
     * @returns {Promise} Resuelve cuando termina la animación
     */
    async animateTreeTransition(newTreeData, duration = null, easingName = null) {
        if (this.isAnimating) {
            console.warn('⚠️ Ya hay una animación en curso');
            return;
        }

        // Usar valores de configuración si no se especifican
        if (duration === null) {
            duration = typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' 
                ? REBALANCE_ANIMATION_CONFIG.ROTATION_ANIMATION_DURATION 
                : 1000;
        }
        
        if (easingName === null) {
            easingName = typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' 
                ? REBALANCE_ANIMATION_CONFIG.EASING_FUNCTION 
                : 'easeInOutCubic';
        }

        return new Promise((resolve) => {
            this.isAnimating = true;
            
            // Calcular nuevas posiciones
            const width = 800 - 80;
            const height = 500 - 100;
            
            const newRoot = d3.hierarchy(newTreeData.tree ?? newTreeData, d => {
                const children = [];
                if (d.left) children.push(d.left);
                if (d.right) children.push(d.right);
                return children.length ? children : null;
            });
            
            const treeLayout = d3.tree().size([width, height]);
            treeLayout(newRoot);
            
            // Mapeo de posiciones nuevas
            const newPositions = new Map();
            newRoot.descendants().forEach(node => {
                newPositions.set(node.data.codigo, {
                    x: node.x,
                    y: node.y,
                    data: node.data
                });
            });
            
            // 🔑 PASO CRÍTICO: Actualizar la estructura de links ANTES de animar
            // Esto asegura que los links reflejen la NUEVA estructura del árbol
            // después de la rotación (no la estructura antigua)
            this.nodeParentMap.clear();
            newRoot.descendants().forEach(node => {
                if (node.parent) {
                    this.nodeParentMap.set(node.data.codigo, {
                        parentCodigo: node.parent.data.codigo,
                        node: node,
                        parentNode: node.parent
                    });
                }
            });
            this.newTreeRoot = newRoot;  // Guardar nueva estructura para _updateLinks
            
            // Obtener función de easing
            const easing = EasingFunctions[easingName] || EasingFunctions.easeInOutCubic;
            
            // Log para debug
            if (typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' && REBALANCE_ANIMATION_CONFIG.DEBUG_MODE) {
                console.log(`🎬 Animando ${this.nodeElements.size} nodos durante ${duration}ms con easing: ${easingName}`);
                console.log(`🔗 Estructura de links actualizada: ${this.nodeParentMap.size} relaciones padre-hijo`);
            }
            
            // Tiempo de inicio
            const startTime = performance.now();
            
            // Función de animación con requestAnimationFrame
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1); // 0 a 1
                const easedProgress = easing(progress);
                
                // Interpolar posiciones de cada nodo (SIN animar los links)
                this.nodeElements.forEach((nodeInfo, codigo) => {
                    const oldPos = this.nodePositions.get(codigo);
                    const newPos = newPositions.get(codigo);
                    
                    if (oldPos && newPos) {
                        // Interpolación suave usando easing
                        const x = oldPos.x + (newPos.x - oldPos.x) * easedProgress;
                        const y = oldPos.y + (newPos.y - oldPos.y) * easedProgress;
                        
                        // Actualizar posición del grupo SVG del NODO
                        nodeInfo.group.attr('transform', `translate(${x},${y})`);
                        
                        // Guardar posición actual (importante para _updateLinks)
                        nodeInfo.x = x;
                        nodeInfo.y = y;
                    }
                });
                
                // Redibujar links dinámicamente en función de posiciones actuales
                // Los links NO están animados, solo se recalculan cada frame
                this._updateLinks();
                
                // Continuar animación si no ha terminado
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Animación completada
                    this.nodePositions = newPositions;
                    this.isAnimating = false;
                    
                    if (typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' && REBALANCE_ANIMATION_CONFIG.DEBUG_MODE) {
                        console.log(`✅ Animación completada en ${elapsed.toFixed(0)}ms`);
                    }
                    
                    resolve();
                }
            };
            
            // Iniciar animación
            requestAnimationFrame(animate);
        });
    }

    /**
     * Actualiza los links (conexiones) entre nodos durante la animación
     * ¡IMPORTANTE! Se recalculan dinámicamente en CADA FRAME basándose en 
     * las posiciones ACTUALES de los nodos, no se animan como entidades independientes.
     * 
     * Los links NO son entidades independientes que se animan.
     * Son DERIVADAS de las posiciones actuales de los nodos.
     * Cuando los nodos se mueven, los links simplemente se recalculan.
     */
    _updateLinks() {
        if (!this.g || !this.newTreeRoot) return;
        
        const gSelection = d3.select(this.g);
        
        // Obtener los links del árbol ACTUAL (puede haber cambiado por rotación)
        const currentLinks = this.newTreeRoot.links();
        
        // Seleccionar TODOS los elementos <path> de links (pueden ser más o menos que antes)
        const links = gSelection.selectAll('.link').data(currentLinks, (d, i) => i);
        
        // Eliminar links que ya no existan
        links.exit().remove();
        
        // Agregar nuevos links si es necesario
        links.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#555')
            .attr('stroke-width', 1.5)
            .merge(links)
            .attr('d', (linkData) => {
                // linkData es: { source: d3Node, target: d3Node }
                // donde d3Node tiene .data.codigo
                
                // Obtener posiciones ACTUALES interpoladas de los nodos
                const sourceInfo = this.nodeElements.get(linkData.source.data.codigo);
                const targetInfo = this.nodeElements.get(linkData.target.data.codigo);
                
                if (!sourceInfo || !targetInfo) {
                    return '';
                }
                
                // Generar path conectando posiciones ACTUALES
                // IMPORTANTE: Estas posiciones se actualizan CADA FRAME en animateTreeTransition()
                // Los links no se animan, solo se recalculan basándose en las posiciones de nodos
                return d3.linkVertical()
                    .source(() => [sourceInfo.x, sourceInfo.y])
                    .target(() => [targetInfo.x, targetInfo.y])
                    ({});
            });
    }

    /**
     * Resalta un nodo durante la animación
     */
    highlightNode(codigo, duration = 500, color = '#fbbf24') {
        const nodeInfo = this.nodeElements.get(codigo);
        if (!nodeInfo) return;
        
        const circle = nodeInfo.group.select('circle');
        const originalFill = circle.attr('fill');
        const originalStroke = circle.attr('stroke');
        
        circle.transition()
            .duration(200)
            .attr('fill', color)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 3)
            .on('end', () => {
                circle.transition()
                    .duration(200)
                    .delay(duration - 400)
                    .attr('fill', originalFill)
                    .attr('stroke', originalStroke)
                    .attr('stroke-width', 1.5);
            });
    }

    /**
     * Limpia la animación actual
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.nodeElements.clear();
        this.nodePositions.clear();
        this.isAnimating = false;
    }
}

/**
 * Gestor de cola de rotaciones animadas
 */
class RotationQueueAnimator {
    constructor(engine) {
        this.engine = engine;
        this.queue = [];
        this.isProcessing = false;
    }

    /**
     * Agrega una rotación a la cola
     */
    enqueue(step, duration = null) {
        // Si no se especifica duración, usa null para que use la del config
        this.queue.push({ step, duration });
    }

    /**
     * Procesa todas las rotaciones en la cola de forma secuencial
     */
    async processQueue(onStepComplete = null) {
        if (this.isProcessing) {
            console.warn('⚠️ Ya hay un procesamiento en curso');
            return;
        }

        this.isProcessing = true;
        const totalSteps = this.queue.length;

        try {
            for (let i = 0; i < totalSteps; i++) {
                const { step, duration } = this.queue[i];
                
                // Animar transición - usa configuración si duration es null
                await this.engine.animateTreeTransition(
                    { tree: step.tree_snapshot },
                    duration,  // null → usa config
                    null       // null → usa config
                );
                
                // Resaltar el nodo que fue rotado
                this.engine.highlightNode(step.node_codigo, 300);
                
                // Callback con progreso
                if (onStepComplete) {
                    await onStepComplete({
                        current: i + 1,
                        total: totalSteps,
                        step: step
                    });
                }
            }
        } finally {
            this.isProcessing = false;
            this.queue = [];
        }
    }

    /**
     * Pausa auxiliar
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Limpia la cola
     */
    clear() {
        this.queue = [];
    }
}
