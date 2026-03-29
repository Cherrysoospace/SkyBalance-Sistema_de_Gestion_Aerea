# Contexto de Cambios Backend - Frontend Integration Guide

## 📌 Resumen de Cambios Realizados

Se ha implementado un sistema de **comparación en paralelo entre AVL y BST** para analizar cómo ambas estructuras manejan los mismos datos de vuelos.

---

## 🔄 Cambios en Backend

### 1. **tree/bstTree.py** - Nuevos Métodos Agregados
Se agregaron métodos al BST para que tenga la misma interfaz que el AVL:

```python
# Métodos completados:
- getRoot()                    # Retorna la raíz del árbol
- countLeaves()               # Cuenta hojas del BST
- calculateHeight()           # Calcula altura/profundidad
- toDict()                    # Serializa a formato D3 (igual que AVL)
- getMetrics()                # Retorna métricas: altura, hojas, recorridos
- clear()                     # Limpia el árbol
- loadFromTopology()          # Carga desde estructura serializada
```

**Propósito**: Hacer el BST visible y comparable con el AVL manteniendo la misma estructura de datos.

---

### 2. **services/TreeService.py** - Sincronización Dual

#### Constructor Modificado:
```python
def __init__(self):
    self.avl = AVL()      # Árbol AVL con balanceo automático
    self.bst = BST()      # Árbol BST sin balanceo
    # ... resto del init
```

#### Operaciones Sincronizadas:

| Operación | Comportamiento |
|-----------|---|
| `insert_flight()` | Inserta el **mismo nodo** en AVL y BST simultáneamente |
| `delete_node()` | Elimina del AVL, luego del BST si tuvo éxito |
| `cancel_subtree()` | Cancela subtree en AVL, luego en BST |
| `undo()` | Restaura ambos árboles desde la topología guardada |
| `load_from_json_data()` | Carga datos en ambos árboles |
| `rebalance_global()` | Rebalancea AVL y sincroniza BST con nuevo estado |

#### Nuevo Método - `get_comparison()`:
```python
def get_comparison(self):
    """Retorna comparación completa entre AVL y BST"""
    return {
        "avl": {
            "tree": {...estructura serializada...},
            "metrics": {
                "raiz": valor,
                "profundidad": int,
                "hojas": count,
                "alturaActual": int
            }
        },
        "bst": {
            "tree": {...estructura serializada...},
            "metrics": {
                "raiz": valor,
                "profundidad": int,
                "hojas": count,
                "alturaActual": int
            }
        }
    }
```

**Propósito**: Mantener ambas estructuras en sincronía y permitir compararlas en tiempo real.

---

### 3. **routers/treeRouter.py** - Nuevo Endpoint

```python
@router.get("/comparison", response_model=TreeComparisonResponseSchema)
def get_comparison():
    """
    Devuelve comparación completa entre AVL y BST.
    Incluye:
    - Estructura serializada de ambos árboles (D3-friendly)
    - Métricas: raíz, profundidad, hojas
    """
    return treeService.get_comparison()
```

**URL**: `GET http://localhost:8000/tree/comparison`

**Respuesta**: JSON con estructura de ambos árboles y sus métricas.

---

## 🎯 Propósito de los Cambios

| Aspecto | Por Qué |
|--------|--------|
| **Dual Trees** | Demostrar diferencia entre BST (sin balanceo) y AVL (balanceado) con mismos datos |
| **Sincronización** | Garantizar que ambos contienen exactamente los mismos vuelos |
| **Endpoint `/comparison`** | Permitir frontend obtener ambas estructuras + métricas en una sola llamada |
| **Métricas** | Mostrar: raíz, profundidad, hojas para análisis visual y numérico |

---

## 📊 Flujo de Uso en Frontend

### Caso 1: Insertar un Vuelo
```
1. POST /tree/insert {vuelo}
   ├── Inserta en AVL (se balancea automáticamente)
   └── Inserta en BST (estructura pura sin rotaciones)

2. GET /tree/comparison
   ├── Retorna AVL con su estructura balanceada
   └── Retorna BST con su estructura desbalanceada

3. Mostrar lado a lado ambos árboles
```

### Caso 2: Eliminar un Nodo
```
1. DELETE /tree/delete/{codigo}
   ├── Elimina del AVL
   └── Elimina del BST

2. GET /tree/comparison
   ├── Ambos reflejan la eliminación
```

### Caso 3: Deshacer Acción
```
1. POST /tree/undo
   ├── Restaura AVL desde snapshot
   └── Restaura BST desde snapshot

2. GET /tree/comparison
   ├── Ambos recuperan estado anterior
```

---

## 🎨 Recomendaciones para Frontend

### Visualización:
- **Layout**: Mostrar 2 gráficos lado a lado (AVL | BST)
- **Colores**: Diferente color para cada árbol (ej: Azul AVL, Rojo BST)
- **Información**: Mostrar tabla comparativa debajo

### Componente de Comparación:
```javascript
// Estructura esperada del endpoint /comparison
{
  avl: {
    tree: { codigo, origen, destino, ..., izquierdo, derecho },
    metrics: { raiz, profundidad, hojas, alturaActual }
  },
  bst: {
    tree: { codigo, origen, destino, ..., izquierdo, derecho },
    metrics: { raiz, profundidad, hojas, alturaActual }
  }
}
```

### Tabla Comparativa:
| Propiedad | AVL | BST |
|-----------|-----|-----|
| Raíz | `metrics.raiz` | `metrics.raiz` |
| Profundidad | `metrics.profundidad` | `metrics.profundidad` |
| Hojas | `metrics.hojas` | `metrics.hojas` |

---

## ⚠️ Notas Importantes

1. **Mismo Nodo**: Ambos árboles contienen los MISMOS vuelos (mismo código, datos)
2. **Estructura Diferente**: Difieren en cómo los organizan (AVL balanceado, BST puro)
3. **Sincronización**: Al insertar/eliminar, ambos se actualizan
4. **Endpoint único**: `/comparison` devuelve TODO en una llamada (no necesita 2 endpoints)

---

## 🚀 Próximos Pasos en Frontend

1. **Crear componente** `TreeComparison.jsx` que:
   - Llame a `GET /tree/comparison`
   - Muestre 2 árboles lado a lado
   - Muestre tabla comparativa debajo

2. **Integrar en flujo de inserción**:
   - Después de `POST /insert`, llamar a `GET /comparison`
   - Actualizar visualización de ambos árboles

3. **Integrar en flujo de eliminación**:
   - Después de `DELETE /delete`, llamar a `GET /comparison`

4. **Integrar en flujo de undo**:
   - Después de `POST /undo`, llamar a `GET /comparison`

---
