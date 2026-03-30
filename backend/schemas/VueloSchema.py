from pydantic import BaseModel


class VueloRequestSchema(BaseModel):
	"""Schema para crear/actualizar vuelos (entrada del cliente)"""
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
	"""Schema para respuestas de lectura (salida hacia cliente)"""
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


# Mantenemos VueloSchema como alias por compatibilidad
VueloSchema = VueloRequestSchema