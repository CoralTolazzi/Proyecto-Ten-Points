import re

from fastapi import Header, HTTPException

PATRON = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def sesion_actual(x_sesion: str = Header(..., description="Id de sesión que genera el frontend")) -> str:
    if not PATRON.match(x_sesion):
        raise HTTPException(400, "Header X-Sesion inválido")
    return x_sesion
