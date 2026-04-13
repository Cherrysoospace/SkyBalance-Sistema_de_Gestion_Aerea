from pydantic import BaseModel


class VersionSchema(BaseModel):
	"""Payload that identifies one saved version by name."""
	name: str