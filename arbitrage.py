"""김치 프리미엄 / 역프리미엄 계산."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Spread:
    symbol: str
    upbit_krw: float
    binance_usdt: float
    binance_krw: float  # USDT 가격을 환율로 환산한 KRW 기준가
    premium_pct: float  # (업비트 - 바이낸스) / 바이낸스 × 100

    @property
    def direction(self) -> str:
        """'KIMP' = 국내가 더 비쌈, 'REVERSE' = 해외가 더 비쌈."""
        return "KIMP" if self.premium_pct >= 0 else "REVERSE"


def compute_spreads(
    upbit_prices: dict[str, float],
    binance_prices: dict[str, float],
    usd_krw: float,
) -> list[Spread]:
    """양 거래소 공통 심볼의 스프레드를 계산해 리스트로 반환."""
    common = set(upbit_prices) & set(binance_prices)
    spreads: list[Spread] = []
    for symbol in common:
        upbit_krw = upbit_prices[symbol]
        binance_usdt = binance_prices[symbol]
        binance_krw = binance_usdt * usd_krw
        if binance_krw <= 0:
            continue
        premium_pct = (upbit_krw - binance_krw) / binance_krw * 100
        spreads.append(
            Spread(
                symbol=symbol,
                upbit_krw=upbit_krw,
                binance_usdt=binance_usdt,
                binance_krw=binance_krw,
                premium_pct=premium_pct,
            )
        )
    return spreads
