# 재시도 운영 가이드 / Retry Operations Guide

이 문서는 운영자가 실패한 작업의 재시도 여부를 일관되게 판단하도록 돕는다.
This document helps operators decide consistently whether to retry a failed task.

## 목적 / Purpose

이 가이드의 목적은 운영자가 실패한 작업을 마주했을 때 재시도 판단을 문서 하나로 일관되게 내리도록 돕는 것이다.
The purpose of this guide is to help operators make retry decisions consistently from a single document when facing a failed task.

아래 섹션은 재시도 가능 조건, 확인 체크리스트, 중단 조건을 순서대로 제공한다.
The sections below provide retryable conditions, a verification checklist, and stop conditions in order.

## 재시도 가능 조건 / Retryable conditions

아래 유형의 실패는 원인이 일시적일 가능성이 높아 재시도 대상이 될 수 있다.
Failures of the following types are likely transient and may be candidates for a retry.

- 일시적인 네트워크 오류로 요청이 중단된 경우.
- The request was interrupted by a transient network error.
- 요청이 시간 초과(timeout)로 실패했지만 대상 서비스는 정상인 경우.
- The request failed with a timeout while the target service remained healthy.
- 일시적인 자원 부족이나 순간적인 부하로 처리가 지연·거부된 경우.
- Processing was delayed or rejected due to temporary resource pressure or a momentary load spike.

## 확인 체크리스트 / Verification checklist

재시도를 실행하기 전에 아래 항목을 순서대로 확인한다.
Confirm the following items in order before performing a retry.

- [ ] 실패 로그에서 오류 유형이 위의 재시도 가능 조건에 해당하는지 확인했다.
- [ ] Confirmed the error type in the failure log matches a retryable condition above.
- [ ] 동일 작업이 이미 재시도되었는지, 재시도 횟수가 한도를 넘지 않았는지 확인했다.
- [ ] Confirmed whether the same task was already retried and that the retry count is within the limit.
- [ ] 재시도가 중복 처리나 부작용을 일으키지 않는 멱등한 작업인지 확인했다.
- [ ] Confirmed the task is idempotent so that a retry does not cause duplicate processing or side effects.

## 실패 시 중단 조건 / Stop conditions

아래 조건 중 하나라도 해당하면 재시도를 멈추고 에스컬레이션한다.
Stop retrying and escalate if any of the following conditions apply.

- 재시도 횟수가 정해진 한도에 도달한 경우.
- The retry count has reached the defined limit.
- 동일한 오류가 반복되어 원인이 일시적이지 않다고 판단되는 경우.
- The same error repeats, indicating the cause is not transient.
- 실패 원인이 잘못된 입력이나 설정 오류처럼 재시도로 해결되지 않는 경우.
- The failure stems from invalid input or a configuration error that a retry cannot resolve.
