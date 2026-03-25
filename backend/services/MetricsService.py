from services.TreeService import treeService


class MetricsService:

	def get_metrics(self):
		return treeService.get_metrics()


metricsService = MetricsService()
# Métricas analíticas