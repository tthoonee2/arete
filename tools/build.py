"""Assemble index.html from src/. Usage: python tools/build.py"""
from pathlib import Path
root = Path(__file__).resolve().parents[1]; src = root / "src"
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Arête — Price certainty for the real economy</title>
<meta name="description" content="Commodity price protection for businesses: caps, floors and collars on exchange benchmarks, settled in cash every month.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600&family=Instrument+Serif&display=swap">
<style>
"""
js = (src / "app.js").read_text()
assert "</script>" not in js, "escape </script> inside app.js as <\\/script>"
html = (head + (src / "style.css").read_text() + "\n</style>\n</head>\n<body>\n" + (src / "body.html").read_text() + "\n"
        + (src / "terrain-assets.html").read_text() + "\n"
        + '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>' + js + "</script>\n</body>\n</html>\n")
(root / "index.html").write_text(html)
print(f"index.html written, {len(html) // 1024} KB")
