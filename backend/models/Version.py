"""
Contexto de este archivo del que tengo mis dudas si dejarlo o no

version.py es el modelo que representa un snapshot nombrado del árbol, es decir, lo que se guarda cuando el usuario hace algo como "Guardar versión → Simulación Alta Demanda".
Guarda tres cosas básicamente:

nombre — el nombre que el usuario le dio a esa versión
snapshot — una copia profunda (deepcopy) del árbol completo en ese momento
timestamp — cuándo se guardó

Es el modelo que usa VersioningService internamente para guardar y restaurar versiones. Sin él, el versionado no tendría dónde almacenar la información de cada versión guardada.
En resumen: es solo una clase contenedora de datos


"""