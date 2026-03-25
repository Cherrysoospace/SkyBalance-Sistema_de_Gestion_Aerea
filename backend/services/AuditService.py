from services.TreeService import treeService


class AuditService:

	def verify(self):
		return treeService.verify_avl()


auditService = AuditService()
# Verificación AVL