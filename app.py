"""Minimal FastAPI application for deterministic safe routing."""

from __future__ import annotations

import logging
import math
from contextlib import asynccontextmanager
from typing import Any

import networkx as nx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import DEFAULT_MODE, SUPPORTED_MODES
from graph_builder import load_graph
from router import (
    InvalidNodeError,
    NoRouteFoundError,
    astar_route,
    astar_route_with_cost,
    k_shortest_routes,
    make_edge_cost_function,
    nearest_node,
    route_geometry,
    route_stats,
)
from safety_scoring import assign_default_risk_scores

logger = logging.getLogger("pathlight")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)

_GRAPH_CACHE: dict[str, nx.MultiDiGraph] = {}


def _validate_mode(mode: str) -> str:
    mode = str(mode).lower().strip()
    if mode not in SUPPORTED_MODES:
        raise HTTPException(status_code=400, detail=f"Unsupported mode '{mode}'")
    return mode


def _get_graph(mode: str) -> nx.MultiDiGraph:
    mode = _validate_mode(mode)
    if mode not in _GRAPH_CACHE:
        graph = load_graph(mode=mode, projected=False)
        assign_default_risk_scores(graph)
        _GRAPH_CACHE[mode] = graph
        logger.info(
            "Graph loaded for mode=%s (%d nodes, %d edges)",
            mode,
            graph.number_of_nodes(),
            graph.number_of_edges(),
        )
    return _GRAPH_CACHE[mode]


def _geojson_coords_from_latlon(latlon_points: list[tuple[float, float]]) -> list[list[float]]:
    return [[lon, lat] for lat, lon in latlon_points]


def _bearing(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlon = math.radians(lon2 - lon1)
    x = math.sin(dlon) * math.cos(rlat2)
    y = math.cos(rlat1) * math.sin(rlat2) - math.sin(rlat1) * math.cos(rlat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _turn_label(prev_b: float, cur_b: float) -> str:
    diff = (cur_b - prev_b + 360) % 360
    if diff < 30 or diff > 330:
        return "straight"
    if diff < 70:
        return "slight right"
    if diff < 120:
        return "right"
    if diff < 170:
        return "sharp right"
    if diff <= 190:
        return "U-turn"
    if diff < 240:
        return "sharp left"
    if diff < 290:
        return "left"
    return "slight left"


def _instructions(graph: nx.MultiDiGraph, path_nodes: list[int]) -> list[dict[str, Any]]:
    if len(path_nodes) < 2:
        return []

    points = [[float(graph.nodes[n]["x"]), float(graph.nodes[n]["y"])] for n in path_nodes]
    instructions: list[dict[str, Any]] = [
        {
            "index": 0,
            "point": points[0],
            "direction": "straight",
            "text": "Start",
            "distance_m": 0.0,
        }
    ]

    prev_bearing: float | None = None
    traveled = 0.0

    for i in range(len(points) - 1):
        u, v = path_nodes[i], path_nodes[i + 1]
        edge_bundle = graph.get_edge_data(u, v)
        edge_attrs = {}
        if edge_bundle:
            if isinstance(edge_bundle, dict) and "length" not in edge_bundle and "length_m" not in edge_bundle:
                edge_attrs = next(iter(edge_bundle.values())) if edge_bundle else {}
            else:
                edge_attrs = edge_bundle

        traveled += float(edge_attrs.get("length_m", edge_attrs.get("length", 0.0)) or 0.0)

        cur_bearing = _bearing(
            points[i][0],
            points[i][1],
            points[i + 1][0],
            points[i + 1][1],
        )

        if prev_bearing is not None:
            turn = _turn_label(prev_bearing, cur_bearing)
            if turn != "straight":
                text = f"Turn {turn}"
                instructions.append(
                    {
                        "index": i + 1,
                        "point": points[i + 1],
                        "direction": turn,
                        "text": text,
                        "distance_m": round(traveled, 1),
                    }
                )
                traveled = 0.0

        prev_bearing = cur_bearing

    instructions.append(
        {
            "index": len(points) - 1,
            "point": points[-1],
            "direction": "arrive",
            "text": "You have arrived",
            "distance_m": round(traveled, 1),
        }
    )
    return instructions


def _feature_from_path(
    graph: nx.MultiDiGraph,
    path_nodes: list[int],
    mode_label: str,
    alpha: float,
    beta: float,
) -> dict[str, Any]:
    latlon_points = route_geometry(graph, path_nodes)
    geojson_coords = _geojson_coords_from_latlon(latlon_points)
    stats = route_stats(graph, path_nodes)

    avg_risk = float(stats["avg_risk"])
    avg_crime_risk = round(avg_risk * 10, 2)
    avg_lighting_score = round((1.0 - avg_risk) * 10, 2)

    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": geojson_coords},
        "properties": {
            "mode": mode_label,
            "alpha": alpha,
            "beta": beta,
            "node_count": len(path_nodes),
            "total_length_m": stats["distance_m"],
            "total_risk": stats["total_risk"],
            "avg_risk": stats["avg_risk"],
            "avg_crime_risk": avg_crime_risk,
            "avg_lighting_score": avg_lighting_score,
            "instructions": _instructions(graph, path_nodes),
        },
    }


def _build_balanced_weights(w_light: float, w_crowd: float, w_speed: float) -> tuple[float, float]:
    speed = max(0.0, min(1.0, float(w_speed)))
    safety = max(0.0, min(1.0, (float(w_light) + float(w_crowd)) / 2.0))
    alpha = 0.4 + speed * 1.6
    beta = 40.0 + safety * 220.0
    return alpha, beta


def _path_edges(path: list[int]) -> set[tuple[int, int]]:
    return set(zip(path[:-1], path[1:]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    _get_graph(DEFAULT_MODE)
    yield


app = FastAPI(
    title="PathLight Safe Routing API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/route")
def get_route(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
    alpha: float = Query(1.0, ge=0.0),
    beta: float = Query(100.0, ge=0.0),
    mode: str = Query(DEFAULT_MODE),
) -> dict[str, Any]:
    graph = _get_graph(mode)

    try:
        src = nearest_node(graph, start_lat, start_lon)
        dst = nearest_node(graph, end_lat, end_lon)
        path = astar_route(graph, src, dst, alpha=alpha, beta=beta)
    except NoRouteFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidNodeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("/route failed")
        raise HTTPException(status_code=500, detail="Route calculation failed") from exc

    return _feature_from_path(graph, path, mode_label="Balanced", alpha=alpha, beta=beta)


@app.get("/routes_alt")
def get_routes_alt(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
    alpha: float = Query(1.0, ge=0.0),
    beta: float = Query(100.0, ge=0.0),
    k: int = Query(3, ge=1, le=5),
    mode: str = Query(DEFAULT_MODE),
) -> dict[str, Any]:
    graph = _get_graph(mode)

    try:
        src = nearest_node(graph, start_lat, start_lon)
        dst = nearest_node(graph, end_lat, end_lon)
        paths = k_shortest_routes(graph, src, dst, alpha=alpha, beta=beta, k=k)
    except NoRouteFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidNodeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("/routes_alt failed")
        raise HTTPException(status_code=500, detail="Alternative route calculation failed") from exc

    routes = [
        _feature_from_path(graph, p, mode_label=f"Alternative {i+1}", alpha=alpha, beta=beta)
        for i, p in enumerate(paths)
    ]
    return {"routes": routes}


# Compatibility endpoint for existing frontend.
@app.get("/routes")
def get_routes_compat(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
    w_light: float = Query(0.5, ge=0.0, le=1.0),
    w_crowd: float = Query(0.5, ge=0.0, le=1.0),
    w_speed: float = Query(0.5, ge=0.0, le=1.0),
    is_night: bool = Query(False),
    hour: int = Query(-1),
    mode: str = Query(DEFAULT_MODE),
) -> dict[str, Any]:
    graph = _get_graph(mode)

    balanced_alpha, balanced_beta = _build_balanced_weights(w_light, w_crowd, w_speed)
    # Stronger profile separation so Fastest vs Safest diverges more often.
    profiles = [
        ("Fastest", max(0.1, balanced_alpha * 1.8), max(1.0, balanced_beta * 0.08)),
        ("Safest", max(0.1, balanced_alpha * 0.5), balanced_beta * 3.5),
        ("Balanced", balanced_alpha, balanced_beta),
    ]
    mode_penalty = {
        "Fastest": 1.0,
        "Safest": 2.2,
        "Balanced": 1.6,
    }

    try:
        src = nearest_node(graph, start_lat, start_lon)
        dst = nearest_node(graph, end_lat, end_lon)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Failed to snap start/end to roads") from exc

    alternatives: list[dict[str, Any]] = []
    seen_paths: set[tuple[int, ...]] = set()
    used_edges: set[tuple[int, int]] = set()

    for label, alpha, beta in profiles:
        base_cost = make_edge_cost_function(alpha, beta)
        path: list[int] | None = None
        chosen_penalty = 1.0

        # Try diversified routing first when previous routes exist.
        if used_edges and mode_penalty.get(label, 1.0) > 1.0:
            base_mult = mode_penalty[label]
            for mult in (base_mult, base_mult * 1.4, base_mult * 2.0):
                def penalized_cost(u: int, v: int, edge_data: dict, _base=base_cost, _used=used_edges, _mult=mult) -> float:
                    c = _base(u, v, edge_data)
                    if (u, v) in _used or (v, u) in _used:
                        c *= _mult
                    return c

                try:
                    candidate = astar_route_with_cost(
                        graph=graph,
                        src_node=src,
                        dst_node=dst,
                        edge_cost=penalized_cost,
                        heuristic_alpha=alpha,
                    )
                except NoRouteFoundError:
                    continue

                candidate_key = tuple(candidate)
                path = candidate
                chosen_penalty = mult
                if candidate_key not in seen_paths:
                    break

        # Fallback: regular profile route.
        if path is None:
            try:
                path = astar_route(graph, src, dst, alpha=alpha, beta=beta)
                chosen_penalty = 1.0
            except NoRouteFoundError:
                continue

        key = tuple(path)
        is_duplicate = key in seen_paths
        seen_paths.add(key)

        feature = _feature_from_path(graph, path, mode_label=label, alpha=alpha, beta=beta)
        feature["properties"]["is_duplicate"] = is_duplicate
        feature["properties"]["diversity_penalty"] = round(chosen_penalty, 3)
        feature["properties"]["hour"] = hour
        feature["properties"]["is_night"] = bool(is_night)
        alternatives.append(feature)
        used_edges.update(_path_edges(path))

    if not alternatives:
        raise HTTPException(status_code=404, detail="No routes found between these points")

    return {"alternatives": alternatives}


@app.post("/explain")
def explain_route(payload: dict[str, Any]) -> dict[str, Any]:
    """Lightweight deterministic explanation endpoint for UI compatibility."""
    w_light = float(payload.get("w_light", 0.5) or 0.5)
    w_crowd = float(payload.get("w_crowd", 0.5) or 0.5)
    w_speed = float(payload.get("w_speed", 0.5) or 0.5)
    is_night = bool(payload.get("is_night", False))
    total_length_m = float(payload.get("total_length_m", 0.0) or 0.0)
    avg_crime_risk = float(payload.get("avg_crime_risk", 5.0) or 5.0)
    avg_lighting_score = float(payload.get("avg_lighting_score", 5.0) or 5.0)

    if is_night:
        time_text = "At night"
    else:
        time_text = "In daytime"

    if w_speed >= max(w_light, w_crowd):
        focus = "short travel distance"
    elif w_light >= w_crowd:
        focus = "better-lit streets"
    else:
        focus = "busier streets with more activity"

    explanation = (
        f"{time_text}, this route prioritizes {focus} while staying on mapped road geometry. "
        f"Estimated walk/ride length is {total_length_m:.0f} m, with average risk {avg_crime_risk:.1f}/10 "
        f"and lighting quality {avg_lighting_score:.1f}/10."
    )

    return {
        "explanation": explanation,
        "model_used": "rule-based",
        "is_night": is_night,
    }


@app.get("/heatmap")
def get_heatmap(
    hour: int = Query(12, ge=0, le=23),
    mode: str = Query(DEFAULT_MODE),
) -> dict[str, Any]:
    """Return risk points for a map heat layer (frontend compatibility)."""
    graph = _get_graph(mode)

    # Slightly amplify danger perception at night.
    night_boost = 1.2 if (hour >= 20 or hour <= 5) else 1.0

    features: list[dict[str, Any]] = []
    for u, v, data in graph.edges(data=True):
        risk = float(data.get("risk_score", 0.0) or 0.0)
        danger = min(1.0, max(0.0, risk * night_boost))
        if danger < 0.12:
            continue

        n1 = graph.nodes[u]
        n2 = graph.nodes[v]
        mid_lon = (float(n1["x"]) + float(n2["x"])) / 2
        mid_lat = (float(n1["y"]) + float(n2["y"])) / 2

        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [mid_lon, mid_lat]},
                "properties": {"danger": round(danger, 3)},
            }
        )

    # Keep payload bounded for browser performance.
    if len(features) > 8000:
        step = max(1, math.ceil(len(features) / 8000))
        features = features[::step]

    return {"type": "FeatureCollection", "features": features}
