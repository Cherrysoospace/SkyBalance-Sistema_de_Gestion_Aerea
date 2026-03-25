from pydantic import BaseModel


class StressModeSchema(BaseModel):
	enabled: bool


class DepthLimitSchema(BaseModel):
	depthLimit: int
# DTO con métricas analíticas del árbol en tiempo real