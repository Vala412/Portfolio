# Portfolio RAG Backend

Production hybrid-RAG API for Vatsal Vala's portfolio assistant. Single provider:
**OpenAI** (chat + dense embeddings) and **Pinecone** (dense + sparse indexes +
hosted reranking). FastAPI, fully async, with SSE streaming.

The assistant answers **two kinds of questions**: (1) about Vatsal — his work,
projects, skills and how to reach him, grounded in the retrieved portfolio
context, and (2) general **technology / AI-ML / programming** questions from the
model's own knowledge. Conversation history is kept per `conversation_id` and fed
back into the prompt, so follow-ups ("it", "that", "and the stack?") resolve
naturally.

## Retrieval pipeline

```
query
 ├─ dense:  OpenAI text-embedding-3-small (1536-d) → Pinecone dense index (top_k)
 └─ sparse: Pinecone integrated pinecone-sparse-english-v0 → sparse index (top_k)
        → union / dedupe candidates
        → Pinecone hosted reranker (bge-reranker-v2-m3) → top-N
        → gpt-5.4-mini (grounded generation, streamed)
```

Dense and sparse run concurrently; the cross-encoder reranker produces one
unified relevance score, so no manual dense/sparse weighting is needed. If one
retriever fails, the other still serves results.

## Layout

```
app/
  core/        config, logging (+request-id), errors, middleware, ratelimit, context
  api/routes/  chat.py (/chat + /chat/stream), health.py (/health + /health/ready)
  llm/         client.py (AsyncOpenAI), openai_llm.py (generate + stream)
  rag/         embedder, dense_index, sparse_index, reranker, retriever, ingestion_pipeline
  services/    chat_service (orchestration), container (DI + readiness)
  repositories/ conversation_store (in-memory)
tests/         pytest suite (mocked OpenAI/Pinecone — no network)
```

## Setup

```bash
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env      # then fill OPENAI_API_KEY + PINECONE_API_KEY
```

## Ingest (creates indexes + upserts data)

```bash
python ingest.py
```

Creates `portfolio-dense` (1536-d cosine) and `portfolio-sparse` (integrated
sparse) if missing, then upserts every chunk of `data/*.md` into both. Idempotent.
Run this **once before serving** (locally or against your prod Pinecone) so the
assistant has data to retrieve.

## Run

```bash
uvicorn app.main:app --reload --port 8000
# or: docker compose up --build
```

## Endpoints

| Method | Path                         | Purpose                                  |
|--------|------------------------------|------------------------------------------|
| GET    | `/health`                    | Liveness                                 |
| GET    | `/health/ready`              | Readiness (503 until deps initialized)   |
| POST   | `/chat`                      | Blocking JSON answer                     |
| POST   | `/chat/stream`               | SSE stream: `meta` → `token`* → `done`   |
| DELETE | `/conversation/{id}`         | Clear a conversation                     |

```bash
curl -X POST localhost:8000/chat -H "Content-Type: application/json" \
     -d '{"query":"What is Vatsal'\''s best project?"}'

curl -N -X POST localhost:8000/chat/stream -H "Content-Type: application/json" \
     -d '{"query":"Tell me about SignAssistive"}'
```

## Tests

```bash
pytest
```

## Configuration (`.env`)

Key settings — see `.env.example` for the full list.

| Var | Default | Notes |
|-----|---------|-------|
| `OPENAI_MODEL` | `gpt-5.4-mini` | Chat model (uses `max_completion_tokens`) |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | 1536-d |
| `PINECONE_RERANK_MODEL` | `bge-reranker-v2-m3` | Pinecone-hosted; free tier = 500 rerank req/mo |
| `DENSE_TOP_K` / `SPARSE_TOP_K` / `RERANK_TOP_N` | 20 / 20 / 6 | Retrieval fan-out → final context size |
| `ALLOWED_ORIGINS` | `*` | Comma-separated; set to your site origin in prod |
| `RATE_LIMIT` | `20/minute` | Per-IP on `/chat*` |

## Deploy (Render, free tier)

The service is lightweight (no local ML models — OpenAI + Pinecone over HTTP), so
it runs on Render's free 512 MB instance. A `render.yaml` blueprint is included at
the repo root: root dir `portfolio/backend`, start
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`. Set
`OPENAI_API_KEY` and `PINECONE_API_KEY` as dashboard secrets. The `Dockerfile`
also binds `$PORT` for any container host. Full walkthrough:
[`../DEPLOY.md`](../DEPLOY.md).

## Scaling notes

- **Conversation store** and **rate limiter** are in-memory (per-process). For
  multiple workers/replicas, back both with Redis.
- To use a temperature-tunable model (e.g. gpt-4o), set `OPENAI_SEND_TEMPERATURE=true`.
