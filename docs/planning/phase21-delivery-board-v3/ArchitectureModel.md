# ArchitectureModel — 전달 상태 보드 v3 / Delivery Status Board v3

- artifactId: ARCH-DELIVERY-BOARD
- Stack authority: vanilla-static, ESM module_type, npm, serve_root=`.`, route_mapping=root-relative-static

## Components
| componentId | responsibility (KO / EN) |
| --- | --- |
| delivery-board-view | `index.html`의 DOM 골격(`delivery-board-root` 등)을 제공한다 / provides the DOM skeleton (`delivery-board-root`, etc.) in `index.html`. |
| delivery-board-controller | `main.js`에서 상태 모델(idle/loading/loaded/empty/error) 전이와 이벤트 바인딩을 담당한다 / owns state transitions and event binding in `main.js`. |
| delivery-board-style | `styles.css`에서 frozen design token·breakpoint 레이아웃을 적용한다 / applies frozen design tokens and breakpoint layout in `styles.css`. |
| delivery-status-source | 전달 상태 데이터를 controller에 제공하는 조회 경계 / data-fetch boundary supplying delivery status to the controller. |
| delivery-board-mockup | designer가 소유하는 시각 mockup·설계 문서 / designer-owned visual mockup and design doc. |

## Dependencies
| dependencyId | source → target | kind | boundary | label |
| --- | --- | --- | --- | --- |
| DEP-VIEW-STYLE | delivery-board-view → delivery-board-style | data | in-process | DOM이 frozen cssClasses/domIds로 style을 참조 / DOM references style via frozen classes/ids |
| DEP-CTRL-VIEW | delivery-board-controller → delivery-board-view | control | in-process | controller가 DOM 상태를 갱신 / controller updates DOM state |
| DEP-CTRL-SOURCE | delivery-board-controller → delivery-status-source | async | runtime | 상태 데이터 조회 / fetch status data |
| DEP-MOCKUP-VIEW | delivery-board-mockup → delivery-board-view | reference | design | mockup이 화면 계약을 시각화 / mockup visualizes the screen contract |

## Constraints
1. frozen selector, 상태 모델, design token을 변경·재정의하지 않는다 / do not change or redefine frozen selectors, state model, or design tokens.
2. 새 파일·역할·요구사항을 계약 밖에서 추가하지 않는다 / add no files, roles, or requirements outside this contract.
3. 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 본 문서는 이를 재정의하지 않는다 / the frozen blueprint is the sole authority; this document does not redefine it.
4. 정적 자산은 serve_root(`.`)에서 root-relative로 제공된다 / static assets served root-relative from serve_root (`.`).

## decisionRefs
- ARCH-DELIVERY-BOARD (self)
