import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommitLine } from '../src/parseCommitLine.js';
import { buildDigest } from '../src/buildDigest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '..', 'digest.js');

test('parseCommitLine - scope 있는 라인을 파싱한다', () => {
  const result = parseCommitLine('feat(bf-2186): renderBadge + HTTP 핸들러 TDD 구현');
  assert.deepEqual(result, {
    type: 'feat',
    scope: 'bf-2186',
    subject: 'renderBadge + HTTP 핸들러 TDD 구현',
    raw: 'feat(bf-2186): renderBadge + HTTP 핸들러 TDD 구현',
    recognized: true,
  });
});

test('parseCommitLine - scope 없는 라인을 파싱한다', () => {
  const result = parseCommitLine('chore: 의존성 업데이트');
  assert.deepEqual(result, {
    type: 'chore',
    scope: null,
    subject: '의존성 업데이트',
    raw: 'chore: 의존성 업데이트',
    recognized: true,
  });
});

test('parseCommitLine - type 대소문자를 정규화한다', () => {
  const result = parseCommitLine('Feat: 대소문자 정규화');
  assert.equal(result.type, 'feat');
  assert.equal(result.recognized, true);
});

test('parseCommitLine - 비인정 type은 recognized=false로 표시한다', () => {
  const result = parseCommitLine('style(bf-2200): 세미콜론 정리');
  assert.deepEqual(result, {
    type: 'style',
    scope: 'bf-2200',
    subject: '세미콜론 정리',
    raw: 'style(bf-2200): 세미콜론 정리',
    recognized: false,
  });
});

test('parseCommitLine - 콜론 구분자 없는 라인은 malformed로 분류한다', () => {
  const result = parseCommitLine("Merge branch 'main' into feature/x");
  assert.deepEqual(result, { malformed: true, raw: "Merge branch 'main' into feature/x" });
});

test('parseCommitLine - 빈 문자열은 malformed로 분류한다', () => {
  const result = parseCommitLine('');
  assert.deepEqual(result, { malformed: true, raw: '' });
});

test('buildDigest - 유형별 섹션을 표 순서대로 렌더링한다', () => {
  const commits = [
    parseCommitLine('fix(bf-1): 버그 수정'),
    parseCommitLine('feat(bf-2): 기능 추가'),
  ];
  const digest = buildDigest(commits);
  const featIndex = digest.indexOf('## ✨ 새로운 기능');
  const fixIndex = digest.indexOf('## 🐛 버그 수정');
  assert.ok(featIndex !== -1 && fixIndex !== -1);
  assert.ok(featIndex < fixIndex);
});

test('buildDigest - scope 유무에 따라 항목 포맷이 달라진다', () => {
  const commits = [
    parseCommitLine('feat(bf-2186): renderBadge 구현'),
    parseCommitLine('chore: 의존성 업데이트'),
  ];
  const digest = buildDigest(commits);
  assert.ok(digest.includes('- **[bf-2186]** renderBadge 구현'));
  assert.ok(digest.includes('- 의존성 업데이트'));
});

test('buildDigest - 비인정 type은 other 섹션에서 원래 type을 태그로 표시한다', () => {
  const commits = [
    parseCommitLine('style(bf-2200): 세미콜론 정리'),
    parseCommitLine('build: 번들러 업그레이드'),
  ];
  const digest = buildDigest(commits);
  assert.ok(digest.includes('## 📦 기타 변경'));
  assert.ok(digest.includes('- **[style/bf-2200]** 세미콜론 정리'));
  assert.ok(digest.includes('- **[build]** 번들러 업그레이드'));
});

test('buildDigest - malformed 라인은 분류 보류 섹션에 원문 그대로 나열된다', () => {
  const commits = [
    parseCommitLine('feat: 기능'),
    parseCommitLine("Merge branch 'main' into feature/x"),
  ];
  const digest = buildDigest(commits);
  assert.ok(digest.includes('## ⚠️ 분류 보류'));
  assert.ok(digest.includes("- Merge branch 'main' into feature/x"));
});

test('buildDigest - 빈 배열이면 변경 없음을 출력한다', () => {
  const digest = buildDigest([]);
  assert.equal(digest, '# 릴리즈 노트\n\n변경 없음\n');
});

test('buildDigest - 모든 라인이 malformed면 변경 없음을 출력한다', () => {
  const commits = [parseCommitLine(''), parseCommitLine('잘못된 라인')];
  const digest = buildDigest(commits);
  assert.equal(digest, '# 릴리즈 노트\n\n변경 없음\n');
});

test('buildDigest - title 옵션이 있으면 H1에 반영된다', () => {
  const digest = buildDigest([parseCommitLine('feat: 기능')], { title: 'v1.0.0 릴리즈' });
  assert.ok(digest.startsWith('# v1.0.0 릴리즈\n\n'));
});

test('buildDigest - title이 빈 문자열이면 기본 제목을 사용한다', () => {
  const digest = buildDigest([parseCommitLine('feat: 기능')], { title: '' });
  assert.ok(digest.startsWith('# 릴리즈 노트\n\n'));
});

test('buildDigest - 섹션 내부는 입력 순서를 보존한다 (stable sort)', () => {
  const commits = [
    parseCommitLine('feat(bf-1): 첫번째'),
    parseCommitLine('feat(bf-2): 두번째'),
  ];
  const digest = buildDigest(commits);
  const firstIndex = digest.indexOf('첫번째');
  const secondIndex = digest.indexOf('두번째');
  assert.ok(firstIndex < secondIndex);
});

test('CLI - stdin으로 커밋 목록을 받아 stdout으로 다이제스트를 출력한다', () => {
  const input = 'feat(bf-2186): renderBadge 구현\nfix: 버그 수정\n';
  const result = spawnSync('node', [CLI_PATH], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('# 릴리즈 노트'));
  assert.ok(result.stdout.includes('## ✨ 새로운 기능'));
  assert.ok(result.stdout.includes('## 🐛 버그 수정'));
});

test('CLI - --title 옵션으로 제목을 지정할 수 있다', () => {
  const input = 'feat: 기능 추가\n';
  const result = spawnSync('node', [CLI_PATH, '--title', 'v2.0.0'], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.startsWith('# v2.0.0\n\n'));
});
