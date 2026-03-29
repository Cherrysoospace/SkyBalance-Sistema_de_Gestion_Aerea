import * as d3 from "d3";

export class TreeComparison {
	constructor(containerId, width = 520, height = 600) {
		this.containerId = containerId;
		this.width = width;
		this.height = height;
		this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
		this.treeLayout = d3.tree().size([
			this.width - this.margin.left - this.margin.right,
			this.height - this.margin.top - this.margin.bottom,
		]);
		this.diagonal = d3.linkVertical().x((d) => d.x).y((d) => d.y);
	}

	toHierarchyNode(node) {
		if (!node) return null;
		const children = [node.izquierdo, node.derecho]
			.filter(Boolean)
			.map((child) => this.toHierarchyNode(child));
		return {
			...node,
			children,
		};
	}

	colorByState(nodeData) {
		if (nodeData.critico) return "#e63946";
		if (nodeData.alerta) return "#fb8500";
		return "#1d3557";
	}

	renderTree(svgElement, treeData, title, treeType = "avl") {
		const svg = d3.select(svgElement);
		svg.selectAll("*").remove();

		// Título
		svg.append("text")
			.attr("x", this.width / 2)
			.attr("y", 15)
			.attr("text-anchor", "middle")
			.attr("font-size", 14)
			.attr("font-weight", "bold")
			.attr("fill", treeType === "avl" ? "#0077b6" : "#d62828")
			.text(title);

		if (!treeData) {
			svg.append("text")
				.attr("x", this.width / 2)
				.attr("y", this.height / 2)
				.attr("text-anchor", "middle")
				.attr("fill", "#999")
				.text("Árbol vacío");
			return;
		}

		const g = svg
			.append("g")
			.attr(
				"transform",
				`translate(${this.margin.left},${this.margin.top + 20})`
			);

		const linksGroup = g.append("g").attr("class", "links");
		const nodesGroup = g.append("g").attr("class", "nodes");

		const hierarchyData = d3.hierarchy(this.toHierarchyNode(treeData));
		this.treeLayout(hierarchyData);

		const links = hierarchyData.links();
		const nodes = hierarchyData.descendants();

		// Renderizar links
		linksGroup
			.selectAll("path")
			.data(links)
			.enter()
			.append("path")
			.attr("class", "link")
			.attr("d", this.diagonal)
			.attr("stroke", treeType === "avl" ? "#0077b6" : "#d62828")
			.attr("stroke-width", 2)
			.attr("fill", "none");

		// Renderizar nodos
		const nodeSelection = nodesGroup
			.selectAll("g")
			.data(nodes)
			.enter()
			.append("g")
			.attr("class", "node")
			.attr("transform", (d) => `translate(${d.x},${d.y})`);

		nodeSelection
			.append("circle")
			.attr("r", 18)
			.attr("fill", (d) => this.colorByState(d.data))
			.attr("stroke", treeType === "avl" ? "#0077b6" : "#d62828")
			.attr("stroke-width", 2);

		nodeSelection
			.append("text")
			.attr("dy", 4)
			.attr("text-anchor", "middle")
			.text((d) => d.data.codigo)
			.attr("fill", "#fff")
			.attr("font-size", 10)
			.attr("font-weight", "bold");
	}

	render(data) {
		const container = document.querySelector(this.containerId);
		if (!container) return;

		container.innerHTML = `
			<div class="comparison-wrapper" style="display: flex; gap: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
				<div class="tree-container-avl" style="flex: 1;">
					<svg width="${this.width}" height="${this.height}" style="border: 2px solid #0077b6; background: white; border-radius: 4px;"></svg>
				</div>
				<div class="tree-container-bst" style="flex: 1;">
					<svg width="${this.width}" height="${this.height}" style="border: 2px solid #d62828; background: white; border-radius: 4px;"></svg>
				</div>
			</div>
			<div class="metrics-table" style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
				<table style="width: 100%; border-collapse: collapse;">
					<thead>
						<tr style="background: #f0f0f0;">
							<th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Métrica</th>
							<th style="padding: 10px; text-align: center; border-bottom: 2px solid #0077b6; color: #0077b6; font-weight: bold;">AVL</th>
							<th style="padding: 10px; text-align: center; border-bottom: 2px solid #d62828; color: #d62828; font-weight: bold;">BST</th>
						</tr>
					</thead>
					<tbody>
						<tr style="border-bottom: 1px solid #ddd;">
							<td style="padding: 10px; font-weight: bold;">Raíz</td>
							<td style="padding: 10px; text-align: center; background: #e3f2fd;">${data.avl?.metrics?.raiz || "—"}</td>
							<td style="padding: 10px; text-align: center; background: #ffebee;">${data.bst?.metrics?.raiz || "—"}</td>
						</tr>
						<tr style="border-bottom: 1px solid #ddd;">
							<td style="padding: 10px; font-weight: bold;">Profundidad</td>
							<td style="padding: 10px; text-align: center; background: #e3f2fd;">${data.avl?.metrics?.profundidad || 0}</td>
							<td style="padding: 10px; text-align: center; background: #ffebee;">${data.bst?.metrics?.profundidad || 0}</td>
						</tr>
						<tr style="border-bottom: 1px solid #ddd;">
							<td style="padding: 10px; font-weight: bold;">Hojas</td>
							<td style="padding: 10px; text-align: center; background: #e3f2fd;">${data.avl?.metrics?.hojas || 0}</td>
							<td style="padding: 10px; text-align: center; background: #ffebee;">${data.bst?.metrics?.hojas || 0}</td>
						</tr>
						<tr>
							<td style="padding: 10px; font-weight: bold;">Altura Actual</td>
							<td style="padding: 10px; text-align: center; background: #e3f2fd;">${data.avl?.metrics?.alturaActual || 0}</td>
							<td style="padding: 10px; text-align: center; background: #ffebee;">${data.bst?.metrics?.alturaActual || 0}</td>
						</tr>
					</tbody>
				</table>
			</div>
		`;

		// Renderizar árboles
		const avlSvg = container.querySelector(".tree-container-avl svg");
		const bstSvg = container.querySelector(".tree-container-bst svg");

		this.renderTree(avlSvg, data.avl?.tree, "Árbol AVL (Balanceado)", "avl");
		this.renderTree(bstSvg, data.bst?.tree, "Árbol BST (Sin Balanceo)", "bst");
	}
}
