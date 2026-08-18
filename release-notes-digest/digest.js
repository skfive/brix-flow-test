import { parseCommitLine } from './src/parseCommitLine.js';
import { buildDigest } from './src/buildDigest.js';

function parseArgs(argv) {
  let title;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--title') {
      title = argv[i + 1];
      i++;
    }
  }
  return { title };
}

function splitLines(input) {
  if (input === '') return [];
  const normalized = input.endsWith('\n') ? input.slice(0, -1) : input;
  return normalized.split('\n');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const { title } = parseArgs(process.argv.slice(2));
  const input = await readStdin();
  const commits = splitLines(input).map(parseCommitLine);
  process.stdout.write(buildDigest(commits, { title }));
}

main();
