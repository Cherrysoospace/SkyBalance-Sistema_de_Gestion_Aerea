from fastapi import APIRouter

from schemas.metricsSchema import DepthLimitSchema, StressModeSchema
from services.TreeService import treeService


# This router handles metrics and analysis endpoints.
router = APIRouter(prefix="/metrics", tags=["metrics"])


# This helper keeps response format simple and consistent.
def _tree_metrics_response(result_key, result_value):
	return {
		result_key: result_value,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.get("/")
def get_metrics():
	"""Return current AVL metrics."""
	return treeService.get_metrics()


@router.post("/stress")
def set_stress_mode(payload: StressModeSchema):
	"""Enable or disable stress mode in AVL logic."""
	response = treeService.set_stress_mode(payload.enabled)
	return {
		"state": response,
		"metrics": treeService.get_metrics(),
	}


@router.post("/depth-penalty")
def set_depth_penalty(payload: DepthLimitSchema):
	"""Set the depth threshold used to mark critical flights."""
	response = treeService.set_depth_limit(payload.depthLimit)
	return _tree_metrics_response("state", response)


@router.post("/rebalance-global")
def rebalance_global():
	"""Run full global rebalance and return updated state."""
	response = treeService.rebalance_global()
	return _tree_metrics_response("result", response)


@router.post("/rebalance-global-animated")
def rebalance_global_animated():
	"""Return step-by-step details for frontend animation."""
	response = treeService.rebalance_global_animated()
	return _tree_metrics_response("result", response)


@router.get("/audit")
def audit_avl():
	"""Return AVL integrity audit report."""
	return treeService.verify_avl()


@router.delete("/least-profitable")
def remove_least_profitable():
	"""Remove the least profitable subtree and return updated state."""
	response = treeService.remove_least_profitable()
	return _tree_metrics_response("result", response)