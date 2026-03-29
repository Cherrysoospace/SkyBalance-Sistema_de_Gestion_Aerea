from pydantic import BaseModel
from typing import Optional


class TreeMetricsSchema(BaseModel):
	"""Métricas específicas de un árbol"""
	raiz: Optional[str]
	profundidad: int
	hojas: int
	alturaActual: int


class TreeStructureSchema(BaseModel):
	"""Estructura de un árbol serializado"""
	tree: Optional[dict]
	metrics: TreeMetricsSchema


class TreeComparisonResponseSchema(BaseModel):
	"""Respuesta de comparación entre AVL y BST con gráficos y propiedades"""
	avl: TreeStructureSchema
	bst: TreeStructureSchema
	# DTO para devolver la comparación entre AVL y BST con sus estructuras, gráficos y propiedades
