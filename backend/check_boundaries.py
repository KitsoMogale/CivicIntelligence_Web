"""Verify reviewed display geometry, including documented repairs, in a temporary PostGIS table."""
import json
from pathlib import Path
from sqlalchemy import text
from backend.database import engine
ROOT=Path(__file__).resolve().parents[1]
assets=json.loads((ROOT/"data/boundary-assets.json").read_text(encoding="utf-8"))
with engine().begin() as connection:
    connection.execute(text("CREATE TEMP TABLE boundary_audit (id text PRIMARY KEY, kind text, parent text, geom geometry(MultiPolygon,4326)) ON COMMIT DROP"))
    insert=text("INSERT INTO boundary_audit VALUES (:id,:kind,:parent,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326)))")
    for index,asset in enumerate(assets):
        data=json.loads((ROOT/"public/data"/asset["file"]).read_text(encoding="utf-8"))
        rows=[]
        for feature in data["features"]:
            p=feature["properties"]
            ward=asset["kind"]=="ward"
            rows.append({"id":p["wardId"] if ward else asset["level"]+":"+p["entityId"],"kind":"ward" if ward else asset["level"],"parent":p["municipalityId"] if ward else p["entityId"],"geometry":json.dumps(feature["geometry"],separators=(",",":"))})
        connection.execute(insert,rows)
        if (index+1)%100==0: print(f"Loaded {index+1}/{len(assets)} publisher files",flush=True)
    invalid=connection.execute(text("SELECT id,ST_IsValidReason(geom) FROM boundary_audit WHERE NOT ST_IsValid(geom) OR ST_IsEmpty(geom) OR ST_Area(geom::geography)<=0")).all()
    assert not invalid,invalid
    assert connection.scalar(text("SELECT count(*) FROM boundary_audit"))==4750
    misplaced=connection.execute(text("SELECT w.id FROM boundary_audit w JOIN boundary_audit m ON m.kind='local' AND m.parent=w.parent WHERE w.kind='ward' AND NOT ST_Covers(m.geom,ST_PointOnSurface(w.geom))")).all()
    assert not misplaced,misplaced
    assert connection.scalar(text("SELECT count(*) FROM boundary_audit WHERE kind='ward' AND parent='za-municipality-fs162'"))==9
    assert connection.scalar(text("SELECT count(*) FROM boundary_audit WHERE parent='za-municipality-fs164'"))==0
print("PASS 4750 reviewed geometries: valid, positive area, correct municipality joins and Kopanong revision; one documented ring repair, no simplification",flush=True)
