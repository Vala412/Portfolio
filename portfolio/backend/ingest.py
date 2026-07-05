"""CLI entrypoint for portfolio document ingestion.

Usage: `python ingest.py`
Creates the dense + sparse Pinecone indexes (if missing) and upserts all
markdown in `data/` into both. Safe to re-run.
"""

import asyncio
import sys

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.rag.ingestion_pipeline import IngestionPipeline


async def _run() -> None:
    settings = get_settings()
    configure_logging(settings)
    summary = await IngestionPipeline(settings=settings).run()
    print("INGESTION COMPLETE")
    for key, value in summary.items():
        print(f"{key}: {value}")


def main() -> None:
    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        print("Ingestion interrupted by user.")
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001 - surface a clean CLI error
        print(f"FATAL ERROR during ingestion: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
