import sys
import unittest
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.canvas_agent import generate_heuristic_plan


class TestCanvasAgent(unittest.TestCase):
    def test_heuristic_single_step(self):
        # Text-to-PDF / Excel-to-PDF matching
        files = ["data.xlsx"]
        plan = generate_heuristic_plan("convert excel to pdf", files)
        self.assertEqual(len(plan), 1)
        self.assertEqual(plan[0]["actionId"], "excel-to-pdf")
        self.assertEqual(plan[0]["inputs"], ["data.xlsx"])

    def test_heuristic_new_tools(self):
        # HTML-to-PDF and Text-to-PDF matching
        files_html = ["index.html"]
        plan_html = generate_heuristic_plan("convert html to pdf", files_html)
        self.assertEqual(len(plan_html), 1)
        self.assertEqual(plan_html[0]["actionId"], "html-to-pdf")
        self.assertEqual(plan_html[0]["inputs"], ["index.html"])

        files_txt = ["doc.txt"]
        plan_txt = generate_heuristic_plan("convert text to pdf", files_txt)
        self.assertEqual(len(plan_txt), 1)
        self.assertEqual(plan_txt[0]["actionId"], "text-to-pdf")
        self.assertEqual(plan_txt[0]["inputs"], ["doc.txt"])

    def test_heuristic_multi_step_pipeline(self):
        # Complex multi-step conversion and merge pipeline
        files = ["invoice.xlsx", "receipt.png"]
        plan = generate_heuristic_plan(
            "convert the excel to pdf, then convert the image to pdf and merge them",
            files,
        )

        # Step 0: excel-to-pdf (invoice.xlsx)
        # Step 1: image-to-pdf (receipt.png)
        # Step 2: merge-pdf (output:0, output:1)
        self.assertEqual(len(plan), 3)
        self.assertEqual(plan[0]["actionId"], "excel-to-pdf")
        self.assertEqual(plan[0]["inputs"], ["invoice.xlsx"])

        self.assertEqual(plan[1]["actionId"], "image-to-pdf")
        self.assertEqual(plan[1]["inputs"], ["receipt.png"])

        self.assertEqual(plan[2]["actionId"], "merge-pdf")
        self.assertIn("output:0", plan[2]["inputs"])
        self.assertIn("output:1", plan[2]["inputs"])

    def test_heuristic_zip_boundary_auto_unzip(self):
        files = ["document.pdf"]
        plan = generate_heuristic_plan(
            "split the pdf and then convert it to word", files
        )

        # We expect:
        # Step 0: split-pdf (inputs: ["document.pdf"]) -> outputs .zip
        # Step 1: unzip-file (inputs: ["output:0"]) -> outputs .pdf
        # Step 2: pdf-to-word (inputs: ["output:1"]) -> outputs .docx
        self.assertEqual(len(plan), 3)
        self.assertEqual(plan[0]["actionId"], "split-pdf")
        self.assertEqual(plan[1]["actionId"], "unzip-file")
        self.assertEqual(plan[2]["actionId"], "pdf-to-word")
        self.assertEqual(plan[1]["inputs"], ["output:0"])
        self.assertEqual(plan[2]["inputs"], ["output:1"])


if __name__ == "__main__":
    unittest.main()
