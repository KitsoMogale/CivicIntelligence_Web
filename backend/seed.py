"""Apply the reviewed repository catalog transactionally. Existing extra records are not deleted."""
import json
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.database import engine, Country, Region, KnowledgeDomain, Source, EntityRecord, Relationship, Dataset, IndicatorRecord, TimelineEventRecord, CatalogRevision
from backend.catalog import ROOT, SEED, REGIONS, INDICATORS, EVENTS, PROVINCIAL_METRICS, MUNICIPALITIES, catalog_digest
def geometry(record):
    return func.ST_Multi(func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(record)),4326))
def main():
    with Session(engine()) as session:
        geography = ROOT / "public" / "data" / "countries.geojson"
        if geography.exists():
            for feature in json.loads(geography.read_text(encoding="utf-8"))["features"]:
                p = feature["properties"]
                if len(p["code"])==2 and p["code"].isalpha():
                    session.merge(Country(code=p["code"],name=p["name"],continent=p["continent"],boundary=geometry(feature["geometry"])))
        else:
            session.merge(Country(code="ZA",name="South Africa",continent="Africa"))
        for id,name in [("government","Government & politics"),("economy","Economy & finance"),("industry","Industries & businesses"),("infrastructure","Infrastructure & systems"),("law","Law & justice"),("society","People & society")]:
            session.merge(KnowledgeDomain(id=id,name=name))
        session.flush()
        path = ROOT / "public" / "data" / "za-provinces.geojson"
        boundaries = {f["properties"]["id"]:f["geometry"] for f in json.loads(path.read_text(encoding="utf-8"))["features"]}
        for region in REGIONS:
            session.merge(Region(id=region["id"],country=region["country"],name=region["name"],kind="province",geometry=geometry(boundaries[region["id"]])))
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
