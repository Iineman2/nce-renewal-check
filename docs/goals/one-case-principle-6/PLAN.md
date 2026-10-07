# Evidence-bound case confirmation implementation plan

**Intent:** Feature 1.2 Principle 6: confirmation applies to a specific evidence state.
**Current Behavior:** Private receipts already bind exact source text and exact selector; UI file/control snapshots clear derived state. Receipts have no explicit revocation, and rendered subject evidence has no independent freshness snapshot.
**Expected Outcome:** Only an explicit attestation of the current complete, unique source case produces confirmation. Exact source/selector changes, replacement files (including equal bytes), control or visible evidence changes, resets, expiry and stale callbacks cannot inherit confirmation. Invalidated receipts remain revoked even if earlier bytes return. A fresh valid state requires a fresh attestation.
**Target-Perspective Output:** Browser shows candidate -> confirmed -> cleared/candidate on replacement, preserves inspectable evidence, and cannot progress through old buttons or changed evidence.
**Truth Owner:** preflight.mjs canonical source reconstruction and private confirmation receipt registry; app.mjs owns current file/control generation and receipt lifetime.
**Contract Boundary:** Decoded local CSV text is the source version at model boundary. File object plus captured controls/generation is the UI replacement boundary. Self-attestation remains unauthenticated and does not establish eligibility, linking, coverage or action permission.
**Cutover:** Add irreversible private receipt revocation and enforce it in the existing invalidation path; use one canonical review path. Add rendered-subject freshness to existing action/focus checks.
**Displaced Path:** Unrevokable receipts and unchecked changed visible subject evidence.
**Value Density:** Close confirmation authority gaps without changing source identity or introducing persistence.
**Acceptance Evidence:** Full unit/syntax/browser regressions, dedicated model/browser gate markers, source-bound receipts with exact hashes, exact-reason negative verifier checks, screenshot and independent POST/FINAL review.
**Evidence Lane:** Local fixtures and supported browser only. Native export authenticity, operator comprehension and universal platform acceptance remain external pending.
**Kill Criteria:** No duplicate confirmation store or bypass; any stale receipt or altered view gaining authority blocks acceptance.
**Architecture Slice:** Modify scope-fit/preflight.mjs and app.mjs; create case-confirmation.test.mjs, ui-case-confirmation.js, ONE_CASE_PRINCIPLE_6.md and output/one-case-principle-6 QC artifacts. Preserve historical receipts and audits. No provider writes, deploy or commits.
**Plan Review Gate:** Requires PRE review before execution.

## Ordered task board

1. Main: define canonical revocation API and subject freshness contract. Inputs current model/UI. Evidence dedicated model tests.
2. Main: integrate revocation before invalidation and confirmation replacement; capture visible subject evidence and native selector edit fallbacks. Evidence real browser stale/replacement/recovery paths.
3. Main: frozen full regression and source-bound QC runner, exact owner markers, negative checks, receipt seal. Preserve historical evidence; output receipts only in new folder.
4. Independent reviewer: PRE then POST correctness/maintainability and FINAL evidence acceptance; main fixes findings and seals final pack.

Implementation is sequential. Review is read-only; no parallel writes. Completion requires actual browser outcomes and unchanged source, not merely test counts.

## PRE correction

Independent PRE review identified hidden/inert/aria-hidden/style root mutations absent from an inner-content fingerprint. Use normalized outerHTML retaining root attributes except app-owned tabindex and the three root accessibility spacing properties (letter-spacing, word-spacing, line-height), and all descendant node identities; omit details open only. Include root visibility mutation browser gates. Model revocation is owner-invoked lifecycle deletion, while mismatched review is nonconfirming.

## Regression correction

Full browser regression reproduced loss of inspectable valid source evidence when malformed Halo comparison threw. Failure cleanup now revokes the receipt and discards comparison authority, then independently validates and rerenders intact source evidence as a candidate; corrupt/stale source review still clears all selection. Dedicated failed-comparison receipt revocation browser gate plus earlier failed-Halo inspector regressions are mandatory.

## Accessibility correction

Material evidence freshness excludes only inspector disclosure, root focus tabindex and root letter/word spacing and line height. Render preserves these three accessibility spacing properties; root visibility/style remainder still invalidates. Legacy inspector construction/commit fault anchors track the new snapshot commit and still exercise all five failure stages. B17 verifies unchanged confirmation under spacing and focus.
