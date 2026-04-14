/**
 * AVL Audit Manager
 * 
 * Single Responsibility: Manage AVL audit (logic + UI)
 * 
 * SOLID principles applied:
 * - S: Single responsibility - AVL audit (backend + frontend)
 * - I: Interface segregation - specific methods
 * - D: Dependency injection - injected apiClient
 * - O: Open/Closed - easy to extend
 */

class AVLAuditManager {
    constructor(apiClient, config = {}) {
        // Dependency Injection: principle D (SOLID)
        this.apiClient = apiClient;
        this.lastAuditResult = null;
        this.config = {
            auditButton: 'btnAuditar',
            auditModal: 'modal-audit',
            auditReportDiv: 'audit-report-modal',
            ...config
        };
    }

    // ========================================
    // PUBLIC METHODS - AUDIT
    // ========================================

    /**
        * Runs the AVL tree audit
        * SRP: Responsible only for running the audit
     */
    async performAudit() {
        try {
            console.log('🔍 Iniciando auditoría AVL...');
            const auditResult = await this.apiClient.get('/metrics/audit');
            this.lastAuditResult = auditResult;
            console.log('✅ Auditoría completada:', auditResult);
            return auditResult;
        } catch (error) {
            console.error('❌ Error en auditoría:', error);
            throw error;
        }
    }

    /**
        * Full handler to run an audit from the UI
        * DIP: Manages state and UI
     */
    async executeWithUI(stressModeEnabled) {
        if (!stressModeEnabled) {
            throw new Error('La Auditoría AVL solo está disponible en Modo Estrés');
        }

        const btn = document.getElementById(this.config.auditButton);
        if (!btn) throw new Error('Botón Auditar no encontrado');

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Auditando...';

            console.log('🔍 Ejecutando auditoría AVL...');

            // Run audit
            const auditResult = await this.performAudit();

            // Validate result
            if (!auditResult) {
                throw new Error('La auditoría no retornó resultados');
            }

            console.log('✅ Auditoría completada');
            console.log('Estado:', auditResult.status);
            console.log('Problemas encontrados:', auditResult.problemasEncontrados?.length || 0);

            return auditResult;

        } catch (error) {
            console.error('❌ Error en auditoría:', error);
            throw error;

        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search-plus"></i> Verificar Propiedad AVL';
        }
    }

    // ========================================
    // PUBLIC METHODS - UI
    // ========================================

    /**
        * Renders the audit report into the DOM
     */
    renderReport(auditResult, containerId = 'audit-report') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Contenedor #${containerId} no encontrado`);
            return;
        }

        const html = this._buildReportHTML(auditResult);
        container.innerHTML = html;
        
        // Animate appearance
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.transition = 'opacity 0.5s ease-in';
            container.style.opacity = '1';
        }, 10);
    }

    /**
        * Opens a modal with the audit report
        * DIP: Renders and shows
     */
    showReport(auditResult) {
        try {
            const modal = document.getElementById(this.config.auditModal);
            const reportDiv = document.getElementById(this.config.auditReportDiv);

            if (!modal || !reportDiv) {
                throw new Error('Elementos del modal de auditoría no encontrados');
            }

            // Render report
            this.renderReport(auditResult, this.config.auditReportDiv);

            // Show modal
            modal.classList.remove('hidden');
            modal.classList.add('show');

            console.log('✅ Modal de auditoría mostrado');

        } catch (error) {
            console.error('❌ Error mostrando reporte:', error);
            throw error;
        }
    }

    /**
        * Closes the audit modal
        * SRP: Responsible only for closing
     */
    closeReport() {
        try {
            const modal = document.getElementById(this.config.auditModal);

            if (!modal) {
                console.warn('Modal de auditoría no encontrado');
                return;
            }

            modal.classList.remove('show');
            modal.classList.add('hidden');

            // Clear report
            this.clearReport(this.config.auditReportDiv);

            console.log('✅ Modal de auditoría cerrado');

        } catch (error) {
            console.error('❌ Error cerrando modal:', error);
        }
    }

    /**
        * Sets up modal event listeners
        * DIP: Behavior injection
     */
    setupEventListeners(onClose) {
        try {
            const modal = document.getElementById(this.config.auditModal);
            if (!modal) {
                console.warn('Modal de auditoría no encontrado para event listeners');
                return;
            }

            const closeBtn = modal.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', onClose);
            }

            // Click outside the modal
            const handleOutsideClick = (e) => {
                if (e.target === modal) {
                    onClose();
                }
            };
            window.addEventListener('click', handleOutsideClick);

            console.log('✅ Event listeners del modal de auditoría configurados');

        } catch (error) {
            console.error('❌ Error configurando event listeners:', error);
        }
    }

    /**
        * Clears the report
     */
    clearReport(containerId = 'audit-report') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
        this.lastAuditResult = null;
    }

    /**
        * Returns the last audit result
     */
    getLastResult() {
        return this.lastAuditResult;
    }

    // ========================================
    // PRIVATE METHODS - HTML building
    // ========================================

    /**
        * Builds the report HTML
        * Principle O (Open/Closed): easy to extend
     */
    _buildReportHTML(auditResult) {
        const resumen = auditResult.resumen;
        const estado = auditResult.status === 'VÁLIDO' ? 'valid' : 'invalid';
        
        let html = `
            <div class="audit-report-container ${estado}">
                <div class="report-header">
                    <h2>📋 Reporte de Auditoría AVL</h2>
                    <span class="status-badge ${estado}">
                        ${auditResult.status}
                    </span>
                </div>

                <div class="report-summary">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="label">Total de Nodos</span>
                            <span class="value">${resumen.totalNodos}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Nodos Inconsistentes</span>
                            <span class="value ${resumen.nodosInconsistentes > 0 ? 'warning' : ''}">${resumen.nodosInconsistentes}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Problemas Críticos</span>
                            <span class="value ${resumen.problemascríticos > 0 ? 'critical' : ''}">${resumen.problemascríticos}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Problemas Importantes</span>
                            <span class="value ${resumen.problemasImportantes > 0 ? 'warning' : ''}">${resumen.problemasImportantes}</span>
                        </div>
                    </div>
                    <div class="severity-indicator">
                        Severidad: <strong>${resumen.severidad.toUpperCase()}</strong>
                    </div>
                </div>
        `;

        // Issues section
        if (auditResult.problemasEncontrados && auditResult.problemasEncontrados.length > 0) {
            html += this._buildIssuesSection(auditResult.problemasEncontrados);
        }

        // Audited nodes section
        if (auditResult.nodosAuditados && auditResult.nodosAuditados.length > 0) {
            html += this._buildNodesSection(auditResult.nodosAuditados);
        }

        html += '</div>';
        return html;
    }

    /**
        * Builds the issues section
     */
    _buildIssuesSection(issues) {
        if (issues.length === 0) return '';

        const critical = issues.filter(i => i.severity === 'critical');
        const major = issues.filter(i => i.severity === 'major');

        let html = '<div class="issues-section">';
        html += '<h3>⚠️ Problemas Encontrados</h3>';

        if (critical.length > 0) {
            html += `
                <div class="issues-group critical">
                    <h4>🔴 Críticos (${critical.length})</h4>
                    <ul>
                        ${critical.map(issue => `
                            <li>
                                <strong>${issue.nodo}</strong>: ${issue.message}
                                ${issue.location ? `<br><small>Ubicación: ${issue.location}</small>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        if (major.length > 0) {
            html += `
                <div class="issues-group major">
                    <h4>🟠 Importantes (${major.length})</h4>
                    <ul>
                        ${major.map(issue => `
                            <li>
                                <strong>${issue.nodo}</strong>: ${issue.message}
                                <br><small>Esperado: ${issue.expected}, Actual: ${issue.actual}</small>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
        * Builds the audited nodes section
     */
    _buildNodesSection(nodes) {
        if (nodes.length === 0) return '';

        const inconsistent = nodes.filter(n => !n.valid);

        let html = '<div class="nodes-section">';
        html += `<h3>📊 Análisis de Nodos (${inconsistent.length} inconsistentes)</h3>`;
        html += '<div class="nodes-table-wrapper"><table class="nodes-table">';
        html += `
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Profundidad</th>
                    <th>Altura</th>
                    <th>Factor Balanceo</th>
                    <th>Estado</th>
                    <th>Problemas</th>
                </tr>
            </thead>
            <tbody>
        `;

        nodes.forEach(node => {
            const status = node.valid ? '✅' : '❌';
            const issues = node.issues.length > 0 ? node.issues.map(i => i.type).join(', ') : '-';
            
            html += `
                <tr class="${node.valid ? '' : 'inconsistent'}">
                    <td><strong>${node.codigo}</strong></td>
                    <td>${node.depth}</td>
                    <td>${node.height}</td>
                    <td class="${Math.abs(node.balanceFactor) > 1 ? 'critical' : ''}">${node.balanceFactor}</td>
                    <td>${status}</td>
                    <td><small>${issues}</small></td>
                </tr>
            `;
        });

        html += `
            </tbody>
            </table></div>
        </div>
        `;
        return html;
    }
}

// Global instance for use in other scripts
let auditManager = null;

function initializeAuditManager(apiClient) {
    auditManager = new AVLAuditManager(apiClient);
    return auditManager;
}

export { AVLAuditManager, initializeAuditManager, auditManager };
