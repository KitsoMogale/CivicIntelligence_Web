from fastapi.testclient import TestClient
from backend.main import app, SEED, Entity
client = TestClient(app)
def test_seed_validity():
    ids = {e["id"] for e in SEED["entities"]}
    source_ids = {s["id"] for s in SEED["sources"]}
    for entity in SEED["entities"]:
        Entity.model_validate(entity)
        assert set(entity["sourceIds"]) <= source_ids
    for link in SEED["relationships"]:
        assert link["source"] in ids and link["target"] in ids
        assert set(link["sourceIds"]) <= source_ids
def test_country_coverage():
    assert client.get("/entities?country=BW").json() == []
    assert client.get("/datasets?country=BW").json() == []
def test_search_and_relationships():
    response = client.get("/search?q=transmission")
    assert response.status_code == 200
    assert any(e["id"] == "za-transmission" for e in response.json())
    assert client.get("/entities/za-parliament/relationships").status_code == 200
def test_unknown_entities_and_validation():
    assert client.get("/entities/unknown").status_code == 404
    assert client.get("/search?q=").status_code == 422
    assert client.get("/entities?country=invalid").status_code == 422

def test_model_metadata():
    from backend.database import Base
    assert {"entities", "relationships", "sources", "regions", "countries", "datasets", "raw_documents", "knowledge_domains"} <= set(Base.metadata.tables)

def test_semantic_request_validation():
    assert client.post("/search/semantic",json={"embedding":[1,2]}).status_code == 422
    assert client.post("/search/semantic",json={"embedding":[1.0]*1536}).status_code == 503
def test_embedding_generation_contract(monkeypatch):
    from backend.semantic import generate_embeddings
    monkeypatch.setenv("OPENAI_API_KEY","unit-test-key")
    class Response:
        def raise_for_status(self): pass
        def json(self): return {"data":[{"index":0,"embedding":[0.1]*1536}]}
    class Client:
        def post(self,url,headers,json):
            assert json["dimensions"] == 1536
            assert len(json["input"]) == 1
            return Response()
    assert len(generate_embeddings(["A public seed record"],Client())[0]) == 1536

def test_directory_and_source_linked_details():
    response = client.get("/entities?country=ZA&region=mpumalanga")
    assert response.status_code == 200
    assert any(e["id"] == "za-belfast-mine" for e in response.json())
    municipalities = [e for e in client.get("/entities").json() if "municipality" in e["type"].lower()]
    assert len(municipalities) == 257
    link = next(r for r in client.get("/entities/za-exxaro-resources/relationships").json() if r["target"] == "za-mafube-mine")
    assert link["ownershipPercent"] == 50 and link["asOf"] == "2025-12-31"

def test_regions_and_provincial_geometry():
    assert len(client.get("/regions").json()) == 9
    assert client.get("/regions?country=BW").json() == []
    feature = client.get("/regions/north-west/boundary")
    assert feature.status_code == 200
    assert feature.json()["geometry"]["type"] in ("Polygon", "MultiPolygon")
    assert client.get("/regions/missing/boundary").status_code == 404

def test_indicators_have_same_years_and_missing_countries_are_empty():
    values = client.get("/indicators?country=BW").json()
    assert len(values) >= 2
    assert all(o["country"] == "BW" for indicator in values for o in indicator["observations"])
    assert all(len(indicator["observations"]) == 11 for indicator in values)
    assert all(not indicator["observations"] for indicator in client.get("/indicators?country=FR").json())

def test_history_and_catalog_readiness():
    events = client.get("/events?through=2020&entity=za-belfast-mine").json()
    assert len(events) == 1 and events[0]["date"] == "2019"
    assert client.get("/events?country=BW").json() == []
    assert client.get("/health/ready").status_code == 200
    from backend.catalog import catalog_digest
    assert client.get("/catalog").json()["revision"] == catalog_digest()
    assert client.get("/health").headers.get("x-request-id")

def test_municipal_levels_and_historical_geometry():
    assert len(client.get("/municipalities").json()) == 213
    assert len(client.get("/municipalities?level=district").json()) == 52
    assert client.get("/municipalities?country=BW").json() == []
    feature=client.get("/regions/za-municipality-cpt/boundary")
    assert feature.status_code == 200
    assert feature.json()["properties"]["boundaryVintage"] == "2020"

def test_provincial_overlays_remain_separate_from_national_indicators():
    values=client.get("/overlays").json()
    assert len(values) == 6
    assert all(len(metric["observations"])==9 for metric in values)
    assert client.get("/overlays?country=BW").json() == []
    assert all("code" in metric for metric in client.get("/indicators").json())

def test_official_edition_retains_source_geometry_and_revised_wards():
    editions=client.get("/boundary-editions").json()
    assert editions["mdb-2026"]["counts"]["wards"]==4485
    boundary=client.get("/regions/za-municipality-cpt/boundary?edition=mdb-2026")
    assert boundary.status_code==200
    assert boundary.json()["properties"]["boundaryVintage"]=="2026"
    assert boundary.json()["properties"]["CATEGORY"]=="A"
    wards=client.get("/wards?municipality=za-municipality-fs162").json()
    assert len(wards)==9
    ward=next(w for w in wards if w["number"]==9)
    feature=client.get("/wards/"+ward["id"]+"/boundary")
    assert feature.status_code==200
    assert feature.json()["properties"]["WardID"]==ward["id"].replace("ward-","")
    assert client.get("/wards?municipality=za-municipality-fs164").json()==[]
    assert client.get("/wards?country=BW&municipality=za-municipality-fs162").json()==[]
    assert client.get("/wards/missing/boundary").status_code==404
