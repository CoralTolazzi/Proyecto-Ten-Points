"""Compra: cobra con tarjeta (simulado, ver pago.py) y convierte el carrito en un pedido."""
import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..db import conexion
from ..pago import PagoRechazado, cobrar
from ..schemas import ClienteOut, ItemCarritoOut, PedidoIn, PedidoOut
from ..sesion import sesion_actual
from .carrito import armar_carrito

router = APIRouter(prefix="/pedidos", tags=["compra"])


def numero(pedido_id: int) -> str:
    return f"TP-{pedido_id:05d}"


def pedido_out(f: sqlite3.Row) -> PedidoOut:
    return PedidoOut(
        id=f["id"], numero=numero(f["id"]), cliente=ClienteOut(**json.loads(f["cliente"])),
        items=[ItemCarritoOut(**i) for i in json.loads(f["items"])], envio=f["envio"], pago=f["pago"],
        subtotal=f["subtotal"], costo_envio=f["costo_envio"], total=f["total"], creado=f["creado"],
    )


@router.post("", response_model=PedidoOut, status_code=201)
def comprar(pedido: PedidoIn, sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    carrito = armar_carrito(con, sesion, pedido.envio)
    if not carrito.items:
        raise HTTPException(409, "El carrito está vacío")
    c = pedido.cliente
    if pedido.envio == "domicilio" and not (c.direccion and c.ciudad and c.codigo_postal):
        raise HTTPException(422, "Para envío a domicilio faltan dirección, ciudad o código postal")

    # Primero se cobra: si la tarjeta se rechaza, no se crea el pedido y el carrito queda igual
    try:
        pago = cobrar(pedido.tarjeta, carrito.total)
    except PagoRechazado as e:
        raise HTTPException(402, {"mensaje": str(e), "campo": e.campo})

    cur = con.execute(
        """INSERT INTO pedidos (sesion, cliente, items, envio, pago, subtotal, costo_envio, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (sesion, c.model_dump_json(), json.dumps([i.model_dump() for i in carrito.items], ensure_ascii=False),
         pedido.envio, pago.descripcion(), carrito.subtotal, carrito.costo_envio, carrito.total),
    )
    con.execute("DELETE FROM carrito_items WHERE sesion = ?", (sesion,))
    con.commit()  # el pedido y el carrito vacío se guardan juntos
    fila = con.execute("SELECT * FROM pedidos WHERE id = ?", (cur.lastrowid,)).fetchone()
    return pedido_out(fila)


@router.get("", response_model=list[PedidoOut])
def mis_pedidos(sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    filas = con.execute("SELECT * FROM pedidos WHERE sesion = ? ORDER BY id DESC", (sesion,)).fetchall()
    return [pedido_out(f) for f in filas]


@router.get("/{pedido_id}", response_model=PedidoOut)
def ver(pedido_id: int, sesion: str = Depends(sesion_actual), con: sqlite3.Connection = Depends(conexion)):
    f = con.execute("SELECT * FROM pedidos WHERE id = ? AND sesion = ?", (pedido_id, sesion)).fetchone()
    if not f:
        raise HTTPException(404, "Pedido no encontrado")
    return pedido_out(f)
