/* ============================================
    AVL REBALANCE ANIMATION ENGINE
    Smooth position interpolation with requestAnimationFrame
    ============================================ */

/**
 * Easing functions for smooth animations
 */
const EasingFunctions = {
    // Linear
    linear: (t) => t,
    
    // Cubic ease-in-out (recommended)
    easeInOutCubic: (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    
    // Quadratic ease-in-out
    easeInOutQuad: (t) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    
    // Cubic ease-out (fast at the beginning, slow at the end)
    easeOutCubic: (t) => {
        return 1 - Math.pow(1 - t, 3);
    },
};

/**
 * Class to manage rebalance animations
 */
class RebalanceAnimationEngine {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.svg = null;
        this.g = null;
        this.nodeElements = new Map();
        this.isAnimating = false;
        this.animationQueue = [];
        this.treeRoot = null;  // Store initial tree structure
        this.newTreeRoot = null;  // Store NEW tree structure (after rotation)
        this.nodeParentMap = new Map();  // Node → parent mapping for dynamic link recalculation
        this.nodePositions = new Map();  // Store positions for interpolation
    }

    /**
     * Renders the initial tree without animation
     */
    renderInitialTree(treeData, dimensions = { width: 800, height: 500 }) {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        
        // Create SVG
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', dimensions.width);
        this.svg.setAttribute('height', dimensions.height);
        this.container.appendChild(this.svg);
        
        // Create main group
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.g.setAttribute('transform', 'translate(40, 60)');
        this.svg.appendChild(this.g);
        
        // Use D3 for layout
        const width = dimensions.width - 80;
        const height = dimensions.height - 100;
        
        const root = d3.hierarchy(treeData.tree ?? treeData, d => {
            const children = [];
            // Support both formats: left/right (English) and izquierdo/derecho (Spanish)
            if (d.left) children.push(d.left);
            if (d.right) children.push(d.right);
            if (d.izquierdo && !d.left) children.push(d.izquierdo);
            if (d.derecho && !d.right) children.push(d.derecho);
            return children.length ? children : null;
        });
        
        const treeLayout = d3.tree().size([width, height]);
        treeLayout(root);
        
        // Store initial positions
        this.nodePositions = new Map();
        root.descendants().forEach(node => {
            this.nodePositions.set(node.data.codigo, {
                x: node.x,
                y: node.y,
                data: node.data
            });
        });
        
        // Store initial tree structure
        this.treeRoot = root;
        this.newTreeRoot = root;  // Initially they are the same
        
        // Render initial tree
        this._drawTree(root);
    }

    /**
     * Draws the tree into the current SVG
     */
    _drawTree(root) {
        if (!this.g) return;
        
        // Store tree structure for dynamic link recalculation
        this.treeRoot = root;
        this.nodeParentMap.clear();
        
        // Clear group
        while (this.g.firstChild) {
            this.g.removeChild(this.g.firstChild);
        }
        
        this.nodeElements.clear();
        
        // Use d3 to draw
        const gSelection = d3.select(this.g);
        
        // Walk all nodes to map parent-child relationships
        root.descendants().forEach(node => {
            if (node.parent) {
                this.nodeParentMap.set(node.data.codigo, {
                    parentCodigo: node.parent.data.codigo,
                    node: node,
                    parentNode: node.parent
                });
            }
        });
        
        // Draw links (initially empty, will be updated dynamically)
        const linkGroup = gSelection.append('g').attr('class', 'links-group');
        this._createLinkElements(gSelection, root.links());
        
        // Draw nodes
        const nodes = gSelection.selectAll('.node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('data-codigo', d => d.data.codigo)
            .attr('transform', d => `translate(${d.x},${d.y})`);
        
        // Store element references
        nodes.each((d, i, elements) => {
            this.nodeElements.set(d.data.codigo, {
                element: elements[i],
                group: d3.select(elements[i]),
                x: d.x,
                y: d.y,
                data: d.data
            });
        });
        
        // Node circles
        nodes.append('circle')
            .attr('r', 28)
            .attr('fill', d => d.data.critico ? '#e74c3c' : '#c084fc')
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5);
        
        // Code text
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.2em')
            .attr('font-size', '11px')
            .attr('fill', '#fff')
            .attr('font-weight', '600')
            .text(d => d.data.codigo);
        
        // Price text
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .attr('font-size', '10px')
            .attr('fill', '#fff')
            .text(d => `$${d.data.precioFinal ?? d.data.precioBase ?? '?'}`);
    }

    /**
     * Creates link elements in the SVG
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
     * Animates the tree transition from one structure to another
     * @param {Object} newTreeData - New tree structure
     * @param {number} duration - Duration in ms (if not specified, uses config)
     * @param {string} easingName - Easing function name (if not specified, uses config)
     * @returns {Promise} Resolves when the animation completes
     */
    async animateTreeTransition(newTreeData, duration = null, easingName = null) {
        if (this.isAnimating) {
            console.warn('⚠️ Ya hay una animación en curso');
            return;
        }

        // Use config values if not provided
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
            
            // Compute new positions
            const width = 800 - 80;
            const height = 500 - 100;
            
            const newRoot = d3.hierarchy(newTreeData.tree ?? newTreeData, d => {
                const children = [];
                // Support both formats: left/right (English) and izquierdo/derecho (Spanish)
                if (d.left) children.push(d.left);
                if (d.right) children.push(d.right);
                if (d.izquierdo && !d.left) children.push(d.izquierdo);
                if (d.derecho && !d.right) children.push(d.derecho);
                return children.length ? children : null;
            });
            
            const treeLayout = d3.tree().size([width, height]);
            treeLayout(newRoot);
            
            // Map new positions
            const newPositions = new Map();
            newRoot.descendants().forEach(node => {
                newPositions.set(node.data.codigo, {
                    x: node.x,
                    y: node.y,
                    data: node.data
                });
            });
            
            // 🔑 CRITICAL STEP: Update the link structure BEFORE animating
            // This ensures links reflect the NEW tree structure
            // after rotation (not the old structure)
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
            this.newTreeRoot = newRoot;  // Store new structure for _updateLinks
            
            // Get easing function
            const easing = EasingFunctions[easingName] || EasingFunctions.easeInOutCubic;
            
            // Debug log
            if (typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' && REBALANCE_ANIMATION_CONFIG.DEBUG_MODE) {
                console.log(`🎬 Animando ${this.nodeElements.size} nodos durante ${duration}ms con easing: ${easingName}`);
                console.log(`🔗 Estructura de links actualizada: ${this.nodeParentMap.size} relaciones padre-hijo`);
            }
            
            // Start time
            const startTime = performance.now();
            
            // Animation loop with requestAnimationFrame
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1); // 0 a 1
                const easedProgress = easing(progress);
                
                // Interpolate node positions (WITHOUT animating links)
                this.nodeElements.forEach((nodeInfo, codigo) => {
                    const oldPos = this.nodePositions.get(codigo);
                    const newPos = newPositions.get(codigo);
                    
                    if (oldPos && newPos) {
                        // Smooth interpolation using easing
                        const x = oldPos.x + (newPos.x - oldPos.x) * easedProgress;
                        const y = oldPos.y + (newPos.y - oldPos.y) * easedProgress;
                        
                        // Update SVG group position for the NODE
                        nodeInfo.group.attr('transform', `translate(${x},${y})`);
                        
                        // Store current position (important for _updateLinks)
                        nodeInfo.x = x;
                        nodeInfo.y = y;
                    }
                });
                
                // Re-draw links dynamically based on current positions
                // Links are NOT animated; they are recalculated each frame
                this._updateLinks();
                
                // Continue if not finished
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Animation completed
                    this.nodePositions = newPositions;
                    this.isAnimating = false;
                    
                    if (typeof REBALANCE_ANIMATION_CONFIG !== 'undefined' && REBALANCE_ANIMATION_CONFIG.DEBUG_MODE) {
                        console.log(`✅ Animación completada en ${elapsed.toFixed(0)}ms`);
                    }
                    
                    resolve();
                }
            };
            
            // Start animation
            requestAnimationFrame(animate);
        });
    }

    /**
     * Updates links (connections) between nodes during the animation
     * IMPORTANT: They are recalculated dynamically on EVERY FRAME based on
     * the CURRENT node positions; they are not animated as independent entities.
     *
     * Links are NOT independent entities that animate.
     * They are DERIVED from the current node positions.
     * When nodes move, links are simply recalculated.
     */
    _updateLinks() {
        if (!this.g || !this.newTreeRoot) return;
        
        const gSelection = d3.select(this.g);
        
        // Get links from the CURRENT tree (it may have changed due to rotation)
        const currentLinks = this.newTreeRoot.links();
        
        // Select ALL <path> link elements (there may be more or fewer than before)
        const links = gSelection.selectAll('.link').data(currentLinks, (d, i) => i);
        
        // Remove links that no longer exist
        links.exit().remove();
        
        // Add new links if needed
        links.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#555')
            .attr('stroke-width', 1.5)
            .merge(links)
            .attr('d', (linkData) => {
                // linkData is: { source: d3Node, target: d3Node }
                // where d3Node has .data.codigo
                
                // Get CURRENT interpolated positions of nodes
                const sourceInfo = this.nodeElements.get(linkData.source.data.codigo);
                const targetInfo = this.nodeElements.get(linkData.target.data.codigo);
                
                if (!sourceInfo || !targetInfo) {
                    return '';
                }
                
                // Generate path connecting CURRENT positions
                // IMPORTANT: These positions are updated EVERY FRAME in animateTreeTransition()
                // Links are not animated; they are recalculated based on node positions
                return d3.linkVertical()
                    .source(() => [sourceInfo.x, sourceInfo.y])
                    .target(() => [targetInfo.x, targetInfo.y])
                    ({});
            });
    }

    /**
     * Highlights a node during the animation
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
     * Clears the current animation
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
 * Animated rotation queue manager
 */
class RotationQueueAnimator {
    constructor(engine) {
        this.engine = engine;
        this.queue = [];
        this.isProcessing = false;
    }

    /**
     * Adds a rotation step to the queue
     */
    enqueue(step, duration = null) {
        // If duration is not specified, keep null so the config duration is used
        this.queue.push({ step, duration });
    }

    /**
     * Processes all rotations in the queue sequentially
     * Now supports PRE/POST pairs to show imbalance BEFORE rotation
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

                if (step.isRotationPair) {
                    // 🔑 NEW LOGIC: PRE/POST pairs
                    console.log(`🔄 Animando rotación ${step.type} (PAR PRE/POST)`);
                    console.log(`  1️⃣  Mostrando árbol DESBALANCEADO (PRE)`);
                    
                    // PHASE 1: Animate to PRE (imbalanced tree)
                    await this.engine.animateTreeTransition(
                        { tree: step.preStep.tree_snapshot },
                        500,  // Faster to show imbalance
                        null
                    );

                    // Highlight the imbalanced node
                    this.engine.highlightNode(step.node_codigo, 800);
                    
                    // Wait so the imbalance is visible
                    await this._sleep(1000);

                    console.log(`  2️⃣  Animando ROTACIÓN a árbol balanceado (POST)`);
                    
                    // PHASE 2: Animate to POST (balanced tree with rotation)
                    await this.engine.animateTreeTransition(
                        { tree: step.postStep.tree_snapshot },
                        duration,  // null → uses config duration (2500ms)
                        null
                    );

                    // Wait between rotations
                    await this._sleep(700);

                } else {
                    // Legacy logic for individual steps (fallback)
                    await this.engine.animateTreeTransition(
                        { tree: step.tree_snapshot },
                        duration,
                        null
                    );
                    
                    this.engine.highlightNode(step.node_codigo, 300);
                    await this._sleep(700);
                }

                // Progress callback
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
     * Helper pause
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clears the queue
     */
    clear() {
        this.queue = [];
    }
}

export { RebalanceAnimationEngine, RotationQueueAnimator };
