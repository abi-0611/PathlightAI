"""CLI to assign/update risk scores on cached graphs."""

from __future__ import annotations

import argparse

import osmnx as ox

from config import DEFAULT_MODE, graph_path
from graph_builder import load_graph
from safety_scoring import assign_default_risk_scores


def main() -> None:
    parser = argparse.ArgumentParser(description="Assign risk_score to cached graph")
    parser.add_argument("--mode", default=DEFAULT_MODE, choices=["drive", "walk"])
    args = parser.parse_args()

    graph = load_graph(mode=args.mode, projected=False)
    assign_default_risk_scores(graph)

    path = graph_path(args.mode, projected=False)
    ox.save_graphml(graph, path)
    print(f"Updated risk scores and saved: {path}")


if __name__ == "__main__":
    main()
