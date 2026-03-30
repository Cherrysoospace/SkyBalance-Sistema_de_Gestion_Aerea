from fastapi import APIRouter

from schemas.metricsSchema import DepthLimitSchema, StressModeSchema
from services.TreeService import treeService


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/")
def get_metrics():
	return treeService.get_metrics()


@router.post("/stress")
def set_stress_mode(payload: StressModeSchema):
	response = treeService.set_stress_mode(payload.enabled)
	return {
		"state": response,
		"metrics": treeService.get_metrics(),
	}


@router.post("/depth-penalty")
def set_depth_penalty(payload: DepthLimitSchema):
	response = treeService.set_depth_limit(payload.depthLimit)
	return {
		"state": response,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/rebalance-global")
def rebalance_global():
	response = treeService.rebalance_global()
	return {
		"result": response,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/rebalance-global-animated")
def rebalance_global_animated():
	"""Retorna detalles paso a paso para animar el rebalanceo."""
	response = treeService.rebalance_global_animated()
	return {
		"result": response,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.get("/audit")
def audit_avl():
	return treeService.verify_avl()


@router.delete("/least-profitable")
def remove_least_profitable():
	response = treeService.remove_least_profitable()
	return {
		"result": response,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}
# Endpoints para consultar métricas y auditoría del árbol