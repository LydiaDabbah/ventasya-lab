from fastapi import FastAPI
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

from app.routes.vendedores import router as vendedores_router
app.include_router(vendedores_router)

from app.routes.productos import router as productos_router
app.include_router(productos_router)
from app.routes.imagenes_producto import router as imagenes_producto_router
app.include_router(imagenes_producto_router)



from app.routes.categoria import router as categoria_router 

app.include_router(categoria_router)
from app.routes.vendedor_dato_visual import router as vendedor_dato_visual_router
app.include_router(vendedor_dato_visual_router)

from app.routes.producto_categoria import router as  producto_categoria_router
app.include_router(producto_categoria_router)

from app.routes.producto_categoria_sistema import router as producto_categoria_sistema_router

app.include_router(producto_categoria_sistema_router)

from app.routes.producto_datos_adicionales import router as producto_datos_adicionales_router

from app.routes.codigos_descuento import router as producto_codigos_descuento_router
app.include_router(producto_codigos_descuento_router)
app.include_router(producto_datos_adicionales_router)

from app.routes.cotizaciones import router as cotizaciones_router
app.include_router(cotizaciones_router)

from app.routes.cotizacion_versiones import router as cotizacion_versiones_router
app.include_router(cotizacion_versiones_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
        if settings.ENVIRONMENT.lower() == "development"
        else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
