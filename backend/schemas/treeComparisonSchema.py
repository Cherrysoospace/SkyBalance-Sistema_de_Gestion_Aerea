from pydantic import BaseModel
from typing import Optional


class TreeMetricsSchema(BaseModel):
	"""Metrics for one tree."""
	raiz: Optional[str]
	profundidad: int
	hojas: int
	alturaActual: int


class TreeStructureSchema(BaseModel):
	"""Serialized tree plus metrics."""
	tree: Optional[dict]
	metrics: TreeMetricsSchema


class TreeComparisonResponseSchema(BaseModel):
	"""Comparison response between AVL and BST."""
	avl: TreeStructureSchema
	bst: TreeStructureSchema
