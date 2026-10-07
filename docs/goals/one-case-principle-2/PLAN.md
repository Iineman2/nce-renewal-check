# Feature 1.2 Principle 2 identity plan

**Intent:** Distinguish source records using identifiers and namespace, independently of descriptions.
**Current Behavior:** Exact subscription row selection retains customer reference but no explicit identity contract or source-account context.
**Expected Outcome:** Immutable versioned identity preserves Pax8 system, optional supplied source_account_id, customer_ref and subscription_id; unresolved namespace yields no complete scoped key. Renewal occurrence is separate. Optional customer/product names, SKU and seat text are descriptive only.
**Target-Perspective Output:** Current case explains supplied account context, identity completeness and descriptive labels. Duplicate IDs remain ambiguous, regardless of similar names or distinct accounts.
**Truth Owner:** Existing canonical subject projection from parsed source. All identity values remain supplied claims.
**Contract Boundary:** Normalized local CSV with optional source_account_id/customer_name/product_name/product_sku/seat_count columns; no native-vendor export or authenticated tenant identity claim.
**Cutover:** Canonical subject gains one versioned identity object and descriptive object; comparison handoff carries same identity derived from selected row. Existing exact-ID selection and record-link rules stay authoritative.
**Displaced Path:** Customer reference/subscription ID alone no longer imply complete namespace identity. No new alternate selector or matching classifier.
**Value Density:** Prevent equal display labels, delimiters, leading zeros and missing accounts from implying equal subjects.
**Acceptance Evidence:** Model collision/source-binding/handoff tests; browser literal display, optional account and replacement invalidation; full source-bound model/syntax/browser/negative gates and independent PRE/POST review.
**Evidence Lane:** Local synthetic; real exports/account authenticity and operator comprehension remain external.
**Kill Criteria:** No identity key from missing/unusable namespace; no descriptive attribute in key; no silent resolution among duplicate IDs; no stale/corrupt identity displayed.
**Architecture Slice:** preflight.mjs private row identity builder used by canonical subject and comparison; app.mjs displays validated canonical object; index.html documents optional normalized columns. New tests/spec and output/one-case-principle-2 QC tools/receipts.
**Plan Review Gate:** PRE then POST correctness/maintainability/evidence review required.

Main owns sequential tasks: identity projection and handoff; UI/documentation; targeted tests; independent source review; freeze and execute full QC; final evidence review. Preserve all historical failed probes and source checkouts. No deploy, provider access, persistence, billing action or later-principle search/confirmation.

## Expanded 101-case audit closure

User authorized QC closure. Capture selected comparison metadata once using existing plain-data descriptor capture; reject accessors without invoking them, then validate and render only the frozen captured selection. Preserve canonical claim-review proxy behavior. Add model accessor/proxy/serialization/normalization/confirmation/resource gates and browser getter/nested-getter/proxy/cancellation/source-replacement tests. Capture all 101 audit IDs in a closure ledger with representative-local, bounded and external dispositions. Preserve original dynamic-probe receipts. Main implements sequentially; PRE and POST correctness/maintainability/evidence review required. New qualification owner is output/one-case-principle-2-closure; earlier qualification remains historical after source changes.
