from fastapi import APIRouter, HTTPException

from schemas.VueloSchema import VueloRequestSchema
from schemas.treeComparisonSchema import TreeComparisonResponseSchema
from services.TreeService import treeService


router = APIRouter(prefix="/tree", tags=["tree"])


@router.get("/state")
def get_state():
	"""Return current tree snapshot and metrics."""
	return {
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/insert")
def insert_flight(payload: VueloRequestSchema):
	"""Insert one flight node in AVL and BST."""
	try:
		treeService.insert_flight(payload.model_dump())
		return get_state()
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/update/{codigo}")
def update_node(codigo: str, payload: VueloRequestSchema):
	"""Update one existing node by code."""
	try:
		response = treeService.modify_node(codigo, payload.model_dump())
		if not response["ok"]:
			raise HTTPException(status_code=404, detail="Node not found")
		return get_state()
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/delete/{codigo}")
def delete_node(codigo: str):
	"""Delete one node by code."""
	response = treeService.delete_node(codigo)
	if not response["ok"]:
		raise HTTPException(status_code=404, detail="Node not found")
	return get_state()


@router.get("/comparison", response_model=TreeComparisonResponseSchema)
def get_comparison():
	"""Return full AVL vs BST comparison payload for the frontend."""
	return treeService.get_comparison()


@router.delete("/cancel/{codigo}")
def cancel_subtree(codigo: str):
	"""Delete a subtree rooted at the given code."""
	response = treeService.cancel_subtree(codigo)
	if response["removed"] == 0:
		raise HTTPException(status_code=404, detail="Node not found")
	return get_state()


@router.post("/undo")
def undo_last_action():
	"""Restore the last snapshot stored in the undo stack."""
	response = treeService.undo()
	if not response["ok"]:
		raise HTTPException(status_code=400, detail=response["message"])
	return get_state()