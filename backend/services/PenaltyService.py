from services.TreeService import treeService


class PenaltyService:

	def set_depth_limit(self, depth_limit):
		return treeService.set_depth_limit(depth_limit)


penaltyService = PenaltyService()
 # Penalización profundidad