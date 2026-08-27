import asyncio
import sys
import unittest
from pathlib import Path

# Add backend directory to path so we can import modules
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.ai_service import (
    clean_text_formatting,
    extract_markdown_tables,
    extractive_summarize,
    generate_ai_enhancement,
)


class TestZeroCostAIService(unittest.TestCase):
    def test_extractive_summarizer(self):
        sample_doc = (
            "DocForge is a privacy-first document processing platform. "
            "It runs entirely client-side in the browser using WebAssembly and Web Workers. "
            "No sensitive user files are ever uploaded to cloud servers by default. "
            "Users can merge, split, compress, convert, and sign PDF documents locally. "
            "Advanced OCR capabilities are provided via optimized ONNX Runtime neural networks."
        )
        summary = extractive_summarize(sample_doc, max_bullets=3)
        self.assertIn("•", summary)
        self.assertTrue(len(summary.splitlines()) <= 3)

    def test_clean_text_formatting(self):
        messy_text = "This is a broken sen-\ntence with extra    spaces and\x00 null bytes.\n\nAnother   clean paragraph."
        cleaned = clean_text_formatting(messy_text)
        self.assertNotIn("sen-\ntence", cleaned)
        self.assertIn("sentence", cleaned)
        self.assertNotIn("\x00", cleaned)
        self.assertNotIn("   ", cleaned)

    def test_extract_markdown_tables(self):
        table_text = "Item\tPrice\tQuantity\nApple\t$1.00\t10\nBanana\t$0.50\t20"
        md_table = extract_markdown_tables(table_text)
        self.assertIn("| Item | Price | Quantity |", md_table)
        self.assertIn("| --- | --- | --- |", md_table)
        self.assertIn("| Apple | $1.00 | 10 |", md_table)

    def test_async_generate_ai_enhancement(self):
        sample = "Line one with text.\nLine two with more text."
        res = asyncio.run(generate_ai_enhancement(sample, "clean"))
        self.assertIsInstance(res, str)
        self.assertGreater(len(res), 0)


if __name__ == "__main__":
    unittest.main()
