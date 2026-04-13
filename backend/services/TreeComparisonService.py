class TreeComparisonService:

	def _build_tree_summary(self, tree):
		"""Build the comparison payload for one tree."""
		root = tree.getRoot()
		return {
			"tree": tree.toDict(),
			"metrics": {
				"raiz": root.getValue() if root is not None else None,
				"profundidad": tree.calculateHeight(root),
				"hojas": tree.countLeaves(),
				"alturaActual": tree.calculateHeight(root),
			},
		}

	def get_comparison(self, avl_tree, bst_tree, load_mode):
		"""Return AVL vs BST comparison payload with structural metrics."""
		if load_mode == "TOPOLOGIA":
			return {
				"error": "La comparación solo está disponible para carga en modo INSERCION",
				"message": "Se detectó que se cargó una TOPOLOGIA. La comparación solo funciona con INSERCION de vuelos.",
				"mode": "TOPOLOGIA",
			}

		return {
			"avl": self._build_tree_summary(avl_tree),
			"bst": self._build_tree_summary(bst_tree),
		}


treeComparisonService = TreeComparisonService()