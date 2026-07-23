import { expect, test } from "bun:test";

import { buildBunRuntimeSummary } from "./bun-runtime-summary.ts";

test("buildBunRuntimeSummary 는 유효한 Bun.version 을 포함한다", () => {
  const summary = buildBunRuntimeSummary();

  expect(summary.runtime).toBe("bun");
  // Bun.version 은 현재 런타임 버전과 일치하는 semver 형식 문자열이어야 한다.
  expect(summary.bunVersion).toBe(Bun.version);
  expect(summary.bunVersion).toMatch(/^\d+\.\d+\.\d+/);
});

test("CLI 실행 시 Bun.version 을 담은 JSON 을 stdout 에 출력한다 (부작용 없음)", async () => {
  const proc = Bun.spawn(["bun", "run", `${import.meta.dir}/bun-runtime-summary.ts`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  expect(exitCode).toBe(0);

  const parsed = JSON.parse(stdout) as { bunVersion: unknown };
  expect(typeof parsed.bunVersion).toBe("string");
  expect(parsed.bunVersion).toBe(Bun.version);
});
