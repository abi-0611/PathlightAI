import unittest

from router import make_edge_cost_function


class CostFunctionTests(unittest.TestCase):
    def test_basic_cost_formula(self):
        fn = make_edge_cost_function(alpha=2.0, beta=10.0)
        edge = {"length_m": 50.0, "risk_score": 0.3}
        self.assertAlmostEqual(fn(1, 2, edge), 103.0)

    def test_parallel_edges_uses_best_cost(self):
        fn = make_edge_cost_function(alpha=1.0, beta=100.0)
        parallel = {
            0: {"length_m": 100.0, "risk_score": 0.9},
            1: {"length_m": 120.0, "risk_score": 0.1},
        }
        # edge 1: 120 + 10 = 130 (better than 100 + 90 = 190)
        self.assertAlmostEqual(fn(1, 2, parallel), 130.0)


if __name__ == "__main__":
    unittest.main()
