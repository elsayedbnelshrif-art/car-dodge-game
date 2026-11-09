# Lane Rush 🚗💨

A bright, low-poly 3D endless car game for mobile phones, built with [Three.js](https://threejs.org/) (loaded from a CDN — no build step).

## Play
- **Swipe left / right** to change lanes (desktop: **← / →** or **A / D**, **P / Esc** to pause).
- Dodge the oncoming traffic — one crash and the run is over.
- Grab the spinning gold coins and spend them in the garage.

## Modes
- **Levels** — 20 levels, each with a goal (reach a distance or collect coins) and 1–3 stars.
  Distance levels give extra stars for coins collected; coin levels give extra stars for speed.
  Every 5 levels the world changes: 🏙️ City → 🏜️ Desert → 🌙 Night → ❄️ Snow.
- **Endless** — the original mode: survive as long as you can and beat your best score.

## Garage
| Car | Unlocks at | Price | Notes |
| --- | --- | --- | --- |
| Rookie | Level 1 | free | Balanced all-rounder |
| Bolt | Level 3 | 150 | Tiny hitbox, quick handling |
| Viper | Level 6 | 400 | Fast muscle car |
| Titan | Level 9 | 800 | Big 4x4, survives one crash per run |
| Phantom | Level 13 | 1400 | Top speed and handling |
| Comet | Level 17 | 2500 | Hover car with a coin magnet |

Coins, stars, unlocked levels, owned cars and the selected car are saved in `localStorage`.

## Files
| File | Purpose |
| --- | --- |
| `index.html` | Page, HUD and menus |
| `style.css` | UI styling |
| `game.js` | Game logic, rendering and Web Audio sound effects |
| `manifest.json`, `service-worker.js`, `icons/` | PWA (installable, works offline after first load) |

## Run locally
Any static server works, e.g. `python3 -m http.server` then open http://localhost:8000.

## GitHub Pages
Settings → Pages → Deploy from branch → `main` / root. The game is served at `https://<user>.github.io/car-dodge-game/`.
