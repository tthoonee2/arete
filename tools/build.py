"""Assemble the deployable single-file site from source modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

HEAD = """<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Arête — Keep commodity costs within budget</title>
<meta name="description" content="Set a maximum price for the energy, metals or food your business buys. Get an indicative quote in under a minute.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23111110'/%3E%3Cpath d='M10 47 26 17l8 13 7-10 13 27' fill='none' stroke='%23f4f3ef' stroke-width='4' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<style>
"""


def read(path: str) -> str:
    return (ROOT / path).read_text()


def script(source: str) -> str:
    assert "</script>" not in source, "escape </script> inside JavaScript as <\\/script>"
    return source


app_js = read("src/app.js")
# The original monolith is retained as a readable legacy source during migration;
# the built app executes only the shared package, never a second pricing copy.
if "// ---------- PRICING START ----------" in app_js:
    app_js = app_js.split("// ---------- PRICING END ----------", 1)[1]

body = read("src/body.html")
body = body.replace(
    '<a href="#price">Price</a>',
    '<a href="#price">Price</a><a href="#budget">Budget lock</a>',
)
body = body.replace(
    '<section class="view" data-view="markets" id="markets" hidden>',
    read("src/budget.html") + '\n<section class="view" data-view="markets" id="markets" hidden>',
    1,
)

styles = read("src/style.css") + "\n" + read("src/improvements.css")
javascript = "\n".join([
    read("packages/pricing/browser.js"),
    app_js,
    read("src/accessibility.js"),
    read("src/budget.js"),
])
html = (
    HEAD + styles + "\n</style>\n</head>\n<body>\n" + body + "\n"
    + read("src/terrain-assets.html") + "\n"
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>'
    + script(javascript) + "</script>\n</body>\n</html>\n"
)
(ROOT / "index.html").write_text(html)
print(f"index.html written, {len(html) // 1024} KB")

