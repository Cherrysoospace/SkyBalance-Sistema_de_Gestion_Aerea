#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test de prioridad: respetar valores, establecer 1 si falta"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.PersistenceService import persistenceService

def test_prioridad_logic():
    print("=" * 70)
    print("[TEST] LOGICA DE PRIORIDAD")
    print("=" * 70)

    # Test 1: Vuelos con prioridades variadas - DEBEN MANTENERSE
    print("\n[TEST 1] RESPETO DE PRIORIDADES EXISTENTES (INSERCION)")
    insercion_con_prioridades = {
        "tipo": "INSERCION",
        "vuelos": [
            {"codigo": "V1", "origen": "O", "destino": "D", "horaSalida": "10:00",
             "precioBase": 100, "pasajeros": 10, "promocion": False, "alerta": False,
             "prioridad": 5},  # Explícito: 5
            {"codigo": "V2", "origen": "O", "destino": "D", "horaSalida": "11:00",
             "precioBase": 100, "pasajeros": 10, "promocion": False, "alerta": False,
             "prioridad": 1},  # Explícito: 1
            {"codigo": "V3", "origen": "O", "destino": "D", "horaSalida": "12:00",
             "precioBase": 100, "pasajeros": 10, "promocion": False, "alerta": False,
             "prioridad": 0},  # Explícito: 0
            # V4 sin prioridad - DEBE SER 1
            {"codigo": "V4", "origen": "O", "destino": "D", "horaSalida": "13:00",
             "precioBase": 100, "pasajeros": 10, "promocion": False, "alerta": False},
        ]
    }

    try:
        normalized = persistenceService.validate_and_normalize_topology(insercion_con_prioridades)

        print(f"   [CHECK] Verificando prioridades mantenidas:")
        print(f"      V1: prioridad={normalized[0]['prioridad']} (esperado 5) ... {'✓' if normalized[0]['prioridad'] == 5 else '✗ ERROR'}")
        print(f"      V2: prioridad={normalized[1]['prioridad']} (esperado 1) ... {'✓' if normalized[1]['prioridad'] == 1 else '✗ ERROR'}")
        print(f"      V3: prioridad={normalized[2]['prioridad']} (esperado 0) ... {'✓' if normalized[2]['prioridad'] == 0 else '✗ ERROR'}")
        print(f"      V4: prioridad={normalized[3]['prioridad']} (esperado 1, était None) ... {'✓' if normalized[3]['prioridad'] == 1 else '✗ ERROR'}")

        test1_pass = (
            normalized[0]['prioridad'] == 5 and
            normalized[1]['prioridad'] == 1 and
            normalized[2]['prioridad'] == 0 and
            normalized[3]['prioridad'] == 1
        )

        if not test1_pass:
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    # Test 2: TOPOLOGIA con prioridades variadas
    print("\n[TEST 2] RESPETO DE PRIORIDADES EXISTENTES (TOPOLOGIA)")
    topologia_con_prioridades = {
        "codigo": "R",
        "origen": "O", "destino": "D", "horaSalida": "10:00",
        "precioBase": 100, "pasajeros": 10, "promocion": False, "alerta": False,
        "altura": 2, "factorEquilibrio": 0,
        "prioridad": 3,  # Explícito: 3
        "izquierdo": {
            "codigo": "L",
            "origen": "O", "destino": "D", "horaSalida": "09:00",
            "precioBase": 80, "pasajeros": 5, "promocion": False, "alerta": False,
            "altura": 1, "factorEquilibrio": 0,
            "prioridad": 2,  # Explícito: 2
            "izquierdo": None,
            "derecho": None
        },
        "derecho": {
            "codigo": "R",
            "origen": "O", "destino": "D", "horaSalida": "11:00",
            "precioBase": 120, "pasajeros": 15, "promocion": False, "alerta": False,
            "altura": 1, "factorEquilibrio": 0,
            # Sin prioridad - DEBE SER 1
            "izquierdo": None,
            "derecho": None
        }
    }

    try:
        normalized = persistenceService.validate_and_normalize_topology(topologia_con_prioridades)

        print(f"   [CHECK] Verificando prioridades mantenidas en árbol:")
        print(f"      Raiz: prioridad={normalized['prioridad']} (esperado 3) ... {'✓' if normalized['prioridad'] == 3 else '✗ ERROR'}")
        print(f"      Izq: prioridad={normalized['izquierdo']['prioridad']} (esperado 2) ... {'✓' if normalized['izquierdo']['prioridad'] == 2 else '✗ ERROR'}")
        print(f"      Der: prioridad={normalized['derecho']['prioridad']} (esperado 1, era None) ... {'✓' if normalized['derecho']['prioridad'] == 1 else '✗ ERROR'}")

        test2_pass = (
            normalized['prioridad'] == 3 and
            normalized['izquierdo']['prioridad'] == 2 and
            normalized['derecho']['prioridad'] == 1
        )

        if not test2_pass:
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    # Test 3: Caso especial - prioridad null (JSON)
    print("\n[TEST 3] PRIORIDAD NULL EN JSON (debe convertirse a 1)")
    insercion_null = {
        "tipo": "INSERCION",
        "vuelos": [
            {"codigo": "V1", "origen": "O", "destino": "D", "horaSalida": "10:00",
             "precioBase": 100, "pasajeros": 10, "promocion": False, "alerta": False,
             "prioridad": None},  # Explícito pero None
        ]
    }

    try:
        normalized = persistenceService.validate_and_normalize_topology(insercion_null)

        print(f"   [CHECK] prioridad=null en JSON:")
        print(f"      V1: prioridad={normalized[0]['prioridad']} (esperado 1) ... {'✓' if normalized[0]['prioridad'] == 1 else '✗ ERROR'}")

        if normalized[0]['prioridad'] != 1:
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    print("\n" + "=" * 70)
    print("[DONE] LOGICA DE PRIORIDAD CORRECTA")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        success = test_prioridad_logic()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
