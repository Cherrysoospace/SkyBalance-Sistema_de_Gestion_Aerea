from copy import deepcopy


# FIFO queue for deferred insertion requests.
class InsertionQueue:

	def __init__(self):
		"""Initialize empty FIFO queue."""
		self._items = []

	def enqueue(self, payload):
		"""Append one payload to queue tail."""
		self._items.append(deepcopy(payload))

	def dequeue(self):
		"""Return and remove queue head, or None when empty."""
		if self.is_empty():
			return None
		return self._items.pop(0)

	def is_empty(self):
		"""Return True when queue has no items."""
		return len(self._items) == 0

	def size(self):
		"""Return number of pending queue items."""
		return len(self._items)

	def clear(self):
		"""Remove all queued items."""
		self._items = []

	def to_list(self):
		"""Return deep copy list of pending items."""
		return deepcopy(self._items)