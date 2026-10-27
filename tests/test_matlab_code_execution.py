import os
import json
import unittest
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.routers.dsp import execute_matlab_code, MatlabExecuteRequest

class TestMatlabCodeExecution(unittest.TestCase):
    def setUp(self):
        self.labs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "content", "labs"))

    def test_all_20_labs_execute_cleanly(self):
        for num in range(2, 22):
            path = os.path.join(self.labs_dir, f"{num}.json")
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertTrue(len(data.get("code_snippets", [])) > 0, f"Lab {num} has no code snippets")
            snip = data["code_snippets"][0]
            res = execute_matlab_code(MatlabExecuteRequest(code=snip))
            self.assertIn("Exit code: 0", res["output"], f"Lab {num} failed to execute:\n{res['output']}")
            self.assertGreaterEqual(len(res["figures"]), 1, f"Lab {num} did not generate any figure")

if __name__ == "__main__":
    unittest.main()

