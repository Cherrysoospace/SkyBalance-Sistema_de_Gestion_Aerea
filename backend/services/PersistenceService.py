import json
from typing import Tuple, List, Dict, Optional

from models.NodoVuelo import NodoVuelo


# Service used to parse, normalize, validate, and convert JSON payloads.
class PersistenceService:

	def parse_json_text(self, content):
		return json.loads(content)

	def to_json_text(self, payload):
		return json.dumps(payload, ensure_ascii=False, indent=2)

	def _is_insertion_payload(self, payload):
		return isinstance(payload, dict) and payload.get("tipo") == "INSERCION"

	def _is_topology_payload(self, payload):
		if not isinstance(payload, dict):
			return False
		return "codigo" in payload or "izquierdo" in payload or "derecho" in payload

	def _normalize_insertion_list(self, payload):
		vuelos = payload.get("vuelos", [])
		if not isinstance(vuelos, list):
			raise ValueError("Field 'vuelos' must be a list in INSERCION format")
		if len(vuelos) == 0:
			raise ValueError("INSERCION payload is empty")

		normalized_vuelos = []
		for i, vuelo in enumerate(vuelos):
			try:
				normalized_vuelos.append(self._normalize_vuelo(vuelo))
			except ValueError as e:
				raise ValueError(f"Invalid flight at index {i}: {str(e)}")
		return normalized_vuelos

	def validate_and_normalize_topology(self, payload):
		"""Normalize INSERCION or TOPOLOGIA input formats."""
		if self._is_insertion_payload(payload):
			return self._normalize_insertion_list(payload)

		if self._is_topology_payload(payload):
			return self._normalize_node(payload)

		raise ValueError(
			"Invalid JSON format. Expected TOPOLOGIA tree or INSERCION flight list"
		)

	def _normalize_vuelo(self, vuelo):
		"""Normalize one INSERCION flight object."""
		if not isinstance(vuelo, dict):
			raise ValueError("Flight item must be a JSON object")

		if "codigo" in vuelo:
			vuelo["codigo"] = self._normalize_code(vuelo["codigo"])

		if "prioridad" not in vuelo or vuelo["prioridad"] is None:
			vuelo["prioridad"] = 1

		return vuelo

	def _normalize_node(self, node):
		"""Normalize one tree node recursively."""
		if node is None:
			return None

		if not isinstance(node, dict):
			raise ValueError("Tree node must be a JSON object")

		if "codigo" in node:
			node["codigo"] = self._normalize_code(node["codigo"])

		if "prioridad" not in node or node["prioridad"] is None:
			node["prioridad"] = 1

		if "izquierdo" in node and node["izquierdo"] is not None:
			node["izquierdo"] = self._normalize_node(node["izquierdo"])

		if "derecho" in node and node["derecho"] is not None:
			node["derecho"] = self._normalize_node(node["derecho"])

		return node

	def _normalize_code(self, code):
		"""Convert numeric-like code to SB### format."""
		if isinstance(code, int):
			if code < 0 or code > 999:
				raise ValueError("codigo must be between 0 and 999")
			return f"SB{code:03d}"

		if isinstance(code, str):
			clean = code.strip().upper()
			if clean.startswith("SB"):
				digits = clean[2:]
			else:
				digits = clean

			if not digits.isdigit():
				raise ValueError(f"invalid codigo: {code}")

			numeric_value = int(digits)
			if numeric_value < 0 or numeric_value > 999:
				raise ValueError("codigo must be between 0 and 999")
			return f"SB{numeric_value:03d}"

		raise ValueError(f"codigo must be string or int, received: {type(code)}")

	def validate_exported_json(self, payload):
		"""Validate one exported topology payload."""
		errors = []
		warnings = []
		fields_present = set()
		nodes_count = 0

		def check_node(node, path="root"):
			nonlocal nodes_count
			if node is None:
				return

			nodes_count += 1

			required_fields = ["codigo", "origen", "destino", "horaSalida", "precioBase",
							   "pasajeros", "promocion", "alerta", "altura", "factorEquilibrio"]

			for field in required_fields:
				if field not in node:
					errors.append(f"Missing field '{field}' at {path}")
				else:
					fields_present.add(field)

			if "codigo" in node and not isinstance(node["codigo"], str):
				errors.append(f"codigo must be string at {path}")

			if "prioridad" in node:
				fields_present.add("prioridad")
				if not isinstance(node["prioridad"], int):
					warnings.append(f"prioridad should be int at {path}")
			else:
				warnings.append(f"Field 'prioridad' is missing at {path}")

			if "izquierdo" in node and node["izquierdo"] is not None:
				check_node(node["izquierdo"], f"{path}.izquierdo")

			if "derecho" in node and node["derecho"] is not None:
				check_node(node["derecho"], f"{path}.derecho")

		check_node(payload)

		return {
			"valid": len(errors) == 0,
			"errors": errors,
			"warnings": warnings,
			"fields_present": list(fields_present),
			"nodes_count": nodes_count
		}

	def detect_json_format(self, payload) -> str:
		"""Detect whether payload is INSERCION, TOPOLOGIA, or SYSTEM_EXPORT."""
		if not isinstance(payload, dict):
			raise ValueError("JSON root must be an object")

		if "tree" in payload:
			return "SYSTEM_EXPORT"

		if self._is_insertion_payload(payload):
			if "vuelos" not in payload:
				raise ValueError("INSERCION payload must include 'vuelos'")
			if not isinstance(payload.get("vuelos"), list):
				raise ValueError("Field 'vuelos' must be a list")
			return "INSERCION"

		if self._is_topology_payload(payload):
			return "TOPOLOGIA"

		raise ValueError(
			"JSON does not match supported formats. "
			"Expected INSERCION, TOPOLOGIA, or SYSTEM_EXPORT"
		)

	def parse_json(self, payload) -> Tuple[str, any, Optional[dict]]:
		"""Parse supported JSON formats into domain objects."""
		try:
			fmt = self.detect_json_format(payload)

			if fmt == "INSERCION":
				return ("INSERCION", self._parse_insercion(payload), None)

			if fmt == "TOPOLOGIA":
				return ("TOPOLOGIA", self._parse_topologia(payload), None)

			if fmt == "SYSTEM_EXPORT":
				parsed, metrics = self._parse_system_export(payload)
				return ("SYSTEM_EXPORT", parsed, metrics)

			raise ValueError(f"Unsupported format: {fmt}")

		except ValueError:
			raise
		except Exception as e:
			raise ValueError(f"Error parsing JSON: {str(e)}")

	def _parse_insercion(self, payload) -> List[NodoVuelo]:
		"""Parse INSERCION format into a list of NodoVuelo objects."""
		vuelos = payload.get("vuelos", [])

		if not vuelos:
			raise ValueError("INSERCION payload is empty")

		parsed_vuelos = []
		for i, vuelo in enumerate(vuelos):
			try:
				normalized = self._normalize_vuelo(vuelo)

				nodo = NodoVuelo(
					codigo=normalized["codigo"],
					origen=normalized.get("origen", ""),
					destino=normalized.get("destino", ""),
					horaSalida=normalized.get("horaSalida", ""),
					precioBase=float(normalized.get("precioBase", 0)),
					precioFinal=float(normalized.get("precioFinal", normalized.get("precioBase", 0))),
					pasajeros=int(normalized.get("pasajeros", 0)),
					promocion=bool(normalized.get("promocion", False)),
					alerta=bool(normalized.get("alerta", False)),
					prioridad=normalized.get("prioridad", 1),
					critico=bool(normalized.get("critico", False)),
				)
				parsed_vuelos.append(nodo)
			except Exception as e:
				raise ValueError(f"Invalid flight at index {i}: {str(e)}")

		return parsed_vuelos

	def _parse_topologia(self, payload) -> NodoVuelo:
		"""Parse TOPOLOGIA format into NodoVuelo tree."""
		if payload is None:
			return None

		normalized = self._normalize_node(payload)

		return self._dict_to_nodo_vuelo(normalized)

	def _parse_system_export(self, payload) -> Tuple[NodoVuelo, dict]:
		"""Parse SYSTEM_EXPORT format into tree and metrics tuple."""
		tree_data = payload.get("tree")
		if tree_data is None:
			raise ValueError("SYSTEM_EXPORT payload must include 'tree'")

		root = self._parse_topologia(tree_data)

		metrics = payload.get("metrics", {})

		return (root, metrics)

	def _dict_to_nodo_vuelo(self, data: dict) -> NodoVuelo:
		"""Convert normalized dict tree into NodoVuelo recursively."""
		if data is None:
			return None

		left = self._dict_to_nodo_vuelo(data.get("izquierdo") or data.get("left"))
		right = self._dict_to_nodo_vuelo(data.get("derecho") or data.get("right"))

		return NodoVuelo(
			codigo=data.get("codigo", ""),
			origen=data.get("origen", ""),
			destino=data.get("destino", ""),
			horaSalida=data.get("horaSalida", ""),
			precioBase=float(data.get("precioBase", 0)),
			precioFinal=float(data.get("precioFinal", data.get("precioBase", 0))),
			pasajeros=int(data.get("pasajeros", 0)),
			promocion=bool(data.get("promocion", False)),
			alerta=bool(data.get("alerta", False)),
			prioridad=data.get("prioridad", 1),
			critico=bool(data.get("critico", False)),
			altura=int(data.get("altura", 0)),
			factorEquilibrio=int(data.get("factorEquilibrio", 0)),
			izquierdo=left,
			derecho=right,
		)


persistenceService = PersistenceService()