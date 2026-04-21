"""Upbit public API client — KRW 마켓 시세 조회."""
from __future__ import annotations

import requests

BASE_URL = "https://api.upbit.com/v1"
TIMEOUT = 10


def fetch_krw_markets() -> list[str]:
    """KRW 마켓에 상장된 전체 심볼 목록을 반환 (예: ['BTC', 'ETH', ...])."""
    res = requests.get(f"{BASE_URL}/market/all", params={"isDetails": "false"}, timeout=TIMEOUT)
    res.raise_for_status()
    return [m["market"].split("-")[1] for m in res.json() if m["market"].startswith("KRW-")]


def fetch_tickers(symbols: list[str]) -> dict[str, float]:
    """주어진 심볼들의 현재가(KRW)를 {symbol: price} 형태로 반환.

    Upbit은 markets 파라미터에 한 번에 여러 종목을 받을 수 있으나
    URL 길이 제한을 고려해 100개씩 나눠 요청한다.
    """
    prices: dict[str, float] = {}
    for i in range(0, len(symbols), 100):
        chunk = symbols[i : i + 100]
        markets = ",".join(f"KRW-{s}" for s in chunk)
        res = requests.get(f"{BASE_URL}/ticker", params={"markets": markets}, timeout=TIMEOUT)
        res.raise_for_status()
        for row in res.json():
            symbol = row["market"].split("-")[1]
            prices[symbol] = float(row["trade_price"])
    return prices
