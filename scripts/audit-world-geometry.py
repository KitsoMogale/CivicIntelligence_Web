"""Independent topology audit. Requires Shapely; never modifies geometry."""
import json
from pathlib import Path
from shapely.geometry import shape

assets = json.loads(Path("data/world-assets.json").read_text(encoding="utf-8"))
count = 0
for asset in assets:
    if not asset.get("country"):
        continue
    collection = json.loads((Path("public/data") / asset["file"]).read_text(encoding="utf-8"))
    for feature in collection["features"]:
        geometry = shape(feature["geometry"])
        assert not geometry.is_empty and geometry.is_valid and geometry.area > 0, feature["properties"]["entityId"]
        count += 1
print(f"PASS {count} reference polygons: valid, nonempty and positive area")
