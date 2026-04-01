#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test de exportación para verificar formato consistente"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.TreeService import treeService
from services.PersistenceService import persistenceService

def test_export():
    print("=" * 70)
    print("[TEST] EXPORT FORMAT CONSISTENCY")
    print("=" * 70)

    # Cargar topología
    print("\n[PREP] Cargando topología de prueba...")
    with open("data/ModoTopología.json", "r") as f:
        topology = json.load(f)

    normalized = persistenceService.validate_and_normalize_topology(topology)

    # Cargar en el árbol
    treeService.load_from_json_data(normalized)

    # Exportar
    exported = treeService.export_json()

    print("[OK] Árbol cargado y exportado")
    print(f"    - Nodos: {sum(1 for node in [exported] if node)}")

    # Verificar formato
    print("\n[TEST] Verificando formato de exportación:")

    def check_node(node, path="root", depth=0):
        if node is None:
            return []

        if depth > 2:  # Solo revisar primeros 3 niveles
            return []

        issues = []

        # Campos esperados
        required_fields = ["codigo", "origen", "destino", "horaSalida",
                          "precioBase", "precioFinal", "pasajeros",
                          "promocion", "alerta", "altura", "factorEquilibrio", "prioridad"]

        for field in required_fields:
            if field not in node:
                issues.append(f"FALTA '{field}' en {path}")

        # Campos que NO deben estar
        forbidden_fields = ["critico", "left", "right"]
        for field in forbidden_fields:
            if field in node:
                issues.append(f"PROHIBIDO '{field}' en {path}")

        # Verificar campos de árbol
        has_left = "izquierdo" in node
        has_right = "derecho" in node
        if not has_left or not has_right:
            issues.append(f"FALTA estructura de árbol en {path}")

        # Verificar tipo de codigo
        if "codigo" in node and not isinstance(node["codigo"], str):
            issues.append(f"codigo debe ser string en {path}, es {type(node['codigo']).__name__}")

        # Procesar recursivamente
        if "izquierdo" in node and node["izquierdo"] is not None:
            issues.extend(check_node(node["izquierdo"], f"{path}.izquierdo", depth+1))

        if "derecho" in node and node["derecho"] is not None:
            issues.extend(check_node(node["derecho"], f"{path}.derecho", depth+1))

        return issues

    issues = check_node(exported)

    if issues:
        print("[FAIL] Problemas encontrados:")
        for issue in issues[:5]:  # Solo mostrar 5 primeros
            print(f"      - {issue}")
    else:
        print("[OK] Formato de exportación correcto!")
        print(f"      - Todos los campos requeridos presentes")
        print(f"      - Ningún campo prohibido detectado")
        print(f"      - Estructura 'izquierdo/derecho' correcta")
        print(f"      - Tipo de 'codigo' es string")

    # Mostrar raíz
    print("\n[INFO] Raíz exportada:")
    print(f"      - codigo: '{exported['codigo']}' (type: {type(exported['codigo']).__name__})")
    print(f"      - prioridad: {exported['prioridad']} (type: {type(exported['prioridad']).__name__})")
    print(f"      - altura: {exported['altura']}")
    print(f"      - factorEquilibrio: {exported['factorEquilibrio']}")
    print(f"      - campos totales: {len(exported)}")

    # Listar campos de raíz
    print(f"\n[INFO] Campos en raíz: {', '.join(sorted([k for k in exported.keys() if k not in ['izquierdo', 'derecho']]))}")

    print("\n" + "=" * 70)
    return len(issues) == 0

if __name__ == "__main__":
    try:
        success = test_export()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
