from fastapi import APIRouter, HTTPException

from schemas.auditSchema import VersionSchema
from services.TreeService import treeService


# This router handles all version endpoints.
router = APIRouter(prefix="/versions", tags=["versions"])


# This endpoint returns all saved versions.
@router.get("/")
def list_versions():
	return treeService.list_versions()


# This endpoint saves a new named version.
@router.post("/")
def save_version(payload: VersionSchema):
	return treeService.save_version(payload.name)


# This endpoint restores one named version.
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


# This endpoint deletes one named version.
@router.delete("/{name}")
def delete_version(name: str):
	response = treeService.delete_version(name)
	if not response["ok"]:
		raise HTTPException(status_code=404, detail=response["message"])
	return {
		"result": response,
		"versions": treeService.list_versions(),
	}