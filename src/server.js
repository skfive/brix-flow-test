// BF-747 — HTTP 서버 어댑터 (Node 내장 http 만 사용, 무의존)
//
// 소켓 I/O 와 body 수집/파싱을 담당하고, 실제 분기는 순수 함수 route() 에 위임한다.
// createServer() 는 listen 하지 않은 http.Server 를 돌려준다 — 호출자가 포트를 결정.

import http from "node:http";
import { route } from "./router.js";

/** 요청 body 를 문자열로 수집 (1MB 상한으로 메모리 보호) */
function readBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let buf = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      buf += chunk;
    });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
}

/** JSON 응답 1건 기록 */
function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * listen 하지 않은 http.Server 를 생성한다.
 * @returns {import('node:http').Server}
 */
export function createServer() {
  return http.createServer(async (req, res) => {
    const path = (req.url || "/").split("?")[0];
    const method = (req.method || "GET").toUpperCase();

    let body;
    let bodyError = false;
    if (method !== "GET" && method !== "HEAD") {
      let raw;
      try {
        raw = await readBody(req);
      } catch {
        sendJson(res, 413, { error: "payload_too_large" });
        return;
      }
      if (raw && raw.trim().length > 0) {
        try {
          body = JSON.parse(raw);
        } catch {
          bodyError = true;
        }
      }
    }

    const result = route({ method, path, body, bodyError });
    sendJson(res, result.status, result.body);
  });
}
