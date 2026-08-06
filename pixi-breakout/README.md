# pixi-breakout

PixiJS 기반 벽돌깨기(breakout) 게임. 저장소 루트의 vanilla-static 컨벤션(외부 빌드 도구 없음, ESM 스크립트 직접 로드)을 따르며, `pixi.js` 는 저장소 루트 `package.json` 의 devDependency 로 설치되어 있다.

## 디렉터리 구조

frozen 실행 설계(`docs/plans/BF-1700/implementation-plan.md`)가 확정한 6개 파일이 전부이며, 그 외 신규 파일(별도 상태관리 모듈, 빌드 설정, css 파일 분리 등)은 추가하지 않는다.

```
pixi-breakout/
├── README.md              # 프로젝트 개요/실행 방법 (본 문서)
├── docs/
│   └── design.md           # UI/비주얼/접근성 시각 명세
├── index.html               # 엔트리 마크업 + design token CSS 변수 + ESM 스크립트 로딩
├── src/
│   ├── game-logic.js        # 순수 게임 로직 (PixiJS/DOM 비의존)
│   └── renderer.js          # PixiJS 렌더링 + HUD/overlay DOM 동기화
└── tests/
    └── game-logic.test.js   # game-logic.js 단위 테스트
```

## 실행 방법

저장소 루트에서 정적 서버로 전체 SPA 묶음을 서빙한다(`pixi-breakout` 전용 서버 설정 없음):

```bash
npm start          # http-server . -p 8888 --no-dotfiles
```

서버 기동 후 브라우저에서 `http://localhost:8888/pixi-breakout/index.html` 로 접속한다.

## 조작 방법

- `←` / `→`: 패들 이동(전체 플레이가 키보드만으로 가능)
- `pause-button` 클릭 또는 포커스 후 Enter/Space: 일시정지 ⇄ 재개
- `restart-button` 클릭 또는 포커스 후 Enter/Space: 재시작(게임 오버/클리어 상태에서)

## 테스트

`game-logic.js` 순수 로직에 대한 단위 테스트는 Node 내장 테스트 러너로 실행한다:

```bash
node --test pixi-breakout/tests/game-logic.test.js
```

> 저장소 루트 `npm test` 는 현재 다른 모듈(snake) 테스트 파일을 가리키고 있어(`repo convention capsule` 상 `focused_test_authority=unavailable`) `pixi-breakout` 전용 테스트 스크립트로 사용할 수 없다. `package.json` 에 `test:pixi-breakout` 스크립트를 추가하는 것은 이번 task 의 owned_paths 밖이므로, developer(BF-1702)가 필요 시 별도로 추가한다.

`renderer.js` 는 PixiJS/canvas 에 의존하므로 자동화 단위 테스트 대상에서 제외하며(§7 of implementation-plan), UI 계약(DOM ID/class/상태/token/반응형)과 접근성 요구사항은 review/test 단계에서 수동 검증한다.

## 디자인 문서

시각 디자인 시스템(컬러 팔레트, 타이포그래피, 레이아웃 그리드, 게임 오브젝트 시각 명세, 모션 명세, 상태별 화면, 접근성)은 [`docs/design.md`](./docs/design.md) 에 확정되어 있다. DOM ID/class, 상태값, design token 은 frozen UI 계약 그대로이며 이 저장소의 어떤 문서도 이를 재정의하지 않는다.

## UI 계약 요약 (frozen — 상세는 `docs/design.md`, `docs/plans/BF-1700/implementation-plan.md` 참고)

- DOM ID: `game-root`, `game-hud`, `game-overlay`, `score-value`, `lives-value`, `best-score-value`, `pause-button`, `restart-button`
- CSS class: `hud`, `hud__score`, `hud__lives`, `overlay`, `overlay--start`, `overlay--paused`, `overlay--gameover`, `overlay--clear`
- 상태: `start`, `playing`, `paused`, `game-over`, `clear`
