# Clase árbol AVL para la administración de los nodos
class AVL:

  # Constructor del árbol
  def __init__(self):
    self.root = None

  # método para obtener la raiz del árbol
  def getRoot(self):
    return self.root

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
          # asignar el padre
          node.setParent(currentRoot)
          # verificar el balance del árbol
          self.__checkBalance(node)
        else:
          # Si tiene hijo derecho, se llama recursivamente al hijo derecho para la inserción del nuevo nodo
          self.__insert(currentRoot.getRightChild(), node)
      else:
        #el valor del nodo a insertar es menor que la actual raiz
        # Si no tiene hijo izquierdo, se asigna el nuevo nodo como hijo izquierdo,
        if currentRoot.getLeftChild() is None:
          # asignar nuevo nodo como hijo isquierdo
          currentRoot.setLeftChild(node)
          # asignar el padre
          node.setParent(currentRoot)
          # verificar el balance del árbol
          self.__checkBalance(node)
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

      case 2:
        self.__deleteNodeWithOneChild(node)

      case 3:
        self.__deleteNodeWithTwoChildren(node)

  # Método para eliminar un nodo que tiene dos hijos (caso 3)
  def __deleteNodeWithTwoChildren(self, node):

    # se obtiene el predecesor del nodo a eliminar
    predecessor = self.__getPredecessor(node)

    # se copia el valor del predecesor en el nodo actual
    node.setValue(predecessor.getValue())

    # se identifica el caso de eliminación del predecesor
    predecessorCase = self.__identifyDeletionCase(predecessor)

    # si el predecesor es hoja
    if predecessorCase == 1:
      self.__deleteLeafNode(predecessor)

    # si el predecesor tiene un hijo
    else:
      self.__deleteNodeWithOneChild(predecessor)


  # Método para obtener el predecesor inorden de un nodo
  # el predecesor es el mayor valor del subárbol izquierdo
  def __getPredecessor(self, node):

    # se inicia desde el hijo izquierdo del nodo
    current = node.getLeftChild()

    # se avanza hacia la derecha hasta encontrar el mayor valor
    # del subárbol izquierdo
    while current.getRightChild() is not None:
      current = current.getRightChild()

    # se retorna el nodo predecesor encontrado
    return current


  # Método para eliminar un nodo que tiene un solo hijo (caso 2)
  def __deleteNodeWithOneChild(self, node):

    # se obtiene el hijo del nodo a eliminar
    if node.getLeftChild() is not None:
      childNode = node.getLeftChild()
    else:
      childNode = node.getRightChild()

    # se obtiene el padre del nodo que se va a eliminar
    parentNode = node.getParent()

    # si el nodo a eliminar es la raiz, el hijo pasa a ser la nueva raiz
    if parentNode is None:
      self.root = childNode
      childNode.setParent(None)

    else:

      # se verifica si el nodo a eliminar es hijo izquierdo o derecho
      if parentNode.getLeftChild() == node:
        parentNode.setLeftChild(childNode)
      else:
        parentNode.setRightChild(childNode)

      # se reasigna el padre del hijo
      childNode.setParent(parentNode)

    # se eliminan las referencias del nodo eliminado
    node.setLeftChild(None)
    node.setRightChild(None)
    node.setParent(None)


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
    # se verifica si es hoja y se cmabia el caso a 1
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

  # Método para detectar si hay desbalanceo en el nodo -1 <= bf <= 1
  def getBalanceFactor(self, node):
    leftChildHeight = self.calculateHeight(node.getLeftChild())
    rightChildHeight = self.calculateHeight(node.getRightChild())
    bf = leftChildHeight - rightChildHeight
    return bf

  # Método que verifica el balanceo de un árbol y si está desbalanceado ejecuta el proceso de balanceo
  def __checkBalance(self, node):
    # Obtiene el nodo padre del nodo actual.
    # El rebalanceo en AVL se revisa hacia arriba en el árbol
    parentNode = node.getParent()

    # Si el nodo no tiene padre significa que llegamos a la raíz
    # En ese caso ya no hay más nodos que revisar
    if parentNode is None:
      return

    # Calcula el factor de balance del nodo padre
    # BF = altura(subárbol izquierdo) - altura(subárbol derecho)
    bf = self.getBalanceFactor(parentNode)

    # Si el factor de balance está fuera del rango permitido [-1,1]
    # significa que el nodo está desbalanceado
    if bf > 1 or bf < -1:
      # Se ejecuta el proceso de rebalanceo
      # (rotaciones según el caso: LL, RR, LR, RL)
      self.__rebalance(parentNode, bf)

    # Continúa verificando el balance hacia arriba en el árbol
    # ahora revisando el padre del nodo actual
    self.__checkBalance(parentNode)


  # Método para balancear el árbol, identificando la dirección del desbalanceo con positivos por izquierda y negativos por derecha
  def __rebalance(self, node, bf):
    rebalanceCase = self.__identifyRebalanceCase(node, bf)
    match rebalanceCase:
      case "LL":
        self.__balanceLL(node)
      case "RR":
        self.__balanceRR(node)
      case "LR":
        self.__balanceLR(node)
      case "RL":
        self.__balanceRL(node)

  # Método para el balanceo de tipo LR
  def __balanceLR(self, topNode):
    raise Exception("No implementado")


  # Método para el balanceo de tipo RL
  def __balanceRL(self, topNode):
    raise Exception("No implementado")

  # Método para el balanceo de tipo LL
  def __balanceLL(self, topNode):
    # se obtiene el hijo izquierdo del superior
    middleNode = topNode.getLeftChild()

    # se obtiene el padre del nodo superior (puede que sea la raiz y no tenga padre, es decir que es None)
    topNodeParent = topNode.getParent()
    # se obtiene el hijo derecho del nodo de la mitad para pasarlo luego al topNode que baja como hijo derecho del nodo de la mitad
    rightChildOfMiddle = middleNode.getRightChild()

    # el nodo superior baja como hijo derecho del nodo de la mitad
    middleNode.setRightChild(topNode)
    topNode.setParent(middleNode)

    # reasignar el padre del superior al de la mitad
    middleNode.setParent(topNodeParent )
    # verificar si el topNode es la raiz, parent es el padre del nodo de arriba
    if topNodeParent is None:
      self.root = middleNode
    else:
      # si es nodo intermedio, se debe verificar si el parentNode es hijo izquierdo o derecho de su padre y así ajustar las referencias con middlename
      if topNodeParent.getLeftChild() == topNode:
        topNodeParent.setLeftChild(middleNode)
      else:
        topNodeParent.setRightChild(middleNode)


    # reasignar el hijo derecho del nodo de la mitad como hijo izquierdo del nodo de arriba
    topNode.setLeftChild(rightChildOfMiddle)
    if rightChildOfMiddle is not None:
      rightChildOfMiddle.setParent(topNode)

  # Método para el balanceo de tipo RR
  def __balanceRR(self, topNode):
    # se obtiene el hijo derecho del superior
    middleNode = topNode.getRightChild()

    # se obtiene el padre del nodo superior (puede que sea la raiz y no tenga padre, es decir que es None)
    topNodeParent = topNode.getParent()
    # se obtiene el hijo izquierdo del nodo de la mitad para pasarlo luego al topNode que baja como hijo izquierdo del nodo de la mitad
    leftChildOfMiddle = middleNode.getLeftChild()

    # el nodo superior baja como hijo izquierdo del nodo de la mitad
    middleNode.setLeftChild(topNode)
    topNode.setParent(middleNode)

    # reasignar el padre del superior al de la mitad
    middleNode.setParent(topNodeParent)
    # verificar si el topNode es la raiz, parent es el padre del nodo de arriba
    if topNodeParent is None:
      self.root = middleNode
    else:
      # si es nodo intermedio, se debe verificar si el parentNode es hijo izquierdo o derecho de su padre y así ajustar las referencias con middlename
      if topNodeParent.getLeftChild() == topNode:
        topNodeParent.setLeftChild(middleNode)
      else:
        topNodeParent.setRightChild(middleNode)

    # reasignar el hijo izquierdo del nodo de la mitad como hijo derecho del nodo de arriba
    topNode.setRightChild(x)
    if leftChildOfMiddle is not None:
      leftChildOfMiddle.setParent(topNode)


  # Método para identificar el caso de desbalanceo
  def __identifyRebalanceCase(self, node, bf):
    rebalanceCase = ""
    # desbalanceo positivo (L)
    if bf > 0:
      childBf = self.getBalanceFactor(node.getLeftChild())
      # caso L-L
      if childBf > 0:
        rebalanceCase = "LL"
      # caso L-R
      else:
        rebalanceCase = "LR"
    # desbalanceo negativo (R)
    else:
      childBf = self.getBalanceFactor(node.getRightChild())
      # caso RL
      if childBf > 0:
        rebalanceCase = "RL"
      # caso RR
      else:
        rebalanceCase = "RR"
    return rebalanceCase

  # Método para dibujar el árbol en forma de árbol
  def print_tree(self):
    if self.root is None:
      print("El árbol está vacío.")
    else:
      self.__print_tree(self.root, "", True)


  # Methodo para imprimir el árbold AVL
  def __print_tree(self, node=None, prefix="", is_left=True):
      if node is not None:
          # Print right subtree
          if node.getRightChild():
              new_prefix = prefix + ("│   " if is_left else "    ")
              self.__print_tree(node.getRightChild(), new_prefix, False)

          # Print current node
          connector = "└── " if is_left else "┌── "
          print(prefix + connector + str(node.getValue()))

          # Print left subtree
          if node.getLeftChild():
              new_prefix = prefix + ("    " if is_left else "│   ")
              self.__print_tree(node.getLeftChild(), new_prefix, True)