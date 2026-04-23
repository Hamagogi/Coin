"""OKX public API client — SPOT USDT 마켓 시세."""
from __future__ import annotations

import requests

BASE_URL = "https://www.okx.com/api/v5"
TIMEOUT = 10


def fetch_usdt_tickers() -> dict[str, float]:
    """OKX SPOT USDT 페어 전 종목의 현재가를 {symbol_base: price} 형태로 반환."""
    res = requests.get(
        f"{BASE_URL}/market/tickers",
        params={"instType": "SPOT"},
        timeout=TIMEOUT,
    )
    res.raise_for_status()
    data = res.json()
    if data.get("code") != "0":
        raise RuntimeError(f"OKX API error: {data.get('msg')}")

    prices: dict[str, float] = {}
    for row in data.get("data", []):
        inst = row.get("instId", "")
        if not inst.endswith("-USDT"):
            continue
        base = inst[:-5]
        try:
            prices[base] = float(row["last"])
        except (KeyError, ValueError):
            continue
    return prices
