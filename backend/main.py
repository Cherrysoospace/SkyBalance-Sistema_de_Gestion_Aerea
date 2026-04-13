"""FastAPI application entry point for FAC Airways backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.metricsRouter import router as metricsRouter
from routers.persistenceRouter import router as persistenceRouter
from routers.queueRouter import router as queueRouter
from routers.treeRouter import router as treeRouter
from routers.versionRouter import router as versionRouter


app = FastAPI(title="FAC Airways AVL API", version="1.0.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(treeRouter)
app.include_router(persistenceRouter)
app.include_router(queueRouter)
app.include_router(metricsRouter)
app.include_router(versionRouter)


@app.get("/")
def health_check():
	"""Return a simple status payload for health checks."""
	return {"status": "ok", "service": "FAC Airways AVL API"}
