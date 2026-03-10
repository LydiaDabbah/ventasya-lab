from enum import Enum

class TipoDatoEnum(str, Enum):
    envío_devoluciones = "envío/devolucion"
    pago = "pago"
    detalles= "detalles"
    informacion_adicional="información adicional"
