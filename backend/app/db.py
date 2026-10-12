"""Base SQLite para lo que cambia: carrito, perchero y pedidos.

Cada usuaria se identifica con un id de sesión que genera el frontend
(header X-Sesion). Todavía no hay login: cuando lo agreguen, se reemplaza
la sesión por el id de usuaria.
"""
import os
import sqlite3
from collections.abc import Iterator
from pathlib import Path

ESQUEMA = """
CREATE TABLE IF NOT EXISTS carrito_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sesion      TEXT    NOT NULL,
    producto_id INTEGER NOT NULL,
    color_id    INTEGER NOT NULL,
    talle_id    INTEGER NOT NULL,
    cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
    creado      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sesion, color_id, talle_id)
);

CREATE TABLE IF NOT EXISTS perchero_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sesion      TEXT    NOT NULL,
    producto_id INTEGER NOT NULL,
    color_id    INTEGER NOT NULL,
    creado      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sesion, color_id)
);

CREATE TABLE IF NOT EXISTS pedidos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    sesion    TEXT    NOT NULL,
    cliente   TEXT    NOT NULL,   -- JSON con nombre, email, dirección...
    items     TEXT    NOT NULL,   -- JSON con las prendas compradas (precio congelado)
    envio     TEXT    NOT NULL,
    pago      TEXT    NOT NULL,
    subtotal  INTEGER NOT NULL,
    costo_envio INTEGER NOT NULL,
    total     INTEGER NOT NULL,
    creado    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def ruta_db() -> Path:
    return Path(os.environ.get("TEN_POINTS_DB", Path(__file__).resolve().parent.parent / "ten_points.db"))


def inicializar() -> None:
    with sqlite3.connect(ruta_db()) as con:
        con.executescript(ESQUEMA)


def conexion() -> Iterator[sqlite3.Connection]:
    """Dependencia de FastAPI: una conexión por request."""
    # FastAPI puede abrir la conexión en un hilo y usarla en otro; cada request tiene la suya.
    con = sqlite3.connect(ruta_db(), check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    finally:
        con.close()
