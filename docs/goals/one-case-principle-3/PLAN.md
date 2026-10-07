# Feature 1.2 Principle 3 inspectable evidence implementation plan

**Intent:** Selection must be grounded in inspectable evidence, following NCE_ONE_CASE_SELECTION_PRINCIPLES.md.
**Current Behavior:** Canonical subject displays source filename, logical record number, identity/descriptions and decoded raw cells; original lexical CSV record and normalized field comparison are absent.
**Expected Outcome:** Every uniquely source-selected case exposes all supplied fields with original header, decoded raw value and normalized value, plus exact original CSV record and source offsets. Unknown identity remains explicit. No evidence is invented for missing/duplicate/malformed selection.
**Target-Perspective Output:** Expand the selected-record inspector; recognize the same case, see normalization and the original record, with visible control characters and literal hostile text.
**Truth Owner:** Existing shared CSV parser and private canonicalCaseSubject; its assertion rederives and owns the immutable evidence projection.
**Contract Boundary:** Versioned evidence attached to canonical subject, authenticated false; offsets refer to decoded input string UTF-16 code units, including leading BOM, excluding record terminator. Raw cell means decoded CSV cell before trim; original record preserves quotes/delimiters/embedded newlines. File content is supplied evidence, not authenticated vendor truth.
**Cutover:** Replace the raw-only inspector with an accessible raw/normalized field table and original record, preserving existing summary and raw labels.
**Displaced Path:** Raw-only rendering is replaced; no second parser or evidence owner.
**Value Density:** One selected row, at existing 2MB/5000-row/64-column limits; no additional parser passes.
**Acceptance Evidence:** Model fidelity/source-binding/fault/resource tests; isolated browser evidence/literal display/invalidation/fault/accessibility tests; all previous model/browser/syntax gates; frozen source/served-byte/receipt verification; negative tampering tests and independent review.
**Evidence Lane:** Local normalized CSV only. Native mapping, authentic sources and human comprehension remain external.
**Kill Criteria:** Reject inconsistent/accessor evidence before rendering or confirmation. No raw source execution, truncation, invented fields, stale inspector or duplicate parsing path.
**Architecture Slice:** Modify scope-fit/preflight.mjs and app.mjs; add case-evidence.test.mjs, ui-case-evidence.js, ONE_CASE_PRINCIPLE_3.md; create output/one-case-principle-3 QC tooling. Existing contracts and prior audit ledgers remain regression requirements.
**Plan Review Gate:** Requires independent PRE review before execution, POST correctness/maintainability and final evidence review.

Main owns sequential implementation: parser locator metadata and canonical projection; inspector; model/browser tests and specification; review repairs; freeze/full QC; final review. Reviewer owns read-only review and metadata receipt only. No commit/deploy/provider writes, search/filter, new selection confirmation workflow, global deduplication or eligibility change.

## Expanded audit closure

User authorized implementation and QC closure of output/one-case-principle-3-audit/failure-matrix.json: 120 scenarios/24 families and two reproduced findings. Preserve original failed probes and receipts.

Truth owners remain shared CSV parser/private canonical subject; input.mjs owns one Unicode visibility predicate shared by safe identifiers and display/JSON escaping. Displace narrower local regex owners. Extend Cc/Cf/Zl/Zp visibility to Default_Ignorable_Code_Point; reject those characters in identifiers after existing trim, without silently altering source IDs. Preserve exact raw text and JSON roundtrip including supplementary codepoints and literal escape text.

Displace direct incremental DOM mutation with detached inspector construction and one replaceChildren commit. On pre-owner rendering failure clear/reset subject display; retain independent valid Pax8 subject on later Halo failure. Test early/late construction and commit failures, silent edit/focus, zero confirmation, retry and cleanup.

Main sequential tasks: Unicode helper and atomic rendering; expanded model and browser regressions, including generated CSV fidelity, headers, hostile fields/filenames, 400%/text spacing/forced colors/print/current-engine activation; closure specification and ledger containing all 122 scenario/finding IDs; PRE/POST correctness/maintainability review; freeze source/served bytes and full previous/new QC; negative evidence gates and independent final review. output/one-case-principle-3-closure owns new receipts. Bounded/external conditions remain explicit, not invented passing acceptance. No provider access, deployment, persistence, payment, native mapping claim or later selection workflow. Maximum browser layout is representative, not a device-wide SLA. Review metadata only may be written by reviewer; main owns captured sources/tools/ledger/docs.
