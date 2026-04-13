from fastapi import APIRouter

from schemas.VueloSchema import VueloRequestSchema
from services.TreeService import treeService


router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/")
def get_queue():
	"""Return pending queue size and queued items."""
	return treeService.get_queue()


@router.post("/enqueue")
def enqueue_insert(payload: VueloRequestSchema):
	"""Add one insertion payload to the queue."""
	return treeService.queue_insert(payload.model_dump())


@router.post("/process")
def process_queue():
	"""Process all queued insertions and return aggregate result."""
	result = treeService.process_queue()
	return {
		"result": result,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}


@router.post("/process-steps")
def process_queue_with_steps():
	"""Process queue and return step-by-step snapshots for animation."""
	result = treeService.process_queue_with_steps()
	return {
		"result": result,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}