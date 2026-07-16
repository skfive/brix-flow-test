# GitHub 결제 차단 패스 E2E 검증

## 결제 차단 패스 E2E 증거 (2026-07-16)

- **생성 시각**: 2026-07-16T15:35:41Z (UTC)
- **대상 시나리오**: GitHub 결제 차단(billing block) 상태에서의 E2E 패스 판정

### 검증 목적

GitHub Actions 워크플로우가 조직 결제 한도 초과로 차단된 상황을 E2E 로 재현하고,
파이프라인이 **정확한 결제 차단 annotation 을 감지했을 때만** 해당 실행을
"결제 차단 패스(billing pass)"로 판정하는지 확인한다. 이 증거 섹션은 판정 로직이
GitHub check 결과를 임의로 성공 처리하지 않는다는 점을 기록으로 남기기 위한 것이다.

### 통과 정책

1. **exact billing annotation 매칭 시에만 통과**
   GitHub 이 반환하는 결제 차단 annotation 문구가 정확히 일치할 때에만 패스로 인정한다.
   부분 문자열이나 유사 메시지는 통과 대상이 아니다.

   ```text
   The job was not started because recent account payments have failed
   or your spending limit needs to be increased.
   ```

2. **GitHub check 자체를 성공으로 위조하지 않음**
   결제 차단 패스는 어디까지나 "결제 문제로 실행 불가" 상태를 명시적으로 인지한 것이며,
   GitHub check 상태(`conclusion`)를 `success` 로 조작하거나 덮어쓰지 않는다.
   실제 check 는 `failure` / `action_required` 등 GitHub 이 반환한 원래 값을 그대로 유지한다.

   ```json
   {
     "conclusion": "action_required",
     "billing_pass": true,
     "matched_annotation": "exact"
   }
   ```

### 참고 링크

- [GitHub Actions billing 문서](https://docs.github.com/en/billing/managing-billing-for-github-actions)
- [워크플로우 실행 상태 참조](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
