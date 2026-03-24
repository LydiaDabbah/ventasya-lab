# app/routes/productos.py
import logging
from fastapi import APIRouter, Depends, Body, Query, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from slugify import slugify

from app.db.database import SessionLocal
from app.models.producto import Producto
from app.models.producto_categoria import ProductoCategoria
from app.models.categoria import Categoria
from app.schemas.producto import ProductoCreate, ProductoOut, ProductoUpdate

router = APIRouter(prefix="/productos", tags=["Productos"])
logger = logging.getLogger("uvicorn.error")


class ProductoActivoUpdate(BaseModel):
    activo: bool


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ProductoOut)
def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    slug_value = producto.slug or slugify(producto.nombre)

    nuevo = Producto(
        id_producto=uuid4(),
        id_vendedor=producto.id_vendedor,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        imagen_url=producto.imagen_url,
        slug=slug_value,
        sku=producto.sku,
        precio=producto.precio,

        # ✅ NUEVO
        personalizable=bool(producto.personalizable),

        activo=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    logger.info("producto creado id=%s nombre=%s", nuevo.id_producto, nuevo.nombre)
    return nuevo


@router.get("/", response_model=List[ProductoOut])
def obtener_productos(id_vendedor: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Producto)
    if id_vendedor:
        try:
            id_vend_uuid = UUID(id_vendedor)
        except Exception:
            raise HTTPException(status_code=400, detail="id_vendedor inválido (debe ser UUID)")
        query = query.filter(Producto.id_vendedor == id_vend_uuid)

    resultados = query.all()
    logger.info("GET /productos -> returned %d rows (id_vendedor=%s)", len(resultados), id_vendedor)
    return resultados


@router.post("/bulk", response_model=List[ProductoOut])
def crear_productos_en_lote(productos: List[ProductoCreate] = Body(...), db: Session = Depends(get_db)):
    nuevos = []
    ahora = datetime.utcnow()

    for producto in productos:
        slug_value = producto.slug or slugify(producto.nombre)

        nuevo = Producto(
            id_producto=uuid4(),
            id_vendedor=producto.id_vendedor,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            imagen_url=producto.imagen_url,
            slug=slug_value,
            sku=producto.sku,
            precio=producto.precio,

            # ✅ NUEVO
            personalizable=bool(producto.personalizable),

            activo=True,
            created_at=ahora,
            updated_at=ahora,
        )
        db.add(nuevo)
        nuevos.append(nuevo)

    db.commit()

    for prod in nuevos:
        db.refresh(prod)

    logger.info("bulk created %d productos", len(nuevos))
    return nuevos


@router.get("/batch", response_model=List[ProductoOut])
def obtener_productos_batch(ids: str = Query(...), db: Session = Depends(get_db)):
    raw_ids = [x.strip() for x in ids.split(",") if x.strip()]
    parsed_ids = []
    for rid in raw_ids:
        try:
            parsed_ids.append(UUID(rid))
        except Exception:
            continue

    if not parsed_ids:
        return []

    try:
        productos = db.query(Producto).filter(Producto.id_producto.in_(parsed_ids)).all()

        # Serializar AQUI dentro del scope de la session
        response = []
        for p in productos:
            precio = None
            try:
                precio = float(p.precio) if p.precio is not None else None
            except Exception:
                precio = None

            response.append({
                "id_producto": str(p.id_producto),
                "id_vendedor": str(p.id_vendedor) if p.id_vendedor else None,
                "nombre": p.nombre,
                "descripcion": p.descripcion,
                "precio": precio,
                "imagen_url": p.imagen_url,
                "slug": p.slug,
                "sku": p.sku,
                "personalizable": bool(getattr(p, "personalizable", False)),  # ✅ NUEVO
                "activo": bool(p.activo),
                "created_at": p.created_at,
                "updated_at": p.updated_at
            })

        return response

    except Exception as e:
        logger.exception("Error en obtener_productos_batch")
        raise HTTPException(status_code=500, detail="Error interno al obtener productos")


@router.get("/{id_producto}", response_model=ProductoOut)
def obtener_producto_por_id(id_producto: str, db: Session = Depends(get_db)):
    logger.info("GET /productos/%s called", id_producto)
    try:
        uid = UUID(id_producto)
    except Exception:
        logger.warning("GET /productos: id_producto inválido: %s", id_producto)
        raise HTTPException(status_code=400, detail="id_producto inválido")

    producto = db.query(Producto).filter(Producto.id_producto == uid).first()

    if not producto:
        logger.info("GET /productos: producto no encontrado id=%s", id_producto)
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    logger.info("GET /productos: producto encontrado id=%s name=%s", id_producto, producto.nombre)
    return producto


@router.patch("/{id_producto}/activo", response_model=ProductoOut)
def actualizar_estado_producto(id_producto: str, payload: ProductoActivoUpdate, db: Session = Depends(get_db)):
    logger.info("PATCH /productos/%s/activo called", id_producto)
    try:
        uid = UUID(id_producto)
    except Exception:
        raise HTTPException(status_code=400, detail="id_producto inválido")

    producto = db.query(Producto).filter(Producto.id_producto == uid).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.activo = bool(payload.activo)
    producto.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(producto)

    logger.info("producto estado actualizado id=%s activo=%s", id_producto, producto.activo)
    return producto


@router.put("/{id_producto}", response_model=ProductoOut)
def actualizar_producto(id_producto: str, payload: ProductoUpdate, db: Session = Depends(get_db)):
    logger.info("PUT /productos/%s called", id_producto)
    try:
        uid = UUID(id_producto)
    except Exception:
        raise HTTPException(status_code=400, detail="id_producto inválido")

    producto = db.query(Producto).filter(Producto.id_producto == uid).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    data = payload.dict(exclude_unset=True)
    categorias_ids = data.pop("categorias_ids", None)

    for field, value in data.items():
        setattr(producto, field, value)

    if categorias_ids is not None:
        categorias_validas = db.query(Categoria).filter(
            Categoria.id_categoria.in_(categorias_ids),
            Categoria.id_vendedor == producto.id_vendedor,
            Categoria.activo == True,  # noqa: E712
        ).all()
        categorias_validas_ids = {c.id_categoria for c in categorias_validas}

        if len(categorias_validas_ids) != len(set(categorias_ids)):
            raise HTTPException(status_code=400, detail="Una o más categorías son inválidas para este vendedor")

        actuales = db.query(ProductoCategoria).filter(
            ProductoCategoria.id_producto == producto.id_producto
        ).all()
        actuales_ids = {rel.id_categoria for rel in actuales}

        nuevas_ids = set(categorias_ids)
        to_add = nuevas_ids - actuales_ids
        to_delete = actuales_ids - nuevas_ids

        if to_delete:
            db.query(ProductoCategoria).filter(
                ProductoCategoria.id_producto == producto.id_producto,
                ProductoCategoria.id_categoria.in_(list(to_delete)),
            ).delete(synchronize_session=False)

        for cat_id in to_add:
            db.add(ProductoCategoria(id_producto=producto.id_producto, id_categoria=cat_id))

    producto.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(producto)

    logger.info("producto actualizado id=%s", id_producto)
    return producto
