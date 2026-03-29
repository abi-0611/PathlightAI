import unittest

import networkx as nx

from router import astar_route


class RiskTradeoffTests(unittest.TestCase):
    def setUp(self):
        g = nx.MultiDiGraph()
        g.graph["crs"] = "EPSG:4326"

        g.add_node(1, x=80.0000, y=12.0000)
        g.add_node(2, x=80.0010, y=12.0000)
        g.add_node(3, x=80.0000, y=12.0010)
        g.add_node(4, x=80.0010, y=12.0010)

        # Short but risky
        g.add_edge(1, 2, length_m=50.0, risk_score=1.0)
        g.add_edge(2, 4, length_m=50.0, risk_score=1.0)

        # Longer but safer
        g.add_edge(1, 3, length_m=80.0, risk_score=0.0)
        g.add_edge(3, 4, length_m=80.0, risk_score=0.0)

        self.graph = g

    def test_higher_beta_prefers_safer_path(self):
        fast_path = astar_route(self.graph, 1, 4, alpha=1.0, beta=0.0)
        safe_path = astar_route(self.graph, 1, 4, alpha=1.0, beta=80.0)

        self.assertEqual(fast_path, [1, 2, 4])
        self.assertEqual(safe_path, [1, 3, 4])


if __name__ == "__main__":
    unittest.main()
