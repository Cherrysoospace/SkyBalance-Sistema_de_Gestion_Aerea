from fastapi import APIRouter, HTTPException

from schemas.auditSchema import VersionSchema
from services.TreeService import treeService


router = APIRouter(prefix="/versions", tags=["versions"])


@router.get("/")
def list_versions():
	return treeService.list_versions()


@router.post("/")
def save_version(payload: VersionSchema):
	return treeService.save_version(payload.name)


@router.post("/restore")
def restore_version(payload: VersionSchema):
	response = treeService.restore_version(payload.name)
	if not response["ok"]:
		raise HTTPException(status_code=404, detail=response["message"])
	return {
		"result": response,
		"tree": treeService.get_tree(),
		"metrics": treeService.get_metrics(),
	}
# Endpoints para guardar y restaurar versiones nombradas del árbol