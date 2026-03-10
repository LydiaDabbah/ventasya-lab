from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c7310e6cf282'
down_revision = '38cafbca4c27'
branch_labels = None
depends_on = None

def upgrade():
    # 🔧 Eliminar tipo_variante de variantes_producto
    op.drop_column('variantes_producto', 'tipo_variante')

    # ✅ Asegurar que no haya NULL antes de set nullable=False
    op.execute("UPDATE productos SET tipo_variante = 'sin_variante' WHERE tipo_variante IS NULL")

    # 🔧 Hacer tipo_variante NOT NULL en productos
    op.alter_column('productos', 'tipo_variante', nullable=False)


def downgrade():
    # 🔧 Revertir NOT NULL en productos.tipo_variante
    op.alter_column('productos', 'tipo_variante', nullable=True)

    # 🔧 Volver a agregar tipo_variante a variantes_producto
    op.add_column('variantes_producto', sa.Column('tipo_variante', sa.String(), nullable=True))
