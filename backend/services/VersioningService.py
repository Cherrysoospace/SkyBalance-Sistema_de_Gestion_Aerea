from services.TreeService import treeService


class VersioningService:

	# This method saves a named snapshot.
	def save(self, name):
		return treeService.save_version(name)

	# This method returns all saved snapshots.
	def list(self):
		return treeService.list_versions()

	# This method restores one snapshot by name.
	def restore(self, name):
		return treeService.restore_version(name)

	# This method deletes one snapshot by name.
	def delete(self, name):
		return treeService.delete_version(name)


versioningService = VersioningService()