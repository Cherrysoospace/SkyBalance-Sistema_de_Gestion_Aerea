from fastapi import APIRouter, File, HTTPException, UploadFile

from services.PersistenceService import persistenceService
from services.TreeService import treeService


router = APIRouter(prefix="/persistence", tags=["persistence"])


@router.post("/load")
async def load_json(file: UploadFile = File(...)):
	try:
		content = await file.read()
		payload = persistenceService.parse_json_text(content.decode("utf-8"))
		info = treeService.load_from_json_data(payload)
		return {
			"info": info,
			"tree": treeService.get_tree(),
			"metrics": treeService.get_metrics(),
		}
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.get("/export")
def export_json():
	return treeService.export_json()