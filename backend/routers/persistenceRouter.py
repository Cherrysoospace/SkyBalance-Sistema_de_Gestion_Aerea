from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.PersistenceService import persistenceService
from services.TreeService import treeService


router = APIRouter(prefix="/persistence", tags=["persistence"])


@router.post("/load")
async def load_json(file: UploadFile = File(...), depthLimit: int = Form(...)):
	try:
		# Validar depthLimit
		if depthLimit <= 0:
			raise ValueError("La profundidad máxima debe ser mayor a 0")

		# Cargar y validar el JSON
		content = await file.read()
		payload = persistenceService.parse_json_text(content.decode("utf-8"))

		# 🔍 DETECTAR FORMATO usando el nuevo parser
		try:
			fmt = persistenceService.detect_json_format(payload)
		except ValueError:
			# Fallback: try old validation method for backward compat
			fmt = None

		# Usa el nuevo parser directamente para Format 3 (SYSTEM_EXPORT)
		if fmt == "SYSTEM_EXPORT":
			# Pass directly - parse_json() will handle it
			payload_to_load = payload
		else:
			# Use old validation for Format 1 & 2
			normalized_payload = persistenceService.validate_and_normalize_topology(payload)

			# Reconstruct INSERCION if needed
			if isinstance(normalized_payload, list):
				payload_to_load = {
					"tipo": "INSERCION",
					"vuelos": normalized_payload
				}
			else:
				payload_to_load = normalized_payload

		# Cargar árbol (limpia automáticamente antes de cargar)
		info = treeService.load_from_json_data(payload_to_load)

		# ✅ Establecer depthLimit DESPUES de cargar (para aplicar penalidad correctamente)
		depth_response = treeService.set_depth_limit(depthLimit)

		return {
			"info": info,
			"depthLimit": depth_response["depthLimit"],  # Usar el valor confirmado del backend
			"tree": treeService.get_tree(),
			"metrics": treeService.get_metrics(),
		}
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc))
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))


@router.get("/export")
def export_json():
	return treeService.export_json()


@router.post("/validate")
async def validate_topology(file: UploadFile = File(...)):
	"""
	Valida un archivo JSON sin cargarlo.
	Retorna reporte detallado de validación.
	"""
	try:
		content = await file.read()
		payload = persistenceService.parse_json_text(content.decode("utf-8"))

		# Validar
		normalized = persistenceService.validate_and_normalize_topology(payload)
		validation_report = persistenceService.validate_exported_json(normalized)

		return {
			"valid": validation_report["valid"],
			"errors": validation_report["errors"],
			"warnings": validation_report["warnings"],
			"fields_present": validation_report["fields_present"],
			"nodes_count": validation_report["nodes_count"],
			"message": "✅ Topología válida" if validation_report["valid"] else "❌ Topología inválida"
		}
	except ValueError as exc:
		return {
			"valid": False,
			"errors": [str(exc)],
			"warnings": [],
			"fields_present": [],
			"nodes_count": 0,
			"message": "❌ Error de validación"
		}
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc))