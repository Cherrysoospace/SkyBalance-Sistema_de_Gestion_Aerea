from services.TreeService import treeService


class PenaltyService:

	# This method sets the max depth limit.
	# Nodes deeper than this limit receive penalty.
	def set_depth_limit(self, depth_limit):
		return treeService.set_depth_limit(depth_limit)


penaltyService = PenaltyService()