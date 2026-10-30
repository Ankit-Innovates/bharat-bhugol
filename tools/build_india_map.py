"""Build public/india-map.json for the India game.

Turns the India states GeoJSON from https://github.com/datta07/INDIAN-SHAPEFILES (MIT licence)
into one small JSON file with the current 28 states and 8 union territories as SVG paths.

Usage:
    pip install -r tools/requirements.txt
    python tools/build_india_map.py tools/source/INDIA_STATES.geojson public/india-map.json
"""

import argparse
import json
import math

import numpy as np
import shapely
from shapely.geometry import LineString, MultiPolygon, Polygon, shape
from shapely.ops import polylabel, unary_union

# Source name -> (current name, "state" or "ut").
REGIONS = {
    "ANDHRA PRADESH": ("Andhra Pradesh", "state"),
    "ARUNACHAL PRADESH": ("Arunachal Pradesh", "state"),
    "ASSAM": ("Assam", "state"),
    "BIHAR": ("Bihar", "state"),
    "CHHATTISGARH": ("Chhattisgarh", "state"),
    "GOA": ("Goa", "state"),
    "GUJARAT": ("Gujarat", "state"),
    "HARYANA": ("Haryana", "state"),
    "HIMACHAL PRADESH": ("Himachal Pradesh", "state"),
    "JHARKHAND": ("Jharkhand", "state"),
    "KARNATAKA": ("Karnataka", "state"),
    "KERALA": ("Kerala", "state"),
    "MADHYA PRADESH": ("Madhya Pradesh", "state"),
    "MAHARASHTRA": ("Maharashtra", "state"),
    "MANIPUR": ("Manipur", "state"),
    "MEGHALAYA": ("Meghalaya", "state"),
    "MIZORAM": ("Mizoram", "state"),
    "NAGALAND": ("Nagaland", "state"),
    "ODISHA": ("Odisha", "state"),
    "PUNJAB": ("Punjab", "state"),
    "RAJASTHAN": ("Rajasthan", "state"),
    "SIKKIM": ("Sikkim", "state"),
    "TAMIL NADU": ("Tamil Nadu", "state"),
    "TELANGANA": ("Telangana", "state"),
    "TRIPURA": ("Tripura", "state"),
    "UTTAR PRADESH": ("Uttar Pradesh", "state"),
    "UTTARAKHAND": ("Uttarakhand", "state"),
    "WEST BENGAL": ("West Bengal", "state"),
    "ANDAMAN & NICOBAR": ("Andaman and Nicobar Islands", "ut"),
    "CHANDIGARH": ("Chandigarh", "ut"),
    # Merged into one union territory on 26 January 2020.
    "DADRA & NAGAR HAVELI": ("Dadra and Nagar Haveli and Daman and Diu", "ut"),
    "DAMAN & DIU": ("Dadra and Nagar Haveli and Daman and Diu", "ut"),
    "DELHI": ("Delhi", "ut"),
    "JAMMU & KASHMIR": ("Jammu and Kashmir", "ut"),
    "LADAKH": ("Ladakh", "ut"),
    "LAKSHADWEEP": ("Lakshadweep", "ut"),
    "PUDUCHERRY": ("Puducherry", "ut"),
}

# Extra spellings accepted in Type mode: old names, short forms people use, and common
# misspellings. The game ignores case, spaces and punctuation before comparing. No spelling may
# start another region's spelling, or that region could never be typed.
ALIASES = {
    "Andaman and Nicobar Islands": ["andaman and nicobar", "andaman nicobar"],
    "Chhattisgarh": ["chattisgarh", "chhatisgarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["dadra and nagar haveli", "daman and diu"],
    "Delhi": ["new delhi", "nct of delhi", "national capital territory of delhi"],
    "Jammu and Kashmir": ["jammu kashmir"],
    "Lakshadweep": ["lakshadeep"],
    "Odisha": ["orissa"],
    "Puducherry": ["pondicherry"],
    "Telangana": ["telengana"],
    "Uttarakhand": ["uttaranchal"],
}

# Shorter labels for the map itself, where the full name would cover its neighbours.
SHORT = {
    "Andaman and Nicobar Islands": "Andaman & Nicobar",
    "Dadra and Nagar Haveli and Daman and Diu": "DNH & DD",
    "Jammu and Kashmir": "Jammu & Kashmir",
}

# Latitude and longitude lines (degrees) drawn as an atlas-style grid on the home page.
PARALLELS = [10, 15, 20, 25, 30, 35]
MERIDIANS = [70, 75, 80, 85, 90, 95]

# Lambert conformal conic with the standard parallels of Survey of India maps.
LAT1, LAT2 = 12.472944, 35.172806
LAT0, LON0 = 24.0, 80.0

WIDTH = 1000.0      # output box width in SVG units
PAD = 14.0          # margin inside the box
SIMPLIFY = 0.7      # border simplification tolerance in SVG units
FINE = 0.25         # finer tolerance for small regions
SMALL_AREA = 1000.0 # regions smaller than this (SVG units²) get a click ring in the game
GROW = 0.6          # small regions are grown this much so they stay visible
MERGE_EPS = 0.35    # closes hairline gaps when merging regions (SVG units)


def lambert(lon, lat):
    """Spherical Lambert conformal conic; lon and lat in degrees, as numpy arrays."""
    p1, p2, p0 = (math.radians(v) for v in (LAT1, LAT2, LAT0))
    t = lambda p: np.tan(np.pi / 4 + p / 2)  # noqa: E731
    n = math.log(math.cos(p1) / math.cos(p2)) / math.log(t(p2) / t(p1))
    f = math.cos(p1) * t(p1) ** n / n
    rho = f / t(np.radians(lat)) ** n
    theta = n * np.radians(lon - LON0)
    return rho * np.sin(theta), f / t(p0) ** n - rho * np.cos(theta)


def load_regions(path):
    with open(path, encoding="utf-8") as f:
        src = json.load(f)
    parts = {}
    for feat in src["features"]:
        source_name = feat["properties"]["STNAME"]
        if source_name not in REGIONS:
            raise SystemExit(f"Unknown region in source: {source_name}")
        name, kind = REGIONS[source_name]
        parts.setdefault((name, kind), []).append(shape(feat["geometry"]).buffer(0))
    found = {source for f in src["features"] for source in [f["properties"]["STNAME"]]}
    missing = set(REGIONS) - found
    if missing:
        raise SystemExit(f"Regions missing from source: {sorted(missing)}")
    return {key: unary_union(geoms).buffer(0) for key, geoms in parts.items()}


def project_all(geoms):
    """Project to Lambert, then fit to WIDTH with y pointing down, as in SVG.

    Returns the projected shapes, the box height, and the projection itself (lon/lat -> x/y).
    """
    def raw(coords):
        x, y = lambert(coords[:, 0], coords[:, 1])
        return np.column_stack([x, y])

    projected = {key: shapely.transform(g, raw) for key, g in geoms.items()}
    minx, miny, maxx, maxy = unary_union(list(projected.values())).bounds
    scale = (WIDTH - 2 * PAD) / (maxx - minx)
    height = round((maxy - miny) * scale + 2 * PAD, 1)

    def fit(coords):
        return np.column_stack([PAD + (coords[:, 0] - minx) * scale, PAD + (maxy - coords[:, 1]) * scale])

    def project(lonlat):
        return fit(raw(np.asarray(lonlat, dtype=float)))

    return {key: shapely.transform(g, fit) for key, g in projected.items()}, height, project


def graticule(project, height):
    """Parallels and meridians every 5 degrees, clipped to the box, with a label point each."""
    box = shapely.box(0, 0, WIDTH, height)
    lines = []
    for lat in PARALLELS:
        pts = project([(lon, lat) for lon in np.arange(60, 105.1, 0.5)])
        lines.append((f"{lat}°N", LineString(pts).intersection(box), "left"))
    for lon in MERIDIANS:
        pts = project([(lon, lat) for lat in np.arange(0, 42.1, 0.5)])
        lines.append((f"{lon}°E", LineString(pts).intersection(box), "bottom"))
    out = []
    for label, line, edge in lines:
        if line.is_empty:
            continue
        coords = list(line.coords)
        end = min(coords, key=lambda c: c[0]) if edge == "left" else max(coords, key=lambda c: c[1])
        d = "M" + "L".join(f"{num(round(x, 1))} {num(round(y, 1))}" for x, y in coords[::2] + [coords[-1]])
        out.append({"label": label, "d": d, "x": round(end[0], 1), "y": round(end[1], 1)})
    return out


def num(v):
    """Short number text: 0.5 -> .5, -0.5 -> -.5, 3.0 -> 3."""
    s = f"{v:.1f}"
    if s.endswith(".0"):
        s = s[:-2]
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return "0" if s == "-0" else s


def svg_path(g, tolerance, min_area):
    """Simplify and write as a compact SVG path with relative coordinates."""
    g = g.simplify(tolerance, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(g.geoms)
    out = []
    for p in polys:
        if p.area < min_area:
            continue
        for ring in [p.exterior, *p.interiors]:
            pts = [(round(x, 1), round(y, 1)) for x, y in list(ring.coords)[:-1]]
            if len(pts) < 3:
                continue
            x0, y0 = pts[0]
            d = f"M{num(x0)} {num(y0)}l"
            px, py = x0, y0
            for i, (x, y) in enumerate(pts[1:]):
                dx, dy = round(x - px, 1), round(y - py, 1)
                px, py = round(px + dx, 1), round(py + dy, 1)
                sx, sy = num(dx), num(dy)
                seg = sx + ("" if sy.startswith("-") else " ") + sy
                d += ("" if i == 0 or seg.startswith("-") else " ") + seg
            out.append(d + "z")
    return "".join(out)


def label_point(g):
    """A point well inside the region (largest part), for names, ? markers and click rings."""
    if isinstance(g, MultiPolygon):
        g = max(g.geoms, key=lambda p: p.area)
    pt = polylabel(g, tolerance=0.1)
    return round(pt.x, 1), round(pt.y, 1)


def merge(parts):
    return unary_union([p.buffer(MERGE_EPS) for p in parts]).buffer(-MERGE_EPS)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("states", help="INDIA_STATES.geojson")
    ap.add_argument("out", help="output path, e.g. public/india-map.json")
    args = ap.parse_args()

    screen, height, project = project_all(load_regions(args.states))

    # Small regions are grown so they stay visible; their neighbours give way, so nothing overlaps.
    grown = {key: g.buffer(GROW) for key, g in screen.items() if g.area < SMALL_AREA}
    taken = unary_union(list(grown.values()))
    shapes = {key: grown[key] if key in grown else g.difference(taken) for key, g in screen.items()}

    regions = []
    for (name, kind), g in sorted(shapes.items()):
        small = (name, kind) in grown
        d = svg_path(g, FINE if small else SIMPLIFY, 0.2 if small else 4)
        lx, ly = label_point(g)
        region = {"name": name, "kind": kind, "d": d, "lx": lx, "ly": ly, "alt": ALIASES.get(name, [])}
        if name in SHORT:
            region["short"] = SHORT[name]
        if small:
            region["small"] = True
        regions.append(region)
        print(f"{name:42} {kind:5} area {g.area:9.1f}{'  small' if small else ''}")

    data = {
        "w": WIDTH,
        "h": height,
        "outline": svg_path(merge(screen.values()), SIMPLIFY, 4),
        "regions": regions,
        "graticule": graticule(project, height),
        "credit": "Boundaries: datta07/INDIAN-SHAPEFILES (MIT), updated to 28 states and 8 union "
        "territories. Simplified; not an official map.",
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    states = sum(r["kind"] == "state" for r in regions)
    print(f"Wrote {args.out}: {states} states, {len(regions) - states} union territories, h={height}")


if __name__ == "__main__":
    main()
