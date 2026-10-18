# Guía de Despliegue a Producción — Ten Points (Render + Vercel)

Este documento detalla los pasos exactos para publicar el proyecto en producción de forma 100% gratuita y 24/7 para compartir con el profesor y el equipo.

---

## 1. Estado y Arquitectura del Proyecto

- **Backend:** Python 3.10+ con FastAPI y Uvicorn.
  - Base de datos SQLite (`ten_points.db`) para carritos, pedidos y perchero.
  - Catálogo de 150 prendas cargado en memoria desde `backend/data/`.
  - Probador virtual conectado a **Replicate (IDM-VTON)** en `app/ia/probador.py`.
- **Frontend:** React 18 + Vite + React Router en `frontend/`.
  - Conexión al backend configurable mediante variable de entorno `VITE_API_URL`.
  - Archivo `frontend/vercel.json` configurado para rewrites de SPA (evita errores 404 al recargar páginas).

---

## 2. Preparación Previa (Git)

Asegurarse de tener todos los cambios confirmados y subidos al repositorio remoto:
```bash
git add .
git commit -m "Preparacion para despliegue: vercel.json y soporte de produccion"
git push origin main
```

*(Nota: el archivo `backend/.env` está ignorado en `.gitignore` y **no** se subirá a GitHub por seguridad).*

---

## 3. Despliegue del Backend en Render.com (Gratis)

1. Crear cuenta o iniciar sesión en [Render.com](https://render.com) vinculando la cuenta de **GitHub**.
2. En el Dashboard, hacer clic en **New +** y seleccionar **Web Service**.
3. Conectar el repositorio `Proyecto-Ten-Points`.
4. Completar los campos de configuración:
   - **Name:** `ten-points-backend` (o el nombre que prefieras).
   - **Region:** Ohio (US East) o Frankfurt (cualquiera funciona bien).
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Abrir la sección desplegable **Environment Variables** y agregar:
   | Key | Value | Descripción |
   |---|---|---|
   | `REPLICATE_API_TOKEN` | `r8_...` *(tu token de Replicate)* | Token para la IA de probador virtual |
   | `TEN_POINTS_ORIGENES` | `*` | Permite CORS para que cualquier frontend acceda |
   | `PYTHON_VERSION` | `3.11.0` *(opcional)* | Asegura versión moderna de Python |
6. Hacer clic en **Create Web Service**.
7. Esperar 2-3 minutos hasta que el log diga `Application startup complete`.
8. Copiar la URL generada por Render (ejemplo: `https://ten-points-backend.onrender.com`).
   - Puedes probar que funcione entrando a: `https://tu-backend.onrender.com/api/salud` (debe devolver `{"ok": true, "productos": 150}`).

---

## 4. Despliegue del Frontend en Vercel (Gratis)

1. Iniciar sesión en [Vercel.com](https://vercel.com) con GitHub.
2. Hacer clic en **Add New...** $\rightarrow$ **Project**.
3. Importar el repositorio `Proyecto-Ten-Points`.
4. En la pantalla de configuración:
   - **Project Name:** `ten-points`
   - **Framework Preset:** `Vite` (se detecta automáticamente).
   - **Root Directory:** Hacer clic en **Edit** y seleccionar la carpeta `frontend`.
5. En la sección **Environment Variables**, agregar:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://tu-backend.onrender.com` *(la URL obtenida en el Paso 3, sin barra al final)* |
6. Hacer clic en **Deploy**.
7. En ~40 segundos Vercel generará el enlace oficial con HTTPS (ejemplo: `https://ten-points.vercel.app`).

---

## 5. Checklist de Verificación Post-Despliegue

1. Abrir la URL de Vercel desde una PC y desde el celular.
2. Comprobar que cargue el catálogo de prendas y las categorías.
3. Ir al perchero, colgar una prenda.
4. Entrar al **Probador**:
   - Verificar que el botón diga **Probar con IA** (y no "muy pronto").
   - Subir una foto de cuerpo entero, aceptar términos y probar.
   - Confirmar que devuelva el resultado generado por Replicate en ~15-20 segundos.
5. Hacer una prueba de compra simulada para verificar el flujo de pedidos.

---

## 6. Consideraciones del Plan Gratuito de Render

- **Cold Start (arranque en frío):** En el plan gratuito de Render, si no hay visitas durante 15 minutos, el backend entra en modo reposo. Al recibir una nueva visita, puede demorar entre 40 y 50 segundos en responder por primera vez. Las visitas subsiguientes responden instantáneamente.
- **Alternativa para demo en vivo sin demoras (Túnel Cloudflare):**
  Si en el momento de la clase prefieren mostrarlo directamente desde la PC local sin esperas de arranque:
  ```bash
  npx cloudflared tunnel --url http://localhost:5173
  ```
