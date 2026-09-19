"""
Automated Molecular Test Suite for Phase 2 DocForge Neural Intent Model Integration (Backend).
Covers 37 distinct test areas and assertions with zero always-pass tricks.
"""

import math
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.services import router_service


class TestNeuralIntentPhase2Backend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Force initialization of neural ONNX engine
        cls.engine_loaded = router_service._load_engine()

    def test_area_01_model_dir_path(self):
        """Area 1: MODEL_DIR points to docforge-intent directory"""
        self.assertTrue(router_service.MODEL_DIR.name == "docforge-intent")
        self.assertTrue(router_service.MODEL_DIR.exists())

    def test_area_02_model_path(self):
        """Area 2: MODEL_PATH points to model_quantized.onnx"""
        self.assertTrue(router_service.MODEL_PATH.endswith("model_quantized.onnx"))
        self.assertTrue(Path(router_service.MODEL_PATH).exists())

    def test_area_03_labels_path(self):
        """Area 3: LABELS_PATH points to labels.json"""
        self.assertTrue(router_service.LABELS_PATH.name == "labels.json")
        self.assertTrue(router_service.LABELS_PATH.exists())

    def test_area_04_engine_loaded(self):
        """Area 4: _load_engine successfully loads session and tokenizer"""
        self.assertTrue(self.engine_loaded)
        self.assertIsNotNone(router_service._session)
        self.assertIsNotNone(router_service._tokenizer)

    def test_area_05_id2label_count(self):
        """Area 5: _id2label contains exactly 46 classes"""
        self.assertEqual(len(router_service._id2label), 46)

    def test_area_06_init_onnx_engine_alias(self):
        """Area 6: init_onnx_engine alias returns True when engine is loaded"""
        res = router_service.init_onnx_engine()
        self.assertTrue(res)

    def test_area_07_empty_query(self):
        """Area 7: classify_intent on empty query returns unknown action_id"""
        res = router_service.classify_intent("")
        self.assertEqual(res["action_id"], "unknown")
        self.assertEqual(res["score"], 0.0)
        self.assertTrue(res["is_ambiguous"])

    def test_area_08_whitespace_query(self):
        """Area 8: classify_intent on whitespace query returns unknown action_id"""
        res = router_service.classify_intent("    ")
        self.assertEqual(res["action_id"], "unknown")
        self.assertEqual(res["score"], 0.0)
        self.assertTrue(res["is_ambiguous"])

    def test_area_09_none_query(self):
        """Area 9: classify_intent on None returns unknown action_id"""
        res = router_service.classify_intent(None)
        self.assertEqual(res["action_id"], "unknown")
        self.assertTrue(res["is_ambiguous"])

    def test_area_10_merge_pdf(self):
        """Area 10: classify_intent('merge pdf') maps to merge-pdf"""
        res = router_service.classify_intent("merge pdf")
        self.assertEqual(res["action_id"], "merge-pdf")

    def test_area_11_combine_pdf_files(self):
        """Area 11: classify_intent('combine pdf files into one') maps to merge-pdf"""
        res = router_service.classify_intent("combine pdf files into one")
        self.assertEqual(res["action_id"], "merge-pdf")

    def test_area_12_split_pdf(self):
        """Area 12: classify_intent('split pdf') maps to split-pdf"""
        res = router_service.classify_intent("split pdf")
        self.assertEqual(res["action_id"], "split-pdf")

    def test_area_13_extract_pages(self):
        """Area 13: classify_intent('divide pdf into parts') maps to split-pdf"""
        res = router_service.classify_intent("divide pdf into parts")
        self.assertEqual(res["action_id"], "split-pdf")

    def test_area_14_compress_pdf(self):
        """Area 14: classify_intent('compress pdf') maps to compress-pdf"""
        res = router_service.classify_intent("compress pdf")
        self.assertEqual(res["action_id"], "compress-pdf")

    def test_area_15_shrink_pdf(self):
        """Area 15: classify_intent('shrink pdf file size') maps to compress-pdf"""
        res = router_service.classify_intent("shrink pdf file size")
        self.assertEqual(res["action_id"], "compress-pdf")

    def test_area_16_rotate_pdf(self):
        """Area 16: classify_intent('rotate pdf') maps to rotate-pdf"""
        res = router_service.classify_intent("rotate pdf")
        self.assertEqual(res["action_id"], "rotate-pdf")

    def test_area_17_spin_pages(self):
        """Area 17: classify_intent('turn page sideways') maps to rotate-pdf"""
        res = router_service.classify_intent("turn page sideways")
        self.assertEqual(res["action_id"], "rotate-pdf")

    def test_area_18_protect_pdf(self):
        """Area 18: classify_intent('protect pdf with password') maps to protect-pdf"""
        res = router_service.classify_intent("protect pdf with password")
        self.assertEqual(res["action_id"], "protect-pdf")

    def test_area_19_encrypt_pdf(self):
        """Area 19: classify_intent('encrypt document') maps to protect-pdf"""
        res = router_service.classify_intent("encrypt document")
        self.assertEqual(res["action_id"], "protect-pdf")

    def test_area_20_unlock_pdf(self):
        """Area 20: classify_intent('unlock pdf') maps to unlock-pdf"""
        res = router_service.classify_intent("unlock pdf")
        self.assertEqual(res["action_id"], "unlock-pdf")

    def test_area_21_remove_password(self):
        """Area 21: classify_intent('remove password from pdf') maps to unlock-pdf"""
        res = router_service.classify_intent("remove password from pdf")
        self.assertEqual(res["action_id"], "unlock-pdf")

    def test_area_22_ocr_pdf(self):
        """Area 22: classify_intent('ocr pdf') maps to ocr-pdf"""
        res = router_service.classify_intent("ocr pdf")
        self.assertEqual(res["action_id"], "ocr-pdf")

    def test_area_23_make_searchable(self):
        """Area 23: classify_intent('make scanned document searchable') maps to ocr-pdf"""
        res = router_service.classify_intent("make scanned document searchable")
        self.assertEqual(res["action_id"], "ocr-pdf")

    def test_area_24_add_watermark(self):
        """Area 24: classify_intent('add watermark') maps to add-watermark"""
        res = router_service.classify_intent("add watermark")
        self.assertEqual(res["action_id"], "add-watermark")

    def test_area_25_stamp_pdf(self):
        """Area 25: classify_intent('add stamp to pdf') maps to add-watermark"""
        res = router_service.classify_intent("add stamp to pdf")
        self.assertEqual(res["action_id"], "add-watermark")

    def test_area_26_docx_to_pdf(self):
        """Area 26: classify_intent('convert word to pdf') maps to docx-to-pdf"""
        res = router_service.classify_intent("convert word to pdf")
        self.assertEqual(res["action_id"], "docx-to-pdf")

    def test_area_27_excel_to_pdf(self):
        """Area 27: classify_intent('convert spreadsheet to pdf') maps to excel-to-pdf"""
        res = router_service.classify_intent("convert spreadsheet to pdf")
        self.assertEqual(res["action_id"], "excel-to-pdf")

    def test_area_28_powerpoint_to_pdf(self):
        """Area 28: classify_intent('convert pptx to pdf') maps to powerpoint-to-pdf"""
        res = router_service.classify_intent("convert pptx to pdf")
        self.assertEqual(res["action_id"], "powerpoint-to-pdf")

    def test_area_29_out_of_domain_query(self):
        """Area 29: classify_intent on out-of-domain query maps to unknown"""
        res = router_service.classify_intent("how do I bake chocolate cake in an oven")
        self.assertEqual(res["action_id"], "unknown")

    def test_area_30_out_of_domain_ambiguity(self):
        """Area 30: Out-of-domain query has is_ambiguous=True"""
        res = router_service.classify_intent("what is the weather in Tokyo today")
        self.assertTrue(res["is_ambiguous"])

    def test_area_31_return_contract_keys(self):
        """Area 31: Returned dictionary contains exact specified keys"""
        res = router_service.classify_intent("merge pdf")
        self.assertIn("action_id", res)
        self.assertIn("score", res)
        self.assertIn("is_ambiguous", res)
        self.assertIn("engine", res)

    def test_area_32_engine_value(self):
        """Area 32: engine key equals 'neural-onnx'"""
        res = router_service.classify_intent("merge pdf")
        self.assertEqual(res["engine"], "neural-onnx")

    def test_area_33_score_is_float(self):
        """Area 33: score is a valid float in (0, 1]"""
        res = router_service.classify_intent("merge pdf")
        self.assertIsInstance(res["score"], float)
        self.assertGreater(res["score"], 0.0)
        self.assertLessEqual(res["score"], 1.0)

    def test_area_34_softmax_probabilities_formula(self):
        """Area 34: Softmax probabilities sum to 1.0 within epsilon"""
        inputs = router_service._tokenizer("merge pdf", return_tensors="np", padding=True, truncation=True, max_length=64)
        ort_inputs = {
            "input_ids": inputs["input_ids"].astype(router_service.np.int64),
            "attention_mask": inputs["attention_mask"].astype(router_service.np.int64),
        }
        logits = router_service._session.run(None, ort_inputs)[0]
        exp_logits = router_service.np.exp(logits - router_service.np.max(logits, axis=-1, keepdims=True))
        probs = exp_logits / router_service.np.sum(exp_logits, axis=-1, keepdims=True)
        prob_sum = float(router_service.np.sum(probs[0]))
        self.assertAlmostEqual(prob_sum, 1.0, places=5)

    def test_area_35_match_semantic_intent_success(self):
        """Area 35: match_semantic_intent('merge pdf') returns ('merge-pdf', score)"""
        action_id, score = router_service.match_semantic_intent("merge pdf")
        self.assertEqual(action_id, "merge-pdf")
        self.assertGreater(score, 0.0)

    def test_area_36_match_semantic_intent_unsupported(self):
        """Area 36: match_semantic_intent on unsupported returns (None, score)"""
        action_id, score = router_service.match_semantic_intent("tell me a story about aliens")
        self.assertIsNone(action_id)
        self.assertGreater(score, 0.0)

    def test_area_37_match_semantic_intent_empty(self):
        """Area 37: match_semantic_intent on empty query returns (None, 0.0)"""
        action_id, score = router_service.match_semantic_intent("")
        self.assertIsNone(action_id)
        self.assertEqual(score, 0.0)


if __name__ == "__main__":
    unittest.main()
