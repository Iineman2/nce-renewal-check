# Consistent case correction Implementation Plan

**Intent:** Recover from a wrong customer/subscription without retaining old authority.
**Current Behavior:** Central invalidation clears model receipts, comparisons and reads. Case-specific term/agreement controls can survive a subject change; correction has no explicit focused action.
**Expected Outcome:** An explicit Change case action clears the active case, selected ID, case-specific term/agreement answers and derived authority, while retaining supplied files for efficient reselection. Manual ID changes and source replacement clear case-specific answers when an established subject changes. Same-subject comparison retries retain intentional answers.
**Target-Perspective Output:** A correction message and focused subscription field; old results and detached callbacks cannot restore the previous case. Fresh selection is a candidate requiring new confirmation.
**Truth Owner:** app.mjs owns ephemeral UI state and invalidation; preflight.mjs owns canonical records and revocable receipt identity.
**Contract Boundary:** Clearing removes authority; it does not prove eligibility or source authenticity. Questionnaire answers remain visible operator assertions; switching cases requires a fresh fit check if their meaning changes. No automatic cross-case transfer of record-specific term/agreement assertions.
**Cutover:** Route correction through existing invalidateRecordReview; add one correction action and subject-bound assertion reset, not a second selection store.
**Displaced Path:** Implicit carryover of record-specific assertions after established subject correction.
**Value Density:** Correct the active case locally without uploading files again.
**Acceptance Evidence:** Frozen source, full unit/browser suite, dedicated correction scenarios, visible recovery screenshot and independent review.
**Evidence Lane:** Local synthetic fixtures; native providers, human comprehension and universal platforms remain external.
**Kill Criteria:** No stale confirmation, resolution, comparison or asynchronous callback may survive correction. Important regression/review findings block local acceptance.
**Architecture Slice:** Modify scope-fit/app.mjs and index.html; create ONE_CASE_PRINCIPLE_7.md and ui-case-correction.js; new output/one-case-principle-7 evidence. Preserve historical proof artifacts.
**Plan Review Gate:** Requires PRE review before execution.

## Ordered tasks

1. Define correction contract and review plan. Main writes documentation; independent reviewer checks ownership and reset scope. No production changes until review.
2. Implement in app.mjs/index.html sequentially. Existing invalidation remains the sole authority teardown owner. Preserve file selection on Change case; explicit full clear resets files.
3. Add browser correction regressions for confirmed A to B, manual ID/ABA, source replacement, repeated correction, reset and pending-read late completion. Capture recovered candidate screenshot. All active data must be canonical for current subject.
4. Capture source hashes, execute full unit/syntax/browser suite in isolated sessions, preserve older screenshot bytes, and obtain independent correctness/maintainability review. Fix important findings and repeat affected evidence; source edits require frozen full rerun.

Forbidden: deploy, provider mutation, rewriting historical acceptance, claiming all possible interleavings tested. Implementation stays with main; independent reviews are read-only.
