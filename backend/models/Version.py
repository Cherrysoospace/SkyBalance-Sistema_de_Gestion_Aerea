from copy import deepcopy
from datetime import datetime


# Version: A named, timestamped snapshot of the tree state used for versioning feature.
class Version:

  def __init__(self, name, snapshot):
    """
    Initialize a version snapshot with name and timestamp.
    - name: identifier for this version checkpoint
    - snapshot: complete tree state (deep-copied to prevent mutations)
    """
    self.name = name
    self.snapshot = deepcopy(snapshot)
    self.timestamp = datetime.now().isoformat()

  def to_dict(self):
    """
    Serialize version data for API responses and persistence.
    Returns dict with name, timestamp, and deep-copied snapshot.
    """
    return {
      "name": self.name,
      "timestamp": self.timestamp,
      "snapshot": deepcopy(self.snapshot),
    }
