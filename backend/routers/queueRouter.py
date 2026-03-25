from fastapi import APIRouter

from schemas.VueloSchema import VueloSchema
from services.TreeService import treeService


router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/")
def get_queue():
	return treeService.get_queue()


@router.post("/enqueue")
def enqueue_insert(payload: VueloSchema):
	return treeService.queue_insert(payload.model_dump())


@router.post("/process")
def process_queue():
	result = treeService.process_queue()
	return {
		"result": result,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}
# Endpoints para gestionar la cola de inserciones pendientes