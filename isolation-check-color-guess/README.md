# Color Guess (색상 맞히기)

빌드 도구·외부 라이브러리 없이 순수 HTML/CSS/vanilla ESM JavaScript로 만든 색상 맞히기 게임.
목표 색상 값(예: `#3b82f6`)을 텍스트로 제시하고, 여러 색상 견본 중 일치하는 것을 고른다.
정답이면 점수 +1, 오답이면 목숨 -1(정답 견본 표시). 시작 목숨은 3, 목숨이 0이 되면 gameover 화면과 최종 점수를 표시한다.

## 파일 구조

```
isolation-check-color-guess/
├── index.html            # 게임 진입 화면 (DOM 골격, src/main.js 로드)
├── styles.css            # 디자인 토큰·레이아웃·상태 스타일
├── src/
│   ├── game.js           # 순수 게임 로직 (정답 생성·채점·목숨 관리, RNG 주입 가능)
│   └── main.js           # 게임 로직 ↔ DOM 렌더링 바인딩
├── tests/
│   └── game.test.js      # node --test 기반 game.js 단위 테스트
├── docs/design/
│   ├── design-mockup.html   # selector·상태 계약 정적 목업
│   └── design-tokens.html   # 디자인 토큰 미리보기
└── README.md
```

## 정적 서버로 실행

`index.html`은 빌드 없이 정적 서버로 바로 제공된다. 저장소 루트에서:

```bash
# Python 내장 서버 사용 예
python3 -m http.server 8000
# 이후 브라우저에서 접속:
#   http://localhost:8000/isolation-check-color-guess/index.html
```

또는 Node가 있으면:

```bash
npx http-server . -p 8000
# http://localhost:8000/isolation-check-color-guess/index.html
```

> `src/main.js`는 ESM(`<script type="module">`)으로 로드되므로 `file://` 직접 열기가 아닌 정적 HTTP 서버로 제공해야 한다.

## 단위 테스트

순수 로직(`src/game.js`)은 브라우저 없이 Node 내장 러너로 검증한다:

```bash
node --test isolation-check-color-guess/tests/game.test.js
```

정답 생성(결정적 RNG 주입)·채점·목숨 규칙을 덮는다.
