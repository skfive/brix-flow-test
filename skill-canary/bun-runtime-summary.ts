/**
 * BF-1101 [Canary] Bun 런타임 요약 CLI.
 *
 * Bun.version 및 런타임 정보를 JSON으로 stdout 에 출력한다.
 * 부작용 없음 — 전역/프로세스 값만 읽으며 파일 쓰기·네트워크 접근을 하지 않는다.
 */

/** Bun 런타임 요약 결과 형태. */
export interface BunRuntimeSummary {
  /** 항상 "bun" — 이 요약이 어떤 런타임에서 생성됐는지 식별한다. */
  readonly runtime: "bun";
  /** Bun 런타임 버전 (예: "1.2.23"). */
  readonly bunVersion: string;
  /** Bun 빌드 리비전(git 커밋 해시 문자열). */
  readonly bunRevision: string;
  /** 실행 플랫폼 (예: "linux", "darwin"). */
  readonly platform: string;
  /** 실행 아키텍처 (예: "x64", "arm64"). */
  readonly arch: string;
  /** Bun 이 노출하는 Node 호환 버전 문자열 (예: "v22.6.0"). */
  readonly nodeCompat: string;
}

/**
 * 현재 Bun 런타임 정보를 요약해 반환한다.
 *
 * 순수 함수 — 전역 `Bun` 과 `process` 값을 읽기만 하며 부작용이 없다.
 */
export function buildBunRuntimeSummary(): BunRuntimeSummary {
  return {
    runtime: "bun",
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    platform: process.platform,
    arch: process.arch,
    nodeCompat: process.version,
  };
}

// CLI 진입점: 이 파일이 직접 실행될 때만 요약 JSON 을 stdout 에 출력한다.
if (import.meta.main) {
  process.stdout.write(`${JSON.stringify(buildBunRuntimeSummary(), null, 2)}\n`);
}
