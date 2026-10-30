# Boundary data licence

Boundary data derived from datta07/INDIAN-SHAPEFILES (https://github.com/datta07/INDIAN-SHAPEFILES), MIT licence, updated to the 55 current districts. Simplified for a learning game; not an official map.

This applies to `public/mp-map.json`, which `tools/build_map.py` generates from that repository's Madhya Pradesh district and sub-district GeoJSON files. It also applies to `public/india-map.json`, which `tools/build_india_map.py` generates from its India states file, updated to the 28 states and 8 union territories of today. The upstream licence is reproduced below as published.

`public/rivers-map.json` is not covered by this licence: its rivers come from Natural Earth (https://www.naturalearthdata.com), which is in the public domain, drawn by `tools/build_rivers_map.py` in the India map's projection.

`public/monuments-map.json` is not covered by it either. It holds only the monuments' names, places and positions, which `tools/build_monuments_map.py` works out from each one's latitude and longitude. The same goes for `public/dams-map.json`, from `tools/build_dams_map.py`.

The photos in `public/photos/` are not covered by this file. Each keeps its own licence, listed under Credits in `README.md`.

---

MIT License

Copyright (c) 2022

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
