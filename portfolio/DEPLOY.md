# Deploy guide

Two pieces:

- **Frontend** (`portfolio/frontend`) → **Netlify** (static)
- **Backend** (`portfolio/backend`) → **Render** (free FastAPI web service)

Both deploy from a **GitHub repo**, so do that first.

---

## 0. Push to GitHub (once)

```bash
cd "Portfolio Bot"
git init
git add .
git commit -m "Portfolio site + RAG backend"
git branch -M main
git remote add origin https://github.com/Vala412/<your-repo>.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `.venv/`, and caches — your API keys are **not** committed. Confirm with `git status` before pushing.

---

## 1. Backend → Render (free)

Prereq: your Pinecone indexes must be **populated once** so the assistant has data to retrieve. Run locally with your real `.env`:

```bash
cd portfolio/backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
python ingest.py        # creates + fills the Pinecone indexes
```

Then deploy the API:

1. Go to **render.com** → sign in with GitHub (no credit card for the free plan).
2. **New +** → **Blueprint** → select this repo. Render reads `render.yaml` and configures:
   - Root dir `portfolio/backend`, build `pip install -r requirements.txt`,
     start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`.
3. When prompted, set the two **secret** env vars:
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
   (Add any non-default settings from `.env.example` only if you changed them —
   e.g. different Pinecone index names.)
4. Deploy. You'll get a URL like `https://vatsal-portfolio-api.onrender.com`.
5. Test it: open `https://<your-render-url>/health` → should return OK.

**Keep it warm (optional but recommended):** the free instance sleeps after 15 min
idle (~50 s cold start). Either:
- Edit `.github/workflows/keepalive.yml` → set `BACKEND_URL` to your Render URL, push
  (a GitHub Action pings `/health` every ~10 min), **or**
- Create a free monitor at **cron-job.org** hitting `https://<your-render-url>/health`.

---

## 2. Point the frontend at the backend

Edit `portfolio/frontend/js/chat.js` → set `PROD_API_URL` to your Render URL:

```js
var PROD_API_URL = "https://vatsal-portfolio-api.onrender.com";
```

(`?api=...` still overrides for testing; `localhost` still uses `http://localhost:8000`.)

---

## 3. Frontend → Netlify

1. **netlify.com** → **Add new site** → **Import from Git** → pick this repo.
2. Build settings:
   - **Base directory:** `portfolio/frontend`
   - **Build command:** *(leave empty — it's static)*
   - **Publish directory:** `portfolio/frontend`
3. Deploy. `_redirects` (SPA fallback) is picked up automatically so `/work/<slug>`
   deep-links resolve.
4. Add your domain: Netlify → **Domain settings** → add `vatsalvala.dev` and follow the
   DNS steps. (`<base href="/">`, `sitemap.xml`, `robots.txt`, `llms.txt` are already in place.)

---

## Checklist

- [ ] `git status` shows no `.env` before pushing
- [ ] `python ingest.py` run once (Pinecone populated)
- [ ] Render `/health` returns OK
- [ ] `PROD_API_URL` set in `chat.js`
- [ ] Netlify publish dir = `portfolio/frontend`
- [ ] `ALLOWED_ORIGINS` on Render = your live domain
- [ ] Chat works on the live site (send a message, get a streamed reply)
