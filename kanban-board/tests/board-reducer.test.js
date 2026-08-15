import { describe, expect, it } from 'vitest';
import {
  cancelDelete,
  cancelForm,
  cardsForColumn,
  confirmDelete,
  createInitialBoard,
  moveCard,
  removeCard,
  requestDelete,
  setFilter,
  startCreate,
  startEdit,
  submitCard,
  upsertCard,
} from '../src/lib/board.js';

function boardFixture(cards = []) {
  return { ...createInitialBoard(), cards };
}

function cardFixture(overrides = {}) {
  return {
    id: 'card-1',
    title: '첫 카드',
    description: null,
    priority: 'med',
    columnId: 'todo',
    ...overrides,
  };
}

describe('moveCard 경계값', () => {
  it('R1: 존재하지 않는 cardId 로 이동을 시도하면 board 전체가 변경 없이 그대로 반환된다', () => {
    const board = setFilter(
      boardFixture([
        cardFixture({ id: 'a', columnId: 'todo' }),
        cardFixture({ id: 'b', columnId: 'doing' }),
      ]),
      'high'
    );

    const next = moveCard(board, 'unknown-id', 'next');

    expect(next).toEqual(board);
  });

  it('R2: done 컬럼 카드를 next 로 이동하면 범위를 벗어나 board 가 변경되지 않는다', () => {
    const board = boardFixture([cardFixture({ columnId: 'done' })]);

    const next = moveCard(board, 'card-1', 'next');

    expect(next.cards).toEqual(board.cards);
  });

  it('R3: todo 컬럼 카드를 prev 로 이동하면 범위를 벗어나 board 가 변경되지 않는다', () => {
    const board = boardFixture([cardFixture({ columnId: 'todo' })]);

    const next = moveCard(board, 'card-1', 'prev');

    expect(next.cards).toEqual(board.cards);
  });
});

describe('removeCard 경계값', () => {
  it('R4: 존재하지 않는 cardId 삭제를 시도하면 cards 배열의 길이와 내용이 불변한다', () => {
    const board = boardFixture([cardFixture({ id: 'a' }), cardFixture({ id: 'b' })]);

    const next = removeCard(board, 'unknown-id');

    expect(next.cards).toHaveLength(2);
    expect(next.cards).toEqual(board.cards);
  });
});

describe('cardsForColumn 필터+빈 컬럼 조합', () => {
  it('R5: 카드가 하나도 없는 컬럼을 조회하면 빈 배열을 반환한다', () => {
    const board = boardFixture([cardFixture({ columnId: 'todo' })]);

    expect(cardsForColumn(board, 'done')).toEqual([]);
  });

  it('R6: 필터가 high 이고 해당 컬럼에 high 카드가 없으면 빈 배열을 반환한다', () => {
    const board = setFilter(
      boardFixture([cardFixture({ id: 'a', columnId: 'todo', priority: 'low' })]),
      'high'
    );

    expect(cardsForColumn(board, 'todo')).toEqual([]);
  });
});

describe('upsertCard 방어', () => {
  it('R7: 동일 id 를 두 번 upsert 하면 해당 id 는 정확히 1건만 남고 마지막 값으로 병합된다', () => {
    let board = createInitialBoard();
    board = upsertCard(board, cardFixture({ priority: 'low' }));
    board = upsertCard(board, cardFixture({ priority: 'high' }));

    const matches = board.cards.filter((c) => c.id === 'card-1');
    expect(matches).toHaveLength(1);
    expect(matches[0].priority).toBe('high');
  });

  it('R8: id 가 -1 인 카드도 형식 검증 없이 opaque 식별자로 그대로 추가된다 (현재 동작 고정)', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ id: -1 }));

    expect(board.cards.some((c) => c.id === -1)).toBe(true);
  });
});

describe('submitCard 검증', () => {
  it('R9: 공백만 있는 제목은 validation-error 로 전이하고 cards 는 변경되지 않는다', () => {
    const board = createInitialBoard();

    const next = submitCard(board, cardFixture({ title: '   ' }));

    expect(next.status).toBe('validation-error');
    expect(next.errorMessage).toBeTruthy();
    expect(next.cards).toEqual(board.cards);
  });

  it('R10: title 이 undefined 이면 isBlankTitle 방어에 의해 validation-error 로 전이한다', () => {
    const board = createInitialBoard();

    const next = submitCard(board, cardFixture({ title: undefined }));

    expect(next.status).toBe('validation-error');
  });

  it('R11: 앞뒤 공백이 있는 유효한 제목은 trim 되어 저장되고 idle 로 복귀한다', () => {
    const board = createInitialBoard();

    const next = submitCard(board, cardFixture({ title: '  할 일  ' }));

    expect(next.cards[0].title).toBe('할 일');
    expect(next.status).toBe('idle');
    expect(next.editingCardId).toBeNull();
  });
});

describe('삭제 상태 머신', () => {
  it('R12: requestDelete 후 confirmDelete 하면 confirming-delete 를 거쳐 카드가 삭제되고 idle 로 복귀한다', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const confirming = requestDelete(board, 'card-1');
    expect(confirming.status).toBe('confirming-delete');

    const next = confirmDelete(confirming);

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(0);
  });

  it('R13: deletingCardId 가 null 인 상태에서 confirmDelete 를 호출하면 cards 는 불변이고 idle 로만 전이한다', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());

    const next = confirmDelete(board);

    expect(next.status).toBe('idle');
    expect(next.cards).toEqual(board.cards);
  });

  it('R14: confirming-delete 상태에서 취소하면 idle 로 복귀하고 deletingCardId 가 초기화되며 cards 는 불변이다', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const confirming = requestDelete(board, 'card-1');

    const next = cancelDelete(confirming);

    expect(next.status).toBe('idle');
    expect(next.deletingCardId).toBeNull();
    expect(next.cards).toEqual(board.cards);
  });
});

describe('생성/수정 폼 상태 전이', () => {
  it('R15: startCreate 후 cancelForm 하면 idle 로 복귀하고 errorMessage/editingCardId 가 초기화된다', () => {
    const creating = startCreate(createInitialBoard());
    expect(creating.status).toBe('creating');

    const next = cancelForm(creating);

    expect(next.status).toBe('idle');
    expect(next.editingCardId).toBeNull();
    expect(next.errorMessage).toBeNull();
  });

  it('R16: startEdit 후 유효한 제출을 하면 editing 을 거쳐 idle 로 복귀하고 editingCardId 가 초기화된다', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const editing = startEdit(board, 'card-1');
    expect(editing.status).toBe('editing');

    const next = submitCard(editing, cardFixture({ title: '수정됨' }));

    expect(next.status).toBe('idle');
    expect(next.editingCardId).toBeNull();
    expect(next.cards[0].title).toBe('수정됨');
  });
});
