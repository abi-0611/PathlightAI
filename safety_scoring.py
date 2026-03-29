"""Safety risk scoring utilities for OSM edge attributes."""

from __future__ import annotations

from typing import Callable

import networkx as nx

RiskScorer = Callable[[dict], float]


def _normalize_highway(value: object) -> str:
    if isinstance(value, list):
        value = value[0] if value else ""
    return str(value or "").lower().strip()


def _parse_float(value: object, default: float = 0.0) -> float:
    if isinstance(value, list):
        value = value[0] if value else default
    if isinstance(value, str):
        chunk = value.split(";")[0].strip()
        if chunk.endswith("mph"):
            chunk = chunk.replace("mph", "").strip()
            try:
                return float(chunk) * 1.60934
            except ValueError:
                return default
        try:
            return float(chunk)
        except ValueError:
            return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def default_risk_scorer(edge_attrs: dict) -> float:
    """
    Rule-based risk model in [0, 1].

    Heuristics:
    - Smaller local streets are usually calmer than high-speed arterials.
    - Undesignated paths/tracks/service roads are often less safe for predictable travel.
    - Better lighting (lit=yes) slightly reduces risk.
    """
    highway = _normalize_highway(edge_attrs.get("highway"))

    base_by_highway = {
        "motorway": 0.68,
        "trunk": 0.58,
        "primary": 0.48,
        "secondary": 0.38,
        "tertiary": 0.31,
        "unclassified": 0.34,
        "residential": 0.22,
        "living_street": 0.14,
        "service": 0.58,
        "track": 0.80,
        "path": 0.74,
        "footway": 0.46,
        "pedestrian": 0.25,
    }
    risk = base_by_highway.get(highway, 0.35)

    name_val = str(edge_attrs.get("name", "")).strip().lower()
    has_name = name_val not in {"", "none", "nan"}
    if highway == "residential" and not has_name:
        risk += 0.08

    sidewalk = str(edge_attrs.get("sidewalk", "")).strip().lower()
    if sidewalk in {"both", "yes"}:
        risk -= 0.04
    elif sidewalk in {"no", "none"}:
        risk += 0.05

    maxspeed_kmh = _parse_float(edge_attrs.get("maxspeed"), default=30.0)
    if maxspeed_kmh >= 70:
        risk += 0.20
    elif maxspeed_kmh >= 50:
        risk += 0.12
    elif maxspeed_kmh >= 40:
        risk += 0.07

    lanes = _parse_float(edge_attrs.get("lanes"), default=1.0)
    if lanes >= 6:
        risk += 0.16
    elif lanes >= 4:
        risk += 0.10
    elif lanes >= 2:
        risk += 0.05

    lit_val = str(edge_attrs.get("lit", "")).lower().strip()
    if lit_val in {"yes", "24/7"}:
        risk -= 0.08
    elif lit_val in {"no", "limited"}:
        risk += 0.10

    return max(0.0, min(1.0, float(risk)))


def assign_default_risk_scores(
    graph: nx.MultiDiGraph,
    scorer: RiskScorer | None = None,
) -> nx.MultiDiGraph:
    """
    Assign `risk_score` in [0,1] and normalized `length_m` on each edge.

    Useful OSM edge keys often available:
    - highway
    - maxspeed
    - lanes
    - lit
    - name
    - one-way tags
    """
    scorer = scorer or default_risk_scorer

    for _, _, _, edge_attrs in graph.edges(keys=True, data=True):
        length = edge_attrs.get("length_m", edge_attrs.get("length", 0.0))
        try:
            length_m = float(length)
        except (TypeError, ValueError):
            length_m = 0.0
        edge_attrs["length_m"] = max(length_m, 0.1)
        edge_attrs["risk_score"] = float(max(0.0, min(1.0, scorer(edge_attrs))))

    return graph
