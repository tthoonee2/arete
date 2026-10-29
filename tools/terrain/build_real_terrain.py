"""
Build the hero terrain from REAL swisstopo data (the Matterhorn), replacing the procedural bake.
UNTESTED: written without network access to swisstopo. Expect to adjust asset selection if the STAC API changes.

Data (free, open government data, attribution "© swisstopo"):
  swissALTI3D  - elevation model, 2 m  (collection ch.swisstopo.swissalti3d)
  SWISSIMAGE   - aerial photo, 2 m     (collection ch.swisstopo.swissimage-dop10)

Usage:
  pip install -r tools/terrain/requirements.txt
  python tools/terrain/build_real_terrain.py --out build/terrain
  python tools/terrain/embed_assets.py build/terrain && python tools/build.py
"""
import argparse, json, zlib, base64, io
from pathlib import Path
import numpy as np, requests, rasterio
from rasterio.merge import merge
from rasterio.enums import Resampling
from scipy import ndimage
from PIL import Image

STAC = "https://data.geo.admin.ch/api/stac/v0.9/collections/{c}/items"
SUMMIT_LV95 = (2617470, 1091690)          # Matterhorn summit, Swiss LV95 (E, N)
HALF = 5000                                 # metres either side -> 10 x 10 km

def lv95_to_wgs84(e, n):                    # swisstopo approximate formulas
    y, x = (e - 2600000) / 1e6, (n - 1200000) / 1e6
    lon = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y ** 3
    lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x ** 3
    return lon * 100 / 36, lat * 100 / 36

def items(collection, bbox):
    url, params, out = STAC.format(c=collection), {"bbox": ",".join(map(str, bbox)), "limit": 100}, []
    while url:
        r = requests.get(url, params=params, timeout=60); r.raise_for_status(); j = r.json()
        out += j["features"]; nxt = [l for l in j.get("links", []) if l.get("rel") == "next"]
        url, params = (nxt[0]["href"], None) if nxt else (None, None)
    return out

def pick(item, gsd):
    for a in item["assets"].values():
        if a.get("type", "").startswith("image/tiff") and abs(float(a.get("eo:gsd", a.get("gsd", 0))) - gsd) < 1e-6:
            return a["href"]

def mosaic(collection, gsd, cache):
    e0, n0 = SUMMIT_LV95; lo = lv95_to_wgs84(e0 - HALF, n0 - HALF); hi = lv95_to_wgs84(e0 + HALF, n0 + HALF)
    files = []
    for it in items(collection, (lo[0], lo[1], hi[0], hi[1])):
        href = pick(it, gsd)
        if not href: continue
        f = cache / href.split("/")[-1]
        if not f.exists(): f.write_bytes(requests.get(href, timeout=300).content)
        files.append(rasterio.open(f))
    arr, tr = merge(files, bounds=(e0 - HALF, n0 - HALF, e0 + HALF, n0 + HALF), res=gsd)
    return arr

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="build/terrain"); a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True); cache = out / "cache"; cache.mkdir(exist_ok=True)
    dem = mosaic("ch.swisstopo.swissalti3d", 2.0, cache)[0].astype(float)          # rows north->south
    ortho = mosaic("ch.swisstopo.swissimage-dop10", 2.0, cache)[:3].transpose(1, 2, 0)
    dem[dem < -100] = np.nan; dem = np.where(np.isnan(dem), np.nanmin(dem), dem)
    N, S = 1024, 2 * HALF
    h = ndimage.zoom(dem, N / dem.shape[0], order=1)[:N, :N]
    base = h.min(); h -= base; hmax = float(h.max())                                 # site expects metres above the lowest point
    q = np.round(h / hmax * 65535).astype("<u2")
    json.dump({"n": N, "size": S, "hmax": hmax, "b64": base64.b64encode(zlib.compress(q.tobytes(), 9)).decode()}, open(out / "height.json", "w"))
    M = 2048; up = ndimage.zoom(dem, M / dem.shape[0], order=3)[:M, :M]; c = S / (M - 1)
    gz, gx = np.gradient(up, c); n = np.dstack([-gx, np.ones_like(up), -gz]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save(out / "normal.jpg", quality=88)
    Image.fromarray(ortho.astype(np.uint8)).resize((M, M), Image.LANCZOS).save(out / "albedo.jpg", quality=88)
    d = np.random.default_rng(1).random((512, 512)); d = ndimage.gaussian_filter(d, 2, mode="wrap"); d = (d - d.min()) / np.ptp(d)
    Image.fromarray((d * 255).astype(np.uint8)).save(out / "detail.jpg", quality=85)
    print("done:", out, "max height above base", round(hmax), "m")
    print("Note: the aerial photo already contains real shadows; consider lowering the sun intensity in src/app.js.")

if __name__ == "__main__":
    main()
