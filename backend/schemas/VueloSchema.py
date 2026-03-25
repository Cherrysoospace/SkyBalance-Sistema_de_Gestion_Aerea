from pydantic import BaseModel


class VueloSchema(BaseModel):
	codigo: int
	origen: str
	destino: str
	pasajeros: int = 0
	precioBase: float = 0
	precioFinal: float | None = None
	promocion: bool = False
	prioridad: int = 0
	critico: bool = False
	alerta: bool = False
# DTO de entrada/salida para datos de un vuelo individual