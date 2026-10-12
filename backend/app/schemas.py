"""Formas de los datos que entran y salen de la API (Pydantic)."""
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .datos import Color, Producto, Talle


# ---------- catálogo ----------
class ColorOut(BaseModel):
    id: int
    nombre: str
    hex: str
    imagen_url: str

    @classmethod
    def de(cls, c: Color) -> "ColorOut":
        return cls(id=c.id, nombre=c.nombre, hex=c.hex, imagen_url=c.imagen_url)


class Rango(BaseModel):
    min: int
    max: int


class TalleOut(BaseModel):
    id: int
    talle: str
    busto_cm: Rango | None
    cintura_cm: Rango | None
    cadera_cm: Rango | None
    largo_entrepierna_cm: int | None

    @classmethod
    def de(cls, t: Talle) -> "TalleOut":
        r = lambda x: Rango(min=x[0], max=x[1]) if x else None  # noqa: E731
        return cls(id=t.id, talle=t.talle, busto_cm=r(t.busto_cm), cintura_cm=r(t.cintura_cm),
                   cadera_cm=r(t.cadera_cm), largo_entrepierna_cm=t.largo_entrepierna_cm)


class ColorMini(BaseModel):
    id: int
    nombre: str
    hex: str


class ProductoResumen(BaseModel):
    """Lo que necesita una tarjeta de producto."""
    id: int
    nombre: str
    categoria: str
    precio: int
    imagen_url: str
    colores: list[ColorMini]
    talles: list[str]

    @classmethod
    def de(cls, p: Producto) -> "ProductoResumen":
        return cls(id=p.id, nombre=p.nombre, categoria=p.categoria, precio=p.precio,
                   imagen_url=p.colores[0].imagen_url,
                   colores=[ColorMini(id=c.id, nombre=c.nombre, hex=c.hex) for c in p.colores],
                   talles=[t.talle for t in p.talles])


class ProductoDetalle(BaseModel):
    id: int
    nombre: str
    categoria: str
    descripcion: str
    precio: int
    moneda: str = "ARS"
    sistema_talles: str
    url_origen: str
    colores: list[ColorOut]
    talles: list[TalleOut]

    @classmethod
    def de(cls, p: Producto) -> "ProductoDetalle":
        return cls(id=p.id, nombre=p.nombre, categoria=p.categoria, descripcion=p.descripcion,
                   precio=p.precio, sistema_talles=p.sistema_talles, url_origen=p.url_origen,
                   colores=[ColorOut.de(c) for c in p.colores], talles=[TalleOut.de(t) for t in p.talles])


class Pagina(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    items: list[ProductoResumen]


class CategoriaOut(BaseModel):
    categoria: str
    cantidad: int
    imagen_url: str


class FiltrosOut(BaseModel):
    colores: list[ColorMini]
    talles_letras: list[str]
    talles_numericos: list[str]
    precio_min: int
    precio_max: int


# ---------- carrito ----------
class ItemCarritoIn(BaseModel):
    producto_id: int
    color_id: int
    talle_id: int
    cantidad: int = Field(1, ge=1, le=10)


class CantidadIn(BaseModel):
    cantidad: int = Field(..., ge=1, le=10)


class ItemCarritoOut(BaseModel):
    id: int
    producto_id: int
    nombre: str
    precio: int
    color: ColorOut
    talle: str
    talle_id: int
    cantidad: int
    subtotal: int


class CarritoOut(BaseModel):
    items: list[ItemCarritoOut]
    cantidad_total: int
    subtotal: int
    costo_envio: int
    total: int
    falta_para_envio_gratis: int


# ---------- perchero ----------
class ItemPercheroIn(BaseModel):
    producto_id: int
    color_id: int


class ItemPercheroOut(BaseModel):
    id: int
    producto_id: int
    nombre: str
    categoria: str
    precio: int
    color: ColorOut
    talles: list[TalleOut]


# ---------- pedidos ----------
class ClienteIn(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=60)
    apellido: str = Field(..., min_length=2, max_length=60)
    email: str = Field(..., max_length=120)
    direccion: str | None = Field(None, max_length=120)
    ciudad: str | None = Field(None, max_length=60)
    codigo_postal: str | None = Field(None, max_length=10)

    @field_validator("nombre", "apellido")
    @classmethod
    def sin_espacios_de_mas(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("muy corto")
        return v

    @field_validator("email")
    @classmethod
    def email_valido(cls, v: str) -> str:
        v = v.strip()
        usuario, _, dominio = v.partition("@")
        if not usuario or "." not in dominio or dominio.startswith(".") or dominio.endswith(".") or " " in v:
            raise ValueError("email inválido")
        return v


class TarjetaIn(BaseModel):
    """Datos de la tarjeta. Es un pago SIMULADO: no se cobra nada y el número
    completo nunca se guarda (solo la marca y los últimos 4 dígitos)."""
    numero: str = Field(..., max_length=23)
    titular: str = Field(..., min_length=3, max_length=60)
    vencimiento: str = Field(..., description="MM/AA", max_length=5)
    cvv: str = Field(..., max_length=4)


class PedidoIn(BaseModel):
    cliente: ClienteIn
    envio: Literal["domicilio", "retiro"]
    tarjeta: TarjetaIn


class ClienteOut(BaseModel):
    nombre: str
    apellido: str = ""
    email: str
    direccion: str | None = None
    ciudad: str | None = None
    codigo_postal: str | None = None


class PedidoOut(BaseModel):
    id: int
    numero: str
    cliente: ClienteOut
    items: list[ItemCarritoOut]
    envio: str
    pago: str          # ej. "Visa terminada en 1111"
    subtotal: int
    costo_envio: int
    total: int
    creado: str


# ---------- probador ----------
class ProbadorEstado(BaseModel):
    disponible: bool
    mensaje: str
