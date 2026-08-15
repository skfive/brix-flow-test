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
} from './board.js';

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

describe('upsertCard', () => {
  it('adds a new card without mutating the original board', () => {
    const board = createInitialBoard();
    const next = upsertCard(board, cardFixture());

    expect(board.cards).toHaveLength(0);
    expect(next.cards).toHaveLength(1);
    expect(next).not.toBe(board);
  });

  it('updates an existing card without mutating the original board', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = upsertCard(board, cardFixture({ title: '수정된 제목' }));

    expect(board.cards[0].title).toBe('첫 카드');
    expect(next.cards[0].title).toBe('수정된 제목');
    expect(next.cards).toHaveLength(1);
  });
});

describe('removeCard', () => {
  it('removes a card without mutating the original board', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = removeCard(board, 'card-1');

    expect(board.cards).toHaveLength(1);
    expect(next.cards).toHaveLength(0);
  });

  it('is a no-op when the card id does not exist', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = removeCard(board, 'unknown-id');

    expect(next.cards).toHaveLength(1);
    expect(next).not.toBe(board);
  });
});

describe('moveCard', () => {
  it('moves a card to the next column without mutating the original board', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'todo' }));
    const next = moveCard(board, 'card-1', 'next');

    expect(board.cards[0].columnId).toBe('todo');
    expect(next.cards[0].columnId).toBe('doing');
  });

  it('moves a card to the previous column', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'doing' }));
    const next = moveCard(board, 'card-1', 'prev');

    expect(next.cards[0].columnId).toBe('todo');
  });

  it('is a no-op when moving next from the last column', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'done' }));
    const next = moveCard(board, 'card-1', 'next');

    expect(next.cards[0].columnId).toBe('done');
  });

  it('is a no-op when moving prev from the first column', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'todo' }));
    const next = moveCard(board, 'card-1', 'prev');

    expect(next.cards[0].columnId).toBe('todo');
  });

  it('returns the same board when the card id does not exist', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = moveCard(board, 'unknown-id', 'next');

    expect(next).toBe(board);
  });
});

describe('빈 제목 (5.1)', () => {
  it('rejects an empty title and enters validation-error without creating a card', () => {
    const board = createInitialBoard();
    const next = submitCard(board, cardFixture({ title: '' }));

    expect(next.status).toBe('validation-error');
    expect(next.cards).toHaveLength(0);
    expect(next.errorMessage).toBeTruthy();
  });

  it('rejects a whitespace-only title', () => {
    const board = createInitialBoard();
    const next = submitCard(board, cardFixture({ title: '   ' }));

    expect(next.status).toBe('validation-error');
    expect(next.cards).toHaveLength(0);
  });

  it('accepts a valid title and returns to idle', () => {
    const board = startCreate(createInitialBoard());
    const next = submitCard(board, cardFixture());

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(1);
  });

  it('clears editingCardId and errorMessage on cancelForm', () => {
    const board = startEdit(createInitialBoard(), 'card-1');
    const next = cancelForm(board);

    expect(next.status).toBe('idle');
    expect(next.editingCardId).toBeNull();
    expect(next.errorMessage).toBeNull();
  });
});

describe('삭제 확인 (5.2)', () => {
  it('requestDelete transitions to confirming-delete without removing the card', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = requestDelete(board, 'card-1');

    expect(next.status).toBe('confirming-delete');
    expect(next.cards).toHaveLength(1);
  });

  it('confirmDelete removes the card and returns to idle', () => {
    const board = requestDelete(upsertCard(createInitialBoard(), cardFixture()), 'card-1');
    const next = confirmDelete(board);

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(0);
  });

  it('cancelDelete preserves the card and returns to idle', () => {
    const board = requestDelete(upsertCard(createInitialBoard(), cardFixture()), 'card-1');
    const next = cancelDelete(board);

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(1);
  });
});

describe('필터 초기화 (5.3)', () => {
  it('cardsForColumn only returns cards matching the active priority filter', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a', priority: 'high' }));
    board = upsertCard(board, cardFixture({ id: 'b', priority: 'low' }));
    board = setFilter(board, 'high');

    expect(cardsForColumn(board, 'todo')).toHaveLength(1);
    expect(cardsForColumn(board, 'todo')[0].id).toBe('a');
  });

  it('resets to show all cards when filter is set back to all', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a', priority: 'high' }));
    board = upsertCard(board, cardFixture({ id: 'b', priority: 'low' }));
    board = setFilter(board, 'high');
    board = setFilter(board, 'all');

    expect(cardsForColumn(board, 'todo')).toHaveLength(2);
  });
});
