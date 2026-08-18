# P1 Conflict Check — 화면 명세 (BF-1866)

단일 페이지: 제목(h1) 1개 + 상태 배지 1개. frozen UI 계약을 그대로 문서화한다(selector·token 재정의 금지).

## 레이아웃
- 루트 `#p1-conflict-root.p1-conflict` 안에 제목과 상태 배지를 세로로 배치한다.
- 페이지 여백은 `--space-page-pad`(16px)를 사용한다.
- 320px 이상 viewport에서 콘텐츠 overflow가 발생하지 않는다.

## 컴포넌트
- 제목: 단일 `h1`, 화면 텍스트 `P1 Conflict Check`.
- 상태 배지: `#p1-status-badge.p1-conflict__badge`, `ready` 상태 1개.
  - 배지 색상은 `--color-status-ready`(#16a34a)를 사용한다.
  - 상태명 `ready`를 화면 텍스트로 노출하고 동일 의미를 `aria-label`로 제공한다.

## 상태
- `ready` — 유일한 상태. 초기화·취소·실패 뒤에도 상태를 `ready` 초기값으로 복원한다.

## 접근성
- 페이지는 단일 `h1` `P1 Conflict Check`를 가진다.
- 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 함께 노출한다.

## dev 구현 가이드
- DOM ID: `p1-conflict-root`, `p1-status-badge` / class: `p1-conflict`, `p1-conflict__badge`.
- CSS 변수: `--color-status-ready: #16a34a;`, `--space-page-pad: 16px;` (값·이름 변경 금지).
- 산출물 파일 소유: 이 명세는 designer, `index.html`은 developer가 담당한다.
