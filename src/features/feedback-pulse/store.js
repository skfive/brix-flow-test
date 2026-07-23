// 인메모리 저장소 (기획 §3.2 / §4)
// 프로세스 인메모리에만 보관하며, 프로세스 재시작 시 전부 초기화된다(영속 저장소 없음).
import { randomUUID } from 'node:crypto';

/**
 * FIFO(접수 순) 인메모리 저장소를 생성한다.
 * 반환된 store 는 자신만의 items 배열을 클로저로 보유하므로 인스턴스 간 격리된다.
 */
export function createStore() {
  /** @type {Array<{id:string,sentiment:string,urgency:string,opinion:string,submittedAt:string}>} */
  const items = [];

  return {
    /**
     * 검증된 값을 저장하고 서버 생성 필드(id, submittedAt)를 부여한다.
     * @param {{sentiment:string,urgency:string,opinion:string}} value
     * @param {{ now?: number }} [opts] now: 접수 시각(ms, 테스트 주입용). 기본 Date.now().
     */
    add(value, opts = {}) {
      const now = typeof opts.now === 'number' ? opts.now : Date.now();
      const record = {
        id: randomUUID(),
        sentiment: value.sentiment,
        urgency: value.urgency,
        opinion: value.opinion,
        submittedAt: new Date(now).toISOString(),
      };
      items.push(record); // 접수 순서대로 append (FIFO)
      return record;
    },
    /** 저장된 레코드의 얕은 복사본(외부 변형 방지). */
    list() {
      return items.slice();
    },
    size() {
      return items.length;
    },
    /** 인메모리 초기화(재시작 전제 재현). */
    reset() {
      items.length = 0;
    },
  };
}
