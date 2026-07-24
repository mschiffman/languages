from pathlib import Path

for p in Path(".").rglob("marche-me.html"):
    print(p)