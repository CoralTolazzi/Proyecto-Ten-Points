# Frontend — Ten Points (React + Vite)

App mobile-first: se usa desde el navegador del celular y se puede instalar en la pantalla de inicio (PWA).

```bash
npm install
npm run dev      # http://localhost:5173 (y la IP de la red para el celu)
npm run build    # versión final en dist/
```

El backend tiene que estar corriendo en el puerto 8000. Vite le pasa todo lo que empieza con `/api` (ver `vite.config.js`). Si el backend está en otro lado, creá un archivo `.env` con `VITE_API_URL=https://tu-backend.com`.

## Estructura

```
src/
├── main.jsx            Rutas y barra de tabs
├── api.js              Todas las llamadas al backend
├── tienda.jsx          Estado compartido: carrito, perchero, avisos
├── useCarga.js         Hook para cargar datos (cargando / error)
├── estilos.css         Todo el estilo; los colores del Figma están arriba de todo
├── components/
│   ├── Comunes.jsx     Tarjeta, FotoPrenda, Encabezado, BarraTabs, Aviso, Vacio…
│   └── Icono.jsx       Íconos SVG
└── pages/              Inicio, Buscar, Producto, Carrito, Compra, Probador
```

## Diseño

Sigue el tema "teen" del Figma: fuentes **Bagel Fat One** (títulos) y **Outfit** (texto), bordes negros gruesos con sombra corrida, y la paleta ink, pink, pinkSoft, lilac, lilacSoft, lime, sky y peach.

Los valores hex están en `:root` al principio de `src/estilos.css`. Si alguno no coincide exacto con el Figma, se cambia ahí y se actualiza toda la app.

Si una foto de prenda no carga, la tarjeta muestra un bloque del color de la prenda con un perchero, así nunca queda un hueco.
