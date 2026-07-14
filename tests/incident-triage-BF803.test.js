/* tests/incident-triage-BF803.test.js — BF-803
 * 기획: docs/plan/incident-triage-BF-800.md §2.2 (조합표 9/9) · §4.3 (요약 포맷) · §7.3 (TC-01~TC-12)
 * 시안: docs/design/incident-triage-BF-800.md §7.1 (severity HEX) · §8.2 (:root 토큰)
 *
 * 대상: resolveSeverity / buildSummary 순수 함수 + vanilla-static(file://) 정적 가드
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// incident-triage/triage.js 는 UMD(CommonJS) — 루트 package.json 이 type:module 이므로
// rps/number-guess 관례대로 createRequire 로 로드한다.
const require = createRequire(import.meta.url);
const { resolveSeverity, buildSummary } = require("../incident-triage/triage.js");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "incident-triage");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "style.css"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "triage.js"), "utf8");

/**
 * "금지 패턴 부재" 가드는 실제 코드만 검사해야 한다.
 * 주석에 금지어를 언급했다는 이유로 실패하면 안 되므로 주석을 먼저 제거한다.
 * (`//` 는 `file://` 같은 프로토콜 슬래시와 구분하기 위해 앞이 `:` 가 아닐 때만 주석 취급)
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const cssCode = stripComments(css);
const jsCode = stripComments(js);

/* 기획 §2.2 전체 조합표 (9/9) — 본 배열이 테스트의 유일한 source of truth */
const SLA_P1 = "15분 이내";
const SLA_P2 = "1시간 이내";
const SLA_P3 = "4시간 이내";
const SLA_P4 = "1영업일(24시간) 이내";

const NA_P1 = "온콜 담당자에게 즉시 에스컬레이션하고 인시던트 채널을 개설하세요.";
const NA_P2 = "1시간 이내 담당 팀에 배정하고 관리자에게 통보하세요.";
const NA_P3 = "담당 팀 큐에 등록하고 4시간 이내 첫 응답을 남기세요.";
const NA_P4 = "정기 백로그에 등록하고 다음 영업일 내 검토하세요.";

const MATRIX = [
  { tc: "TC-01", impact: "high", urgency: "high", severity: "P1", sla: SLA_P1, nextAction: NA_P1 },
  { tc: "TC-02", impact: "high", urgency: "medium", severity: "P2", sla: SLA_P2, nextAction: NA_P2 },
  { tc: "TC-03", impact: "high", urgency: "low", severity: "P3", sla: SLA_P3, nextAction: NA_P3 },
  { tc: "TC-04", impact: "medium", urgency: "high", severity: "P2", sla: SLA_P2, nextAction: NA_P2 },
  { tc: "TC-05", impact: "medium", urgency: "medium", severity: "P3", sla: SLA_P3, nextAction: NA_P3 },
  { tc: "TC-06", impact: "medium", urgency: "low", severity: "P4", sla: SLA_P4, nextAction: NA_P4 },
  { tc: "TC-07", impact: "low", urgency: "high", severity: "P3", sla: SLA_P3, nextAction: NA_P3 },
  { tc: "TC-08", impact: "low", urgency: "medium", severity: "P4", sla: SLA_P4, nextAction: NA_P4 },
  { tc: "TC-09", impact: "low", urgency: "low", severity: "P4", sla: SLA_P4, nextAction: NA_P4 },
];

describe("resolveSeverity — 기획 §2.2 조합표 전수 (AC-01)", () => {
  for (const c of MATRIX) {
    it(`${c.tc}: ${c.impact}+${c.urgency} → ${c.severity} / ${c.sla}`, () => {
      assert.deepStrictEqual(resolveSeverity(c.impact, c.urgency), {
        severity: c.severity,
        sla: c.sla,
        nextAction: c.nextAction,
      });
    });
  }

  it("9개 조합이 빠짐없이 정의되어 있다 (3×3 전수)", () => {
    const levels = ["high", "medium", "low"];
    const seen = [];
    for (const i of levels) {
      for (const u of levels) {
        const r = resolveSeverity(i, u);
        assert.match(r.severity, /^P[1-4]$/);
        assert.ok(r.sla.length > 0 && r.nextAction.length > 0);
        seen.push(`${i}:${u}`);
      }
    }
    assert.strictEqual(seen.length, 9);
  });

  it("결정론성 — 같은 입력은 호출 횟수와 무관하게 항상 동일 결과 (AC-01)", () => {
    const first = resolveSeverity("medium", "high");
    for (let n = 0; n < 5; n += 1) {
      assert.deepStrictEqual(resolveSeverity("medium", "high"), first);
    }
  });

  it("반환 객체를 변형해도 다음 호출에 오염되지 않는다 (lookup table 불변)", () => {
    const r = resolveSeverity("high", "high");
    r.severity = "P4";
    assert.strictEqual(resolveSeverity("high", "high").severity, "P1");
  });
});

describe("resolveSeverity — 잘못된 enum (TC-10~12, EC-10)", () => {
  it("TC-10: 잘못된 impact → TypeError", () => {
    assert.throws(() => resolveSeverity("invalid", "high"), TypeError);
  });

  it("TC-11: 잘못된 urgency → TypeError", () => {
    assert.throws(() => resolveSeverity("high", "invalid"), TypeError);
  });

  it("TC-12: undefined/undefined → TypeError", () => {
    assert.throws(() => resolveSeverity(undefined, undefined), TypeError);
  });

  it("null·빈 문자열·대문자 오탈자도 TypeError", () => {
    assert.throws(() => resolveSeverity(null, "high"), TypeError);
    assert.throws(() => resolveSeverity("high", ""), TypeError);
    assert.throws(() => resolveSeverity("HIGH", "high"), TypeError);
  });
});

describe("buildSummary — 기획 §4.3 고정 포맷 (AC-06)", () => {
  it("기획 §4.3 예시 문자열과 정확히 일치한다", () => {
    assert.strictEqual(
      buildSummary("high", "medium"),
      "[Incident Triage] 영향도: 높음 / 긴급도: 보통 → P2 (SLA: 1시간 이내) — 1시간 이내 담당 팀에 배정하고 관리자에게 통보하세요."
    );
  });

  it("P1 조합 요약 (한글 라벨·SLA·다음 행동 모두 포함)", () => {
    assert.strictEqual(
      buildSummary("high", "high"),
      "[Incident Triage] 영향도: 높음 / 긴급도: 높음 → P1 (SLA: 15분 이내) — 온콜 담당자에게 즉시 에스컬레이션하고 인시던트 채널을 개설하세요."
    );
  });

  it("9개 조합 모두 고정 포맷을 지킨다", () => {
    for (const c of MATRIX) {
      const s = buildSummary(c.impact, c.urgency);
      assert.ok(s.startsWith("[Incident Triage] 영향도: "));
      assert.ok(s.includes(` → ${c.severity} (SLA: ${c.sla}) — ${c.nextAction}`));
    }
  });

  it("잘못된 enum → TypeError (resolveSeverity 와 동일 계약)", () => {
    assert.throws(() => buildSummary("invalid", "high"), TypeError);
  });
});

describe("vanilla-static / file:// 제약 가드 (AC-11 · 기획 §11)", () => {
  it("외부 CDN link/script 가 0건이다", () => {
    assert.doesNotMatch(html, /<(link|script)[^>]+(https?:)?\/\//i);
  });

  it("script 는 classic 로드 — type=\"module\" 미사용", () => {
    assert.doesNotMatch(html, /type\s*=\s*["']module["']/i);
    assert.match(html, /<script\s+src=["']\.\/triage\.js["']><\/script>/);
  });

  it("triage.js 에 ESM import/export 구문이 없다", () => {
    assert.doesNotMatch(jsCode, /^\s*(import|export)\s/m);
  });

  it("네트워크 호출(fetch/XHR)·localStorage 가 없다 (in-memory 단발 판정)", () => {
    assert.doesNotMatch(jsCode, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
  });

  it("style.css 에 외부 @import·@font-face 가 없다 (system font only)", () => {
    assert.doesNotMatch(cssCode, /@import|@font-face/i);
  });
});

describe("index.html 구조 가드 (기획 §5.2 · 시안 §4.1)", () => {
  it("viewport meta 가 있다 (AC-10)", () => {
    assert.match(html, /<meta\s+name=["']viewport["']\s+content=["']width=device-width,\s*initial-scale=1/i);
  });

  it("결과 영역이 id=result · data-state=idle · aria-live=polite 로 선언된다", () => {
    const m = html.match(/<div[^>]*id=["']result["'][^>]*>/);
    assert.ok(m, "#result 요소가 없다");
    assert.match(m[0], /data-state=["']idle["']/);
    assert.match(m[0], /aria-live=["']polite["']/);
  });

  it("impact/urgency 라디오가 각각 high|medium|low 3개씩 존재한다 (기획 §6.3 enum)", () => {
    for (const name of ["impact", "urgency"]) {
      for (const value of ["high", "medium", "low"]) {
        const re = new RegExp(
          `<input[^>]*type=["']radio["'][^>]*name=["']${name}["'][^>]*value=["']${value}["']`
        );
        assert.match(html, re, `${name}=${value} 라디오 누락`);
      }
    }
  });

  it("초기화 후 포커스 대상인 impact-high id 가 존재한다 (AC-07 · 시안 §7.4)", () => {
    assert.match(html, /id=["']impact-high["']/);
  });

  it("copy-btn 은 초기 disabled, reset-btn 은 항상 활성 (AC-02)", () => {
    const copy = html.match(/<button[^>]*id=["']copy-btn["'][^>]*>/);
    const reset = html.match(/<button[^>]*id=["']reset-btn["'][^>]*>/);
    assert.ok(copy && reset);
    assert.match(copy[0], /\bdisabled\b/);
    assert.doesNotMatch(reset[0], /\bdisabled\b/);
  });

  it("Tab 순서 = DOM 순서: 복사 버튼이 초기화 버튼보다 앞에 있다 (기획 §9.1 · 시안 §7.4)", () => {
    assert.ok(html.indexOf('id="copy-btn"') < html.indexOf('id="reset-btn"'));
  });

  it("tabindex 양수값을 쓰지 않는다 (기획 §9.1)", () => {
    assert.doesNotMatch(html, /tabindex=["'][1-9]/);
  });

  it("severity 배지 코드/한글명 병기 요소가 있다 (AC-09 색 비의존)", () => {
    assert.match(html, /class=["']it-badge-code["']/);
    assert.match(html, /class=["']it-badge-name["']/);
  });
});

describe("style.css 시안 가드 (시안 §7.1 · §8.2)", () => {
  it("severity HEX 4종이 시안 §7.1 검증값 그대로다 (임의 변경 금지)", () => {
    assert.match(cssCode, /--it-color-p1:\s*#B91C1C/i);
    assert.match(cssCode, /--it-color-p2:\s*#B45309/i);
    assert.match(cssCode, /--it-color-p3:\s*#1D4ED8/i);
    assert.match(cssCode, /--it-color-p4:\s*#475569/i);
  });

  it("disabled 복사 버튼에 opacity 를 쓰지 않는다 (시안 §5.4 대비 유지)", () => {
    const block = cssCode.match(/\.it-btn-primary:disabled\s*\{[^}]*\}/);
    assert.ok(block, ".it-btn-primary:disabled 규칙이 없다");
    assert.doesNotMatch(block[0], /opacity/);
  });

  it("포커스 링을 제거하지 않는다 — outline: none 미사용 (시안 §7.4)", () => {
    assert.doesNotMatch(cssCode, /outline\s*:\s*none/i);
    assert.match(cssCode, /:focus-visible/);
  });

  it("모바일 breakpoint(max-width: 480px) 에서 세로 스택 (AC-10)", () => {
    assert.match(cssCode, /@media\s*\(max-width:\s*480px\)/);
    const mobile = cssCode.match(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\n\}/);
    assert.ok(mobile, "480px 미디어 쿼리 블록이 없다");
    assert.match(mobile[0], /\.it-groups\s*\{[^}]*grid-template-columns:\s*1fr/);
  });

  it("data-severity P1~P4 색 매핑이 CSS 에 정의된다 (JS 인라인 스타일 금지 패턴)", () => {
    for (const p of ["P1", "P2", "P3", "P4"]) {
      assert.match(cssCode, new RegExp(`\\[data-severity=["']${p}["']\\]`));
    }
  });

  it("JS 가 인라인 색 스타일을 직접 조작하지 않는다 (시안 §8.5)", () => {
    assert.doesNotMatch(jsCode, /\.style\.(background|backgroundColor|color|borderColor)\s*=/);
  });
});
