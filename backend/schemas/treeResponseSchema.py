from pydantic import BaseModel


class TreeResponseSchema(BaseModel):
	"""Standard response wrapper with tree and metrics."""
	tree: dict | None
	metrics: dict