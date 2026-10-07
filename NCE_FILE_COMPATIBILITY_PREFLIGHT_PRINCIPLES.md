# Feature 1.3: File compatibility preflight — foundational principles

Defined and saved on 3 October 2026 from the best-version behavior in NCE_FILE_COMPATIBILITY_PREFLIGHT_SPEC.md. These are proposed behavioral obligations, not implemented capabilities or passing test results.

Feature 1.3 begins with one question:

> Can this product read these exact supplied files under its current supported policy, and what is justified next?

The ten principles below describe what must remain true across file formats, parser libraries, interface layouts and processing locations. Each answers a different question; each can fail while the others hold. Numeric limits, OCR engines, drag-and-drop, storage mechanisms and receipt representations are implementation choices governed by these principles.

## 1. Support must be an explicit, qualified contract

Compatibility is relative to an operation and a demonstrated capability. A familiar extension does not establish that the current application can process a particular file or source layout.

**Required behavior:** Declare the enabled formats, encodings/dialects, source profiles, reader/policy versions and permitted next operations. Advertise support only after qualification. Keep readable-container support distinct from recognized Pax8/HaloPSA profile support. A structurally readable unfamiliar table may enter a qualified generic-mapping route; it cannot be presented as a verified native export.

**Test:** For any supplied file, can the app explain which current contract supports the claimed operation—or give the precise supported alternative? Does an unqualified reader/profile remain unavailable even when the filename looks correct?

**Independent failure:** The app promises native-export support from a filename despite having only a normalized-CSV reader.

## 2. Original evidence must remain intact and traceable

Every derived value or preview needs an identifiable source. If processing overwrites or loses that source, later review cannot establish what was actually supplied.

**Required behavior:** Preserve original content, source locations and raw values. Keep decoded text, parsed tables, OCR and transformed previews as separately traceable derivatives. Retain column positions, blank/duplicate headers and document locations without silent merging. Filename and timestamps are display metadata; content identity is established from the supplied content. Content identity does not establish authenticity.

**Test:** Can a reviewer trace every displayed row, cell or passage back to the exact supplied source and recover its original value? Can two files with the same name remain distinct?

**Independent failure:** Parsing succeeds, but duplicate columns are merged or OCR replaces the only retained original.

## 3. Processing must remain within enforceable resource bounds

A finite system cannot promise unrestricted processing. An admitted file must not consume unbounded work merely because it is readable or well-intentioned.

**Required behavior:** Publish and enforce actual input, expansion, structure, rendering and task-time limits. Include hidden material and actual decompressed/rendered work in the appropriate budgets. Keep the interface responsive and make cancellation stop its work. An exceeded limit or deadline produces an explicit recoverable result.

**Test:** At and beyond each limit—and when limits combine—does processing stay bounded and terminate correctly? Can cancellation stop a busy worker rather than leaving it running behind a canceled label?

**Independent failure:** A supported, harmless file exhausts memory or processing continues indefinitely after a timeout.

## 4. File contents must remain data

Supplying evidence does not grant that evidence control over the application or its environment.

**Required behavior:** Read and display supplied content inertly. Do not execute formulas, macros, scripts, links or document instructions as part of reading evidence. A file cannot change policy, select a different case, invoke external actions or override processing decisions. Required handling checks must complete before their dependent operation is allowed.

**Test:** Can hostile cells, filenames, embedded content or document instructions cause execution, policy changes, external requests or a forged successful result? They must not within the qualified handling contract.

**Independent failure:** The correct source is preserved and parsed, but an embedded formula or script is executed.

## 5. Processing must respect the authorized handling boundary

The exact local contract and finite gates are defined in [FILE_COMPATIBILITY_PRINCIPLE_5.md](scope-fit/FILE_COMPATIBILITY_PRINCIPLE_5.md).

Permission to select a file for one purpose does not authorize every subsequent use, recipient or retention period.

**Required behavior:** Explain and enforce what is processed, where it goes, who can access it and how retention/removal works. Keep processing within the user's authorized scope. Remote OCR, scanning, logging or persistence cannot become an undisclosed fallback. Real agreements require the corresponding qualified protection controls before that handling path is enabled.

**Test:** Can a private agreement or derivative reach another tenant, a processor or storage path outside the stated permission? Does removal stop processing and clear the application's affected references/results? Is requested hosted deletion distinguished from verified deletion?

**Independent failure:** A technically safe and readable contract is sent to an undeclared third-party service.

## 6. Partial success must remain partial

Reading one portion establishes something about that portion. It cannot establish completion for the whole supplied file or case package.

**Required behavior:** Account for the admitted rows, tables, sheets, pages or document parts. Mark pending, unreadable, unprocessed and deliberately unselected portions explicitly. Label previews as previews. A complete structural inventory does not prove the original agreement had no missing pages or amendments. Allow a valid subset to proceed only through an operation explicitly scoped to that subset.

**Test:** If the last row is malformed, one page cannot be read or processing stops after the preview, does that remain visible and block the operation requiring completion? Can intact Pax8 evidence stay inspectable while HaloPSA or agreement processing is incomplete?

**Independent failure:** A successful first-page preview becomes a whole-document success result.

## 7. Uncertainty must remain explicit until resolved

Absence of a known answer is not evidence for a convenient answer. Ambiguity cannot be removed by a default.

**Required behavior:** Distinguish missing files, unreadable content, unsupported capabilities, unknown profiles, ambiguous table/role choices and downstream missing business facts. Retain OCR uncertainty and unresolved source locations. Resolve ambiguity through new evidence or an explicit supported choice; retain the choice and its basis. Do not infer source system, customer, freshness, signature or economic meaning from a filename, first sheet or familiar label.

**Test:** Can unknown, ambiguous or missing material become a successful or outside-scope conclusion without a justified resolution? Does choosing a table resolve only that choice, leaving unrelated uncertainties intact?

**Independent failure:** Every sheet is readable, but the first plausible billing table is silently chosen.

## 8. A result applies only to its current evidence and context

A valid result is a statement about a specific evidence state. Replacement, changed policy or changed permission can invalidate it without changing its old display text.

**Required behavior:** Bind each result to its exact source, reader/policy, declared role, processing run and relevant case/permission context. Supersede it when its basis changes. Invalidate all dependent mappings, associations, confirmations and results through their existing owners. Fence late completion after cancel, replacement, removal, case correction or restoration. Revalidate when an operation consumes the result. Reusing unchanged structural processing never automatically reuses a case association.

**Test:** Can a result from file A authorize file B after same-name replacement, or can a canceled read become current later? After case A→B→A or policy/permission change, is every active result justified by the current basis?

**Independent failure:** The original file is retained correctly, but its old receipt is used after another file becomes current.

## 9. The operator must be able to understand and control the check

A self-service check is useful only if the intended operator can recognize its evidence, understand its status and carry out the justified next action.

**Required behavior:** Provide inspectable evidence, honest progress and an understandable result for each file. Identify the problem, its location when knowable, its effect and a specific next action. Support accessible cancellation, correction, removal and retry. Request an operator choice only when it resolves a relevant uncertainty. Keep valid independent evidence available. Do not require routine founder assistance or repeated manual work the application can handle safely.

**Test:** Can a representative operator using the supported keyboard/assistive-device flow explain what was read, what remains blocked and how to recover? Can they complete the appropriate next step without guessing or founder intervention?

**Independent failure:** The system records the correct technical error internally, but shows only an inaccessible generic failure message.

## 10. Handoff must preserve the evidence's scope and authority

Changing screens, serializing a receipt or passing data to another feature supplies no new evidence. A claim cannot gain authority merely by being carried forward.

**Required behavior:** Pass the exact source references, provenance, processing versions, disposition, permitted operation and unresolved issues. Preserve the case identity and uncertainty owned by feature 1.2. Compatibility authorizes only the named structural next step. Field mapping, eligibility, cross-system linkage, signed applicability and financial coverage remain decisions requiring their own evidence and owners. A preflight success alone cannot enable an unrunnable paid analysis or a financial action.

**Test:** Does the next feature receive exactly the supported compatibility claim, with all limitations? Can it independently reject a stale, foreign or wrong-source handoff? Does “readable” remain a readability claim through every display and transition?

**Independent failure:** A valid preflight receipt is translated into “eligible,” “agreement confirmed” or “financially covered.”

## Why these are separate foundations

The distinction matters operationally:

- Support can be advertised incorrectly even when a parser stops safely.
- Evidence can be lost even when the output happens to be correct.
- A harmless file can exhaust resources; a small file can contain active content.
- Safe technical processing can still violate permission.
- Complete processing can leave ambiguous choices; incomplete processing can contain perfectly certain individual values.
- A correct result can become stale.
- A technically correct current result can remain unusable to its operator.
- A trustworthy preflight can still be misrepresented by its consumer.

The foundations are stable; format coverage, performance targets and interface design can evolve beneath them. Qualification of one format, environment or representative mechanism does not establish universal acceptance.

## Combined completion criterion

> The operator can knowingly supply evidence within an explicit supported contract. The application preserves that evidence, processes it within its handling and resource boundaries, accounts for incomplete and uncertain material, supports inspection and recovery, and passes only a current, justified compatibility claim to the next feature.

These principles govern the detailed behavior, proposed limits and quality gates in NCE_FILE_COMPATIBILITY_PREFLIGHT_SPEC.md. Implementation can proceed principle by principle against the existing supported CSV baseline; new readers attach to the same contract after qualification. Full feature acceptance requires all relevant principles and their quality gates, rather than treating the first successful reader as feature completion.

## Principle3 implementation boundary

The supported local CSV expected behavior and exact resource policy are in `scope-fit/FILE_COMPATIBILITY_PRINCIPLE_3.md`. Original implementation/measurement/review evidence remains in `output/file-compatibility-principle-3/REPORT.md`; the 5 October adversarial-audit repairs and new qualification are owned separately by `output/file-compatibility-principle-3-closure/REPORT.md`. This principles document does not itself certify a passing run. Current source includes dedicated stoppable Workers, all source limits together, finite packet/DOM checks, private source-bound adoption, and width-aware original paging. Pending platform crypto verification stays reserved after cancellation until it settles. Wider-device/peak-memory/OS guarantees and new document formats remain unqualified.
