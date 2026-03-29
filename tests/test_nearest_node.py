import unittest

import networkx as nx

from router import nearest_node


class NearestNodeTests(unittest.TestCase):
    def test_nearest_node_returns_expected_id(self):
        g = nx.MultiDiGraph()
        g.graph["crs"] = "EPSG:4326"

        g.add_node(100, x=80.0000, y=12.0000)
        g.add_node(200, x=80.0100, y=12.0100)
        g.add_edge(100, 200, length_m=1000.0, risk_score=0.2)

        node = nearest_node(g, lat=12.0001, lon=80.0002)
        self.assertEqual(node, 100)


if __name__ == "__main__":
    unittest.main()
