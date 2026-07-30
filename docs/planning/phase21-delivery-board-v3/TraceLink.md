# TraceLink — 전달 상태 보드 v3 / Delivery Status Board v3 (RTM)

requirement → design/code → test → evidence → verdict 추적 뼈대.

| # | sourceRef | targetRef | relation |
| --- | --- | --- | --- |
| 1 | REQ-1 | UISC-DELIVERY-BOARD | elaborated_by |
| 2 | REQ-1 | ARCH-DELIVERY-BOARD | elaborated_by |
| 3 | REQ-2 | ARCH-DELIVERY-BOARD | elaborated_by |
| 4 | REQ-3 | UISC-DELIVERY-BOARD | elaborated_by |
| 5 | REQ-1 | IFC-DELIVERY-STATUS-DESIGN | elaborated_by |
| 6 | REQ-1 | PACKET-DESIGN | allocated_to |
| 7 | REQ-1 | PACKET-DEV | allocated_to |
| 8 | REQ-2 | PACKET-DEV | allocated_to |
| 9 | REQ-3 | PACKET-DESIGN | allocated_to |
| 10 | REQ-1 | TS-DELIVERY-BOARD | verified_by |
| 11 | REQ-2 | TS-DELIVERY-BOARD | verified_by |
| 12 | REQ-3 | TS-DELIVERY-BOARD | verified_by |
| 13 | TS-DELIVERY-BOARD | PACKET-TEST | allocated_to |
| 14 | UISC-DELIVERY-BOARD | IFC-DELIVERY-STATUS-DESIGN | depends_on |
| 15 | TS-DELIVERY-BOARD | UISC-DELIVERY-BOARD | verified_by |

## Evidence / verdict 경로
- design/code: designer(mockup·design doc) + developer(demo 4파일) 산출 → `build_result` provenance.
- test: `TS-DELIVERY-BOARD` → tester `npm test` → `test_result`.
- verdict: reviewer `review_verdict` (별도 Decision 경로, 본 문서 대상 아님).
