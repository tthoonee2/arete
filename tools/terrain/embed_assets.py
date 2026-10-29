"""Pack baked terrain files (height.json, albedo.jpg, normal.jpg, detail.jpg) into src/terrain-assets.html.
Usage: python tools/terrain/embed_assets.py <dir-with-baked-files>   then: python tools/build.py"""
import base64, json, sys
from pathlib import Path
d = Path(sys.argv[1] if len(sys.argv) > 1 else "."); root = Path(__file__).resolve().parents[2]
b64 = lambda f: "data:image/jpeg;base64," + base64.b64encode((d / f).read_bytes()).decode()
A = {"h": json.loads((d / "height.json").read_text()), "albedo": b64("albedo.jpg"), "normal": b64("normal.jpg"), "detail": b64("detail.jpg")}
(root / "src" / "terrain-assets.html").write_text("<script>const PK_ASSETS = " + json.dumps(A) + ";</script>")
print("src/terrain-assets.html updated")
