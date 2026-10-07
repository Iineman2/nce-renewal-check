# Principle 8 source-following implementation plan

**Intent:** Make the path from original questionnaire claims to the current record check explicit, accurate and immutable.
**Current Behavior:** Reconciliation exists, but the UI's raw provenance/conflict lists do not fully expose the effective classifier inputs and economic overrides.
**Expected Outcome:** A field-specific claim trail shows original, supplied, review and effective values/origin with no trust escalation or silent answer rewrite.
**Target-Perspective Output:** Visitor can review why a claim changed, retain original responses, correct conflicting records and see the rerun's exact new scope interpretation.
**Truth Owner:** Existing fit/preflight rules and merge branches own values/choices. A detached read-only projection owns trace presentation. Actual vendor/agreement truth remains external.
**Contract Boundary:** Feature 1.1 local questionnaire/normalized CSVs. No native adapters, vendor authentication, signed-term review, persistent history, export, financial authority or deadlines.
**Cutover:** Add origin capture within the current merge path and render its immutable snapshot. Existing provenance stays as source-detail compatibility presentation; no parallel classification.
**Displaced Path:** Incomplete effective-value interpretation from raw provenance alone is demoted. Existing policy/routing remains authoritative.
**Value Density:** Expose and verify actual corrections and uncertainty guards without adding questions or integrations.
**Acceptance Evidence:** New exhaustive/independent source-following model checks, fresh browser paths with unchanged original radios, existing regressions, axe/mobile/keyboard, syntax, explicit whitespace and saved receipts.
**Evidence Lane:** Local synthetic implementation. Real mapping, authenticated records and human acceptance remain explicitly pending.
**Kill Criteria:** No incorrect effective value/origin, mutable original snapshot, candidate link promoted to authentication, stale visible trail, silent answer rewrite, parallel classifier or financial verdict.
**Architecture Slice:** scope-fit claims projection module/tests; fit/preflight capture; app trail rendering; relevant index/help, README/policy/spec. Preserve unrelated research/root files and untracked checkout.
**Plan Review Gate:** PRE reviewer found architecture aligned with origin capture inside merge branches; implement only after required details are included. POST review required.

## Ordered task board

1. Main agent: implement immutable claim projection and questionnaire/early/policy carry. Inputs: saved Principle 8 spec and existing fit rules. Allowed: claims module, fit and focused tests. Evidence: exact input, excluded prefix, no mutation/trust assertions. Depends: PRE review.
2. Main agent: capture source origins/reasons in existing preflight branches and all record contributors. Allowed: preflight and projection/tests. Evidence: original/effective/cause oracle across source/review/economic variants. No second classifier. Depends: task 1.
3. Main agent: render accessible trace and preserve original controls/invalidation. Allowed: app/index and new browser scripts. Evidence: before-link, accepted/kept/informed/guarded and corrected reruns plus lifecycle. Depends: task 2.
4. Read-only reviewer: POST correctness, ownership, maintainability and evidence boundaries; main fixes all material findings. Review may run alongside test preparation; application edits stay sequential in main.
5. Main agent: full local QC, current policy/spec/README and per-gate evidence ledger; explicitly retain external pending gates. No commit, destructive cleanup, deployment or provider mutation.

## Completion evidence

Tasks 1–5 implemented. Independent PRE and POST reviews completed; two POST state-label defects fixed. Final model suite passes 101 tests, syntax passes 30 files, and 19 fresh-session browser scripts pass. The claim-trail gate ledger, source manifest and external limits are recorded in `scope-fit/PRINCIPLE_8_QC_CLOSURE.md` and `output/principle-8-qc/`. No native exports, authenticated vendor evidence or human acceptance are inferred from these checks.
