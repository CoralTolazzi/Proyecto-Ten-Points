import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..datos import catalogo
from ..db import conexion
from ..schemas import CantidadIn, CarritoOut, ColorOut, ItemCarritoIn, ItemCarritoOut
from ..sesion import sesion_actual

router = APIRouter(prefix="/carrito", tags=["carrito"])

COSTO_ENVIO = 6_999
ENVIO_GRATIS_DESDE = 150_000
# El envío gratis se calcula "redondeado": si al subtotal le faltan $1.000 o menos
# para llegar a $150.000 (ej. una prenda de $149.000 o $149.999), igual es gratis.
REDONDEO_ENVIO = 1_000


def falta_para_envio_gratis(subtotal: int) -> int:
    """Cuánto falta para el envío gratis, ya contando el redondeo (0 = es gratis)."""
    return max(0, ENVIO_GRATIS_DESDE - REDONDEO_ENVIO - subtotal)


def validar_variante(producto_id: int, color_id: int, talle_id: int | None = None) -> None:
    """Revisa que el color (y el talle) sean de esa prenda."""
    cat = catalogo()
    p = cat.productos.get(producto_id)
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    c = cat.colores.get(color_id)
    if not c or c.producto_id != producto_id:
        raise HTTPException(422, "Ese color no es de esta prenda")
    if talle_id is not None:
        t = cat.talles.get(talle_id)
        if not t or t.producto_id != producto_id:
            raise HTTPException(422, "Ese talle no es de esta prenda")


def variante_existe(producto_id: int, color_id: int, talle_id: int | None = None) -> bool:
    """False si la prenda, el color o el talle ya no están en el catálogo (por ejemplo, se sacaron del CSV)."""
    cat = catalogo()
    c = cat.colores.get(color_id)
    if producto_id not in cat.productos or not c or c.producto_id != producto_id:
        return False
    if talle_id is not None:
        t = cat.talles.get(talle_id)
        return bool(t and t.producto_id == producto_id)
    return True


def item_out(fila: sqlite3.Row) -> ItemCarritoOut:
    cat = catalogo()
    p = cat.productos[fila["producto_id"]]
    return ItemCarritoOut(
        id=fila["id"], producto_id=p.id, nombre=p.nombre, precio=p.precio,
        color=ColorOut.de(cat.colores[fila["color_id"]]),
        talle=cat.talles[fila["talle_id"]].talle, talle_id=fila["talle_id"],
        cantidad=fila["cantidad"], subtotal=p.precio * fila["cantidad"],
    )


def armar_carrito(con: sqlite3.Connection, sesion: str, envio: str = "domicilio") -> CarritoOut:
    filas = con.execute("SELECT * FROM carrito_items WHERE sesion = ? ORDER BY id", (sesion,)).fetchall()
    # Si una prenda se sacó de la tienda, se borra del carrito en vez de romperlo
    viejas = [f["id"] for f in filas if not variante_existe(f["producto_id"], f["color_id"], f["talle_id"])]
    if viejas:
        con.executemany("DELETE FROM carrito_items WHERE id = ?", [(i,) for i in viejas])
        con.commit()
    items = [item_out(f) for f in filas if f["id"] not in viejas]
    subtotal = sum(i.subtotal for i in items)
    falta = falta_para_envio_gratis(subtotal)
    gratis = envio == "retiro" or falta == 0 or not items
    return CarritoOut(
        items=items, cantidad_total=sum(i.cantidad for i in items), subtotal=subtotal,
        costo_envio=0 if gratis else COSTO_ENVIO, total=subtotal + (0 if gratis else COSTO_ENVIO),
        falta_para_envio_gratis=falta,
    )


@router.get("", response_model=CarritoOut)
def ver(sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    return armar_carrito(con, sesion)


@router.post("/items", response_model=CarritoOut, status_code=201)
def agregar(item: ItemCarritoIn, sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    validar_variante(item.producto_id, item.color_id, item.talle_id)
    # Si ya está esa prenda en ese color y talle, se suma la cantidad (tope 10)
    con.execute(
        """INSERT INTO carrito_items (sesion, producto_id, color_id, talle_id, cantidad) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (sesion, color_id, talle_id) DO UPDATE SET cantidad = MIN(10, cantidad + excluded.cantidad)""",
        (sesion, item.producto_id, item.color_id, item.talle_id, item.cantidad),
    )
    con.commit()
    return armar_carrito(con, sesion)


@router.patch("/items/{item_id}", response_model=CarritoOut)
def cambiar_cantidad(item_id: int, body: CantidadIn, sesion: str = Depends(sesion_actual),
                     con: sqlite3.Connection = Depends(conexion)):
    cur = con.execute("UPDATE carrito_items SET cantidad = ? WHERE id = ? AND sesion = ?", (body.cantidad, item_id, sesion))
    if cur.rowcount == 0:
        raise HTTPException(404, "Ese item no está en tu carrito")
    con.commit()
    return armar_carrito(con, sesion)


@router.delete("/items/{item_id}", response_model=CarritoOut)
def quitar(item_id: int, sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    cur = con.execute("DELETE FROM carrito_items WHERE id = ? AND sesion = ?", (item_id, sesion))
    if cur.rowcount == 0:
        raise HTTPException(404, "Ese item no está en tu carrito")
    con.commit()
    return armar_carrito(con, sesion)
