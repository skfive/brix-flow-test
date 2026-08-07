# P1 Conflict Check — 디자인 관점 NOTES (designer)

- 화면은 단일 `h1` 제목과 `ready` 상태 배지 1개로 구성한 최소 단일 페이지이며, frozen selector·token을 그대로 따른다.
- 상태 배지는 색상(`--color-status-ready` #16a34a)에만 의존하지 않고 `ready` 텍스트와 `aria-label`로 상태를 노출해 접근성을 보장한다.
- 이 파일은 designer 브랜치에서 새로 생성한 additive 산출물로, developer 브랜치의 동명 파일과 통합 시 add/add 충돌 실증을 위한 것이다(사전 병합·제거 금지).
