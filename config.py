"""환경변수 기반 설정 — 거래소 referral, 분석 추적, 사이트 메타.

모든 값은 env var로 주입된다. 값이 비어 있으면 referral은 일반 홈페이지 링크로,
분석 스크립트는 삽입되지 않는 식으로 안전하게 폴백한다.
"""
from __future__ import annotations

import os

SITE_URL = os.environ.get("SITE_URL", "https://coin-arbitrage.onrender.com")
SITE_NAME = os.environ.get("SITE_NAME", "김프 모니터")
SITE_DESCRIPTION = (
    "업비트(KRW)와 해외 거래소(Bybit·OKX·Binance) 가격을 실시간 비교해 "
    "김치 프리미엄과 역프리미엄, 수수료 차감 순수익까지 한눈에 보여주는 모니터."
)
SITE_KEYWORDS = (
    "김프,김치프리미엄,비트코인 차익거래,업비트 김프,바이낸스 시세,"
    "Bybit OKX 시세,가상자산 차익거래,역프리미엄"
)

# 분석 스크립트 (비어 있으면 주입 안 됨)
GA_MEASUREMENT_ID = os.environ.get("GA_MEASUREMENT_ID", "")
CLARITY_PROJECT_ID = os.environ.get("CLARITY_PROJECT_ID", "")


# 거래소별 referral 설정.
# ref 값이 비어 있으면 일반 홈/거래 페이지로 링크(수익 없음, 동작은 정상).
_EXCHANGES: dict[str, dict] = {
    "bybit": {
        "name": "Bybit",
        "tagline": "한국 김프 트레이더 인기 1위 · 현물+선물 원클릭",
        "home_template": "https://www.bybit.com/invite?ref={ref}",
        "home_default": "https://www.bybit.com/",
        "spot_template": "https://www.bybit.com/en/trade/spot/{base}/USDT",
        "spot_ref_param": "affiliate_id",
        "ref": os.environ.get("BYBIT_REF", ""),
    },
    "okx": {
        "name": "OKX",
        "tagline": "글로벌 유동성 Top 3 · 김프 루트 안정",
        "home_template": "https://www.okx.com/join/{ref}",
        "home_default": "https://www.okx.com/",
        "spot_template": "https://www.okx.com/trade-spot/{base_lower}-usdt",
        "spot_ref_param": "channelId",
        "ref": os.environ.get("OKX_REF", ""),
    },
    "bitget": {
        "name": "Bitget",
        "tagline": "수수료 환급률 업계 최고 · 카피 트레이딩 특화",
        "home_template": "https://www.bitget.com/register?channelCode={ref}",
        "home_default": "https://www.bitget.com/",
        "spot_template": "https://www.bitget.com/spot/{base}USDT",
        "spot_ref_param": "groupId",
        "ref": os.environ.get("BITGET_REF", ""),
    },
    "binance": {
        "name": "Binance",
        "tagline": "세계 1위 거래소 · 최대 유동성",
        "home_template": "https://accounts.binance.com/register?ref={ref}",
        "home_default": "https://www.binance.com/",
        "spot_template": "https://www.binance.com/en/trade/{base}_USDT",
        "spot_ref_param": "ref",
        "ref": os.environ.get("BINANCE_REF", ""),
    },
    "mexc": {
        "name": "MEXC",
        "tagline": "신규 코인 상장 속도 빠름 · 환급률 우수",
        "home_template": "https://www.mexc.com/register?inviteCode={ref}",
        "home_default": "https://www.mexc.com/",
        "spot_template": "https://www.mexc.com/exchange/{base}_USDT",
        "spot_ref_param": "inviteCode",
        "ref": os.environ.get("MEXC_REF", ""),
    },
}


def exchange_home(key: str) -> str:
    """거래소 가입 페이지 URL (referral 적용)."""
    info = _EXCHANGES.get(key)
    if not info:
        return "#"
    if info["ref"]:
        return info["home_template"].format(ref=info["ref"])
    return info["home_default"]


def exchange_spot(key: str, symbol: str) -> str:
    """특정 코인의 현물 거래 페이지 URL (referral 적용)."""
    info = _EXCHANGES.get(key)
    if not info:
        return "#"
    url = info["spot_template"].format(base=symbol.upper(), base_lower=symbol.lower())
    ref = info["ref"]
    if ref:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}{info['spot_ref_param']}={ref}"
    return url


def exchanges_info() -> list[dict]:
    """템플릿에서 쓰기 쉬운 dict 리스트 반환."""
    return [
        {
            "key": key,
            "name": info["name"],
            "tagline": info["tagline"],
            "home_url": exchange_home(key),
            "has_ref": bool(info["ref"]),
        }
        for key, info in _EXCHANGES.items()
    ]
