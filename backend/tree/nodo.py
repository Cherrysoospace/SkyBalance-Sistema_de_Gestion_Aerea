# Node model used by AVL/BST. It keeps tree references and flight attributes.
class Node:
  PROMOTION_DISCOUNT_RATE = 0.10
  CRITICAL_PENALTY_RATE = 0.25

  # The constructor accepts either a raw value or a flight-like dict.
  def __init__(self, value=None, **kwargs):
    if isinstance(value, dict):
      kwargs = {**value, **kwargs}
      value = kwargs.get("codigo")

    self.value = value
    self.codigo = kwargs.get("codigo", value)
    self.origen = kwargs.get("origen", "")
    self.destino = kwargs.get("destino", "")
    self.horaSalida = kwargs.get("horaSalida", "")
    self.pasajeros = int(kwargs.get("pasajeros", 0))
    self.precioBase = float(kwargs.get("precioBase", 0))
    self.promocion = bool(kwargs.get("promocion", False))
    self.prioridad = int(kwargs.get("prioridad", 0))
    self.critico = bool(kwargs.get("critico", False))
    self.alerta = bool(kwargs.get("alerta", False))
    self.precioFinal = self.calculatePrecioFinal()

    self.parent = None
    self.leftChild = None
    self.rightChild = None

  # Parent reference helpers.
  def setParent(self, parentNode):
    """Set parent reference."""
    self.parent = parentNode

  def getParent(self):
    """Return parent reference."""
    return self.parent

  # Left child reference helpers.
  def setLeftChild(self, leftChildNode):
    """Set left child reference."""
    self.leftChild = leftChildNode

  def getLeftChild(self):
    """Return left child reference."""
    return self.leftChild

  # Right child reference helpers.
  def setRightChild(self, rightChildNode):
    """Set right child reference."""
    self.rightChild = rightChildNode

  def getRightChild(self):
    """Return right child reference."""
    return self.rightChild

  # Key used by tree operations.
  def getValue(self):
    """Return key used for tree ordering."""
    return self.value

  # Setter required by delete-with-predecessor flow.
  def setValue(self, value):
    """Update key value and synchronized code field."""
    self.value = value
    self.codigo = value

  # Copies only the payload from another node (not tree references).
  def copyPayloadFrom(self, otherNode):
    self.value = otherNode.value
    self.codigo = otherNode.codigo
    self.origen = otherNode.origen
    self.destino = otherNode.destino
    self.horaSalida = otherNode.horaSalida
    self.pasajeros = otherNode.pasajeros
    self.precioBase = otherNode.precioBase
    self.precioFinal = otherNode.precioFinal
    self.promocion = otherNode.promocion
    self.prioridad = otherNode.prioridad
    self.critico = otherNode.critico
    self.alerta = otherNode.alerta

  # Flight payload as dictionary for serialization/API responses.
  def toFlightDict(self):
    return {
      "codigo": self.codigo,
      "origen": self.origen,
      "destino": self.destino,
      "horaSalida": self.horaSalida,
      "pasajeros": self.pasajeros,
      "precioBase": self.precioBase,
      "precioFinal": self.precioFinal,
      "promocion": self.promocion,
      "prioridad": self.prioridad,
      "critico": self.critico,
      "alerta": self.alerta,
    }

  # Centralized pricing rule used by both trees.
  def calculatePrecioFinal(self):
    precio_final = float(self.precioBase)

    if self.critico:
      precio_final *= (1 + self.CRITICAL_PENALTY_RATE)

    if self.promocion:
      precio_final *= (1 - self.PROMOTION_DISCOUNT_RATE)

    return round(precio_final, 2)

  def recalculatePrecioFinal(self):
    """Recompute and store final price based on current flags."""
    self.precioFinal = self.calculatePrecioFinal()
