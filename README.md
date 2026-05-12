# brix-flow-test

## SPA 라우트

| 경로 | 설명 |
|---|---|
| `notepad/index.html` | 메모장 |
| `timer/index.html` | 타이머 (mm:ss 카운트다운) |
| `stopwatch/index.html` | 스톱워치 (lap 기록) |
| `kanban/index.html` | 칸반 보드 |
| `pomodoro/index.html` | 뽀모도로 (BF-432) |
| **`weather/index.html`** | **날씨 카드 (BF-438) — 도시 추가/메모/정렬/다크 우선** |
| **`clicker/index.html`** | **클릭 카운터 (BF-443) — 점수/best/리셋/전체 초기화/다크 우선** |

---

## /pomodoro (BF-432)

25분 FOCUS / 5분 SHORT_BREAK / 4사이클마다 15분 LONG_BREAK 의 뽀모도로 타이머 SPA.
디자인 명세: [`docs/design/pomodoro-BF-430.md`](docs/design/pomodoro-BF-430.md)

### 열기

```sh
# 1) 직접 열기 (file:// — CORS 안전)
open pomodoro/index.html       # macOS
xdg-open pomodoro/index.html   # Linux

# 2) 또는 정적 서버
python3 -m http.server 8080
# → http://localhost:8080/pomodoro/
```

> 외부 CDN·module import·`fetch()` self-load 0건이므로 정적 서버 없이 `file://` 로
> 직접 열어도 동작합니다. DevTools console 의 CORS 에러도 0건입니다.

### 컨트롤

| 동작 | 마우스 | 키보드 |
|---|---|---|
| 시작 / 일시정지 / 재개 | `▶ Start` / `⏸ Pause` 버튼 | `Space` |
| 리셋 (현재 모드 시간만, 사이클 유지) | `⟲ Reset` | `R` |
| Skip (현재 모드 종료 → 다음 모드 자동 진입) | `⤼ Skip` | `S` |
| 테마 토글 (다크 ↔ 라이트) | topbar 우측 `🌙` / `☀` | `T` |

- 첫 진입 시 (`localStorage["bf-theme"]` 미저장) **다크** 강제 — "집중 모드" 시각 시그널 (명세 §6.6)
- 한 번 토글하면 저장값이 생성되어 이후 모든 SPA (`notepad`/`timer`/`stopwatch`/`kanban`) 와 동기

### 사이클 흐름

1. **FOCUS 25:00** (cycle 1) → 0:00 도달
2. 자동으로 **SHORT_BREAK 5:00** 진입 + 토스트 알림
3. SHORT_BREAK 종료 → **FOCUS** (cycle 2)
4. … 4번째 FOCUS 종료 후 → **LONG_BREAK 15:00** (cycle 완료 표시)
5. LONG_BREAK 종료 → **FOCUS** (cycle 1, wrap)

### 알림

- **인앱 toast 만** 사용합니다. Web Notification API / 시스템 푸시 / 사운드 0건 (명세 §1.3).
- 화면 우하단에 3.5초간 노출됩니다.

### 오늘 누적 집중 시간

- topbar 우측 "오늘 N분" 라벨에 FOCUS 동안 흐른 시간이 분 단위로 누적됩니다.
- **로컬 시간 자정 (00:00)** 경계에서 자동으로 0 으로 리셋됩니다 (`localStorage["pomodoro:stats"]` 의 `date` 가 오늘과 다르면 새 날 시작).
- 30초 간격으로 라벨이 신선도 갱신됩니다 (자정 경계 검사 포함).

### 새로고침 복원

- 페이지를 새로고침하면 모드 / 사이클 / 남은 시간이 복원됩니다.
- `running` 중이었던 경우 보수적으로 `paused` 로 복원합니다 (백그라운드 동작 정확성 보장 불가).

### localStorage 키 (prefix `pomodoro:`)

| 키 | 형식 | 비고 |
|---|---|---|
| `pomodoro:state` | `{ mode, phase, currentCycle, remainingMs, savedAtMs }` | 새로고침 복원용 |
| `pomodoro:stats` | `{ date: "YYYY-MM-DD", focusMsToday }` | 오늘 누적 집중 시간 |
| `pomodoro:debug:speed` | 양수 (default `1`) | 개발용 시뮬레이션 가속 — 예: `60` 설정 시 1초가 60초처럼 진행 |
| `bf-theme` | `"dark"` / `"light"` | **본 prefix 밖** — 다른 SPA 와 공유 |

### 개발용 시뮬레이션

LONG_BREAK 자동 진입을 빠르게 검증하려면:

```js
// DevTools console
localStorage.setItem("pomodoro:debug:speed", "60");
location.reload();
// 이제 1초가 60초처럼 흐릅니다 → FOCUS 25분이 ~25초로 단축
```

해제: `localStorage.removeItem("pomodoro:debug:speed")`

### 단위 테스트

```sh
# pomodoro 모듈만
BRIX_TEST_SCOPE=focused BRIX_TEST_MODULE=pomodoro \
  node --test tests/pomodoro-*.test.js

# 또는 npm script
npm test -- tests/pomodoro-*.test.js
```

- `tests/pomodoro-timer.test.js` — 순수 로직 (모드 전이, 자정 리셋, 포맷)
- `tests/pomodoro-storage.test.js` — localStorage 추상 (state/stats round-trip, prefix 격리)
- `pomodoro/` 디렉토리는 비-module (UMD) 패턴 — `createRequire(import.meta.url)` 로 로드합니다.

---

---

## /weather (BF-438)

도시별 현재 날씨 카드 grid SPA — 도시 추가·메모 인라인 편집·삭제 모달·정렬 토글·다크 우선 테마.
디자인 명세: [`docs/design/weather-BF-435.md`](docs/design/weather-BF-435.md)

### 열기

```sh
# 1) 직접 열기 (file:// — CORS 안전)
open weather/index.html       # macOS
xdg-open weather/index.html   # Linux

# 2) 또는 정적 서버
python3 -m http.server 8080
# → http://localhost:8080/weather/
```

> 외부 CDN·module import·`fetch()` self-load 0건. DevTools console 의 에러도 0건입니다.

### 컨트롤

| 동작 | 마우스 | 키보드 |
|---|---|---|
| 도시 카드 추가 | 폼 `＋ 추가` 버튼 | 폼 안에서 `Enter` |
| 메모 인라인 편집 | 메모 영역 클릭 | 메모 영역 focus 후 `Enter` |
| 편집 저장 / 취소 | textarea 외부 클릭 = 저장 | `Enter` 저장 / `Esc` 취소 |
| 카드 삭제 | 카드 우상단 `×` → 모달 `삭제` | 모달 focus 후 `Enter` 확정 / `Esc` 취소 |
| 정렬 토글 (최신순 ↔ 가나다) | topbar 아래 `⇅ 최신순` 칩 | — |
| 테마 토글 (다크 ↔ 라이트) | topbar 우측 `🌙` / `☀` | `T` |

- 첫 진입 시 (`localStorage["bf-theme"]` 미저장) **다크** 강제 (명세 §6.5)
- 한 번 토글하면 저장값이 생성되어 이후 모든 SPA (`notepad`/`timer`/`stopwatch`/`kanban`/`pomodoro`) 와 동기

### 새로고침 복원

- 카드·정렬 모드·테마 모두 복원됩니다.
- 메모 편집 중인 상태는 복원하지 않습니다 (의도적 — 부분 입력 잔존 방지).

### localStorage 키 (prefix `weather:`)

| 키 | 형식 | 비고 |
|---|---|---|
| `weather:<ulid>` | `{ id, city, emoji, memo, state, createdAt, updatedAt }` | 카드 1건 = 1 entry |
| `weather:__sort__` | `"updated-desc"` / `"city-asc"` | 정렬 모드 |
| `bf-theme` | `"dark"` / `"light"` | **본 prefix 밖** — 다른 SPA 와 공유 |

### 단위 테스트

```sh
# weather 모듈만 (focused scope)
BRIX_TEST_SCOPE=focused node --test tests/weather-*.test.js
```

- `tests/weather-storage.test.js` — storage 추상 (CRUD round-trip, prefix 격리, ulid)
- `tests/weather-integration.test.js` — 복원 시나리오 + 정적 회귀 가드 (결함 A~O)

---

## 전체 테스트

```sh
npm test
```
