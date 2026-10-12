# Ten Points

Tienda de ropa para chicas adolescentes, con probador virtual con IA. **By Lucas y Coral.**

```
Proyecto-Ten-Points/
├── backend/    API en Python (FastAPI) + dataset de 150 prendas
└── frontend/   App para celular en React (Vite), diseño del Figma "Ten Points Frontend"
```

## Cómo correrlo

Necesitás **Python 3.10+** y **Node 18+**. Dos terminales:

**Terminal 1 — backend**
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — frontend**
```bash
cd frontend
npm install
npm run dev
```

Abrí **http://localhost:5173**. En la compu conviene usar el modo celular del navegador (F12 → ícono de celular).

### Verlo en el celular
Con el celu en el mismo Wi-Fi que la compu, `npm run dev` muestra una línea `Network: http://192.168.x.x:5173`. Abrí esa dirección en el celu.
Desde Chrome del celu: menú ⋮ → **Agregar a pantalla principal** y queda como una app.

## Qué hay

| Pantalla | Qué hace |
|---|---|
| Inicio | Logo, buscador, banner del probador, categorías y una fila por categoría |
| Buscar | Búsqueda por texto (sin importar tildes), categorías, filtros de color, talle, precio y orden |
| Producto | Foto por color, colores con #hex, talles, guía de talles con medidas, agregar al carrito o colgar en el perchero |
| Carrito | Cantidades, barra de envío gratis (desde $150.000), total |
| Compra | Datos, entrega (domicilio o retiro), pago (simulado) y confirmación con número de pedido |
| Probador | Perchero con las prendas colgadas, subir foto y "Probar con IA" (listo para enchufar el modelo) |

## La IA del probador

Todavía no hay modelo. Todo lo demás ya está armado: el frontend sube la foto y la prenda elegida, y el backend tiene el lugar exacto donde va el modelo: **`backend/app/ia/probador.py`**. Mientras tanto, la app muestra "Probador con IA: muy pronto". Los pasos para conectarlo están en `backend/README.md`.

## Datos

Las 150 prendas (25 por categoría) salen del catálogo público de 47 Street. Más detalles en `backend/data/LEEME.md`.

## Aviso

- **Proyecto académico.** Ten Points es un proyecto de estudio hecho por Lucas y Coral. No es una tienda real ni vende nada.
- **Datos e imágenes de terceros.** Los nombres, descripciones, precios y fotos de las prendas pertenecen a **47 Street** y se usan solo con fines educativos. Este proyecto no tiene relación con la marca ni está respaldado por ella. Las fotos no están guardadas en este repositorio: el dataset solo tiene los links a la tienda. Si la marca lo pide, se quitan.
- **Pagos simulados.** La compra con tarjeta es una simulación: no se conecta con ningún banco ni cobra nada. No uses datos de una tarjeta real.
- **IA en desarrollo.** El probador virtual con IA todavía no tiene un modelo conectado. La app y la API ya están preparadas para sumarlo.
