import { SECTION_TITLES, SECTION_ORDER } from './parseCommitLine.js';

const DEFAULT_TITLE = '릴리즈 노트';

function formatItem(commit) {
  const { type, scope, subject, recognized } = commit;
  if (recognized) {
    return scope ? `**[${scope}]** ${subject}` : subject;
  }
  return scope ? `**[${type}/${scope}]** ${subject}` : `**[${type}]** ${subject}`;
}

export function buildDigest(commits, options = {}) {
  const title = options.title ? options.title : DEFAULT_TITLE;
  const grouped = new Map(SECTION_ORDER.map((type) => [type, []]));
  const malformed = [];

  for (const commit of commits) {
    if (commit.malformed) {
      malformed.push(commit.raw);
      continue;
    }
    const sectionKey = commit.recognized ? commit.type : 'other';
    grouped.get(sectionKey).push(commit);
  }

  const sections = SECTION_ORDER.filter((type) => grouped.get(type).length > 0).map((type) => {
    const lines = grouped.get(type).map((commit) => `- ${formatItem(commit)}`);
    return `## ${SECTION_TITLES[type]}\n\n${lines.join('\n')}`;
  });

  if (sections.length === 0) {
    return `# ${title}\n\n변경 없음\n`;
  }

  if (malformed.length > 0) {
    const lines = malformed.map((raw) => `- ${raw}`);
    sections.push(`## ⚠️ 분류 보류\n\n${lines.join('\n')}`);
  }

  return `# ${title}\n\n${sections.join('\n\n')}\n`;
}
