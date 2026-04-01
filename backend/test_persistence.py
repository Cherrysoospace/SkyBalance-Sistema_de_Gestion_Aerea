#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test script para validación de topología JSON"""

import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.PersistenceService import persistenceService

def test_validation():
    print("=" * 70)
    print("[TEST] PERSISTENCE VALIDATION - AMBOS FORMATOS")
    print("=" * 70)

    # Test 1: Cargar ModoTopología (TOPOLOGIA)
    print("\n[PASS] Test 1: TOPOLOGIA (ModoTopología.json)")
    try:
        with open("data/ModoTopología.json", "r") as f:
            topologia_payload = json.load(f)

        print(f"   - Formato detectado: {type(topologia_payload).__name__}")
        print(f"   - Raiz codigo: {topologia_payload.get('codigo')} (tipo: {type(topologia_payload.get('codigo')).__name__})")
        print(f"   - Raiz prioridad: {topologia_payload.get('prioridad')}")

        normalized = persistenceService.validate_and_normalize_topology(topologia_payload)

        print(f"   [OK] NORMALIZADO (tipo retorno: {type(normalized).__name__}):")
        if isinstance(normalized, dict):
            print(f"      - Raiz codigo: '{normalized.get('codigo')}' (tipo: {type(normalized.get('codigo')).__name__})")
            print(f"      - Raiz prioridad: {normalized.get('prioridad')}")
        else:
            print(f"      - ERROR: esperado dict, recibido {type(normalized)}")
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    # Test 2: Cargar ModoInserción (INSERCION)
    print("\n[PASS] Test 2: INSERCION (ModoInserción.json)")
    try:
        with open("data/ModoInserción.json", "r") as f:
            insercion_payload = json.load(f)

        print(f"   - Formato detectado: tipo={insercion_payload.get('tipo')}")
        print(f"   - Vuelos: {len(insercion_payload.get('vuelos', []))}")
        print(f"   - Primer vuelo codigo: '{insercion_payload['vuelos'][0]['codigo']}' (tipo: {type(insercion_payload['vuelos'][0]['codigo']).__name__})")
        print(f"   - Primer vuelo prioridad: {insercion_payload['vuelos'][0].get('prioridad')}")

        normalized = persistenceService.validate_and_normalize_topology(insercion_payload)

        print(f"   [OK] NORMALIZADO (tipo retorno: {type(normalized).__name__}):")
        if isinstance(normalized, list):
            print(f"      - Vuelos: {len(normalized)}")
            print(f"      - Primer vuelo codigo: '{normalized[0]['codigo']}' (tipo: {type(normalized[0]['codigo']).__name__})")
            print(f"      - Primer vuelo prioridad: {normalized[0]['prioridad']}")
        else:
            print(f"      - ERROR: esperado list, recibido {type(normalized)}")
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    # Test 3: Topología con código int y sin prioridad
    print("\n[TEST] Test 3: TOPOLOGIA personalizada (codigo int, prioridad falta)")
    test_payload = {
        "codigo": 100,  # int - debe convertir a string
        "origen": "Test",
        "destino": "Test",
        "horaSalida": "10:00",
        "precioBase": 100,
        "precioFinal": 100,
        "pasajeros": 10,
        "promocion": False,
        "alerta": False,
        "altura": 1,
        "factorEquilibrio": 0,
        # Sin prioridad - debe establecer 1
        "izquierdo": None,
        "derecho": None
    }

    try:
        normalized = persistenceService.validate_and_normalize_topology(test_payload)

        if isinstance(normalized, dict):
            print(f"   [OK] NORMALIZADO (TOPOLOGIA):")
            print(f"      - Raiz codigo: '{normalized['codigo']}' (era int {test_payload['codigo']})")
            print(f"      - Raiz prioridad: {normalized['prioridad']} (era None)")
        else:
            print(f"      - ERROR: esperado dict (TOPOLOGIA), recibido {type(normalized)}")
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    # Test 4: INSERCION personalizado
    print("\n[TEST] Test 4: INSERCION personalizado (codigo int, prioridad falta)")
    test_insercion = {
        "tipo": "INSERCION",
        "ordenamiento": "codigo",
        "vuelos": [
            {
                "codigo": 100,  # int
                "origen": "TestOrig",
                "destino": "TestDest",
                "horaSalida": "10:00",
                "precioBase": 100,
                "pasajeros": 50,
                # Sin prioridad
                "promocion": False,
                "alerta": False
            },
            {
                "codigo": "SB200",  # string
                "origen": "TestOrig2",
                "destino": "TestDest2",
                "horaSalida": "11:00",
                "precioBase": 150,
                "pasajeros": 60,
                # Sin prioridad
                "promocion": True,
                "alerta": False
            }
        ]
    }

    try:
        normalized = persistenceService.validate_and_normalize_topology(test_insercion)

        if isinstance(normalized, list):
            print(f"   [OK] NORMALIZADO (INSERCION):")
            print(f"      - Vuelos: {len(normalized)}")
            print(f"      - Vuelo[0] codigo: '{normalized[0]['codigo']}' (era int {test_insercion['vuelos'][0]['codigo']})")
            print(f"      - Vuelo[0] prioridad: {normalized[0]['prioridad']} (era None)")
            print(f"      - Vuelo[1] codigo: '{normalized[1]['codigo']}' (tipo: {type(normalized[1]['codigo']).__name__})")
            print(f"      - Vuelo[1] prioridad: {normalized[1]['prioridad']}")
        else:
            print(f"      - ERROR: esperado list (INSERCION), recibido {type(normalized)}")
            return False

    except Exception as e:
        print(f"   [FAIL] ERROR: {e}")
        return False

    print("\n" + "=" * 70)
    print("[DONE] TODOS LOS TESTS PASARON")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = test_validation()
    sys.exit(0 if success else 1)
