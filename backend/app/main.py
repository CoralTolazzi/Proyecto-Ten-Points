"""API de Ten Points.

Correr (desde la carpeta backend):
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Documentación interactiva: http://localhost:8000/docs
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .datos import catalogo
from .routers import carrito, pedidos, perchero, probador, productos


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    db.inicializar()
    catalogo()  # carga los CSV al arrancar
    yield


app = FastAPI(
    title="Ten Points API",
    description="Tienda de ropa para adolescentes — by Lucas y Coral",
    version="1.0.0",
    lifespan=ciclo_de_vida,
)

# En desarrollo el frontend usa el proxy de Vite, así que CORS solo hace falta
# si lo sirven desde otro dominio. Se configura con TEN_POINTS_ORIGENES="https://a.com,https://b.com"
origenes = [o for o in os.environ.get("TEN_POINTS_ORIGENES", "http://localhost:5173").split(",") if o]
app.add_middleware(CORSMiddleware, allow_origins=origenes, allow_methods=["*"], allow_headers=["*"])

for r in (productos.router, carrito.router, perchero.router, pedidos.router, probador.router):
    app.include_router(r, prefix="/api")


@app.get("/api/salud", tags=["sistema"])
def salud():
    return {"ok": True, "productos": len(catalogo().productos)}
