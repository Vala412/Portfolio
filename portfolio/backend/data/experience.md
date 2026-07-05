# Work Experience — Vatsal Vala

## AI/ML Developer — Vivansh Infotech (January 2026 – Present)

**Location:** Ahmedabad, India

Vatsal works as an AI/ML Developer at Vivansh Infotech, where he builds production GenAI systems:

- Built a **multi-chatbot RAG platform** where users upload PDFs, documents, and URLs (crawled via BeautifulSoup/Requests, OCR'd to markdown with Docling) to build per-bot knowledge bases.
- Engineered the retrieval pipeline: Recursive Character chunking, all-MiniLM-L6-v2 embeddings stored in Pinecone, reranking to the top-3 chunks, and GPT-4o with optimized prompting for context-grounded responses.
- Built an **AI medical transcription system**: a two-stage LLM pipeline extracts medical terms and permutations for fuzzy search (RapidFuzz) and semantic search (FAISS), auto-generating structured forms from raw medical records.
- Cut end-to-end form generation to **about 15 seconds** and reduced token usage **60% (25k → 10k tokens)** by optimizing the sequential pipeline.

## Summary of professional strengths

- Production RAG systems: ingestion, chunking, embeddings, vector databases, reranking, grounded generation.
- LLM cost and latency optimization: prompt engineering, token reduction, pipeline re-architecture.
- End-to-end ownership: backend (FastAPI), retrieval, and prompt design.
