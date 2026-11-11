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

## Power-ups
Power-ups float on the road in a coloured bubble. While one is active, an icon with a countdown bar shows under the HUD.

| Power-up | Effect | Duration (Lv 0 → Lv 5) |
| --- | --- | --- |
| 🧲 Magnet | Pulls coins from every lane to the car | 6s → 13.5s |
| 🛡️ Shield | Blocks one crash while active (force field around the car) | 8s → 18s |
| 💰 Double Coins | Every coin counts ×2 | 6s → 13.5s |

**Upgrades** (main menu): each power-up has 5 upgrade levels that make it last longer, costing 80, 160, 300, 500 and 800 coins.

## Daily reward
Open the game once a day to claim 25, 50, 75, 100, 150, 200 and then 300 coins plus a free shield on day 7.
Missing a day resets the streak to day 1; after day 7 the cycle starts again.

## Near misses
Squeeze past a car mid lane-change, or swerve out of its lane at the last moment, and you get a **NEAR MISS!** worth 3 bonus coins.
Messages during a run (near misses, shield and mission notices) appear as a small, brief line under the score, so nothing covers the road.

## Daily missions
Three random missions every day (collect coins, near misses, finish levels, drive a distance, grab power-ups, reach a distance in Endless, earn stars). Progress counts in every mode; claim the coin rewards on the **Missions** screen.

## Settings and polish
- Looping background music and all sound effects are generated with the Web Audio API (no audio files).
- **Settings** (main menu or pause screen): music, sound effects and vibration on/off.
- Phone vibration on crash, coin pickup and near miss (Android browsers; iOS Safari has no vibration API).
- A short swipe tutorial runs the first time you play.

Coins, stars, unlocked levels, owned cars, the selected car, power-up upgrades, the daily streak, daily missions and settings are saved in `localStorage`.

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
