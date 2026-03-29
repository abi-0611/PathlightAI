"""Graph download, projection, and disk caching utilities."""

from __future__ import annotations

import logging
from typing import Literal

import networkx as nx
import osmnx as ox

from config import (
    DEFAULT_CENTER_LAT,
    DEFAULT_CENTER_LON,
    DEFAULT_RADIUS_M,
    SUPPORTED_MODES,
    graph_path,
)

logger = logging.getLogger("pathlight.graph_builder")

RouteMode = Literal["drive", "walk"]


def _normalize_mode(mode: str) -> str:
    mode = str(mode).lower().strip()
    if mode not in SUPPORTED_MODES:
        raise ValueError(f"Unsupported mode '{mode}'. Use one of: {sorted(SUPPORTED_MODES)}")
    return mode


def _ensure_length_m(graph: nx.MultiDiGraph) -> None:
    """Populate length_m on all edges using OSM length attributes."""
    for _, _, _, data in graph.edges(keys=True, data=True):
        length = data.get("length_m", data.get("length", 0.0))
        try:
            length_val = float(length)
        except (TypeError, ValueError):
            length_val = 0.0
        data["length_m"] = max(length_val, 0.1)


def build_and_save_graph(
    center_lat: float,
    center_lon: float,
    dist_m: int = 5000,
    mode: str = "drive",
) -> None:
    """
    Build OSM graph around a center point and save cached copies.

    Saves two variants:
    - raw (WGS84 lon/lat): best for snapping and route geometry output
    - projected (metric CRS): useful for debugging and metric analysis
    """
    mode = _normalize_mode(mode)

    logger.info(
        "Downloading OSM graph mode=%s center=(%.6f, %.6f) dist=%dm",
        mode,
        center_lat,
        center_lon,
        dist_m,
    )
    raw_graph = ox.graph_from_point(
        (center_lat, center_lon),
        dist=dist_m,
        network_type=mode,
        simplify=True,
    )
    raw_graph.graph["mode"] = mode
    raw_graph.graph["center_lat"] = center_lat
    raw_graph.graph["center_lon"] = center_lon
    raw_graph.graph["radius_m"] = int(dist_m)
    raw_graph.graph["is_projected"] = False
    _ensure_length_m(raw_graph)

    raw_path = graph_path(mode, projected=False)
    ox.save_graphml(raw_graph, raw_path)
    logger.info(
        "Saved raw graph: %s (%d nodes, %d edges)",
        raw_path,
        raw_graph.number_of_nodes(),
        raw_graph.number_of_edges(),
    )

    projected_graph = ox.project_graph(raw_graph)
    projected_graph.graph["mode"] = mode
    projected_graph.graph["center_lat"] = center_lat
    projected_graph.graph["center_lon"] = center_lon
    projected_graph.graph["radius_m"] = int(dist_m)
    projected_graph.graph["is_projected"] = True
    _ensure_length_m(projected_graph)

    projected_path = graph_path(mode, projected=True)
    ox.save_graphml(projected_graph, projected_path)
    logger.info(
        "Saved projected graph: %s (%d nodes, %d edges)",
        projected_path,
        projected_graph.number_of_nodes(),
        projected_graph.number_of_edges(),
    )


def load_graph(mode: str = "drive", projected: bool = False) -> nx.MultiDiGraph:
    """
    Load a cached graph; auto-build if missing.
    """
    mode = _normalize_mode(mode)
    path = graph_path(mode, projected=projected)

    if not path.exists():
        logger.info("Graph cache missing at %s, building it now", path)
        build_and_save_graph(
            center_lat=DEFAULT_CENTER_LAT,
            center_lon=DEFAULT_CENTER_LON,
            dist_m=DEFAULT_RADIUS_M,
            mode=mode,
        )

    graph = ox.load_graphml(path)
    graph.graph["is_projected"] = bool(projected)
    graph.graph.setdefault("mode", mode)
    return graph
