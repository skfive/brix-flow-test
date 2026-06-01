// BF-734 · 백엔드 헬스체크 엔드포인트 (/healthz) 회귀 가드
//
// 검증 범위 (수용 기준 매핑):
//   §1. AC1 — 서버 기동 + GET /healthz → 200 OK + {"status":"ok"}
//   §2. AC2 — 의존 서비스(DB 등) 비정상 → 503 + 실패 사유 포함 JSON
//   §3. AC3 — docs/healthcheck.md 에 path·메서드·응답 코드·timeout 권장값 명세
//   §4. 보조 — runHealthChecks 코어 집계 로직 (정상/비정상/예외)
//
// 실행: node --test tests/health/healthz.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runHealthChecks } from "../../src/health/check.js";
import { createHealthzServer, handleHealthz } from "../../src/routes/health/healthz.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

// 임시 서버 기동 후 GET 요청을 보내는 헬퍼
async function requestHealthz(serverOpts) {
  const server = createHealthzServer(serverOpts);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    const body = await res.json();
    return { status: res.status, body, contentType: res.headers.get("content-type") };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// ─────────────────────────────────────────────────────────────
// §1. AC1 — 정상 기동 시 200 + {"status":"ok"}
// ─────────────────────────────────────────────────────────────
describe("BF-734 §1 GET /healthz 정상 (AC1)", () => {
  test("§1-1 의존 체크가 없을 때 200 + {status:'ok'}", async () => {
    const { status, body, contentType } = await requestHealthz({});
    assert.equal(status, 200);
    assert.deepEqual(body, { status: "ok" });
    assert.match(contentType, /application\/json/);
  });

  test("§1-2 모든 의존 체크가 정상일 때 200 + {status:'ok'}", async () => {
    const checks = [
      { name: "db", check: async () => true },
      { name: "cache", check: async () => ({ ok: true }) },
    ];
    const { status, body } = await requestHealthz({ checks });
    assert.equal(status, 200);
    assert.deepEqual(body, { status: "ok" });
  });
});

// ─────────────────────────────────────────────────────────────
// §2. AC2 — 의존 서비스 비정상 시 503 + 실패 사유
// ─────────────────────────────────────────────────────────────
describe("BF-734 §2 GET /healthz 의존 비정상 (AC2)", () => {
  test("§2-1 DB 체크 실패 시 503 + status:'error'", async () => {
    const checks = [
      { name: "db", check: async () => ({ ok: false, detail: "connection refused" }) },
    ];
    const { status, body } = await requestHealthz({ checks });
    assert.equal(status, 503);
    assert.equal(body.status, "error");
  });

  test("§2-2 실패 사유(reason)가 응답 JSON 에 포함된다", async () => {
    const checks = [
      { name: "db", check: async () => ({ ok: false, detail: "connection refused" }) },
    ];
    const { status, body } = await requestHealthz({ checks });
    assert.equal(status, 503);
    assert.equal(body.checks.db.status, "error");
    assert.match(body.checks.db.reason, /connection refused/);
  });

  test("§2-3 체크가 예외를 던져도 503 + 예외 메시지를 사유로 노출", async () => {
    const checks = [
      { name: "db", check: async () => { throw new Error("socket timeout"); } },
    ];
    const { status, body } = await requestHealthz({ checks });
    assert.equal(status, 503);
    assert.match(body.checks.db.reason, /socket timeout/);
  });
});

// ─────────────────────────────────────────────────────────────
// §3. AC3 — docs/healthcheck.md 명세 존재
// ─────────────────────────────────────────────────────────────
describe("BF-734 §3 docs/healthcheck.md 명세 (AC3)", () => {
  const docPath = path.join(REPO_ROOT, "docs", "healthcheck.md");

  test("§3-1 docs/healthcheck.md 파일 존재", () => {
    assert.ok(existsSync(docPath), "docs/healthcheck.md 가 존재해야 함");
  });

  test("§3-2 path·메서드·응답 코드·timeout 권장값 명세 포함", () => {
    const doc = readFileSync(docPath, "utf-8");
    assert.match(doc, /\/healthz/, "엔드포인트 path 명시");
    assert.match(doc, /GET/, "HTTP 메서드 명시");
    assert.match(doc, /200/, "정상 응답 코드 명시");
    assert.match(doc, /503/, "비정상 응답 코드 명시");
    assert.match(doc, /timeout/i, "timeout 권장값 명시");
    assert.match(doc, /liveness|readiness/i, "probe 연동 안내 명시");
  });
});

// ─────────────────────────────────────────────────────────────
// §4. runHealthChecks 코어 집계 로직
// ─────────────────────────────────────────────────────────────
describe("BF-734 §4 runHealthChecks 코어", () => {
  test("§4-1 체크 없음 → healthy:true", async () => {
    const result = await runHealthChecks([]);
    assert.equal(result.healthy, true);
  });

  test("§4-2 하나라도 실패 → healthy:false", async () => {
    const result = await runHealthChecks([
      { name: "a", check: async () => true },
      { name: "b", check: async () => false },
    ]);
    assert.equal(result.healthy, false);
    assert.equal(result.checks.a.status, "ok");
    assert.equal(result.checks.b.status, "error");
  });

  test("§4-3 handleHealthz 는 응답 코드를 반환한다", async () => {
    // 응답 객체를 가짜로 만들어 코드 반환만 검증
    const fakeRes = { writeHead() {}, end() {} };
    const code = await handleHealthz({}, fakeRes, { checks: [] });
    assert.equal(code, 200);
  });
});
