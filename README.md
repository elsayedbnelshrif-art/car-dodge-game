# Lane Rush 🚗💨

A bright, low-poly 3D endless car game for mobile phones, built with [Three.js](https://threejs.org/) (loaded from a CDN — no build step).

## Play
- **Swipe left / right** to change lanes (desktop: **← / →** or **A / D**).
- Dodge the oncoming traffic — one crash and it's game over.
- Grab the spinning gold coins.
- Speed and traffic density ramp up the longer you survive.
- Your best score is saved on the device.

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
