from copy import deepcopy
from datetime import datetime


# Named snapshot used by persistent versioning.
class Version:

  def __init__(self, name, snapshot):
    self.name = name
    self.snapshot = deepcopy(snapshot)
    self.timestamp = datetime.now().isoformat()

  def to_dict(self):
    return {
      "name": self.name,
      "timestamp": self.timestamp,
      "snapshot": deepcopy(self.snapshot),
    }
