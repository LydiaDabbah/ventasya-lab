import enum


class DescripcionEnvioEnum(str, enum.Enum):
    por_definir = "por_definir"
    incluido = "incluido"
    monto_fijo = "monto_fijo"