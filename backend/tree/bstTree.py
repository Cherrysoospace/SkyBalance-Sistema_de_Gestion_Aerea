# Parallel BST used for comparison with AVL.
from tree.nodo import Node


class BST:

  # Initialize empty BST.
  def __init__(self):
    self.root = None

  # Insert one node using BST ordering rules.
  def insert(self, node):
    if self.root is None:
      self.root = node
    else:
      self.__insert(self.root, node)

  # Recursive insert helper.
  def __insert(self, currentRoot, node):
    comparison = self.__compareCodes(node.getValue(), currentRoot.getValue())
    if(comparison == 0):
      raise Exception(f"Value {node.getValue()} already exists in tree")
    else:
      if(comparison > 0):
        if(currentRoot.getRightChild() is None):
          currentRoot.setRightChild(node)
          node.setParent(currentRoot)
        else:
          self.__insert(currentRoot.getRightChild(), node)
      else:
        if currentRoot.getLeftChild() is None:
          currentRoot.setLeftChild(node)
          node.setParent(currentRoot)
        else:
          self.__insert(currentRoot.getLeftChild(), node)

  # Search one node by code.
  def search(self, value):
    if self.root is None:
      raise Exception("Tree is empty")
    else:
      return self.__search(self.root, value)

  # Recursive search helper.
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

  # Delete one node by value.
  def delete(self, value):
    if self.root is None:
      print("Tree is empty")
    else:
      node = self.search(value)
      if node is None:
        print(f"Node with value {value} does not exist")
      else:
        self.__delete(node)

  def updateNode(self, codigo, updates):
    """Update one existing node payload."""
    try:
      target = self.search(codigo)
      if target is None:
        return False

      # Update only allowed fields.
      allowed_fields = {"origen", "destino", "horaSalida", "pasajeros", "precioBase", "promocion", "prioridad", "alerta"}
      for key, value in updates.items():
        if key in allowed_fields:
          if key == "pasajeros":
            target.pasajeros = int(value)
          elif key == "precioBase":
            target.precioBase = float(value)
          elif key in ("promocion", "alerta"):
            setattr(target, key, bool(value))
          elif key == "prioridad":
            target.prioridad = int(value)
          else:
            setattr(target, key, str(value))

      target.recalculatePrecioFinal()

      return True
    except:
      return False

  # Pick deletion case and dispatch handler.
  def __delete(self, node):
    deletionCase = self.__identifyDeletionCase(node)
    match deletionCase:
      case 1:
        self.__deleteLeafNode(node)


  # Delete leaf node case.
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


  # Identify deletion case: leaf, one child, or two children.
  def __identifyDeletionCase(self, node):
    deletionCase = 2
    if node.getLeftChild() is None and node.getRightChild() is None:
      deletionCase = 1
    elif node.getLeftChild() is not None and node.getRightChild() is not None:
      deletionCase = 3
    return deletionCase


  # Breadth-first traversal.
  def breadthFirstSearch(self):
    if self.root is None:
      raise Exception("Tree is empty")
    else:
      return self.__breadthFirstSearch(self.root)

  # Breadth-first traversal helper.
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

  # Pre-order traversal.
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

  # In-order traversal.
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

  # Post-order traversal.
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

  # Return node height.
  def calculateHeight(self, node):
    if node is None:
      return -1
    else:
      return self.__calculateHeight(node)

  # Recursive height helper.
  def __calculateHeight(self, currentRoot):
    if currentRoot is None:
      return -1
    else:
      leftHeight = self.__calculateHeight(currentRoot.getLeftChild())
      rightHeight = self.__calculateHeight(currentRoot.getRightChild())
      maxHeight = max(leftHeight, rightHeight)
      return 1 + maxHeight

  # Return current root.
  def getRoot(self):
    return self.root

  # Count leaf nodes.
  def countLeaves(self):
    return self.__countLeaves(self.root)

  # Recursive leaf counter.
  def __countLeaves(self, node):
    if node is None:
      return 0
    if node.getLeftChild() is None and node.getRightChild() is None:
      return 1
    return self.__countLeaves(node.getLeftChild()) + self.__countLeaves(node.getRightChild())

  # Serialize tree to D3-friendly structure.
  def toDict(self):
    return self.__serializeNode(self.root)

  # Recursive serializer.
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
  
  # Apply depth-based critical flag and price penalty.
  def applyDepthPenalty(self, depthLimit):
    self.__applyDepthPenalty(self.root, 0, depthLimit)

  def __applyDepthPenalty(self, node, depth, depthLimit):
    if node is None:
      return

    if depth > depthLimit:
      node.critico = True
    else:
      node.critico = False

    node.recalculatePrecioFinal()

    self.__applyDepthPenalty(node.getLeftChild(), depth + 1, depthLimit)
    self.__applyDepthPenalty(node.getRightChild(), depth + 1, depthLimit)

  # Clear tree content.
  def clear(self):
    self.root = None

  # Load tree from topology payload.
  def loadFromTopology(self, data):
    self.clear()
    self.root = self.__buildNodeFromTopology(data, None)

  # Recursive topology loader.
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