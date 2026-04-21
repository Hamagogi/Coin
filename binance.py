"""Binance public API client — USDT 마켓 시세 조회."""
from __future__ import annotations

import requests

BASE_URL = "https://api.binance.com/api/v3"
TIMEOUT = 10


def fetch_usdt_tickers() -> dict[str, float]:
    """USDT 마켓 전 종목의 현재가를 {symbol_base: price} 형태로 반환.

    예: 'BTCUSDT' → {'BTC': 65000.0}. 레버리지 토큰(UP/DOWN/BULL/BEAR)은 제외한다.
    """
    res = requests.get(f"{BASE_URL}/ticker/price", timeout=TIMEOUT)
    res.raise_for_status()

    leverage_suffixes = ("UPUSDT", "DOWNUSDT", "BULLUSDT", "BEARUSDT")
    prices: dict[str, float] = {}
    for row in res.json():
        symbol = row["symbol"]
        if not symbol.endswith("USDT"):
            continue
        if symbol.endswith(leverage_suffixes):
            continue
        base = symbol[:-4]
        prices[base] = float(row["price"])
    return prices
