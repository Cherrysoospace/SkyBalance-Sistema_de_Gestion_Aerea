#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test verificar que exportación es siempre TOPOLOGIA"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.TreeService import treeService
from services.PersistenceService import persistenceService

def test_export_after_insercion():
    print("=" * 70)
    print("[TEST] EXPORTACION DESPUES DE CARGAR INSERCION")
    print("=" * 70)

    try:
        # 1. Cargar INSERCION
        print("\n[PREP] Cargando ModoInserción...")
        with open("data/ModoInserción.json", "r") as f:
            insercion_payload = json.load(f)

        normalized = persistenceService.validate_and_normalize_topology(insercion_payload)

        if isinstance(normalized, list):
            for vuelo in normalized:
                treeService.insert_flight(vuelo)
            print(f"   - {len(normalized)} vuelos insertados")
        else:
            print(f"   ERROR: no es lista")
            return False

        # 2. Exportar
        print("\n[PROC] Exportando árbol...")
        exported = treeService.export_json()

        # 3. Verificar que es TOPOLOGIA (no INSERCION)
        print("\n[CHECK] Verificando formato de exportación:")

        # No debe tener estos campos de INSERCION
        if "tipo" in exported and exported["tipo"] == "INSERCION":
            print(f"   [FAIL] Exportación no puede ser INSERCION!")
            return False

        if "vuelos" in exported and isinstance(exported.get("vuelos"), list):
            print(f"   [FAIL] Exportación tiene campo 'vuelos' (formato INSERCION)!")
            return False

        # Debe tener estructura de TOPOLOGIA
        if not ("codigo" in exported and ("izquierdo" in exported or "derecho" in exported)):
            print(f"   [FAIL] Exportación no es árbol jerárquico!")
            return False

        print(f"   [OK] Formato: TOPOLOGIA (árbol jerárquico)")
        print(f"      - Tiene 'codigo': {('codigo' in exported)}")
        print(f"      - Tiene 'izquierdo': {('izquierdo' in exported)}")
        print(f"      - Tiene 'derecho': {('derecho' in exported)}")
        print(f"      - NO tiene 'tipo': {('tipo' not in exported)}")
        print(f"      - NO tiene 'vuelos': {('vuelos' not in exported)}")

        # Validar estructura
        validation = persistenceService.validate_exported_json(exported)
        print(f"\n[VALID] Validación de estructura:")
        print(f"   - Valid: {validation['valid']}")
        print(f"   - Nodos: {validation['nodes_count']}")
        if validation['errors']:
            print(f"   - Errores: {validation['errors'][:2]}")

        # 4. Puede reimportar la exportación como TOPOLOGIA
        print(f"\n[REIMPORT] Intentando reimportar exportación...")
        reimported = persistenceService.validate_and_normalize_topology(exported)

        if isinstance(reimported, dict):
            print(f"   [OK] Reimporte exitoso como TOPOLOGIA (dict)")
        else:
            print(f"   [FAIL] Reimporte retornó {type(reimported)} en lugar de dict")
            return False

    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "=" * 70)
    print("[DONE] EXPORTACION ES TOPOLOGIA - CORRECTO")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        success = test_export_after_insercion()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
