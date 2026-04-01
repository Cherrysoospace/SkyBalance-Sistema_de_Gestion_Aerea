#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test de carga de INSERCION en árbol"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.TreeService import treeService
from services.PersistenceService import persistenceService

def test_insercion_load():
    print("=" * 70)
    print("[TEST] CARGAR INSERCION EN ARBOL")
    print("=" * 70)

    try:
        # Cargar ModoInserción
        print("\n[PREP] Cargando ModoInserción.json...")
        with open("data/ModoInserción.json", "r") as f:
            insercion_payload = json.load(f)

        print(f"   - Vuelos en archivo: {len(insercion_payload['vuelos'])}")

        # Normalizar
        normalized = persistenceService.validate_and_normalize_topology(insercion_payload)

        print(f"   - Vuelos tras normalizar: {len(normalized)}")
        print(f"   - Tipo de retorno: {type(normalized).__name__}")

        # Simular carga (igual que hace persistenceRouter.py)
        if isinstance(normalized, list):
            print("\n[PROC] Insertando vuelos en árbol...")
            for i, vuelo in enumerate(normalized):
                treeService.insert_flight(vuelo)
                if i == 0:
                    print(f"   - Vuelo 1: codigo='{vuelo['codigo']}', prioridad={vuelo['prioridad']}")
                elif i == len(normalized) - 1:
                    print(f"   - Vuelo {i+1}: codigo='{vuelo['codigo']}', prioridad={vuelo['prioridad']}")

            # Verificar árbol construido
            print(f"\n[CHECK] Árbol construido:")
            tree = treeService.get_tree()
            metrics = treeService.get_metrics()

            if tree:
                print(f"   - Raiz: codigo='{tree['codigo']}'")
                print(f"   - Altura: {metrics['alturaActual']}")
                print(f"   - Hojas: {metrics['hojas']}")
                print(f"   - Próximo BFS: {len(metrics.get('bfs', []))} nodos")
            else:
                print(f"   - ERROR: árbol vacío")
                return False

            print("\n[OK] INSERCION cargado exitosamente en árbol")

        else:
            print(f"   [ERROR] Esperado list, recibido {type(normalized)}")
            return False

    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "=" * 70)
    print("[DONE] TEST EXITOSO")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        success = test_insercion_load()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
