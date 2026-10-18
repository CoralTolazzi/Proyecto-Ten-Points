"""Catálogo: lee los 3 CSV del dataset una sola vez y los deja en memoria.

El catálogo es de solo lectura (144 prendas), así que no hace falta base de datos
para esto. Lo que cambia (carrito, perchero, pedidos) va a SQLite: ver db.py.
"""
import csv
import os
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

CARPETA_DATOS = Path(os.environ.get("TEN_POINTS_DATOS", Path(__file__).resolve().parent.parent / "data"))

CATEGORIAS = ["remeras", "vestidos", "pantalones", "polleras", "camperas", "buzos"]
ORDEN_TALLES = ["XS", "S", "M", "L", "XL", "34", "36", "38", "40", "42", "44"]


@dataclass
class Color:
    id: int
    producto_id: int
    nombre: str
    hex: str
    imagen_url: str


@dataclass
class Talle:
    id: int
    producto_id: int
    talle: str
    busto_cm: tuple[int, int] | None
    cintura_cm: tuple[int, int] | None
    cadera_cm: tuple[int, int] | None
    largo_entrepierna_cm: int | None


@dataclass
class Producto:
    id: int
    nombre: str
    categoria: str
    descripcion: str
    precio: int
    sistema_talles: str
    url_origen: str
    colores: list[Color] = field(default_factory=list)
    talles: list[Talle] = field(default_factory=list)
    texto_busqueda: str = ""


def normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para que 'pantalon' encuentre 'Pantalón'."""
    sin_tildes = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sin_tildes.lower().strip()


def _leer(nombre: str) -> list[dict]:
    with open(CARPETA_DATOS / nombre, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _rango(fila: dict, medida: str) -> tuple[int, int] | None:
    lo, hi = fila[f"{medida}_min_cm"], fila[f"{medida}_max_cm"]
    return (int(lo), int(hi)) if lo and hi else None


class Catalogo:
    def __init__(self) -> None:
        self.productos: dict[int, Producto] = {}
        self.colores: dict[int, Color] = {}
        self.talles: dict[int, Talle] = {}

        for f in _leer("productos.csv"):
            p = Producto(
                id=int(f["producto_id"]), nombre=f["nombre"], categoria=f["categoria"],
                descripcion=f["descripcion"], precio=int(f["precio"]),
                sistema_talles=f["sistema_talles"], url_origen=f["url_origen"],
            )
            self.productos[p.id] = p

        for f in _leer("colores.csv"):
            c = Color(id=int(f["color_id"]), producto_id=int(f["producto_id"]),
                      nombre=f["color"], hex=f["hex"], imagen_url=f["imagen_url"])
            self.colores[c.id] = c
            self.productos[c.producto_id].colores.append(c)

        for f in _leer("talles.csv"):
            le = f["largo_entrepierna_cm"]
            t = Talle(id=int(f["talle_id"]), producto_id=int(f["producto_id"]), talle=f["talle"],
                      busto_cm=_rango(f, "busto"), cintura_cm=_rango(f, "cintura"),
                      cadera_cm=_rango(f, "cadera"), largo_entrepierna_cm=int(le) if le else None)
            self.talles[t.id] = t
            self.productos[t.producto_id].talles.append(t)

        for p in self.productos.values():
            p.talles.sort(key=lambda t: ORDEN_TALLES.index(t.talle))
            colores = " ".join(c.nombre for c in p.colores)
            p.texto_busqueda = normalizar(f"{p.nombre} {p.categoria} {p.descripcion} {colores}")


@lru_cache
def catalogo() -> Catalogo:
    return Catalogo()
