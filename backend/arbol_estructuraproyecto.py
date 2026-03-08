"""
Esta es la estructura que propuso Claude, este archivo SERÁ quitado luego

skybalance-backend/
├── main.py                         # Punto de entrada FastAPI
├── requirements.txt
│
├── models/                         # Clases de datos (equivale a las Java)
│   ├── vuelo.py                    # Dataclass Vuelo
│   ├── nodo_avl.py                 # NodoAVL
│   └── nodo_bst.py                 # NodoBST
│
├── tree/                           # Núcleo de estructuras
│   ├── avl_tree.py                 # Árbol AVL completo
│   ├── bst_tree.py                 # BST paralelo
│   ├── action_stack.py             # Pila undo (Ctrl+Z)
│   └── insertion_queue.py          # Cola de concurrencia
│
├── services/                       # Lógica de negocio
│   ├── tree_service.py             # Operaciones del árbol
│   ├── persistence_service.py      # Leer/escribir JSON
│   ├── versioning_service.py       # Versionado nombrado
│   ├── metrics_service.py          # Métricas analíticas
│   ├── penalty_service.py          # Penalización profundidad
│   └── audit_service.py            # Verificación AVL
│
├── schemas/                        # DTOs con Pydantic
│   ├── vuelo_schema.py
│   ├── tree_response_schema.py
│   ├── metrics_schema.py
│   └── comparison_schema.py        # AVL vs BST
│
└── routers/                        # Equivalente a Controllers
    ├── tree_router.py
    ├── persistence_router.py
    ├── version_router.py
    ├── queue_router.py
    └── metrics_router.py
"""