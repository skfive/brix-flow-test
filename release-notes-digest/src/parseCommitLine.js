const COMMIT_LINE_PATTERN = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/;

export const SECTION_TITLES = {
  feat: '✨ 새로운 기능',
  fix: '🐛 버그 수정',
  docs: '📝 문서',
  refactor: '♻️ 리팩터링',
  test: '✅ 테스트',
  chore: '🔧 기타 작업',
  perf: '⚡ 성능 개선',
  ci: '👷 CI/CD',
  other: '📦 기타 변경',
};

export const SECTION_ORDER = [
  'feat',
  'fix',
  'docs',
  'refactor',
  'test',
  'chore',
  'perf',
  'ci',
  'other',
];

const RECOGNIZED_TYPES = new Set(SECTION_ORDER.filter((type) => type !== 'other'));

export function parseCommitLine(line) {
  const match = COMMIT_LINE_PATTERN.exec(line);
  if (!match) {
    return { malformed: true, raw: line };
  }

  const [, rawType, scope, subject] = match;
  const type = rawType.toLowerCase();

  return {
    type,
    scope: scope ?? null,
    subject,
    raw: line,
    recognized: RECOGNIZED_TYPES.has(type),
  };
}
