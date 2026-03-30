from fastapi import APIRouter

from schemas.VueloSchema import VueloRequestSchema
from services.TreeService import treeService


router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/")
def get_queue():
	return treeService.get_queue()


@router.post("/enqueue")
def enqueue_insert(payload: VueloRequestSchema):
	return treeService.queue_insert(payload.model_dump())


@router.post("/process")
def process_queue():
	result = treeService.process_queue()
	return {
		"result": result,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/process-steps")
def process_queue_with_steps():
	"""Procesa la cola y retorna array con pasos intermedios para animación."""
	result = treeService.process_queue_with_steps()
	return {
		"result": result,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}