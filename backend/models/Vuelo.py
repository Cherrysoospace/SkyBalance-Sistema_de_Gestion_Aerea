from dataclasses import dataclass


@dataclass
class Vuelo:
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
# Dataclass Vuelo