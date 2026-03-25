from copy import deepcopy


# FIFO queue for deferred insertion requests.
class InsertionQueue:

	def __init__(self):
		self._items = []

	def enqueue(self, payload):
		self._items.append(deepcopy(payload))

	def dequeue(self):
		if self.is_empty():
			return None
		return self._items.pop(0)

	def is_empty(self):
		return len(self._items) == 0

	def size(self):
		return len(self._items)

	def clear(self):
		self._items = []

	def to_list(self):
		return deepcopy(self._items)