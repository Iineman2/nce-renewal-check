# Feature 1.2 Principle 2: identity distinguishes records

## Expected behavior

Source identifiers establish a record's supplied identity; names, product labels, SKU, seat text and dates help recognition but cannot substitute for those identifiers. The normalized Pax8 format accepts optional source_account_id, customer_name, product_name, product_sku and seat_count columns. Existing required columns and exact-ID selection remain unchanged.

The canonical subject owns one immutable source-case-identity-v1 object: source system Pax8, supplied source-account ID, customer reference and subscription ID. A complete structured key exists only when all three identifiers are syntactically usable. Missing or unusable namespace/customer identifiers produce unresolved identity and null keys; a row may still be source-selected in the current file. Identity completeness is separate from selection status and eligibility.

The key encodes the full tuple using JSON, preserving delimiters, case, leading zeros and Unicode distinctions after existing trim normalization. Names, filenames, row positions, products and quantities are excluded. A separate occurrence key combines that identity and a valid supplied renewal date. A missing/invalid date cannot generate an occurrence key or action deadline.

All fields remain unauthenticated supplied claims. The key is scoped to a supplied source account, not a globally authenticated MSP/workspace identity. Unknown account context is visible and never inferred from a filename, customer name or HaloPSA row. Existing unknown vocabulary (unknown, N/A, NA, not sure, unspecified, TBD, or blank, case-insensitive) cannot establish an account namespace. Other syntactically usable identifiers remain supplied claims; vocabulary cannot authenticate vendor truth.

## Selection, correction and handoff

Two customer/subscription identifiers remain distinct even when descriptive labels match. Duplicate subscription IDs, including different supplied accounts, remain unresolved under the current exact-ID selector. A scoped replacement export is required; no new account chooser, automatic name matching or ambiguity override was introduced.

The subject projection validates all identity/descriptive/raw fields against the private canonical source owner before rendering. Account/file/subscription changes invalidate current subject and dependent results. Account metadata enters the comparison review basis, so an old link confirmation cannot survive a changed account. Completed comparison decisions carry the same canonical caseIdentity, separately from selected billing-line identity. The UI validates the identity handoff and displayed selected IDs against source and canonical claim trail; missing or inconsistent metadata stops before confirmation. Identity/link/policy-blocked early decisions can lack a comparison identity; the current subject card remains its own owner when a unique source subject exists.

The current card displays account context and descriptive labels as literal text and explains incomplete namespace. Optional seat text is descriptive only, not a quantity calculation or validated billing unit. No authentication, new native-export adapter, global persistence, provider write or permission to act is implied.

## Strict acceptance gates

Seven new model tests cover same-label distinctions, unusable namespace, separate occurrence keys, delimiter/case/leading-zero/Unicode collisions, duplicate IDs across accounts, canonical corruption/immutability and identity handoff with changed-account confirmation invalidation. The new browser script covers descriptions, account display, correction, same-name file replacement, missing namespace, duplicate accounts, literal unsafe-looking text and five subject/handoff corruption variants, with zero page errors.

All earlier model, browser, source-consistency, accessibility, date/policy, reset/cancel, concurrency and recovery suites remain required. Current-source receipts, served hashes, hygiene and eleven negative checks are executed through output/one-case-principle-2/qc.py and negative-qc.py. Existing 132-case questionnaire and 102-case Principle 1 inventories stay regression gates, not new universal acceptance claims. Current counts and review outcome are stored in final-qualification.json and independent-review-receipt.json.

The rendered selected-comparison path uses four shared-parser passes: subject producer, subject canonical assertion, existing comparison and identity handoff assertion. Resource limits remain 2MB, 5,000 rows and 64 columns; maximal fixtures remain model gates. Universal device responsiveness and native-source suitability need separate evidence.

## Qualification limits

The implemented identity contract is verified against the supported normalized local format. Authentic vendor account/customer IDs, correct export mapping, authenticated tenant isolation and operator comprehension require real-source/human acceptance. Missing account context remains unresolved even if other supplied scope claims look provisional. Later principles must add any richer selection/confirmation workflow and enforce their own downstream eligibility requirements.
