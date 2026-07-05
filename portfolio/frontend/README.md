# Vatsal Vala — Portfolio Frontend

Brutalist portfolio site, based on the **Vatsal Vala – Brutalist** Claude Design
import (acid-green #c5f82a on ink #0b0b0b, paper #f2f1ea), upgraded with
award-site-level interaction polish. Pure HTML/CSS/JS — no build step,
no framework, no dependencies.

```
frontend/
├── index.html        # markup
├── css/styles.css    # base styles + upgrade layers (grain, rail, reveals, loader)
├── js/main.js        # FX engine, loader, cursor, cards, modal, rail, clock
├── js/chat.js        # chat widget wired to the FastAPI backend
└── assets/           # portrait + project shots
```

## Features

Everything from the Claude Design import — loader, blend cursor, pinned parallax
hero, mega-text marquee, sticky-portrait About with scroll-scrubbed counters,
draggable WORK card pile + detail modal, skill marquees, circular "Let's talk"
contact reveal, color-morph background, RAG chat assistant — plus:

- **Inertia scroll FX** — effects are driven by a lerped scroll value with velocity
- **Velocity-reactive marquees** — rows skew as you scroll faster
- **Split-text mask reveals** on section labels; fade-up reveals on content blocks
- **Magnetic** nav links / buttons / socials; **text-scramble** on hero + nav hover
- **Film-grain overlay** and a mouse-following acid glow on the hero grid
- **Loader v2** — cycling pipeline words (Chunking → Embedding → Retrieving → …)
  with a staggered column-wipe exit
- **Section progress rail** (left edge, desktop) and a **live IST clock**
- **VV monogram** — custom SVG mark (solid V ⊕ stroked V + acid pixel) in the
  nav, footer, chat avatar and favicon; stroke draw-in on load, fill-swap on hover
- **Nav wipe transitions** — section jumps sweep the screen with staggered black columns (acid leading edge)
- **Grayscale portrait** with an RGB-split / acid-tinted glitch on hover
- **Spinning text ring** behind LET'S TALK (speeds/reverses with scroll velocity)
- **Hero grid click pulse** — click the hero for a radial shockwave
- `prefers-reduced-motion` support; heavy FX disabled on touch devices

## Run it

**Serve the frontend (recommended)**
```
cd portfolio/frontend
python -m http.server 5500
# open http://localhost:5500/
```

**Start the backend (chat)**
```
cd portfolio/backend
.venv\Scripts\activate
python main.py     # FastAPI on http://localhost:8000
```

The chat calls `http://localhost:8000` by default. Point it elsewhere with a
query param: `http://localhost:5500/?api=https://your-backend.example.com`.
