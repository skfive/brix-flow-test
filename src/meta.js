// BF-747 — 서비스 메타데이터. /api/version 응답에 사용.
// package.json 을 fs 로 읽지 않고 상수로 노출해 무의존·테스트 결정성을 유지한다.

export const name = "brix-flow-backend";
export const version = "0.1.0";
