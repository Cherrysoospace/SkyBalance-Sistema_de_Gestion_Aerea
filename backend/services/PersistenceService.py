import json
from typing import Tuple, List, Dict, Optional

from models.NodoVuelo import NodoVuelo


# Utility service for reading/writing JSON payloads.
class PersistenceService:

	def parse_json_text(self, content):
		return json.loads(content)

	def to_json_text(self, payload):
		return json.dumps(payload, ensure_ascii=False, indent=2)

	def validate_and_normalize_topology(self, payload):
		"""
		Detecta y normaliza ambos formatos:
		1. TOPOLOGIA: árbol jerárquico {codigo, izquierdo, derecho}
		   → Retorna dict normalizado (recursivo)
		2. INSERCION: lista de vuelos {tipo: "INSERCION", vuelos: [...]}
		   → Retorna array de vuelos normalizados

		Ammbos: convierte codigo int→string, establece prioridad=1 si falta
		"""
		# INSERCION: lista de vuelos
		if isinstance(payload, dict) and payload.get("tipo") == "INSERCION":
			vuelos = payload.get("vuelos", [])
			if not isinstance(vuelos, list):
				raise ValueError("❌ Campo 'vuelos' debe ser una lista en INSERCION")
			if len(vuelos) == 0:
				raise ValueError("❌ INSERCION vacío: no hay vuelos para insertar")

			# Normalizar cada vuelo
			normalized_vuelos = []
			for i, vuelo in enumerate(vuelos):
				try:
					normalized = self._normalize_vuelo(vuelo)
					normalized_vuelos.append(normalized)
				except ValueError as e:
					raise ValueError(f"❌ Error en vuelo {i}: {str(e)}")
			return normalized_vuelos  # Array de vuelos normalizados

		# TOPOLOGIA: árbol jerárquico
		if isinstance(payload, dict):
			# Debe tener estructura de árbol (al menos codigo o izquierdo/derecho)
			if "codigo" in payload or "izquierdo" in payload or "derecho" in payload:
				normalized = self._normalize_node(payload)
				return normalized  # Dict (árbol normalizado)

		raise ValueError("❌ JSON inválido. Esperado: TOPOLOGIA (árbol jerárquico) o INSERCION (lista de vuelos)")

	def _normalize_vuelo(self, vuelo):
		"""
		Normaliza un vuelo individual (para INSERCION):
		- Convierte codigo int → string
		- Establece prioridad = 1 si falta
		"""
		if not isinstance(vuelo, dict):
			raise ValueError("vuelo debe ser un objeto JSON")

		# Convertir codigo: int → string
		if "codigo" in vuelo:
			if isinstance(vuelo["codigo"], int):
				vuelo["codigo"] = str(vuelo["codigo"])
			elif not isinstance(vuelo["codigo"], str):
				raise ValueError(f"codigo debe ser string o int, recibido: {type(vuelo['codigo'])}")

		# Establecer prioridad por defecto
		if "prioridad" not in vuelo or vuelo["prioridad"] is None:
			vuelo["prioridad"] = 1

		return vuelo

	def _normalize_node(self, node):
		"""
		Normaliza recursivamente un nodo:
		- Convierte codigo int → string
		- Establece prioridad = 1 si falta
		- Procesa hijos (izquierdo/derecho)
		"""
		if node is None:
			return None

		if not isinstance(node, dict):
			raise ValueError("❌ Nodo debe ser un objeto JSON")

		# Convertir codigo: int → string
		if "codigo" in node:
			if isinstance(node["codigo"], int):
				node["codigo"] = str(node["codigo"])
			elif not isinstance(node["codigo"], str):
				raise ValueError(f"❌ codigo debe ser string o int, recibido: {type(node['codigo'])}")

		# Establecer prioridad por defecto
		if "prioridad" not in node or node["prioridad"] is None:
			node["prioridad"] = 1

		# Procesar hijos recursivamente
		if "izquierdo" in node and node["izquierdo"] is not None:
			node["izquierdo"] = self._normalize_node(node["izquierdo"])

		if "derecho" in node and node["derecho"] is not None:
			node["derecho"] = self._normalize_node(node["derecho"])

		return node

	def validate_exported_json(self, payload):
		"""
		Valida la estructura de un JSON exportado.
		Retorna reporte detallado.
		"""
		errors = []
		warnings = []
		fields_present = set()
		nodes_count = 0

		def check_node(node, path="root"):
			nonlocal nodes_count
			if node is None:
				return

			nodes_count += 1

			# Campos requeridos
			required_fields = ["codigo", "origen", "destino", "horaSalida", "precioBase",
							   "pasajeros", "promocion", "alerta", "altura", "factorEquilibrio"]

			for field in required_fields:
				if field not in node:
					errors.append(f"Campo faltante '{field}' en {path}")
				else:
					fields_present.add(field)

			# Validar tipos
			if "codigo" in node and not isinstance(node["codigo"], str):
				errors.append(f"codigo debe ser string en {path}")

			if "prioridad" in node:
				fields_present.add("prioridad")
				if not isinstance(node["prioridad"], int):
					warnings.append(f"prioridad debe ser int en {path}")
			else:
				warnings.append(f"Campo 'prioridad' no presente en {path}")

			# Procesar hijos
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

	# ============================================================================
	# UNIFIED JSON FORMAT DETECTION AND PARSING
	# ============================================================================

	def detect_json_format(self, payload) -> str:
		"""
		Detects which of the three JSON formats the payload belongs to.

		Returns:
			"INSERCION": Flight list with tipo field
			"TOPOLOGIA": Tree structure (pre-built)
			"SYSTEM_EXPORT": Tree structure with metrics (Format 3)

		Raises:
			ValueError: If format cannot be detected.
		"""
		if not isinstance(payload, dict):
			raise ValueError("❌ JSON debe ser un objeto (dict)")

		# Format 3: SYSTEM_EXPORT (has "tree" key)
		if "tree" in payload:
			return "SYSTEM_EXPORT"

		# Format 1: INSERCION (has tipo: "INSERCION" with vuelos array)
		if payload.get("tipo") == "INSERCION":
			if "vuelos" not in payload:
				raise ValueError("❌ INSERCION debe tener campo 'vuelos'")
			if not isinstance(payload.get("vuelos"), list):
				raise ValueError("❌ Campo 'vuelos' debe ser un array")
			return "INSERCION"

		# Format 2: TOPOLOGIA (tree structure with codigo or izquierdo/derecho)
		if "codigo" in payload or "izquierdo" in payload or "derecho" in payload:
			return "TOPOLOGIA"

		raise ValueError(
			"❌ JSON no coincide con ningún formato esperado. "
			"Debe ser INSERCION (tipo + vuelos), TOPOLOGIA (árbol), o SYSTEM_EXPORT (tree + metrics)"
		)

	def parse_json(self, payload) -> Tuple[str, any, Optional[dict]]:
		"""
		Unified parser: detects format and returns parsed data with optional metrics.

		Returns:
			Tuple of (format_type, parsed_data, historical_metrics)
			- format_type: "INSERCION", "TOPOLOGIA", or "SYSTEM_EXPORT"
			- parsed_data: NodoVuelo (tree root) or List[NodoVuelo] (for INSERCION)
			- historical_metrics: Dict or None (only for SYSTEM_EXPORT)

		Raises:
			ValueError: If parsing fails.
		"""
		try:
			fmt = self.detect_json_format(payload)

			if fmt == "INSERCION":
				parsed = self._parse_insercion(payload)
				return ("INSERCION", parsed, None)

			elif fmt == "TOPOLOGIA":
				parsed = self._parse_topologia(payload)
				return ("TOPOLOGIA", parsed, None)

			elif fmt == "SYSTEM_EXPORT":
				parsed, metrics = self._parse_system_export(payload)
				return ("SYSTEM_EXPORT", parsed, metrics)

		except ValueError:
			raise
		except Exception as e:
			raise ValueError(f"❌ Error al parsear JSON: {str(e)}")

	def _parse_insercion(self, payload) -> List[NodoVuelo]:
		"""
		Parse Format 1: INSERCION (flight list).

		Returns:
			List of NodoVuelo objects (not connected as tree).
		"""
		vuelos = payload.get("vuelos", [])

		if not vuelos:
			raise ValueError("❌ INSERCION vacío: no hay vuelos para insertar")

		parsed_vuelos = []
		for i, vuelo in enumerate(vuelos):
			try:
				# Normalize the flight
				normalized = self._normalize_vuelo(vuelo)

				# Create NodoVuelo from normalized flight
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
				raise ValueError(f"❌ Error en vuelo {i}: {str(e)}")

		return parsed_vuelos

	def _parse_topologia(self, payload) -> NodoVuelo:
		"""
		Parse Format 2: TOPOLOGIA (tree structure).
		Also used as the tree extractor for Format 3.

		Returns:
			NodoVuelo root node (possibly recursive structure).
		"""
		if payload is None:
			return None

		# Normalize the node recursively
		normalized = self._normalize_node(payload)

		# Convert normalized dict to NodoVuelo
		return self._dict_to_nodo_vuelo(normalized)

	def _parse_system_export(self, payload) -> Tuple[NodoVuelo, dict]:
		"""
		Parse Format 3: SYSTEM_EXPORT (tree + metrics).

		Returns:
			Tuple of (root NodoVuelo, historical_metrics dict)
		"""
		tree_data = payload.get("tree")
		if tree_data is None:
			raise ValueError("❌ SYSTEM_EXPORT debe tener campo 'tree'")

		# Parse the tree part using topologia parser
		root = self._parse_topologia(tree_data)

		# Extract metrics (if present)
		metrics = payload.get("metrics", {})

		return (root, metrics)

	def _dict_to_nodo_vuelo(self, data: dict) -> NodoVuelo:
		"""
		Convert normalized dict to NodoVuelo (recursive).

		Assumes:
		- codigo is already string
		- prioridad is already set to 1 if missing
		- precioFinal defaults correctly
		"""
		if data is None:
			return None

		# Recursively process children
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