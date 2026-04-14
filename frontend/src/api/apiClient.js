/* ============================================
    API CLIENT - Connect to the FastAPI backend
    ============================================ */

const API_BASE_URL = 'http://localhost:8000';

// Class to handle all API requests
export class ApiClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    // Generic GET method
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    // Generic POST method
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                let errorDetail = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    console.log('📥 Error response body:', errorBody);
                    errorDetail = errorBody.detail || errorDetail;
                } catch (e) {
                    // If there's no JSON, keep the default message
                }
                throw new Error(errorDetail);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }

    // Generic DELETE method
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                let errorDetail = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorDetail = errorBody.detail || errorDetail;
                } catch (e) {
                    // If there's no JSON, keep the default message
                }
                throw new Error(errorDetail);
            }
            return await response.json();
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }

    // Generic PATCH method
    async patch(endpoint, data) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                let errorDetail = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorDetail = errorBody.detail || errorDetail;
                } catch (e) {
                    // If there's no JSON, keep the default message
                }
                throw new Error(errorDetail);
            }
            return await response.json();
        } catch (error) {
            console.error('API PATCH Error:', error);
            throw error;
        }
    }

    // Tree Endpoints
    async getTree() {
        return this.get('/tree/state');
    }

    async insertNode(payload) {
        // If a full object is provided, use it directly
        if (typeof payload === 'object' && payload !== null) {
            return this.post('/tree/insert', payload);
        }

        // Fallback: if received as positional arguments (compatibility)
        const data = {
            codigo: arguments[0],
            origen: arguments[1],
            destino: arguments[2],
            horaSalida: arguments[3],
            pasajeros: arguments[4] || 0,
            precioBase: arguments[5] || 0,
            promocion: false,
            prioridad: 0,
            alerta: false
        };
        return this.post('/tree/insert', data);
    }

    async deleteNode(codigo) {
        return this.delete(`/tree/delete/${codigo}`);
    }

    async cancelSubtree(codigo) {
        return this.delete(`/tree/cancel/${codigo}`);
    }

    async getComparison() {
        return this.get('/tree/comparison');
    }

    async undoLast() {
        return this.post('/tree/undo', {});
    }

    async getMetrics() {
        // Get metrics from the dedicated endpoint
        return this.get('/metrics/');
    }

    async healthCheck() {
        return this.get('/');
    }

    // ============================================
    // TREE - Node updates
    // ============================================
    async updateNode(codigo, payload) {
        return this.patch(`/tree/update/${codigo}`, payload);
    }

    // ============================================
    // PERSISTENCE - Load and export
    // ============================================
    async loadTreeFromJSON(file, depthLimit) {
        try {
            if (!depthLimit || depthLimit <= 0) {
                throw new Error('La profundidad máxima debe ser mayor a 0');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('depthLimit', depthLimit);

            const response = await fetch(`${this.baseURL}/persistence/load`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                let errorDetail = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorDetail = errorBody.detail || errorDetail;
                } catch (e) {
                    // If there's no JSON, keep the default message
                }
                throw new Error(errorDetail);
            }
            return await response.json();
        } catch (error) {
            console.error('API loadTreeFromJSON Error:', error);
            throw error;
        }
    }

    async exportTreeToJSON() {
        try {
            const response = await fetch(`${this.baseURL}/persistence/export`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API exportTreeToJSON Error:', error);
            throw error;
        }
    }

    // ============================================
    // METRICS & STRESS
    // ============================================
    async setStressMode(enabled) {
        return this.post('/metrics/stress', { enabled });
    }

    async globalRebalance() {
        return this.post('/metrics/rebalance-global', {});
    }

    async globalRebalanceAnimated() {
        return this.post('/metrics/rebalance-global-animated', {});
    }

    async auditAVL() {
        return this.get('/metrics/audit');
    }

    async setDepthLimit(value) {
        return this.post('/metrics/depth-penalty', { depthLimit: value });
    }

    async removeLeastProfitable() {
        return this.delete('/metrics/least-profitable');
    }

    // ============================================
    // QUEUE
    // ============================================
    async enqueueInsertion(payload) {
        return this.post('/queue/enqueue', payload);
    }

    async getQueue() {
        return this.get('/queue');
    }

    async processQueueWithSteps() {
        return this.post('/queue/process-steps', {});
    }

    // ============================================
    // VERSIONS
    // ============================================
    async saveVersion(name) {
        return this.post('/versions/', { name });
    }

    async listVersions() {
        return this.get('/versions/');
    }

    async restoreVersion(name) {
        return this.post('/versions/restore', { name });
    }
}

// Exported global instance
export const apiClient = new ApiClient();
