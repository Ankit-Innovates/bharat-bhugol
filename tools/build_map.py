"""Build public/mp-map.json for MP Map Quiz.

Turns the Madhya Pradesh district + tehsil GeoJSON from
https://github.com/datta07/INDIAN-SHAPEFILES (MIT licence, 2011-census base, 52 districts)
into one small JSON file with the current 55 districts and 10 divisions as SVG paths.

Usage:
    pip install shapely
    python build_map.py \
        "source/MADHYA PRADESH_DISTRICTS.geojson" \
        "source/MADHYA PRADESH_SUBDISTRICTS.geojson" \
        ../public/mp-map.json
"""

import argparse
import json
import math

import shapely
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import polylabel, unary_union

# Current divisions and their districts (55 in total).
DIVISIONS = {
    "Bhopal": ["Bhopal", "Raisen", "Rajgarh", "Sehore", "Vidisha"],
    "Chambal": ["Bhind", "Morena", "Sheopur"],
    "Gwalior": ["Ashoknagar", "Datia", "Guna", "Gwalior", "Shivpuri"],
    "Indore": ["Alirajpur", "Barwani", "Burhanpur", "Dhar", "Indore", "Jhabua", "Khandwa", "Khargone"],
    "Jabalpur": ["Balaghat", "Chhindwara", "Dindori", "Jabalpur", "Katni", "Mandla", "Narsinghpur", "Pandhurna", "Seoni"],
    "Narmadapuram": ["Betul", "Harda", "Narmadapuram"],
    "Rewa": ["Maihar", "Mauganj", "Rewa", "Satna", "Sidhi", "Singrauli"],
    "Sagar": ["Chhatarpur", "Damoh", "Niwari", "Panna", "Sagar", "Tikamgarh"],
    "Shahdol": ["Anuppur", "Shahdol", "Umaria"],
    "Ujjain": ["Agar Malwa", "Dewas", "Mandsaur", "Neemuch", "Ratlam", "Shajapur", "Ujjain"],
}
DISTRICT_TO_DIVISION = {d: v for v, ds in DIVISIONS.items() for d in ds}

# Names in the 2011-base source -> current names.
RENAMES = {"Hoshangabad": "Narmadapuram", "Narsimhapur": "Narsinghpur"}

# Districts created in 2023, built from their tehsils (names as spelled in the source).
SPLITS = {
    "Maihar": ("Satna", ["Maihar", "Amarpatan", "Ramnagar"]),
    "Mauganj": ("Rewa", ["Mauganj", "Hanumana", "Naigarhi"]),
    "Pandhurna": ("Chhindwara", ["Pandhurna", "Sausar"]),
}

# Extra spellings accepted in Type mode. The game ignores case, spaces and punctuation
# before comparing, so only genuinely different spellings are listed.
ALIASES = {
    "Narmadapuram": ["hoshangabad"],
    "Narsinghpur": ["narsimhapur"],
    "Khargone": ["west nimar"],
    "Khandwa": ["east nimar"],
    "Agar Malwa": ["agar"],
    "Barwani": ["badwani"],
    "Chhatarpur": ["chatarpur"],
    "Chhindwara": ["chindwara"],
    "Mandsaur": ["mandsour"],
    "Neemuch": ["nimach"],
    "Pandhurna": ["pandurna"],
}
DIVISION_ALIASES = {"Narmadapuram": ["hoshangabad"]}

WIDTH = 1000.0      # output box width in SVG units
PAD = 14.0          # margin inside the box
SIMPLIFY = 0.7      # border simplification tolerance in SVG units
MERGE_EPS = 0.35    # closes hairline gaps when merging regions (SVG units)


def largest_parts(g, keep_ratio=0.02):
    """Drop slivers left by a split: keep parts at least 2% the size of the largest."""
    polys = [g] if isinstance(g, Polygon) else list(g.geoms)
    biggest = max(p.area for p in polys)
    keep = [p for p in polys if p.area >= biggest * keep_ratio]
    return keep[0] if len(keep) == 1 else MultiPolygon(keep)


def load_districts(districts_path, tehsils_path):
    with open(districts_path, encoding="utf-8") as f:
        src = json.load(f)
    geoms = {}
    for feat in src["features"]:
        name = feat["properties"]["dtname"]
        geoms[RENAMES.get(name, name)] = shape(feat["geometry"]).buffer(0)

    with open(tehsils_path, encoding="utf-8") as f:
        sub = json.load(f)
    tehsils = {}
    for feat in sub["features"]:
        p = feat["properties"]
        tehsils.setdefault(p["dtname"], {})[p["sdtname"]] = shape(feat["geometry"]).buffer(0)

    for new, (parent, names) in SPLITS.items():
        parent_tehsils = tehsils[parent]
        missing = [n for n in names if n not in parent_tehsils]
        if missing:
            raise SystemExit(f"{parent}: tehsils not found in source: {missing}")
        # Everything in the parent that is NOT one of the rest-of-parent tehsils becomes the new district.
        rest = unary_union([g for n, g in parent_tehsils.items() if n not in names]).buffer(0.003).buffer(-0.003)
        whole = geoms[parent]
        new_geom = largest_parts(whole.difference(rest).buffer(0))
        geoms[new] = new_geom
        geoms[parent] = largest_parts(whole.difference(new_geom).buffer(0))
        print(f"{new}: {new_geom.area / whole.area:.1%} of 2011 {parent}")

    unknown = set(geoms) - set(DISTRICT_TO_DIVISION)
    absent = set(DISTRICT_TO_DIVISION) - set(geoms)
    if unknown or absent:
        raise SystemExit(f"District list mismatch. Not mapped: {sorted(unknown)}; not found: {sorted(absent)}")
    return geoms


def make_projection(geoms):
    """Equirectangular, x scaled by cos(mid latitude), fitted to WIDTH."""
    minx, miny, maxx, maxy = unary_union(list(geoms.values())).bounds
    k = math.cos(math.radians((miny + maxy) / 2))
    scale = (WIDTH - 2 * PAD) / ((maxx - minx) * k)
    height = round((maxy - miny) * scale + 2 * PAD, 1)

    def project(g):
        return shapely.transform(g, lambda c: [[PAD + (x - minx) * k * scale, PAD + (maxy - y) * scale] for x, y in c])

    return project, height


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


def svg_path(g):
    """Simplify and write as a compact SVG path with relative coordinates."""
    g = g.simplify(SIMPLIFY, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(g.geoms)
    out = []
    for p in polys:
        if p.area < 4:  # specks smaller than 2x2 units
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
    """A point well inside the region (largest part), for names and ? markers."""
    if isinstance(g, MultiPolygon):
        g = max(g.geoms, key=lambda p: p.area)
    pt = polylabel(g, tolerance=0.5)
    return round(pt.x, 1), round(pt.y, 1)


def merge(parts):
    return unary_union([p.buffer(MERGE_EPS) for p in parts]).buffer(-MERGE_EPS)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("districts", help="MADHYA PRADESH_DISTRICTS.geojson")
    ap.add_argument("tehsils", help="MADHYA PRADESH_SUBDISTRICTS.geojson")
    ap.add_argument("out", help="output path, e.g. ../public/mp-map.json")
    args = ap.parse_args()

    geoms = load_districts(args.districts, args.tehsils)
    project, height = make_projection(geoms)
    screen = {n: project(g) for n, g in geoms.items()}

    districts = []
    for name in sorted(screen):
        lx, ly = label_point(screen[name])
        districts.append({"name": name, "div": DISTRICT_TO_DIVISION[name], "d": svg_path(screen[name]),
                          "lx": lx, "ly": ly, "alt": ALIASES.get(name, [])})

    divisions = []
    for name in sorted(DIVISIONS):
        g = merge([screen[d] for d in DIVISIONS[name]])
        lx, ly = label_point(g)
        divisions.append({"name": name, "d": svg_path(g), "lx": lx, "ly": ly,
                          "n": len(DIVISIONS[name]), "alt": DIVISION_ALIASES.get(name, [])})

    data = {"w": WIDTH, "h": height, "state": svg_path(merge(screen.values())),
            "divisions": divisions, "districts": districts,
            "credit": "Boundaries: datta07/INDIAN-SHAPEFILES (MIT), updated to 55 districts. Simplified; not an official map."}

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {args.out}: {len(divisions)} divisions, {len(districts)} districts")


if __name__ == "__main__":
    main()
