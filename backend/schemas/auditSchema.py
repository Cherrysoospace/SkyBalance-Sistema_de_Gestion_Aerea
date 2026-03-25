from pydantic import BaseModel


class VersionSchema(BaseModel):
	name: str
# DTO con el reporte de verificación de la propiedad AVL