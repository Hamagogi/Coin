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
binance_krw = binance_usdt * USD/KRW
premium%    = (upbit_krw - binance_krw) / binance_krw * 100
```

- `premium% > 0` → **김프** (국내가 더 비쌈)
- `premium% < 0` → **역프** (해외가 더 비쌈)

## 데이터 소스

- Upbit REST: `GET /v1/market/all`, `GET /v1/ticker`
- Binance REST: `GET /api/v3/ticker/price`
- USD/KRW: `open.er-api.com` (1차), `exchangerate.host` (백업)

## 주의

실거래를 연동할 경우 **체결 수수료, 네트워크 수수료, 입출금 지연,
거래 정지/입출금 중단, 슬리피지**를 반드시 고려해야 한다. 이 도구의 수치는
단순한 현재가 기준 괴리율이며 실현 가능 수익이 아니다.
