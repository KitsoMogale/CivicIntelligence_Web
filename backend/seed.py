"""Apply the reviewed repository catalog transactionally. Existing extra records are not deleted."""
import json
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.database import engine, Country, Region, KnowledgeDomain, Source, EntityRecord, Relationship, Dataset, IndicatorRecord, TimelineEventRecord, CatalogRevision
from backend.catalog import ROOT, SEED, REGIONS, INDICATORS, EVENTS, PROVINCIAL_METRICS, MUNICIPALITIES, COUNTRIES, catalog_digest
def geometry(record):
    return func.ST_Multi(func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(record)),4326))
def main():
    with Session(engine()) as session:
        geography = ROOT / "public" / "data" / "countries.geojson"
        if geography.exists():
            country_shapes = {}
            for feature in json.loads(geography.read_text(encoding="utf-8"))["features"]:
                p = feature["properties"]
                if len(p["code"])==2 and p["code"].isalpha():
                    g = feature["geometry"]
                    country_shapes.setdefault(p["code"], []).extend(g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])
            for country in COUNTRIES:
                if country["code"] in country_shapes:
                    session.merge(Country(code=country["code"],name=country["name"],continent=country["continent"],boundary=geometry({"type":"MultiPolygon","coordinates":country_shapes[country["code"]]})))
        else:
            session.merge(Country(code="ZA",name="South Africa",continent="Africa"))
        for id,name in [("government","Government & politics"),("economy","Economy & finance"),("industry","Industries & businesses"),("infrastructure","Infrastructure & systems"),("law","Law & justice"),("society","People & society")]:
            session.merge(KnowledgeDomain(id=id,name=name))
        session.flush()
        path = ROOT / "public" / "data" / "za-provinces.geojson"
        boundaries = {f["properties"]["id"]:f["geometry"] for f in json.loads(path.read_text(encoding="utf-8"))["features"]}
        world_boundaries = {}
        for region in REGIONS:
            if region["country"] == "ZA":
                shape = boundaries[region["id"]]
            else:
                country_code = region["country"]
                if country_code not in world_boundaries:
                    geo = json.loads((ROOT / "public/data/world" / (country_code + ".geojson")).read_text(encoding="utf-8"))
                    world_boundaries[country_code] = {f["properties"]["entityId"]: f["geometry"] for f in geo["features"]}
                shape = world_boundaries[country_code][region["entityId"]]
            session.merge(Region(id=region["id"],country=region["country"],name=region["name"],kind="province" if region["country"] == "ZA" else "reference-area",geometry=geometry(shape)))
        session.flush()
        for record in SEED["sources"]:
            session.merge(Source(id=record["id"],record=record))
        for record in SEED["entities"]:
            session.merge(EntityRecord(id=record["id"],country=record["country"],domain=record["domain"],region=record.get("region"),record=record))
        session.flush()
        for record in SEED["relationships"]:
            session.merge(Relationship(id=record["id"],source=record["source"],target=record["target"],record=record))
        for record in SEED["datasets"]:
            session.merge(Dataset(id=record["id"],country=record.get("country","ZA"),record=record))
        for record in INDICATORS["indicators"]:
            session.merge(IndicatorRecord(code=record["code"],record=record))
        for record in PROVINCIAL_METRICS:
            session.merge(IndicatorRecord(code=record["id"],record=record))
        municipal_shapes={}
        for level in (2,3):
            geo=json.loads((ROOT / "public/data" / ("za-municipalities-adm"+str(level)+".geojson")).read_text(encoding="utf-8"))
            for feature in geo["features"]:
                municipal_shapes[feature["properties"]["entityId"]]=feature["geometry"]
        for municipality in MUNICIPALITIES:
            session.merge(Region(id=municipality["entityId"],country="ZA",parent_id=municipality["region"],name=municipality["name"],kind="municipality",geometry=geometry(municipal_shapes[municipality["entityId"]])))
        for record in EVENTS:
            session.merge(TimelineEventRecord(id=record["id"],country=record["country"],record=record))
        digest = catalog_digest()
        if not session.get(CatalogRevision,digest):
            session.add(CatalogRevision(digest=digest,summary={**{key:len(value) for key,value in SEED.items()},"regions":len(REGIONS),"events":len(EVENTS),"indicators":len(INDICATORS["indicators"]),"municipalities":len(MUNICIPALITIES),"provincialIndicators":len(PROVINCIAL_METRICS)}))
        session.commit()
    print("Applied reviewed catalog revision " + digest)
if __name__=="__main__":
    main()
