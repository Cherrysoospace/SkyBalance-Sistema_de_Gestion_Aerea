from copy import deepcopy

from models.Version import Version
from tree.actionStack import ActionStack
from tree.avlTree import AVL
from tree.insertionQueue import InsertionQueue
from tree.nodo import Node


# Central business service used by routers.
class TreeService:

	def __init__(self):
		self.avl = AVL()
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

	def set_stress_mode(self, enabled):
		self.avl.setStressMode(enabled)
		return {"modoEstres": self.avl.getStressMode()}

	def set_depth_limit(self, depth_limit):
		self.depthLimit = max(0, int(depth_limit))
		self.avl.applyDepthPenalty(self.depthLimit)
		return {"depthLimit": self.depthLimit}

	def insert_flight(self, payload):
		self._push_undo_state()
		node = Node(payload)
		self.avl.insert(node)
		self.avl.applyDepthPenalty(self.depthLimit)
		return {"ok": True}

	def delete_node(self, codigo):
		self._push_undo_state()
		deleted = self.avl.delete(codigo)
		self.avl.applyDepthPenalty(self.depthLimit)
		return {"ok": deleted}

	def cancel_subtree(self, codigo):
		self._push_undo_state()
		response = self.avl.cancelSubtree(codigo)
		self.avl.applyDepthPenalty(self.depthLimit)
		return response

	def undo(self):
		snapshot = self.undoStack.pop()
		if snapshot is None:
			return {"ok": False, "message": "No hay acciones para deshacer."}
		self.avl.loadFromTopology(snapshot)
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
				self.avl.insert(Node(payload))
				processed += 1
			except Exception as exc:
				conflicts.append({"codigo": payload.get("codigo"), "error": str(exc)})

		self.avl.applyDepthPenalty(self.depthLimit)
		return {
			"processed": processed,
			"conflicts": conflicts,
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
			self.avl.applyDepthPenalty(self.depthLimit)
			return {"mode": "INSERCION", "nodos": len(vuelos)}

		# Fallback to topology mode.
		self.avl.loadFromTopology(data)
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
		return {"ok": True, "name": name}

	def verify_avl(self):
		return self.avl.verifyAVLProperty()

	def rebalance_global(self):
		self._push_undo_state()
		response = self.avl.rebalanceGlobal()
		self.avl.applyDepthPenalty(self.depthLimit)
		return response

	def remove_least_profitable(self):
		self._push_undo_state()
		response = self.avl.removeLeastProfitableSubtree()
		self.avl.applyDepthPenalty(self.depthLimit)
		return response


treeService = TreeService()