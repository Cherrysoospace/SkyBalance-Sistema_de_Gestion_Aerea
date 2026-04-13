from pydantic import BaseModel


class StressModeSchema(BaseModel):
	"""Payload to enable or disable stress mode."""
	enabled: bool


class DepthLimitSchema(BaseModel):
	"""Payload to set critical depth threshold."""
	depthLimit: int