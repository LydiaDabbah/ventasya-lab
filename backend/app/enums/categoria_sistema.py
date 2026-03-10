from enum import Enum

class CategoriaSistemaEnum(str, Enum):
    destacado = "destacado"
    populares = "populares"
    nuevo = "nuevo"
    oferta = "oferta"