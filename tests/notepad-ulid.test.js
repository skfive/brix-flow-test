// BF-402 · ULID 생성기 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";

import { ulid, CROCKFORD_ALPHABET } from "../notepad/ulid.js";

test("ulid: 길이 26자 (10 시간 + 16 랜덤)", () => {
  const id = ulid();
  assert.equal(id.length, 26);
});

test("ulid: Crockford base32 알파벳만 사용", () => {
  const id = ulid();
  for (const ch of id) {
    assert.ok(
      CROCKFORD_ALPHABET.includes(ch),
      `예상 외 문자: ${ch} (id=${id})`,
    );
  }
});

test("ulid: 더 늦은 시각이 사전순으로 더 큼 (시간 정렬 가능)", () => {
  const fixedRng = () => 0; // random 부분 동일
  const a = ulid(1700000000000, fixedRng);
  const b = ulid(1700000000001, fixedRng);
  assert.ok(a < b, `a(${a}) < b(${b}) 여야 함`);
});

test("ulid: 동일 시각에서도 random 으로 서로 다른 id 생성", () => {
  const a = ulid(1700000000000);
  const b = ulid(1700000000000);
  assert.notEqual(a, b);
});

test("ulid: 시간 prefix 가 동일 시각이면 동일 (앞 10자)", () => {
  const fixedRng = () => 0.5;
  const a = ulid(1700000000000, fixedRng);
  const b = ulid(1700000000000, fixedRng);
  assert.equal(a.slice(0, 10), b.slice(0, 10));
});
