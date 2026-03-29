# PathLight Safe Routing Backend

Deterministic street-by-street routing using OSMnx + NetworkX.

## What This Backend Does

- Builds and caches OSM road graphs for a 5 km radius area.
- Assigns a configurable safety `risk_score` (0-1) to every edge.
- Routes with A* using:

  `edge_cost = alpha * length_m + beta * risk_score`

- Returns real road geometry (no straight-line interpolation between endpoints).

## Quick Start

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Build graph cache (drive mode):

```bash
python -m tools.build_graph --mode drive
```

3. Optionally refresh risk scores:

```bash
python -m tools.assign_risk --mode drive
```

4. Run API:

```bash
uvicorn main:app --reload
```

## API Endpoints

- `GET /health`
- `GET /route`
  - Query: `start_lat`, `start_lon`, `end_lat`, `end_lon`, `alpha`, `beta`, `mode`
- `GET /routes_alt`
  - Query: same as `/route` + `k`

Compatibility endpoint for existing frontend:

- `GET /routes`
  - Accepts `w_light`, `w_crowd`, `w_speed` and returns `alternatives`.
- `POST /explain`
  - Returns a deterministic explanation string.
- `GET /heatmap`
  - Returns a FeatureCollection of risk points.

## Example Requests

```bash
curl "http://127.0.0.1:8000/health"
```

```bash
curl "http://127.0.0.1:8000/route?start_lat=12.85309&start_lon=80.05038&end_lat=12.84470&end_lon=80.05938&alpha=1.0&beta=120&mode=drive"
```

```bash
curl "http://127.0.0.1:8000/routes_alt?start_lat=12.85309&start_lon=80.05038&end_lat=12.84470&end_lon=80.05938&alpha=1.0&beta=120&k=3&mode=drive"
```

## Running Tests

```bash
python -m unittest discover -s tests -p "test_*.py"
```
