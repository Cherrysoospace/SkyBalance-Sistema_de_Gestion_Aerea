/**
 * TreeUIRenderer.js
 * Responsabilidad Única: Renderizar el árbol con D3
 * SOLID Compliance: SRP - Solo renderización visual
 *
 * Encapsula toda la lógica de visualización del árbol,
 * independiente de lógica CRUD o coordinación de página.
 */

export class TreeUIRenderer {
    /**
     * @param {string} containerId - ID del contenedor SVG
     * @param {string} loadSectionId - ID de la sección de carga
     */
    constructor(containerId = 'tree-container', loadSectionId = 'load-section') {
        this.containerId = containerId;
        this.loadSectionId = loadSectionId;
        this.container = document.getElementById(containerId);
        this.loadSection = document.getElementById(loadSectionId);
        this.onNodeClick = null;
        this.selectedNode = null;
        this.tooltip = this._createTooltip();
    }

    /**
     * Crear el elemento tooltip en el DOM
     * @private
     */
    _createTooltip() {
        const existing = document.getElementById('flight-tooltip');
        if (existing) return existing;

        const tooltip = document.createElement('div');
        tooltip.id = 'flight-tooltip';
        tooltip.className = 'flight-tooltip';
        tooltip.innerHTML = '<div class="tooltip-content"></div>';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    /**
     * Mostrar tooltip con información del vuelo
     * @private
     */
    _showTooltip(event, nodeData) {
        const tooltipContent = this.tooltip.querySelector('.tooltip-content');

        const info = `
            <div class="tooltip-header">${nodeData.codigo}</div>
            <div class="tooltip-row">
                <span class="label">Origen:</span>
                <span class="value">${nodeData.origen || '—'}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Destino:</span>
                <span class="value">${nodeData.destino || '—'}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Salida:</span>
                <span class="value">${nodeData.horaSalida || '—'}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Pasajeros:</span>
                <span class="value">${nodeData.pasajeros || 0}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Precio Base:</span>
                <span class="value">$${nodeData.precioBase || 0}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Precio Final:</span>
                <span class="value">$${nodeData.precioFinal || nodeData.precioBase || 0}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Prioridad:</span>
                <span class="value">${nodeData.prioridad || 0}</span>
            </div>
            ${nodeData.promocion ? '<div class="tooltip-badge badge-promocion">🎉 Promoción</div>' : ''}
            ${nodeData.alerta ? '<div class="tooltip-badge badge-alerta">⚠️ Alerta</div>' : ''}
            ${nodeData.critico ? '<div class="tooltip-badge badge-critico">🔴 Crítico</div>' : ''}
        `;

        tooltipContent.innerHTML = info;

        const rect = this.container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.tooltip.style.display = 'block';
        this.tooltip.style.left = Math.min(x + 10, window.innerWidth - 250) + 'px';
        this.tooltip.style.top = (y + 10) + 'px';
    }

    /**
     * Ocultar tooltip
     * @private
     */
    _hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    /**
     * Renderizar el árbol con D3 - muestra estructura jerárquica con nodos clickeables
     * SRP: Solo visualización, sin lógica de negocio
     *
     * @param {Object} treeData - {tree: nodeRoot, metrics: {...}}
     * @param {Function} onNodeClick - Callback cuando se selecciona un nodo
     */
    render(treeData, onNodeClick = null) {
        this.container.innerHTML = '';

        if (!treeData || !treeData.tree) {
            this.container.innerHTML = '<p style="color:var(--text-muted)">Árbol vacío — carga un JSON primero</p>';
            return;
        }

        if (onNodeClick) {
            this.onNodeClick = onNodeClick;
        }

        console.log('\n🌳 === RENDER TREE DEBUG ===');
        console.log('📊 treeData recibido:', treeData);
        console.log('📊 treeData.tree:', treeData.tree);
        console.log('📊 Campos del nodo raíz:', Object.keys(treeData.tree));

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 500;

        const root = d3.hierarchy(treeData.tree ?? treeData, d => {
            const children = [];
            if (d.left) children.push(d.left);
            if (d.right) children.push(d.right);
            if (d.izquierdo) children.push(d.izquierdo);
            if (d.derecho) children.push(d.derecho);

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

        const svg = d3.select(this.container).append('svg')
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
            .attr('data-node-code', d => d.data.codigo)  // ✨ Para animaciones FLIP
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .style('cursor', 'pointer')
            .on('click', (event, d) => this._handleNodeClick(event, d, g))
            .on('mouseover', (event, d) => this._showTooltip(event, d.data))
            .on('mouseout', () => this._hideTooltip());

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
        const renderedTexts = this.container.querySelectorAll('text');
        const renderedCodes = Array.from(renderedTexts)
            .map(t => t.textContent.trim())
            .filter(t => t && !t.startsWith('$') && t.length < 20);
        console.log(`✅ RENDERIZADO: ${renderedCodes.length} códigos: [${renderedCodes.join(', ')}]`);
        console.log('🌳 === FIN RENDER TREE ===\n');
    }

    /**
     * Handler interno para clic en nodo
     * @private
     */
    _handleNodeClick(event, d, g) {
        this.selectedNode = d.data;
        // Resetear color de todos los nodos
        g.selectAll('circle').attr('stroke', '#333').attr('stroke-width', 1.5);
        // Resaltar seleccionado
        d3.select(event.currentTarget).select('circle')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3);
        console.log('📍 Nodo seleccionado:', this.selectedNode.codigo);

        // Llamar callback externo si existe
        if (this.onNodeClick) {
            this.onNodeClick(this.selectedNode);
        }
    }

    /**
     * Mostrar sección de carga (cuando árbol está vacío)
     */
    showLoadingSection() {
        this.loadSection.classList.remove('hidden');
        this.container.classList.add('hidden');
    }

    /**
     * Ocultar sección de carga
     */
    hideLoadingSection() {
        this.loadSection.classList.add('hidden');
        this.container.classList.remove('hidden');
    }

    /**
     * Getter del nodo seleccionado
     */
    getSelectedNode() {
        return this.selectedNode;
    }

    /**
     * Limpiar renderizado
     */
    clear() {
        this.container.innerHTML = '';
        this.selectedNode = null;
    }
}
