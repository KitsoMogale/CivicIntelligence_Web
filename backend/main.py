"""Read-only curated knowledge service. AI credentials are not required."""
import json
import logging
import math
import os
import re
import time
import uuid
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.catalog import SEED, REGIONS, INDICATORS, EVENTS, ROOT, MUNICIPALITIES, PROVINCIAL_METRICS, catalog_digest
from backend.catalog import OFFICIAL_MUNICIPALITIES, WARDS, BOUNDARY_RELEASE
from backend.catalog import COUNTRIES, COUNTRY_PROFILES
app = FastAPI(title="Civic Intelligence Knowledge API", version="0.2.0")
@app.get("/countries")
def countries():
    return COUNTRIES

@app.get("/countries/{country_code}/profile")
def country_profile(country_code: str):
    profile = next((p for p in COUNTRY_PROFILES if p["code"] == country_code), None)
    if profile is None:
        raise HTTPException(404, "Country or area not found")
    return {"profile": profile, "areas": [r for r in REGIONS if r["country"] == country_code]}
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("APP_ORIGIN", "http://127.0.0.1:3000")], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
logger = logging.getLogger("civic.api")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
logger.propagate = False
@app.middleware("http")
async def request_metrics(request, call_next):
    started = time.perf_counter()
    request_id = str(uuid.uuid4())
    response = await call_next(request)
    elapsed = round((time.perf_counter() - started) * 1000)
    response.headers["X-Request-ID"] = request_id
    if response.status_code >= 500 or elapsed > 1000 or os.getenv("LOG_REQUESTS") == "1":
        logger.info(json.dumps({"event":"http_request","requestId":request_id,"path":request.url.path,"method":request.method,"status":response.status_code,"durationMs":elapsed}))
    return response
class Entity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    type: str
    country: str = Field(pattern="^[A-Z]{2}$")
    domain: Literal["government", "economy", "industry", "infrastructure", "law", "society"]
    description: str
    sourceIds: list[str]
    updatedAt: str
    region: str | None = None
    coordinates: tuple[float, float] | None = None
    attributes: dict[str, str | float] | None = None
    asOf: str | None = None
    coordinateNote: str | None = None
    @field_validator("coordinates")
    @classmethod
    def valid_coordinates(cls, value):
        if value and (not all(math.isfinite(n) for n in value) or not -180 <= value[0] <= 180 or not -90 <= value[1] <= 90):
            raise ValueError("Coordinates must be valid longitude, latitude")
        return value
def records():
    if os.getenv("DATABASE_URL"):
        from backend.database import load_entities
        return load_entities()
    return SEED["entities"]
def collection(name):
    if os.getenv("DATABASE_URL"):
        from backend.database import load_records, Relationship, Source, Dataset, IndicatorRecord, TimelineEventRecord
        model = {"relationships":Relationship,"sources":Source,"datasets":Dataset,"indicators":IndicatorRecord,"overlays":IndicatorRecord,"events":TimelineEventRecord}[name]
        values=load_records(model)
        if name=="indicators": return [r for r in values if "code" in r]
        if name=="overlays": return [r for r in values if r.get("geography")=="province"]
        return values
    if name == "indicators":
        return INDICATORS["indicators"]
    if name == "events":
        return EVENTS
    if name == "overlays":
        return PROVINCIAL_METRICS
    return SEED[name]
@app.get("/health")
def health():
    return {"status":"ok","knowledge":"postgresql" if os.getenv("DATABASE_URL") else "curated-seed","version":"0.2.0"}
@app.get("/health/ready")
def readiness():
    if os.getenv("DATABASE_URL"):
        try:
            from sqlalchemy import select, func
            from sqlalchemy.orm import Session
            from backend.database import engine, EntityRecord, CatalogRevision
            with Session(engine()) as session:
                count = session.scalar(select(func.count()).select_from(EntityRecord))
                revision = session.get(CatalogRevision, catalog_digest())
                if count < len(SEED["entities"]) or not revision:
                    raise ValueError("Catalog release has not been applied")
        except Exception:
            raise HTTPException(503, "Knowledge database is not ready or its catalog release does not match")
    return {"status":"ready","revision":catalog_digest(),"entities":len(SEED["entities"]),"regions":len(REGIONS)}
@app.get("/catalog")
def catalog():
    return {"revision":catalog_digest(),"counts":{key:len(value) for key,value in SEED.items()},"regions":len(REGIONS),"indicators":len(INDICATORS["indicators"]),"events":len(EVENTS)}
@app.get("/overlays")
def provincial_overlays(country: str = Query("ZA",pattern="^[A-Z]{2}$")):
    return [metric for metric in collection("overlays") if metric.get("country")==country]
@app.get("/municipalities")
def municipalities(country: str = Query("ZA",pattern="^[A-Z]{2}$"), level: Literal["local","district"]="local", province: str | None=None):
    if country!="ZA":return []
    return [m for m in MUNICIPALITIES if (not province or m["region"]==province) and (m["category"]!="C" if level=="local" else m["category"]!="B")]
@app.get("/entities", response_model=list[Entity], response_model_exclude_none=True)
def list_entities(country: str = Query("ZA", pattern="^[A-Z]{2}$"), domain: str | None = None, region: str | None = None):
    return [e for e in records() if e["country"] == country and (not domain or e["domain"] == domain) and (not region or e.get("region") == region)]
@app.get("/entities/{entity_id}", response_model=Entity, response_model_exclude_none=True)
def get_entity(entity_id: str):
    result = next((e for e in records() if e["id"] == entity_id), None)
    if not result:
        raise HTTPException(404, "Entity not found")
    return result
@app.get("/entities/{entity_id}/relationships")
def entity_relationships(entity_id: str):
    entity = get_entity(entity_id)
    active = {e["id"] for e in records() if e["country"] == entity["country"]}
    return [r for r in collection("relationships") if entity_id in (r["source"],r["target"]) and r["source"] in active and r["target"] in active]
@app.get("/search", response_model=list[Entity], response_model_exclude_none=True)
def search(q: str = Query(min_length=1, max_length=2000), country: str = Query("ZA", pattern="^[A-Z]{2}$")):
    words = [w for w in re.split(r"\W+",q.lower()) if len(w)>2]
    scored = [(sum(5 if w in e["name"].lower() else 1 if w in e["description"].lower() else 0 for w in words),e) for e in records() if e["country"]==country]
    return [e for score,e in sorted(scored,key=lambda x:-x[0]) if score>0][:8]
@app.get("/sources")
def sources():
    return collection("sources")
@app.get("/datasets")
def datasets(country: str = Query("ZA", pattern="^[A-Z]{2}$")):
    return [d for d in collection("datasets") if d.get("country","ZA")==country]
@app.get("/regions")
def regions(country: str = Query("ZA", pattern="^[A-Z]{2}$")):
    return [r for r in REGIONS if r["country"]==country]
@app.get("/regions/{region_id}/boundary")
def region_boundary(region_id: str, edition: Literal["legacy-2020","mdb-2026"]="legacy-2020"):
    if edition=="mdb-2026":
        municipality=next((m for m in OFFICIAL_MUNICIPALITIES if m["entityId"]==region_id),None)
        if not municipality: raise HTTPException(404,"No 2026 municipality boundary for this identifier")
        level="district" if municipality["category"]=="C" else "local"
        file=ROOT/"public/data/za-municipalities-2026"/level/(municipality["municipalityCode"]+".geojson")
        return json.loads(file.read_text(encoding="utf-8"))["features"][0]
    region = next((r for r in [*REGIONS,*MUNICIPALITIES] if r["id"]==region_id),None)
    if not region:
        raise HTTPException(404,"Region not found")
    if os.getenv("DATABASE_URL"):
        from sqlalchemy import select, func
        from sqlalchemy.orm import Session
        from backend.database import engine, Region
        with Session(engine()) as session:
            geometry = session.scalar(select(func.ST_AsGeoJSON(Region.geometry)).where(Region.id==region_id))
        if not geometry:
            raise HTTPException(404,"Region geometry is not available")
        return {"type":"Feature","geometry":json.loads(geometry),"properties":region}
    if region.get("country", "ZA") != "ZA":
        profile = next(p for p in COUNTRY_PROFILES if p["code"] == region["country"])
        for file in profile["boundary"].get("files", [profile["boundary"]["file"]]):
            data = json.loads((ROOT / "public" / file.lstrip("/")).read_text(encoding="utf-8"))
            feature = next((f for f in data["features"] if f["properties"]["entityId"] == region_id), None)
            if feature is not None:
                return feature
        raise HTTPException(404, "Reference geometry is unavailable")
    file="za-provinces.geojson" if region in REGIONS else "za-municipalities-adm"+("2" if region["category"]=="C" else "3")+".geojson"
    path = ROOT / "public" / "data" / file
    data = json.loads(path.read_text(encoding="utf-8"))
    return next(f for f in data["features"] if f["properties"]["id"]==region_id)
@app.get("/boundary-editions")
def boundary_editions():
    return {"legacy":"Historical representative 2020 geography","mdb-2026":BOUNDARY_RELEASE}
@app.get("/wards")
def ward_records(municipality: str | None=None, country: str=Query("ZA",pattern="^[A-Z]{2}$")):
    return [w for w in WARDS if country=="ZA" and w["municipalityId"]==municipality]
@app.get("/wards/{ward_id}/boundary")
def ward_boundary(ward_id: str):
    ward=next((w for w in WARDS if w["id"]==ward_id),None)
    if not ward: raise HTTPException(404,"Ward not found")
    data=json.loads((ROOT/"public/data/za-wards-2026"/(ward["municipalityCode"]+".geojson")).read_text(encoding="utf-8"))
    return next(f for f in data["features"] if f["properties"]["wardId"]==ward_id)
@app.get("/indicators")
def indicators(country: str | None = Query(None, pattern="^[A-Z]{2}$")):
    values = collection("indicators")
    return [{**i,"observations":[o for o in i["observations"] if not country or o["country"]==country]} for i in values]
@app.get("/events")
def events(country: str = Query("ZA", pattern="^[A-Z]{2}$"), through: int | None = Query(None,ge=1900,le=2100), entity: str | None = None):
    return [e for e in collection("events") if e["country"]==country and (not through or int(e["date"][:4])<=through) and (not entity or entity in e["entityIds"])]
class SemanticQuery(BaseModel):
    country: str = Field(default="ZA", pattern="^[A-Z]{2}$")
    embedding: list[float] = Field(min_length=1536,max_length=1536)
    @field_validator("embedding")
    @classmethod
    def finite_vector(cls,value):
        if not all(math.isfinite(x) for x in value):
            raise ValueError("Vector must be finite")
        return value
@app.post("/search/semantic", response_model=list[Entity], response_model_exclude_none=True)
def semantic_search(query: SemanticQuery):
    if not os.getenv("DATABASE_URL"):
        raise HTTPException(503,"Semantic search requires a database with populated embeddings")
    from backend.semantic import rank_vector
    return rank_vector(query.embedding,query.country)
