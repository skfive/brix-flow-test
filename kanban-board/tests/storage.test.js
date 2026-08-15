import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBoard, saveBoard } from '../src/lib/storage.js';

const STORAGE_KEY = 'kanban-board-state';

describe('storage', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('S1: saveBoard 로 저장한 board 를 loadBoard 가 동일하게 복원한다', () => {
    const board = { cards: [{ id: 'card-1', title: '할 일' }], status: 'idle' };
    saveBoard(board);

    expect(loadBoard()).toEqual(board);
  });

  it('S2: 저장된 값이 없으면 loadBoard 는 null 을 반환한다', () => {
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadBoard()).toBeNull();
  });

  it('S3: 저장된 JSON 이 손상되어 파싱할 수 없으면 loadBoard 는 예외 없이 null 을 반환한다', () => {
    window.localStorage.setItem(STORAGE_KEY, '{invalid');

    expect(() => loadBoard()).not.toThrow();
    expect(loadBoard()).toBeNull();
  });

  it('S4: 저장된 값이 빈 문자열이면 loadBoard 는 null 을 반환한다', () => {
    window.localStorage.setItem(STORAGE_KEY, '');

    expect(loadBoard()).toBeNull();
  });

  it('S5: window.localStorage 가 없으면 loadBoard 는 예외 없이 null 을 반환한다', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });

    try {
      expect(() => loadBoard()).not.toThrow();
      expect(loadBoard()).toBeNull();
    } finally {
      Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
    }
  });

  it('S6: window.localStorage 가 없으면 saveBoard 는 예외 없이 조용히 no-op 한다', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });

    try {
      expect(() => saveBoard({ cards: [] })).not.toThrow();
    } finally {
      Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
    }
  });

  it('S7: setItem 이 QuotaExceededError 를 던지면 saveBoard 는 예외를 전파하지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    expect(() => saveBoard({ cards: [] })).not.toThrow();
  });

  it('S8: saveBoard 는 board 를 JSON.stringify 한 값 그대로 setItem 에 전달한다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const board = {
      cards: [
        { id: 'a', title: '카드 A', columnId: 'todo' },
        { id: 'b', title: '카드 B', columnId: 'doing' },
      ],
      status: 'idle',
    };

    saveBoard(board);

    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(board));
  });
});
