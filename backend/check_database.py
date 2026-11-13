"""Integration verification against the isolated development database."""
from sqlalchemy import select, text, func
from sqlalchemy.orm import Session
from backend.database import engine, EntityRecord, Country, Region, Relationship, Source, IndicatorRecord, TimelineEventRecord, CatalogRevision
from backend.catalog import SEED, REGIONS, INDICATORS, EVENTS, catalog_digest
from backend.semantic import rank_vector
with Session(engine()) as session:
    assert session.scalar(select(func.count()).select_from(EntityRecord)) == len(SEED["entities"])
    assert session.scalar(select(func.count()).select_from(Relationship)) == len(SEED["relationships"])
    assert session.scalar(select(func.count()).select_from(Source)) == len(SEED["sources"])
    assert session.scalar(select(func.count()).select_from(Region)) == len(REGIONS)
    assert session.scalar(select(func.count()).select_from(IndicatorRecord)) == len(INDICATORS["indicators"])
    assert session.scalar(select(func.count()).select_from(TimelineEventRecord)) == len(EVENTS)
    assert session.get(CatalogRevision,catalog_digest())
    assert session.scalar(select(func.count()).select_from(Country)) >= 170
    assert session.scalar(text("SELECT ST_Area(boundary::geography) > 0 FROM countries WHERE code='ZA'"))
    assert session.scalar(text("SELECT count(*) FROM regions WHERE ST_IsValid(geometry) AND ST_Area(geometry::geography)>0")) == 9
    assert session.get(Region,"mpumalanga").name == "Mpumalanga"
    record = session.get(EntityRecord,"za-electricity")
    record.embedding = [1.0]+[0.0]*1535
    session.flush()
    assert rank_vector([1.0]+[0.0]*1535,"ZA",session)[0]["id"] == "za-electricity"
    assert rank_vector([1.0]+[0.0]*1535,"BW",session) == []
    session.rollback()
print("PASS migrations, idempotent catalog seed, PostGIS provinces, dated references, release audit and isolated vector ranking")
from fastapi.testclient import TestClient
from backend.main import app
with TestClient(app) as client:
    assert len(client.get("/entities?country=ZA").json()) == len(SEED["entities"])
    assert client.get("/entities?country=BW").json() == []
    assert any(e["id"]=="za-transmission" for e in client.get("/search?q=transmission").json())
    assert client.get("/health/ready").json()["revision"] == catalog_digest()
    assert client.get("/regions/gauteng/boundary").status_code == 200
    assert len(client.get("/indicators?country=BW").json()[0]["observations"]) == 11
    assert client.get("/events?entity=za-belfast-mine").json()[0]["date"] == "2019"
    relationship = next(r for r in client.get("/entities/za-exxaro-resources/relationships").json() if r["target"]=="za-mafube-mine")
    assert relationship["ownershipPercent"] == 50
print("PASS database-backed entity, relationship, source, statistics, history and region retrieval")
