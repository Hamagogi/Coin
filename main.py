"""Upbit vs 해외 거래소 차익거래 모니터링 루프."""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime

import requests

import forex
import overseas
import upbit
from arbitrage import Spread, compute_spreads


def format_krw(value: float) -> str:
    return f"{value:>14,.2f}"


def format_usdt(value: float) -> str:
    return f"{value:>12,.4f}"


def render(
    spreads: list[Spread],
    usd_krw: float,
    source: str,
    top: int,
    min_abs_pct: float,
) -> str:
    filtered = [s for s in spreads if abs(s.premium_pct) >= min_abs_pct]
    filtered.sort(key=lambda s: s.premium_pct, reverse=True)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header = (
        f"[{now}] USD/KRW={usd_krw:,.2f}  overseas={source.upper()}  "
        f"common={len(spreads)}  shown={min(len(filtered), top * 2)}"
    )
    src = source.upper()[:7]
    col_header = (
        f"{'SYMBOL':<8} {'DIR':<7} {'PREM%':>8}  "
        f"{'UPBIT(KRW)':>14}  {src + '(USDT)':>13}  {src + '(KRW)':>14}"
    )

    def row(s: Spread) -> str:
        return (
            f"{s.symbol:<8} {s.direction:<7} {s.premium_pct:>+7.2f}%  "
            f"{format_krw(s.upbit_krw)}  {format_usdt(s.binance_usdt)}  "
            f"{format_krw(s.binance_krw)}"
        )

    top_kimp = filtered[:top]
    top_reverse = sorted(
        [s for s in filtered if s.premium_pct < 0], key=lambda s: s.premium_pct
    )[:top]

    lines = [header, "-" * len(col_header), col_header, "-" * len(col_header)]
    lines.append(f"[김프 TOP {top}]  (국내 > 해외)")
    lines.extend(row(s) for s in top_kimp) if top_kimp else lines.append("  (없음)")
    lines.append("")
    lines.append(f"[역프 TOP {top}]  (해외 > 국내)")
    lines.extend(row(s) for s in top_reverse) if top_reverse else lines.append("  (없음)")
    lines.append("")
    return "\n".join(lines)


def run_once(top: int, min_abs_pct: float) -> None:
    upbit_symbols = upbit.fetch_krw_markets()
    upbit_prices = upbit.fetch_tickers(upbit_symbols)
    source, overseas_prices = overseas.fetch_usdt_tickers()
    usd_krw = forex.fetch_usd_krw()
    spreads = compute_spreads(upbit_prices, overseas_prices, usd_krw)
    print(render(spreads, usd_krw, source, top, min_abs_pct))


def main() -> int:
    parser = argparse.ArgumentParser(description="Upbit vs 해외 거래소 김프/역프 모니터")
    parser.add_argument("--interval", type=float, default=10.0, help="폴링 주기(초)")
    parser.add_argument("--top", type=int, default=10, help="각 방향 표시 개수")
    parser.add_argument(
        "--min-abs-pct",
        type=float,
        default=0.0,
        help="절대값 기준 최소 프리미엄(%)",
    )
    parser.add_argument("--once", action="store_true", help="1회만 실행 후 종료")
    args = parser.parse_args()

    if args.once:
        run_once(args.top, args.min_abs_pct)
        return 0

    while True:
        try:
            run_once(args.top, args.min_abs_pct)
        except requests.RequestException as exc:
            print(f"[warn] network error: {exc}", file=sys.stderr)
        except KeyboardInterrupt:
            print("\nstopped.")
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main())
