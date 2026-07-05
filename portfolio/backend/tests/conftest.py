"""Shared test config: ensure the backend package is importable and env is safe."""

import os
import sys
from pathlib import Path

# Make `import app...` work when running pytest from anywhere.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# Deterministic settings for tests; no real keys needed (clients are mocked).
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("PINECONE_API_KEY", "test-key")
os.environ.setdefault("ASSISTANT_NAME", "Vatsal Vala")
os.environ.setdefault("CONTACT_EMAIL", "vatsalvala46@gmail.com")
