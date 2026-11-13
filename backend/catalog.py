"""Versioned repository data shared by the seed loader and read-only API."""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def read_data(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8-sig"))
SEED = read_data("knowledge.json")
REGIONS = read_data("regions.json")
INDICATORS = read_data("indicators.json")
EVENTS = read_data("events.json")
MUNICIPALITIES = read_data("municipal-geography.json")
PROVINCIAL_METRICS = read_data("provincial-indicators.json")["metrics"]
def catalog_digest():
    digest = hashlib.sha256()
    for name in sorted(read_data("release.json")["files"]):
        digest.update(name.encode())
        digest.update(b"\x00")
        digest.update((ROOT / "data" / name).read_bytes())
        digest.update(b"\x00")
    return digest.hexdigest()
