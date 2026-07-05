"""
DocumentReader module for reading and cleaning markdown files.
"""

import os
import re


class DocumentReader:
    """
    Reads markdown files from disk and returns clean plain text
    suitable for chunking and embedding.
    """

    def read(self, file_path: str) -> str:
        """
        Read a markdown file and return its contents as clean text.

        Strips excessive whitespace, normalizes line endings, and removes
        markdown image syntax while preserving readable content.

        Args:
            file_path: Absolute or relative path to the .md file.

        Returns:
            Cleaned text content of the file.

        Raises:
            FileNotFoundError: If the file does not exist.
            ValueError: If the path is not a file or is empty after cleaning.
        """
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            if not os.path.isfile(file_path):
                raise ValueError(f"Path is not a file: {file_path}")

            with open(file_path, "r", encoding="utf-8") as file_handle:
                raw_text = file_handle.read()

            if not raw_text or not raw_text.strip():
                raise ValueError(f"File is empty: {file_path}")

            cleaned_text = self._clean_text(raw_text)

            if not cleaned_text.strip():
                raise ValueError(f"File contains no usable text after cleaning: {file_path}")

            return cleaned_text

        except FileNotFoundError:
            raise
        except UnicodeDecodeError as exc:
            raise ValueError(f"Unable to decode file as UTF-8: {file_path}") from exc
        except Exception as exc:
            raise RuntimeError(f"Error reading file {file_path}: {exc}") from exc

    def _clean_text(self, text: str) -> str:
        """
        Clean raw markdown text by normalizing whitespace and
        removing non-essential markdown artifacts.
        """
        try:
            # Normalize line endings to Unix style
            text = text.replace("\r\n", "\n").replace("\r", "\n")

            # Remove HTML comments
            text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)

            # Remove markdown images but keep alt text if present: ![alt](url) -> alt
            text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)

            # Collapse 3+ consecutive newlines into 2
            text = re.sub(r"\n{3,}", "\n\n", text)

            # Strip trailing whitespace from each line
            lines = [line.rstrip() for line in text.split("\n")]
            text = "\n".join(lines)

            return text.strip()

        except Exception as exc:
            raise RuntimeError(f"Error cleaning text: {exc}") from exc
