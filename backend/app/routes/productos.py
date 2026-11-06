import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from slugify import slugify
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.auth import get_current_vendedor, get_optional_vendedor, require_vendedor_id
from app.db.database import get_db
from app.models.categoria import Categoria
from app.models.product_variant import ProductOption, ProductOptionValue, ProductVariant
from app.models.producto import Producto
from app.models.producto_categoria import ProductoCategoria
from app.schemas.producto import ProductoCreate, ProductoOut, ProductoUpdate

router = APIRouter(prefix="/productos", tags=["Productos"])
logger = logging.getLogger("uvicorn.error")


class ProductoActivoUpdate(BaseModel):
    activo: bool


def _query(db: Session):
    return db.query(Producto).options(
        selectinload(Producto.categorias_rel),
        selectinload(Producto.opciones).selectinload(ProductOption.valores),
        selectinload(Producto.variantes).selectinload(ProductVariant.valores).selectinload(ProductOptionValue.opcion),
    )


def _serialize(producto: Producto) -> dict:
    return {
        "id_producto": producto.id_producto,
        "id_vendedor": producto.id_vendedor,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "precio": float(producto.precio),
        "imagen_url": producto.imagen_url,
        "slug": producto.slug,
        "sku": producto.sku,
        "personalizable": bool(producto.personalizable),
        "stock": int(producto.stock) if producto.stock is not None else None,
        "activo": bool(producto.activo),
        "created_at": producto.created_at,
        "updated_at": producto.updated_at,
        "categorias_ids": [rel.id_categoria for rel in producto.categorias_rel],
        "opciones": [
            {
                "id_opcion": option.id_opcion,
                "nombre": option.nombre,
                "orden": option.orden,
                "valores": [
                    {"id_valor": value.id_valor, "valor": value.valor, "orden": value.orden}
                    for value in option.valores
                ],
            }
            for option in producto.opciones
        ],
        "variantes": [
            {
                "id_variante": variant.id_variante,
                "opciones": {value.opcion.nombre: value.valor for value in variant.valores},
                "sku": variant.sku,
                "precio": float(variant.precio) if variant.precio is not None else None,
                "stock": int(variant.stock or 0),
                "activo": bool(variant.activo),
                "imagen_url": variant.imagen_url,
            }
            for variant in producto.variantes
        ],
    }


def _unique_slug(db: Session, seller_id: UUID, requested: str, product_id: UUID | None = None) -> str:
    base = slugify(requested) or "producto"
    candidate, suffix = base, 2
    while db.query(Producto).filter(
        Producto.id_vendedor == seller_id,
        Producto.slug == candidate,
        *([Producto.id_producto != product_id] if product_id else []),
    ).first():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _validate_categories(db: Session, seller_id: UUID, category_ids: list[UUID]) -> set[UUID]:
    requested = set(category_ids or [])
    if not requested:
        return set()
    valid = {
        c.id_categoria for c in db.query(Categoria).filter(
            Categoria.id_categoria.in_(requested), Categoria.id_vendedor == seller_id, Categoria.activo.is_(True)
        ).all()
    }
    if valid != requested:
        raise HTTPException(status_code=400, detail="Una o más categorías no pertenecen a tu negocio")
    return valid


def _replace_categories(db: Session, producto: Producto, category_ids: list[UUID]):
    valid = _validate_categories(db, producto.id_vendedor, category_ids)
    db.query(ProductoCategoria).filter(ProductoCategoria.id_producto == producto.id_producto).delete()
    for category_id in valid:
        db.add(ProductoCategoria(id_producto=producto.id_producto, id_categoria=category_id))


def _sync_variants(db: Session, producto: Producto, options_input, variants_input):
    options_input = list(options_input or [])
    variants_input = list(variants_input or [])
    if bool(options_input) != bool(variants_input):
        raise HTTPException(status_code=400, detail="Las opciones y variantes deben enviarse juntas")

    option_names = [o.nombre.casefold() for o in options_input]
    if len(option_names) != len(set(option_names)):
        raise HTTPException(status_code=400, detail="Los nombres de opción no pueden repetirse")

    existing_variants = {v.id_variante: v for v in producto.variantes}
    for variant in existing_variants.values():
        variant.valores = []
    db.flush()
    for option in list(producto.opciones):
        db.delete(option)
    db.flush()

    value_map = {}
    for option_index, option_input in enumerate(options_input):
        option = ProductOption(id_producto=producto.id_producto, nombre=option_input.nombre, orden=option_index)
        db.add(option)
        db.flush()
        for value_index, raw_value in enumerate(option_input.valores):
            value = ProductOptionValue(id_opcion=option.id_opcion, valor=raw_value, orden=value_index)
            db.add(value)
            db.flush()
            value_map[(option_input.nombre.casefold(), raw_value.casefold())] = value

    kept_ids, combinations = set(), set()
    expected_names = set(option_names)
    for variant_input in variants_input:
        supplied = {str(k).strip().casefold(): str(v).strip().casefold() for k, v in variant_input.opciones.items()}
        if set(supplied) != expected_names:
            raise HTTPException(status_code=400, detail="Cada variante debe elegir un valor de todas las opciones")
        selected = []
        for key in option_names:
            value = value_map.get((key, supplied[key]))
            if not value:
                raise HTTPException(status_code=400, detail="Una variante contiene un valor de opción inválido")
            selected.append(value)
        combination = tuple(str(value.id_valor) for value in selected)
        if combination in combinations:
            raise HTTPException(status_code=400, detail="Hay combinaciones de variantes duplicadas")
        combinations.add(combination)

        variant = existing_variants.get(variant_input.id_variante) if variant_input.id_variante else None
        if variant_input.id_variante and not variant:
            raise HTTPException(status_code=400, detail="La variante no pertenece a este producto")
        if not variant:
            variant = ProductVariant(id_variante=uuid4(), id_producto=producto.id_producto)
            db.add(variant)
        variant.sku = variant_input.sku
        variant.precio = variant_input.precio
        variant.stock = variant_input.stock
        variant.activo = variant_input.activo
        variant.imagen_url = variant_input.imagen_url
        variant.updated_at = datetime.utcnow()
        variant.valores = selected
        kept_ids.add(variant.id_variante)

    for variant_id, variant in existing_variants.items():
        if variant_id not in kept_ids:
            db.delete(variant)


def _owned_product(db: Session, product_id: UUID, seller_id: UUID) -> Producto:
    product = _query(db).filter(Producto.id_producto == product_id, Producto.id_vendedor == seller_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.post("/", response_model=ProductoOut, status_code=201)
def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db), auth=Depends(get_current_vendedor)):
    seller_id = require_vendedor_id(auth)
    if producto.id_vendedor != seller_id:
        raise HTTPException(status_code=403, detail="No puedes crear productos para otro vendedor")
    nuevo = Producto(
        id_producto=uuid4(), id_vendedor=seller_id, nombre=producto.nombre.strip(),
        descripcion=producto.descripcion.strip(), precio=producto.precio, imagen_url=producto.imagen_url,
        slug=_unique_slug(db, seller_id, producto.slug or producto.nombre), sku=producto.sku,
        personalizable=producto.personalizable, stock=producto.stock, activo=True,
    )
    try:
        db.add(nuevo)
        db.flush()
        _replace_categories(db, nuevo, producto.categorias_ids or [])
        _sync_variants(db, nuevo, producto.opciones, producto.variantes)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El SKU ya está en uso")
    return _serialize(_query(db).filter(Producto.id_producto == nuevo.id_producto).one())


@router.get("/", response_model=List[ProductoOut])
def obtener_productos(id_vendedor: UUID = Query(...), db: Session = Depends(get_db), auth=Depends(get_optional_vendedor)):
    query = _query(db).filter(Producto.id_vendedor == id_vendedor)
    if not auth or require_vendedor_id(auth) != id_vendedor:
        query = query.filter(Producto.activo.is_(True))
    return [_serialize(product) for product in query.order_by(Producto.created_at.desc()).all()]


@router.get("/batch", response_model=List[ProductoOut])
def obtener_productos_batch(ids: str = Query(...), db: Session = Depends(get_db)):
    parsed = []
    for raw in ids.split(","):
        try:
            parsed.append(UUID(raw.strip()))
        except ValueError:
            pass
    if not parsed:
        return []
    products = _query(db).filter(Producto.id_producto.in_(parsed), Producto.activo.is_(True)).all()
    return [_serialize(product) for product in products]


@router.get("/{id_producto}", response_model=ProductoOut)
def obtener_producto_por_id(id_producto: UUID, db: Session = Depends(get_db), auth=Depends(get_optional_vendedor)):
    product = _query(db).filter(Producto.id_producto == id_producto).first()
    if not product or (not product.activo and (not auth or require_vendedor_id(auth) != product.id_vendedor)):
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _serialize(product)


@router.patch("/{id_producto}/activo", response_model=ProductoOut)
def actualizar_estado_producto(id_producto: UUID, payload: ProductoActivoUpdate, db: Session = Depends(get_db), auth=Depends(get_current_vendedor)):
    product = _owned_product(db, id_producto, require_vendedor_id(auth))
    product.activo = payload.activo
    product.updated_at = datetime.utcnow()
    db.commit()
    return _serialize(_owned_product(db, id_producto, require_vendedor_id(auth)))


@router.put("/{id_producto}", response_model=ProductoOut)
def actualizar_producto(id_producto: UUID, payload: ProductoUpdate, db: Session = Depends(get_db), auth=Depends(get_current_vendedor)):
    seller_id = require_vendedor_id(auth)
    product = _owned_product(db, id_producto, seller_id)
    data = payload.model_dump(exclude_unset=True)
    categories = data.pop("categorias_ids", None)
    options = data.pop("opciones", None)
    variants = data.pop("variantes", None)
    if "slug" in data or "nombre" in data:
        requested = data.pop("slug", None) or data.get("nombre") or product.nombre
        product.slug = _unique_slug(db, seller_id, requested, product.id_producto)
    for field, value in data.items():
        setattr(product, field, value)
    try:
        if categories is not None:
            _replace_categories(db, product, categories)
        if options is not None or variants is not None:
            _sync_variants(db, product, options or [], variants or [])
        product.updated_at = datetime.utcnow()
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El SKU ya está en uso")
    return _serialize(_owned_product(db, id_producto, seller_id))


@router.post("/bulk", response_model=List[ProductoOut])
def crear_productos_en_lote(productos: List[ProductoCreate] = Body(...), db: Session = Depends(get_db), auth=Depends(get_current_vendedor)):
    # Conserva el contrato histórico sin saltarse las mismas reglas de ownership.
    return [crear_producto(producto, db, auth) for producto in productos]
