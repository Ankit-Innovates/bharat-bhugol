"""Build public/dams-map.json for the Dams of India game.

Places major dams of India on the India map, in exactly the projection and scale of
public/india-map.json, and checks that each one lands inside its own state as the map draws it (or,
for a dam on a border, inside one of the two). A dam that falls just outside that outline is moved
inside it, and the script says how far.

Usage:
    pip install -r tools/requirements.txt
    python tools/build_dams_map.py tools/source/INDIA_STATES.geojson public/dams-map.json
"""

import argparse
import json
import os
import sys

from shapely.geometry import Point
from shapely.ops import nearest_points

# The India map's projection and helpers, so both files share one coordinate system.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_india_map import SIMPLIFY, WIDTH, load_regions, project_all  # noqa: E402

# Name -> (other names, river, states, latitude, longitude, major).
# Other names count as the dam's name in the game; the river is the clue in "Name it" (or the state,
# for a dam named after its river). A dam on a border lists both states, the one it is usually said
# to be in first. "Major" dams are also asked in the Major dams level. Dams are kept far enough apart
# to tell (and click) one from another on the map.
DAMS = {
    "Tehri Dam": (["tehri"], "Bhagirathi", ["Uttarakhand"], 30.3780, 78.4805, True),
    "Bhakra Nangal Dam": (["bhakra", "bhakra dam", "bhakra nangal"], "Sutlej",
                          ["Himachal Pradesh"], 31.4107, 76.4337, True),
    "Hirakud Dam": (["hirakud"], "Mahanadi", ["Odisha"], 21.5300, 83.8700, True),
    "Sardar Sarovar Dam": (["sardar sarovar", "narmada dam"], "Narmada", ["Gujarat"],
                           21.8302, 73.7470, True),
    "Nagarjuna Sagar Dam": (["nagarjuna sagar", "nagarjunasagar", "nagarjun sagar"], "Krishna",
                            ["Telangana", "Andhra Pradesh"], 16.5753, 79.3120, True),
    "Indira Sagar Dam": (["indira sagar"], "Narmada", ["Madhya Pradesh"], 22.2843, 76.4717, True),
    "Idukki Dam": (["idukki", "idukki arch dam"], "Periyar", ["Kerala"], 9.8432, 76.9762, True),
    "Mettur Dam": (["mettur", "stanley reservoir", "stanley dam"], "Kaveri", ["Tamil Nadu"],
                   11.7985, 77.8017, True),
    "Koyna Dam": (["koyna"], "Koyna", ["Maharashtra"], 17.4013, 73.7522, True),
    "Srisailam Dam": (["srisailam"], "Krishna", ["Andhra Pradesh", "Telangana"],
                      16.0868, 78.8968, True),
    "Krishna Raja Sagara Dam": (["krs", "krs dam", "krishna raja sagara", "krishna raja sagar",
                                 "krishnaraja sagar", "krishnarajasagara"], "Kaveri", ["Karnataka"],
                                12.4216, 76.5735, True),
    "Rihand Dam": (["rihand", "govind ballabh pant sagar"], "Rihand", ["Uttar Pradesh"],
                   24.2025, 83.0081, True),
    "Tungabhadra Dam": (["tungabhadra", "pampa sagar"], "Tungabhadra", ["Karnataka"],
                        15.2669, 76.3364, False),
    "Gandhi Sagar Dam": (["gandhi sagar"], "Chambal", ["Madhya Pradesh"], 24.7031, 75.5536, False),
    "Pong Dam": (["pong", "beas dam", "maharana pratap sagar"], "Beas", ["Himachal Pradesh"],
                 31.9693, 75.9465, False),
    "Maithon Dam": (["maithon"], "Barakar", ["Jharkhand", "West Bengal"], 23.7833, 86.8150, False),
    "Ukai Dam": (["ukai", "vallabh sagar"], "Tapi", ["Gujarat"], 21.2507, 73.5880, False),
    "Bansagar Dam": (["bansagar", "ban sagar"], "Son", ["Madhya Pradesh"], 24.1903, 81.2850, False),
    "Almatti Dam": (["almatti", "lal bahadur shastri dam"], "Krishna", ["Karnataka"],
                    16.3317, 75.8878, False),
    "Malampuzha Dam": (["malampuzha"], "Malampuzha", ["Kerala"], 10.8300, 76.6830, False),
    "Umiam Dam": (["umiam", "barapani"], "Umiam", ["Meghalaya"], 25.6600, 91.8800, False),
    "Baglihar Dam": (["baglihar"], "Chenab", ["Jammu and Kashmir"], 33.1833, 75.3333, False),
    "Kallanai": (["kallanai dam", "grand anicut"], "Kaveri", ["Tamil Nadu"], 10.8300, 78.8188, False),
    "Jayakwadi Dam": (["jayakwadi", "nath sagar"], "Godavari", ["Maharashtra"], 19.4850, 75.3700, False),
}

# Shorter names for the map's labels, where dropping " Dam" isn't enough.
SHORT = {"Krishna Raja Sagara Dam": "KRS"}

INSET = 1.5    # a dam moved onto land goes this far inside its state's outline
MAX_MOVE = 8.0 # moving one further than this means its coordinates are wrong (SVG units)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("states", help="INDIA_STATES.geojson, the India map's own source")
    ap.add_argument("out", help="output path, e.g. public/dams-map.json")
    args = ap.parse_args()

    screen, height, project = project_all(load_regions(args.states))
    # Each state as the map draws it (simplified), so a dam on a border stays on its own side of the
    # line players see.
    states = {name: shape.simplify(SIMPLIFY, preserve_topology=True) for (name, _), shape in screen.items()}

    dams = []
    for name, (alt, river, in_states, lat, lon, major) in DAMS.items():
        for state in in_states:
            if state not in states:
                raise SystemExit(f"{name}: unknown state {state}")
        x, y = project([(lon, lat)])[0]
        point = Point(x, y)
        moved = 0.0
        home = next((s for s in in_states if states[s].contains(point)), None)
        if home is None:
            home = in_states[0]
            inside = nearest_points(states[home].buffer(-INSET), point)[0]
            moved = point.distance(inside)
            if moved > MAX_MOVE:
                raise SystemExit(f"{name} is {moved:.1f} units outside {home}: check its coordinates")
            point = inside
        dam = {
            "name": name, "alt": alt, "river": river, "state": home, "major": major,
            "lx": round(point.x, 1), "ly": round(point.y, 1),
        }
        short = SHORT.get(name, name.removesuffix(" Dam"))
        if short != name:
            dam["short"] = short
        dams.append(dam)
        print(f"{name:24} {river:12} {home:18} ({point.x:6.1f}, {point.y:6.1f})"
              f"{f'  moved {moved:.1f} onto land' if moved else ''}")

    data = {
        "w": WIDTH,
        "h": height,
        "dams": dams,
        "credit": "Dams placed from their latitude and longitude on the India map.",
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {args.out}: {len(dams)} dams ({sum(d['major'] for d in dams)} major), h={height}")


if __name__ == "__main__":
    main()
