"""PostgreSQL persistence. Seed mode remains available when DATABASE_URL is unset."""
import os
from functools import lru_cache
from sqlalchemy import create_engine, select, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from pgvector.sqlalchemy import Vector
class Base(DeclarativeBase):
    pass
class Country(Base):
    __tablename__ = "countries"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    continent: Mapped[str] = mapped_column(String(50))
    boundary = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
class Region(Base):
    __tablename__ = "regions"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    country: Mapped[str] = mapped_column(ForeignKey("countries.code"))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("regions.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(50))
    geometry = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
class KnowledgeDomain(Base):
    __tablename__ = "knowledge_domains"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("knowledge_domains.id"), nullable=True)
class Source(Base):
    __tablename__ = "sources"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    record: Mapped[dict] = mapped_column(JSONB)
class EntityRecord(Base):
    __tablename__ = "entities"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    country: Mapped[str] = mapped_column(ForeignKey("countries.code"), index=True)
    domain: Mapped[str] = mapped_column(ForeignKey("knowledge_domains.id"), index=True)
    record: Mapped[dict] = mapped_column(JSONB)
    region: Mapped[str | None] = mapped_column(ForeignKey("regions.id"), nullable=True, index=True)
    embedding = mapped_column(Vector(1536), nullable=True)
class Relationship(Base):
    __tablename__ = "relationships"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    source: Mapped[str] = mapped_column(ForeignKey("entities.id"), index=True)
    target: Mapped[str] = mapped_column(ForeignKey("entities.id"), index=True)
    record: Mapped[dict] = mapped_column(JSONB)
class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    country: Mapped[str] = mapped_column(ForeignKey("countries.code"))
    record: Mapped[dict] = mapped_column(JSONB)
class RawDocument(Base):
    __tablename__ = "raw_documents"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"))
    text: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(1536), nullable=True)
class IndicatorRecord(Base):
    __tablename__ = "indicators"
    code: Mapped[str] = mapped_column(String(100), primary_key=True)
    record: Mapped[dict] = mapped_column(JSONB)
class TimelineEventRecord(Base):
    __tablename__ = "timeline_events"
    id: Mapped[str] = mapped_column(String(150), primary_key=True)
    country: Mapped[str] = mapped_column(ForeignKey("countries.code"), index=True)
    record: Mapped[dict] = mapped_column(JSONB)
class CatalogRevision(Base):
    __tablename__ = "catalog_revisions"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    applied_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    summary: Mapped[dict] = mapped_column(JSONB)
@lru_cache(maxsize=1)
def engine():
    return create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True, connect_args={"connect_timeout":5})
def load_entities():
    with Session(engine()) as session:
        return [e.record for e in session.scalars(select(EntityRecord))]
def load_records(model):
    with Session(engine()) as session:
        return [row.record for row in session.scalars(select(model))]
