# Principle 8 selection handoff implementation plan

**Intent:** Carry exactly the selected case into record comparison without promoting selection into later conclusions.
**Current Behavior:** Comparison receives source text and an ID; selection review is checked separately by the UI. There is no explicit validated handoff in the comparison output.
**Expected Outcome:** A frozen versioned envelope retains canonical selection, source provenance, raw evidence, uncertainty and explicit unauthenticated/no-authority boundaries. Comparison accepts an optional envelope for legacy model callers; the app always supplies and validates it. Every app comparison result carries the envelope, including blocked outcomes. Reconfirmation regenerates it; revoked/stale/tampered envelopes fail closed.
**Target-Perspective Output:** The current selection status remains distinct from the comparison verdict, with inspectable source evidence and preserved uncertainty.
**Truth Owner:** preflight.mjs owns canonical selection and handoff; existing comparison rules own eligibility/linkage. app.mjs owns current File/control lifecycle and receipt revocation.
**Contract Boundary:** Local normalized CSV only; no export/authentication/persistence or financial authority.
**Cutover:** Existing inspectRecords receives a validated second-argument handoff context. App calls route through one current-case helper and render validates returned envelope. Existing model callers without a handoff remain explicitly legacy rule-only calls.
**Displaced Path:** App's implicit source/ID-only comparison invocation.
**Value Density:** One handoff contract and one integration owner, retaining existing rules.
**Acceptance Evidence:** Exact model tests for identity/raw evidence/status/uncertainty/tampering/revocation/source replacement; browser handoff and correction evidence; frozen full unit/syntax/browser suite; source-bound independent POST/FINAL review and actual negatives.
**Evidence Lane:** Supported local synthetic contract.
**Kill Criteria:** Changed identity, lost uncertainty, unsupported authority, stale confirmation, missing envelope or regression blocks acceptance.
**Architecture Slice:** preflight.mjs, app.mjs, case-handoff.test.mjs, ui-case-handoff.js, ONE_CASE_PRINCIPLE_8.md and new output/one-case-principle-8 QA. Preserve prior proof packs.
**Plan Review Gate:** Requires independent PRE before implementation; POST correctness/maintainability and FINAL evidence review.

Tasks execute sequentially in main: (1) specification and PRE; (2) model contract/test; (3) app integration/browser test; (4) full frozen QC, negatives, independent review and report. Review agents are read-only. No commits, deployments, provider changes or universal claims.
