from datetime import datetime
from fastapi import HTTPException
from app.models.codigo_descuento import CodigoDescuento


def calcular_descuento(codigo: CodigoDescuento, subtotal: float, id_vendedor=None) -> float:
    if not codigo.activo:
        raise HTTPException(status_code=400, detail="Código inactivo")

    if codigo.fecha_expiracion and codigo.fecha_expiracion < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Código expirado")

    if codigo.id_vendedor and str(codigo.id_vendedor) != str(id_vendedor):
        raise HTTPException(status_code=400, detail="Código no válido para este vendedor")

    if codigo.minimo_subtotal and subtotal < float(codigo.minimo_subtotal):
        raise HTTPException(status_code=400, detail="No alcanza el mínimo para aplicar el código")

    if codigo.tipo == "porcentaje":
        descuento = subtotal * (codigo.valor / 100)
    else:
        descuento = codigo.valor

    return min(descuento, subtotal)
