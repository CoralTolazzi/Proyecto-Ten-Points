import sqlite3

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from ..datos import catalogo
from ..db import conexion
from ..ia.probador import ModeloNoDisponible, SinModelo, obtener_modelo
from ..schemas import ProbadorEstado
from ..sesion import sesion_actual

router = APIRouter(prefix="/probador", tags=["probador IA"])

TIPOS_OK = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024


@router.get("/estado", response_model=ProbadorEstado)
def estado():
    modelo = obtener_modelo()
    if isinstance(modelo, SinModelo):
        return ProbadorEstado(disponible=False, mensaje="El probador con IA todavía no está conectado. ¡Muy pronto!")
    return ProbadorEstado(disponible=True, mensaje=f"Modelo: {modelo.nombre}")


@router.post("", responses={200: {"content": {"image/png": {}}}, 503: {"description": "Modelo no disponible"}})
def probar(
    foto: UploadFile = File(..., description="Foto de cuerpo entero de la usuaria"),
    item_perchero_id: int = Form(...),
    acepta_terminos: bool = Form(False, description="La usuaria aceptó los términos del probador"),
    sesion: str = Depends(sesion_actual),
    con: sqlite3.Connection = Depends(conexion),
):
    if not acepta_terminos:
        raise HTTPException(403, "Para usar el probador tenés que aceptar los términos y condiciones")
    if foto.content_type not in TIPOS_OK:
        raise HTTPException(415, "La foto tiene que ser JPG, PNG o WEBP")
    datos = foto.file.read(MAX_BYTES + 1)
    if len(datos) > MAX_BYTES:
        raise HTTPException(413, "La foto pesa más de 8 MB")

    fila = con.execute("SELECT * FROM perchero_items WHERE id = ? AND sesion = ?", (item_perchero_id, sesion)).fetchone()
    if not fila:
        raise HTTPException(404, "Esa prenda no está en tu perchero")
    cat = catalogo()
    prenda = cat.productos[fila["producto_id"]]
    color = cat.colores[fila["color_id"]]

    # La foto solo vive en memoria durante este request: no se guarda en disco ni en la base.
    try:
        imagen = obtener_modelo().probar(datos, color.imagen_url, prenda.categoria)
    except ModeloNoDisponible as e:
        raise HTTPException(503, str(e))
    return Response(content=imagen, media_type="image/png")
