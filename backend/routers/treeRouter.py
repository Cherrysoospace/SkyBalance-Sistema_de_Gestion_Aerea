from fastapi import APIRouter, HTTPException

from schemas.VueloSchema import VueloRequestSchema
from schemas.treeComparisonSchema import TreeComparisonResponseSchema
from services.TreeService import treeService


router = APIRouter(prefix="/tree", tags=["tree"])


@router.get("/state")
def get_state():
	return {
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/insert")
def insert_flight(payload: VueloRequestSchema):
	try:
		treeService.insert_flight(payload.model_dump())
		return get_state()
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/update/{codigo}")
def update_node(codigo: str, payload: VueloRequestSchema):
	try:
		response = treeService.modify_node(codigo, payload.model_dump())
		if not response["ok"]:
			raise HTTPException(status_code=404, detail="Nodo no encontrado")
		return get_state()
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/delete/{codigo}")
def delete_node(codigo: str):
	response = treeService.delete_node(codigo)
	if not response["ok"]:
		raise HTTPException(status_code=404, detail="Nodo no encontrado")
	return get_state()


@router.get("/comparison", response_model=TreeComparisonResponseSchema)
def get_comparison():
	"""
	Endpoint que devuelve la comparación completa entre AVL y BST.

	Incluye:
	- Estructura serializada de ambos árboles (formato D3 para visualización)
	- Métricas de cada árbol: raíz, profundidad y cantidad de hojas

	Útil para comparar cómo dos estructuras diferentes manejan los mismos datos.
	"""
	return treeService.get_comparison()


@router.delete("/cancel/{codigo}")
def cancel_subtree(codigo: str):
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