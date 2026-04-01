import json


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


persistenceService = PersistenceService()