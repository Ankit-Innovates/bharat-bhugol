"""Build public/monuments-map.json for the Famous architecture game.

Places famous monuments of India on the India map, in exactly the projection and scale of
public/india-map.json, and checks that each one lands inside its own state. A monument on the
coast can fall just outside its state's simplified outline; it is moved onto land, and the
script says how far.

Usage:
    pip install -r tools/requirements.txt
    python tools/build_monuments_map.py tools/source/INDIA_STATES.geojson public/monuments-map.json
"""

import argparse
import json
import os
import sys

from shapely.geometry import Point
from shapely.ops import nearest_points

# The India map's projection and helpers, so both files share one coordinate system.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_india_map import WIDTH, load_regions, project_all  # noqa: E402

# Name -> (other names, city, other names of the city, state, latitude, longitude).
# In the game, a monument's other names count as its name, and its city or state as its place.
MONUMENTS = {
    "Taj Mahal": (["taj"], "Agra", [], "Uttar Pradesh", 27.1751, 78.0421),
    "Qutub Minar": (["qutb minar", "qutab minar", "kutub minar"], "Delhi", ["new delhi"], "Delhi", 28.5245, 77.1855),
    "Red Fort": (["lal qila", "lal quila", "lal kila", "lal qilla"], "Delhi", ["new delhi"], "Delhi", 28.6562, 77.2410),
    "Hawa Mahal": (["palace of winds", "palace of the winds"], "Jaipur", [], "Rajasthan", 26.9239, 75.8267),
    "Mehrangarh Fort": (["mehrangarh"], "Jodhpur", [], "Rajasthan", 26.2979, 73.0186),
    "Golden Temple": (["harmandir sahib", "harmandar sahib", "darbar sahib"], "Amritsar", [], "Punjab", 31.6200, 74.8765),
    "Gateway of India": ([], "Mumbai", ["bombay"], "Maharashtra", 18.9220, 72.8347),
    "Ellora Caves": (["ellora", "kailasa temple", "kailash temple"], "Ellora",
                     ["aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"], "Maharashtra", 20.0258, 75.1780),
    "Charminar": (["char minar"], "Hyderabad", [], "Telangana", 17.3616, 78.4747),
    "Victoria Memorial": ([], "Kolkata", ["calcutta"], "West Bengal", 22.5448, 88.3426),
    "Mysore Palace": (["amba vilas palace", "mysuru palace"], "Mysuru", ["mysore"], "Karnataka", 12.3052, 76.6552),
    "Hampi": (["vittala temple", "vitthala temple", "stone chariot"], "Hampi", ["hosapete", "hospet"],
              "Karnataka", 15.3350, 76.4600),
    "Konark Sun Temple": (["konark", "konarak", "sun temple", "konark temple"], "Konark", ["konarak", "puri"],
                          "Odisha", 19.8876, 86.0945),
    "Meenakshi Temple": (["meenakshi", "meenakshi amman temple"], "Madurai", [], "Tamil Nadu", 9.9195, 78.1193),
    "Brihadeeswarar Temple": (["brihadeeswara temple", "brihadisvara temple", "brihadishvara temple",
                               "big temple", "thanjavur temple"], "Thanjavur", ["tanjore"], "Tamil Nadu",
                              10.7828, 79.1318),
    "Khajuraho Temples": (["khajuraho", "kandariya mahadeva temple", "kandariya mahadev temple"], "Khajuraho", [],
                          "Madhya Pradesh", 24.8520, 79.9199),
    "Sanchi Stupa": (["sanchi", "great stupa"], "Sanchi", [], "Madhya Pradesh", 23.4793, 77.7398),
    "Mahabodhi Temple": (["mahabodhi"], "Bodh Gaya", ["bodhgaya", "gaya"], "Bihar", 24.6959, 84.9911),
    "Rani ki Vav": (["rani ni vav", "queens stepwell"], "Patan", [], "Gujarat", 23.8589, 72.1016),
    "Basilica of Bom Jesus": (["bom jesus"], "Old Goa", ["goa", "panaji"], "Goa", 15.5009, 73.9116),
    "Kamakhya Temple": (["kamakhya"], "Guwahati", ["gauhati"], "Assam", 26.1664, 91.7055),
}

INSET = 1.5    # a monument moved onto land goes this far inside its state's outline
MAX_MOVE = 8.0 # moving one further than this means its coordinates are wrong (SVG units)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("states", help="INDIA_STATES.geojson, the India map's own source")
    ap.add_argument("out", help="output path, e.g. public/monuments-map.json")
    args = ap.parse_args()

    screen, height, project = project_all(load_regions(args.states))
    states = {name: shape for (name, _), shape in screen.items()}

    monuments = []
    for name, (alt, city, city_alt, state, lat, lon) in MONUMENTS.items():
        if state not in states:
            raise SystemExit(f"{name}: unknown state {state}")
        x, y = project([(lon, lat)])[0]
        point = Point(x, y)
        moved = 0.0
        if not states[state].contains(point):
            inside = nearest_points(states[state].buffer(-INSET), point)[0]
            moved = point.distance(inside)
            if moved > MAX_MOVE:
                raise SystemExit(f"{name} is {moved:.1f} units outside {state}: check its coordinates")
            point = inside
        monuments.append({
            "name": name, "alt": alt, "city": city, "cityAlt": city_alt, "state": state,
            "lx": round(point.x, 1), "ly": round(point.y, 1),
        })
        print(f"{name:24} {city:12} {state:16} ({point.x:6.1f}, {point.y:6.1f})"
              f"{f'  moved {moved:.1f} onto land' if moved else ''}")

    data = {
        "w": WIDTH,
        "h": height,
        "monuments": monuments,
        "credit": "Monuments placed from their latitude and longitude on the India map.",
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {args.out}: {len(monuments)} monuments, h={height}")


if __name__ == "__main__":
    main()
