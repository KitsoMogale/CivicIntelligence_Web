"""Persist historical series, source-linked events and catalog release audit."""
from alembic import op
from backend.database import IndicatorRecord, TimelineEventRecord, CatalogRevision
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None
def upgrade():
    for model in (IndicatorRecord, TimelineEventRecord, CatalogRevision):
        model.__table__.create(bind=op.get_bind(), checkfirst=True)
def downgrade():
    for model in (CatalogRevision, TimelineEventRecord, IndicatorRecord):
        model.__table__.drop(bind=op.get_bind(), checkfirst=True)
