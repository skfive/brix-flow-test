// feedback-pulse 실행 가능 HTTP 어댑터 (node:http)
// 순수 라우터(handler.js)를 실제 HTTP 서버로 감싼다. 저장소에 서버 프레임워크가
// 없으므로 표준 node:http 로 구현한다. 데이터는 인메모리이며 프로세스 재시작 시 초기화된다.
import { createServer } from 'node:http';
import { createRouter } from './handler.js';
import { createFeedbackPulseService } from '../../features/feedback-pulse/service.js';

/**
 * feedback-pulse HTTP 서버를 생성한다(listen 은 호출자 책임).
 * @param {{ service?: ReturnType<typeof createFeedbackPulseService> }} [opts]
 */
export function createFeedbackPulseServer(opts = {}) {
  const service = opts.service ?? createFeedbackPulseService();
  const router = createRouter(service);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const query = Object.fromEntries(url.searchParams.entries());
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let result;
      try {
        result = router({ method: req.method, path: url.pathname, query, body: raw });
      } catch {
        result = { status: 500, body: { error: { message: '서버 내부 오류가 발생했습니다.' } } };
      }
      res.writeHead(result.status, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result.body));
    });
  });

  return { server, service };
}

// 직접 실행 시 서버 기동 (route smoke 용). PORT 환경변수 또는 기본 3031.
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 3031;
  const { server } = createFeedbackPulseServer();
  server.listen(port, () => {
    // eslint 없음(vanilla-static) — 기동 확인용 로그.
    console.log(`[feedback-pulse] listening on :${port} (인메모리, 재시작 시 초기화)`);
  });
}
