from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NodoVuelo:
    """
    Unified internal representation of a flight node.

    This class serves as the contract between PersistenceService (JSON parsing)
    and TreeService (tree operations). It represents all fields that can exist
    in the three JSON formats (INSERCION, TOPOLOGIA, SYSTEM_EXPORT).

    Structural metrics (altura, factorEquilibrio) are placeholders—they are
    always recalculated from tree structure, never loaded from JSON.
    """

    # Flight identification and routing
    codigo: str
    origen: str
    destino: str
    horaSalida: str

    # Pricing
    precioBase: float
    precioFinal: float

    # Flight details
    pasajeros: int
    promocion: bool = False
    alerta: bool = False
    prioridad: int = 1
    critico: bool = False

    # Structural metrics (recalculated, not loaded)
    altura: int = 0
    factorEquilibrio: int = 0

    # Tree structure
    izquierdo: Optional['NodoVuelo'] = None
    derecho: Optional['NodoVuelo'] = None

    def to_dict(self, include_tree: bool = True) -> dict:
        """
        Convert to dictionary for tree operations.

        Args:
            include_tree: If True, recursively include child nodes.
                         If False, only include flight fields.

        Returns:
            Dictionary with flight fields and optionally tree structure.
        """
        result = {
            'codigo': self.codigo,
            'origen': self.origen,
            'destino': self.destino,
            'horaSalida': self.horaSalida,
            'precioBase': self.precioBase,
            'precioFinal': self.precioFinal,
            'pasajeros': self.pasajeros,
            'promocion': self.promocion,
            'alerta': self.alerta,
            'prioridad': self.prioridad,
            'critico': self.critico,
            'altura': self.altura,
            'factorEquilibrio': self.factorEquilibrio,
        }

        if include_tree:
            result['izquierdo'] = self.izquierdo.to_dict() if self.izquierdo else None
            result['derecho'] = self.derecho.to_dict() if self.derecho else None

        return result

    @staticmethod
    def from_dict(data: dict) -> 'NodoVuelo':
        """
        Create NodoVuelo from dictionary (used during tree reconstruction).

        This is primarily for internal use after parsing.
        Normalizes tipos but does NOT normalize codigo or prioridad—
        that happens in the parsers.
        """
        if data is None:
            return None

        # Extract children recursively
        left = NodoVuelo.from_dict(data.get('izquierdo') or data.get('left'))
        right = NodoVuelo.from_dict(data.get('derecho') or data.get('right'))

        return NodoVuelo(
            codigo=str(data.get('codigo', '')),
            origen=str(data.get('origen', '')),
            destino=str(data.get('destino', '')),
            horaSalida=str(data.get('horaSalida', '')),
            precioBase=float(data.get('precioBase', 0)),
            precioFinal=float(data.get('precioFinal', data.get('precioBase', 0))),
            pasajeros=int(data.get('pasajeros', 0)),
            promocion=bool(data.get('promocion', False)),
            alerta=bool(data.get('alerta', False)),
            prioridad=int(data.get('prioridad', 1)),
            critico=bool(data.get('critico', False)),
            altura=int(data.get('altura', 0)),
            factorEquilibrio=int(data.get('factorEquilibrio', 0)),
            izquierdo=left,
            derecho=right,
        )
