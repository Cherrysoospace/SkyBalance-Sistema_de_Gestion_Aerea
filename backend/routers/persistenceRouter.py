from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.PersistenceService import persistenceService
from services.TreeService import treeService


router = APIRouter(prefix="/persistence", tags=["persistence"])


@router.post("/load")
async def load_json(file: UploadFile = File(...), depthLimit: int = Form(...)):
	"""Load a JSON file, normalize it, and apply selected depth limit."""
	try:
		# Validate depth limit input.
		if depthLimit <= 0:
			raise ValueError("Depth limit must be greater than 0")

		# Read and parse JSON file.
		content = await file.read()
		payload = persistenceService.parse_json_text(content.decode("utf-8"))

		# Detect payload format using the unified parser.
		try:
			fmt = persistenceService.detect_json_format(payload)
		except ValueError:
			# Keep backward compatibility fallback.
			fmt = None

		# SYSTEM_EXPORT can be parsed directly.
		if fmt == "SYSTEM_EXPORT":
			payload_to_load = payload
		else:
			# Normalize INSERCION and TOPOLOGIA payloads.
			normalized_payload = persistenceService.validate_and_normalize_topology(payload)

			# Rebuild INSERCION wrapper when normalized result is list.
			if isinstance(normalized_payload, list):
				payload_to_load = {
					"tipo": "INSERCION",
					"vuelos": normalized_payload
				}
			else:
				payload_to_load = normalized_payload

		# Load tree into service state.
		info = treeService.load_from_json_data(payload_to_load)

		# Apply depth limit after loading.
		depth_response = treeService.set_depth_limit(depthLimit)

		return {
			"info": info,
			"depthLimit": depth_response["depthLimit"],
			"tree": treeService.get_tree(),
			"metrics": treeService.get_metrics(),
		}
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc))
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.get("/export")
def export_json():
	"""Export current tree and metrics in system format."""
	return treeService.export_json()


@router.post("/validate")
async def validate_topology(file: UploadFile = File(...)):
	"""Validate one JSON file without loading it into runtime state."""
	try:
		content = await file.read()
		payload = persistenceService.parse_json_text(content.decode("utf-8"))

		# Validate normalized payload structure.
		normalized = persistenceService.validate_and_normalize_topology(payload)
		validation_report = persistenceService.validate_exported_json(normalized)

		return {
			"valid": validation_report["valid"],
			"errors": validation_report["errors"],
			"warnings": validation_report["warnings"],
			"fields_present": validation_report["fields_present"],
			"nodes_count": validation_report["nodes_count"],
			"message": "Topology is valid" if validation_report["valid"] else "Topology is invalid"
		}
	except ValueError as exc:
		return {
			"valid": False,
			"errors": [str(exc)],
			"warnings": [],
			"fields_present": [],
			"nodes_count": 0,
			"message": "Validation error"
		}
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))