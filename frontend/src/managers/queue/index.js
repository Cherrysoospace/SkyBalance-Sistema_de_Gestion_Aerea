/**
 * managers/queue/index.js
 * Exports centralizados para el módulo queue
 * Proporciona factory para instanciación simplificada
 */

import { QueueState } from './QueueState.js';
import { QueueAPIClient } from './QueueAPIClient.js';
import { QueueUIRenderer } from './QueueUIRenderer.js';
import { QueueOrchestrator } from './QueueOrchestrator.js';

export { QueueState, QueueAPIClient, QueueUIRenderer, QueueOrchestrator };

/**
 * Factory: Crear instancia completa y lista de QueueOrchestrator
 * Uso:
 *   import { createQueueManager } from './managers/queue/index.js';
 *   const queueManager = createQueueManager(apiClient);
 *
 * @param {ApiClient} apiClient - Cliente API global
 * @param {string} containerId - ID del container DOM para la cola (default: 'queue-list-container')
 * @returns {QueueOrchestrator} Instancia fully initialized
 */
export function createQueueManager(apiClient, containerId = 'queue-list-container') {
    const state = new QueueState();
    const apiClientWrapper = new QueueAPIClient(apiClient);
    const uiRenderer = new QueueUIRenderer(containerId);
    const orchestrator = new QueueOrchestrator(state, apiClientWrapper, uiRenderer);

    console.log('✅ QueueManager inicializado (4 clases especializadas)');

    return orchestrator;
}

/**
 * Alternativa compatible con patrón anterior (nueva QueueManager)
 * Allows: new QueueManager(apiClient) - mantiene compatibilidad
 */
export class QueueManager extends QueueOrchestrator {
    constructor(apiClient, containerId = 'queue-list-container') {
        const state = new QueueState();
        const apiClientWrapper = new QueueAPIClient(apiClient);
        const uiRenderer = new QueueUIRenderer(containerId);
        super(state, apiClientWrapper, uiRenderer);
    }
}

/**
 * Resumen de arquitectura:
 *
 * QueueState
 *   - Solo datos (items, isProcessing)
 *   - Getters/setters puros
 *   - 89 líneas
 *
 * QueueAPIClient
 *   - Solo HTTP calls
 *   - Comunicación con backend
 *   - 68 líneas
 *
 * QueueUIRenderer
 *   - Solo manipulación DOM
 *   - Renderización visual
 *   - 93 líneas
 *
 * QueueOrchestrator
 *   - Coordina las 3 anteriores
 *   - API pública compatible
 *   - 130 líneas
 *
 * QueueManager (clase alias)
 *   - Extends QueueOrchestrator
 *   - Compatibilidad con código anterior
 *   - Permite "new QueueManager(apiClient)"
 *
 * TOTAL: ~380 líneas en 5 archivos (antes: 140 líneas en 1 archivo)
 * BENEFICIO: SRP completo, testeable, mantenible
 */
