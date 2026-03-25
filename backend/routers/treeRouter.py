from fastapi import APIRouter, HTTPException

from schemas.VueloSchema import VueloSchema
from services.TreeService import treeService


router = APIRouter(prefix="/tree", tags=["tree"])


@router.get("/state")
def get_state():
	return {
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/insert")
def insert_flight(payload: VueloSchema):
	try:
		treeService.insert_flight(payload.model_dump())
		return get_state()
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/delete/{codigo}")
def delete_node(codigo: int):
	response = treeService.delete_node(codigo)
	if not response["ok"]:
		raise HTTPException(status_code=404, detail="Nodo no encontrado")
	return get_state()


@router.delete("/cancel/{codigo}")
def cancel_subtree(codigo: int):
	response = treeService.cancel_subtree(codigo)
	if response["removed"] == 0:
		raise HTTPException(status_code=404, detail="Nodo no encontrado")
	return get_state()


@router.post("/undo")
def undo_last_action():
	response = treeService.undo()
	if not response["ok"]:
		raise HTTPException(status_code=400, detail=response["message"])
	return get_state()