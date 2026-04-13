from pydantic import BaseModel


class VueloRequestSchema(BaseModel):
	"""Input schema used to create or update flights."""
	codigo: str
	origen: str
	destino: str
	horaSalida: str = ""
	pasajeros: int = 0
	precioBase: float = 0
	promocion: bool = False
	prioridad: int = 0
	alerta: bool = False


class VueloResponseSchema(BaseModel):
	"""Output schema used for flight read responses."""
	codigo: str
	origen: str
	destino: str
	horaSalida: str
	pasajeros: int
	precioBase: float
	precioFinal: float
	promocion: bool
	prioridad: int
	critico: bool
	alerta: bool
	altura: int | None = None
	factorEquilibrio: int | None = None


# Keep alias for backward compatibility.
VueloSchema = VueloRequestSchema