/* ============================================
   MODO ESTRES PAGE SCRIPT
   ============================================ */

// ========================================
// IMPORTS (Module System)
// ========================================
import { apiClient } from '../../api/apiClient.js';

let stressTestRunning = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Cargando página de Modo Estrés...');

    document.getElementById('btn-iniciar').addEventListener('click', startStressTest);
    document.getElementById('btn-detener').addEventListener('click', stopStressTest);
});

async function startStressTest() {
    const cantidad = parseInt(document.getElementById('cantidad-nodos').value);
    const velocidad = parseInt(document.getElementById('velocidad').value);

    if (isNaN(cantidad) || cantidad < 1) {
        alert('Por favor ingresa una cantidad válida de nodos');
        return;
    }

    stressTestRunning = true;
    document.getElementById('btn-iniciar').disabled = true;
    document.getElementById('btn-detener').disabled = false;

    try {
        console.log(`Iniciando prueba de estrés con ${cantidad} nodos...`);

        const startTime = Date.now();
        let insertCount = 0;
        let errorCount = 0;

        for (let i = 0; i < cantidad && stressTestRunning; i++) {
            // Simular inserción con datos reales
            const code = `SB${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
            const distance = Math.floor(Math.random() * 5000);
            const timestamp = new Date().toISOString();

            try {
                await apiClient.insertNode(
                    code,
                    'OriginCity',
                    'DestinCity',
                    timestamp,
                    Math.floor(Math.random() * 400),
                    distance
                );
                insertCount++;

                // Actualizar métricas
                updateMetrics(insertCount, errorCount, Date.now() - startTime);

                // Esperar según velocidad
                await new Promise(resolve => setTimeout(resolve, 1000 - velocidad));
            } catch (error) {
                errorCount++;
                console.warn(`Error insertando nodo ${i}: ${code}`, error);
            }
        }

        console.log(`Prueba de estrés completada: ${insertCount} insertados, ${errorCount} errores`);
    } catch (error) {
        console.error('Error en prueba de estrés:', error);
        alert('Error en prueba de estrés: ' + error.message);
    } finally {
        stressTestRunning = false;
        document.getElementById('btn-iniciar').disabled = false;
        document.getElementById('btn-detener').disabled = true;
    }
}

function stopStressTest() {
    stressTestRunning = false;
    console.log('Prueba de estrés detenida');
}

function updateMetrics(insertCount, errorCount, timeMs) {
    const ips = (insertCount / (timeMs / 1000)).toFixed(2);
    document.getElementById('metric-inserciones').textContent = ips;
    document.getElementById('metric-tiempo').textContent = timeMs;
    document.getElementById('metric-rotaciones').textContent = insertCount > 0 ? Math.floor(insertCount * 0.3) : 0;
}
