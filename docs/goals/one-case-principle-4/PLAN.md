# Feature 1.2 Principle 4: visible uncertainty

**Intent:** Keep uncertainty visible and prevent unreliable case selection from progressing.
**Current Behavior:** Unique rows are called selected even without account context; no explicit case confirmation exists.
**Expected Outcome:** Canonical candidate, unresolved and confirmed states; explicit reasons; no duplicate default; incomplete identity or occurrence cannot be confirmed. Original evidence remains inspectable.
**Target-Perspective Output:** Current case explains uncertainty and offers explicit source confirmation only for a complete unique candidate. Existing link attestation can explicitly jointly confirm case and link.
**Truth Owner:** Private canonicalCaseSubject and shared parser in preflight.mjs. App owns ephemeral confirmation context tied to captured controls.
**Contract Boundary:** Selection review is separate from comparison, eligibility, authentication and financial authority. Exact source text and ID bind the receipt. No durable persistence or provider verification.
**Cutover:** Replace selected status with candidate/unresolved; add canonical confirmation review. Gate comparison actions and provisional progression on readiness/confirmation. Existing link attestation jointly confirms a ready case to avoid a redundant action.
**Displaced Path:** Unique-row inference of complete selection; comparison progression with missing account context.
**Value Density:** One owner, bounded duplicate summaries (20 of at most 5000), no chooser/search or new parsing path.
**Acceptance Evidence:** Adversarial model tests; isolated browser uncertainty/confirmation/invalidation/literal text/resource gates; all prior unit/browser/syntax gates; frozen source and served-byte evidence; negative receipt checks; independent PRE/POST/final reviews.
**Evidence Lane:** Local synthetic normalized CSV. Native mapping, authenticated sources, human comprehension and business outcomes remain external.
**Kill Criteria:** No default selection, incomplete confirmation, stale/detached promotion, forged projection, silent certainty, duplicated owner or financial authorization.
**Architecture Slice:** preflight.mjs, app.mjs, explicit positive fixture migrations, new uncertainty tests/spec and output/one-case-principle-4 tooling. Preserve prior audit inventories and receipts.
**Plan Review Gate:** Independent PRE before implementation, POST correctness/maintainability and final frozen evidence review.

Main sequential board: canonical selection review; app gating and confirmation; explicit fixture migration; focused and full regression/QC; review repairs and freeze. Reviewer is read-only except review metadata. No commits/deploy/provider mutation.

PRE independent PASS. Implementation detail: a private WeakMap binds immutable ephemeral receipt objects to exact source text and exact selector rather than placing a potentially 2MB serialized source basis in the projection. Cloned/serialized receipts cannot confirm; readiness is independently recomputed. App control/date/policy guards own lifecycle expiry. Browser positive fixtures explicitly supply synthetic account context; intentional missing-account cases remain blocked and inspectable.
