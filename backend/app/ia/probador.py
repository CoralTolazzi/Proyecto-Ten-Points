"""Probador virtual con IA: acá se enchufa el modelo cuando esté.

La API ya está armada (ver routers/probador.py): recibe la foto de la usuaria y la
prenda del perchero, y le pide al modelo una imagen con la prenda puesta.

Para conectar un modelo:
1. Escribir una clase con el método `probar` (mirá `ModeloProbador`).
2. Devolverla en `obtener_modelo()`.

Ejemplos de lo que puede ir adentro de `probar`: un modelo propio en PyTorch,
o una API externa de try-on (FASHN, Replicate, etc.) llamada con httpx.
"""
import io
import os
from typing import Protocol
from dotenv import load_dotenv
import httpx
import replicate

load_dotenv()


class ModeloNoDisponible(Exception):
    pass


class ModeloProbador(Protocol):
    nombre: str

    def probar(self, foto_persona: bytes, imagen_prenda_url: str, categoria: str) -> bytes:
        """Devuelve la imagen (PNG o JPG, en bytes) de la persona con la prenda puesta.

        - foto_persona: la foto que subió la usuaria.
        - imagen_prenda_url: foto de la prenda en el color elegido (del dataset).
        - categoria: remeras, vestidos, pantalones, polleras, camperas o buzos
          (sirve para decirle al modelo si es prenda de arriba, de abajo o entera).
        """
        ...


class SinModelo:
    """Lo que se usa mientras no hay modelo: avisa que todavía no está."""
    nombre = "sin modelo"

    def probar(self, foto_persona: bytes, imagen_prenda_url: str, categoria: str) -> bytes:
        raise ModeloNoDisponible(
            "El probador con IA todavía no está conectado. Configurá REPLICATE_API_TOKEN en el archivo .env de backend."
        )


# Para qué parte del cuerpo es cada categoría (lo piden casi todos los modelos de try-on)
PARTE_DEL_CUERPO = {
    "remeras": "arriba", "camperas": "arriba", "buzos": "arriba",
    "pantalones": "abajo", "polleras": "abajo",
    "vestidos": "entero",
}

# Mapeo a las 3 categorías requeridas por IDM-VTON
MAPEO_CATEGORIA_IDM = {
    "arriba": "upper_body",
    "abajo": "lower_body",
    "entero": "dresses",
}


class ReplicateIdmVton:
    """Probador virtual con IA usando el modelo IDM-VTON en Replicate."""
    nombre = "IDM-VTON (Replicate)"

    def __init__(self, token: str | None = None):
        self.token = token or os.getenv("REPLICATE_API_TOKEN", "").strip()
        if not self.token:
            raise ModeloNoDisponible("Falta configurar REPLICATE_API_TOKEN en el archivo .env")
        self.client = replicate.Client(api_token=self.token)

    def probar(self, foto_persona: bytes, imagen_prenda_url: str, categoria: str) -> bytes:
        parte = PARTE_DEL_CUERPO.get(categoria, "arriba")
        cat_idm = MAPEO_CATEGORIA_IDM.get(parte, "upper_body")

        try:
            # Enviamos la foto como buffer en memoria y la URL pública de la prenda
            output = self.client.run(
                "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
                input={
                    "human_img": io.BytesIO(foto_persona),
                    "garm_img": imagen_prenda_url,
                    "garment_des": f"Prenda de vestir {categoria}",
                    "category": cat_idm,
                    "crop": False,
                    "steps": 30,
                },
            )
            return self._extraer_bytes(output)
        except replicate.exceptions.ReplicateError as e:
            raise ModeloNoDisponible(f"Error de Replicate: {e}")
        except httpx.HTTPError as e:
            raise ModeloNoDisponible(f"Error descargando la imagen de la IA: {e}")
        except Exception as e:
            raise ModeloNoDisponible(f"Error procesando la prueba virtual: {e}")

    def _extraer_bytes(self, output) -> bytes:
        # Si ya son bytes directos
        if isinstance(output, bytes):
            return output
        # Replicate puede retornar un FileOutput (con método read), una lista o una URL en texto
        if hasattr(output, "read"):
            return output.read()
        if isinstance(output, (list, tuple)) and len(output) > 0:
            return self._extraer_bytes(output[0])
        url = str(output)
        res = httpx.get(url, timeout=60.0)
        res.raise_for_status()
        return res.content


def obtener_modelo() -> ModeloProbador:
    token = os.getenv("REPLICATE_API_TOKEN", "").strip()
    if token:
        try:
            return ReplicateIdmVton(token=token)
        except Exception:
            return SinModelo()
    return SinModelo()
