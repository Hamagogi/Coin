# Coin — Upbit vs Binance 차익거래 모니터

업비트(KRW)와 바이낸스(USDT)의 **공통 상장 코인 전체**를 비교해
김치 프리미엄(국내 > 해외)과 역프리미엄(해외 > 국내)을 실시간 모니터링한다.

모니터링 전용이며, 실제 주문은 수행하지 않는다.

## 설치

```bash
pip install -r requirements.txt
```

## 배포 (퍼블릭 URL)

저장소에 `render.yaml`, `Procfile`, `Dockerfile`이 포함되어 있어 주요 PaaS에서
설정 없이 바로 배포된다.

### Render (가장 쉬움, 무료)

1. <https://render.com> 로그인 → **New +** → **Blueprint**
2. 이 GitHub 저장소 선택 → Apply
3. 수 분 후 `https://<서비스명>.onrender.com` URL 부여

### Railway

1. <https://railway.app> → **New Project** → **Deploy from GitHub**
2. 이 저장소 선택 → `Procfile` 자동 감지
3. **Settings → Networking → Generate Domain**

### Fly.io (CLI)

```bash
curl -L https://fly.io/install.sh | sh
flyctl auth signup        # 또는 login
flyctl launch --now       # Dockerfile 자동 감지, 배포
```

### Google Cloud Run

```bash
gcloud run deploy coin-arbitrage --source . --region=asia-northeast3 --allow-unauthenticated
```

### 로컬 실행

```bash
python app.py                 # http://localhost:8000
python app.py --port 8080     # 포트 변경
gunicorn app:app              # 프로덕션 WSGI (Procfile 과 동일)
```

브라우저에서 접속하면 김프/역프 테이블이 자동 새로고침된다.
방향 필터(김프만/역프만), 최소 |%| 필터, 심볼 검색, 주기 조절, 컬럼 정렬 지원.
백엔드는 5초 TTL 캐시로 거래소 API rate limit을 보호한다.

### CLI

```bash
# 10초마다 폴링, 각 방향 상위 10개 출력
python main.py

# 5초 주기, 절대값 2% 이상만, 각 방향 상위 15개
python main.py --interval 5 --min-abs-pct 2 --top 15

# 1회만 찍고 종료
python main.py --once
```

## 계산식

```
overseas_krw = overseas_usdt * USD/KRW
premium%     = (upbit_krw - overseas_krw) / overseas_krw * 100
net_profit%  = |premium%| - upbit_taker_fee% - overseas_taker_fee%
```

- `premium% > 0` → **김프** (국내가 더 비쌈)
- `premium% < 0` → **역프** (해외가 더 비쌈)
- `net_profit% > 0` 이면 체결 수수료 차감 후 수익 영역

**순수익 모델의 한계**: taker 수수료만 반영한다. 실제 차익거래에서는 다음이
추가로 발생하므로 표시된 순수익은 **상한선**이다.

- 코인별 출금 수수료 (고정 USD 금액, 거래 규모에 따라 bp 변동)
- 블록체인 입출금 지연 동안의 가격 변동 (분~시간)
- KRW ↔ USDT 환전 스프레드 (P2P/OTC 루트)
- 슬리피지, 거래 정지, 입출금 중단 위험

## 데이터 소스

- Upbit REST: `GET /v1/market/all`, `GET /v1/ticker`
- 해외 거래소 폴백 체인: Binance → Bybit → OKX (첫 성공 사용)
- USD/KRW: `open.er-api.com` (1차), `exchangerate.host` (백업)

## 수익화 설정 (환경변수)

모든 항목이 **선택**이다. 미설정 시 기능은 동작하고, 수익만 발생하지 않는다.

### 거래소 Referral 코드

각 거래소에 가입 후 파트너/affiliate 프로그램을 신청하면 코드를 받는다.
Render 대시보드 → Service → **Environment**에 추가:

| 변수 | 거래소 | 신청 페이지 |
|---|---|---|
| `BYBIT_REF` | Bybit | Bybit → Affiliate Program |
| `OKX_REF` | OKX | OKX → Partner Hub |
| `BITGET_REF` | Bitget | Bitget → Partner Program |
| `BINANCE_REF` | Binance | Binance → Affiliate |
| `MEXC_REF` | MEXC | MEXC → Partner Program |

설정되면 상단 CTA 배너·각 코인 "매수" 버튼·가이드 페이지의 가입 링크에
자동으로 referral 파라미터가 붙는다.

### 분석 도구

| 변수 | 용도 | 발급 |
|---|---|---|
| `GA_MEASUREMENT_ID` | Google Analytics 4 | `G-XXXXXXXXXX` 형식 |
| `CLARITY_PROJECT_ID` | Microsoft Clarity (히트맵·세션 리플레이) | 프로젝트 대시보드 |

### 사이트 메타

| 변수 | 기본값 |
|---|---|
| `SITE_URL` | `https://coin-arbitrage.onrender.com` |
| `SITE_NAME` | `김프 모니터` |

## 페이지 구성

| 경로 | 설명 |
|---|---|
| `/` | 실시간 김프/역프 대시보드 |
| `/guide/kimp` | 김치 프리미엄이란? 역사·계산·차익거래 가이드 |
| `/guide/fees` | 주요 거래소 수수료 & 출금비 비교 |
| `/guide/exchanges` | 해외 거래소 추천 & 가입 가이드 (referral 포함) |
| `/api/spreads` | JSON API (5초 TTL 캐시) |
| `/robots.txt`, `/sitemap.xml` | SEO

## 주의

실거래를 연동할 경우 **체결 수수료, 네트워크 수수료, 입출금 지연,
거래 정지/입출금 중단, 슬리피지**를 반드시 고려해야 한다. 이 도구의 수치는
단순한 현재가 기준 괴리율이며 실현 가능 수익이 아니다.
