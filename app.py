"""Flask 웹 대시보드 — 김프/역프 실시간 표시 + 콘텐츠 페이지."""
from __future__ import annotations

import argparse
import os
import threading
import time
from datetime import datetime
from dataclasses import asdict

from flask import Flask, Response, jsonify, render_template

import config
import forex
import overseas
import upbit
from arbitrage import compute_spreads

CACHE_TTL_SECONDS = 5.0

app = Flask(__name__)

_cache_lock = threading.Lock()
_cache: dict = {"ts": 0.0, "payload": None, "error": None}


@app.context_processor
def inject_site_globals() -> dict:
    """모든 템플릿에서 쓸 수 있는 사이트 메타·설정 주입."""
    return {
        "site_url": config.SITE_URL,
        "site_name": config.SITE_NAME,
        "site_description": config.SITE_DESCRIPTION,
        "site_keywords": config.SITE_KEYWORDS,
        "ga_id": config.GA_MEASUREMENT_ID,
        "clarity_id": config.CLARITY_PROJECT_ID,
        "exchanges": config.exchanges_info(),
        "exchange_home": config.exchange_home,
        "exchange_spot": config.exchange_spot,
        "refs": {
            "bybit": os.environ.get("BYBIT_REF", ""),
            "okx": os.environ.get("OKX_REF", ""),
            "bitget": os.environ.get("BITGET_REF", ""),
            "binance": os.environ.get("BINANCE_REF", ""),
            "mexc": os.environ.get("MEXC_REF", ""),
        },
    }


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
    except Exception as exc:
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


@app.route("/guide/kimp")
def guide_kimp() -> str:
    return render_template("guide_kimp.html")


@app.route("/guide/fees")
def guide_fees() -> str:
    return render_template("guide_fees.html")


@app.route("/guide/exchanges")
def guide_exchanges() -> str:
    return render_template("guide_exchanges.html")


@app.route("/api/spreads")
def api_spreads():
    payload, error = _get_snapshot()
    if payload is None:
        return jsonify({"error": error or "no data yet"}), 503
    response = dict(payload)
    if error:
        response["warning"] = error
    return jsonify(response)


@app.route("/robots.txt")
def robots() -> Response:
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        f"Sitemap: {config.SITE_URL}/sitemap.xml\n"
    )
    return Response(body, mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap() -> Response:
    pages = ["/", "/guide/kimp", "/guide/fees", "/guide/exchanges"]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    urls = "".join(
        f"<url><loc>{config.SITE_URL}{p}</loc>"
        f"<lastmod>{today}</lastmod>"
        f"<changefreq>{'always' if p == '/' else 'weekly'}</changefreq>"
        f"<priority>{'1.0' if p == '/' else '0.7'}</priority></url>"
        for p in pages
    )
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls}"
        "</urlset>"
    )
    return Response(body, mimetype="application/xml")


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
