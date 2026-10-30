"""Build public/rivers-map.json for the Rivers of India game.

Takes river centre lines from Natural Earth (public domain, https://www.naturalearthdata.com) and
draws them in exactly the projection and scale of public/india-map.json, clipped to India, so the
game can lay them over the India map. Each river gets a label point on its own line, as far from
the other rivers as possible, for its name, its ? marker and test clicks.

Usage:
    pip install -r tools/requirements.txt
    python tools/build_rivers_map.py tools/source/INDIA_STATES.geojson \
        tools/source/ne_10m_rivers_lake_centerlines.geojson public/rivers-map.json
"""

import argparse
import json
import os
import sys

import numpy as np
import shapely
from shapely.geometry import LineString, MultiLineString, shape
from shapely.ops import linemerge, unary_union

# The India map's projection and helpers, so both files share one coordinate system.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_india_map import WIDTH, load_regions, merge, num, project_all  # noqa: E402

# Game name -> (Natural Earth names joined into it, in the Major rivers level?, other spellings).
# Other spellings: old English names and the names used upstream in Nepal. No spelling may start
# another river's spelling, or that river could never be typed.
RIVERS = {
    "Indus": (["Indus"], True, ["sindhu"]),
    "Jhelum": (["Jhelum"], False, []),
    "Chenab": (["Chenab"], False, []),
    "Ravi": (["Ravi"], False, []),
    "Beas": (["Beas"], False, ["vyas"]),
    "Sutlej": (["Sutlej"], True, ["satluj"]),
    "Ganga": (["Ganges"], True, ["ganges"]),
    "Yamuna": (["Yamuna"], True, ["jumna"]),
    "Ghaghara": (["Ghäghara"], True, ["ghaghra", "gogra", "karnali", "sarayu", "saryu"]),
    "Gandak": (["Gandak"], False, ["narayani"]),
    "Kosi": (["Sapt"], True, ["koshi", "sapt kosi", "saptakoshi"]),
    # Natural Earth keeps its Arunachal stretch, the Siang, as a river of its own.
    "Brahmaputra": (["Brahmaputra", "Dihang"], True, ["brahmputra"]),
    "Teesta": (["Tista"], False, ["tista"]),
    "Chambal": (["Chambal"], True, []),
    "Betwa": (["Betwa"], False, []),
    "Son": (["Son"], True, ["sone"]),
    "Narmada": (["Narmada"], True, ["narbada"]),
    "Tapi": (["Tapi"], True, ["tapti"]),
    "Mahi": (["Mahi"], False, []),
    "Mahanadi": (["Mahäna Nadï"], True, []),
    "Brahmani": (["Brahmani"], False, []),
    "Godavari": (["Godävari"], True, []),
    "Wainganga": (["Wainganga"], False, []),
    "Indravati": (["Indravati"], False, []),
    "Krishna": (["Krishna"], True, ["kistna"]),
    "Bhima": (["Bhima"], False, []),
    "Tungabhadra": (["Tungabhadra"], False, []),
    "Penner": (["Penner"], False, ["pennar", "penna"]),
    "Kaveri": (["Cauvery"], True, ["cauvery"]),
}

CLIP_PAD = 1.5    # keeps river mouths and rivers along the border (SVG units)
SIMPLIFY = 0.5    # line simplification tolerance (SVG units)
MIN_PIECE = 4.0   # pieces shorter than this, after clipping, are dropped
STEP = 1.0        # spacing of the points tried as label points
END_MARGIN = 0.12 # label points keep this share of a river's length away from its ends
LABEL_INSET = 3.0 # and stay this far inside India's border
MIN_GAP = 18.0    # and this far from any other river, so clicks there are never ambiguous
GAP_GOAL = 30.0   # beyond this, more room from other rivers matters no more
PX_PER_UNIT = 0.45  # how big the map is on a laptop screen, for sizing names
LABEL_CHAR_PX, LABEL_PAD_PX, LABEL_HEIGHT_PX = 6.5, 12, 17  # a name on the map, in pixels


def load_rivers(path, project):
    """The wanted rivers, each one (Multi)LineString in map coordinates."""
    with open(path, encoding="utf-8") as f:
        src = json.load(f)
    wanted = {source: name for name, (sources, _, _) in RIVERS.items() for source in sources}
    parts = {}
    for feat in src["features"]:
        name = wanted.get(feat["properties"].get("name"))
        if name is None:
            continue
        geom = shape(feat["geometry"])
        parts.setdefault(name, []).append(shapely.transform(geom, lambda c: project(c)))
    missing = set(RIVERS) - set(parts)
    if missing:
        raise SystemExit(f"Rivers missing from source: {sorted(missing)}")
    return {name: joined(geoms) for name, geoms in parts.items()}


def joined(geoms):
    """A river's pieces as one line where they meet end to end (one piece needs no joining)."""
    union = unary_union(geoms)
    return union if isinstance(union, LineString) else linemerge(union)


def line_parts(geom):
    """The lines in a geometry, dropping points and tiny pieces left by clipping."""
    if isinstance(geom, LineString):
        lines = [geom]
    elif hasattr(geom, "geoms"):
        lines = [g for g in geom.geoms if isinstance(g, LineString)]
    else:
        lines = []
    return [line for line in lines if line.length >= MIN_PIECE]


def svg_line(lines):
    """Open lines as a compact SVG path with relative coordinates."""
    out = []
    for line in lines:
        pts = [(round(x, 1), round(y, 1)) for x, y in line.coords]
        x0, y0 = pts[0]
        d = f"M{num(x0)} {num(y0)}l"
        px, py = x0, y0
        for i, (x, y) in enumerate(pts[1:]):
            dx, dy = round(x - px, 1), round(y - py, 1)
            if dx == 0 and dy == 0:
                continue
            px, py = round(px + dx, 1), round(py + dy, 1)
            sx, sy = num(dx), num(dy)
            seg = sx + ("" if sy.startswith("-") else " ") + sy
            d += ("" if d.endswith("l") or seg.startswith("-") else " ") + seg
        out.append(d)
    return "".join(out)


def candidates(lines, others, inside):
    """Where a river could take its label: points along it, away from its two ends and inside
    India (a river can run along or across the border), each with its distance to the nearest
    other river."""
    out = []
    for line in lines:
        length = line.length
        for dist in np.arange(length * END_MARGIN, length * (1 - END_MARGIN) + 1e-9, STEP):
            pt = line.interpolate(dist)
            if inside.contains(pt):
                out.append((pt.x, pt.y, others.distance(pt)))
    return out


def label_width(name):
    """About how wide a river's name is on the map, in map units, on a laptop screen."""
    return (len(name) * LABEL_CHAR_PX + LABEL_PAD_PX) / PX_PER_UNIT


def room(name, point, chosen):
    """How far a label at point keeps from the labels already placed: 1 or more means it covers
    none of them. Names are wide and short, so it is measured across and down separately."""
    worst = np.inf
    for other, (x, y, _) in chosen.items():
        across = abs(point[0] - x) / ((label_width(name) + label_width(other)) / 2)
        down = abs(point[1] - y) / (LABEL_HEIGHT_PX / PX_PER_UNIT)
        worst = min(worst, max(across, down))
    return worst


def place_labels(options):
    """One label point per river: clear of the other rivers, so a click there can only mean this
    river, and clear of the labels already placed, so names don't cover each other. The major
    rivers go first, so the Major rivers level gets the best spots; in each group the rivers with
    the least room choose first."""
    chosen = {}
    tightest = lambda n: max(gap for _, _, gap in options[n])  # noqa: E731
    majors = sorted((n for n in options if RIVERS[n][1]), key=tightest)
    others = sorted((n for n in options if not RIVERS[n][1]), key=tightest)
    for name in majors + others:
        clear = [c for c in options[name] if c[2] >= MIN_GAP] or options[name]
        chosen[name] = max(clear, key=lambda c: (min(c[2] / GAP_GOAL, room(name, c, chosen)), c[2]))
    return chosen


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("states", help="INDIA_STATES.geojson, the India map's own source")
    ap.add_argument("rivers", help="ne_10m_rivers_lake_centerlines.geojson from Natural Earth")
    ap.add_argument("out", help="output path, e.g. public/rivers-map.json")
    args = ap.parse_args()

    screen, height, project = project_all(load_regions(args.states))
    land = merge(screen.values())
    india = land.buffer(CLIP_PAD)
    inside = land.buffer(-LABEL_INSET)

    lines = {}
    for name, geom in load_rivers(args.rivers, project).items():
        clipped = line_parts(geom.intersection(india))
        lines[name] = [line.simplify(SIMPLIFY) for line in clipped]
        if not lines[name]:
            raise SystemExit(f"{name} has nothing left inside India")

    options = {}
    for name in RIVERS:
        others = unary_union([MultiLineString(ls) for other, ls in lines.items() if other != name])
        options[name] = candidates(lines[name], others, inside)
        if not options[name]:
            raise SystemExit(f"{name} has no point inside India away from its ends")
    labels = place_labels(options)

    rivers = []
    for name, (_, major, alt) in RIVERS.items():
        x, y, gap = labels[name]
        lx, ly = round(x, 1), round(y, 1)
        # In the Major rivers level only the major names are on the map.
        level = [n for n in RIVERS if n != name and (RIVERS[n][1] or not major)]
        overlap = "  covers another name" if room(name, (x, y), {n: labels[n] for n in level}) < 1 else ""
        length = sum(line.length for line in lines[name])
        rivers.append({"name": name, "d": svg_line(lines[name]), "lx": lx, "ly": ly, "alt": alt, "major": major})
        print(f"{name:12} {'major' if major else '     '} length {length:6.1f}  parts {len(lines[name])}  "
              f"label ({lx}, {ly}) clear by {gap:5.1f}{overlap}")

    data = {
        "w": WIDTH,
        "h": height,
        "rivers": rivers,
        "credit": "Rivers: Natural Earth (public domain), drawn on the India map. Simplified; not an "
        "official map.",
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    major = sum(r["major"] for r in rivers)
    print(f"Wrote {args.out}: {len(rivers)} rivers, {major} of them major, h={height}")


if __name__ == "__main__":
    main()
