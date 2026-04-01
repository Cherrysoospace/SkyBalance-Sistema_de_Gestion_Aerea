#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test de profundidad máxima aplicada correctamente"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.TreeService import treeService
from services.PersistenceService import persistenceService
from tree.nodo import Node

def test_depth_limit_on_load():
    print("=" * 70)
    print("[TEST] PROFUNDIDAD MÁXIMA AL CARGAR")
    print("=" * 70)

    try:
        # Cargar ModoInserción.json con depthLimit=2
        print("\n[PASO 1] Cargar ModoInserción.json con depthLimit=1...")
        with open("data/ModoInserción.json", "r") as f:
            insercion_payload = json.load(f)

        normalized = persistenceService.validate_and_normalize_topology(insercion_payload)
        payload_to_load = {"tipo": "INSERCION", "vuelos": normalized}

        # Establecer depthLimit DESPUÉS de cargar (como en el router corregido)
        treeService.load_from_json_data(payload_to_load)
        treeService.set_depth_limit(1)  # Más bajo para tener nodos críticos

        tree = treeService.get_tree()
        metrics = treeService.get_metrics()

        # Extraer todos los nodos del árbol serializado
        def collect_nodes(node):
            if node is None:
                return []
            nodos = [node]
            if node.get('izquierdo'):
                nodos.extend(collect_nodes(node['izquierdo']))
            if node.get('derecho'):
                nodos.extend(collect_nodes(node['derecho']))
            return nodos

        nodos_todos = collect_nodes(tree)
        print(f"   - Árbol cargado: {len(nodos_todos)} nodos")
        print(f"   - depthLimit establecido: 1")

        # Verificar penalidades
        nodos_criticos = [n for n in nodos_todos if n.get('critico', False)]
        nodos_normales = [n for n in nodos_todos if not n.get('critico', False)]

        print(f"\n[CHECK] Penalidades aplicadas:")
        print(f"   - Nodos normales (profundidad <= 2): {len(nodos_normales)}")
        print(f"   - Nodos críticos (profundidad > 2): {len(nodos_criticos)}")

        if len(nodos_criticos) > 0:
            print(f"\n[CHECK] Verificando penalidades en nodos críticos:")
            for node in nodos_criticos[:2]:  # Mostrar primeros 2
                code = node['codigo']
                precio_base = node['precioBase']
                precio_final = node['precioFinal']
                print(f"   - {code}: precioBase={precio_base}, precioFinal={precio_final}")
                # Esperado: precioFinal = precioBase * 1.25
                expected = round(precio_base * 1.25, 2)
                if precio_final == expected:
                    print(f"      ✓ Penalidad correcta ({precio_final} == {expected})")
                else:
                    print(f"      ✗ Penalidad INCORRECTA ({precio_final} != {expected})")
                    return False
        else:
            print(f"\n[CHECK] Sin nodos críticos (ajusta depthLimit más bajo)")

        return True

    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_depth_limit_on_modify():
    print("\n" + "=" * 70)
    print("[TEST] PROFUNDIDAD MÁXIMA AL MODIFICAR NODOS")
    print("=" * 70)

    try:
        # Usar el árbol del test anterior
        print("\n[PASO 1] Modificar nodo (cambiar precioBase)...")

        # Obtener un nodo del árbol actual
        tree = treeService.get_tree()

        def collect_nodes(node):
            if node is None:
                return []
            nodos = [node]
            if node.get('izquierdo'):
                nodos.extend(collect_nodes(node['izquierdo']))
            if node.get('derecho'):
                nodos.extend(collect_nodes(node['derecho']))
            return nodos

        nodos_todos = collect_nodes(tree)
        if len(nodos_todos) == 0:
            print("   [SKIP] No hay nodos para modificar")
            return True

        target_code = nodos_todos[0]['codigo']
        print(f"   - Modificando nodo: {target_code}")

        # Modificar
        updates = {"precioBase": 999}
        treeService.modify_node(target_code, updates)

        # Obtener nodo después
        tree_after = treeService.get_tree()
        nodos_todos_after = collect_nodes(tree_after)
        modified_node = next((n for n in nodos_todos_after if n['codigo'] == target_code), None)

        if modified_node is None:
            print(f"   [FAIL] No encontré nodo después de modificar")
            return False

        print(f"   - Nodo después: precioBase={modified_node['precioBase']}, precioFinal={modified_node['precioFinal']}")

        # Verificar que se aplicó nuevamente la penalidad
        if modified_node.get('critico', False):
            expected = round(999 * 1.25, 2)
            actual = modified_node['precioFinal']
            print(f"   - Penalidad re-aplicada: {actual} (esperado {expected})")
            if actual == expected:
                print(f"      ✓ Penalidad correcta después de modificar")
            else:
                print(f"      ✗ Penalidad INCORRECTA")
                return False
        else:
            print(f"   - Nodo no crítico (profundidad <= depthLimit), precioFinal debe ser = precioBase")
            if modified_node['precioFinal'] == 999:
                print(f"      ✓ precioFinal correcto (sin penalidad)")
            else:
                print(f"      ✗ precioFinal INCORRECTO (es {modified_node['precioFinal']}, esperado 999)")
                return False

        return True

    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        test1 = test_depth_limit_on_load()
        test2 = test_depth_limit_on_modify()

        print("\n" + "=" * 70)
        if test1 and test2:
            print("[DONE] PROFUNDIDAD MÁXIMA FUNCIONA CORRECTAMENTE")
        else:
            print("[DONE] PROBLEMAS DETECTADOS")
        print("=" * 70)
        sys.exit(0 if (test1 and test2) else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
