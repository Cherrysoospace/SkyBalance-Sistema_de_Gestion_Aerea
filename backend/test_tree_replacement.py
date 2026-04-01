#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test de reemplazo de árbol (no fusión)"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.TreeService import treeService
from services.PersistenceService import persistenceService

def test_tree_replacement():
    print("=" * 70)
    print("[TEST] REEMPLAZO DE ARBOL (NO FUSION)")
    print("=" * 70)

    try:
        # PASO 1: Cargar TOPOLOGIA
        print("\n[PASO 1] Cargar ModoTopología.json...")
        with open("data/ModoTopología.json", "r") as f:
            topologia_payload = json.load(f)

        normalized_topo = persistenceService.validate_and_normalize_topology(topologia_payload)

        treeService.load_from_json_data(normalized_topo)
        tree1 = treeService.get_tree()
        metrics1 = treeService.get_metrics()

        nodos_topologia = metrics1.get('bfs', [])
        print(f"   - Árbol cargado: raiz='{tree1['codigo']}', nodos={len(nodos_topologia)}")

        # PASO 2: Cargar INSERCION
        print("\n[PASO 2] Cargar ModoInserción.json (debe REEMPLAZAR)...")
        with open("data/ModoInserción.json", "r") as f:
            insercion_payload = json.load(f)

        normalized_inser = persistenceService.validate_and_normalize_topology(insercion_payload)

        # Reconvertir a formato dict como lo hace el router
        payload_to_load = {
            "tipo": "INSERCION",
            "vuelos": normalized_inser
        }

        treeService.load_from_json_data(payload_to_load)
        tree2 = treeService.get_tree()
        metrics2 = treeService.get_metrics()

        nodos_insercion = metrics2.get('bfs', [])
        print(f"   - Árbol cargado: raiz='{tree2['codigo']}', nodos={len(nodos_insercion)}")

        # PASO 3: Verificar que se REEMPLAZÓ (no fusionó)
        print("\n[CHECK] Verificando reemplazo:")
        print(f"   - Árbol 1 (TOPOLOGIA): {len(nodos_topologia)} nodos, raiz '{tree1['codigo']}'")
        print(f"   - Árbol 2 (INSERCION): {len(nodos_insercion)} nodos, raiz '{tree2['codigo']}'")

        # El árbol debe haber sido reemplazado
        if len(nodos_topologia) != len(nodos_insercion):
            print(f"   [OK] TAMAÑOS DIFERENTES: {len(nodos_topologia)} vs {len(nodos_insercion)}")
        else:
            print(f"   [!] Ambos tienen {len(nodos_topologia)} nodos (podría ser coincidencia)")

        # Verificar que no hay duplicados de raíz de TOPOLOGIA
        raiz_topologia = tree1['codigo']
        raiz_insercion = tree2['codigo']

        if raiz_topologia != raiz_insercion:
            print(f"   [OK] RAICES DIFERENTES: '{raiz_topologia}' vs '{raiz_insercion}'")
            print(f"       --> Árbol fue REEMPLAZADO (no fusionado)")
            return True
        else:
            print(f"   [!] Ambos tienen raiz '{raiz_topologia}' (probando más...)")

            # Buscar si está la raiz original de TOPOLOGIA en el nuevo árbol
            nodos_insercion_set = {n['codigo'] for n in nodos_insercion}
            if raiz_topologia in nodos_insercion_set:
                print(f"   [WARNING] Raiz de TOPOLOGIA '{raiz_topologia}' sigue en el árbol")
                print(f"       --> Posible FUSION detectada")
                return False
            else:
                print(f"   [OK] Raiz de TOPOLOGIA '{raiz_topologia}' NO está en nuevo árbol")
                print(f"       --> Árbol fue REEMPLAZADO")
                return True

    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = test_tree_replacement()
        print("\n" + "=" * 70)
        if success:
            print("[DONE] REEMPLAZO FUNCIONA CORRECTAMENTE")
        else:
            print("[DONE] FUSION DETECTADA - PROBLEMA PRESENTE")
        print("=" * 70)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
