"""Probador virtual con IA: acá se enchufa el modelo cuando esté.

La API ya está armada (ver routers/probador.py): recibe la foto de la usuaria y la
prenda del perchero, y le pide al modelo una imagen con la prenda puesta.

Para conectar un modelo:
1. Escribir una clase con el método `probar` (mirá `ModeloProbador`).
2. Devolverla en `obtener_modelo()`.

Ejemplos de lo que puede ir adentro de `probar`: un modelo propio en PyTorch,
o una API externa de try-on (FASHN, Replicate, etc.) llamada con httpx.
"""
from typing import Protocol


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
        raise ModeloNoDisponible("El probador con IA todavía no está conectado. ¡Muy pronto!")


# Para qué parte del cuerpo es cada categoría (lo piden casi todos los modelos de try-on)
PARTE_DEL_CUERPO = {
    "remeras": "arriba", "camperas": "arriba", "buzos": "arriba",
    "pantalones": "abajo", "polleras": "abajo",
    "vestidos": "entero",
}


def obtener_modelo() -> ModeloProbador:
    # Cuando tengan el modelo: return MiModelo()
    return SinModelo()
