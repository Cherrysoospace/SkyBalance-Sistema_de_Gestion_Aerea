from services.TreeService import treeService


class MetricsService:

	# This method returns live tree metrics.
	def get_metrics(self):
		return treeService.get_metrics()


metricsService = MetricsService()