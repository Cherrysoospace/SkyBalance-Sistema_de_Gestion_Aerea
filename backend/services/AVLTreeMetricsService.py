class AVLTreeMetricsService:

	def calculate_height(self, node):
		if node is None:
			return -1
		return 1 + max(self.calculate_height(node.getLeftChild()), self.calculate_height(node.getRightChild()))

	def breadth_first_search(self, root):
		if root is None:
			return []

		queue = [root]
		result = []
		while len(queue) > 0:
			current = queue.pop(0)
			result.append(current.getValue())
			if current.getLeftChild() is not None:
				queue.append(current.getLeftChild())
			if current.getRightChild() is not None:
				queue.append(current.getRightChild())
		return result

	def pre_order_traversal(self, root):
		result = []
		self.__pre_order(root, result)
		return result

	def __pre_order(self, node, result):
		if node is None:
			return
		result.append(node.getValue())
		self.__pre_order(node.getLeftChild(), result)
		self.__pre_order(node.getRightChild(), result)

	def in_order_traversal(self, root):
		result = []
		self.__in_order(root, result)
		return result

	def __in_order(self, node, result):
		if node is None:
			return
		self.__in_order(node.getLeftChild(), result)
		result.append(node.getValue())
		self.__in_order(node.getRightChild(), result)

	def pos_order_traversal(self, root):
		result = []
		self.__post_order(root, result)
		return result

	def __post_order(self, node, result):
		if node is None:
			return
		self.__post_order(node.getLeftChild(), result)
		self.__post_order(node.getRightChild(), result)
		result.append(node.getValue())

	def count_leaves(self, root):
		return self.__count_leaves(root)

	def __count_leaves(self, node):
		if node is None:
			return 0
		if node.getLeftChild() is None and node.getRightChild() is None:
			return 1
		return self.__count_leaves(node.getLeftChild()) + self.__count_leaves(node.getRightChild())

	def serialize_node(self, node, calculate_height, get_balance_factor):
		if node is None:
			return None

		return {
			"codigo": node.codigo,
			"origen": node.origen,
			"destino": node.destino,
			"horaSalida": node.horaSalida,
			"pasajeros": node.pasajeros,
			"precioBase": node.precioBase,
			"precioFinal": node.precioFinal,
			"promocion": node.promocion,
			"prioridad": node.prioridad,
			"critico": node.critico,
			"alerta": node.alerta,
			"altura": calculate_height(node),
			"factorEquilibrio": get_balance_factor(node),
			"izquierdo": self.serialize_node(node.getLeftChild(), calculate_height, get_balance_factor),
			"derecho": self.serialize_node(node.getRightChild(), calculate_height, get_balance_factor),
		}

	def build_metrics(self, tree):
		root = tree.getRoot()
		return {
			"alturaActual": self.calculate_height(root),
			"hojas": self.count_leaves(root),
			"bfs": self.breadth_first_search(root),
			"dfs": {
				"preOrder": self.pre_order_traversal(root),
				"inOrder": self.in_order_traversal(root),
				"posOrder": self.pos_order_traversal(root),
			},
			"rotaciones": tree.rotationCounts,
			"rotacionesDetallado": {
				"sesionActual": tree.rotationCounts,
				"historico": tree.rotationCountsHistorical,
				"ultimoRebalanceoGlobal": tree.rotationCountsLastGlobalRebalance,
			},
			"cancelacionesMasivas": tree.massCancelations,
			"modoEstres": tree.stressMode,
		}

	def print_tree(self, root):
		if root is None:
			print("El árbol está vacío.")
			return
		self.__print_tree(root, "", True)

	def __print_tree(self, node=None, prefix="", is_left=True):
		if node is None:
			return

		if node.getRightChild() is not None:
			new_prefix = prefix + ("│   " if is_left else "    ")
			self.__print_tree(node.getRightChild(), new_prefix, False)

		connector = "└── " if is_left else "┌── "
		print(prefix + connector + str(node.getValue()))

		if node.getLeftChild() is not None:
			new_prefix = prefix + ("    " if is_left else "│   ")
			self.__print_tree(node.getLeftChild(), new_prefix, True)


avlTreeMetricsService = AVLTreeMetricsService()