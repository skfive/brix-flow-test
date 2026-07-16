// BF-878 · 검증 문서 회귀 가드 — 결제 차단 패스 E2E 증거 섹션 존재 · 정책 문구 · markdown 무결성
//
// 배경:
//   - BF-876 (developer): docs/verification/github-billing-pass-e2e.md 신규 생성
//     (GitHub Actions 결제 차단 상태에서의 E2E 판정 로직이 "exact billing annotation 매칭
//      시에만 통과" + "GitHub check 자체를 성공으로 위조하지 않음" 을 기록한 증거 문서)
//
// tester 고유 영역만 가드 (dev 정적 확인과 중복 금지 — 존재 검증 위주, 위치/순서 비의존):
//   1. 신규 증거 섹션 존재 — 헤딩 구조
//   2. 핵심 정책 문구 존재 — exact annotation 매칭 정책 / check 위조 금지 정책
//   3. markdown 무결성 — 코드펜스 짝수 개(균형) · 참고 링크 존재
//
// 이 문서는 순수 markdown (렌더 대상 HTML 아님) 이므로 e2e-runner 브라우저 검증은 대상 아님.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "verification";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DOC_PATH = path.join(
  REPO_ROOT,
  "docs",
  "verification",
  "github-billing-pass-e2e.md",
);

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 정적 가드 1 — 산출물 존재
  // ─────────────────────────────────────────────────────────────
  test("BF-878 AC1: 결제 차단 패스 E2E 증거 문서가 main 에 존재", () => {
    assert.ok(
      fs.existsSync(DOC_PATH),
      `증거 문서가 없음: ${DOC_PATH}`,
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 2 — 신규 증거 섹션 존재 (헤딩, 위치 무관 includes)
  // ─────────────────────────────────────────────────────────────
  test("BF-878 AC1: 결제 차단 패스 E2E 증거 섹션 헤딩이 존재", () => {
    const doc = fs.readFileSync(DOC_PATH, "utf-8");
    for (const heading of [
      "# GitHub 결제 차단 패스 E2E 검증",
      "## 결제 차단 패스 E2E 증거",
      "### 검증 목적",
      "### 통과 정책",
    ]) {
      assert.ok(
        doc.includes(heading),
        `증거 문서에 헤딩 "${heading}" 없음 — 섹션 구조 silent break`,
      );
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 3 — 핵심 정책 문구 존재
  // ─────────────────────────────────────────────────────────────
  test("BF-878 AC1: exact billing annotation 매칭 정책 문구 존재", () => {
    const doc = fs.readFileSync(DOC_PATH, "utf-8");
    assert.ok(
      doc.includes("exact billing annotation 매칭 시에만 통과"),
      "exact billing annotation 매칭 정책 문구가 없음",
    );
    assert.ok(
      doc.includes(
        "The job was not started because recent account payments have failed",
      ),
      "GitHub 결제 차단 annotation 원문이 문서에 없음",
    );
    assert.ok(
      doc.includes("or your spending limit needs to be increased."),
      "GitHub 결제 차단 annotation 원문(2번째 줄)이 문서에 없음",
    );
  });

  test("BF-878 AC1: GitHub check 위조 금지 정책 문구 존재", () => {
    const doc = fs.readFileSync(DOC_PATH, "utf-8");
    assert.ok(
      doc.includes("GitHub check 자체를 성공으로 위조하지 않음"),
      "GitHub check 위조 금지 정책 문구가 없음",
    );
    assert.ok(
      doc.includes('"conclusion": "action_required"'),
      "check conclusion 원래 값 유지 예시(JSON)가 없음",
    );
    assert.ok(
      doc.includes('"billing_pass": true'),
      "billing_pass 판정 필드 예시(JSON)가 없음",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 4 — markdown 무결성 (코드펜스 균형 · 링크 존재)
  // ─────────────────────────────────────────────────────────────
  test("BF-878 AC1: 코드펜스(```)가 짝수 개로 균형을 이룸", () => {
    const doc = fs.readFileSync(DOC_PATH, "utf-8");
    const fenceCount = (doc.match(/```/g) || []).length;
    assert.ok(
      fenceCount > 0 && fenceCount % 2 === 0,
      `코드펜스 개수가 균형이 맞지 않음(짝수 아님): ${fenceCount}`,
    );
  });

  test("BF-878 AC1: 참고 링크가 최소 2개 존재하며 markdown 링크 문법을 따름", () => {
    const doc = fs.readFileSync(DOC_PATH, "utf-8");
    const links = doc.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || [];
    assert.ok(
      links.length >= 2,
      `참고 링크가 2개 미만: ${links.length}개`,
    );
    for (const link of links) {
      assert.match(
        link,
        /^\[[^\]]+\]\(https:\/\/docs\.github\.com\/[^)]+\)$/,
        `링크 형식이 예상과 다름: ${link}`,
      );
    }
  });
}
