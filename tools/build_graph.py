"""CLI to build and cache OSM graphs."""

from __future__ import annotations

import argparse

from config import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LON, DEFAULT_RADIUS_M, DEFAULT_MODE
from graph_builder import build_and_save_graph


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and cache OSM graph")
    parser.add_argument("--mode", default=DEFAULT_MODE, choices=["drive", "walk"])
    parser.add_argument("--center-lat", type=float, default=DEFAULT_CENTER_LAT)
    parser.add_argument("--center-lon", type=float, default=DEFAULT_CENTER_LON)
    parser.add_argument("--dist-m", type=int, default=DEFAULT_RADIUS_M)
    args = parser.parse_args()

    build_and_save_graph(
        center_lat=args.center_lat,
        center_lon=args.center_lon,
        dist_m=args.dist_m,
        mode=args.mode,
    )


if __name__ == "__main__":
    main()
