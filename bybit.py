"""Bybit public API client — SPOT USDT 마켓 시세."""
from __future__ import annotations

import requests

BASE_URL = "https://api.bybit.com/v5"
TIMEOUT = 10


def fetch_usdt_tickers() -> dict[str, float]:
    """Bybit SPOT USDT 페어 전 종목의 현재가를 {symbol_base: price} 형태로 반환."""
    res = requests.get(
        f"{BASE_URL}/market/tickers",
        params={"category": "spot"},
        timeout=TIMEOUT,
    )
    res.raise_for_status()
    data = res.json()
    if data.get("retCode") != 0:
        raise RuntimeError(f"Bybit API error: {data.get('retMsg')}")

    prices: dict[str, float] = {}
    for row in data.get("result", {}).get("list", []):
        symbol = row.get("symbol", "")
        if not symbol.endswith("USDT"):
            continue
        base = symbol[:-4]
        # 레버리지 토큰 제외 (BTC3L, ETH5S 등)
        if base.endswith(("3L", "3S", "5L", "5S")):
            continue
        try:
            prices[base] = float(row["lastPrice"])
        except (KeyError, ValueError):
            continue
    return prices
