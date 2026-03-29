"""Project configuration for the safe routing backend."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
GRAPH_DIR = DATA_DIR / "graphs"

# Keep Guduvancheri as default for compatibility with current project usage.
DEFAULT_CENTER_LAT = float(os.getenv("PATHLIGHT_CENTER_LAT", "12.853091"))
DEFAULT_CENTER_LON = float(os.getenv("PATHLIGHT_CENTER_LON", "80.050384"))
DEFAULT_RADIUS_M = int(os.getenv("PATHLIGHT_RADIUS_M", "5000"))
DEFAULT_MODE = os.getenv("PATHLIGHT_DEFAULT_MODE", "drive")

SUPPORTED_MODES = {"drive", "walk"}


def ensure_data_dirs() -> None:
    """Create required data directories if missing."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GRAPH_DIR.mkdir(parents=True, exist_ok=True)


def graph_path(mode: str, projected: bool = False) -> Path:
    """Return graph cache path for a mode and projection variant."""
    ensure_data_dirs()
    suffix = "projected" if projected else "raw"
    return GRAPH_DIR / f"{mode}_{suffix}.graphml"
