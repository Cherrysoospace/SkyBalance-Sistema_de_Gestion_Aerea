/**
 * managers/queue/index.js
 * Centralized exports for the queue module
 * Provides a factory for simplified instantiation
 */

import { QueueState } from './QueueState.js';
import { QueueAPIClient } from './QueueAPIClient.js';
import { QueueUIRenderer } from './QueueUIRenderer.js';
import { QueueOrchestrator } from './QueueOrchestrator.js';

export { QueueState, QueueAPIClient, QueueUIRenderer, QueueOrchestrator };

/**
 * Factory: Create a complete, ready-to-use QueueOrchestrator instance
 * Usage:
 *   import { createQueueManager } from './managers/queue/index.js';
 *   const queueManager = createQueueManager(apiClient);
 *
 * @param {ApiClient} apiClient - Global API client
 * @param {string} containerId - Queue container DOM id (default: 'queue-list-container')
 * @returns {QueueOrchestrator} Fully initialized instance
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
 * Backwards-compatible alternative (new QueueManager)
 * Allows: new QueueManager(apiClient) - keeps compatibility
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
 * Architecture summary:
 *
 * QueueState
 *   - Data only (items, isProcessing)
 *   - Pure getters/setters
 *   - 89 lines
 *
 * QueueAPIClient
 *   - HTTP calls only
 *   - Backend communication
 *   - 68 lines
 *
 * QueueUIRenderer
 *   - DOM manipulation only
 *   - Visual rendering
 *   - 93 lines
 *
 * QueueOrchestrator
 *   - Coordinates the three above
 *   - Compatible public API
 *   - 130 lines
 *
 * QueueManager (clase alias)
 *   - Extends QueueOrchestrator
 *   - Backwards compatibility
 *   - Allows "new QueueManager(apiClient)"
 *
 * TOTAL: ~380 lines across 5 files (before: 140 lines in 1 file)
 * BENEFIT: Full SRP, testable, maintainable
 */
