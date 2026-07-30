# RoleWorkPacket — 전달 상태 보드 v3 / Delivery Status Board v3

각 packet은 동결된 실행 설계와 발행된 exact 파일 경계만 소비한다.
소비할 계약 revision/checksum:
- planning-contract@v1 sha256:5a7ad7faf67307fedc12d8871504fe218ee58cfffac7b681ed1f05e654c6fbc0
- ui-contract@v1 sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb

## PACKET-DESIGN — designer (BF-1285)
- assigneeRole: designer
- primaryRepo: backend
- objective: frozen UiScreenContract를 시각 mockup·설계 문서로 렌더링한다 / render the frozen UiScreenContract into a visual mockup and design doc.
- description: frozen selector·상태 모델·design token을 그대로 반영해 mockup과 설계 문서를 작성한다 / reflect frozen selectors, state model, tokens as-is.
- ownedPaths (exact):
  - `docs/design/mockups/phase21-delivery-board-v3.html`
  - `docs/design/phase21-delivery-board-v3.md`
- deliverables:
  - `docs/design/mockups/phase21-delivery-board-v3.html` — 전달 상태 보드 시각 mockup / visual mockup.
  - `docs/design/phase21-delivery-board-v3.md` — 화면 계약 설계 문서 / screen-contract design doc.
- acceptanceCriteria:
  - frozen DOM ID·cssClass·상태·design token·접근성·responsive를 변경 없이 반영한다.
  - additive policy만 사용하고 developer 소유 `demo/**` 파일을 만들지 않는다.
- inputs: UISC-DELIVERY-BOARD, IFC-DELIVERY-STATUS-DESIGN
- dependencies: PACKET-PLAN
- requirementRefs: REQ-1, REQ-3
- testSpecRefs: (none — 문서 packet)
- requiredSkills: (designer 페르소나 기본)
- consume checksum: ui-contract@v1 sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb

## PACKET-DEV — developer (BF-1286)
- assigneeRole: developer
- primaryRepo: backend
- objective: frozen UI 계약을 vanilla-static demo로 구현한다 / implement the frozen UI contract as a vanilla-static demo.
- description: frozen selector·상태 모델·token을 그대로 사용해 index/main/styles와 단위 테스트를 구현한다 / implement using frozen selectors, state model, and tokens.
- ownedPaths (exact):
  - `demo/phase21-delivery-board-v3/index.html`
  - `demo/phase21-delivery-board-v3/main.js`
  - `demo/phase21-delivery-board-v3/styles.css`
  - `demo/phase21-delivery-board-v3/tests/delivery-board.test.js`
- deliverables:
  - `demo/phase21-delivery-board-v3/index.html` — DOM 골격(frozen domIds/cssClasses) / DOM skeleton.
  - `demo/phase21-delivery-board-v3/main.js` — 상태 전이·이벤트 바인딩(ESM) / state transitions & event binding.
  - `demo/phase21-delivery-board-v3/styles.css` — design token·breakpoint 레이아웃 / tokens & breakpoint layout.
  - `demo/phase21-delivery-board-v3/tests/delivery-board.test.js` — 단위 테스트 / unit tests.
- acceptanceCriteria:
  - 상태 모델 `idle|loading|loaded|empty|error`와 재활성화 후조건을 구현한다.
  - frozen selector·token·접근성·responsive 계약을 그대로 구현한다.
  - `npm test`가 통과한다.
- inputs: UISC-DELIVERY-BOARD, IFC-DELIVERY-STATUS-DESIGN, ARCH-DELIVERY-BOARD
- dependencies: PACKET-PLAN, PACKET-DESIGN
- requirementRefs: REQ-1, REQ-2, REQ-3
- testSpecRefs: TS-DELIVERY-BOARD
- requiredSkills: (developer 페르소나 기본)
- consume checksum: ui-contract@v1 sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb

## PACKET-TEST — tester (BF-1289)
- assigneeRole: tester
- primaryRepo: backend
- objective: 전달 상태 보드의 상태·접근성·반응형 계약을 검증한다 / verify state, a11y, responsive contracts.
- description: `TS-DELIVERY-BOARD` 명세대로 `npm test`를 실행하고 실제 결과를 기록한다 / run `npm test` per spec and record actual results.
- ownedPaths (exact):
  - `demo/phase21-delivery-board-v3/tests/regression.delivery-board.test.js`
- deliverables:
  - `demo/phase21-delivery-board-v3/tests/regression.delivery-board.test.js` — 회귀 가드 테스트 / regression guard tests.
- acceptanceCriteria:
  - `TS-DELIVERY-BOARD`의 8개 step을 검증하고 `npm test`가 통과한다.
  - `test_result` evidence를 기록한다.
- inputs: TS-DELIVERY-BOARD
- dependencies: PACKET-DEV
- requirementRefs: REQ-1, REQ-2, REQ-3
- testSpecRefs: TS-DELIVERY-BOARD
- requiredSkills: (tester 페르소나 기본)

## 소유권 경계 요약 (재해석 금지 / no reinterpretation)
| path | owner |
| --- | --- |
| `docs/design/mockups/phase21-delivery-board-v3.html` | designer |
| `docs/design/phase21-delivery-board-v3.md` | designer |
| `demo/phase21-delivery-board-v3/index.html` | developer |
| `demo/phase21-delivery-board-v3/main.js` | developer |
| `demo/phase21-delivery-board-v3/styles.css` | developer |
| `demo/phase21-delivery-board-v3/tests/delivery-board.test.js` | developer |
| `demo/phase21-delivery-board-v3/tests/regression.delivery-board.test.js` | tester |
