from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from ..datos import CATEGORIAS, ORDEN_TALLES, catalogo, normalizar
from ..schemas import CategoriaOut, ColorMini, FiltrosOut, Pagina, ProductoDetalle, ProductoResumen

router = APIRouter(tags=["catálogo"])


@router.get("/categorias", response_model=list[CategoriaOut])
def categorias():
    cat = catalogo()
    salida = []
    for nombre in CATEGORIAS:
        prods = [p for p in cat.productos.values() if p.categoria == nombre]
        salida.append(CategoriaOut(categoria=nombre, cantidad=len(prods), imagen_url=prods[0].colores[0].imagen_url))
    return salida


@router.get("/filtros", response_model=FiltrosOut)
def filtros():
    """Valores posibles para armar los filtros del buscador."""
    cat = catalogo()
    colores: dict[str, ColorMini] = {}
    for c in cat.colores.values():
        colores.setdefault(c.nombre, ColorMini(id=c.id, nombre=c.nombre, hex=c.hex))
    talles = {t.talle for t in cat.talles.values()}
    precios = [p.precio for p in cat.productos.values()]
    return FiltrosOut(
        colores=sorted(colores.values(), key=lambda c: c.nombre),
        talles_letras=[t for t in ORDEN_TALLES if t in talles and not t.isdigit()],
        talles_numericos=[t for t in ORDEN_TALLES if t in talles and t.isdigit()],
        precio_min=min(precios), precio_max=max(precios),
    )


@router.get("/productos", response_model=Pagina)
def listar(
    q: str | None = Query(None, description="Texto a buscar en nombre, descripción y colores"),
    categoria: str | None = Query(None),
    color: list[str] = Query([], description="Uno o más nombres de color, ej. ?color=Negro&color=Rosa"),
    talle: list[str] = Query([], description="Uno o más talles, ej. ?talle=S&talle=M"),
    precio_min: int | None = Query(None, ge=0),
    precio_max: int | None = Query(None, ge=0),
    orden: Literal["relevancia", "precio_asc", "precio_desc", "nombre"] = "relevancia",
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
):
    if categoria and categoria not in CATEGORIAS:
        raise HTTPException(404, f"Categoría inexistente. Opciones: {', '.join(CATEGORIAS)}")

    prods = list(catalogo().productos.values())
    if categoria:
        prods = [p for p in prods if p.categoria == categoria]
    if q:
        palabras = normalizar(q).split()
        prods = [p for p in prods if all(w in p.texto_busqueda for w in palabras)]
        if orden == "relevancia":  # primero las que tienen la búsqueda en el nombre
            prods.sort(key=lambda p: not all(w in normalizar(p.nombre) for w in palabras))
    if color:
        buscados = {normalizar(c) for c in color}
        prods = [p for p in prods if any(normalizar(c.nombre) in buscados for c in p.colores)]
    if talle:
        prods = [p for p in prods if any(t.talle in talle for t in p.talles)]
    if precio_min is not None:
        prods = [p for p in prods if p.precio >= precio_min]
    if precio_max is not None:
        prods = [p for p in prods if p.precio <= precio_max]

    if orden == "precio_asc":
        prods.sort(key=lambda p: p.precio)
    elif orden == "precio_desc":
        prods.sort(key=lambda p: -p.precio)
    elif orden == "nombre":
        prods.sort(key=lambda p: normalizar(p.nombre))

    inicio = (pagina - 1) * por_pagina
    return Pagina(total=len(prods), pagina=pagina, por_pagina=por_pagina,
                  items=[ProductoResumen.de(p) for p in prods[inicio:inicio + por_pagina]])


@router.get("/productos/{producto_id}", response_model=ProductoDetalle)
def detalle(producto_id: int):
    p = catalogo().productos.get(producto_id)
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    return ProductoDetalle.de(p)


@router.get("/productos/{producto_id}/relacionados", response_model=list[ProductoResumen])
def relacionados(producto_id: int, limite: int = Query(6, ge=1, le=20)):
    """Misma categoría, ordenadas por precio parecido."""
    cat = catalogo()
    p = cat.productos.get(producto_id)
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    otros = [o for o in cat.productos.values() if o.categoria == p.categoria and o.id != p.id]
    otros.sort(key=lambda o: abs(o.precio - p.precio))
    return [ProductoResumen.de(o) for o in otros[:limite]]
