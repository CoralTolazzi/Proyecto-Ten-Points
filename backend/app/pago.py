"""Pago con tarjeta SIMULADO.

No se conecta con ningún banco ni cobra nada. Hace lo mismo que haría una
pasarela de pago para decidir si una tarjeta es válida:

1. El número pasa el algoritmo de Luhn (el dígito verificador de las tarjetas).
2. Se reconoce la marca (Visa, Mastercard, American Express).
3. No está vencida.
4. El código de seguridad tiene 3 dígitos (4 en American Express).

Después "aprueba" o "rechaza". Para probar rechazos hay tarjetas de prueba
(ver TARJETAS_RECHAZADAS). Cualquier otra tarjeta válida se aprueba.
"""
import re
from dataclasses import dataclass
from datetime import date

from .schemas import TarjetaIn

# Tarjetas de prueba que siempre se rechazan, con el motivo
TARJETAS_RECHAZADAS = {
    "4000000000000002": "Tarjeta rechazada: fondos insuficientes",
    "5105105105105100": "Tarjeta rechazada: el banco no autorizó el pago",
}


class PagoRechazado(Exception):
    """El pago no se hizo. El mensaje es para mostrarle a la usuaria."""

    def __init__(self, mensaje: str, campo: str | None = None):
        super().__init__(mensaje)
        self.campo = campo  # qué dato está mal (numero, vencimiento, cvv, titular) o None


@dataclass
class PagoAprobado:
    marca: str
    ultimos4: str

    def descripcion(self) -> str:
        return f"{self.marca} terminada en {self.ultimos4}"


def luhn_ok(numero: str) -> bool:
    """Algoritmo de Luhn: desde la derecha, se duplica un dígito sí y uno no;
    si al duplicar da más de 9 se le resta 9. La suma tiene que ser múltiplo de 10."""
    total = 0
    for i, d in enumerate(reversed(numero)):
        n = int(d)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def marca_de(numero: str) -> str | None:
    if re.match(r"^4\d{12}(\d{3})?(\d{3})?$", numero):
        return "Visa"
    if re.match(r"^(5[1-5]\d{14}|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720)\d{12})$", numero):
        return "Mastercard"
    if re.match(r"^3[47]\d{13}$", numero):
        return "American Express"
    return None


def vencida(vencimiento: str, hoy: date | None = None) -> bool:
    hoy = hoy or date.today()
    mes, anio = int(vencimiento[:2]), 2000 + int(vencimiento[3:])
    # La tarjeta vale hasta el último día de ese mes
    return (anio, mes) < (hoy.year, hoy.month)


def cobrar(tarjeta: TarjetaIn, monto: int) -> PagoAprobado:
    numero = re.sub(r"[\s-]", "", tarjeta.numero)
    if not numero.isdigit() or not 13 <= len(numero) <= 19 or not luhn_ok(numero):
        raise PagoRechazado("El número de tarjeta no es válido", "numero")
    marca = marca_de(numero)
    if not marca:
        raise PagoRechazado("Solo aceptamos Visa, Mastercard y American Express", "numero")

    if len(" ".join(tarjeta.titular.split())) < 3:
        raise PagoRechazado("Escribí el nombre como figura en la tarjeta", "titular")

    if not re.match(r"^(0[1-9]|1[0-2])/\d{2}$", tarjeta.vencimiento):
        raise PagoRechazado("El vencimiento tiene que ser MM/AA", "vencimiento")
    if vencida(tarjeta.vencimiento):
        raise PagoRechazado("La tarjeta está vencida", "vencimiento")

    largo_cvv = 4 if marca == "American Express" else 3
    if not re.match(rf"^\d{{{largo_cvv}}}$", tarjeta.cvv):
        raise PagoRechazado(f"El código de seguridad tiene {largo_cvv} números", "cvv")

    if monto <= 0:
        raise PagoRechazado("No hay nada para cobrar")
    if numero in TARJETAS_RECHAZADAS:
        raise PagoRechazado(TARJETAS_RECHAZADAS[numero])

    return PagoAprobado(marca=marca, ultimos4=numero[-4:])
