# app/routes/cotizaciones.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlalchemy.orm import Session
from uuid import uuid4, UUID as UUID_cls
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import secrets

from app.core.money import money
from app.db.database import SessionLocal
from app.models.producto import Producto
from app.models.cotizacion import Cotizacion
from app.models.cotizacion_version import CotizacionVersion
from app.models.detalle_cotizacion_version import DetalleCotizacionVersion
from app.models.codigo_descuento import CodigoDescuento

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


# -----------------------
# SCHEMAS LOCALES DE REQUEST (productos: id + cantidad; PUT permite overrides opcionales)
# -----------------------
class ProductoPedido(BaseModel):
    id_producto: str
    cantidad: int = Field(..., gt=0)
    precio_unitario: Optional[float] = None
    nombre_producto: Optional[str] = None
    subtotal: Optional[float] = None
    nota_personalizable: Optional[str] = None


class CotizacionRequest(BaseModel):
    id_vendedor: str
    telefono_cliente: str
    nombre_cliente: str
    direccion: Optional[str] = None           # <-- agregado
    email_cliente: Optional[str] = None
    comentarios: Optional[str] = None
    codigo_descuento: Optional[str] = None
    id_codigo_descuento: Optional[str] = None
    descuento_aplicado: Optional[float] = 0.0
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


def generar_numero_cotizacion() -> str:
    import random
    return f"COT-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000,9999)}"


# ---------------------------
# Helpers de validación / cálculo de código
# ---------------------------
def _norm_code(code: str) -> str:
    return code.strip().upper()


def calcular_descuento_obj(codigo_obj: CodigoDescuento, subtotal: float, id_vendedor: Optional[str] = None) -> float:
    now = datetime.utcnow()

    if not codigo_obj.activo:
        raise HTTPException(status_code=400, detail="Código inactivo")

    if codigo_obj.fecha_expiracion and codigo_obj.fecha_expiracion < now:
        raise HTTPException(status_code=400, detail="Código expirado")

    if codigo_obj.id_vendedor and id_vendedor is not None and str(codigo_obj.id_vendedor) != str(id_vendedor):
        raise HTTPException(status_code=400, detail="Código no aplica para este vendedor")

    if codigo_obj.minimo_subtotal and subtotal < float(codigo_obj.minimo_subtotal):
        raise HTTPException(status_code=400, detail=f"El subtotal mínimo para este código es {codigo_obj.minimo_subtotal}")

    if (codigo_obj.tipo or "").lower() == "porcentaje":
        descuento = subtotal * (float(codigo_obj.valor or 0) / 100.0)
    else:
        descuento = float(codigo_obj.valor or 0)

    descuento = max(0.0, min(descuento, float(subtotal or 0.0)))
    return money(descuento)


# ---------------------------
# Helper: validar productos y obtener precios actuales desde DB
# ---------------------------
def validar_y_preparar_detalles_db(productos_input: List[dict], id_vendedor_expected: str, db: Session, allow_price_override: bool = False):
    """
    Valida:
      - los productos existen
      - pertenecen al id_vendedor_expected (si el producto en DB tiene id_vendedor)
      - estan activos
    Prepara payload de detalles con precio_unitario tomado de DB salvo que allow_price_override=True
    y el admin pase precio_unitario en el payload (en PUT).
    Retorna lista de dicts: id_producto, nombre_producto, precio_unitario, cantidad, subtotal
    """
    ids = list({p.get("id_producto") for p in productos_input if p.get("id_producto")})
    if not ids:
        raise HTTPException(status_code=400, detail="No se recibieron id_producto válidos")

    # parse UUIDs
    parsed_ids = []
    for rid in ids:
        try:
            parsed_ids.append(UUID_cls(str(rid)))
        except Exception:
            raise HTTPException(status_code=400, detail=f"id_producto inválido: {rid}")

    productos_db: List[Producto] = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()
    productos_map = {str(p.id_producto): p for p in productos_db}

    faltantes = [i for i in ids if i not in productos_map]
    if faltantes:
        raise HTTPException(status_code=400, detail=f"Productos no encontrados: {faltantes}")

    detalles_payload = []
    for p in productos_input:
        pid = str(p.get("id_producto"))
        cantidad = int(p.get("cantidad", 0))
        if cantidad <= 0:
            raise HTTPException(status_code=400, detail=f"Cantidad inválida para producto {pid}")

        prod = productos_map.get(pid)
        if not prod:
            raise HTTPException(status_code=400, detail=f"Producto no encontrado: {pid}")

        # check que producto pertenezca al vendedor esperado (si tiene id_vendedor)
        if getattr(prod, "id_vendedor", None) and str(prod.id_vendedor) != str(id_vendedor_expected):
            raise HTTPException(status_code=400, detail=f"Producto {pid} no pertenece al vendedor {id_vendedor_expected}")

        # check activo
        if getattr(prod, "activo", True) is False:
            raise HTTPException(status_code=400, detail=f"Producto inactivo: {pid}")

        # precio: si allow_price_override True y payload trae precio, respetar (admin),
        # en caso contrario tomar precio de DB
        if allow_price_override and p.get("precio_unitario") is not None:
            precio_unitario = float(p.get("precio_unitario"))
        else:
            precio_unitario = float(getattr(prod, "precio", 0.0) or 0.0)

        subtotal_item = money(precio_unitario * cantidad)

        detalles_payload.append({
            "id_producto": prod.id_producto,
            "nombre_producto": p.get("nombre_producto") or prod.nombre,
            "precio_unitario": precio_unitario,
            "cantidad": cantidad,
            "subtotal": subtotal_item,
            "nota_personalizable": p.get("nota_personalizable")
        })

    return detalles_payload


# -----------------------
# LISTAR COTIZACIONES (opcional filtro por id_vendedor)
# -----------------------
@router.get("/", response_model=List[Dict[str, Any]])
def listar_cotizaciones(id_vendedor: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Cotizacion)
    if id_vendedor:
        try:
            id_vend_uuid = UUID_cls(str(id_vendedor))
        except Exception:
            raise HTTPException(status_code=400, detail="id_vendedor inválido (debe ser UUID)")
        q = q.filter(Cotizacion.id_vendedor == id_vend_uuid)

    if hasattr(Cotizacion, "created_at"):
        cotizaciones = q.order_by(getattr(Cotizacion, "created_at").desc()).all()
    else:
        cotizaciones = q.order_by(Cotizacion.numero_cotizacion).all()

    out = []
    for cot in cotizaciones:
        detalles = []
        if cot.current_version_id:
            detalles = db.query(DetalleCotizacionVersion).filter(DetalleCotizacionVersion.id_version == cot.current_version_id).all()

        # intentar enriquecer con imagen_url: traer productos relacionados en batch
        productos = []
        if detalles:
            prod_ids = list({str(d.id_producto) for d in detalles if getattr(d, "id_producto", None)})
            parsed_ids = []
            for pid in prod_ids:
                try:
                    parsed_ids.append(UUID_cls(str(pid)))
                except Exception:
                    continue
            productos_map = {}
            if parsed_ids:
                productos_db = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()
                productos_map = {str(p.id_producto): p for p in productos_db}

            for d in detalles:
                pid_str = str(d.id_producto)
                prod_obj = productos_map.get(pid_str)
                productos.append({
                    "id_detalle_version": str(d.id_detalle_version),
                    "id_producto": pid_str,
                    "nombre_producto": d.nombre_producto,
                    "precio_unitario": float(d.precio_unitario),
                    "nota_personalizable": d.nota_personalizable,
                    "cantidad": int(d.cantidad),
                    **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
                    "imagen_url": getattr(prod_obj, "imagen_url", None) if prod_obj else None,
                })

        total_val = float(getattr(cot, "total", sum((p.get("subtotal", 0) for p in productos)) + float(getattr(cot, "costo_envio", 0) or 0) - float(getattr(cot, "descuento_aplicado", 0) or 0)))

        out.append(
            {
                "id_cotizacion": str(cot.id_cotizacion) if hasattr(cot, "id_cotizacion") else None,
                "numero_cotizacion": cot.numero_cotizacion,
                "id_vendedor": str(cot.id_vendedor) if hasattr(cot, "id_vendedor") else None,
                "telefono_cliente": getattr(cot, "telefono_cliente", None) or None,
                "nombre_cliente": getattr(cot, "nombre_cliente", None) or None,
                "email_cliente": getattr(cot, "email_cliente", None),
                "comentarios": getattr(cot, "comentarios", None),
                "id_codigo_descuento": str(getattr(cot, "id_codigo_descuento", None)) if getattr(cot, "id_codigo_descuento", None) else None,
                "descuento_aplicado": float(getattr(cot, "descuento_aplicado", 0) or 0),
                "costo_envio": float(getattr(cot, "costo_envio", 0) or 0),
                "descripcion_envio": getattr(cot, "descripcion_envio", None),
                "total": total_val,
                "status": str(getattr(cot, "status", None)),
                "created_at": cot.created_at.isoformat() if getattr(cot, "created_at", None) else None,
                "productos": productos,
                "current_version_id": str(cot.current_version_id) if getattr(cot, "current_version_id", None) else None,
                "editable_token": getattr(cot, "editable_token", None),
                "editable_token_active": bool(getattr(cot, "editable_token_active", True)),
            }
        )

    return out


# =====================================
#  POST  Crear cotización (crea cotizacion + version + detalles)
# =====================================
@router.post("/", response_model=Dict[str, Any])
def crear_cotizacion(data: CotizacionRequest, db: Session = Depends(get_db)):
    if not data.productos or len(data.productos) == 0:
        raise HTTPException(status_code=400, detail="Productos vacíos")

    # Validar y preparar detalles (usar precios actuales DB)
    detalles_payload = validar_y_preparar_detalles_db([p.dict() for p in data.productos], data.id_vendedor, db, allow_price_override=False)
    costo_envio = float(data.costo_envio or 0.0)
    total_productos = sum(d["subtotal"] for d in detalles_payload)

    # manejar codigo de descuento
    codigo_obj = None
    descuento_monto = 0.0

    if getattr(data, "id_codigo_descuento", None):
        try:
            uid = UUID_cls(str(data.id_codigo_descuento))
        except Exception:
            raise HTTPException(status_code=400, detail="id_codigo_descuento inválido")

        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.id == uid).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido (id)")

        descuento_monto = calcular_descuento_obj(codigo_obj, float(total_productos or 0.0), data.id_vendedor)

    elif data.codigo_descuento:
        code_norm = _norm_code(data.codigo_descuento)
        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido")

        descuento_monto = calcular_descuento_obj(codigo_obj, float(total_productos or 0.0), data.id_vendedor)

    total_final = money(max(0.0, total_productos + costo_envio - float(descuento_monto or 0.0)))
    numero_cotizacion = generar_numero_cotizacion()

    # Crear cotizacion (entidad principal). Generamos token editable automáticamente.
    nueva = Cotizacion(
        numero_cotizacion=numero_cotizacion,
        id_vendedor=data.id_vendedor,
        status="generada",
        editable_token=secrets.token_urlsafe(24),
        editable_token_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    try:
        db.add(nueva)
        db.flush()  # obtener id_cotizacion

        # crear version inicial
        version = CotizacionVersion(
            id_version=uuid4(),
            id_cotizacion=nueva.id_cotizacion,
            version_number=1,
            numero_cotizacion=numero_cotizacion,
            id_vendedor=data.id_vendedor,
            telefono_cliente=data.telefono_cliente,
            nombre_cliente=data.nombre_cliente,
            email_cliente=data.email_cliente,
            comentarios=data.comentarios,
            direccion=data.direccion,            # <<--- agregado
            id_codigo_descuento=codigo_obj.id if codigo_obj else None,
            descuento_aplicado=descuento_monto,
            costo_envio=costo_envio,
            descripcion_envio=data.descripcion_envio,
            total=total_final,
            created_at=datetime.utcnow(),
)
        db.add(version)
        db.flush()  # obtener id_version

        detalles_created = []
        for it in detalles_payload:
            detalle = DetalleCotizacionVersion(
    id_detalle_version=uuid4(),
    id_version=version.id_version,
    id_producto=it["id_producto"],
    nombre_producto=it["nombre_producto"],
    precio_unitario=it["precio_unitario"],
    cantidad=it["cantidad"],
    subtotal=it["subtotal"],
    nota_personalizable=it.get("nota_personalizable")
)
            db.add(detalle)
            detalles_created.append(detalle)

        # actualizar current_version_id y totales en la cotizacion
        nueva.current_version_id = version.id_version
        if hasattr(nueva, "total"):
            nueva.total = total_final
        if hasattr(nueva, "descuento_aplicado"):
            nueva.descuento_aplicado = float(descuento_monto or 0)
        if hasattr(nueva, "costo_envio"):
            nueva.costo_envio = costo_envio

        db.commit()

        db.refresh(nueva)
        db.refresh(version)
        for d in detalles_created:
            db.refresh(d)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando cotización: {str(e)}")

    # --- enriquecer productos_out con imagen_url (query en batch)
    productos_out = []
    if detalles_created:
        prod_ids = list({str(d.id_producto) for d in detalles_created})
        parsed_ids = []
        for pid in prod_ids:
            try:
                parsed_ids.append(UUID_cls(str(pid)))
            except Exception:
                continue
        productos_map = {}
        if parsed_ids:
            productos_db = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()
            productos_map = {str(p.id_producto): p for p in productos_db}

        for d in detalles_created:
            prod_obj = productos_map.get(str(d.id_producto))
            productos_out.append({
                "id_detalle_version": str(d.id_detalle_version),
                "id_producto": str(d.id_producto),
                "nombre_producto": d.nombre_producto,
                "precio_unitario": float(d.precio_unitario),
                "cantidad": int(d.cantidad),
                **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
                "imagen_url": getattr(prod_obj, "imagen_url", None) if prod_obj else None,
                "slug": getattr(prod_obj, "slug", None) if prod_obj else None,
            })

    cot_out = {
        "id_cotizacion": str(nueva.id_cotizacion) if hasattr(nueva, "id_cotizacion") else None,
        "numero_cotizacion": nueva.numero_cotizacion,
        "id_vendedor": str(nueva.id_vendedor) if hasattr(nueva, "id_vendedor") else None,
        "telefono_cliente": version.telefono_cliente,
        "nombre_cliente": version.nombre_cliente,
        "email_cliente": version.email_cliente,
        "comentarios": version.comentarios,
        "id_codigo_descuento": str(version.id_codigo_descuento) if getattr(version, "id_codigo_descuento", None) else None,
        "codigo_descuento": codigo_obj.codigo if codigo_obj else None,
        "descuento_aplicado": float(version.descuento_aplicado or 0),
        "costo_envio": float(version.costo_envio or 0),
        "descripcion_envio": version.descripcion_envio,
        "total": float(version.total),
        "status": str(nueva.status),
        "created_at": nueva.created_at.isoformat() if getattr(nueva, "created_at", None) else None,
        "productos": productos_out,
        "current_version_id": str(nueva.current_version_id) if getattr(nueva, "current_version_id", None) else None,
        "editable_token": getattr(nueva, "editable_token", None),
        "editable_token_active": bool(getattr(nueva, "editable_token_active", True)),
    }

    return cot_out


# =====================================
#  GET  Buscar cotización por numero_cotizacion (con imagen_url embebida)
# =====================================
@router.get("/numero/{numero_cotizacion}", response_model=Dict[str, Any])
def obtener_cotizacion(numero_cotizacion: str, db: Session = Depends(get_db)):
    cot = db.query(Cotizacion).filter(Cotizacion.numero_cotizacion == numero_cotizacion).first()
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    if not cot.current_version_id:
        raise HTTPException(status_code=500, detail="Cotización sin versión activa")

    # obtener la versión actual
    version = db.query(CotizacionVersion).filter(
        CotizacionVersion.id_version == cot.current_version_id
    ).first()

    if not version:
        raise HTTPException(status_code=500, detail="Versión actual de la cotización no encontrada")

    # traer detalles de la versión
    detalles = db.query(DetalleCotizacionVersion).filter(
        DetalleCotizacionVersion.id_version == version.id_version
    ).all()

    # si no hay detalles devolvemos estructura vacía
    if not detalles:
        productos = []
    else:
        # colectar ids únicos de productos (como strings)
        producto_ids = list({str(d.id_producto) for d in detalles if getattr(d, "id_producto", None)})

        # parsear a UUIDs si tu columna es UUID(as_uuid=True)
        parsed_ids = []
        for pid in producto_ids:
            try:
                parsed_ids.append(UUID_cls(str(pid)))
            except Exception:
                # ignorar ids no parseables (defensivo)
                continue

        productos_map = {}
        if parsed_ids:
            productos_db = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()
            productos_map = {str(p.id_producto): p for p in productos_db}

        # construir lista final mezclando detalle + campos del producto (imagen_url, slug, precio)
        productos = []
        for d in detalles:
            pid_str = str(d.id_producto)
            prod_obj = productos_map.get(pid_str)
            imagen_url = getattr(prod_obj, "imagen_url", None) if prod_obj else None
            slug = getattr(prod_obj, "slug", None) if prod_obj else None
            precio_db = None
            try:
                precio_db = float(getattr(prod_obj, "precio", None)) if prod_obj and getattr(prod_obj, "precio", None) is not None else None
            except Exception:
                precio_db = None

            productos.append({
                "id_detalle_version": str(d.id_detalle_version),
                "id_producto": pid_str,
                "nombre_producto": d.nombre_producto,
                "precio_unitario": float(d.precio_unitario),
                "nota_personalizable": d.nota_personalizable,
                "precio_db": precio_db,               # opcional: precio almacenado en tabla productos
                "cantidad": int(d.cantidad),
                "subtotal": float(d.subtotal) if getattr(d, "subtotal", None) is not None else None,
                "imagen_url": imagen_url,
                "slug": slug,
            })

    # calcular total (fallback si no está en la versión)
    total_val = None
    if getattr(version, "total", None) is not None:
        try:
            total_val = float(version.total)
        except Exception:
            total_val = None

    if total_val is None:
        total_val = float(getattr(cot, "total", 0) or sum((p.get("subtotal", 0) or 0) for p in productos) + float(getattr(cot, "costo_envio", 0) or 0) - float(getattr(cot, "descuento_aplicado", 0) or 0))

    return {
        "id_cotizacion": str(cot.id_cotizacion),
        "numero_cotizacion": cot.numero_cotizacion,
        "id_vendedor": str(cot.id_vendedor) if getattr(cot, "id_vendedor", None) else None,

        # datos que vienen de la versión (cliente)
        "telefono_cliente": version.telefono_cliente,
        "nombre_cliente": version.nombre_cliente,
        "email_cliente": version.email_cliente,
        "direccion": getattr(version, "direccion", None),
        "comentarios": version.comentarios,
        "descripcion_envio": version.descripcion_envio,
        "id_codigo_descuento": str(version.id_codigo_descuento) if version.id_codigo_descuento else None,
        "descuento_aplicado": float(version.descuento_aplicado or 0),
        "costo_envio": float(version.costo_envio or 0),
        "total": float(total_val),

        "status": cot.status,
        "created_at": cot.created_at.isoformat() if getattr(cot, "created_at", None) else None,

        "productos": productos,
        "current_version_id": str(version.id_version),

        # token solo informativo
        "editable_token": cot.editable_token,
        "editable_token_active": bool(cot.editable_token_active),
    }
# =====================================
#  PUT  Editar cotización existente (ADMIN: crea nueva versión — permite overrides)
# =====================================
@router.put("/numero/{numero_cotizacion}", response_model=Dict[str, Any])
def actualizar_cotizacion(numero_cotizacion: str, data: CotizacionRequest, db: Session = Depends(get_db)):
    cot = db.query(Cotizacion).filter(Cotizacion.numero_cotizacion == numero_cotizacion).first()
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    if not data.productos or len(data.productos) == 0:
        raise HTTPException(status_code=400, detail="Productos vacíos")

    # Validar/Preparar detalles permitiendo overrides (admin)
    detalles_payload = validar_y_preparar_detalles_db([p.dict() for p in data.productos], data.id_vendedor, db, allow_price_override=True)
    subtotal_total = sum(item["subtotal"] for item in detalles_payload)

    codigo_obj = None
    descuento_monto = float(data.descuento_aplicado or 0)

    if getattr(data, "id_codigo_descuento", None):
        try:
            uid = UUID_cls(str(data.id_codigo_descuento))
        except Exception:
            raise HTTPException(status_code=400, detail="id_codigo_descuento inválido")

        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.id == uid).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido (id)")
        descuento_monto = calcular_descuento_obj(codigo_obj, float(subtotal_total or 0.0), data.id_vendedor)

    elif data.codigo_descuento:
        code_norm = _norm_code(data.codigo_descuento)
        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido")
        descuento_monto = calcular_descuento_obj(codigo_obj, float(subtotal_total or 0.0), data.id_vendedor)

    total_final = money(max(0.0, subtotal_total + float(data.costo_envio or 0.0) - float(descuento_monto or 0.0)))

    try:
        nueva_version_number = 1
        if cot.versiones:
            nums = [v.version_number for v in cot.versiones]
            nueva_version_number = max(nums) + 1

        version = CotizacionVersion(
            id_version=uuid4(),
            id_cotizacion=cot.id_cotizacion,
            version_number=nueva_version_number,
            numero_cotizacion=cot.numero_cotizacion,
            id_vendedor=data.id_vendedor,
            telefono_cliente=data.telefono_cliente,
            nombre_cliente=data.nombre_cliente,
            email_cliente=data.email_cliente,
            direccion=data.direccion, 
            comentarios=data.comentarios,
            id_codigo_descuento=codigo_obj.id if codigo_obj else None,
            descuento_aplicado=descuento_monto,
            costo_envio=float(data.costo_envio or 0.0),
            descripcion_envio=data.descripcion_envio,
            total=total_final,
            created_at=datetime.utcnow(),
        )
        db.add(version)
        db.flush()

        detalles_created = []
        for it in detalles_payload:
            detalle = DetalleCotizacionVersion(
    id_detalle_version=uuid4(),
    id_version=version.id_version,
    id_producto=it["id_producto"],
    nombre_producto=it["nombre_producto"],
    precio_unitario=it["precio_unitario"],
    cantidad=it["cantidad"],
    subtotal=it["subtotal"],
    nota_personalizable=it.get("nota_personalizable")
)
            db.add(detalle)
            detalles_created.append(detalle)

        cot.current_version_id = version.id_version
        if hasattr(cot, "total"):
            cot.total = total_final
        cot.descuento_aplicado = float(descuento_monto or 0)
        cot.costo_envio = float(data.costo_envio or 0.0)
        if "updated_at" in Cotizacion.__table__.columns:
            cot.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(version)
        for d in detalles_created:
            db.refresh(d)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error actualizando cotización: {str(e)}")

    # enriquecer productos_out con imagen_url
    productos_out = []
    if detalles_created:
        prod_ids = list({str(d.id_producto) for d in detalles_created})
        parsed_ids = []
        for pid in prod_ids:
            try:
                parsed_ids.append(UUID_cls(str(pid)))
            except Exception:
                continue
        productos_map = {}
        if parsed_ids:
            productos_db = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()
            productos_map = {str(p.id_producto): p for p in productos_db}

        for d in detalles_created:
            prod_obj = productos_map.get(str(d.id_producto))
            productos_out.append({
                "id_detalle_version": str(d.id_detalle_version),
                "id_producto": str(d.id_producto),
                "nombre_producto": d.nombre_producto,
                "precio_unitario": float(d.precio_unitario),
                "cantidad": int(d.cantidad),
                **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
                "imagen_url": getattr(prod_obj, "imagen_url", None) if prod_obj else None,
                "slug": getattr(prod_obj, "slug", None) if prod_obj else None,
            })

    cot_out = {
        "id_cotizacion": str(cot.id_cotizacion) if hasattr(cot, "id_cotizacion") else None,
        "numero_cotizacion": cot.numero_cotizacion,
        "id_vendedor": str(cot.id_vendedor) if hasattr(cot, "id_vendedor") else None,
        "telefono_cliente": version.telefono_cliente,
        "nombre_cliente": version.nombre_cliente,
        "email_cliente": version.email_cliente,
        "comentarios": version.comentarios,
        "id_codigo_descuento": str(version.id_codigo_descuento) if getattr(version, "id_codigo_descuento", None) else None,
        "codigo_descuento": codigo_obj.codigo if codigo_obj else None,
        "descuento_aplicado": float(version.descuento_aplicado or 0),
        "costo_envio": float(version.costo_envio or 0),
        "descripcion_envio": version.descripcion_envio,
        "total": float(version.total),
        "status": str(getattr(cot, "status", None)),
        "created_at": cot.created_at.isoformat() if getattr(cot, "created_at", None) else None,
        "productos": productos_out,
        "current_version_id": str(cot.current_version_id) if getattr(cot, "current_version_id", None) else None,
    }

    return cot_out


# =====================================
#  POST público: Editar por token (token en query para link editable)
#  NO permite override de precio (usa precio DB)
# =====================================
@router.post("/{id_cotizacion}/editar", response_model=Dict[str, Any])
def editar_cotizacion_por_token_query(
    id_cotizacion: str = Path(..., description="UUID de la cotización"),
    token: str = Query(..., description="Token editable de la cotización"),
    data: dict = Body(..., description="Payload con la estructura de CotizacionRequest"),
    db: Session = Depends(get_db),
):
    # convertir id
    try:
        cot_uuid = UUID_cls(str(id_cotizacion))
    except Exception:
        raise HTTPException(status_code=400, detail="id_cotizacion inválido")

    cot = db.query(Cotizacion).filter(Cotizacion.id_cotizacion == cot_uuid).first()
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    # validar token y bandera
    if not cot.editable_token or cot.editable_token != token:
        raise HTTPException(status_code=403, detail="Token inválido")
    if not getattr(cot, "editable_token_active", True):
        raise HTTPException(status_code=403, detail="Edición deshabilitada para esta cotización")

    # validar estado (no permitir edición si ya fue pagada/entregada/cancelada)
    if str(getattr(cot, "status", "")).lower() in ("pagada", "entregada", "cancelada"):
        raise HTTPException(status_code=400, detail="No se puede editar una cotización en estado pagada/entregada/cancelada")

    # === Validaciones de productos y cálculo (reusar la lógica de crear/put) ===
    productos_input = data.get("productos", [])
    if not productos_input or len(productos_input) == 0:
        raise HTTPException(status_code=400, detail="Productos vacíos")

    # id_vendedor esperado: preferimos usar cot.id_vendedor para seguridad
    id_vendedor_expected = getattr(cot, "id_vendedor", None)
    if not id_vendedor_expected and data.get("id_vendedor"):
        id_vendedor_expected = data.get("id_vendedor")

    detalles_payload = validar_y_preparar_detalles_db(productos_input, id_vendedor_expected, db, allow_price_override=False)
    subtotal_total = sum(item["subtotal"] for item in detalles_payload)

    costo_envio = float(data.get("costo_envio", 0.0) or 0.0)

    # manejar codigo de descuento (mismo comportamiento: id prioriza texto)
    codigo_obj = None
    descuento_monto = 0.0
    if data.get("id_codigo_descuento"):
        try:
            uid = UUID_cls(str(data.get("id_codigo_descuento")))
        except Exception:
            raise HTTPException(status_code=400, detail="id_codigo_descuento inválido")
        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.id == uid).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido (id)")
        descuento_monto = calcular_descuento_obj(codigo_obj, float(subtotal_total or 0.0), id_vendedor_expected)

    elif data.get("codigo_descuento"):
        code_norm = _norm_code(data.get("codigo_descuento"))
        codigo_obj = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
        if not codigo_obj:
            raise HTTPException(status_code=400, detail="Código de descuento inválido")
        descuento_monto = calcular_descuento_obj(codigo_obj, float(subtotal_total or 0.0), id_vendedor_expected)

    total_final = money(max(0.0, subtotal_total + costo_envio - float(descuento_monto or 0.0)))

    # crear nueva version (cliente)
    try:
        nueva_version_number = 1
        if cot.versiones:
            nums = [v.version_number for v in cot.versiones]
            nueva_version_number = max(nums) + 1

        version = CotizacionVersion(
            id_version=uuid4(),
            id_cotizacion=cot.id_cotizacion,
            version_number=nueva_version_number,
            numero_cotizacion=cot.numero_cotizacion,
            id_vendedor=id_vendedor_expected or cot.id_vendedor,
            telefono_cliente=data.get("telefono_cliente"),
            nombre_cliente=data.get("nombre_cliente"),
            email_cliente=data.get("email_cliente"),
            direccion=data.get("direccion"), 
            comentarios=data.get("comentarios"),
            id_codigo_descuento=codigo_obj.id if codigo_obj else None,
            descuento_aplicado=descuento_monto,
            costo_envio=costo_envio,
            descripcion_envio=data.get("descripcion_envio"),
            total=total_final,
            created_at=datetime.utcnow(),
        )
        db.add(version)
        db.flush()

        detalles_created = []
        for it in detalles_payload:
            detalle = DetalleCotizacionVersion(
                id_detalle_version=uuid4(),
                id_version=version.id_version,
                id_producto=it["id_producto"],
                nombre_producto=it["nombre_producto"],
                precio_unitario=it["precio_unitario"],
                cantidad=it["cantidad"],
                subtotal=it["subtotal"],
                nota_personalizable=it.get("nota_personalizable")
            )
            db.add(detalle)
            detalles_created.append(detalle)

        # actualizar current_version_id y totales en la entidad principal
        cot.current_version_id = version.id_version
        if hasattr(cot, "total"):
            cot.total = total_final
        if hasattr(cot, "descuento_aplicado"):
            cot.descuento_aplicado = float(descuento_monto or 0)
        if hasattr(cot, "costo_envio"):
            cot.costo_envio = costo_envio
        if "updated_at" in Cotizacion.__table__.columns:
            cot.updated_at = datetime.utcnow()

        db.commit()

        db.refresh(cot)
        db.refresh(version)
        for d in detalles_created:
            db.refresh(d)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando nueva versión por token: {str(e)}")

    # enriquecer productos_out con imagen_url
    productos_out = []
    if detalles_created:
        prod_ids = list({str(d.id_producto) for d in detalles_created})
        parsed_ids = []
        for pid in prod_ids:
            try:
                parsed_ids.append(UUID_cls(str(pid)))
            except Exception:
                continue
        productos_map = {}
        if parsed_ids:
            productos_db = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()
            productos_map = {str(p.id_producto): p for p in productos_db}

        for d in detalles_created:
            prod_obj = productos_map.get(str(d.id_producto))
            productos_out.append({
                "id_detalle_version": str(d.id_detalle_version),
                "id_producto": str(d.id_producto),
                "nombre_producto": d.nombre_producto,
                "precio_unitario": float(d.precio_unitario),
                "cantidad": int(d.cantidad),
                **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
                "imagen_url": getattr(prod_obj, "imagen_url", None) if prod_obj else None,
                "slug": getattr(prod_obj, "slug", None) if prod_obj else None,
            })

    cot_out = {
        "id_cotizacion": str(cot.id_cotizacion) if hasattr(cot, "id_cotizacion") else None,
        "numero_cotizacion": cot.numero_cotizacion,
        "id_vendedor": str(cot.id_vendedor) if hasattr(cot, "id_vendedor") else None,
        "telefono_cliente": version.telefono_cliente,
        "nombre_cliente": version.nombre_cliente,
        "email_cliente": version.email_cliente,
        "comentarios": version.comentarios,
        "id_codigo_descuento": str(version.id_codigo_descuento) if getattr(version, "id_codigo_descuento", None) else None,
        "codigo_descuento": codigo_obj.codigo if codigo_obj else None,
        "descuento_aplicado": float(version.descuento_aplicado or 0),
        "costo_envio": float(version.costo_envio or 0),
        "descripcion_envio": version.descripcion_envio,
        "total": float(version.total),
        "status": str(getattr(cot, "status", None)),
        "created_at": cot.created_at.isoformat() if getattr(cot, "created_at", None) else None,
        "productos": productos_out,
        "current_version_id": str(cot.current_version_id) if getattr(cot, "current_version_id", None) else None,
    }

    return cot_out