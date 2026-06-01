// BF-747 — backend API 핸들러 단위/통합 테스트
//
// 가정(Epic BF-745 본문 부재): AC(빌드/테스트 통과 + 변경 요약 1줄)를 충족하는
// 자기완결적 최소 backend 기능. Node 내장 http 만 사용, 무의존.
//
// 검증 범위
//  1) route() 순수 함수 — 메서드/경로별 응답 매핑
//  2) createServer() 통합 — 실제 http 서버 기동 후 요청/응답 라운드트립

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { route } from "../src/router.js";
import { createServer } from "../src/server.js";

// ── 1) route() 순수 함수 ───────────────────────────────────────────────

test("route: GET /health → 200 ok + uptime 숫자", () => {
  const res = route({ method: "GET", path: "/health", body: undefined });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(typeof res.body.uptimeMs, "number");
  assert.ok(res.body.uptimeMs >= 0);
});

test("route: GET /api/version → 200 + name/version", () => {
  const res = route({ method: "GET", path: "/api/version", body: undefined });
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.name, "string");
  assert.equal(typeof res.body.version, "string");
});

test("route: POST /api/echo → 200 + 입력 body 그대로 반향", () => {
  const payload = { hello: "world", n: 42 };
  const res = route({ method: "POST", path: "/api/echo", body: payload });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.echo, payload);
});

test("route: POST /api/echo 잘못된 body(파싱 실패 표식) → 400", () => {
  const res = route({ method: "POST", path: "/api/echo", body: undefined, bodyError: true });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_json");
});

test("route: 정의되지 않은 경로 → 404", () => {
  const res = route({ method: "GET", path: "/nope", body: undefined });
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "not_found");
});

test("route: 잘못된 메서드(/health 에 POST) → 405", () => {
  const res = route({ method: "POST", path: "/health", body: undefined });
  assert.equal(res.status, 405);
  assert.equal(res.body.error, "method_not_allowed");
});

// ── 2) createServer() 통합 ─────────────────────────────────────────────

/** 테스트용 HTTP 요청 헬퍼 — JSON 응답을 파싱해 반환 */
function request(server, { method, path, body }) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      { host: "127.0.0.1", port, method, path, headers: { "content-type": "application/json" } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          let parsed;
          try {
            parsed = buf ? JSON.parse(buf) : null;
          } catch (e) {
            reject(e);
            return;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

test("server: GET /health 라운드트립 → 200 ok", async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const res = await request(server, { method: "GET", path: "/health" });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("server: POST /api/echo 라운드트립 → 입력 반향", async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const res = await request(server, { method: "POST", path: "/api/echo", body: { a: 1, b: [2, 3] } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.echo, { a: 1, b: [2, 3] });
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("server: 잘못된 JSON body → 400 invalid_json", async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const { port } = server.address();
    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        { host: "127.0.0.1", port, method: "POST", path: "/api/echo", headers: { "content-type": "application/json" } },
        (r) => {
          let buf = "";
          r.on("data", (c) => (buf += c));
          r.on("end", () => resolve({ status: r.statusCode, body: JSON.parse(buf) }));
        }
      );
      req.on("error", reject);
      req.write("{ this is : not json ");
      req.end();
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "invalid_json");
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("server: 정의되지 않은 경로 → 404", async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const res = await request(server, { method: "GET", path: "/unknown" });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "not_found");
  } finally {
    await new Promise((r) => server.close(r));
  }
});
