# Dataset Ten Points — ropa adolescente

144 prendas para chicas adolescentes en 6 categorías: **remeras (24), vestidos (25), pantalones (23), polleras (23), camperas (24) y buzos (25)**.
Cada prenda tiene precio, descripción corta, todos sus colores (cada uno con su código #hex y su foto real) y sus talles con medidas.

| Archivo | Filas | Qué tiene |
|---|---|---|
| `productos.csv` | 144 | Una fila por prenda |
| `colores.csv` | 292 | Una fila por cada color de cada prenda, con su foto |
| `talles.csv` | 558 | Una fila por cada talle de cada prenda, con medidas en cm |

## Cómo se relacionan

```
productos.producto_id  1 ──< N  colores.producto_id
productos.producto_id  1 ──< N  talles.producto_id
```

Ejemplo: la prenda `producto_id = 1` tiene sus colores en las filas de `colores.csv` con `producto_id = 1`, y sus talles en `talles.csv` con `producto_id = 1`.

## Columnas

**productos.csv**
- `producto_id`: id propio del dataset (entre 1 y 150; faltan algunos números porque se sacaron prendas).
- `nombre`, `categoria` (remeras · vestidos · pantalones · polleras · camperas · buzos), `descripcion`.
- `precio`: en pesos argentinos, sin decimales; `moneda` = ARS.
- `sistema_talles`: `letras_XS_XL` o `numerico_34_44` (este último solo en pantalones).
- `marca_origen`, `url_origen`, `id_origen`: de dónde sale la prenda (página del producto en la tienda e id interno de la tienda).

**colores.csv**
- `color_id`, `producto_id`.
- `color`: nombre para mostrar (por ejemplo "Rosa claro", "Visón", "Azul marino").
- `color_tienda`: nombre del color tal como lo filtra la tienda (por ejemplo "Fucsia", "Marrón", "Azul Oscuro").
- `hex`: código de color, por ejemplo `#F4B8CB`.
- `imagen_url`: link a la foto real de la prenda en ese color.

**talles.csv**
- `talle_id`, `producto_id`, `talle` (XS–XL o 34–44), `talle_tienda` (el talle original de la tienda).
- `busto_min_cm` / `busto_max_cm`: solo para remeras, vestidos, camperas y buzos.
- `cintura_min_cm` / `cintura_max_cm`, `cadera_min_cm` / `cadera_max_cm`.
- `largo_entrepierna_cm`: solo para pantalones.

## De dónde salen los datos

- **Fuente:** catálogo de **47 Street** (tienda argentina de ropa adolescente), leído de su API pública el 12/10/2026. Los precios son los de ese día.
- **Fotos:** los links apuntan a las fotos oficiales de la tienda. Los derechos son de 47 Street: usalas solo para el trabajo práctico o el prototipo, **no para publicar una tienda real**. Si el proyecto sale de la facultad, hay que reemplazarlas por fotos propias.
- **Descripciones:** resumen corto de la descripción que publica la tienda.

## Conversión de talles

La tienda usa talles propios. Se convirtieron así (el original queda en `talle_tienda`):

| Tienda | Remeras, vestidos, polleras, camperas, buzos | Pantalones |
|---|---|---|
| 00 | XS | 34 |
| 01 | S | 36 |
| 02 | M | 38 |
| 03 | L | 40 |
| 04 | XL | 42 |
| Jean 24 / 26 / 28 / 30 / 32 / 34 | XS / S / M / L / XL / — | 34 / 36 / 38 / 40 / 42 / 44 |

Los talles de jean 20 y 22 quedaron afuera porque están por debajo del rango XS / 34.

## Medidas (cm)

Son **medidas del cuerpo de referencia** (guía estándar aproximada). La tienda no publica una tabla oficial, así que **no son las medidas de 47 Street**.

| Talle | Busto | Cintura | Cadera |
|---|---|---|---|
| XS | 80–84 | 60–64 | 86–90 |
| S | 84–88 | 64–68 | 90–94 |
| M | 88–92 | 68–72 | 94–98 |
| L | 92–96 | 72–76 | 98–102 |
| XL | 96–100 | 76–80 | 102–106 |

| Talle pantalón | Cintura | Cadera | Largo de entrepierna |
|---|---|---|---|
| 34 | 62–65 | 88–91 | 76 |
| 36 | 66–69 | 92–95 | 77 |
| 38 | 70–73 | 96–99 | 78 |
| 40 | 74–77 | 100–103 | 79 |
| 42 | 78–81 | 104–107 | 80 |
| 44 | 82–85 | 108–111 | 81 |

## A tener en cuenta

- Los **#hex son aproximados**: salen del nombre del color, no se midieron sobre la foto.
- **Buzos:** 5 prendas que la tienda llama "Campera" son en realidad buzos con cierre de rústico o modal con capucha (Campera New Basic, Campera Kitty Academy H., Campera Novak, Campera Straps y Campera Mellow). Por eso están en `buzos`.
- **Polleras:** la tienda les dice "falda". Dos son short-pollera (Short Falda Lotta y Short Falda Brain).
- Hay colores que hoy no tienen stock en la tienda, pero su foto existe igual.
- Los links de las fotos no se pudieron abrir para probarlos. Se verificó una muestra de 6 prendas (16 fotos) consultando la tienda dos veces. Para revisar todos los links desde tu compu:

```bash
python verificar_imagenes.py
```
