import axios from "axios";
import * as d3 from "d3";
import "./styles/app.css";

const API = "http://127.0.0.1:8000";
const logoUrl = new URL("../Img/logotipo.png", import.meta.url).href;
const bannerUrl = new URL("../Img/bannerideal.png", import.meta.url).href;

const app = document.querySelector("#app");
app.style.setProperty("--hero-banner", `url('${bannerUrl}')`);
app.innerHTML = `
	<div class="layout">
		<aside class="panel">
			<div class="brand">
				<div class="brandTop">
					<img class="brandLogo" src="${logoUrl}" alt="FAC Airways logo" />
					<span class="badge">AVL Control Center</span>
				</div>
				<h1>FAC Airways AVL</h1>
				<p>Gestion visual y operativa del arbol de vuelos en tiempo real</p>
			</div>

			<section>
				<h2>Cargar JSON</h2>
				<input id="jsonFile" type="file" accept="application/json" />
				<button id="loadJsonBtn">Cargar</button>
			</section>

			<section>
				<h2>Insertar Vuelo</h2>
				<form id="insertForm">
				<input name="codigo" type="text" placeholder="Codigo (ej: SB400)" required />
				<input name="origen" placeholder="Origen" required />
				<input name="destino" placeholder="Destino" required />
				<input name="horaSalida" type="time" required />
				<input name="pasajeros" type="number" placeholder="Pasajeros" value="0" />
				<input name="precioBase" type="number" placeholder="Precio Base" value="0" step="0.01" />
				<input name="prioridad" type="number" placeholder="Prioridad" value="0" min="0" max="3" />
					<label><input name="promocion" type="checkbox" /> Promocion</label>
					<label><input name="alerta" type="checkbox" /> Alerta</label>
					<button type="submit">Insertar</button>
				</form>
			</section>

			<section>
				<h2>Operaciones</h2>
			<input id="deleteCode" type="text" placeholder="Codigo para eliminar" />
			<button id="deleteBtn">Eliminar nodo</button>
			<input id="cancelCode" type="text" placeholder="Codigo para cancelar subarbol" />
			<button id="cancelBtn">Cancelar subarbol</button>
			<button id="undoBtn">↶ Deshacer</button>
			</section>

			<section>
				<h2>Cola de Inserciones</h2>
				<button id="enqueueFromFormBtn">Encolar datos del formulario</button>
				<button id="processQueueBtn">Procesar cola</button>
			</section>

			<section>
				<h2>Versiones</h2>
				<input id="versionName" placeholder="Nombre de version" />
				<button id="saveVersionBtn">Guardar version</button>
				<select id="versionSelect"></select>
				<button id="restoreVersionBtn">Restaurar version</button>
			</section>

			<section>
				<h2>Visualizaciones</h2>
				<button id="comparisonViewBtn" style="background: linear-gradient(135deg, #0077b6, #00b4d8); color: white; width: 100%; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; margin-bottom: 10px;">📊 Inserción con Comparación</button>
			</section>

			<section>
				<h2>Especiales</h2>
				<label><input id="stressToggle" type="checkbox" /> Modo estres</label>
				<input id="depthLimit" type="number" value="3" placeholder="Limite profundidad" />
				<button id="setPenaltyBtn">Aplicar penalizacion</button>
				<button id="rebalanceBtn">Rebalanceo global</button>
				<button id="auditBtn">Auditar AVL</button>
				<button id="leastProfitableBtn">Eliminar menor rentabilidad</button>
			</section>

			<section>
				<h2>Metricas</h2>
				<pre id="metricsBox"></pre>
			</section>

			<section>
				<h2>Auditoria</h2>
				<pre id="auditBox">Sin ejecutar</pre>
			</section>
		</aside>

		<main class="canvasWrap">
			<section class="hero">
				<div class="heroCopy">
					<h3>Conectamos horizontes con decisiones balanceadas</h3>
					<p>Visualiza, actualiza y audita la estructura del arbol sin perder claridad operativa.</p>
				</div>
			</section>
			<svg id="treeSvg" width="1100" height="760"></svg>
		</main>
	</div>
`;

const svg = d3.select("#treeSvg");
const g = svg.append("g").attr("transform", "translate(40,40)");
const linksGroup = g.append("g").attr("class", "links");
const nodesGroup = g.append("g").attr("class", "nodes");

const treeLayout = d3.tree().size([1020, 620]);
const diagonal = d3.linkVertical().x((d) => d.x).y((d) => d.y);

function formPayload() {
	const form = document.querySelector("#insertForm");
	const data = new FormData(form);
	return {
		codigo: String(data.get("codigo")),
		origen: String(data.get("origen")),
		destino: String(data.get("destino")),
		horaSalida: String(data.get("horaSalida")),
		pasajeros: Number(data.get("pasajeros")),
		precioBase: Number(data.get("precioBase")),
		prioridad: Number(data.get("prioridad")),
		promocion: data.get("promocion") === "on",
		alerta: data.get("alerta") === "on",
	};
}

function toHierarchyNode(node) {
	if (!node) return null;
	const children = [node.izquierdo, node.derecho].filter(Boolean).map(toHierarchyNode);
	return {
		...node,
		children,
	};
}

function colorByState(nodeData) {
	if (nodeData.critico) return "#e63946";
	if (nodeData.alerta) return "#fb8500";
	return "#1d3557";
}

// D3 update cycle with explicit enter/update/exit transitions.
function renderTree(treeData) {
	if (!treeData) {
		linksGroup.selectAll("path.link").remove();
		nodesGroup.selectAll("g.node").remove();
		return;
	}

	const hierarchyData = d3.hierarchy(toHierarchyNode(treeData));
	treeLayout(hierarchyData);
	const links = hierarchyData.links();
	const nodes = hierarchyData.descendants();

	const linkSelection = linksGroup
		.selectAll("path.link")
		.data(links, (d) => d.target.data.codigo);

	linkSelection
		.enter()
		.append("path")
		.attr("class", "link")
		.attr("d", (d) => diagonal({ source: d.source, target: d.source }))
		.merge(linkSelection)
		.transition()
		.duration(450)
		.attr("d", diagonal);

	linkSelection
		.exit()
		.transition()
		.duration(300)
		.style("opacity", 0)
		.remove();

	const nodeSelection = nodesGroup
		.selectAll("g.node")
		.data(nodes, (d) => d.data.codigo);

	const nodeEnter = nodeSelection
		.enter()
		.append("g")
		.attr("class", "node")
		.attr("transform", (d) => `translate(${d.x},${d.y})`)
		.style("opacity", 0);

	nodeEnter
		.append("circle")
		.attr("r", 20)
		.attr("fill", (d) => colorByState(d.data));

	nodeEnter
		.append("text")
		.attr("dy", 5)
		.attr("text-anchor", "middle")
		.text((d) => d.data.codigo)
		.attr("fill", "#fff")
		.attr("font-size", 11);

	nodeEnter
		.merge(nodeSelection)
		.transition()
		.duration(450)
		.style("opacity", 1)
		.attr("transform", (d) => `translate(${d.x},${d.y})`);

	nodeSelection
		.merge(nodeEnter)
		.select("circle")
		.transition()
		.duration(450)
		.attr("fill", (d) => colorByState(d.data));

	nodeSelection
		.exit()
		.transition()
		.duration(300)
		.style("opacity", 0)
		.remove();
}

function renderMetrics(metrics) {
	document.querySelector("#metricsBox").textContent = JSON.stringify(metrics, null, 2);
}

async function refreshState() {
	const response = await axios.get(`${API}/tree/state`);
	renderTree(response.data.tree);
	renderMetrics(response.data.metrics);
	await refreshVersions();
}

async function refreshVersions() {
	const select = document.querySelector("#versionSelect");
	const response = await axios.get(`${API}/versions/`);
	const versions = response.data;
	select.innerHTML = "";
	versions.forEach((version) => {
		const option = document.createElement("option");
		option.value = version.name;
		option.textContent = `${version.name} (${version.timestamp})`;
		select.appendChild(option);
	});
}

document.querySelector("#loadJsonBtn").addEventListener("click", async () => {
	const fileInput = document.querySelector("#jsonFile");
	const file = fileInput.files[0];
	if (!file) return;

	const formData = new FormData();
	formData.append("file", file);
	await axios.post(`${API}/persistence/load`, formData);
	await refreshState();
});

document.querySelector("#insertForm").addEventListener("submit", async (event) => {
	event.preventDefault();
	await axios.post(`${API}/tree/insert`, formPayload());
	await refreshState();
});

document.querySelector("#deleteBtn").addEventListener("click", async () => {
	const code = document.querySelector("#deleteCode").value.trim();
	if (!code) return;
	await axios.delete(`${API}/tree/delete/${code}`);
	await refreshState();
});

document.querySelector("#cancelBtn").addEventListener("click", async () => {
	const code = document.querySelector("#cancelCode").value.trim();
	if (!code) return;
	await axios.delete(`${API}/tree/cancel/${code}`);
	await refreshState();
});

document.querySelector("#undoBtn").addEventListener("click", async () => {
	await axios.post(`${API}/tree/undo`);
	await refreshState();
});

document.querySelector("#enqueueFromFormBtn").addEventListener("click", async () => {
	await axios.post(`${API}/queue/enqueue`, formPayload());
	await refreshState();
});

document.querySelector("#processQueueBtn").addEventListener("click", async () => {
	await axios.post(`${API}/queue/process`);
	await refreshState();
});

document.querySelector("#saveVersionBtn").addEventListener("click", async () => {
	const name = document.querySelector("#versionName").value.trim();
	if (!name) return;
	await axios.post(`${API}/versions/`, { name });
	await refreshVersions();
});

document.querySelector("#restoreVersionBtn").addEventListener("click", async () => {
	const name = document.querySelector("#versionSelect").value;
	if (!name) return;
	await axios.post(`${API}/versions/restore`, { name });
	await refreshState();
});

document.querySelector("#stressToggle").addEventListener("change", async (event) => {
	await axios.post(`${API}/metrics/stress`, { enabled: event.target.checked });
	await refreshState();
});

document.querySelector("#setPenaltyBtn").addEventListener("click", async () => {
	const depthLimit = Number(document.querySelector("#depthLimit").value);
	await axios.post(`${API}/metrics/depth-penalty`, { depthLimit });
	await refreshState();
});

document.querySelector("#rebalanceBtn").addEventListener("click", async () => {
	await axios.post(`${API}/metrics/rebalance-global`);
	await refreshState();
});

document.querySelector("#auditBtn").addEventListener("click", async () => {
	const response = await axios.get(`${API}/metrics/audit`);
	document.querySelector("#auditBox").textContent = JSON.stringify(response.data, null, 2);
});

document.querySelector("#leastProfitableBtn").addEventListener("click", async () => {
	await axios.delete(`${API}/metrics/least-profitable`);
	await refreshState();
});

// Function to render comparison view
function renderComparisonView() {
	import("./pages/ComparisonView.js").then(({ ComparisonView }) => {
		new ComparisonView();
	}).catch((error) => {
		console.error("Error loading ComparisonView:", error);
		alert("Error al cargar vista de comparación: " + error.message);
	});
}

// Use event delegation for comparison button
document.addEventListener("click", (e) => {
	if (e.target && e.target.id === "comparisonViewBtn") {
		renderComparisonView();
	}
});

// Handle hash navigation
window.addEventListener("hashchange", () => {
	const hash = window.location.hash.slice(1);
	if (hash === "comparison") {
		renderComparisonView();
	} else if (hash === "" || hash === "main") {
		location.reload();
	}
});

// Initialize with main view
if (window.location.hash === "#comparison") {
	renderComparisonView();
}

refreshState().catch((error) => {
	document.querySelector("#auditBox").textContent = `Error de conexion con backend: ${error.message}`;
});
