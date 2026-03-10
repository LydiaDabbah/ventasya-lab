# app/routes/ordenes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import uuid4, UUID as UUID_cls
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.core.money import money
from pydantic import BaseModel, Field
from app.core.money import money

from app.db.database import SessionLocal
from app.models.producto import Producto
from app.models.orden import Orden
from app.models.detalle_orden import DetalleOrden
from app.models.codigo_descuento import CodigoDescuento

router = APIRouter(prefix="/ordenes", tags=["Ordenes"])


# -----------------------
# SCHEMAS LOCALES DE REQUEST (productos: id + cantidad; PUT permite overrides opcionales)
# -----------------------
class ProductoPedido(BaseModel):
    id_producto: str = Field(..., description="UUID del producto")
    cantidad: int = Field(..., gt=0, description="Cantidad solicitada")
    # Para PUT (admin) permitimos opcionales overrides:
    precio_unitario: Optional[float] = None
    nombre_producto: Optional[str] = None
    subtotal: Optional[float] = None


class OrdenRequest(BaseModel):
    id_vendedor: str
    telefono_cliente: str
    nombre_cliente: str
    email_cliente: Optional[str] = None
    comentarios: Optional[str] = None
    codigo_descuento: Optional[str] = None  # texto que manda el cliente (compatibilidad)
    id_codigo_descuento: Optional[str] = None  # <-- nuevo: UUID del codigo (opcional, preferible)
    descuento_aplicado: Optional[float] = 0.0  # será ignorado al crear si viene codigo_descuento/id
    costo_envio: Optional[float] = 0.0
    descripcion_envio: Optional[str] = None
    total: Optional[float] = 0.0
    productos: List[ProductoPedido]


# -----------------------
# DB helper
# -----------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generar_numero_orden() -> str:
    import random
    return f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000,9999)}"


# ---------------------------
# Helpers de validación / cálculo de código (copiado/adaptado desde routes de codigos)
# ---------------------------
def _norm_code(code: str) -> str:
    return code.strip().upper()


def calcular_descuento_obj(codigo_obj: CodigoDescuento, subtotal: float, id_vendedor: Optional[str] = None) -> float:
    """
    Valida las reglas del codigo (activo, expiración, vendedor, mínimo) y
    devuelve el monto de descuento (no mayor al subtotal, no negativo).
    Lanza HTTPException(400) en caso de invalidez.
    """
    now = datetime.utcnow()

    if not codigo_obj.activo:
        raise HTTPException(status_code=400, detail="Código inactivo")

    if codigo_obj.fecha_expiracion and codigo_obj.fecha_expiracion < now:
        raise HTTPException(status_code=400, detail="Código expirado")

    # si el código fue creado para un vendedor específico
    if codigo_obj.id_vendedor and id_vendedor is not None and str(codigo_obj.id_vendedor) != str(id_vendedor):
        raise HTTPException(status_code=400, detail="Código no aplica para este vendedor")

    if codigo_obj.minimo_subtotal and subtotal < float(codigo_obj.minimo_subtotal):
        raise HTTPException(status_code=400, detail=f"El subtotal mínimo para este código es {codigo_obj.minimo_subtotal}")

    # calcular monto
    if (codigo_obj.tipo or "").lower() == "porcentaje":
        descuento = subtotal * (float(codigo_obj.valor or 0) / 100.0)
    else:
        descuento = float(codigo_obj.valor or 0)

    # no devolver monto negativo ni mayor que subtotal
    descuento = max(0.0, min(descuento, float(subtotal or 0.0)))
    return money(descuento)


# -----------------------
# LISTAR ORDENES (opcional filtro por id_vendedor)
# -----------------------
@router.get("/", response_model=List[Dict[str, Any]])
def listar_ordenes(id_vendedor: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Orden)
    if id_vendedor:
        q = q.filter(Orden.id_vendedor == id_vendedor)

    if hasattr(Orden, "created_at"):
        ordenes = q.order_by(getattr(Orden, "created_at").desc()).all()
    else:
        ordenes = q.order_by(Orden.numero_orden).all()

    out = []
    for orden in ordenes:
        detalles = db.query(DetalleOrden).filter(DetalleOrden.id_orden == orden.id_orden).all()
        productos = [
            {
                "id_detalle": str(d.id_detalle),
                "id_producto": str(d.id_producto),
                "nombre_producto": d.nombre_producto,
                "precio_unitario": float(d.precio_unitario),
                "cantidad": int(d.cantidad),
                **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
            }
            for d in detalles
        ]

        total_val = float(getattr(orden, "total", sum((p.get("subtotal", 0) for p in productos)) + float(getattr(orden, "costo_envio", 0) or 0) - float(getattr(orden, "descuento_aplicado", 0) or 0)))

        out.append(
            {
                "id_orden": str(orden.id_orden) if hasattr(orden, "id_orden") else None,
                "numero_orden": orden.numero_orden,
                "id_vendedor": str(orden.id_vendedor) if hasattr(orden, "id_vendedor") else None,
                "telefono_cliente": orden.telefono_cliente,
                "nombre_cliente": orden.nombre_cliente,
                "email_cliente": orden.email_cliente,
                "comentarios": orden.comentarios,
                # devolvemos el texto del código por compatibilidad y el id
                "codigo_descuento": orden.codigo.codigo if getattr(orden, "codigo", None) else getattr(orden, "codigo_descuento", None),
                "id_codigo_descuento": str(orden.id_codigo_descuento) if getattr(orden, "id_codigo_descuento", None) else None,
                "descuento_aplicado": float(orden.descuento_aplicado or 0),
                "costo_envio": float(orden.costo_envio or 0),
                "descripcion_envio": orden.descripcion_envio,
                "total": total_val,
                "created_at": orden.created_at.isoformat() if getattr(orden, "created_at", None) else None,
                "productos": productos,
            }
        )

    return out


# =====================================
#  POST  Crear cotización (Crear Orden)
#  Recálcula precios desde tabla productos y persiste Orden + DetalleOrden.
#  Si llega 'codigo_descuento' texto o 'id_codigo_descuento' uuid, lo valida y guarda id_codigo_descuento y monto calculado.
# =====================================
@router.post("/", response_model=Dict[str, Any])
def crear_orden(data: OrdenRequest, db: Session = Depends(get_db)):
    if not data.productos or len(data.productos) == 0:
        raise HTTPException(status_code=400, detail="Productos vacíos")

    # IDs únicos
    ids = list({p.id_producto for p in data.productos if p.id_producto})
    if not ids:
        raise HTTPException(status_code=400, detail="No se recibieron id_producto válidos")

    # consultar productos en batch desde DB
    productos_db: List[Producto] = db.query(Producto).filter(Producto.id_producto.in_(ids)).all()
    productos_map = {str(p.id_producto): p for p in productos_db}

    # validar faltantes
    encontrados = set(productos_map.keys())
    faltantes = [i for i in ids if i not in encontrados]
    if faltantes:
        raise HTTPException(status_code=400, detail=f"Productos no encontrados: {faltantes}")

    # calcular totales y preparar detalles (NO usamos subtotal a nivel orden)
    detalles_payload = []
    for p in data.productos:
        pid = str(p.id_producto)
        cantidad = int(p.cantidad)
        if cantidad <= 0:
            raise HTTPException(status_code=400, detail=f"Cantidad inválida para producto {pid}")

        prod = productos_map.get(pid)
        if not prod:
            raise HTTPException(status_code=400, detail=f"Producto no encontrado: {pid}")

        if getattr(prod, "activo", True) is False:
            raise HTTPException(status_code=400, detail=f"Producto inactivo: {pid}")

        precio_unitario = float(prod.precio or 0.0)
        subtotal_item = money(precio_unitario * cantidad)

        detalles_payload.append({
            "id_producto": prod.id_producto,
            "nombre_producto": prod.nombre,
            "precio_unitario": precio_unitario,
            "cantidad": cantidad,
            "subtotal": subtotal_item,
        })

    costo_envio = float(data.costo_envio or 0.0)
    total_productos = sum(d["subtotal"] for d in detalles_payload)

    # ---------- manejo de codigo de descuento ----------
    codigo_obj = None
    descuento_monto = 0.0

    # Priorizar id_codigo_descuento (si viene), porque es más seguro
    if getattr(data, "id_codigo_descuento", None):
        try:
            uid = UUID_cls(str(data.id_codigo_descuento))
        except Exception:
            raise HTTPException(status_code=400, detail="id_codigo_descuento inválido")

        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.id == uid).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido (id)")

        descuento_monto = calcular_descuento_obj(codigo_obj, float(total_productos or 0.0), data.id_vendedor)

    # Si no llegó id, fallback al texto (compatibilidad hacia atrás)
    elif data.codigo_descuento:
        code_norm = _norm_code(data.codigo_descuento)
        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido")

        descuento_monto = calcular_descuento_obj(codigo_obj, float(total_productos or 0.0), data.id_vendedor)

    total_final = money(max(0.0, total_productos + costo_envio - float(descuento_monto or 0.0)))

    numero_orden = generar_numero_orden()

    # Crear orden (guardamos id_codigo_descuento si aplica; ignoramos el descuento enviado por cliente)
    nueva_orden = Orden(
        numero_orden=numero_orden,
        id_vendedor=data.id_vendedor,
        telefono_cliente=data.telefono_cliente,
        nombre_cliente=data.nombre_cliente,
        email_cliente=data.email_cliente,
        comentarios=data.comentarios,
        id_codigo_descuento=codigo_obj.id if codigo_obj else None,
        descuento_aplicado=descuento_monto,
        costo_envio=costo_envio,
        descripcion_envio=data.descripcion_envio,
        total=total_final,
        **({"created_at": datetime.utcnow()} if "created_at" in Orden.__table__.columns else {}),
        **({"updated_at": datetime.utcnow()} if "updated_at" in Orden.__table__.columns else {}),
    )

    try:
        db.add(nueva_orden)
        db.flush()  # para obtener id_orden asignado por DB

        detalles_created = []
        for it in detalles_payload:
            detalle = DetalleOrden(
                id_detalle=uuid4(),
                id_orden=nueva_orden.id_orden,
                id_producto=it["id_producto"],
                nombre_producto=it["nombre_producto"],
                precio_unitario=it["precio_unitario"],
                cantidad=it["cantidad"],
                **({"subtotal": it["subtotal"]} if "subtotal" in DetalleOrden.__table__.columns else {}),
            )

            if "created_at" in DetalleOrden.__table__.columns:
                setattr(detalle, "created_at", datetime.utcnow())
            if "updated_at" in DetalleOrden.__table__.columns:
                setattr(detalle, "updated_at", datetime.utcnow())

            db.add(detalle)
            detalles_created.append(detalle)

        db.commit()

        # refrescar instancias
        db.refresh(nueva_orden)
        for d in detalles_created:
            db.refresh(d)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando orden: {str(e)}")

    productos_out = [
        {
            "id_detalle": str(d.id_detalle),
            "id_producto": str(d.id_producto),
            "nombre_producto": d.nombre_producto,
            "precio_unitario": float(d.precio_unitario),
            "cantidad": int(d.cantidad),
            **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
        }
        for d in detalles_created
    ]

    orden_out = {
        "id_orden": str(nueva_orden.id_orden) if hasattr(nueva_orden, "id_orden") else None,
        "numero_orden": nueva_orden.numero_orden,
        "id_vendedor": str(nueva_orden.id_vendedor) if hasattr(nueva_orden, "id_vendedor") else None,
        "telefono_cliente": nueva_orden.telefono_cliente,
        "nombre_cliente": nueva_orden.nombre_cliente,
        "email_cliente": nueva_orden.email_cliente,
        "comentarios": nueva_orden.comentarios,
        # devolvemos tanto el id del codigo como el texto para compatibilidad con frontend
        "id_codigo_descuento": str(nueva_orden.id_codigo_descuento) if getattr(nueva_orden, "id_codigo_descuento", None) else None,
        "codigo_descuento": nueva_orden.codigo.codigo if getattr(nueva_orden, "codigo", None) else None,
        "descuento_aplicado": float(nueva_orden.descuento_aplicado or 0),
        "costo_envio": float(nueva_orden.costo_envio or 0),
        "descripcion_envio": nueva_orden.descripcion_envio,
        "total": float(nueva_orden.total),
        "created_at": nueva_orden.created_at.isoformat() if getattr(nueva_orden, "created_at", None) else None,
        "productos": productos_out,
    }

    return orden_out


# =====================================
#  GET  Buscar cotización por numero_orden
# =====================================
@router.get("/numero/{numero_orden}", response_model=Dict[str, Any])
def obtener_orden(numero_orden: str, db: Session = Depends(get_db)):
    orden = db.query(Orden).filter(Orden.numero_orden == numero_orden).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    detalles = db.query(DetalleOrden).filter(DetalleOrden.id_orden == orden.id_orden).all()
    productos = [
        {
            "id_detalle": str(d.id_detalle),
            "id_producto": str(d.id_producto),
            "nombre_producto": d.nombre_producto,
            "precio_unitario": float(d.precio_unitario),
            "cantidad": int(d.cantidad),
            **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
        }
        for d in detalles
    ]

    total_val = float(getattr(orden, "total", sum(p.get("subtotal", 0) for p in productos) + float(getattr(orden, "costo_envio", 0) or 0) - float(getattr(orden, "descuento_aplicado", 0) or 0)))

    orden_out = {
        "id_orden": str(orden.id_orden) if hasattr(orden, "id_orden") else None,
        "numero_orden": orden.numero_orden,
        "id_vendedor": str(orden.id_vendedor) if hasattr(orden, "id_vendedor") else None,
        "telefono_cliente": orden.telefono_cliente,
        "nombre_cliente": orden.nombre_cliente,
        "email_cliente": orden.email_cliente,
        "comentarios": orden.comentarios,
        "id_codigo_descuento": str(orden.id_codigo_descuento) if getattr(orden, "id_codigo_descuento", None) else None,
        "codigo_descuento": orden.codigo.codigo if getattr(orden, "codigo", None) else getattr(orden, "codigo_descuento", None),
        "descuento_aplicado": float(orden.descuento_aplicado or 0),
        "costo_envio": float(orden.costo_envio or 0),
        "descripcion_envio": orden.descripcion_envio,
        "total": total_val,
        "created_at": orden.created_at.isoformat() if getattr(orden, "created_at", None) else None,
        "productos": productos,
    }

    return orden_out


# =====================================
#  PUT  Editar cotización existente (ADMIN CONTROLA PRECIOS — NO RECALCULA)
# =====================================
@router.put("/numero/{numero_orden}", response_model=Dict[str, Any])
def actualizar_orden(numero_orden: str, data: OrdenRequest, db: Session = Depends(get_db)):
    orden = db.query(Orden).filter(Orden.numero_orden == numero_orden).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if not data.productos or len(data.productos) == 0:
        raise HTTPException(status_code=400, detail="Productos vacíos")

    # Traer detalles actuales (para reutilizar precios si no vienen)
    detalles_actuales = db.query(DetalleOrden).filter(DetalleOrden.id_orden == orden.id_orden).all()
    detalles_map = {str(d.id_producto): d for d in detalles_actuales}

    nuevos_detalles = []
    subtotal_total = 0.0

    # borrar detalle anterior
    db.query(DetalleOrden).filter(DetalleOrden.id_orden == orden.id_orden).delete()

    for p in data.productos:
        pid = str(p.id_producto)
        cantidad = int(p.cantidad)

        if cantidad <= 0:
            raise HTTPException(status_code=400, detail=f"Cantidad inválida para producto {pid}")

        detalle_anterior = detalles_map.get(pid)

        # Permitir override manual (nombre, precio, subtotal) en PUT
        nombre_producto = p.nombre_producto or (detalle_anterior.nombre_producto if detalle_anterior else "Producto")

        precio_unitario = p.precio_unitario if p.precio_unitario is not None else (detalle_anterior.precio_unitario if detalle_anterior else 0)

        subtotal = p.subtotal if p.subtotal is not None else (float(precio_unitario) * cantidad)

        subtotal_total += float(subtotal)

        detalle = DetalleOrden(
            id_detalle=uuid4(),
            id_orden=orden.id_orden,
            id_producto=pid,
            nombre_producto=nombre_producto,
            precio_unitario=float(precio_unitario),
            cantidad=cantidad,
            **({"subtotal": float(subtotal)} if "subtotal" in DetalleOrden.__table__.columns else {}),
        )

        if "created_at" in DetalleOrden.__table__.columns:
            setattr(detalle, "created_at", datetime.utcnow())
        if "updated_at" in DetalleOrden.__table__.columns:
            setattr(detalle, "updated_at", datetime.utcnow())

        db.add(detalle)
        nuevos_detalles.append(detalle)

    # actualizar orden (campos generales)
    orden.id_vendedor = data.id_vendedor
    orden.telefono_cliente = data.telefono_cliente
    orden.nombre_cliente = data.nombre_cliente
    orden.email_cliente = data.email_cliente
    orden.comentarios = data.comentarios

    # Si el admin quiere cambiar el código desde PUT, aplicará la misma lógica:
    codigo_obj = None
    descuento_monto = float(data.descuento_aplicado or 0)

    # Prioriza id si viene
    if getattr(data, "id_codigo_descuento", None):
        try:
            uid = UUID_cls(str(data.id_codigo_descuento))
        except Exception:
            raise HTTPException(status_code=400, detail="id_codigo_descuento inválido")

        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.id == uid).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido (id)")
        descuento_monto = calcular_descuento_obj(codigo_obj, float(subtotal_total or 0.0), data.id_vendedor)
        orden.id_codigo_descuento = codigo_obj.id

    elif data.codigo_descuento:
        code_norm = _norm_code(data.codigo_descuento)
        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido")
        # recalcular descuento con el subtotal_total
        descuento_monto = calcular_descuento_obj(codigo_obj, float(subtotal_total or 0.0), data.id_vendedor)
        orden.id_codigo_descuento = codigo_obj.id
    else:
        # si admin no manda código, se respeta el id_codigo_descuento actual o se puede limpiar:
        orden.id_codigo_descuento = None

    orden.descuento_aplicado = float(descuento_monto or 0)
    orden.costo_envio = float(data.costo_envio or 0)
    orden.descripcion_envio = data.descripcion_envio

    total_final = max(0, subtotal_total + orden.costo_envio - orden.descuento_aplicado)

    orden.total = total_final
    if "updated_at" in Orden.__table__.columns:
        orden.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(orden)
        for d in nuevos_detalles:
            db.refresh(d)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error actualizando orden: {str(e)}")

    productos_out = [
        {
            "id_detalle": str(d.id_detalle),
            "id_producto": str(d.id_producto),
            "nombre_producto": d.nombre_producto,
            "precio_unitario": float(d.precio_unitario),
            "cantidad": int(d.cantidad),
            **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
        }
        for d in nuevos_detalles
    ]

    orden_out = {
        "id_orden": str(orden.id_orden) if hasattr(orden, "id_orden") else None,
        "numero_orden": orden.numero_orden,
        "id_vendedor": str(orden.id_vendedor) if hasattr(orden, "id_vendedor") else None,
        "telefono_cliente": orden.telefono_cliente,
        "nombre_cliente": orden.nombre_cliente,
        "email_cliente": orden.email_cliente,
        "comentarios": orden.comentarios,
        "id_codigo_descuento": str(orden.id_codigo_descuento) if getattr(orden, "id_codigo_descuento", None) else None,
        "codigo_descuento": orden.codigo.codigo if getattr(orden, "codigo", None) else getattr(orden, "codigo_descuento", None),
        "descuento_aplicado": float(orden.descuento_aplicado or 0),
        "costo_envio": float(orden.costo_envio or 0),
        "descripcion_envio": orden.descripcion_envio,
        "total": float(orden.total),
        "created_at": orden.created_at.isoformat() if getattr(orden, "created_at", None) else None,
        "productos": productos_out,
    }

    return orden_out
