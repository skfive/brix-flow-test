# P1 Conflict Check — 구현 NOTES (developer)

- frozen UI 계약(§3)대로 단일 `h1` 제목과 `#p1-status-badge` 상태 배지 1개를 vanilla HTML + inline CSS로 구현했다(빌드 도구 없음, 30줄 이하).
- 상태 배지는 색상(`--color-status-ready`) 외에 `ready` 텍스트와 `aria-label`을 함께 노출하며, `--space-page-pad`와 `max-width:100%`로 320px 이상에서 overflow가 없다.
- 후조건(§3.8)을 위해 inline 스크립트의 `initialize()`가 초기화·click 이후 배지를 `ready` 초기값으로 되돌리고 주 실행 control(`#p1-run`)을 재활성화한다.
