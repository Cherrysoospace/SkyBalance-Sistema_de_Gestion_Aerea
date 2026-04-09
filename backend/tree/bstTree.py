 # BST paralelo
# Clase árbol BST para la administración de los nodos
from tree.nodo import Node


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
    comparison = self.__compareCodes(node.getValue(), currentRoot.getValue())
    if(comparison == 0):
      raise Exception(f"El valor {node.getValue()} ya existe en el árbol.")
    else:
      # Se verifica si el valor a insertar es mayor que el actual raiz
      if(comparison > 0):
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
    comparison = self.__compareCodes(value, currentRoot.getValue())
    if comparison == 0:
      return currentRoot
    if comparison > 0:
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

  def updateNode(self, codigo, updates):
    """Busca un nodo por código y actualiza sus campos."""
    try:
      target = self.search(codigo)
      if target is None:
        return False

      # Actualizar campos permitidos
      allowed_fields = {"origen", "destino", "horaSalida", "pasajeros", "precioBase", "promocion", "prioridad", "alerta"}
      for key, value in updates.items():
        if key in allowed_fields:
          if key == "pasajeros":
            target.pasajeros = int(value)
          elif key == "precioBase":
            target.precioBase = float(value)
            target.precioFinal = float(value)
          elif key in ("promocion", "alerta"):
            setattr(target, key, bool(value))
          elif key == "prioridad":
            target.prioridad = int(value)
          else:
            setattr(target, key, str(value))

      return True
    except:
      return False

  # Método para identificar el caso y eiminar el nodo
  def __delete(self, node):
    deletionCase = self.__identifyDeletionCase(node)
    match deletionCase:
      case 1:
        self.__deleteLeafNode(node)


  # Método para eliminar un nodo hoja (caso 1)
  def __deleteLeafNode(self, node):
    if self.__compareCodes(node.getValue(), self.root.getValue()) == 0:
      self.root = None
    else:
      parentNode = node.getParent()
      if self.__compareCodes(node.getValue(), parentNode.getValue()) < 0:
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
    result = []
    if self.root is not None:
      self.__preOrderTraversal(self.root, result)
    return result

  # Root - Left - Right
  def __preOrderTraversal(self, currentRoot, result):
    if currentRoot is None:
      return
    result.append(currentRoot.getValue())
    self.__preOrderTraversal(currentRoot.getLeftChild(), result)
    self.__preOrderTraversal(currentRoot.getRightChild(), result)

  # Método para recorrido en profundidad in-order
  def inOrderTraversal(self):
    result = []
    if self.root is not None:
      self.__inOrderTraversal(self.root, result)
    return result

  # Left - Root - Right
  def __inOrderTraversal(self, currentRoot, result):
    if currentRoot is None:
      return
    self.__inOrderTraversal(currentRoot.getLeftChild(), result)
    result.append(currentRoot.getValue())
    self.__inOrderTraversal(currentRoot.getRightChild(), result)

  # Método para recorrido en profundidad pos-order
  def posOrderTraversal(self):
    result = []
    if self.root is not None:
      self.__posOrderTraversal(self.root, result)
    return result

  # Left - Right - Root
  def __posOrderTraversal(self, currentRoot, result):
    if currentRoot is None:
      return
    self.__posOrderTraversal(currentRoot.getLeftChild(), result)
    self.__posOrderTraversal(currentRoot.getRightChild(), result)
    result.append(currentRoot.getValue())

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

  # Método para obtener la raiz del árbol
  def getRoot(self):
    return self.root

  # Método para contar las hojas del árbol
  def countLeaves(self):
    return self.__countLeaves(self.root)

  # Método recursivo para contar hojas
  def __countLeaves(self, node):
    if node is None:
      return 0
    if node.getLeftChild() is None and node.getRightChild() is None:
      return 1
    return self.__countLeaves(node.getLeftChild()) + self.__countLeaves(node.getRightChild())

  # Método para serializar el árbol a un diccionario D3-friendly
  def toDict(self):
    return self.__serializeNode(self.root)

  # Método recursivo para serializar nodos
  def __serializeNode(self, node):
    if node is None:
      return None

    return {
      "codigo": node.codigo,
      "origen": node.origen,
      "destino": node.destino,
      "horaSalida": node.horaSalida,
      "pasajeros": node.pasajeros,
      "precioBase": node.precioBase,
      "precioFinal": node.precioFinal,
      "promocion": node.promocion,
      "prioridad": node.prioridad,
      "critico": node.critico,
      "alerta": node.alerta,
      "altura": self.calculateHeight(node),
      "factorEquilibrio": 0,
      "izquierdo": self.__serializeNode(node.getLeftChild()),
      "derecho": self.__serializeNode(node.getRightChild()),
    }

  def __compareCodes(self, left, right):
    return self.__codeKey(left) - self.__codeKey(right)

  def __codeKey(self, value):
    if isinstance(value, (int, float)):
      return int(value)

    if isinstance(value, str):
      stripped = value.strip().upper()
      if stripped.startswith("SB") and stripped[2:].isdigit():
        return int(stripped[2:])
      if stripped.isdigit():
        return int(stripped)

    try:
      return int(str(value))
    except Exception:
      return 0

  # Método para obtener métricas del árbol
  def getMetrics(self):
    return {
      "alturaActual": self.calculateHeight(self.root),
      "hojas": self.countLeaves(),
      "bfs": self.breadthFirstSearch() if self.root is not None else [],
      "dfs": {
        "preOrder": self.preOrderTraversal() if self.root is not None else [],
        "inOrder": self.inOrderTraversal() if self.root is not None else [],
        "posOrder": self.posOrderTraversal() if self.root is not None else [],
      },
    }

  # Aplica penalidad de precio por profundidad (similar a AVL)
  def applyDepthPenalty(self, depthLimit):
    self.__applyDepthPenalty(self.root, 0, depthLimit)

  def __applyDepthPenalty(self, node, depth, depthLimit):
    if node is None:
      return

    if depth > depthLimit:
      node.critico = True
      node.precioFinal = round(node.precioBase * 1.25, 2)
    else:
      node.critico = False
      node.precioFinal = node.precioBase

    self.__applyDepthPenalty(node.getLeftChild(), depth + 1, depthLimit)
    self.__applyDepthPenalty(node.getRightChild(), depth + 1, depthLimit)

  # Método para limpiar el árbol
  def clear(self):
    self.root = None

  # Método para cargar árbol desde topología (serialización)
  def loadFromTopology(self, data):
    self.clear()
    self.root = self.__buildNodeFromTopology(data, None)

  # Método recursivo para construir árbol desde topología
  def __buildNodeFromTopology(self, data, parent):
    if data is None:
      return None

    payload = {
      "codigo": data.get("codigo"),
      "origen": data.get("origen", ""),
      "destino": data.get("destino", ""),
      "horaSalida": data.get("horaSalida", ""),
      "pasajeros": data.get("pasajeros", 0),
      "precioBase": data.get("precioBase", 0),
      "precioFinal": data.get("precioFinal", data.get("precioBase", 0)),
      "promocion": data.get("promocion", False),
      "prioridad": data.get("prioridad", 0),
      "critico": data.get("critico", False),
      "alerta": data.get("alerta", False),
    }

    node = Node(payload)
    node.setParent(parent)

    leftNode = self.__buildNodeFromTopology(data.get("izquierdo"), node)
    rightNode = self.__buildNodeFromTopology(data.get("derecho"), node)
    node.setLeftChild(leftNode)
    node.setRightChild(rightNode)

    return node