"""add nota_personalizable to detalle_cotizaciones_versiones

Revision ID: d62de84e6508
Revises: d729ee823458
Create Date: 2026-03-03 17:35:13.591654
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd62de84e6508'
down_revision: Union[str, Sequence[str], None] = 'd729ee823458'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "detalle_cotizaciones_versiones",
        sa.Column(
            "nota_personalizable",
            sa.String(),
            nullable=True
        )
    )


def downgrade() -> None:
    op.drop_column(
        "detalle_cotizaciones_versiones",
        "nota_personalizable"
    )