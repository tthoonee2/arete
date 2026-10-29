#!/usr/bin/env python3
"""Assemble the single-file prototype from maintainable source modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return (ROOT / name).read_text()


def build():
    app_js = read("src/app.js")
    if "// ---------- PRICING START ----------" in app_js:
        app_js = app_js.split("// ---------- PRICING END ----------", 1)[1]
    body = read("src/body.html")
    body = body.replace(
        '<a href="#price">Price</a>',
        '<a href="#price">Price</a><a href="#budget">Budget lock</a>',
        1,
    )
    body = body.replace(
        '<!-- Markets view -->',
        read("src/budget.html") + "\n<!-- Markets view -->",
        1,
    )
    javascript = "\n".join([
        read("packages/pricing/browser.js"),
        app_js,
        read("src/accessibility.js"),
        read("src/budget.js"),
    ])
    html = (
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n"
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        "<title>Arête — Name your price.</title>\n"
        '<meta name="description" content="Hedge the price of the energy, metals and food your business buys. Pick your price, we build the contract. No terminal, no jargon, no bank."\u003e\n'
        "<style>\n" + read("src/style.css") + "\n" + read("src/improvements.css") + "\n</style>\n</head>\n<body>\n"
        + body + "\n" + read("src/terrain-assets.html")
        + "\n<script>\n" + javascript + "\n</script>\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(html)
    print(f"Built index.html ({len(html.encode()):,} bytes)")


if __name__ == "__main__":
    build()
