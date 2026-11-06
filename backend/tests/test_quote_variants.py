from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import create_access_token, verify_token
from app.db.database import Base
from app.models.categoria import Categoria  # noqa: F401 - mapper registration
from app.models.producto_categoria import ProductoCategoria  # noqa: F401
from app.models.producto import Producto
from app.models.product_variant import ProductOption, ProductOptionValue, ProductVariant, ProductVariantValue
from app.models.vendedor import Vendedor
from app.routes.cotizaciones import validar_y_preparar_detalles_db


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    tables = [
        Producto.__table__,
        Vendedor.__table__,
        ProductOption.__table__,
        ProductOptionValue.__table__,
        ProductVariant.__table__,
        ProductVariantValue.__table__,
    ]
    Base.metadata.create_all(engine, tables=tables)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def make_variant_product(db, seller_id, stock=3):
    product = Producto(
        id_producto=uuid4(), id_vendedor=seller_id, nombre="Playera", descripcion="Básica",
        precio=399, imagen_url="https://example.com/playera.jpg", slug="playera", activo=True,
    )
    option = ProductOption(id_producto=product.id_producto, nombre="Color", orden=0)
    value = ProductOptionValue(opcion=option, valor="Negro", orden=0)
    variant = ProductVariant(
        id_producto=product.id_producto, sku="NEG-S", precio=419, stock=stock, activo=True,
        valores=[value],
    )
    db.add_all([product, option, value, variant])
    db.commit()
    return product, variant


def test_quote_uses_variant_price_and_snapshot(db):
    seller_id = uuid4()
    product, variant = make_variant_product(db, seller_id)

    [detail] = validar_y_preparar_detalles_db(
        [{"id_producto": str(product.id_producto), "id_variante": str(variant.id_variante), "cantidad": 2}],
        str(seller_id), db,
    )

    assert detail["precio_unitario"] == 419
    assert detail["subtotal"] == 838
    assert detail["nombre_variante"] == "Negro"
    assert detail["opciones_variante"] == {"Color": "Negro"}
    assert detail["sku_variante"] == "NEG-S"


def test_quote_rejects_insufficient_variant_stock(db):
    seller_id = uuid4()
    product, variant = make_variant_product(db, seller_id, stock=1)
    with pytest.raises(HTTPException) as exc:
        validar_y_preparar_detalles_db(
            [{"id_producto": str(product.id_producto), "id_variante": str(variant.id_variante), "cantidad": 2}],
            str(seller_id), db,
        )
    assert exc.value.status_code == 409


def test_quote_rejects_product_from_another_seller(db):
    product, variant = make_variant_product(db, uuid4())
    with pytest.raises(HTTPException) as exc:
        validar_y_preparar_detalles_db(
            [{"id_producto": str(product.id_producto), "id_variante": str(variant.id_variante), "cantidad": 1}],
            str(uuid4()), db,
        )
    assert exc.value.status_code == 400


def test_access_token_round_trip():
    seller_id = uuid4()
    token = create_access_token({"id_vendedor": str(seller_id), "clave": "mi-tienda"})
    payload = verify_token(token)
    assert payload["id_vendedor"] == str(seller_id)
    assert payload["clave"] == "mi-tienda"
