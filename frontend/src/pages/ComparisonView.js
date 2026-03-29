import axios from "axios";
import { TreeComparison } from "../components/TreeComparison.js";
import "./comparison.css";

const API = "http://127.0.0.1:8000";

export class ComparisonView {
	constructor() {
		this.comparison = new TreeComparison("#comparisonContainer", 520, 600);
		this.setupUI();
	}

	setupUI() {
		const app = document.querySelector("#app");
		const logoUrl = new URL("../../Img/logotipo.png", import.meta.url).href;

		app.innerHTML = `
			<div class="comparison-layout">
				<header class="comparison-header">
					<div class="header-content">
						<img src="${logoUrl}" alt="Logo" class="header-logo" />
						<div>
							<h1>Inserción con Comparación AVL vs BST</h1>
							<p>Visualiza cómo ambas estructuras organizan los mismos datos</p>
						</div>
					</div>
					<button id="backBtn" class="btn-back">← Volver al Panel</button>
				</header>

				<main class="comparison-main">
					<aside class="comparison-panel">
						<section class="form-section">
							<h2>Insertar Vuelo</h2>
							<form id="insertForm">
							<input name="codigo" type="text" placeholder="Código (ej: SB400)" required />
							<input name="origen" placeholder="Origen" required />
							<input name="destino" placeholder="Destino" required />
							<input name="horaSalida" type="time" required />
							<input name="pasajeros" type="number" placeholder="Pasajeros" value="0" />
							<input name="precioBase" type="number" placeholder="Precio Base" value="0" step="0.01" />
							<input name="prioridad" type="number" placeholder="Prioridad" value="0" min="0" max="3" />
								<label><input name="promocion" type="checkbox" /> Promoción</label>
								<label><input name="alerta" type="checkbox" /> Alerta</label>
								<button type="submit">Insertar y Comparar</button>
							</form>
						</section>

						<section class="info-section">
							<h3>Diferencias</h3>
							<ul class="differences-list">
								<li><strong>AVL:</strong> Auto-balanceado mediante rotaciones</li>
								<li><strong>BST:</strong> Estructura pura sin rotaciones</li>
								<li>Mismos datos, diferente organización</li>
								<li>Profundidad: AVL ≤ BST generalmente</li>
							</ul>
						</section>

						<section class="controls-section">
							<button id="clearBtn" class="btn-secondary">Limpiar Todo</button>
							<button id="loadSampleBtn" class="btn-secondary">Cargar Muestra</button>
						</section>
					</aside>

					<div id="comparisonContainer" class="comparison-content"></div>
				</main>
			</div>
		`;

		this.attachEventListeners();
		this.refreshComparison();
	}

	attachEventListeners() {
		document.querySelector("#insertForm").addEventListener("submit", (e) => {
			e.preventDefault();
			this.insertFlight();
		});

		document.querySelector("#backBtn").addEventListener("click", () => {
			window.location.hash = "#main";
		});

		document.querySelector("#clearBtn").addEventListener("click", () => {
			this.clearTrees();
		});

		document.querySelector("#loadSampleBtn").addEventListener("click", () => {
			this.loadSampleData();
		});
	}

	formPayload() {
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

	async insertFlight() {
		try {
			const payload = this.formPayload();
			await axios.post(`${API}/tree/insert`, payload);
			this.refreshComparison();
			document.querySelector("#insertForm").reset();
		} catch (error) {
			console.error("Error al insertar:", error);
			alert("Error al insertar vuelo");
		}
	}

	async refreshComparison() {
		try {
			const response = await axios.get(`${API}/tree/comparison`);
			this.comparison.render(response.data);
		} catch (error) {
			console.error("Error al obtener comparación:", error);
			const container = document.querySelector("#comparisonContainer");
			if (container) {
				container.innerHTML = `<div class="error-message">Error al cargar comparación: ${error.message}</div>`;
			}
		}
	}

	async clearTrees() {
		if (!confirm("¿Estás seguro de que quieres limpiar todos los árboles?")) {
			return;
		}
		try {
			// Llamar a un endpoint de reset si existe, o simplemente recargar
			await axios.post(`${API}/tree/clear`).catch(() => {
				// Si no existe el endpoint, intentar con reset
				return axios.post(`${API}/tree/reset`);
			});
			this.refreshComparison();
		} catch (error) {
			console.error("Error al limpiar:", error);
			alert("No se pudo limpiar los árboles");
		}
	}

	async loadSampleData() {
		const sampleFlights = [
			{
				codigo: "SB101",
				origen: "Medellin",
				destino: "Bogota",
				horaSalida: "10:00",
				pasajeros: 150,
				precioBase: 250,
				prioridad: 2,
				promocion: false,
				alerta: false,
			},
			{
				codigo: "SB102",
				origen: "Cartagena",
				destino: "Barranquilla",
				horaSalida: "12:30",
				pasajeros: 180,
				precioBase: 320,
				prioridad: 1,
				promocion: true,
				alerta: false,
			},
			{
				codigo: "SB103",
				origen: "Cali",
				destino: "Palmira",
				horaSalida: "14:00",
				pasajeros: 200,
				precioBase: 180,
				prioridad: 3,
				promocion: false,
				alerta: true,
			},
			{
				codigo: "SB104",
				origen: "Santa Marta",
				destino: "Tayrona",
				horaSalida: "09:15",
				pasajeros: 120,
				precioBase: 290,
				prioridad: 2,
				promocion: false,
				alerta: false,
			},
			{
				codigo: "SB105",
				origen: "Pereira",
				destino: "Armenia",
				horaSalida: "16:45",
				pasajeros: 95,
				precioBase: 215,
				prioridad: 1,
				promocion: true,
				alerta: false,
			},
		];

		try {
			for (const flight of sampleFlights) {
				await axios.post(`${API}/tree/insert`, flight);
			}
			this.refreshComparison();
			alert("5 vuelos de muestra cargados exitosamente");
		} catch (error) {
			console.error("Error al cargar muestra:", error);
			alert("Error al cargar datos de muestra");
		}
	}
}
