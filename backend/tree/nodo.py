# Clase que permite instanciar Nodos para alimentar un árbol.
class Node:
  # El constructor permite la asignación de un valor
  # También inicia tanto el padre como los hijos en None
  def __init__(self, value):
    self.value = value
    self.parent = None
    self.leftChild = None
    self.rightChild = None

  # Método que permite asignar un padre al nodo
  # recibe la referencia al nodo padre que va a ser asignado
  def setParent(self, parentNode):
    self.parent = parentNode

  # Método que permite obtener la referencia al padre del nodo
  def getParent(self):
    return self.parent

  # Método que permite asignar un hijo izquierdo al nodo
  # se recibe la referencia al hijo que se va a asignar
  def setLeftChild(self, leftChildNode):
    self.leftChild = leftChildNode

  # Método para obtener la referencia al hijo izquiero del nodo
  def getLeftChild(self):
    return self.leftChild

  # Método que permite asignar un hijo derecho al nodo
  # se recibe la referencia al hijo que se va a asignar
  def setRightChild(self, rightChildNode):
    self.rightChild = rightChildNode

  # Método para obtener la referencia al hijo derecho del nodo
  def getRightChild(self):
    return self.rightChild

  # Método para obtener el valor del nodo
  def getValue(self):
    return self.value
