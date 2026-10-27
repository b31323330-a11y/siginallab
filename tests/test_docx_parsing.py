import os
import json
import unittest

class TestDocxParsing(unittest.TestCase):
    def setUp(self):
        self.labs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "content", "labs"))
        
    def test_all_20_labs_exist(self):
        for num in range(2, 22):
            path = os.path.join(self.labs_dir, f"{num}.json")
            self.assertTrue(os.path.exists(path), f"Lab file {num}.json does not exist.")
            
    def test_variants_count_and_types(self):
        for num in range(2, 22):
            path = os.path.join(self.labs_dir, f"{num}.json")
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            self.assertEqual(data["lab_number"], num)
            self.assertTrue(len(data["title"]) > 0, f"Lab {num} has empty title.")
            self.assertTrue(len(data["objective"]) > 0, f"Lab {num} has empty objective.")
            self.assertTrue(len(data["theory"]) > 0, f"Lab {num} has empty theory.")
            
            variants = data["variants"]
            self.assertEqual(len(variants), 20, f"Lab {num} must have 20 variants, got {len(variants)}.")
            
            # Check variant sequence 1..20
            var_numbers = [v["variant"] for v in variants]
            self.assertEqual(var_numbers, list(range(1, 21)), f"Lab {num} variant numbers mismatch.")
            
            # Check each variant has parameters
            for v in variants:
                self.assertTrue(isinstance(v["parameters"], dict))
                self.assertTrue(len(v["parameters"]) > 0, f"Lab {num} variant {v['variant']} has empty parameters.")
                
    def test_lab_specific_values(self):
        # Lab 2: Check F1 and F2 for variant 1 (10, 20) and variant 10 (30, 100)
        with open(os.path.join(self.labs_dir, "2.json"), "r", encoding="utf-8") as f:
            l2 = json.load(f)
            v1_params = l2["variants"][0]["parameters"]
            self.assertEqual(v1_params.get("F1"), "10")
            self.assertEqual(v1_params.get("F2"), "20")
            
        # Lab 6: Check x(n) and h(n)
        with open(os.path.join(self.labs_dir, "6.json"), "r", encoding="utf-8") as f:
            l6 = json.load(f)
            v1_params = l6["variants"][0]["parameters"]
            self.assertIn("1", v1_params.get("x_n", ""))
            self.assertEqual(v1_params.get("h_n", ""), "0, 1, 0.5")
            
        # Lab 14: Check original 10 variants mapped to 11..20
        with open(os.path.join(self.labs_dir, "14.json"), "r", encoding="utf-8") as f:
            l14 = json.load(f)
            self.assertEqual(len(l14["variants"]), 20)
            self.assertEqual(l14["variants"][10]["mapped_from"], 1)
            self.assertEqual(l14["variants"][19]["mapped_from"], 10)

if __name__ == "__main__":
    unittest.main()
