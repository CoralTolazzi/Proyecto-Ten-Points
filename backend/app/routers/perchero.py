"""Perchero: las prendas que la usuaria separa para probarse con IA en el probador."""
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..datos import catalogo
from ..db import conexion
from ..schemas import ColorOut, ItemPercheroIn, ItemPercheroOut, TalleOut
from ..sesion import sesion_actual
from .carrito import validar_variante

router = APIRouter(prefix="/perchero", tags=["perchero"])

MAXIMO = 12  # lugar en el perchero


def listar_perchero(con: sqlite3.Connection, sesion: str) -> list[ItemPercheroOut]:
    cat = catalogo()
    filas = con.execute("SELECT * FROM perchero_items WHERE sesion = ? ORDER BY id", (sesion,)).fetchall()
    salida = []
    for f in filas:
        p = cat.productos[f["producto_id"]]
        salida.append(ItemPercheroOut(
            id=f["id"], producto_id=p.id, nombre=p.nombre, categoria=p.categoria, precio=p.precio,
            color=ColorOut.de(cat.colores[f["color_id"]]), talles=[TalleOut.de(t) for t in p.talles]))
    return salida


@router.get("", response_model=list[ItemPercheroOut])
def ver(sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    return listar_perchero(con, sesion)


@router.post("", response_model=list[ItemPercheroOut], status_code=201)
def colgar(item: ItemPercheroIn, sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    validar_variante(item.producto_id, item.color_id)
    ya = con.execute("SELECT 1 FROM perchero_items WHERE sesion = ? AND color_id = ?", (sesion, item.color_id)).fetchone()
    if not ya:
        cant = con.execute("SELECT COUNT(*) FROM perchero_items WHERE sesion = ?", (sesion,)).fetchone()[0]
        if cant >= MAXIMO:
            raise HTTPException(409, f"El perchero está lleno (máximo {MAXIMO} prendas)")
        con.execute("INSERT INTO perchero_items (sesion, producto_id, color_id) VALUES (?, ?, ?)",
                    (sesion, item.producto_id, item.color_id))
    con.commit()
    return listar_perchero(con, sesion)


@router.delete("/{item_id}", response_model=list[ItemPercheroOut])
def descolgar(item_id: int, sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    cur = con.execute("DELETE FROM perchero_items WHERE id = ? AND sesion = ?", (item_id, sesion))
    if cur.rowcount == 0:
        raise HTTPException(404, "Esa prenda no está en tu perchero")
    con.commit()
    return listar_perchero(con, sesion)
