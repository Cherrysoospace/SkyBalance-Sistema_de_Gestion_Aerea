from copy import deepcopy


# Stack used to store full snapshots for undo operations.
class ActionStack:

  def __init__(self):
    """Initialize empty LIFO stack."""
    self._items = []

  def push(self, snapshot):
    """Store one deep-copied snapshot."""
    self._items.append(deepcopy(snapshot))

  def pop(self):
    """Return and remove latest snapshot, or None when empty."""
    if self.is_empty():
      return None
    return self._items.pop()

  def peek(self):
    """Return latest snapshot without removing it."""
    if self.is_empty():
      return None
    return self._items[-1]

  def clear(self):
    """Remove all snapshots from stack."""
    self._items = []

  def is_empty(self):
    """Return True when stack has no items."""
    return len(self._items) == 0

  def size(self):
    """Return number of snapshots currently stored."""
    return len(self._items)