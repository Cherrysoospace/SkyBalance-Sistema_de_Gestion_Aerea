from services.TreeService import treeService


class VersioningService:

	def save(self, name):
		return treeService.save_version(name)

	def list(self):
		return treeService.list_versions()

	def restore(self, name):
		return treeService.restore_version(name)


versioningService = VersioningService()
 # Versionado nombrado