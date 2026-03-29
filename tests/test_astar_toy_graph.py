import unittest

import networkx as nx

from router import astar_route


class AStarToyGraphTests(unittest.TestCase):
    def setUp(self):
        g = nx.MultiDiGraph()
        g.graph["crs"] = "EPSG:4326"

        g.add_node(1, x=80.0000, y=12.0000)
        g.add_node(2, x=80.0010, y=12.0000)
        g.add_node(3, x=80.0020, y=12.0000)
        g.add_node(4, x=80.0010, y=12.0010)

        # Two possible routes 1->2->3 and 1->4->3
        g.add_edge(1, 2, length_m=100.0, risk_score=0.4)
        g.add_edge(2, 3, length_m=100.0, risk_score=0.4)
        g.add_edge(1, 4, length_m=130.0, risk_score=0.1)
        g.add_edge(4, 3, length_m=130.0, risk_score=0.1)

        self.graph = g

    def test_route_exists(self):
        path = astar_route(self.graph, 1, 3, alpha=1.0, beta=0.0)
        self.assertTrue(len(path) >= 2)
        self.assertEqual(path[0], 1)
        self.assertEqual(path[-1], 3)


if __name__ == "__main__":
    unittest.main()
