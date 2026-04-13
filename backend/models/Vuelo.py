from dataclasses import dataclass


@dataclass
class Vuelo:
	"""Simple DTO representing one flight payload."""
	codigo: int
	origen: str
	destino: str
	pasajeros: int
	precioBase: float
	precioFinal: float
	promocion: bool = False
	prioridad: int = 0
	critico: bool = False
	alerta: bool = False