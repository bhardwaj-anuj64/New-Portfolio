"""
Tools Service — single container hosting all three microservice-playground
backends (Segmentation & Outline, Tonal-Banding / Depth, Mesh Generator).

Each started life as its own FastAPI app (see the knowledge/ docs for the
full architecture writeup); they're mounted here as routers in one process
instead of three separate containers, since the homelab VM this runs on
(2 vCPU / 3GB RAM, already running the Gateway, frontend, and cloudflared)
doesn't have the headroom for three separate Python+OpenCV runtimes that
will never need to scale independently.
"""

from fastapi import FastAPI

from banding_routes import router as banding_router
from mesh_routes import router as mesh_router
from segmentation_routes import router as segmentation_router

app = FastAPI(title="Tools Service")

app.include_router(segmentation_router)
app.include_router(banding_router)
app.include_router(mesh_router)


@app.get("/health")
def health():
    return {"status": "ok"}
