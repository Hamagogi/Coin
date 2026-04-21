"""USD/KRW 환율 조회."""
from __future__ import annotations

import requests

TIMEOUT = 10


def fetch_usd_krw() -> float:
    """USD → KRW 환율을 반환. 1차 소스 실패 시 백업 소스로 폴백한다."""
    # Primary: open.er-api.com (무료, 키 불필요)
    try:
        res = requests.get("https://open.er-api.com/v6/latest/USD", timeout=TIMEOUT)
        res.raise_for_status()
        data = res.json()
        if data.get("result") == "success":
            return float(data["rates"]["KRW"])
    except (requests.RequestException, KeyError, ValueError):
        pass

    # Fallback: exchangerate.host
    res = requests.get(
        "https://api.exchangerate.host/latest",
        params={"base": "USD", "symbols": "KRW"},
        timeout=TIMEOUT,
    )
    res.raise_for_status()
    return float(res.json()["rates"]["KRW"])
