# Vatsal Vala — Portfolio Frontend

Brutalist portfolio site, based on the **Vatsal Vala – Brutalist** Claude Design
import (acid-green #c5f82a on ink #0b0b0b, paper #f2f1ea), upgraded with
award-site-level interaction polish. Pure HTML/CSS/JS — no build step,
no framework, no dependencies.

```
frontend/
├── index.html        # markup
├── css/styles.css    # base styles + upgrade layers (grain, rail, reveals, loader)
├── js/main.js        # FX engine, loader, cursor, cards, project router, rail, clock
├── js/chat.js        # chat widget (Markdown + persistence) wired to the backend
├── assets/           # portrait + project shots
├── sitemap.xml       # home + per-project /work URLs
├── robots.txt        # crawl policy + sitemap pointer
├── llms.txt          # profile/projects summary for LLM crawlers
└── _redirects        # Netlify SPA fallback (/* → /index.html 200)
```

## Features

Everything from the Claude Design import — loader, blend cursor, pinned parallax
hero, mega-text marquee, sticky-portrait About with scroll-scrubbed counters,
draggable WORK card pile, skill marquees, circular "Let's talk" contact reveal,
color-morph background, RAG chat assistant — plus:

- **Project routing** — each WORK card navigates to a real URL, `/work/<slug>`
  (History API), rendered as a full-screen case-study page with the column-wipe
  transition. Browser Back and deep-links work (SPA fallback + `<base href>`).
- **Markdown chat** — assistant replies render Markdown (bold, `code`, lists,
  links); the transcript + conversation id persist in `localStorage` across reloads.
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

**Serve the frontend** (a server is required so `/work/<slug>` routes resolve):
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

## Backend URL resolution (`js/chat.js`)

The chat picks its API endpoint in this order:

1. `?api=https://host` query override (handy for testing)
2. `localhost` / `127.0.0.1` → `http://localhost:8000` (local dev)
3. otherwise → `PROD_API_URL` — **set this constant to your deployed backend URL**
   (e.g. the Render service) once the backend is hosted.

## Deploy (Netlify)

Publish directory is `portfolio/frontend`. `_redirects` handles the SPA fallback,
and `sitemap.xml` / `robots.txt` / `llms.txt` sit at the site root. See
[`../DEPLOY.md`](../DEPLOY.md) for the full frontend + backend deploy walkthrough.
