/* ============================================
   GESTION NODOS PAGE SCRIPT
    Minimal entry point - Delegates to PageController
   ============================================ */

// ========================================
// IMPORTS
// ========================================
import { apiClient } from '../../api/apiClient.js';
import { modalManager } from '../../components/modalManager.js';
import { GestionNodosPageController } from '../../controllers/GestionNodosPageController.js';
import { initializeAuditManager } from '../../managers/AVLAuditManager.js';

// D3 is loaded from a CDN in the HTML (available as a global)

// ========================================
// INITIALIZATION (Delegated to PageController)
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Gestión de Nodos...');

    try {
        // Initialize legacy AuditManager
        const auditManager = initializeAuditManager(apiClient);

        // Create and run page controller
        const controller = new GestionNodosPageController(apiClient, modalManager, auditManager);
        await controller.initialize();

    } catch (error) {
        console.error('❌ Error inicializando página:', error);
        alert('Error: No se puede conectar con el backend en localhost:8000');
    }
});

