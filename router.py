"""Pathfinding and geometry utilities for safe routing."""

from __future__ import annotations

import math
from itertools import islice
from typing import Callable, Dict, Iterable, List, Sequence, Tuple

import networkx as nx
import osmnx as ox


class RoutingError(Exception):
    """Base routing error."""


class NoRouteFoundError(RoutingError):
    """Raised when no route exists between source and destination."""


class InvalidNodeError(RoutingError):
    """Raised when an input node does not exist in graph."""


EdgeCostFn = Callable[[int, int, Dict], float]


def nearest_node(graph: nx.MultiDiGraph, lat: float, lon: float) -> int:
    """Return the graph node id nearest to the given latitude/longitude."""
    return int(ox.distance.nearest_nodes(graph, X=lon, Y=lat))


def _is_multiedge_container(edge_data: Dict) -> bool:
    """True when edge_data is {key: attr_dict} for MultiDiGraph parallel edges."""
    if not isinstance(edge_data, dict) or not edge_data:
        return False
    if any(k in edge_data for k in ("length", "length_m", "risk_score", "geometry")):
        return False
    return all(isinstance(v, dict) for v in edge_data.values())


def _iter_edge_attrs(edge_data: Dict) -> Iterable[Dict]:
    if _is_multiedge_container(edge_data):
        return edge_data.values()
    return (edge_data,)


def make_edge_cost_function(alpha: float, beta: float):
    """
    Build cost function: edge_cost = alpha * length_m + beta * risk_score.
    """
    if alpha < 0 or beta < 0:
        raise ValueError("alpha and beta must be non-negative")

    def edge_cost(u: int, v: int, edge_data: Dict) -> float:
        best = math.inf
        for attrs in _iter_edge_attrs(edge_data):
            length = float(attrs.get("length_m", attrs.get("length", 1.0)) or 1.0)
            risk = float(attrs.get("risk_score", 0.0) or 0.0)
            risk = max(0.0, min(1.0, risk))
            cost = alpha * max(length, 0.1) + beta * risk
            if cost < best:
                best = cost
        return best if math.isfinite(best) else 1e12

    return edge_cost


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _straight_line_distance_m(graph: nx.MultiDiGraph, n1: int, n2: int) -> float:
    x1 = float(graph.nodes[n1]["x"])
    y1 = float(graph.nodes[n1]["y"])
    x2 = float(graph.nodes[n2]["x"])
    y2 = float(graph.nodes[n2]["y"])

    # Unprojected graph (lon/lat)
    if abs(x1) <= 180 and abs(y1) <= 90 and abs(x2) <= 180 and abs(y2) <= 90:
        return _haversine_m(y1, x1, y2, x2)

    # Projected graph (meters)
    return math.hypot(x2 - x1, y2 - y1)


def astar_route(
    graph: nx.MultiDiGraph,
    src_node: int,
    dst_node: int,
    alpha: float,
    beta: float,
) -> List[int]:
    """Return A* node path from src_node to dst_node."""
    edge_cost = make_edge_cost_function(alpha, beta)
    return astar_route_with_cost(
        graph=graph,
        src_node=src_node,
        dst_node=dst_node,
        edge_cost=edge_cost,
        heuristic_alpha=alpha,
    )


def astar_route_with_cost(
    graph: nx.MultiDiGraph,
    src_node: int,
    dst_node: int,
    edge_cost: EdgeCostFn,
    heuristic_alpha: float = 1.0,
) -> List[int]:
    """Return A* node path using a caller-provided edge-cost callback."""
    if src_node not in graph or dst_node not in graph:
        raise InvalidNodeError("Source or destination node is not present in graph")

    def heuristic(current: int, target: int) -> float:
        # Admissible when edge costs are non-negative and distance remains lower bound.
        return max(0.0, heuristic_alpha) * _straight_line_distance_m(graph, current, target)

    try:
        path = nx.astar_path(
            graph,
            src_node,
            dst_node,
            heuristic=heuristic,
            weight=edge_cost,
        )
    except nx.NetworkXNoPath as exc:
        raise NoRouteFoundError("No path found between nodes") from exc
    except nx.NodeNotFound as exc:
        raise InvalidNodeError(str(exc)) from exc

    return [int(n) for n in path]


def _pick_best_edge_attrs(
    graph: nx.MultiDiGraph,
    u: int,
    v: int,
    alpha: float = 1.0,
    beta: float = 0.0,
) -> Dict:
    """Pick the best parallel edge between (u,v) under current cost function."""
    edge_bundle = graph.get_edge_data(u, v)
    if not edge_bundle:
        return {}

    if _is_multiedge_container(edge_bundle):
        cost_fn = make_edge_cost_function(alpha, beta)
        best_attrs = None
        best_cost = math.inf
        for attrs in edge_bundle.values():
            c = cost_fn(u, v, attrs)
            if c < best_cost:
                best_cost = c
                best_attrs = attrs
        return best_attrs or {}

    return edge_bundle


def route_geometry(
    graph: nx.MultiDiGraph,
    path_nodes: Sequence[int],
) -> List[Tuple[float, float]]:
    """
    Return route as list of (lat, lon), following edge geometry when available.
    """
    if len(path_nodes) < 2:
        return []

    latlon_points: List[Tuple[float, float]] = []

    for u, v in zip(path_nodes[:-1], path_nodes[1:]):
        attrs = _pick_best_edge_attrs(graph, u, v)
        geom = attrs.get("geometry")

        if geom is not None and hasattr(geom, "coords"):
            seg_lonlat = [(float(x), float(y)) for x, y in geom.coords]
        else:
            seg_lonlat = [
                (float(graph.nodes[u]["x"]), float(graph.nodes[u]["y"])),
                (float(graph.nodes[v]["x"]), float(graph.nodes[v]["y"])),
            ]

        seg_latlon = [(lat, lon) for lon, lat in seg_lonlat]

        if latlon_points and seg_latlon:
            if latlon_points[-1] == seg_latlon[0]:
                latlon_points.extend(seg_latlon[1:])
            else:
                latlon_points.extend(seg_latlon)
        else:
            latlon_points.extend(seg_latlon)

    return latlon_points


def route_stats(graph: nx.MultiDiGraph, path_nodes: Sequence[int]) -> Dict[str, float]:
    """Aggregate distance/risk stats for a node path."""
    if len(path_nodes) < 2:
        return {"distance_m": 0.0, "total_risk": 0.0, "avg_risk": 0.0}

    total_length = 0.0
    total_risk_weighted = 0.0

    for u, v in zip(path_nodes[:-1], path_nodes[1:]):
        attrs = _pick_best_edge_attrs(graph, u, v)
        length = float(attrs.get("length_m", attrs.get("length", 0.0)) or 0.0)
        risk = float(attrs.get("risk_score", 0.0) or 0.0)
        risk = max(0.0, min(1.0, risk))
        total_length += length
        total_risk_weighted += risk * length

    avg_risk = total_risk_weighted / total_length if total_length > 0 else 0.0
    return {
        "distance_m": round(total_length, 1),
        "total_risk": round(total_risk_weighted, 3),
        "avg_risk": round(avg_risk, 4),
    }


def _to_weighted_digraph(
    graph: nx.MultiDiGraph,
    alpha: float,
    beta: float,
) -> nx.DiGraph:
    """Collapse MultiDiGraph to DiGraph with best edge weight for simple path search."""
    weight_fn = make_edge_cost_function(alpha, beta)
    di = nx.DiGraph()
    di.add_nodes_from(graph.nodes())

    for u, v, data in graph.edges(data=True):
        w = weight_fn(u, v, data)
        if di.has_edge(u, v):
            if w < di[u][v]["weight"]:
                di[u][v]["weight"] = w
        else:
            di.add_edge(u, v, weight=w)

    return di


def k_shortest_routes(
    graph: nx.MultiDiGraph,
    src_node: int,
    dst_node: int,
    alpha: float,
    beta: float,
    k: int,
    max_overlap: float = 0.85,
) -> List[List[int]]:
    """
    Return up to k alternative node paths using shortest_simple_paths + overlap filter.
    """
    if k <= 0:
        return []

    if src_node not in graph or dst_node not in graph:
        raise InvalidNodeError("Source or destination node is not present in graph")

    di = _to_weighted_digraph(graph, alpha, beta)

    try:
        generator = nx.shortest_simple_paths(di, src_node, dst_node, weight="weight")
    except nx.NetworkXNoPath as exc:
        raise NoRouteFoundError("No path found between nodes") from exc

    selected: List[List[int]] = []
    selected_edges: List[set[tuple[int, int]]] = []

    for path in islice(generator, 0, max(50, k * 10)):
        node_path = [int(n) for n in path]
        edge_set = set(zip(node_path[:-1], node_path[1:]))

        keep = True
        for prev_set in selected_edges:
            denom = max(1, len(edge_set | prev_set))
            overlap = len(edge_set & prev_set) / denom
            if overlap > max_overlap:
                keep = False
                break

        if keep:
            selected.append(node_path)
            selected_edges.append(edge_set)

        if len(selected) >= k:
            break

    if not selected:
        raise NoRouteFoundError("No alternative routes found")

    return selected
