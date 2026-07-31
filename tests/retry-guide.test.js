import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUIDE_PATH = path.join(__dirname, '..', 'docs', 'operator', 'retry-guide.md');

const guide = fs.readFileSync(GUIDE_PATH, 'utf-8');

// BF-1404 / REQ-RETRY-GUIDE — 4개 신규 섹션의 헤딩 텍스트·순서 고정
const REQUIRED_HEADINGS = [
  '## 목적 / Purpose',
  '## 재시도 가능 조건 / Retryable conditions',
  '## 확인 체크리스트 / Verification checklist',
  '## 실패 시 중단 조건 / Stop conditions',
];

test('AC1 — retry-guide.md 에 4개 신규 섹션 헤딩이 모두 존재한다', () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(
      guide.includes(heading),
      `필수 헤딩 누락: "${heading}"`
    );
  }
});

test('AC1 — 4개 신규 섹션 헤딩이 지정된 순서로 나타난다', () => {
  const indices = REQUIRED_HEADINGS.map((heading) => guide.indexOf(heading));
  for (const idx of indices) {
    assert.ok(idx !== -1, '헤딩 위치를 찾을 수 없음');
  }
  for (let i = 1; i < indices.length; i += 1) {
    assert.ok(
      indices[i] > indices[i - 1],
      `헤딩 순서 위반: "${REQUIRED_HEADINGS[i]}" 가 "${REQUIRED_HEADINGS[i - 1]}" 보다 앞에 있음`
    );
  }
});

test('AC1 — 각 신규 섹션은 한국어·영어 병행 설명을 최소 한 줄씩 포함한다', () => {
  const sectionStarts = [...REQUIRED_HEADINGS.map((h) => guide.indexOf(h)), guide.length];
  for (let i = 0; i < REQUIRED_HEADINGS.length; i += 1) {
    const body = guide.slice(sectionStarts[i], sectionStarts[i + 1]);
    const hasKorean = /[가-힣]/.test(body);
    const hasEnglish = /[a-zA-Z]/.test(body);
    assert.ok(hasKorean, `섹션 "${REQUIRED_HEADINGS[i]}" 에 한국어 설명이 없음`);
    assert.ok(hasEnglish, `섹션 "${REQUIRED_HEADINGS[i]}" 에 영어 설명이 없음`);
  }
});

test('AC2 — 문서 내 markdown 링크는 외부 URL(http/https)을 사용하지 않는다', () => {
  const linkPattern = /\]\(([^)]+)\)/g;
  const externalLinks = [];
  let match;
  while ((match = linkPattern.exec(guide)) !== null) {
    if (/^https?:\/\//i.test(match[1])) {
      externalLinks.push(match[1]);
    }
  }
  assert.equal(
    externalLinks.length,
    0,
    `외부 링크가 발견됨: ${externalLinks.join(', ')}`
  );
});

test('AC2 — 문서에 bare http/https URL 이 존재하지 않는다', () => {
  const bareUrlPattern = /https?:\/\/\S+/g;
  const matches = guide.match(bareUrlPattern) ?? [];
  assert.equal(matches.length, 0, `외부 URL 이 발견됨: ${matches.join(', ')}`);
});

test('AC2 — 코드 블록 fence(```)가 짝을 이루어 종료된다', () => {
  const fenceMatches = guide.match(/```/g) ?? [];
  assert.equal(
    fenceMatches.length % 2,
    0,
    '코드 블록 fence 가 짝수가 아니어서 열리고 닫히지 않은 fence 가 있음'
  );
});
