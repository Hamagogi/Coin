"""Flask 웹 대시보드 — 김프/역프 실시간 표시."""
from __future__ import annotations

import argparse
import os
import threading
import time
from datetime import datetime
from dataclasses import asdict

from flask import Flask, jsonify, render_template

import forex
import overseas
import upbit
from arbitrage import compute_spreads

CACHE_TTL_SECONDS = 5.0

app = Flask(__name__)

_cache_lock = threading.Lock()
_cache: dict = {"ts": 0.0, "payload": None, "error": None}


def _build_snapshot() -> dict:
    upbit_symbols = upbit.fetch_krw_markets()
    upbit_prices = upbit.fetch_tickers(upbit_symbols)
    overseas_source, overseas_prices = overseas.fetch_usdt_tickers()
    usd_krw = forex.fetch_usd_krw()
    spreads = compute_spreads(upbit_prices, overseas_prices, usd_krw)
    spreads.sort(key=lambda s: s.premium_pct, reverse=True)
    return {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "usd_krw": usd_krw,
        "overseas_source": overseas_source,
        "common_count": len(spreads),
        "spreads": [
            {**asdict(s), "direction": s.direction} for s in spreads
        ],
    }


def _get_snapshot() -> tuple[dict | None, str | None]:
    """TTL 캐시로 감싼 스냅샷 조회. (payload, error) 튜플 반환."""
    now = time.time()
    with _cache_lock:
        fresh = _cache["payload"] is not None and now - _cache["ts"] < CACHE_TTL_SECONDS
        if fresh:
            return _cache["payload"], None

    try:
        payload = _build_snapshot()
    except Exception as exc:  # network / API 장애를 UI로 전달
        with _cache_lock:
            _cache["error"] = f"{type(exc).__name__}: {exc}"
        return _cache["payload"], _cache["error"]

    with _cache_lock:
        _cache["ts"] = time.time()
        _cache["payload"] = payload
        _cache["error"] = None
    return payload, None


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/api/spreads")
def api_spreads():
    payload, error = _get_snapshot()
    if payload is None:
        return jsonify({"error": error or "no data yet"}), 503
    response = dict(payload)
    if error:
        response["warning"] = error
    return jsonify(response)


def main() -> None:
    parser = argparse.ArgumentParser(description="김프 웹 대시보드")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", 8000)),
        help="포트 (env PORT 우선)",
    )
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
