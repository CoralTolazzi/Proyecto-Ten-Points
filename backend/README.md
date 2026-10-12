# Backend — Ten Points API (Python + FastAPI)

## Correr

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Documentación interactiva (para probar cada endpoint): **http://localhost:8000/docs**
- Tests: `pip install -r requirements-dev.txt` y después `pytest`

## Estructura

```
backend/
├── data/                 Dataset: productos.csv, colores.csv, talles.csv (+ LEEME.md)
├── app/
│   ├── main.py           Arma la app y junta los routers
│   ├── datos.py          Lee los CSV al arrancar y los deja en memoria (catálogo)
│   ├── db.py             SQLite para carrito, perchero y pedidos (archivo ten_points.db)
│   ├── schemas.py        Formas de los datos que entran y salen (Pydantic)
│   ├── sesion.py         Lee el header X-Sesion
│   ├── ia/probador.py    ← acá va el modelo de IA
│   └── routers/          productos, carrito, perchero, pedidos, probador
└── tests/test_api.py
```

**¿Por qué el catálogo en memoria y no en la base?** Las 150 prendas no cambian mientras la app corre, así que leer los CSV una vez es más simple y más rápido. Lo que sí cambia (carrito, perchero, pedidos) va a SQLite.

**¿Cómo sabe de quién es cada carrito?** Todavía no hay login. El frontend genera un id al azar la primera vez, lo guarda en el celular y lo manda en cada pedido en el header `X-Sesion`. Cuando agreguen usuarios, se reemplaza ese id por el de la usuaria.

## Endpoints

Todos empiezan con `/api`.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/categorias` | Las 6 categorías con cantidad y una foto |
| GET | `/filtros` | Colores, talles y rango de precios para armar los filtros |
| GET | `/productos` | Lista con filtros: `q`, `categoria`, `color` (varios), `talle` (varios), `precio_min`, `precio_max`, `orden` (`relevancia`, `precio_asc`, `precio_desc`, `nombre`), `pagina`, `por_pagina` |
| GET | `/productos/{id}` | Detalle: colores con foto y #hex, talles con medidas |
| GET | `/productos/{id}/relacionados` | Misma categoría, precio parecido |
| GET | `/carrito` | Carrito con subtotal, envío y total |
| POST | `/carrito/items` | Agrega `{producto_id, color_id, talle_id, cantidad}` |
| PATCH | `/carrito/items/{id}` | Cambia la cantidad `{cantidad}` (1 a 10) |
| DELETE | `/carrito/items/{id}` | Saca un item |
| GET / POST | `/perchero` | Ver / colgar `{producto_id, color_id}` (máximo 12) |
| DELETE | `/perchero/{id}` | Descolgar |
| POST | `/pedidos` | Compra: `{cliente: {nombre, apellido, email, ...}, envio, tarjeta: {numero, titular, vencimiento, cvv}}`. Si la tarjeta se rechaza devuelve 402 y el carrito queda igual |
| GET | `/pedidos`, `/pedidos/{id}` | Pedidos de la sesión |
| GET | `/probador/estado` | Si el modelo de IA está conectado |
| POST | `/probador` | Form con `foto` (archivo), `item_perchero_id` y `acepta_terminos=true` (si no se aceptan los términos devuelve 403). Devuelve la imagen generada. La foto no se guarda |

Reglas de negocio: envío a domicilio $6.999, gratis desde $150.000 o con retiro en el local. El envío gratis se calcula redondeado: si faltan $1.000 o menos (ej. una prenda de $149.000 o $149.999), también es gratis (`REDONDEO_ENVIO` en `app/routers/carrito.py`). Los precios se guardan en pesos enteros y el frontend los muestra con 2 decimales.

## Pago con tarjeta (simulado)

`app/pago.py` valida la tarjeta como lo haría una pasarela de pago, pero no cobra nada:
número válido (algoritmo de Luhn), marca (Visa, Mastercard, American Express), que no esté vencida y CVV de 3 dígitos (4 en Amex).
Del número solo se guardan la marca y los últimos 4 dígitos.

| Tarjeta de prueba | Resultado |
|---|---|
| 4111 1111 1111 1111 (Visa) | Aprobada |
| 5555 5555 5555 4444 (Mastercard) | Aprobada |
| 3782 822463 10005 (Amex, CVV de 4) | Aprobada |
| 4000 0000 0000 0002 | Rechazada: fondos insuficientes |
| 5105 1051 0510 5100 | Rechazada: el banco no autorizó |

## Conectar el modelo de IA

Abrí `app/ia/probador.py`:

1. Escribí una clase con un método `probar(foto_persona, imagen_prenda_url, categoria)` que devuelva la imagen generada en bytes.
2. Devolvela en `obtener_modelo()`.

```python
class MiModelo:
    nombre = "mi modelo de try-on"

    def probar(self, foto_persona: bytes, imagen_prenda_url: str, categoria: str) -> bytes:
        parte = PARTE_DEL_CUERPO[categoria]  # "arriba", "abajo" o "entero"
        # ... llamar al modelo (PyTorch, una API externa, etc.)
        return imagen_png_en_bytes


def obtener_modelo():
    return MiModelo()
```

Listo: `/probador/estado` pasa a `disponible: true` y el botón "Probar con IA" de la app se habilita solo. Hay un test (`test_probador_con_modelo_de_prueba`) que muestra cómo queda funcionando con un modelo falso.

## Configuración (opcional)

| Variable | Para qué | Por defecto |
|---|---|---|
| `TEN_POINTS_DB` | Ruta del archivo SQLite | `backend/ten_points.db` |
| `TEN_POINTS_DATOS` | Carpeta de los CSV | `backend/data` |
| `TEN_POINTS_ORIGENES` | Dominios del frontend permitidos (CORS), separados por coma | `http://localhost:5173` |
