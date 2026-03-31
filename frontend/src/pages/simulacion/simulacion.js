/* ============================================
   SIMULACION PAGE SCRIPT
   ============================================ */

// ========================================
// IMPORTS (Module System)
// ========================================
import { apiClient } from '../../api/apiClient.js';

// D3 es cargado desde CDN en el HTML (disponible como global)

document.addEventListener('DOMContentLoaded', () => {
    console.log('Cargando página de Simulación...');

    document.getElementById('btn-cargar-datos').addEventListener('click', loadSampleData);
    document.getElementById('btn-simular').addEventListener('click', runSimulation);
    document.getElementById('btn-limpiar').addEventListener('click', clearSimulation);
});

async function loadSampleData() {
    console.log('Cargando datos de ejemplo...');
    addLog('Cargando datos de ejemplo...');

    const sampleData = [
        { code: 'SB0100', origen: 'Miami', destino: 'NYC', distance: 1000 },
        { code: 'SB0200', origen: 'LA', destino: 'Miami', distance: 1500 },
        { code: 'SB0300', origen: 'Chicago', destino: 'LA', distance: 2000 },
        { code: 'SB0400', origen: 'NYC', destino: 'Chicago', distance: 2500 },
        { code: 'SB0500', origen: 'Miami', destino: 'LA', distance: 3000 },
    ];

    try {
        const timestamp = new Date().toISOString();
        for (const data of sampleData) {
            await apiClient.insertNode(
                data.code,
                data.origen,
                data.destino,
                timestamp,
                Math.floor(Math.random() * 400),
                data.distance
            );
            addLog(`✓ Insertado: ${data.code} (${data.distance} km)`);
        }
        addLog('✅ Datos de ejemplo cargados correctamente');
    } catch (error) {
        addLog(`✗ Error: ${error.message}`);
    }
}

async function runSimulation() {
    console.log('Ejecutando simulación...');
    addLog('Iniciando simulación...');

    try {
        const data = await apiClient.getTree();
        const nodeCount = data.metrics ? Object.keys(data.tree || {}).length : 0;
        addLog(`📊 Árbol actual: Altura=${data.metrics?.altura || 'N/A'}, Nodos=${nodeCount}`);
        addLog('✅ Simulación completada');
    } catch (error) {
        addLog(`✗ Error: ${error.message}`);
    }
}

function clearSimulation() {
    console.log('Limpiando simulación...');
    document.getElementById('logs').innerHTML = '';
    addLog('🗑️  Logs limpios');
}

function addLog(message) {
    const logsDiv = document.getElementById('logs');
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${timestamp}] ${message}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}
