"""Set sku NOT NULL in variantes_producto

Revision ID: 162d0706bc88
Revises: bdb36a9add93
Create Date: 2025-06-27 20:48:10.864876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '162d0706bc88'
down_revision: Union[str, Sequence[str], None] = 'bdb36a9add93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('variantes_producto', 'sku', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('variantes_producto', 'sku', nullable=True)
