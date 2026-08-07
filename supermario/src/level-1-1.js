// 1-1 스테이지 타일 데이터 (BF-1878)
// 문자 그리드(행 배열) + 범례. 파싱은 game.js가 수행한다.
// 좌표계: 열=x, 행=y, 픽셀 = 타일좌표 × tileSize.

export const LEGEND = {
  '.': 'empty',
  'G': 'ground', // 지면
  'B': 'brick',  // 벽돌
  '?': 'block',  // 물음표 블록(solid)
  'F': 'flag',   // 깃대(목적지)
};

const WIDTH = 40;
const SKY = '.'.repeat(WIDTH);
// 지면: 좌측 14칸 → 낙사용 구멍 2칸(cols 14~15) → 우측 24칸
const GROUND = 'G'.repeat(14) + '.'.repeat(2) + 'G'.repeat(24);

// 공백 행 위에 지정 열의 타일 문자를 얹어 폭(WIDTH)을 항상 보장한다.
function place(items) {
  const arr = SKY.split('');
  for (const [col, ch] of items) arr[col] = ch;
  return arr.join('');
}

export const LEVEL_1_1 = {
  tileSize: 16,
  spawn: { x: 2, y: 11 }, // 마리오 시작(타일 좌표)
  goal: { col: 37 },      // 깃대(목적지) 열
  rows: [
    SKY,                                                  // 0
    SKY,                                                  // 1
    SKY,                                                  // 2
    SKY,                                                  // 3
    SKY,                                                  // 4
    place([[20, 'B'], [21, 'B'], [22, '?'], [23, 'B'], [24, 'B']]), // 5 공중 벽돌/물음표
    SKY,                                                  // 6
    SKY,                                                  // 7
    place([[8, '?'], [9, 'B'], [10, '?']]),               // 8 공중 블록 묶음
    place([[37, 'F']]),                                   // 9  깃대 상단
    place([[37, 'F']]),                                   // 10 깃대
    place([[37, 'F']]),                                   // 11 깃대 (spawn 행: col2 = empty)
    place([[37, 'F']]),                                   // 12 깃대 하단
    GROUND,                                               // 13 지면(구멍 포함)
    GROUND,                                               // 14 지면
  ],
};
