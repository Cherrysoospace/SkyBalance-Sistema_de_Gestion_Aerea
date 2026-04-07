/* ============================================
   GESTION NODOS PAGE SCRIPT
   Entry point minimalista - Delegación a PageController
   ============================================ */

// ========================================
// IMPORTS
// ========================================
import { apiClient } from '../../api/apiClient.js';
import { modalManager } from '../../components/modalManager.js';
import { GestionNodosPageController } from '../../controllers/GestionNodosPageController.js';
import { initializeAuditManager } from '../../managers/AVLAuditManager.js';

// D3 es cargado desde CDN en el HTML (disponible como global)

// ========================================
// INICIALIZACIÓN (Delegado a PageController)
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Gestión de Nodos...');

    try {
        // Inicializar AuditManager legacy
        const auditManager = initializeAuditManager(apiClient);

        // Crear y ejecutar page controller
        const controller = new GestionNodosPageController(apiClient, modalManager, auditManager);
        await controller.initialize();

    } catch (error) {
        console.error('❌ Error inicializando página:', error);
        alert('Error: No se puede conectar con el backend en localhost:8000');
    }
});

