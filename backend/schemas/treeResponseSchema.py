from pydantic import BaseModel


class TreeResponseSchema(BaseModel):
	tree: dict | None
	metrics: dict
# DTO de respuesta con el árbol AVL serializado y sus propiedades