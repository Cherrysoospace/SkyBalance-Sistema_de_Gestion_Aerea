from copy import deepcopy

from models.Version import Version
from services.PersistenceService import persistenceService
from tree.actionStack import ActionStack
from tree.avlTree import AVL
from tree.bstTree import BST
from tree.insertionQueue import InsertionQueue
from tree.nodo import Node


# Central business service used by routers.
class TreeService:

	def __init__(self):
		self.avl = AVL()
		self.bst = BST()
		self.undoStack = ActionStack()
		self.queue = InsertionQueue()
		self.versions = {}
		self.depthLimit = 3
		self.loadMode = None  # Track current load mode: INSERCION, TOPOLOGIA, SYSTEM_EXPORT

	# Saves the full tree snapshot before mutating operations.
	def _push_undo_state(self):
		self.undoStack.push(self.avl.toDict())

	def get_tree(self):
		return self.avl.toDict()

	def get_metrics(self):
		return self.avl.getMetrics()

	def get_comparison(self):
		"""Devuelve una comparación entre AVL y BST con sus métricas"""
		# Validar que se cargó en modo INSERCION
		if self.loadMode == "TOPOLOGIA":
			return {
				"error": "La comparación solo está disponible para carga en modo INSERCION",
				"message": "Se detectó que se cargó una TOPOLOGIA. La comparación solo funciona con INSERCION de vuelos.",
				"mode": "TOPOLOGIA"
			}

		# Si no se ha cargado nada aún, retornar estructura vacía
		if self.loadMode is None:
			return {
				"avl": {
					"tree": self.avl.toDict(),
					"metrics": {
						"raiz": self.avl.getRoot().getValue() if self.avl.getRoot() is not None else None,
						"profundidad": self.avl.calculateHeight(self.avl.getRoot()),
						"hojas": self.avl.countLeaves(),
						"alturaActual": self.avl.calculateHeight(self.avl.getRoot()),
					}
				},
				"bst": {
					"tree": self.bst.toDict(),
					"metrics": {
						"raiz": self.bst.getRoot().getValue() if self.bst.getRoot() is not None else None,
						"profundidad": self.bst.calculateHeight(self.bst.getRoot()),
						"hojas": self.bst.countLeaves(),
						"alturaActual": self.bst.calculateHeight(self.bst.getRoot()),
					}
				}
			}

		# Retornar comparación normal para INSERCION
		return {
			"avl": {
				"tree": self.avl.toDict(),
				"metrics": {
					"raiz": self.avl.getRoot().getValue() if self.avl.getRoot() is not None else None,
					"profundidad": self.avl.calculateHeight(self.avl.getRoot()),
					"hojas": self.avl.countLeaves(),
					"alturaActual": self.avl.calculateHeight(self.avl.getRoot()),
				}
			},
			"bst": {
				"tree": self.bst.toDict(),
				"metrics": {
					"raiz": self.bst.getRoot().getValue() if self.bst.getRoot() is not None else None,
					"profundidad": self.bst.calculateHeight(self.bst.getRoot()),
					"hojas": self.bst.countLeaves(),
					"alturaActual": self.bst.calculateHeight(self.bst.getRoot()),
				}
			}
		}

	def set_stress_mode(self, enabled):
		self.avl.setStressMode(enabled)
		return {"modoEstres": self.avl.getStressMode()}

	def set_depth_limit(self, depth_limit):
		self.depthLimit = max(0, int(depth_limit))
		self.avl.applyDepthPenalty(self.depthLimit)
		self.bst.applyDepthPenalty(self.depthLimit)
		return {"depthLimit": self.depthLimit}

	def insert_flight(self, payload):
		self._push_undo_state()
		avl_node = Node(payload)
		bst_node = Node(payload)
		self.avl.insert(avl_node)
		self.bst.insert(bst_node)
		self.avl.applyDepthPenalty(self.depthLimit)
		self.bst.applyDepthPenalty(self.depthLimit)
		return {"ok": True}

	def delete_node(self, codigo):
		self._push_undo_state()
		deleted = self.avl.delete(codigo)
		if deleted:
			self.bst.delete(codigo)
		self.avl.applyDepthPenalty(self.depthLimit)
		self.bst.applyDepthPenalty(self.depthLimit)
		return {"ok": deleted}

	def modify_node(self, codigo, updates):
		"""Modifica los campos de un nodo existente."""
		self._push_undo_state()
		updated_avl = self.avl.updateNode(codigo, updates)
		if updated_avl:
			self.bst.updateNode(codigo, updates)
			self.avl.applyDepthPenalty(self.depthLimit)
			self.bst.applyDepthPenalty(self.depthLimit)
			return {"ok": True}
		return {"ok": False}

	def cancel_subtree(self, codigo):
		self._push_undo_state()
		response = self.avl.cancelSubtree(codigo)
		if response["removed"] > 0:
			self.bst.delete(codigo)
		self.avl.applyDepthPenalty(self.depthLimit)
		self.bst.applyDepthPenalty(self.depthLimit)
		return response

	def undo(self):
		snapshot = self.undoStack.pop()
		if snapshot is None:
			return {"ok": False, "message": "No hay acciones para deshacer."}
		self.avl.loadFromTopology(snapshot)
		self.bst.loadFromTopology(snapshot)
		return {"ok": True}

	def queue_insert(self, payload):
		self.queue.enqueue(payload)
		return {"ok": True, "pendientes": self.queue.size()}

	def process_queue(self):
		processed = 0
		conflicts = []

		while not self.queue.is_empty():
			payload = self.queue.dequeue()
			try:
				self._push_undo_state()
				avl_node = Node(payload)
				bst_node = Node(payload)
				self.avl.insert(avl_node)
				self.bst.insert(bst_node)
				processed += 1
				
				# 🔍 DETECCIÓN DE CONFLICTOS DE BALANCE CRÍTICO
				balance_conflicts = self._detect_critical_balance_conflicts(avl_node)
				if balance_conflicts:
					for balance_conflict in balance_conflicts:
						conflict_item = {
							"codigo": payload.get("codigo"),
							"tipo": "balance_crítico",
							"detalles": balance_conflict
						}
						conflicts.append(conflict_item)
				
				self.avl.applyDepthPenalty(self.depthLimit)
			except Exception as exc:
				conflict_item = {
					"codigo": payload.get("codigo"),
					"tipo": "excepción",
					"error": str(exc)
				}
				conflicts.append(conflict_item)

		return {
			"processed": processed,
			"conflicts": conflicts,
			"pendientes": self.queue.size(),
		}

	def _detect_critical_balance_conflicts(self, node):
		"""
		Verifica el camino desde el nodo insertado hacia la raíz,
		detectando nodos con factor de balance crítico (±2 o peor).
		Retorna una lista de conflictos detectados.
		"""
		critical_imbalances = []
		current = node
		
		while current is not None:
			bf = self.avl.getBalanceFactor(current)
			# Factor de balance crítico: fuera del rango [-1, 0, 1]
			if bf > 1 or bf < -1:
				critical_imbalances.append({
					"codigo_nodo": current.getValue(),
					"factor_balance": bf,
					"altura_izquierda": self.avl.calculateHeight(current.getLeftChild()),
					"altura_derecha": self.avl.calculateHeight(current.getRightChild()),
					"tipo_desbalance": "izquierda pesada" if bf > 0 else "derecha pesada"
				})
			current = current.getParent()
		
		return critical_imbalances

	def process_queue_with_steps(self):
		"""Procesa la cola pero retorna pasos intermedios para animación."""
		steps = []
		processed = 0
		conflicts = []

		while not self.queue.is_empty():
			payload = self.queue.dequeue()
			try:
				self._push_undo_state()
				avl_node = Node(payload)
				bst_node = Node(payload)
				
				# ACTIVAR STRESS MODE: Insertar SIN rebalancear automáticamente
				stress_mode_was_on = self.avl.stressMode
				self.avl.stressMode = True
				
				# Insertar nodo en stress mode (sin rotaciones automáticas)
				self.avl.insert(avl_node)
				self.bst.insert(bst_node)
				
				# 🔍 DETECTAR CONFLICTOS DE BALANCE mientras el árbol aún está desbalanceado
				balance_conflicts = self._detect_critical_balance_conflicts(avl_node)
				
				# ✅ CAPTURAR ESTADO PRE-ROTACIÓN (desbalanceado)
				tree_pre_rotation = self.avl.toDict()
				
				# DESACTIVAR STRESS MODE y aplicar rebalanceo si hay conflictos
				self.avl.stressMode = stress_mode_was_on
				if balance_conflicts:
					# Si hay conflictos, aplicar checkBalance para rebalancear
					self.avl._AVL__checkBalance(avl_node)
					for balance_conflict in balance_conflicts:
						conflict_item = {
							"codigo": payload.get("codigo"),
							"tipo": "balance_crítico",
							"detalles": balance_conflict
						}
						conflicts.append(conflict_item)
				
				# ✅ CAPTURAR ESTADO POST-ROTACIÓN (balanceado)
				tree_post_rotation = self.avl.toDict()
				
				processed += 1
				self.avl.applyDepthPenalty(self.depthLimit)

				# Capturar estado intermediario con AMBOS estados (pre y post rotación)
				step_data = {
					"step": processed,
					"codigo_insertado": payload.get("codigo"),
					"tree_pre_rotation": tree_pre_rotation,  # Estado ANTES de rotaciones
					"tree": tree_post_rotation,              # Estado DESPUÉS de rotaciones (para compatibilidad)
					"tree_post_rotation": tree_post_rotation, # Estado DESPUÉS de rotaciones (explícito)
					"metrics": self.avl.getMetrics(),
					"conflictos": len(conflicts),
					"balance_criticos": balance_conflicts if balance_conflicts else [],  # Array vacío si no hay
				}
				
				steps.append(step_data)
			except Exception as exc:
				conflict_item = {
					"codigo": payload.get("codigo"),
					"tipo": "excepción",
					"error": str(exc)
				}
				conflicts.append(conflict_item)
				steps.append({
					"step": processed + 1,
					"codigo_insertado": payload.get("codigo"),
					"tree": self.avl.toDict(),
					"metrics": self.avl.getMetrics(),
					"conflictos": len(conflicts),
					"conflicto": conflict_item,
				})

		return {
			"processed": processed,
			"conflicts": conflicts,
			"steps": steps,
			"pendientes": self.queue.size(),
		}

	def load_demo_conflict_scenario(self):
		"""
		Carga un escenario de demostración con datos que causarán desbalance observable.
		Simula inserciones secuenciales sin rebalanceo para visualizar conflictos.
		"""
		# Limpiar estado actual
		self.avl = AVL()
		self.bst = BST()
		self.queue = InsertionQueue()
		self.undoStack = ActionStack()
		
		# Datos que causarán desbalance en ambos lados
		# El truco: usar códigos que generen búsqueda descendente/ascendente
		demo_flights = [
			{"codigo": "SB050", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB025", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB075", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB010", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB100", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
		]
		
		# Encolar todos
		for flight in demo_flights:
			self.queue_insert(flight)
		
		# Procesar y retornar con steps para animación
		return self.process_queue_with_steps()

	def get_queue(self):
		return {
			"pendientes": self.queue.size(),
			"items": self.queue.to_list(),
		}

	# Loads tree from insertion list mode or topology mode.
	def load_from_json_data(self, data):
		self._push_undo_state()

		# LIMPIAR AMBOS ÁRBOLES antes de cargar nuevos datos
		self.avl.clear()
		self.bst.clear()

		# Use unified parser to detect format and parse
		try:
			format_type, parsed_data, historical_metrics = persistenceService.parse_json(data)
		except ValueError as e:
			raise ValueError(f"Error parsing JSON: {str(e)}")

		# Handle each format
		if format_type == "INSERCION":
			# parsed_data is List[NodoVuelo]
			# Insert each vuelo individually (with rebalancing)
			nodos_count = len(parsed_data)
			for nodo_vuelo in parsed_data:
				# Convert NodoVuelo to dict for Node constructor
				payload = nodo_vuelo.to_dict(include_tree=False)
				node = Node(payload)
				self.avl.insert(node)
				bst_node = Node(payload)
				self.bst.insert(bst_node)

			self.avl.applyDepthPenalty(self.depthLimit)
			self.bst.applyDepthPenalty(self.depthLimit)
			self.loadMode = "INSERCION"  # Set load mode
			return {"mode": "INSERCION", "nodos": nodos_count}

		elif format_type == "TOPOLOGIA":
			# parsed_data is NodoVuelo (root)
			# Load pre-built structure (no rebalancing)
			topology_dict = parsed_data.to_dict(include_tree=True) if parsed_data else None
			self.avl.loadFromTopology(topology_dict)
			self.bst.loadFromTopology(topology_dict)
			nodos_count = len(self.avl.breadthFirstSearch()) if self.avl.getRoot() else 0
			self.avl.applyDepthPenalty(self.depthLimit)
			self.bst.applyDepthPenalty(self.depthLimit)
			self.loadMode = "TOPOLOGIA"  # Set load mode
			return {"mode": "TOPOLOGIA", "nodos": nodos_count}

		elif format_type == "SYSTEM_EXPORT":
			# parsed_data is NodoVuelo (root), historical_metrics is Dict
			# Load topology first
			topology_dict = parsed_data.to_dict(include_tree=True) if parsed_data else None
			self.avl.loadFromTopology(topology_dict)
			self.bst.loadFromTopology(topology_dict)

			# Restore historical metrics (rotations, cancelations, etc.)
			if historical_metrics:
				self.avl.restoreHistoricalMetrics(historical_metrics)

			nodos_count = len(self.avl.breadthFirstSearch()) if self.avl.getRoot() else 0
			self.avl.applyDepthPenalty(self.depthLimit)
			self.bst.applyDepthPenalty(self.depthLimit)
			self.loadMode = "SYSTEM_EXPORT"  # Set load mode
			return {"mode": "SYSTEM_EXPORT", "nodos": nodos_count, "metrics_restored": True}

		else:
			raise ValueError(f"Unknown format type: {format_type}")

	def export_json(self):
		"""
		Export tree and metrics in unified Format 3 (SYSTEM_EXPORT).

		Returns:
			Dict with 'tree' (structure) and 'metrics' (historical + structural).
		"""
		return {
			"tree": self.avl.toDict(),
			"metrics": self.avl.getMetrics()
		}

	def save_version(self, name):
		snapshot = self.avl.toDict()
		version = Version(name, snapshot)
		self.versions[name] = version
		return version.to_dict()

	def list_versions(self):
		result = []
		for version in self.versions.values():
			result.append({"name": version.name, "timestamp": version.timestamp})
		return result

	def restore_version(self, name):
		version = self.versions.get(name)
		if version is None:
			return {"ok": False, "message": "Versión no encontrada."}
		self._push_undo_state()
		self.avl.loadFromTopology(deepcopy(version.snapshot))
		self.bst.loadFromTopology(deepcopy(version.snapshot))
		return {"ok": True, "name": name}

	def verify_avl(self):
		return self.avl.verifyAVLProperty()

	def rebalance_global(self):
		self._push_undo_state()
		response = self.avl.rebalanceGlobal()
		# Sincronizar BST con el nuevo estado del AVL
		self.bst.loadFromTopology(self.avl.toDict())
		self.avl.applyDepthPenalty(self.depthLimit)
		return response

	def rebalance_global_animated(self):
		"""Rebalanceo global pero retornando snapshots para animación paso a paso."""
		self._push_undo_state()
		response = self.avl.rebalanceGlobalStepByStep()
		
		# DEBUG: Loguear información
		import sys
		print(f"✅ DEBUG rebalance_global_animated - Total pasos: {len(response.get('steps', []))}", file=sys.stderr)
		if response.get('steps'):
			print(f"   Primer paso: {response['steps'][0]}", file=sys.stderr)
		
		# Sincronizar BST con el nuevo estado del AVL
		self.bst.loadFromTopology(self.avl.toDict())
		self.avl.applyDepthPenalty(self.depthLimit)
		return response

	def remove_least_profitable(self):
		self._push_undo_state()
		response = self.avl.removeLeastProfitableSubtree()
		# Sincronizar BST con el nuevo estado del AVL
		self.bst.loadFromTopology(self.avl.toDict())
		self.avl.applyDepthPenalty(self.depthLimit)
		return response


treeService = TreeService()