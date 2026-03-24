"""add moneda to vendedores

Revision ID: 02d564f45183
Revises: fad5e86e269d
Create Date: 2026-03-10 13:59:56.099638

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '02d564f45183'
down_revision: Union[str, Sequence[str], None] = 'fad5e86e269d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "vendedores",
        sa.Column("moneda", sa.String(length=3), nullable=False, server_default="MXN"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("vendedores", "moneda")
