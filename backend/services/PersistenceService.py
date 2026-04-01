import json


# Utility service for reading/writing JSON payloads.
class PersistenceService:

	def parse_json_text(self, content):
		return json.loads(content)

	def to_json_text(self, payload):
		return json.dumps(payload, ensure_ascii=False, indent=2)

	def validate_and_normalize_topology(self, payload):
		"""
		Valida y normaliza una topología JSON:
		1. Rechaza formato INSERCION ([] de vuelos)
		2. Acepta formato TOPOLOGIA (árbol jerárquico)
		3. Convierte codigo int → string
		4. Establece prioridad = 1 si falta
		"""
		# Verificar si es INSERCION (no permitido)
		if isinstance(payload, dict) and payload.get("tipo") == "INSERCION":
			raise ValueError("❌ No se puede cargar formato INSERCION. Use formato TOPOLOGIA (árbol jerárquico)")

		if isinstance(payload, dict) and isinstance(payload.get("vuelos"), list):
			raise ValueError("❌ No se puede cargar formato de lista de vuelos. Use formato TOPOLOGIA (árbol jerárquico)")

		# Debe ser un árbol (dict con estructura jerárquica)
		if not isinstance(payload, dict):
			raise ValueError("❌ Topología debe ser un objeto JSON (árbol jerárquico)")

		# Normalizar el árbol recursivamente
		normalized = self._normalize_node(payload)
		return normalized

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