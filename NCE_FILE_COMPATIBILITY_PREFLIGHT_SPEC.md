# Feature 1.3: File compatibility preflight — expected behavior

Status: proposed product behavior, 3 October 2026. This defines the strongest intended version of the next feature under behavior 1, Check eligibility. It does not claim implementation or acceptance of new readers, native exports, document processing or secure hosted uploads. The feature order comes from NCE_THIN_SLICE_BEHAVIOR_FEATURES.md.

Its ten foundational principles are saved in [NCE_FILE_COMPATIBILITY_PREFLIGHT_PRINCIPLES.md](NCE_FILE_COMPATIBILITY_PREFLIGHT_PRINCIPLES.md). They define the invariants for implementing this behavior principle by principle.

## Outcome

An authorized MSP operator can supply the records for one renewal and answer:

> Can this product read these exact files, what can I inspect, what needs correction, and what check can I do next?

The best experience requires no routine founder assistance, hand-renaming of columns or copying agreement text into a form. An operator sees a preview and an actionable result for each file. Unsupported input receives an honest recovery path. The application retains the original evidence and carries readable material forward without adding eligibility, authenticity, record-match, signature or financial conclusions.

The completion condition is:

> Every supplied file has a current, inspectable compatibility disposition bound to its exact content and reader policy. The operator can advance along an explicitly supported next step or knows precisely what prevents it. No incomplete or stale processing result appears complete.

## Ownership and feature boundaries

| Owner | Responsibility |
| --- | --- |
| Feature 1.1, scope questionnaire | Retain the original self-reported scope claims. |
| Feature 1.2, one-case selection | Own the selected case, its identity, uncertainty and evidence-specific confirmation. |
| Feature 1.3, this preflight | Own file admission, bounded reading, structural inventory, preview, compatibility issues and the versioned file receipt. |
| Feature 1.4, field mapping and validation | Assign columns to business fields and validate identifiers, quantities, dates, currencies, units and economic meanings. |
| Features 1.5–1.7 | Determine the renewal window, agreement presence and overall eligibility/readiness under their own rules. |
| Behavior 2 | Establish the relationship among subscription, billing line and agreement. |
| Behavior 3 | Extract candidate contract facts and obtain source-linked human confirmation. |
| Data-protection behavior and upload controls | Own authorization, tenant isolation, actual retention/deletion and any approved hosted processing. |

For this feature, readable means a qualified reader can expose the source safely and structurally, with declared limitations. A readable agreement does not prove it is signed, complete, authentic, current or applicable to the selected subscription. A readable table may still have missing business fields, an unknown source profile or unmappable values. These are visible downstream tasks, rather than a false compatibility or coverage verdict.

Preflight is reusable when files first enter discovery and when files are added after selection. The matrix's numbering is build organization; it does not require selecting a CSV row before checking whether its file can be read. Preflight must use the existing case owner instead of creating another current-case store or confirmation mechanism.

## Intended operator experience

1. **Prepare with clear expectations.** Before file selection, show the source roles, supported reader/profile versions, exact limits, privacy behavior and synthetic samples. Explain how to obtain a supported export. Do not request credentials, payment details or unnecessary personal data.
2. **Supply files independently.** Provide labeled Pax8, HaloPSA and agreement/order areas, keyboard file selection and optional drag-and-drop. One Pax8 file is sufficient to start discovery; a missing HaloPSA file or agreement does not conceal readable Pax8 evidence. Agreements can include an order and amendments without silently choosing the governing version.
3. **See progress and retain control.** Each file shows waiting, reading or processing progress, followed by a stable result. Cancel, remove and replace work during processing. The interface identifies which file is blocking which next step.
4. **Inspect what was found.** For records, show detected format/encoding, table or sheet inventory, headers, row count and representative original rows. For documents, show the document/page or structural inventory, a readable preview and native-text/OCR/manual-review limitations. A preview is labeled as a preview; remaining rows/pages are accessible within the supported limits.
5. **Resolve precise issues.** A message identifies the source, problem location when knowable, impact and specific action. The operator can reassign a file role, select an explicit table, obtain an unlocked/clearer export, replace a damaged file, reduce an over-limit export or follow a supported alternative. Renaming the extension is never presented as repairing its contents.
6. **Continue with truthful status.** Readable tables can move into mapping even when other evidence remains missing. The action names the subset being advanced and the remaining task. There is no generic green result implying the whole case is ready for financial analysis.

Example result:

> Pax8 export: readable — 842 supplied records. HaloPSA workbook: choose one of two candidate billing tables. Customer agreement: pages 1–11 readable; page 12 needs a clearer copy. You can inspect the Pax8 records now. Resolve the billing-table choice before its mapping can proceed. The agreement still needs review. This result establishes file compatibility only.

## Format and profile contract

The full target supports CSV and XLSX for structured records, and PDF and DOCX for agreements/orders. A scanned PDF has an explicit OCR or supported manual-review route. Common image-only agreement copies can become additional qualified profiles; they are not silently accepted as an enabled capability. Email archives, arbitrary ZIP bundles, legacy binary Office files and macro-enabled documents are outside the initial target.

Support has two separate levels:

- **Container reader support:** the application can read the file's actual structure within its published limits.
- **Source profile support:** a qualified, versioned Pax8/HaloPSA export profile describes its tables and structural conventions. An unrecognized but readable CSV/XLSX can go to an explicit generic-mapping route only when that route is supported. Its source remains user-declared until later verification.

No native export profile may be advertised as supported without representative actual exports, documented provenance and positive/negative qualification. The current prototype accepts a normalized CSV schema; that is the existing baseline, not evidence that arbitrary native vendor exports or documents already work.

Expected handling:

| Input | Required behavior |
| --- | --- |
| CSV | Identify supported encoding and dialect, retain original bytes and raw cells, respect quoted separators/newlines and BOMs, and report malformed records precisely. Retain column positions and blank/duplicate headers for explicit mapping review; never merge colliding columns. Never repair ambiguous encoding or drop damaged rows silently. |
| XLSX | Inventory sheets/tables, including hidden material; ask the operator to choose when necessary. Retain sheet/cell locations, original values, formulas/cached values and workbook date metadata. Do not execute formulas or choose the first sheet merely because it is first. Meaning and date conversion belong to mapping. |
| Text PDF | Expose all supported pages with a safe preview and page references. Distinguish visible content from extracted text and report extraction problems. |
| Scanned/mixed PDF | Track native text, OCR, unreadable and pending states per page. OCR is an extracted candidate; it cannot establish a confirmed clause. A low-quality page is never hidden by success on other pages. |
| DOCX | Use a qualified inert reader/preview and stable source locations such as document part and paragraph. If a derived page layout is shown, label its renderer/version; do not invent original PDF page references. |
| Locked, corrupt or unfamiliar input | State the actual obstacle and supported recovery. Do not request the operator's vendor-account password or guess the file's meaning. |

A file's name, extension, MIME label, timestamps or apparent customer name cannot establish vendor origin, freshness or case identity. A cryptographic digest distinguishes supplied content; it does not authenticate it.

The inventory covers what the supplied file contains. A PDF reporting 12 pages does not establish that the original agreement had only 12 pages. Suspected missing pages, redacted terms, unavailable amendments and signature uncertainty remain explicit evidence tasks. Successful OCR or a valid container cannot remove them. Unknown extraction language receives a supported language/manual-review route or a precise limitation.

### Proposed resource policy

These are initial admission targets to qualify, not measured performance claims. Each enabled reader must publish a versioned policy with limits at least as precise as this table. Implementation can revise proposed new-format values with fixture/device evidence before advertising support; it must retain explicit limits and test the cutover.

| Profile | Proposed bounds |
| --- | --- |
| Existing normalized CSV baseline | 2,000,000 decoded UTF-8 bytes, 5,000 data records, 64 columns and 1,024 UTF-16 code units per decoded cell, matching the current parser's measurement. Original input bytes must also have an admission bound; invalid decoding cannot be concealed. |
| Target XLSX record reader | 10,000,000 input bytes; 50,000,000 actually expanded bytes; 10,000 container parts; 20 sheets; 5,000 total data rows across the inspected workbook; 64 columns per admitted table and 1,024 UTF-16 code units per decoded cell. Hidden sheets and compressed content count toward resource bounds. |
| Target PDF agreement reader | 20,000,000 input bytes and 100 pages per document; OCR/rendering at most 20 million pixels per page and 200 million processed pixels per document. Oversized pages receive a precise limit issue. |
| Target DOCX agreement reader | 10,000,000 input bytes; 50,000,000 actually expanded bytes; 10,000 container parts; 500,000 extracted UTF-16 code units per document. A qualified renderer must separately bound layout/images. |
| Current case package | One active Pax8 source, one active HaloPSA source and up to 10 agreement/order/amendment documents; at most 64,000,000 original input bytes in the active package. Every applicable per-file and package limit must hold. |

Reading/parsing without OCR has a 30-second task deadline. OCR has a separate 120-second document deadline and page progress. Timeouts produce a recoverable processing result; completed pages cannot masquerade as complete processing. Cancellation should be acknowledged within 250 ms on the qualified reference environment, and the interface should acknowledge selection within 100 ms. These are test targets; wider-device and peak-memory acceptance requires measurement. Processing must be isolated so cancellation/time limits can stop work, rather than merely ignoring a hung computation while it continues consuming resources.

Limits are measured on actual observed work, including decompression and rendering, rather than trusting declared sizes. They never justify silently retaining the first N rows/pages and labeling the truncated result complete.

## State, decisions and progression

Keep the lifecycle separate from the compatibility disposition.

**Lifecycle:** not supplied, queued, reading, processing, completed, canceled, superseded or removed. A pending lifecycle cannot have a current successful disposition.

| Completed disposition | Meaning | Required next action |
| --- | --- | --- |
| Readable for next check | The enabled reader completed its declared structural work on the exact file; required preview/inventory is available. | Inspect or map the specified source. Retain any downstream warnings. |
| Readable; choice or review needed | The file can be inspected, but table/role choice, OCR review or a supported manual-review decision remains. | Identify and resolve the exact choice; do not promote affected material as confirmed. |
| File needs repair | Encoding, structure, corruption, encryption, legibility or another repairable file problem prevents the relevant operation. | Obtain the named corrected/unlocked/clearer source and rerun. |
| Outside supported file policy | Type, profile or size/structure exceeds an advertised capability. | Show the exact policy and a supported export alternative. This is not a declaration that the customer or renewal is ineligible. |
| Processing could not finish | Reader, required safety check, runtime, worker or deadline failure prevented a valid result. | Retry, replace or use the explicit supported fallback. No successful result may remain active. |
| Blocked by handling policy | Required permission, protection or safety controls are unavailable or a file fails the admission policy. | Explain the handling obstacle and permitted correction; do not bypass it through a different reader. |

Missing evidence is displayed separately from an incompatible file. A valid file with an unknown field, missing economic column, wrong customer or duplicate subscription may be structurally readable; mapping, selection or linking must preserve that issue and block their own progression when required.

A file receipt can authorize only its named next structural operation. Full-case readiness and checkout require the separate composed readiness/eligibility contract. A readable-file result alone cannot trigger a coverage verdict or payment for an analysis known to be unrunnable. Free preflight must let the operator identify compatibility blockers before purchase.

## Source preservation, correction and handoff

Original bytes remain the evidence owner. Retain original filenames as escaped display metadata and store/use opaque identifiers where needed. Derived text, OCR, table parses, sanitized previews and layout conversions remain separately identified artifacts with source references and processing versions. Do not overwrite the original with a normalized or sanitized copy. The original in the operator's possession need not be modified to use the check; supported transformations occur in separate derivatives.

The next feature receives a versioned receipt containing:

- File reference and exact original-content digest/byte length; declared role and detected container/encoding.
- Reader, source-profile, resource-policy and processing versions; current lifecycle/disposition and operation permitted next.
- Complete table/sheet/row or document/page/part inventory, with original locators, exposed derivatives and explicit pending/unreadable portions.
- Typed issue code, source location where known, impact/blocking scope and specific recovery action.
- The current case-owner reference and uncertainty, when a case has been selected, without manufacturing a confirmation or rewriting questionnaire claims.

Raw material is obtained through the owned source reference; receipts do not copy complete contracts into logs or duplicate large files unnecessarily. Persisted receipts are descriptive records, not transferable authorization for a different case/user/source version.

Changing, removing or replacing a file immediately supersedes its current compatibility receipt and every dependent result, mapping, match, extraction or confirmation. Same filename, size or modification time cannot reuse a result from different bytes. A failed replacement does not silently reactivate the old file as current. Explicit restoration is a new checked transition.

The existing feature 1.2 owner revokes confirmations when their evidence basis changes. Unchanged source-only evidence may remain inspectable; keeping a source-only confirmation requires that owner to prove its basis still holds. Cross-file confirmations cannot survive a changed dependency. Case correction never carries old agreement association or financial conclusions into the new subject.

Late reads/OCR after replacement, cancel, removal, case change or page restoration cannot commit. Owner/source/policy and presentation are checked before display, after focus and again when the next operation is invoked. A stale receipt, mutated preview or wrong-source derivative causes a controlled stop and fresh recovery. Compatibility work may be reused only when its exact content, reader/policy and permission context remain valid; that does not reuse a case association.

## Privacy and hostile input

Prefer an on-device compatibility check before payment/account creation. Explain whether any original or derivative leaves the device before selection. A hosted/OCR path is available only after its data controls and explicit processing choice are qualified; it cannot become an automatic fallback.

Use allowed types and qualified readers; validate actual contents rather than trusting MIME/extension alone; isolate processing, bound decompression, reject prohibited active content, and show filenames/cells/document text as inert data. Do not execute macros, formulas, scripts or document instructions. A handling-check failure blocks its dependent operation. Any hosted original/derivative needs private, authorized tenant access and the published retention/deletion policy. Public scanning services cannot receive agreements implicitly. Removing a local file clears application references, derivatives, workers and dependent results; it does not delete the user's original. Hosted deletion must distinguish requested from verified deletion. These design controls follow [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html); they are release requirements, not a claim that validation proves a file harmless.

## Quality gates for implementation

| Gate | Required evidence |
| --- | --- |
| Accurate advertised support | Every enabled format/profile has positive and negative fixtures, versioned bounds and representative actual vendor exports where native support is claimed. Unqualified targets stay labeled unavailable. |
| Exact source fidelity | Original bytes, headers, raw cells, quoted records and document/source locators survive previews, correction and handoff. No unexplained loss, normalization or silent truncation. |
| Truthful completion | Every admitted record/page is inventoried, processed as required or explicitly unresolved. One readable page or row cannot establish whole-file completion. |
| Precise recovery | Empty, header-only, wrong-role, missing profile, locked, corrupt, malformed, low-quality and over-limit sources yield the correct file/location/action. Unknown remains distinguishable from unsupported. |
| Boundary integrity | Missing business fields and contract facts remain mapping/presence/extraction tasks. No preflight state establishes eligibility, origin, signed applicability, financial safety or action permission. |
| Safe processing | Spoofed types, active content, hostile names/text, expanding containers and parser failures do not execute content, leak data, evade limits or create a successful receipt. |
| Lifecycle and races | Same-name replacement, edits, cancel, remove, retry, overlapping reads/OCR, case A→B→A, policy change, history restore and late completion cannot revive superseded evidence. |
| Dependency correctness | A bad HaloPSA file does not conceal intact Pax8 evidence. Changed dependencies revoke their own authority through the case owner; no old mapping/match/document association survives incorrectly. |
| Exact handoff | Foreign, stale, cloned-authority, getter/proxy-mutated and wrong-source receipts/derivatives are rejected. Visible status and provenance agree with the canonical receipt before and after focus. |
| Bounded work | Test each limit at N−1, N and N+1, combined limits, actual expanded work, timeout/cancel and the qualified reference-device responsiveness/peak-memory profile. Document other device limits honestly. |
| Accessibility and understanding | Keyboard, screen-reader progress/error announcements, zoom/reflow and focus recovery work. Representative operators distinguish readability, missing evidence and financial readiness without founder explanation. |
| Qualified evidence | A frozen-source full regression run preserves feature 1.1/1.2 behavior and prior proofs; browser and negative checks qualify actual semantic assertions. Independent reviews and the sealed current gate precede a passing implementation claim. |

The scenario families above define required qualification coverage. They are not executed tests, an exhaustive failure audit or a statement that every possible environment is supported.

## Current baseline and next implementation decision

Today the application locally reads normalized Pax8/HaloPSA CSVs, bounds reading and parsing, displays exact supplied evidence and handles source/selection invalidation. It does not provide the complete separate three-role preflight, XLSX/PDF/DOCX readers, OCR, native-export profile qualification or hosted protection contract defined here.

The first implementation step should establish the independent versioned file receipt, structural-only dispositions, source/case ownership and safe CSV compatibility flow against the current supported CSV baseline. New format readers attach to that same contract after their own qualification. Field mapping remains feature 1.4; contract interpretation remains behavior 3. No new dominant parser/selection path should remain beside the existing one without an explicit redirect/cutover and regression evidence.
