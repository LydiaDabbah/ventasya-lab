from decimal import Decimal, ROUND_DOWN

def money(value: float) -> float:
    """
    Trunca a 2 decimales SIN redondear (formato dinero)
    """
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_DOWN))
