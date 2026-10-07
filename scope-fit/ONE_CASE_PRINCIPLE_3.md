# Feature 1.2 Principle 3: selection is grounded in inspectable evidence

## Expected behavior

An operator can inspect the identifying facts behind the currently source-selected case, their source, and the original record. Evidence helps recognition; it does not confirm source authenticity, eligibility, cross-system linkage, signed coverage or action authority.

The shared CSV parser alone owns decoded raw cells, normalized fields and exact record spans. The immutable canonical subject contains selected-source-evidence-v1: every supplied column in source order, original decoded header, raw decoded cell before trim, normalized cell after trim, original lexical CSV record and start/end offsets. Offsets are UTF-16 code units in the decoded supplied string, include a leading BOM and exclude the row terminator. Quoted embedded newlines are retained. Logical data record numbers exclude the header and empty records, and are not physical line numbers. Original lexical data is never reconstructed from normalized values. This is decoded text evidence, not original byte/encoding provenance.

The existing subject assertion captures plain data, rejects accessors/exotic/cyclic shapes, and privately rederives the full projection from the current source and selected ID before rendering. Missing, forged, reordered or inconsistent evidence stops the check; it cannot offer link confirmation. No additional parser pass or secondary source owner is added.

The current-case inspector retains its existing summary. It presents decoded raw labels, a field table with explicit row/column headers and caption, and the original CSV record. Empty cells display as two quotes. All source content uses textContent. Control/invisible characters use visible U+ markers; markers are display escapes, and literal marker-looking source strings are not treated as controls. An additional exact JSON-string view escapes real control/invisible characters and round-trips to the selected CSV record, distinguishing literal marker or backslash text. No hyperlinks, scripts, formulas or HTML are executed. Quoting and source offsets allow verification against the supplied file. All columns are visible on expansion without truncation, including optional unknown columns; they are evidence, not inferred eligibility fields.

Only a unique source-selected row has an inspector. Missing/unusable customer or renewal facts remain unresolved but their supplied cells are inspectable. Missing ID, zero matches, duplicate IDs and malformed files produce no fabricated or partial inspector. A source-selected Pax8 row remains inspectable when HaloPSA input fails. Existing source/ID/questionnaire replacement, cancellation, clear, concurrent-run and stale-control guards clear obsolete evidence together with the subject.

## Strict quality gates

- Model: field order (including numeric/prototype headers), all headers and raw/normalized values, blank cells, literal hostile/control text, quoting/newlines/BOM and exact source slices across supported line endings; unrelated malformed rows reject the whole source.
- Trust: serialized loss, forged version/authority/locator/header/raw/normalized/original data and changed sources reject before rendering; accessor getters execute zero times; canonical evidence is deeply immutable.
- Resources: maximum 5000 rows and 64 columns, 1024-character cells within the 2MB parser limit, complete original selected record without truncation; no universal timing SLA.
- Browser: inspector keyboard operation, source-failure visibility, full evidence values, HTML/formula/control safety, replacement/ID/duplicate/clear invalidation and fault-injected evidence rejection; expanded desktop/mobile 320px/200% reflow and automated WCAG A/AA scans. Existing lifecycle and cancellation suites remain gates.
- Evidence integrity: one frozen source candidate includes all runtime/tests/docs/QC tools and earlier 132/102/101 audit ledgers; exact unit/syntax/browser receipt coverage and served-source hashes; negative mutation checks, including missing P3 gate inventory. Independent PRE, POST correctness/maintainability and final evidence review.

Current execution and qualifications are recorded under output/one-case-principle-3. Historical qualifications are not current-source acceptance after this implementation. gate-ledger.json documents local gates and external boundaries; a listed gate alone is not an executed pass.

## Acceptance limits

Supported normalized local CSV only. Native export field mapping, authenticated vendor/account identity, human recognition/comprehension, actual assistive-device tasks and low-memory/device-wide performance remain external or bounded. No new search/filtering, ambiguous-candidate chooser or subject-confirmation workflow is added by Principle 3. Existing link confirmation retains its own semantic record basis; cosmetic lexical/source-header changes do not establish a new logical identity. Current File replacement still invalidates local controls and results. No provider writes, upload, persistence, payment or financial verdict occurs.
