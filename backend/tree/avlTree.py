from tree.nodo import Node
from services.AVLAuditService import AVLAuditService


# AVL tree used as the core structure for SkyBalance.
class AVL:

  def __init__(self):
    self.root = None
    self.stressMode = False
    # Contadores de rotaciones - ahora con trazabilidad separada
    self.rotationCounts = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}
    self.rotationCountsHistorical = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}  # Acumulativo total
    self.rotationCountsStressMode = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}  # Durante stress mode
    self.rotationCountsLastGlobalRebalance = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}  # Último rebalanceo global
    self.massCancelations = 0
    # Inyección de dependencia: servicio de auditoría (Principio D - SOLID)
    self.auditService = AVLAuditService()

  def getRoot(self):
    return self.root

  def setStressMode(self, enabled):
    self.stressMode = bool(enabled)

  def getStressMode(self):
    return self.stressMode

  # Inserts a node and rebalances unless stress mode is enabled.
  def insert(self, node):
    if self.root is None:
      self.root = node
      return

    inserted = self.__insert(self.root, node)
    if not self.stressMode:
      self.__checkBalance(inserted)

  def __insert(self, currentRoot, node):
    if node.getValue() == currentRoot.getValue():
      raise Exception(f"El valor {node.getValue()} ya existe en el árbol.")

    if node.getValue() < currentRoot.getValue():
      if currentRoot.getLeftChild() is None:
        currentRoot.setLeftChild(node)
        node.setParent(currentRoot)
        return node
      return self.__insert(currentRoot.getLeftChild(), node)

    if currentRoot.getRightChild() is None:
      currentRoot.setRightChild(node)
      node.setParent(currentRoot)
      return node
    return self.__insert(currentRoot.getRightChild(), node)

  def search(self, value):
    if self.root is None:
      return None
    return self.__search(self.root, value)

  def __search(self, currentRoot, value):
    if currentRoot is None:
      return None
    if value == currentRoot.getValue():
      return currentRoot
    if value < currentRoot.getValue():
      return self.__search(currentRoot.getLeftChild(), value)
    return self.__search(currentRoot.getRightChild(), value)

  # Standard AVL deletion using predecessor when the node has two children.
  def delete(self, value):
    target = self.search(value)
    if target is None:
      return False
    self.__deleteNode(target)
    return True

  def updateNode(self, codigo, updates):
    """Busca un nodo por código y actualiza sus campos, rebalanceando si es necesario."""
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
          target.precioFinal = float(value)  # Resetear precioFinal
        elif key in ("promocion", "alerta"):
          setattr(target, key, bool(value))
        elif key == "prioridad":
          target.prioridad = int(value)
        else:
          setattr(target, key, str(value))

    # Rebalancear si no estamos en stress mode
    if not self.stressMode:
      self.__checkBalance(target)

    return True

  def __deleteNode(self, node):
    if node.getLeftChild() is not None and node.getRightChild() is not None:
      predecessor = self.__getPredecessor(node)
      node.copyPayloadFrom(predecessor)
      node = predecessor

    parent = node.getParent()
    replacement = node.getLeftChild() if node.getLeftChild() is not None else node.getRightChild()

    if replacement is not None:
      replacement.setParent(parent)

    if parent is None:
      self.root = replacement
    elif parent.getLeftChild() == node:
      parent.setLeftChild(replacement)
    else:
      parent.setRightChild(replacement)

    node.setLeftChild(None)
    node.setRightChild(None)
    node.setParent(None)

    if not self.stressMode:
      self.__checkBalance(parent if parent is not None else self.root)

  def __getPredecessor(self, node):
    current = node.getLeftChild()
    while current.getRightChild() is not None:
      current = current.getRightChild()
    return current

  # Removes a node and every descendant under it.
  def cancelSubtree(self, value):
    target = self.search(value)
    if target is None:
      return {"removed": 0}

    removedCount = self.__countNodes(target)
    parent = target.getParent()

    if parent is None:
      self.root = None
    elif parent.getLeftChild() == target:
      parent.setLeftChild(None)
    else:
      parent.setRightChild(None)

    target.setParent(None)
    self.massCancelations += 1

    if not self.stressMode and parent is not None:
      self.__checkBalance(parent)

    return {"removed": removedCount}

  def __countNodes(self, node):
    if node is None:
      return 0
    return 1 + self.__countNodes(node.getLeftChild()) + self.__countNodes(node.getRightChild())

  # Height utilities.
  def calculateHeight(self, node):
    if node is None:
      return -1
    return 1 + max(self.calculateHeight(node.getLeftChild()), self.calculateHeight(node.getRightChild()))

  def getBalanceFactor(self, node):
    if node is None:
      return 0
    return self.calculateHeight(node.getLeftChild()) - self.calculateHeight(node.getRightChild())

  # Traverses upward from a node and restores AVL balance.
  def __checkBalance(self, node):
    current = node
    while current is not None:
      bf = self.getBalanceFactor(current)
      if bf > 1 or bf < -1:
        current = self.__rebalance(current, bf)
      current = current.getParent()

  def __rebalance(self, node, bf):
    caseName = self.__identifyRebalanceCase(node, bf)
    if caseName == "LL":
      self.rotationCounts["LL"] += 1
      return self.__balanceLL(node)
    if caseName == "RR":
      self.rotationCounts["RR"] += 1
      return self.__balanceRR(node)
    if caseName == "LR":
      self.rotationCounts["LR"] += 1
      return self.__balanceLR(node)
    self.rotationCounts["RL"] += 1
    return self.__balanceRL(node)

  def __rebalanceWithTracking(self, node, bf, rotations):
    """Realiza rebalanceo registrando cada rotación sin duplicar conteo."""
    caseName = self.__identifyRebalanceCase(node, bf)
    
    # Registrar la rotación
    rotations.append({"type": caseName, "node_codigo": node.codigo})
    
    # Incrementar contadores
    self.rotationCountsLastGlobalRebalance[caseName] += 1
    self.rotationCounts[caseName] += 1
    
    # Ejecutar la rotación
    if caseName == "LL":
      return self.__balanceLL(node)
    elif caseName == "RR":
      return self.__balanceRR(node)
    elif caseName == "LR":
      return self.__balanceLR(node)
    else:  # RL
      return self.__balanceRL(node)

  def __identifyRebalanceCase(self, node, bf):
    if bf > 0:
      childBf = self.getBalanceFactor(node.getLeftChild())
      if childBf >= 0:
        return "LL"
      return "LR"

    childBf = self.getBalanceFactor(node.getRightChild())
    if childBf <= 0:
      return "RR"
    return "RL"

  # LL case: single right rotation.
  def __balanceLL(self, topNode):
    return self.__rotateRight(topNode)

  # RR case: single left rotation.
  def __balanceRR(self, topNode):
    return self.__rotateLeft(topNode)

  # LR case: left rotation on left child, then right rotation.
  def __balanceLR(self, topNode):
    self.__rotateLeft(topNode.getLeftChild())
    return self.__rotateRight(topNode)

  # RL case: right rotation on right child, then left rotation.
  def __balanceRL(self, topNode):
    self.__rotateRight(topNode.getRightChild())
    return self.__rotateLeft(topNode)

  def __rotateLeft(self, topNode):
    middleNode = topNode.getRightChild()
    leftChildOfMiddle = middleNode.getLeftChild()
    topParent = topNode.getParent()

    middleNode.setParent(topParent)
    if topParent is None:
      self.root = middleNode
    elif topParent.getLeftChild() == topNode:
      topParent.setLeftChild(middleNode)
    else:
      topParent.setRightChild(middleNode)

    middleNode.setLeftChild(topNode)
    topNode.setParent(middleNode)

    topNode.setRightChild(leftChildOfMiddle)
    if leftChildOfMiddle is not None:
      leftChildOfMiddle.setParent(topNode)

    return middleNode

  def __rotateRight(self, topNode):
    middleNode = topNode.getLeftChild()
    rightChildOfMiddle = middleNode.getRightChild()
    topParent = topNode.getParent()

    middleNode.setParent(topParent)
    if topParent is None:
      self.root = middleNode
    elif topParent.getLeftChild() == topNode:
      topParent.setLeftChild(middleNode)
    else:
      topParent.setRightChild(middleNode)

    middleNode.setRightChild(topNode)
    topNode.setParent(middleNode)

    topNode.setLeftChild(rightChildOfMiddle)
    if rightChildOfMiddle is not None:
      rightChildOfMiddle.setParent(topNode)

    return middleNode

  def breadthFirstSearch(self):
    if self.root is None:
      return []

    queue = [self.root]
    result = []
    while len(queue) > 0:
      current = queue.pop(0)
      result.append(current.getValue())
      if current.getLeftChild() is not None:
        queue.append(current.getLeftChild())
      if current.getRightChild() is not None:
        queue.append(current.getRightChild())
    return result

  def preOrderTraversal(self):
    result = []
    self.__preOrder(self.root, result)
    return result

  def __preOrder(self, node, result):
    if node is None:
      return
    result.append(node.getValue())
    self.__preOrder(node.getLeftChild(), result)
    self.__preOrder(node.getRightChild(), result)

  def inOrderTraversal(self):
    result = []
    self.__inOrder(self.root, result)
    return result

  def __inOrder(self, node, result):
    if node is None:
      return
    self.__inOrder(node.getLeftChild(), result)
    result.append(node.getValue())
    self.__inOrder(node.getRightChild(), result)

  def posOrderTraversal(self):
    result = []
    self.__postOrder(self.root, result)
    return result

  def __postOrder(self, node, result):
    if node is None:
      return
    self.__postOrder(node.getLeftChild(), result)
    self.__postOrder(node.getRightChild(), result)
    result.append(node.getValue())

  def countLeaves(self):
    return self.__countLeaves(self.root)

  def __countLeaves(self, node):
    if node is None:
      return 0
    if node.getLeftChild() is None and node.getRightChild() is None:
      return 1
    return self.__countLeaves(node.getLeftChild()) + self.__countLeaves(node.getRightChild())

  # Rechecks all nodes bottom-up and rebalances when needed.
  def rebalanceGlobal(self):
    if self.root is None:
      return {"passes": 0, "rotations": [], "summary": {"LL": 0, "RR": 0, "LR": 0, "RL": 0}}

    passes = 0
    changed = True
    rotations = []  # Registrar cada rotación
    self.rotationCountsLastGlobalRebalance = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}  # Reset solo para este rebalanceo
    
    while changed and passes < 100:
      passes += 1
      changed = False
      nodes = []
      self.__collectPostOrderNodes(self.root, nodes)
      for node in nodes:
        bf = self.getBalanceFactor(node)
        if bf > 1 or bf < -1:
          self.__rebalanceWithTracking(node, bf, rotations)
          changed = True

    # Retornar resumen del rebalanceo global actual, no el total
    return {
      "passes": passes, 
      "rotations": rotations,
      "summary": self.rotationCountsLastGlobalRebalance
    }

  def rebalanceGlobalStepByStep(self):
    """Retorna información detallada para animar paso a paso.
    Cada rotación incluye: tipo, nodo, y estado del árbol después."""
    if self.root is None:
      return {"steps": [], "summary": {"LL": 0, "RR": 0, "LR": 0, "RL": 0}}

    passes = 0
    changed = True
    steps = []  # Lista de pasos con rotación y snapshots del árbol
    self.rotationCountsLastGlobalRebalance = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}  # Reset solo para este rebalanceo
    
    while changed and passes < 100:
      passes += 1
      changed = False
      rotations_in_pass = []
      nodes = []
      self.__collectPostOrderNodes(self.root, nodes)
      for node in nodes:
        bf = self.getBalanceFactor(node)
        if bf > 1 or bf < -1:
          self.__rebalanceWithTrackingStepByStep(node, bf, rotations_in_pass)
          changed = True
          
          # Guardar snapshot después de cada rotación
          for rotation_info in rotations_in_pass:
            steps.append({
              "type": rotation_info["type"],
              "node_codigo": rotation_info["node_codigo"],
              "tree_snapshot": self.toDict()  # Estado actual del árbol
            })
          rotations_in_pass = []

    # Retornar resumen del rebalanceo global actual, no el total
    return {
      "steps": steps,
      "summary": self.rotationCountsLastGlobalRebalance
    }

  def __rebalanceWithTrackingStepByStep(self, node, bf, rotations):
    """Similar a __rebalanceWithTracking pero para step-by-step."""
    caseName = self.__identifyRebalanceCase(node, bf)
    
    # Registrar la rotación
    rotations.append({"type": caseName, "node_codigo": node.codigo})
    
    # Incrementar contadores
    self.rotationCountsLastGlobalRebalance[caseName] += 1
    self.rotationCounts[caseName] += 1
    
    # Ejecutar la rotación
    if caseName == "LL":
      return self.__balanceLL(node)
    elif caseName == "RR":
      return self.__balanceRR(node)
    elif caseName == "LR":
      return self.__balanceLR(node)
    else:  # RL
      return self.__balanceRL(node)

  def __collectPostOrderNodes(self, node, result):
    if node is None:
      return
    self.__collectPostOrderNodes(node.getLeftChild(), result)
    self.__collectPostOrderNodes(node.getRightChild(), result)
    result.append(node)

  # Applies depth penalty rule and marks critical nodes.
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

  # Removes the subtree with the least profitable root.
  def removeLeastProfitableSubtree(self):
    candidates = []
    self.__collectProfitCandidates(self.root, 0, candidates)
    if len(candidates) == 0:
      return {"removed": 0}

    # Sort by rentability ascending, depth descending, code descending.
    # Extraer número del código para ordenamiento (ej: "SB050" -> 50)
    def extract_code_number(codigo):
      return int(''.join(filter(str.isdigit, str(codigo)))) if codigo else 0
    
    candidates.sort(key=lambda item: (item[0], -item[1], -extract_code_number(item[2])))
    _, _, code = candidates[0]
    response = self.cancelSubtree(code)
    return {"removed": response["removed"], "codigo": code}

  def __collectProfitCandidates(self, node, depth, result):
    if node is None:
      return

    promotionImpact = node.precioBase * 0.1 if node.promocion else 0
    penaltyImpact = node.precioBase * 0.25 if node.critico else 0
    rentability = (node.pasajeros * node.precioFinal) - promotionImpact + penaltyImpact

    result.append((rentability, depth, node.codigo))
    self.__collectProfitCandidates(node.getLeftChild(), depth + 1, result)
    self.__collectProfitCandidates(node.getRightChild(), depth + 1, result)

  # Returns a full report to validate the AVL property.
  # Utiliza servicio de auditoría (Principio D - Dependency Inversion)
  def verifyAVLProperty(self):
    """
    Realiza auditoría completa del árbol AVL.
    Retorna reporte detallado con todos los problemas encontrados.
    """
    audit_result = self.auditService.audit_tree(self.root)
    return self.auditService.get_audit_report_summary(audit_result)

  # Converts the full tree to a D3-friendly nested object.
  def toDict(self):
    return self.__serializeNode(self.root)

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
      "factorEquilibrio": self.getBalanceFactor(node),
      "izquierdo": self.__serializeNode(node.getLeftChild()),
      "derecho": self.__serializeNode(node.getRightChild()),
    }

  def getMetrics(self):
    return {
      "alturaActual": self.calculateHeight(self.root),
      "hojas": self.countLeaves(),
      "bfs": self.breadthFirstSearch(),
      "dfs": {
        "preOrder": self.preOrderTraversal(),
        "inOrder": self.inOrderTraversal(),
        "posOrder": self.posOrderTraversal(),
      },
      # COMPATIBILIDAD: mantener 'rotaciones' como lo era, pero ahora reflejando datos acumulativos correctos
      "rotaciones": self.rotationCounts,
      # NUEVO: información detallada de rotaciones
      "rotacionesDetallado": {
        "sesionActual": self.rotationCounts,  # Total acumulativo de esta sesión
        "historico": self.rotationCountsHistorical,  # Acumulativo histórico total
        "ultimoRebalanceoGlobal": self.rotationCountsLastGlobalRebalance  # Del último rebalanceo global
      },
      "cancelacionesMasivas": self.massCancelations,
      "modoEstres": self.stressMode,
    }

  def clear(self):
    self.root = None
    self.rotationCounts = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}
    self.rotationCountsHistorical = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}
    self.rotationCountsStressMode = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}
    self.rotationCountsLastGlobalRebalance = {"LL": 0, "RR": 0, "LR": 0, "RL": 0}
    self.massCancelations = 0

  def loadFromInsertionList(self, vuelos):
    self.clear()
    for vuelo in vuelos:
      node = Node(vuelo)
      self.insert(node)

  def loadFromTopology(self, data):
    self.clear()
    self.root = self.__buildNodeFromTopology(data, None)

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

    # Soporta ambos nombres: left/right (inserción) e izquierdo/derecho (topología)
    leftNode = self.__buildNodeFromTopology(data.get("left") or data.get("izquierdo"), node)
    rightNode = self.__buildNodeFromTopology(data.get("right") or data.get("derecho"), node)
    node.setLeftChild(leftNode)
    node.setRightChild(rightNode)

    return node

  def print_tree(self):
    if self.root is None:
      print("El árbol está vacío.")
      return
    self.__print_tree(self.root, "", True)

  def __print_tree(self, node=None, prefix="", is_left=True):
    if node is None:
      return

    if node.getRightChild() is not None:
      new_prefix = prefix + ("│   " if is_left else "    ")
      self.__print_tree(node.getRightChild(), new_prefix, False)

    connector = "└── " if is_left else "┌── "
    print(prefix + connector + str(node.getValue()))

    if node.getLeftChild() is not None:
      new_prefix = prefix + ("    " if is_left else "│   ")
      self.__print_tree(node.getLeftChild(), new_prefix, True)
