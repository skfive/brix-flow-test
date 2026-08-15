# brix-flow-test

vanilla HTML/CSS/JS 기반 게임 · 유틸리티 SPA 모음 저장소입니다. 각 앱은 독립된 최상위
디렉터리에서 `index.html` 하나로 동작하며, `file://` 직접 열기와 정적 서버 서빙을 모두
지원합니다.

## 빠른 시작 (Quick Start)

```sh
npm install        # http-server devDependency 설치 (최초 1회)
npm start          # → http://localhost:8888/ 기동
# 예: http://localhost:8888/pomodoro/
```

또는 정적 서버 없이 `<app>/index.html`을 브라우저로 직접 열어도 동작합니다 (module script
미사용 — BF-522).

## 앱 인벤토리

전체 앱 디렉터리는 85개이며, 그중 게임 · 유틸리티 카테고리(아래 표)만 1차 인벤토리로
관리합니다. brix-Flow 자체 검증용 canary/phase 모듈, 특이 스택(`kanban-board`), 디자인
mockup 잔존 `.html` 파일, 공용 인프라 디렉터리는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)를
참고하세요.

실행은 공통으로 `<app>/index.html`을 직접 열거나 `npm start` 후
`http://localhost:8888/<app>/`으로 접속합니다.

| 앱 | 경로 | 설명 |
|---|---|---|
| a11y-counter | [a11y-counter/](a11y-counter/) | 접근성(a11y) 카운터 데모 |
| addiction-mini | [addiction-mini/](addiction-mini/) | 습관 체크 미니 유틸리티 (이름 기반 추정) |
| baseball | [baseball/](baseball/) | 숫자 야구 게임 |
| calculator | [calculator/](calculator/) | 계산기 |
| canvas-tower-defense | [canvas-tower-defense/](canvas-tower-defense/) | Canvas 기반 타워 디펜스 게임 |
| cascade-check-0808 | [cascade-check-0808/](cascade-check-0808/) | 회귀/연쇄 검증용 픽스처로 추정 (이름 기반 추정, 미확인) |
| clicker | [clicker/](clicker/) | 클릭 카운터 (BF-443) — 점수/best/리셋/전체 초기화/다크 우선 |
| color-switch | [color-switch/](color-switch/) | 컬러 스위치 게임 |
| contrast-checker | [contrast-checker/](contrast-checker/) | 색상 대비(contrast) 검사 유틸리티 |
| dice | [dice/](dice/) | 주사위 굴리기 |
| dom-rhythm-tap | [dom-rhythm-tap/](dom-rhythm-tap/) | DOM 기반 리듬 탭 게임 |
| duration-converter | [duration-converter/](duration-converter/) | 시간 단위 변환기 |
| fifteen-puzzle | [fifteen-puzzle/](fifteen-puzzle/) | 15퍼즐 게임 |
| game-2048 | [game-2048/](game-2048/) | 2048 게임 |
| guess-number | [guess-number/](guess-number/) | 숫자 맞히기 게임 |
| habit-tracker | [habit-tracker/](habit-tracker/) | 습관 트래커 |
| isolation-check-color-guess | [isolation-check-color-guess/](isolation-check-color-guess/) | 격리/색상 추측 검증용 픽스처로 추정 (이름 기반 추정, 미확인) |
| iteration-check | [iteration-check/](iteration-check/) | 반복(iteration) 검증용 픽스처로 추정 (이름 기반 추정, 미확인) |
| iteration-check2 | [iteration-check2/](iteration-check2/) | 반복(iteration) 검증용 픽스처로 추정 (이름 기반 추정, 미확인) |
| iteration-check3 | [iteration-check3/](iteration-check3/) | 반복(iteration) 검증용 픽스처로 추정 (이름 기반 추정, 미확인) |
| kanban | [kanban/](kanban/) | 칸반 보드 (vanilla) — `kanban-board/`(Vite+React)와 별개, [ARCHITECTURE §1.3](docs/ARCHITECTURE.md#13-특이-스택-앱-kanban-board-vite-react-vitest) 참고 |
| local-iso-number-baseball | [local-iso-number-baseball/](local-iso-number-baseball/) | 로컬/격리 숫자 야구 변형 픽스처로 추정 (이름 기반 추정, 미확인) |
| markdown-preview | [markdown-preview/](markdown-preview/) | 마크다운 미리보기 |
| memory | [memory/](memory/) | 메모리(짝맞추기) 카드 게임 |
| minesweeper | [minesweeper/](minesweeper/) | 지뢰찾기 |
| notepad | [notepad/](notepad/) | 메모장 |
| number-guess | [number-guess/](number-guess/) | 숫자 추측 게임 |
| palette | [palette/](palette/) | 색상 팔레트 도구 |
| password-strength | [password-strength/](password-strength/) | 비밀번호 강도 검사기 |
| phaser-brick-blitz | [phaser-brick-blitz/](phaser-brick-blitz/) | Phaser 기반 벽돌깨기 게임 |
| phaser-endless-runner | [phaser-endless-runner/](phaser-endless-runner/) | Phaser 기반 엔들리스 러너 |
| phaser-memory-match | [phaser-memory-match/](phaser-memory-match/) | Phaser 기반 카드 매칭 게임 |
| phaser-space-defender | [phaser-space-defender/](phaser-space-defender/) | Phaser 기반 우주 방어 게임 |
| phaser-star-collector | [phaser-star-collector/](phaser-star-collector/) | Phaser 기반 별 수집 게임 |
| pixi-breakout | [pixi-breakout/](pixi-breakout/) | Pixi.js 기반 벽돌깨기 게임 |
| pixi-shooter | [pixi-shooter/](pixi-shooter/) | Pixi.js 기반 슈팅 게임 |
| pomodoro | [pomodoro/](pomodoro/) | 뽀모도로 타이머 (BF-432) — 25/5/15분 사이클, [디자인 명세](docs/design/pomodoro-BF-430.md) |
| quiz-card | [quiz-card/](quiz-card/) | 퀴즈 카드 |
| rps | [rps/](rps/) | 가위바위보 게임 |
| snake | [snake/](snake/) | 스네이크 게임 (pixi/canvas2d 백엔드 선택 — `?backend=pixi`) |
| snake-game | [snake-game/](snake-game/) | 스네이크 게임 변형 — `snake/`와의 관계 미확인 |
| stopwatch | [stopwatch/](stopwatch/) | 스톱워치 (lap 기록) |
| supermario | [supermario/](supermario/) | 마리오풍 플랫포머 게임 |
| svg-puzzle-slider | [svg-puzzle-slider/](svg-puzzle-slider/) | SVG 기반 슬라이딩 퍼즐 |
| tetris | [tetris/](tetris/) | 테트리스 |
| tictactoe | [tictactoe/](tictactoe/) | 틱택토 |
| timer | [timer/](timer/) | 타이머 (mm:ss 카운트다운) |
| typing | [typing/](typing/) | 타이핑 연습 |
| unit-converter | [unit-converter/](unit-converter/) | 단위 변환기 |
| weather | [weather/](weather/) | 날씨 카드 (BF-438) — 도시 추가/메모/정렬/다크 우선, [디자인 명세](docs/design/weather-BF-435.md) |
| webaudio-memory-tone | [webaudio-memory-tone/](webaudio-memory-tone/) | Web Audio 기반 소리 기억 게임 |
| word-guess | [word-guess/](word-guess/) | 단어 추측 게임 |

> "이름 기반 추정"으로 표시된 항목은 실제 내부 구현을 열람하지 않고 디렉터리명으로만 분류한
> 것입니다. 상세 조사가 필요한 항목은 [`docs/ARCHITECTURE.md`의 "알려진 제약 · 미해결
> 항목"](docs/ARCHITECTURE.md#6-알려진-제약--미해결-항목)을 참고하세요.

## 저장소 구조 개요

디렉터리 카테고리 분류, 앱 실행 아키텍처 패턴(vanilla / Vite), 테스트 아키텍처,
`localStorage` 상태 공유 규약은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)에 정리되어
있습니다.

## 기여하기

브랜치 · 커밋 · PR 규칙, 신규 앱 추가 절차는 [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)를
참고하세요.

## 전체 테스트 실행

```sh
npm test
```

`tests/` 디렉터리에는 여러 앱/사이클의 테스트 파일이 누적되어 있으므로, 특정 앱만 검증할
때는 `node --test tests/<app>-*.test.js` 형태로 범위를 좁히세요. `BRIX_TEST_SCOPE=focused
BRIX_TEST_MODULE=<app>` 환경변수로도 focused 범위를 지정할 수 있습니다. 자세한 내용은
[`docs/CONTRIBUTING.md`의 테스트 실행 규칙](docs/CONTRIBUTING.md#5-테스트-실행-규칙)을
참고하세요.
