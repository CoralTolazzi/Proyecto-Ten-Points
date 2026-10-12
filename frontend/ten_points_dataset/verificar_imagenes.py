"""Revisa que cada link de imagen de colores.csv responda bien.
Uso (en la carpeta del dataset):  python verificar_imagenes.py
"""
import csv
import urllib.request

ok, fallas = 0, []
with open("colores.csv", encoding="utf-8") as f:
    filas = list(csv.DictReader(f))

for i, fila in enumerate(filas, 1):
    url = fila["imagen_url"]
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=0-0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            tipo = r.headers.get("Content-Type", "")
            if r.status in (200, 206) and tipo.startswith("image"):
                ok += 1
            else:
                fallas.append((fila["color_id"], r.status, tipo, url))
    except Exception as e:
        fallas.append((fila["color_id"], "error", str(e), url))
    print(f"\r{i}/{len(filas)} revisados", end="")

print(f"\n\nImágenes OK: {ok} de {len(filas)}")
for color_id, estado, detalle, url in fallas:
    print(f"color_id {color_id}: {estado} {detalle}\n  {url}")
