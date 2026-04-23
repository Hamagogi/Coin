"""해외 거래소 시세 어그리게이터.

지역 차단(예: Binance 451) / 일시 장애에 대비해 여러 소스를 순서대로 시도하고
첫 번째로 성공한 것의 (이름, 가격 맵)을 반환한다.
"""
from __future__ import annotations

import requests

import binance
import bybit
import okx

_SOURCES: list[tuple[str, callable]] = [
    ("binance", binance.fetch_usdt_tickers),
    ("bybit", bybit.fetch_usdt_tickers),
    ("okx", okx.fetch_usdt_tickers),
]


def fetch_usdt_tickers() -> tuple[str, dict[str, float]]:
    """첫 번째로 성공한 해외 소스의 (이름, {symbol: usdt_price}) 반환."""
    errors: list[str] = []
    for name, fetcher in _SOURCES:
        try:
            prices = fetcher()
            if prices:
                return name, prices
            errors.append(f"{name}:empty")
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            errors.append(f"{name}:HTTP{status}")
        except (requests.RequestException, RuntimeError, ValueError) as exc:
            errors.append(f"{name}:{type(exc).__name__}")
    raise RuntimeError(f"all overseas sources failed ({', '.join(errors)})")
