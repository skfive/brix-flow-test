// BF-747 — 실행 진입점. `node src/index.js` 로 서버를 기동한다.
// 포트는 PORT 환경변수(기본 8787)로 결정.

import { createServer } from "./server.js";

const port = Number(process.env.PORT) || 8787;
const server = createServer();
server.listen(port, () => {
  // eslint 없는 vanilla 환경 — 기동 로그만 출력
  console.log(`brix-flow-backend listening on http://127.0.0.1:${port}`);
});
