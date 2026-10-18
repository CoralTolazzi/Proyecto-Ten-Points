# Ten Points

Tienda de ropa para chicas adolescentes, con probador virtual con IA. **By Lucas y Coral.**

```
Proyecto-Ten-Points/
├── backend/    API en Python (FastAPI) + dataset de 144 prendas
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
| Probador | Perchero con las prendas colgadas, subir foto y "Probar con IA" (conectado con IDM-VTON en Replicate) |

## La IA del probador

El probador virtual está conectado a **IDM-VTON** mediante la API externa de **Replicate** (`cuuupid/idm-vton`).

- **Cómo funciona:**
  1. La persona sube una foto de cuerpo entero desde la app.
  2. La foto viaja como buffer en memoria (no se guarda en disco ni en base de datos).
  3. El backend toma la URL pública de la prenda colgada en el perchero y mapea la categoría (`arriba` → `upper_body`, `abajo` → `lower_body`, `entero` → `dresses`).
  4. IDM-VTON genera la imagen de la persona vistiendo la prenda en ~15 a 20 segundos y devuelve la imagen en PNG.
- **Configuración:**
  - Requiere un token de API en `backend/.env`: `REPLICATE_API_TOKEN=r8_...`
  - Si el token no está definido, el backend activa automáticamente el modo de respaldo (`SinModelo`) informando en la app que el probador no está disponible.
- **Lugar en el código:** `backend/app/ia/probador.py`.

## Datos

Las 144 prendas (entre 23 y 25 por categoría) salen del catálogo público de 47 Street. Más detalles en `backend/data/LEEME.md`.

## Aviso

- **Proyecto académico.** Ten Points es un proyecto de estudio hecho por Lucas y Coral. No es una tienda real ni vende nada.
- **Datos e imágenes de terceros.** Los nombres, descripciones, precios y fotos de las prendas pertenecen a **47 Street** y se usan solo con fines educativos. Este proyecto no tiene relación con la marca ni está respaldado por ella. Las fotos no están guardadas en este repositorio: el dataset solo tiene los links a la tienda. Si la marca lo pide, se quitan.
- **Pagos simulados.** La compra con tarjeta es una simulación: no se conecta con ningún banco ni cobra nada. No uses datos de una tarjeta real.
- **Privacidad en el probador.** Las fotos subidas por las usuarias solo se procesan en memoria durante la solicitud a la IA externa para generar la imagen simulada; nunca se persisten en el servidor.
