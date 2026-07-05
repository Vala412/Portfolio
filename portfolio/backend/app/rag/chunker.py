"""
Chunker module for splitting documents into overlapping text chunks.
"""

from typing import List, Dict, Any


class Chunker:
    """
    Splits long text into smaller overlapping chunks using a recursive
    splitting strategy (paragraphs -> lines -> sentences -> words).
    """

    def __init__(self, chunk_size: int = 300, overlap: int = 50):
        """
        Initialize the chunker with configurable size and overlap.

        Args:
            chunk_size: Maximum character length per chunk (default 300).
            overlap: Number of overlapping characters between chunks (default 50).
        """
        if chunk_size <= 0:
            raise ValueError("chunk_size must be greater than 0")
        if overlap < 0:
            raise ValueError("overlap must be non-negative")
        if overlap >= chunk_size:
            raise ValueError("overlap must be less than chunk_size")

        self.chunk_size = chunk_size
        self.overlap = overlap
        self._separators = ["\n\n", "\n", ". ", " "]

    def chunk(self, text: str) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks with metadata.

        Args:
            text: The input text to chunk.

        Returns:
            List of dicts with keys: chunk_id, text, char_count,
            start_index, end_index.
        """
        try:
            if not text or not text.strip():
                return []

            text = text.strip()
            raw_chunks = self._recursive_split(text, self._separators)
            merged_chunks = self._merge_small_chunks(raw_chunks)
            overlapped_chunks = self._apply_overlap(merged_chunks, text)

            result = []
            for chunk_id, (chunk_text, start_index, end_index) in enumerate(overlapped_chunks):
                if not chunk_text.strip():
                    continue
                result.append({
                    "chunk_id": chunk_id,
                    "text": chunk_text.strip(),
                    "char_count": len(chunk_text.strip()),
                    "start_index": start_index,
                    "end_index": end_index,
                })

            return result

        except Exception as exc:
            raise RuntimeError(f"Error chunking text: {exc}") from exc

    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """
        Recursively split text using a hierarchy of separators.
        """
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        if not separators:
            # Force split by character if no separators remain
            return [text[i:i + self.chunk_size] for i in range(0, len(text), self.chunk_size)]

        separator = separators[0]
        remaining_separators = separators[1:]
        parts = text.split(separator)

        chunks: List[str] = []
        current_chunk = ""

        for index, part in enumerate(parts):
            piece = part if index == len(parts) - 1 else part + separator

            if len(piece) > self.chunk_size:
                if current_chunk.strip():
                    chunks.append(current_chunk)
                    current_chunk = ""

                if remaining_separators:
                    sub_chunks = self._recursive_split(piece, remaining_separators)
                    chunks.extend(sub_chunks)
                else:
                    chunks.extend(
                        [piece[i:i + self.chunk_size] for i in range(0, len(piece), self.chunk_size)]
                    )
            elif len(current_chunk) + len(piece) <= self.chunk_size:
                current_chunk += piece
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk)
                current_chunk = piece

        if current_chunk.strip():
            chunks.append(current_chunk)

        return chunks

    def _merge_small_chunks(self, chunks: List[str]) -> List[str]:
        """
        Merge consecutive small chunks until they approach chunk_size.
        """
        if not chunks:
            return []

        merged: List[str] = []
        current = ""

        for chunk in chunks:
            if not chunk.strip():
                continue
            if len(current) + len(chunk) <= self.chunk_size:
                current += chunk
            else:
                if current.strip():
                    merged.append(current)
                current = chunk

        if current.strip():
            merged.append(current)

        return merged

    def _apply_overlap(
        self, chunks: List[str], original_text: str
    ) -> List[tuple]:
        """
        Apply character overlap between consecutive chunks and compute
        start/end indices in the original text.
        """
        if not chunks:
            return []

        result: List[tuple] = []
        search_start = 0

        for index, chunk in enumerate(chunks):
            chunk_stripped = chunk.strip()
            if not chunk_stripped:
                continue

            start_index = original_text.find(chunk_stripped, search_start)
            if start_index == -1:
                start_index = search_start

            end_index = start_index + len(chunk_stripped)

            if index > 0 and self.overlap > 0:
                overlap_start = max(0, start_index - self.overlap)
                overlap_text = original_text[overlap_start:start_index]
                chunk_with_overlap = overlap_text + original_text[start_index:end_index]
                result.append((chunk_with_overlap.strip(), overlap_start, end_index))
                search_start = start_index + len(chunk_stripped) - self.overlap
            else:
                result.append((chunk_stripped, start_index, end_index))
                search_start = end_index

        return result
