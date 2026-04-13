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
		"""Initialize trees, queue, undo stack, and runtime settings."""
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

	def _apply_depth_penalty(self):
		"""Recalculate critical flags and prices in both trees."""
		self.avl.applyDepthPenalty(self.depthLimit)
		self.bst.applyDepthPenalty(self.depthLimit)

	def _insert_in_both_trees(self, payload):
		"""Insert one payload in AVL and BST and return created AVL node."""
		avl_node = Node(payload)
		bst_node = Node(payload)
		self.avl.insert(avl_node)
		self.bst.insert(bst_node)
		return avl_node

	def _build_exception_conflict(self, payload, exc):
		"""Build normalized conflict entry for processing exceptions."""
		return {
			"codigo": payload.get("codigo"),
			"code": payload.get("codigo"),
			"tipo": "exception",
			"type": "exception",
			"error": str(exc),
			"message": str(exc),
		}

	def _append_balance_conflicts(self, payload, balance_conflicts, conflicts):
		"""Append normalized critical-balance conflicts to list."""
		for balance_conflict in balance_conflicts:
			conflicts.append({
				"codigo": payload.get("codigo"),
				"code": payload.get("codigo"),
				"tipo": "critical_balance",
				"type": "critical_balance",
				"detalles": balance_conflict,
				"details": balance_conflict,
			})

	def get_tree(self):
		"""Return serialized AVL tree."""
		return self.avl.toDict()

	def get_metrics(self):
		"""Return current AVL metrics."""
		return self.avl.getMetrics()

	def get_comparison(self):
		"""Return AVL vs BST comparison with basic metrics."""
		# Comparison is only available for insertion mode.
		if self.loadMode == "TOPOLOGIA":
			return {
				"error": "La comparación solo está disponible para carga en modo INSERCION",
				"message": "Se detectó que se cargó una TOPOLOGIA. La comparación solo funciona con INSERCION de vuelos.",
				"mode": "TOPOLOGIA"
			}

		# Return empty trees when nothing is loaded.
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

		# Return standard comparison for insertion mode.
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
		"""Enable or disable stress mode in AVL operations."""
		self.avl.setStressMode(enabled)
		return {"modoEstres": self.avl.getStressMode()}

	def set_depth_limit(self, depth_limit):
		"""
		Set critical depth threshold and recalculate penalties.
		All nodes deeper than limit are marked critical and charged 25% penalty.
		"""
		self.depthLimit = max(0, int(depth_limit))
		self._apply_depth_penalty()
		return {"depthLimit": self.depthLimit}

	def insert_flight(self, payload):
		"""Insert one flight and update penalties."""
		self._push_undo_state()
		self._insert_in_both_trees(payload)
		self._apply_depth_penalty()
		return {"ok": True}

	def delete_node(self, codigo):
		"""Delete one node from both trees by code."""
		self._push_undo_state()
		deleted = self.avl.delete(codigo)
		if deleted:
			self.bst.delete(codigo)
		self._apply_depth_penalty()
		return {"ok": deleted}

	def modify_node(self, codigo, updates):
		"""Update fields of one existing node."""
		self._push_undo_state()
		updated_avl = self.avl.updateNode(codigo, updates)
		if updated_avl:
			self.bst.updateNode(codigo, updates)
			self._apply_depth_penalty()
			return {"ok": True}
		return {"ok": False}

	def cancel_subtree(self, codigo):
		"""Delete subtree rooted at code and rebalance from root automatically."""
		self._push_undo_state()
		response = self.avl.cancelSubtree(codigo)
		if response["removed"] > 0:
			self.bst.delete(codigo)
		self._apply_depth_penalty()
		
		# After canceling, trigger global rebalance from root automatically.
		# Only rebalance if stress mode is off (auto-balance enabled).
		if not self.avl.getStressMode():
			self.avl.rebalanceGlobalStepByStep()
			# Keep BST aligned after rebalance.
			self.bst.loadFromTopology(self.avl.toDict())
			# Reapply depth penalty after rebalancing (tree structure changed, depths may differ).
			self._apply_depth_penalty()
		
		return response

	def undo(self):
		"""Restore last AVL snapshot from undo stack."""
		snapshot = self.undoStack.pop()
		if snapshot is None:
			return {"ok": False, "message": "No actions available to undo."}
		self.avl.loadFromTopology(snapshot)
		self.bst.loadFromTopology(snapshot)
		return {"ok": True}

	def queue_insert(self, payload):
		"""Enqueue one insertion payload."""
		self.queue.enqueue(payload)
		return {"ok": True, "pendientes": self.queue.size()}

	def _process_single_queue_item(self, payload, conflicts, include_steps=False, step_number=0):
		# Save current tree before mutating this item.
		self._push_undo_state()
		# Branch 1: return animation data for frontend when required.
		if include_steps:
			# Store current stress mode to restore it later.
			stress_mode_was_on = self.avl.stressMode
			# Force stress mode so insert does not auto-rotate.
			self.avl.stressMode = True
			# Insert item in AVL and BST and keep inserted AVL node.
			avl_node = self._insert_in_both_trees(payload)
			# Detect imbalances while tree is still unbalanced.
			balance_conflicts = self._detect_critical_balance_conflicts(avl_node)
			# Save pre-rotation tree snapshot for animation.
			tree_pre_rotation = self.avl.toDict()

			# Restore original stress mode.
			self.avl.stressMode = stress_mode_was_on
			# If conflicts exist, run rebalance and store conflict items.
			if balance_conflicts:
				self.avl.rebalanceFromNode(avl_node)
				self._append_balance_conflicts(payload, balance_conflicts, conflicts)

			# Save post-rotation tree snapshot for animation.
			tree_post_rotation = self.avl.toDict()
			# Recalculate critical flags and final prices.
			self._apply_depth_penalty()

			# Return one animation step payload.
			return {
				"step": step_number,
				"codigo_insertado": payload.get("codigo"),
				"inserted_code": payload.get("codigo"),
				"tree_pre_rotation": tree_pre_rotation,
				"tree": tree_post_rotation,
				"tree_post_rotation": tree_post_rotation,
				"metrics": self.avl.getMetrics(),
				"conflictos": len(conflicts),
				"conflicts_count": len(conflicts),
				"balance_criticos": balance_conflicts if balance_conflicts else [],
				"balance_conflicts": balance_conflicts if balance_conflicts else [],
			}

		# Branch 2: standard queue processing without animation payload.
		# Insert item in both trees.
		avl_node = self._insert_in_both_trees(payload)
		# Detect critical balance conflicts.
		balance_conflicts = self._detect_critical_balance_conflicts(avl_node)
		# Append conflict items when they exist.
		if balance_conflicts:
			self._append_balance_conflicts(payload, balance_conflicts, conflicts)
		# Recalculate critical flags and final prices.
		self._apply_depth_penalty()
		# Standard mode does not return step payload.
		return None

	def process_queue(self):
		"""Process queue in normal mode and return summary."""
		processed = 0
		conflicts = []

		while not self.queue.is_empty():
			payload = self.queue.dequeue()
			try:
				self._process_single_queue_item(payload, conflicts)
				processed += 1
			except Exception as exc:
				conflicts.append(self._build_exception_conflict(payload, exc))

		return {
			"processed": processed,
			"conflicts": conflicts,
			"pendientes": self.queue.size(),
			"pending": self.queue.size(),
		}

	def _detect_critical_balance_conflicts(self, node):
		"""Return critical balance nodes from inserted node to root."""
		critical_imbalances = []
		current = node
		
		while current is not None:
			bf = self.avl.getBalanceFactor(current)
			# Critical factor is outside the valid range [-1, 0, 1].
			if bf > 1 or bf < -1:
				critical_imbalances.append({
					"codigo_nodo": current.getValue(),
					"node_code": current.getValue(),
					"factor_balance": bf,
					"balance_factor": bf,
					"altura_izquierda": self.avl.calculateHeight(current.getLeftChild()),
					"left_height": self.avl.calculateHeight(current.getLeftChild()),
					"altura_derecha": self.avl.calculateHeight(current.getRightChild()),
					"right_height": self.avl.calculateHeight(current.getRightChild()),
					"tipo_desbalance": "left_heavy" if bf > 0 else "right_heavy",
					"imbalance_type": "left_heavy" if bf > 0 else "right_heavy"
				})
			current = current.getParent()
		
		return critical_imbalances

	def process_queue_with_steps(self):
		"""Process queue and return steps for animation."""
		steps = []
		processed = 0
		conflicts = []

		while not self.queue.is_empty():
			payload = self.queue.dequeue()
			try:
				processed += 1
				step_data = self._process_single_queue_item(
					payload,
					conflicts,
					include_steps=True,
					step_number=processed,
				)
				steps.append(step_data)
			except Exception as exc:
				conflict_item = self._build_exception_conflict(payload, exc)
				conflicts.append(conflict_item)
				steps.append({
					"step": processed + 1,
					"codigo_insertado": payload.get("codigo"),
					"inserted_code": payload.get("codigo"),
					"tree": self.avl.toDict(),
					"metrics": self.avl.getMetrics(),
					"conflictos": len(conflicts),
					"conflicts_count": len(conflicts),
					"conflicto": conflict_item,
					"conflict": conflict_item,
				})

		return {
			"processed": processed,
			"conflicts": conflicts,
			"steps": steps,
			"pendientes": self.queue.size(),
			"pending": self.queue.size(),
		}

	def load_demo_conflict_scenario(self):
		"""Load a simple scenario with deterministic balance conflicts."""
		# Reset state.
		self.avl = AVL()
		self.bst = BST()
		self.queue = InsertionQueue()
		self.undoStack = ActionStack()
		
		# Values designed to trigger imbalances.
		demo_flights = [
			{"codigo": "SB050", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB025", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB075", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB010", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
			{"codigo": "SB100", "origen": "Bogota", "destino": "Cali", "horaSalida": "06:00", "pasajeros": 100, "precioBase": 100, "precioFinal": 100, "promocion": 0, "prioridad": 1},
		]
		
		# Enqueue all demo items.
		for flight in demo_flights:
			self.queue_insert(flight)
		
		# Process and return animation steps.
		return self.process_queue_with_steps()

	def get_queue(self):
		"""Return queue size and queue items."""
		return {
			"pendientes": self.queue.size(),
			"items": self.queue.to_list(),
		}

	# Load tree from insertion, topology, or export mode.
	def load_from_json_data(self, data):
		"""Load JSON payload in INSERCION, TOPOLOGIA, or SYSTEM_EXPORT mode."""
		self._push_undo_state()

		# Clear both trees before loading new content.
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
			nodos_count = len(parsed_data)
			for nodo_vuelo in parsed_data:
				payload = nodo_vuelo.to_dict(include_tree=False)
				self._insert_in_both_trees(payload)

			self._apply_depth_penalty()
			self.loadMode = "INSERCION"
			return {"mode": "INSERCION", "nodos": nodos_count}

		elif format_type == "TOPOLOGIA":
			# parsed_data is NodoVuelo (root)
			topology_dict = parsed_data.to_dict(include_tree=True) if parsed_data else None
			self.avl.loadFromTopology(topology_dict)
			self.bst.loadFromTopology(topology_dict)
			nodos_count = len(self.avl.breadthFirstSearch()) if self.avl.getRoot() else 0
			self._apply_depth_penalty()
			self.loadMode = "TOPOLOGIA"
			return {"mode": "TOPOLOGIA", "nodos": nodos_count}

		elif format_type == "SYSTEM_EXPORT":
			# parsed_data is NodoVuelo (root), historical_metrics is Dict
			topology_dict = parsed_data.to_dict(include_tree=True) if parsed_data else None
			self.avl.loadFromTopology(topology_dict)
			self.bst.loadFromTopology(topology_dict)

			# Restore historical metrics when present.
			if historical_metrics:
				self.avl.restoreHistoricalMetrics(historical_metrics)

			nodos_count = len(self.avl.breadthFirstSearch()) if self.avl.getRoot() else 0
			self._apply_depth_penalty()
			self.loadMode = "SYSTEM_EXPORT"
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
		"""
		Create and save a named snapshot of current tree state.
		Snapshot is deep-copied to prevent external mutations.
		"""
		snapshot = self.avl.toDict()
		version = Version(name, snapshot)
		self.versions[name] = version
		return version.to_dict()

	def list_versions(self):
		"""
		Return list of all saved version names and their timestamps.
		Does not include full snapshots to optimize response size.
		"""
		return [
			{"name": version.name, "timestamp": version.timestamp}
			for version in self.versions.values()
		]

	def restore_version(self, name):
		"""
		Load a named snapshot into both AVL and BST trees.
		Pushes current tree state to undo stack before restoration.
		"""
		version = self.versions.get(name)
		if version is None:
			return {"ok": False, "message": "Version not found."}
		self._push_undo_state()
		self.avl.loadFromTopology(deepcopy(version.snapshot))
		self.bst.loadFromTopology(deepcopy(version.snapshot))
		return {"ok": True, "name": name}

	def delete_version(self, name):
		"""
		Remove a saved version checkpoint from store.
		Throws error if version not found.
		"""
		if name not in self.versions:
			return {"ok": False, "message": "Version not found."}
		del self.versions[name]
		return {"ok": True, "name": name}

	def verify_avl(self):
		"""Return AVL property verification report."""
		return self.avl.verifyAVLProperty()

	def rebalance_global(self):
		"""Run full AVL global rebalance and sync BST."""
		self._push_undo_state()
		response = self.avl.rebalanceGlobal()
		# Keep BST aligned after AVL rebalance.
		self.bst.loadFromTopology(self.avl.toDict())
		self._apply_depth_penalty()
		return response

	def rebalance_global_animated(self):
		"""Run global rebalance and return snapshots for animation."""
		self._push_undo_state()
		response = self.avl.rebalanceGlobalStepByStep()

		# Keep BST aligned after AVL rebalance.
		self.bst.loadFromTopology(self.avl.toDict())
		self._apply_depth_penalty()
		return response

	def remove_least_profitable(self):
		"""Remove least-profitable AVL subtree and sync BST."""
		self._push_undo_state()
		response = self.avl.removeLeastProfitableSubtree()
		# Keep BST aligned after AVL subtree removal.
		self.bst.loadFromTopology(self.avl.toDict())
		self._apply_depth_penalty()
		return response


treeService = TreeService()