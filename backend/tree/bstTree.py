 # BST paralelo
 # Clase árbol BST para la administración de los nodos
class BST:

  # Constructor del árbol
  def __init__(self):
    self.root = None

  # Método que permite insertar un nodo en el árbol
  def insert(self, node):
    # verificar si existe una raiz en el árbol
    if self.root is None:
      self.root = node
    else:
      # si existe una raiz, se inicia el proceso de inserción
      self.__insert(self.root, node)

  # Método privado que maneja del recursividad de insertar en el árbol
  def __insert(self, currentRoot, node):
    # Verificar si el valor es igual
    if(node.getValue() == currentRoot.getValue()):
      raise Exception(f"El valor {node.getValue()} ya existe en el árbol.")
    else:
      # Se verifica si el valor a insertar es mayor que el actual raiz
      if(node.getValue() > currentRoot.getValue()):
        # Si no tiene hijo derecho, se asigna el nuevo nodo como hijo derecho,
        # y el padre de ese nuevo nodo será el actual raiz
        if(currentRoot.getRightChild() is None):
          # se asigna en nodo como hijo derecho
          currentRoot.setRightChild(node)
          # se asigna como padre del nuevo nodo a la actual raiz
          node.setParent(currentRoot)
        else:
          # Si tiene hijo derecho, se llama recursivamente al hijo derecho para la inserción del nuevo nodo
          self.__insert(currentRoot.getRightChild(), node)
      else:
        #el valor del nodo a insertar es menor que la actual raiz
        # Si no tiene hijo izquierdo, se asigna el nuevo nodo como hijo izquierdo,
        if currentRoot.getLeftChild() is None:
          # asignar nuevo nodo como hijo isquierdo
          currentRoot.setLeftChild(node)
          # asignar como padre del nuevo nodo al actual raiz
          node.setParent(currentRoot)
        else:
          # Si tiene hijo izquierdo, se llama recursivamente a __insert con el hijo izquierdo como nueva raiz
          self.__insert(currentRoot.getLeftChild(), node)

  # Método de búsqueda de un nodo con base en su valor
  def search(self, value):
    if self.root is None:
      raise Exception("El árbol está vacío.")
    else:
      return self.__search(self.root, value)

  # Método para la búsqueda de manera recursiva
  def __search(self, currentRoot, value):
    if value == currentRoot.getValue():
      return currentRoot
    if value > currentRoot.getValue():
      if currentRoot.getRightChild() is None:
        return None
      else:
        return self.__search(currentRoot.getRightChild(), value)
    else:
      if currentRoot.getLeftChild() is None:
        return None
      else:
        return self.__search(currentRoot.getLeftChild(), value)

  # Método para eliminar un nodo
  # Se deben considerar los 3 casos: no hoja, no con un hijo y nodo con 2 hijos
  def delete(self, value):
    # Verificar si el árbol tiene al menos la raiz
    if self.root is None:
      print("El árbol está vacío.")
    else:
      # Se busca el nodo con el valor
      node = self.search(value)
      # Si no se encuentra el nodo, se debe mostrar el mensaje de error
      if node is None:
        print(f"El nodo con valor {value} no existe en el árbol")
      else:
        self.__delete(node)

  # Método para identificar el caso y eiminar el nodo
  def __delete(self, node):
    deletionCase = self.__identifyDeletionCase(node)
    match deletionCase:
      case 1:
        self.__deleteLeafNode(node)


  # Método para eliminar un nodo hoja (caso 1)
  def __deleteLeafNode(self, node):
    if node.getValue() == self.root.getValue():
      self.root = None
    else:
      parentNode = node.getParent()
      if node.getValue() < parentNode.getValue():
        parentNode.setLeftChild(None)
      else:
        parentNode.setRightChild(None)
      node.setParent(None)


  # Identificar los casos de eliminación
  # caso 1 cuando es nodo hoja
  # caso 2 cuando solo tiene un hijo
  # caso 3 cuando tiene los dos hijos
  def __identifyDeletionCase(self, node):
    # se inicia pensando que es caso 2 (un solo hijo)
    deletionCase = 2
    # se verifica si es hoja y se cmabia el caso a 2
    if node.getLeftChild() is None and node.getRightChild() is None:
      deletionCase = 1
    # sino se verifica si tiene dos hijos y se cambia a caso 3
    elif node.getLeftChild() is not None and node.getRightChild() is not None:
      deletionCase = 3
    return deletionCase


  # Método para recorrido en anchura
  def breadthFirstSearch(self):
    if self.root is None:
      raise Exception("El árbol está vacío.")
    else:
      return self.__breadthFirstSearch(self.root)

  # Método para mostrar el recorrido en anchura
  # se obtiene una lista con los valores de los nodos recorridos
  def __breadthFirstSearch(self, currentRoot):
    queue = []
    result = []
    queue.append(currentRoot)
    while len(queue) > 0:
      currentRoot = queue.pop(0)
      result.append(currentRoot.getValue())
      if currentRoot.getLeftChild() is not None:
        queue.append(currentRoot.getLeftChild())
      if currentRoot.getRightChild() is not None:
        queue.append(currentRoot.getRightChild())
    return result

  # Método para recorrido en profundidad pre-order
  def preOrderTraversal(self):
    if self.root is None:
      raise Exception("El árbol está vacío.")
    else:
      return self.__preOrderTraversal(self.root)

  # Root - Left - Right
  def __preOrderTraversal(self, currentRoot):
    print(currentRoot.getValue())
    if currentRoot.getLeftChild() is not None:
      self.__preOrderTraversal(currentRoot.getLeftChild())
    if currentRoot.getRightChild() is not None:
      self.__preOrderTraversal(currentRoot.getRightChild())

  # Método para recorrido en profundidad in-order

  def inOrderTraversal(self):
    if self.root is None:
      raise Exception("El árbol está vacío.")
    else:
      return self.__inOrderTraversal(self.root)

  # Left - Root - Right
  def __inOrderTraversal(self, currentRoot):
    if currentRoot.getLeftChild() is not None:
      self.__inOrderTraversal(currentRoot.getLeftChild())

    print(currentRoot.getValue())

    if currentRoot.getRightChild() is not None:
      self.__inOrderTraversal(currentRoot.getRightChild())

  # Método para recorrido en profundidad pos-order
  def posOrderTraversal(self):
    if self.root is None:
      raise Exception("El árbol está vacío.")
    else:
      return self.__posOrderTraversal(self.root)

  # Left - Root - Right
  def __posOrderTraversal(self, currentRoot):
    if currentRoot.getLeftChild() is not None:
      self.__posOrderTraversal(currentRoot.getLeftChild())

    if currentRoot.getRightChild() is not None:
      self.__posOrderTraversal(currentRoot.getRightChild())
    print(currentRoot.getValue())

  # Método para calcular la altura de un nodo
  def calculateHeight(self, node):
    if node is None:
      return -1
    else:
      return self.__calculateHeight(node)

  # Método recursivo para calcular la altura de un nodo
  def __calculateHeight(self, currentRoot):
    if currentRoot is None:
      return -1
    else:
      leftHeight = self.__calculateHeight(currentRoot.getLeftChild())
      rightHeight = self.__calculateHeight(currentRoot.getRightChild())
      #print(f"Altura del hijo izquierdo {leftHeight}")
      #print(f"Altura del hijo derecho {rightHeight}")
      maxHeight = max(leftHeight, rightHeight)
      return 1 + maxHeight