from copy import deepcopy

from models.Version import Version
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

	# Saves the full tree snapshot before mutating operations.
	def _push_undo_state(self):
		self.undoStack.push(self.avl.toDict())

	def get_tree(self):
		return self.avl.toDict()

	def get_metrics(self):
		return self.avl.getMetrics()

	def get_comparison(self):
		"""Devuelve una comparación entre AVL y BST con sus métricas"""
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
		return {"depthLimit": self.depthLimit}

	def insert_flight(self, payload):
		self._push_undo_state()
		avl_node = Node(payload)
		bst_node = Node(payload)
		self.avl.insert(avl_node)
		self.bst.insert(bst_node)
		self.avl.applyDepthPenalty(self.depthLimit)
		return {"ok": True}

	def delete_node(self, codigo):
		self._push_undo_state()
		deleted = self.avl.delete(codigo)
		if deleted:
			self.bst.delete(codigo)
		self.avl.applyDepthPenalty(self.depthLimit)
		return {"ok": deleted}

	def modify_node(self, codigo, updates):
		"""Modifica los campos de un nodo existente."""
		self._push_undo_state()
		updated_avl = self.avl.updateNode(codigo, updates)
		if updated_avl:
			self.bst.updateNode(codigo, updates)
			self.avl.applyDepthPenalty(self.depthLimit)
			return {"ok": True}
		return {"ok": False}

	def cancel_subtree(self, codigo):
		self._push_undo_state()
		response = self.avl.cancelSubtree(codigo)
		if response["removed"] > 0:
			self.bst.delete(codigo)
		self.avl.applyDepthPenalty(self.depthLimit)
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
			except Exception as exc:
				conflicts.append({"codigo": payload.get("codigo"), "error": str(exc)})

		self.avl.applyDepthPenalty(self.depthLimit)
		return {
			"processed": processed,
			"conflicts": conflicts,
			"pendientes": self.queue.size(),
		}

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
				self.avl.insert(avl_node)
				self.bst.insert(bst_node)
				processed += 1
				self.avl.applyDepthPenalty(self.depthLimit)

				# Capturar estado intermediario
				steps.append({
					"step": processed,
					"codigo_insertado": payload.get("codigo"),
					"tree": self.avl.toDict(),
					"metrics": self.avl.getMetrics(),
					"conflictos": len(conflicts),
				})
			except Exception as exc:
				conflict_item = {"codigo": payload.get("codigo"), "error": str(exc)}
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

	def get_queue(self):
		return {
			"pendientes": self.queue.size(),
			"items": self.queue.to_list(),
		}

	# Loads tree from insertion list mode or topology mode.
	def load_from_json_data(self, data):
		self._push_undo_state()

		if isinstance(data, dict) and data.get("tipo", "").upper() == "INSERCION":
			vuelos = data.get("vuelos", [])
			self.avl.loadFromInsertionList(vuelos)
			self.bst.clear()
			for vuelo in vuelos:
				node = Node(vuelo)
				self.bst.insert(node)
			self.avl.applyDepthPenalty(self.depthLimit)
			return {"mode": "INSERCION", "nodos": len(vuelos)}

		# Fallback to topology mode.
		self.avl.loadFromTopology(data)
		self.bst.loadFromTopology(data)
		self.avl.applyDepthPenalty(self.depthLimit)
		return {"mode": "TOPOLOGIA", "nodos": len(self.avl.breadthFirstSearch())}

	def export_json(self):
		return self.avl.toDict()

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