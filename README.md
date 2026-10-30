# Bharat Bhugol

_Bhugol_ means geography: these are games for learning the map of India, played on blank maps against the clock.

- **States and UTs of India:** the 28 states and 8 union territories (4 minutes).
- **State capitals:** the capital of each of the 28 states (3 minutes), or of all 36 states and union territories (4 minutes).
- **Districts/Divisions of MP:** Madhya Pradesh's 10 divisions or all 55 districts (5 minutes either way).
- **Rivers of India:** the 15 major rivers (2 minutes) or all 29 (4 minutes), drawn as blue lines over India's states.
- **Dams of India:** 12 major dams (2 minutes) or 24 (4 minutes), as dots on India's map with its rivers drawn faintly behind them.
- **Famous architecture:** 21 monuments, from the Taj Mahal to the Meenakshi Temple, shown in photos: name each one, or say where it is (3 minutes).
- **The India Quiz:** 51 facts about India (its flag, leaders, neighbours, seas, peaks, cities and symbols) set out as clues in three parts; type the answers in any order (6 minutes).

The time limits are tight on purpose, so a round is a challenge.

Every screen has the same header: the logo and name (also in Devanagari, भारत भूगोल) in the top-left corner, then two tabs: **Home** and **Games**. The design is light: near-white, near-black and warm greys, with one saffron-orange accent for buttons.

The home page shows a big title, "Learn the map of India", whose middle word changes (map, states, rivers, monuments), beside a round of the States game playing itself: a pointer clicks state after state, each turns blue, and the score and clock move, over soft glows in the cards' colours. Below it, each game has a card whose picture is made from the game itself: India's states as a saffron mosaic, the capitals in gold, Madhya Pradesh's districts in greens, the rivers in blue with the Ganga lit up as in **Name it**, the dams as dots on the rivers, a collage of the monuments' photos, and a sheet of quiz clues. Each card shows just the picture, the time limit and the game's name, and the newest games have a **New** badge. The home page shows five of the games (those marked `featured` in `src/games.ts`); the **Games** page lists them all, then placeholders for the games to come: National parks, Mountain peaks and Lakes of India. A game's own page shows its picture big, beside its name and option cards for the level (with its count and time) and the mode (with a hint of how it plays), then **Start**. The game screens stay plain so the map is easy to read; only Famous architecture shows photos, because there the photo is the question. The moving parts (the game playing itself, the changing word, cards that rise in and lift under the pointer) hold still for visitors whose devices ask for reduced motion.

The games have up to three modes:

- **Name it** (State capitals, Rivers of India, Dams of India, Famous architecture): one place at a time is asked, and you type its name. Only that place's name counts, and other spellings do too (Ganges, Cauvery, Tapti, Satluj…). **Skip** moves on to the next one.
  - In State capitals, a state lights up in saffron and the prompt names it ("Capital of Rajasthan:"); you type its capital. Old names and second capitals count too (Bombay, Trivandrum, Port Blair; Shimla or Dharamshala, Srinagar or Jammu).
  - In Rivers of India, the river lights up in orange; named rivers turn dark blue with their names on.
  - In Dams of India, a dam's dot lights up, and the prompt gives its river as the clue ("Name this dam, on the Sutlej:"), or its state for a dam named after its river (the Koyna Dam).
  - In Famous architecture, a photo of the monument fills the board. **Name the monument** asks for its name (Taj, Lal Qila and Harmandir Sahib count too). **Name the place** shows the name and asks where it is: its city or its state both count (Agra or Uttar Pradesh for the Taj Mahal). At the end, the map of India shows every monument with its name.
- **Click on map:** the game names a place and you click it. A wrong click flashes red without saying what you clicked, and you can try again as often as you like. If you don't know a name, **Skip** sends it to the back of the queue. Places too small to click, such as Chandigarh or Lakshadweep, get a ring around them that counts as the place. On the dams map a click goes to the nearest dam, so dams close together never take each other's clicks.
- **Type names:** every place shows a **?** and you type names in any order. A name is accepted the moment it matches, with no Enter needed. Old and alternate spellings count too (Orissa, Pondicherry, Hoshangabad, West Nimar…). If a short spelling is accepted while you are still typing a longer one ("Agar" for Agar Malwa), the rest of what you type is quietly taken in, in every mode. In The India Quiz one answer can begin another ("Indian", "Indian Ocean"): typing the longer one answers both.

Press **Play game** to start the clock. Pausing covers the map so it can't be studied. A perfect round pops up a "You won!" celebration. Otherwise a popup tells you that you lost, and the answers appear only after you close it.

It's a static site built with React 19, TypeScript and Vite, set in Plus Jakarta Sans. The maps are plain inline SVG with no map library, and there is no backend, login, cookies or analytics.

## Run it locally

You need Node.js 24 LTS.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command           | What it does                                                    |
| ----------------- | --------------------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                                      |
| `npm run build`   | Type-checks, then builds the site into `dist/`                  |
| `npm run preview` | Serves the built `dist/` folder                                 |
| `npm run lint`    | Lints with oxlint                                               |
| `npm run format`  | Formats with Prettier                                           |
| `npm test`        | Vitest unit tests: map data, name matching, game rules, screens |
| `npm run e2e`     | Playwright end-to-end tests against the built site              |

The end-to-end tests run against the production build, so install Chromium once and build first:

```bash
npx playwright install chromium
npm run build
npm run e2e
```

## Pages

The screen is kept in the address's `#hash`, so links, the Back button and reloads all work, with no router library:

| Address                                             | Screen                                |
| --------------------------------------------------- | ------------------------------------- |
| `#/`                                                | Home page: a game playing, the games  |
| `#/games`                                           | The Games page: every game in a list  |
| `#/india`, `#/mp`, `#/rivers`, `#/architecture`     | A game's setup: level and mode, Start |
| `#/mp/districts/type`, `#/architecture/places/name` | A round: game / level / mode          |

## How it works

```text
tools/build_map.py        MP GeoJSON → public/mp-map.json (run by hand, output committed)
tools/build_india_map.py  India GeoJSON → public/india-map.json (run by hand, output committed)
tools/build_rivers_map.py Natural Earth rivers → public/rivers-map.json, on the India map's grid
tools/build_monuments_map.py  monuments' latitude and longitude → public/monuments-map.json, same grid
tools/build_dams_map.py   dams' latitude and longitude → public/dams-map.json, same grid
public/*.json             outlines, regions as SVG paths, label points and accepted spellings
public/photos/            photos of the monuments, as WebP at three widths
src/data/                 fetches each map file and checks it before a game uses it
src/games.ts              the games (levels, time limits, boards built from map data) and those to come
src/data/indiaQuiz.ts     The India Quiz: its clues, answers and the other answers that count
src/data/capitals.ts      the capital of every state and union territory, and its other names
src/photos.ts             the photos: which monument each shows, where it was taken, credits
src/route.ts              which screen to show, from the address's #hash
src/game/engine.ts        every game rule, as one pure reducer: reduce(state, action) → state
src/game/matcher.ts       normalises typed text and matches whole names and other spellings
src/screens, components   React components that only render state and dispatch actions
```

The engine has no timers, randomness or DOM inside it, so every rule is unit-tested directly. The loaders refuse to start a game whose map file is wrong: MP needs exactly 10 divisions and 55 districts, each district in a real division. India needs exactly 28 states and 8 union territories, Rivers of India 29 rivers (15 of them major), and Famous architecture 21 monuments, each with a city. The data tests also check that every label point is inside its own region, that every monument is inside its own state, and that no accepted spelling of one place starts another's (otherwise the second could never be typed).

To add a game, add an entry to `GAMES` in `src/games.ts` with its levels and a loader that turns its map file into boards, and draw its card's picture in `src/components/GameArt.tsx`. A game not ready yet goes in `UPCOMING`, where it gets a placeholder card on the Games page.

## The India Quiz

Its facts are in `src/data/indiaQuiz.ts`, one clue and answer each, with the other answers that count (Bombay for Mumbai, 26 January for Republic Day…). They were checked in October 2026; the President and Prime Minister need updating when they change. A few differ from common quiz answers, on purpose:

- **Lowest point:** Kuttanad in Kerala, about 2 m below sea level, not the Indian Ocean.
- **Highest peak:** Kangchenjunga (8,586 m); K2 counts too, as India's official map puts it inside India.
- **Bordering countries:** seven, including Afghanistan, as on India's official map and in NCERT textbooks.
- **Largest cities:** by city population in the 2011 census, the latest: Mumbai, Delhi, Bengaluru, Hyderabad, Ahmedabad.
- **"Called the national game": hockey.** India has never made any game official.

`npm test` checks that every answer, in every spelling, can be typed.

## Photos

The monuments in Famous architecture are photos from [Wikimedia Commons](https://commons.wikimedia.org/), each credited under **Photo credits** at the bottom of the home page; the game also credits each photo on the photo itself. Four of them appear on the home page too, on the game's card and beside the game window. The browser picks the smallest width that looks sharp.

The monuments' files are numbered, `arch-01` to `arch-21`, in the order of `public/monuments-map.json`, so a photo's address never gives its answer away. While you answer one, the next one is already loading.

To change a photo, take one with a free licence from Commons and save it as WebP in `public/photos/` at 480, 960 and 1440 pixels wide, named `<id>-<width>.webp`. Then update its entry in `src/photos.ts`: place, author and licence. `npm test` checks that the files and the list match.

## Rebuild the map data

You only need this if boundaries or names change. It needs Python 3.12 or newer.

```bash
pip install -r tools/requirements.txt
```

Download the source GeoJSON files from [datta07/INDIAN-SHAPEFILES](https://github.com/datta07/INDIAN-SHAPEFILES) into `tools/source/`, which is git-ignored. On Windows PowerShell, type `curl.exe` instead of `curl`.

**India** (2 MB):

```bash
curl -L -o "tools/source/INDIA_STATES.geojson" "https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/INDIA/INDIA_STATES.geojson"
python tools/build_india_map.py tools/source/INDIA_STATES.geojson public/india-map.json
```

The script merges Dadra and Nagar Haveli with Daman and Diu (one union territory since 2020). It draws the map in the Lambert conformal conic projection of Survey of India maps, simplifies the borders, and marks the places too small to click. It also adds latitude and longitude lines for the home page.

**Madhya Pradesh** (about 50 MB):

```bash
curl -L -o "tools/source/MADHYA PRADESH_DISTRICTS.geojson" "https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/STATES/MADHYA%20PRADESH/MADHYA%20PRADESH_DISTRICTS.geojson"
curl -L -o "tools/source/MADHYA PRADESH_SUBDISTRICTS.geojson" "https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/STATES/MADHYA%20PRADESH/MADHYA%20PRADESH_SUBDISTRICTS.geojson"
python tools/build_map.py "tools/source/MADHYA PRADESH_DISTRICTS.geojson" "tools/source/MADHYA PRADESH_SUBDISTRICTS.geojson" public/mp-map.json
```

**Rivers** (7 MB): the river centre lines from [Natural Earth](https://www.naturalearthdata.com/) (public domain), and the India states file above, whose projection the rivers share.

```bash
curl -L -o "tools/source/ne_10m_rivers_lake_centerlines.geojson" "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson"
python tools/build_rivers_map.py tools/source/INDIA_STATES.geojson tools/source/ne_10m_rivers_lake_centerlines.geojson public/rivers-map.json
```

The script draws the 29 rivers in the India map's own projection and scale, clips them to India, and simplifies them. It gives each river a label point on its line, as far as it can from the other rivers (so a click there can only mean that river) and from the other rivers' names (so names don't cover each other, which it manages fully for the 15 major rivers). Natural Earth has no Damodar, Gomti, Sabarmati or Luni, so those aren't in the game yet.

**Monuments**: no download beyond the India states file above. Each monument's latitude and longitude, city, state and other names are in the script itself.

```bash
python tools/build_monuments_map.py tools/source/INDIA_STATES.geojson public/monuments-map.json
```

**Dams**: also no further download. Each dam's latitude and longitude, river, state and other names are in the script, which checks that it falls inside its own state as the map draws it (a dam on a border goes on its own side of the line) and moves it inside if it is just over.

```bash
python tools/build_dams_map.py tools/source/INDIA_STATES.geojson public/dams-map.json
```

The data tests also check that no two dams are too close to tell apart on a laptop's map.

The script places the 21 monuments in the India map's projection and scale and checks that each one falls inside its own state. Keep the list in order: the photos are numbered by it.

The MP source is on the 2011 census base (52 districts). The script brings it up to date: it renames Hoshangabad to Narmadapuram and Narsimhapur to Narsinghpur, builds Maihar, Mauganj and Pandhurna (created in 2023) from their tehsils, merges districts into divisions, and simplifies the borders.

After rebuilding any map, run `npm test` to let the data tests check it.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` runs on every push to `main`. It lints, runs the unit tests, builds, runs the end-to-end tests, and then publishes `dist/` to GitHub Pages.

Before the first deploy, set this once in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The build uses a relative base path (`base: './'` in `vite.config.ts`), so it works at `https://<user>.github.io/<repo>/` without changes.

## Credits

- **Map data:** boundaries from [datta07/INDIAN-SHAPEFILES](https://github.com/datta07/INDIAN-SHAPEFILES) (MIT licence), updated to India's 28 states and 8 union territories and Madhya Pradesh's 55 districts. They are simplified for a learning game and are not an official map. See [LICENSE-DATA.md](LICENSE-DATA.md).
- **Rivers:** made with [Natural Earth](https://www.naturalearthdata.com/), free vector and raster map data (public domain).
- **Font:** [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) (SIL Open Font License), self-hosted through Fontsource, so the page never calls Google.
- **Photos:** from Wikimedia Commons, resized to WebP. Each keeps its own licence:

| Photo                                                                                                                                                     | By                             | Licence       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------- |
| [Taj Mahal, Agra](https://commons.wikimedia.org/wiki/File:Taj_Mahal_N-UP-A28-a.jpg)                                                                       | © Asitjain / Wikimedia Commons | CC BY-SA 3.0  |
| [Qutub Minar, Delhi](https://commons.wikimedia.org/wiki/File:QUTB_MINAR_DSC_0655.jpg)                                                                     | Shankey007                     | CC BY-SA 4.0  |
| [Red Fort, Delhi](<https://commons.wikimedia.org/wiki/File:Lahori_Gate_(Red_Fort),_Delhi,_India_(2017).jpg>)                                              | Lucky181993                    | CC BY-SA 4.0  |
| [Hawa Mahal, Jaipur](https://commons.wikimedia.org/wiki/File:Hawa_Mahal_in_Jaipur_India.jpg)                                                              | Wander-earth                   | CC BY-SA 4.0  |
| [Mehrangarh Fort, Jodhpur](https://commons.wikimedia.org/wiki/File:Mehrangarh_Fort.jpg)                                                                   | Knowledge Seeker               | Public domain |
| [Golden Temple, Amritsar](<https://commons.wikimedia.org/wiki/File:Hamandir_Sahib_(Golden_Temple).jpg>)                                                   | Oleg Yunakov                   | CC BY-SA 3.0  |
| [Gateway of India, Mumbai](https://commons.wikimedia.org/wiki/File:Gateway_of_India_in_the_evening,_Mumbai,_India.jpg)                                    | SriSriChinmaya                 | CC BY-SA 4.0  |
| [Kailasa Temple, Ellora Caves](https://commons.wikimedia.org/wiki/File:Kailasa_Ellora.jpg)                                                                | Shishirdasika                  | CC BY-SA 4.0  |
| [Charminar, Hyderabad](https://commons.wikimedia.org/wiki/File:Iconic_Charminar_in_Hyderabad,_India.jpg)                                                  | Ravi Dwivedi                   | CC BY-SA 4.0  |
| [Victoria Memorial, Kolkata](https://commons.wikimedia.org/wiki/File:Victoria_Memorial,_Kolkata_-_West_facade_01.jpg)                                     | Bernard Gagnon                 | CC BY-SA 3.0  |
| [Mysore Palace, Mysuru](https://commons.wikimedia.org/wiki/File:Mysore_Palace_-_Amba_Vilas_Palace.jpg)                                                    | Whistleraja                    | CC BY-SA 4.0  |
| [Stone chariot, Hampi](https://commons.wikimedia.org/wiki/File:Stone_Chariot,_Hampi_2.jpg)                                                                | Ajayreddykalavalli             | CC BY-SA 4.0  |
| [Sun Temple, Konark](https://commons.wikimedia.org/wiki/File:Konark_Sun_Temple_Puri_district,_Odisha,_India_3.jpg)                                        | Joydeep Chakraborty            | CC BY-SA 4.0  |
| [Meenakshi Temple, Madurai](https://commons.wikimedia.org/wiki/File:S-TN-34_Meenakshi_Amman_Temple_South_Gopuram_enriched_with_delicate_Stucco_works.jpg) | Madhuranthakan Jagadeesan      | CC BY-SA 4.0  |
| [Brihadeeswarar Temple, Thanjavur](https://commons.wikimedia.org/wiki/File:Brihadeeswarar_temple_evening,_Thanjavur,_Tamilnadu.jpg)                       | Cafeskool                      | CC BY-SA 4.0  |
| [Kandariya Mahadeva Temple, Khajuraho](https://commons.wikimedia.org/wiki/File:The_Kandariya_Mahadeva_Temple,_Khajuraho,_Madhya_Pradesh.jpg)              | Taru23                         | CC BY-SA 4.0  |
| [Great Stupa, Sanchi](<https://commons.wikimedia.org/wiki/File:Great_Sanchi_Stupa_(3).jpg>)                                                               | Suyash Dwivedi                 | CC BY-SA 4.0  |
| [Mahabodhi Temple, Bodh Gaya](https://commons.wikimedia.org/wiki/File:Mahabodhi_temple_complex,_Bodhgaya_23.jpg)                                          | Rohit Sharma                   | CC BY-SA 4.0  |
| [Rani ki Vav, Patan](https://commons.wikimedia.org/wiki/File:Rani_ki_vav_12.jpg)                                                                          | Bernard Gagnon                 | CC BY-SA 3.0  |
| [Basilica of Bom Jesus, Old Goa](https://commons.wikimedia.org/wiki/File:Front_Elevation_of_Basilica_of_Bom_Jesus.jpg)                                    | iMahesh                        | CC BY-SA 4.0  |
| [Kamakhya Temple, Guwahati](https://commons.wikimedia.org/wiki/File:The_Kamakhya_Temple,_Guwahati,_Assam.jpg)                                             | JyotiPN                        | CC BY-SA 4.0  |
