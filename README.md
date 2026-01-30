# Robot Ecology Lab

**Robot Ecology Lab** is a browser-based “laboratory simulation” where a population of small robots evolves and collapses in a 50×50 world.
Robots have 16 genes that shape derived traits (mobility, combat, sensing, efficiency, energy capacity, etc.). Each cycle they decide whether to rest,
move, mine, mate, or fight—balancing power consumption against survival and fitness.

It’s a toy model meant for exploration and fun, not a scientific ecology simulator.

This project is a modern, visual port of an ANSI‑C text simulation I originally wrote in 1996, rebuilt as a single-page canvas app (no build step, no dependencies). The original version was just intended to illustrate a genetic algorithm in a more interesting form than was typical at the time.

## Quick start

1. Clone the repo.
2. Open `index.html` in a modern browser.

If your browser is strict about local file access, run a tiny local server instead:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Browser compatibility

The UI uses modern platform features like `<canvas>`, `<dialog>`, and the HTML Popover API. If something looks broken, try the latest version of your preferred browser.

## How it works (high level)

- **World:** 50×50 grid with terrain types:
  - **Field**: passive “charge” (energy-friendly ground)
  - **Hill**: ore to mine
  - **Building**: scrap to scavenge
  - **Master computer**: risky interactions that can reward/penalize robots
- **Robots:** each robot carries **16 genes** (0–255). Genes map to derived stats like mobility, mining, armor, stealth, range, and energy efficiency.
- **Life cycle:** each cycle robots spend upkeep energy, recharge a bit, then choose an action (rest / move / mine / mate / attack).
- **Fitness:** increases through successful actions (e.g., winning combat, mining/scavenging, surviving harsh conditions). The population’s average/peak fitness is tracked over time.

## Controls

- **Start / Step / Reset / New seed** control simulation flow.
- **Speed** sets steps per second.
- **World preset** changes terrain/resource distributions and environmental pressure.
- **Master computers**, **Max age**, and **Initial density** shape population dynamics.
- **Seed** makes runs reproducible (same seed + same settings → same run).
- **Overlays:** toggle the grid and signal effects.

Keyboard shortcuts:

- `Space` start/stop
- `N` step once
- `R` reset
- `H` help dialog

## What to look for

- “Boom/bust” population cycles as resources are consumed and selection pressure shifts.
- Divergent “robot classes” emerging from genetics and environment (color-coded in the UI).
- Behavioral patterns: mining corridors, avoidance loops, combat hotspots, and short-lived “golden ages.”

## Project structure

- `index.html` — UI layout and controls
- `styles.css` — styling
- `app.js` — simulation engine + rendering + UI wiring

## License

MIT. See `LICENSE`.
