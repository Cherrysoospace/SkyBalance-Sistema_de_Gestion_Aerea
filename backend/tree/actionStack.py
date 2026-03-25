from copy import deepcopy


# Stack used to store full snapshots for undo operations.
class ActionStack:

  def __init__(self):
    self._items = []

  def push(self, snapshot):
    self._items.append(deepcopy(snapshot))

  def pop(self):
    if self.is_empty():
      return None
    return self._items.pop()

  def peek(self):
    if self.is_empty():
      return None
    return self._items[-1]

  def clear(self):
    self._items = []

  def is_empty(self):
    return len(self._items) == 0

  def size(self):
    return len(self._items)