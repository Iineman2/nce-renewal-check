# Principle 7 failure audit

Audit date: 30 September 2026. Checkout policy: `nce-scope-v8`.

**Historical audit:** The defects and matrix below describe the pre-fix v8 checkout. The v9 implementation, current verification and disposition of every case are in `PRINCIPLE_7_QC_CLOSURE.md`. Keep the original findings as provenance; do not read them as the current defect status.

## Verdict and evidence boundary

Principle 7 is implemented and the existing automated suite passes, but it is **not fully passing its own strict contract**. This audit reproduced six defect families and identified one explicit specification/object mismatch. The previous 79/79 unit tests, 12/12 isolated browser scripts, 18 syntax checks, and zero automated A/AA violations in tested states did not detect these cases. Those checks were rerun earlier in this chat on the same application source; this audit adds targeted probes rather than repeating the unchanged full suite.

Application source was not edited. Probe code and exact receipts are in `../output/principle-7-audit/`. `browser-probes.js` ran in a dedicated Playwright CLI session against localhost:8765. `model-probes.mjs` directly calls the current decision functions. Probe observations are evidence, not regression assertions that the observed defects are acceptable.

Coverage means all currently identifiable failure classes across the finite result routes, input families, priorities, controls, lifecycle transitions, accessibility, external dependencies, and verification process. It does not mean every arbitrary string, browser implementation, future code change, or human behavior has been tested. The matrix records evidence per class; it does not label untested scenarios as passes.

## Contract

An action must identify what blocked or advanced the case, which original source to check, the concrete next step, and the expected outcome. It must point to the first decisive issue, retain other issues, support correction and rechecking, invalidate obsolete results, remain accessible, and never imply financial authority. A legitimate terminal result may explicitly stop; it need not invent a continuation the prototype cannot perform.

Authoritative contract: `PRINCIPLE_7_NEXT_ACTION.md`. Main code: `fit.mjs`, `preflight.mjs`, `app.mjs`, `index.html`. Existing focused tests: `next-action.test.mjs`, `ui-next-action.js`; earlier principle tests supply additional protections.

## Reproduced defects

| ID | Trigger and observed behavior | Failure and consequence | Evidence | Required acceptance criterion |
| --- | --- | --- | --- | --- |
| F1 | Put `agreement`, `HaloPSA`, or `next term` in the Pax8 `billing_frequency` cell. The cell is correctly rejected as unrecognized, but the action respectively targets agreement availability, the Halo file, or the next-term response. | Source and repair target are inferred from human-readable text including raw cell content. An unrelated word redirects a Pax8 billing-plan problem to the wrong source/control. Classification remains blocked; this is a recovery defect, not financial authorization. | Model receipt; `preflight.mjs:154–170,199–205`. | Route from typed issue metadata. Vary raw text without changing source/field; source and target must remain Pax8 billing evidence. Apply to every message containing raw cells. |
| F2 | Valid Pax8 file plus malformed Halo file; click `Correct the supplied input`. Focus moves to `pax-file`. | All caught input errors lose source identity and always focus Pax8. Correcting an already-valid Pax8 file cannot repair Halo. Link-repair also always focuses Halo, even when the Pax8 side needs correction. | Browser receipt; `app.mjs:364–368,389–394,482–487`. Halo parse errors originate after `preflight.mjs:247–248`. | Preserve which file/control failed and focus it. Distinguish single-file errors, both-file errors, read failures, size limits, IDs, and internal errors. Link repair must identify the responsible side or explicitly offer both. |
| F3 | Two Pax8 rows with the same valid subscription ID. Result says `found 2` but tells the visitor to enter a valid ID and focuses the ID box. | ID entry alone cannot disambiguate duplicate rows for the intended subscription. The action creates a repeatable recovery loop unless the user infers they must replace/fix the export. | Browser/model receipts; `preflight.mjs:178–180,254–263`. | Separate blank/invalid ID, absent subscription, and duplicate records. Duplicate route directs original-record reconciliation and corrected Pax8 input; never silently choose one duplicate. |
| F4 | Reseller = unknown, then distributor = other; early exit. `needsVerification` is empty and the result omits the answered reseller uncertainty. | Correct outside-scope priority, but failure of the contract to keep other issues visible. The visitor cannot see all already-known work needed after correcting the distributor. Unasked facts must remain unasked, not be fabricated as unknown. | Browser/model receipts; `fit.mjs:185–210`. | Preserve earlier answered unknowns on every early exit while keeping the known blocker primary. Test every early-exit position and supported/unknown/outside prefix. |
| F5 | Confirm linked records, then report next term monthly. Outside-scope record result has a correction instruction but zero buttons in its result region. | `correct-or-stop` has no record-renderer branch. The visitor must find the right answer/file elsewhere; the result has no direct repair control despite the usable-repair gate. Existing controls remain on the page, so this is a missing direct path, not a total inability to edit. | Browser receipt; `app.mjs:358–395`; `preflight.mjs:195–198`. | Attach condition/target metadata to outside-scope record actions and focus the relevant answer/file. Cover reseller, distributor, billing, product/term, renewal window, end state, and next term. |
| F6 | Questionnaire result is computed with agreement unavailable; then `Clear files and result` resets the agreement response to unasked. The old agreement-specific questionnaire result remains. Changing agreement availability also leaves the questionnaire result untouched. | Agreement is an input to `evaluateFit`, but record-form changes/reset invalidate only the record result. Displayed questionnaire classification/action can disagree with current inputs. | Browser receipt final case; `app.mjs:24–35,69–76,424–434`; `fit.mjs:150–155`. | Either explicitly separate the questionnaire's immutable scope inputs from record-stage agreement state, or invalidate/recompute every result that depends on agreement. Cover change, reset, and rerun in both directions. |

F1–F6 need fixes and meaningful regressions before declaring the local Principle 7 gates closed.

**Specification mismatch S1:** Positive questionnaire `nextAction` includes `condition: null` (`fit.mjs:70`), while gate 1 says no action contains `undefined` or `null` and the object contract says a condition/target is present when applicable. Omit the inapplicable property or clarify the schema. Current `assertAction` checks the instruction string, not every object property. This mismatch is lower impact than the routing defects.

## Failure coverage matrix

Legend:

- **Defect:** reproduced or directly established by the current source; linked to F1–F6 or S1.
- **Protected:** a guard and relevant existing regression were inspected. This is bounded evidence, not proof of every combination or browser.
- **Partial:** some relevant coverage/guard exists, but the stated combination or acceptance criterion is not established.
- **Open:** requires new targeted tests, user sessions, environment evidence, or external records.
- **Boundary:** deliberately outside this prototype. It becomes a Principle 7 failure if the UI implies it has completed that work or gives an unusable continuation without stating the limit.

### A. Result existence and meaning

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| A01 | A new status is added without action generation. | Every supported status maps to a defined action; unknown statuses fail visibly without a positive result. | Partial: generators throw for unmapped statuses, but renderer/catch behavior needs mutation coverage. |
| A02 | Action exists but source, instruction, or kind is empty. | Validate a typed action schema, not just prose length. | Partial: selected routes assert source regex and instruction length; no full schema validation. |
| A03 | Inapplicable fields contain null and violate the gate. | Omit optional fields or explicitly permit null. | Defect S1. |
| A04 | Action gives a generic task without a specific fact or source. | Name the decisive condition/field and original source. | Partial: current routes mostly do; text inference has F1 and a generic fallback. |
| A05 | Instructions omit what happens after correction. | State recheck, next evidence stage, or explicit stop. | Protected for ordinary routes; comprehension remains open. |
| A06 | Positive questionnaire looks like completion. | Direct same-subscription record comparison and retain provisional wording. | Protected by focused model/browser tests. |
| A07 | Positive records imply coverage, savings, safe cutoff, or authority. | Explicit separate live-record/agreement/billing review and prototype stop. | Protected locally; user interpretation remains open. |
| A08 | Policy block tells an ordinary visitor to perform an owner-only task. | State unavailable, identify responsible owner, provide a usable stop/retry route. | Partial: owner and unavailable are named; no contact or policy-update notification path. |

### B. Questionnaire facts, early exits, and competing issues

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| B01 | Supported answers send the visitor back through the same questionnaire. | Advance to record comparison. | Protected. |
| B02 | Each of the first four questions has an unsupported answer. | Name that blocker; direct edit; allow correct outside-scope stop. | Protected for tested early and completed paths. |
| B03 | Multiple unsupported conditions exist. | First decisive blocker primary; all collected blockers visible; each repair reachable. | Protected for completed questionnaire paths; full cross-product action assertions partial. |
| B04 | An earlier unknown precedes an early known blocker. | Keep unknown visible without changing blocker priority. | Defect F4. |
| B05 | Outside condition plus unknown in a completed questionnaire. | Outside primary; uncertainty retained. | Protected for a mixed case. |
| B06 | Several unknown answers, no known blocker. | Verify first unresolved fact in policy order; retain rest. | Partial: classification combinations covered; each focus target and progression combination not exhaustively asserted. |
| B07 | Unasked questions are presented as answered unknown. | Preserve not-asked state; avoid invented verification work. | Protected by early-exit/minimum-effort tests. |
| B08 | Approximate renewal is treated as precise. | Find exact date in Pax8; edit date question. | Protected in model; focused action keyboard path partial. |
| B09 | Renewal is today. | Verify cutoff/time zone; no implication that time remains. | Protected model boundary; external cutoff task is open. |
| B10 | Yesterday/day 61 versus today/day 60. | Correct date-window route and source; no unrelated repair target. | Protected classification boundaries; every direct-action browser variant partial. |
| B11 | Unknown agreement, missing agreement, and unasked agreement collapse to one claim. | Preserve distinctions; no invented signed evidence. | Protected classification; F6 lifecycle dependency defect remains. |
| B12 | Required choice/date is missing or malformed. | Accessible exact input error and the correct field. | Protected for missing input; date-parser error focus uses the first radio rather than always the date field, so exact-target coverage is partial. |

### C. Record identity and linkage

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| C01 | Blank, overlong, invisible, or control-bearing subscription ID. | Correct ID with original Pax8 source; no silent selection. | Protected model checks; native validation may intercept blank/overlong input before custom result. |
| C02 | Valid ID absent from supplied Pax8 file. | Distinguish typo from incomplete/wrong export; offer ID or source-file repair. | Partial: zero-match block works; current ID-only recovery can be insufficient. |
| C03 | Duplicate Pax8 rows for the same intended subscription. | Reconcile/correct Pax8 records; no arbitrary row selection. | Defect F3 for recovery; blocking works. |
| C04 | Zero or multiple linked Halo rows. | Obtain exactly one justified recurring line; repair Halo input. | Protected block and ordinary repair; native export mapping is open. |
| C05 | Selected Halo line ID also appears elsewhere. | Surface duplicate-line issue and original Halo review. | Protected source guard; dedicated next-action browser case open. |
| C06 | Customer references differ or one is missing. | Review both systems; correct the responsible source without guessing. | Partial: block works; fixed Halo focus can be wrong, F2 family. |
| C07 | Invalid identifiers originate on the Pax8 side. | Direct Pax8 repair or explicitly offer both files. | Defect by source: repair-link button always focuses Halo, F2 family. |
| C08 | Equal customer text is treated as an authenticated link. | Require original-system confirmation; retain unauthenticated boundary. | Protected. |
| C09 | User confirms a different subscription/customer/line. | Bind confirmation to exact current case/evidence. | Protected token checks; actual truth of confirmation is open. |
| C10 | One legitimate subscription maps to several real billing lines or different vendor customer IDs. | Explain unsupported mapping; do not instruct inventing a one-to-one match. | Boundary/Open: normalized prototype assumes one linked row and shared customer reference. |

### D. Conflicts, source truth, and priority

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| D01 | Identity/link issue plus conflict or outside condition. | Identity/link first; other discovered issues retained where evaluation is possible. | Protected priority; early parse/identity returns cannot enumerate all downstream issues. |
| D02 | Several conflicts remain unresolved. | Primary action targets first unresolved conflict, not first historical conflict. | Protected browser test. |
| D03 | One conflict accepted, another unresolved. | Advance focus to the unresolved item; keep both histories visible. | Protected. |
| D04 | User keeps their answer rather than file value. | Obtain corrected evidence; cannot clear discrepancy by self-report alone. | Protected model; every resulting verification target browser variant partial. |
| D05 | Accepted file value makes case outside scope. | Correct-or-stop with relevant direct repair. | Classification protected; direct repair defect F5. |
| D06 | Unknown file token is mistaken for known unsupported. | Verify source, preserve known unsupported questionnaire claims. | Protected by earlier principle tests. |
| D07 | User changes raw evidence while derived values stay the same. | Invalidate confirmation/resolutions and rerun. | Protected token/source-change tests. |
| D08 | Raw cell words alter source/control routing. | Typed source/field determines action independent of raw text. | Defect F1. |
| D09 | Copy editing, translation, or wording changes alter regex matches. | Presentation text must not control routing. | Open regression risk caused by same F1 architecture. |
| D10 | Missing original evidence is resolved by choosing whichever value produces a positive result. | Preserve unauthenticated status; require external evidence for real-world decisions. | Boundary/Open: local choice recorded; correctness of choice not verified. |

### E. Verification facts and outside-scope repairs

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| E01 | Missing/unrecognized Pax8 distributor, product, model, term, or seat flag. | Name field/source and direct usable Pax8 evidence repair. | Protected ordinary source route; F1 raw-word adversarial variants fail. |
| E02 | Halo billing system is missing/unrecognized. | Name Halo source and direct Halo repair. | Protected model source route; focused browser variant partial. |
| E03 | Next commitment term unknown/unasked. | Check Pax8 Manage renewal and focus next-term response. | Protected. |
| E04 | Next term monthly/other. | Outside-scope correction targets next-term response; otherwise explicit stop. | Defect F5. |
| E05 | Current and scheduled term conflict; user-report conflicts with scheduled term. | Identify particular disagreement; preserve uncertainty; correct relevant response/evidence. | Classification protected; text-derived control selection is partial/F1-prone. |
| E06 | Unrecognized billing plan or annual/monthly contradiction. | Check original Pax8 term and billing plan, not customer agreement or Halo. | Ordinary route protected; F1 fails raw-word variants. |
| E07 | Partial/invalid/reversed/short/co-termed start/end dates. | Specific Pax8 date/duration check; do not infer economics. | Classification protected; individual action/focus combinations partial. |
| E08 | End state cancel, extended, unknown, or unrecognized. | Outside or verify as appropriate; correct original Pax8 evidence. | Classification protected; outside focus F5 and raw-text source F1. |
| E09 | Reseller responsibility unknown/false despite a Pax8 row. | Review arrangement; reach relevant questionnaire answer; no file-based proof. | Protected model; browser reseller verification path not in focused Principle 7 script. |
| E10 | Agreement exists but is unsigned, obsolete, for another customer/product, or covers different seats/term. | Availability cannot establish contractual coverage; separate agreement review. | Boundary/Open. |
| E11 | Agreement cannot be found or originals cannot settle discrepancy. | Explicit unresolved stop/escalation with evidence needed; avoid promising a rerun will solve absent evidence. | Partial: verification text exists; no detailed no-access/unobtainable-evidence recovery. |
| E12 | Outside condition is caused by questionnaire claim, Pax8 row, Halo row, or next-term response. | Each cause has correct direct edit/focus target, not a generic instruction. | Defect F5 across record outside routes; cause metadata currently absent. |

### F. CSV/input failures and technical exceptions

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| F01 | Missing Pax8, missing Halo, or both missing. | Identify each missing control; preserve valid selections. | Partial: native required validation can handle it; custom catch says both and fixed focus is inaccurate. |
| F02 | Malformed Pax8 versus malformed Halo; both malformed. | Name offending source/row and focus that input; reveal next error after first repaired. | Defect F2 for Halo. Parser is fail-first, not a full error inventory. |
| F03 | Empty CSV, missing/duplicate columns, wrong row widths. | Human-readable exact source/row/column correction. | Parser protection; file source not retained in catch, F2. |
| F04 | Broken quotes, BOM, CRLF, quoted comma/newline, trailing blanks. | Valid forms accepted; invalid forms get source-specific repair. | Partial parser/tests; whole dialect/action matrix not established. |
| F05 | File >2 MB, >5000 rows, or cell >1024 characters. | State correct limit and responsible file; preserve case. | Guards present; source-specific recovery partial/F2. |
| F06 | Wrong encoding, semicolon delimiter, locale dates, Excel/PDF/native export. | Explain supported normalized format; avoid instructing random data edits. | Boundary/Partial: rejected through parser; no native adapter or format-conversion workflow. |
| F07 | File read rejects or takes indefinitely. | Correct affected file or explicit retry/failure state; do not leave unexplained disabled submit. | Open: async rejection caught generically; no pending status, timeout, or cancel apart from clear/change. |
| F08 | Internal TypeError/platform exception is presented as bad customer input. | Distinguish technical failure from repairable data; preserve safe blocked state. | Partial: generic catch labels every exception input repair. No positive result, but instruction may be impossible. |
| F09 | Raw CSV content includes HTML/script/control text. | Safe text rendering and bounded input; action source unaffected by raw content. | Rendering protected through textContent and test; semantic routing defect F1 remains. |
| F10 | Native validation intercepts submit before a structured result. | Equivalent understandable, accessible next step; no stale result mistaken for current. | Partial: noValidate is set only on questionnaire; native error-path accessibility not comprehensively checked. |

### G. Edits, resets, asynchronous work, and time

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| G01 | Edit questionnaire answer/date after result. | Clear dependent records/decisions and require recheck. | Protected for ordinary changes; programmatic changes without events are not covered. |
| G02 | Change either file, ID, or next-term response. | Clear record result, confirmation, and conflict choices. | Protected. |
| G03 | Change agreement availability used by fit result. | Invalidate/recompute all dependent results. | Defect F6. |
| G04 | Clear resets agreement/next term but leaves earlier fit action. | Reset dependency ownership consistently; no stale agreement result. | Defect F6. |
| G05 | Clear/edit/new run while old file read is pending. | Obsolete read cannot resurrect a result or leave submit disabled. | Protected delayed-read case; multi-overlapping-runs variants partial. |
| G06 | Local date crosses midnight or policy expires in an open tab. | Invalidate before reuse; fail closed when expired. | Protected focus/visibility/timer tests. |
| G07 | Policy expires while still answering questions, without a completed result. | Check policy before further classification, including already-continued early-exit paths. | Partial: policy checked on evaluation; no immediate expiry UI when resultCheckedDate is null. |
| G08 | Wrong device clock/time zone or clock moves backwards. | Explicit device-date boundary; do not claim vendor cutoff safety. | Partial label/warning; authoritative clock absent. Boundary for actual deadline. |
| G09 | Vendor records change during same calendar day. | Detect/reverify external freshness before decisions. | Boundary/Open: local evidence tokens cannot observe vendor changes. |
| G10 | Browser refresh/back restoration, multiple tabs, suspended tab, or browser closes mid-review. | No restored stale authority; communicate loss/recheck appropriately. | Open: no persistence by design; browser history/cache/multi-tab lifecycle not fully tested. |

### H. Action interaction and accessibility

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| H01 | Action text visible but button absent, wrong, or silently does nothing. | Result-associated repair control or deliberate external/terminal boundary. | Defect F5; fallback selectors use optional focus and can silently fail on future drift. |
| H02 | Focus targets hidden, disabled, detached, wrong, or already-resolved control. | Visible actionable focus with clear context. | Ordinary tested targets protected; F2 wrong-file focus; all branches not tested. |
| H03 | Result content precedes next action with long provenance/conflict lists. | Visitor can find the decisive action without losing context or excessive navigation. | Open usability gate; action is rendered after provenance and caveat. |
| H04 | Keyboard-only user must traverse many unrelated controls to reach action. | Reasonable keyboard sequence and explicit focused recovery. | Partial automated paths; no full real-user keyboard session. |
| H05 | Screen reader does not announce rerendered status, action, or focus context intelligibly. | Manual screen-reader validation across link/conflict/edit/error/stop transitions. | Open; axe cannot establish this. |
| H06 | Mobile touch, zoom, text enlargement, high contrast, reduced motion, or forced colors obscures action. | Readable reachable controls and visible focus across supported modes. | Partial: 375-pixel overflow and axe checks; full modes/devices open. |
| H07 | Browser/platform lacks module, File.text, structuredClone, FormData, or supported file-input behavior. | Supported-browser contract and visible technical fallback. | Open: modern browser tested, no compatibility/fallback matrix; no noscript fallback. |
| H08 | User misunderstands conditional correction as permission to change inconvenient evidence. | Explain correcting a mistaken normalized value against originals, not editing facts to force a fit. | Open comprehension and source-integrity gate. |

### I. External feasibility and completion boundaries

| Case | Failure condition | Required result/action | Current evidence |
| --- | --- | --- | --- |
| I01 | User has no Pax8/Halo permissions, reseller delegates access, or source is unavailable. | Feasible request/escalation or explicit unresolved stop; don't repeat inaccessible task indefinitely. | Open. |
| I02 | Vendor UI labels/navigation differ by version, tenant, role, or locale. | Instructions validated against current supported account context. | Open; no authenticated vendor screens in this audit. |
| I03 | Native export omits required IDs, renewal term, or linked customer fields. | Honest unsupported mapping/evidence request; no invented adapter success. | Boundary/Open; user confirmed no real exports yet. |
| I04 | Supplied records are stale, manually altered, or from different export dates/tenants. | Separate live verification and identity/freshness evidence. | Boundary/Open; warnings exist, authentication absent. |
| I05 | Halo line exists but is inactive, future-dated, cancelled, bundled, or billed elsewhere. | Verify active billing reality before financial interpretation. | Boundary/Open; `billing_system` is not active billing proof. |
| I06 | User finishes local positive path and expects the promised full coverage analysis. | Explicit prototype stop and actionable separate review boundary. | Local stop protected; practical downstream self-service workflow not built. |
| I07 | Policy review is overdue or changed vendor rules invalidate routing sooner. | Owner review and updated policy; never reuse stale rule as authoritative. | Date expiry protected; rule-change detection/manual governance open. |
| I08 | Action implicitly requires legal interpretation, exposure calculation, renewal/cancellation/payment, or safe deadline decision. | State absent capability; no financial authorization. | Boundary; local financial-action prohibitions protected. |

### J. Quality-gate and maintenance failures

| Case | Failure condition | Required verification | Current evidence |
| --- | --- | --- | --- |
| J01 | Tests assert only that text exists, not semantic source/field correctness. | Assert typed issue/source/target, button focus, and successful recovery for every result family. | Confirmed coverage gap: F1–F6 survived existing suite. |
| J02 | Happy-path malformed-input test always breaks Pax8. | Independently break Pax8, Halo, both, and non-file inputs. | Confirmed gap: focused browser script only malformed Pax8. |
| J03 | Model status coverage is described as exhaustive action coverage. | Cross-product priority, schema, source, target, and lifecycle assertions beyond route samples. | Partial: broad classification tests exist, focused action tests sample routes. |
| J04 | Tests mirror message regexes and therefore share the same mistake. | Independent expected metadata; adversarial raw strings/copy changes. | Open additional regression work; text-based implementation is vulnerable. |
| J05 | Browser tests share state or fixtures bypass real constraints. | Fresh isolated sessions; realistic native files when available; separate evidence levels. | Fresh sessions protected; native fixtures absent. |
| J06 | Passing axe is called complete accessibility acceptance. | Human keyboard/screen-reader and comprehension sessions with recorded failures and repairs. | Open. |
| J07 | Stale docs/counts or git diff --check on untracked files are treated as current evidence. | Current receipts and explicit file scan; accurate verification ledger. | README still says 76 tests/11 scripts; root remains untracked, so git diff coverage is insufficient. |
| J08 | Synthetic pass is promoted to production/customer/market acceptance. | Separate implementation, vendor mapping, real usability, and demand evidence. | Open external gates; no paid adoption or wedge validation asserted. |

## Coverage arithmetic and scenario combinations

There are **96 failure classes** above: A=8, B=12, C=10, D=10, E=12, F=10, G=10, H=8, I=8, J=8. Some overlap deliberately: a single implementation defect can violate source precision, recovery, accessibility, and validation simultaneously.

For a rigorous local closure, each relevant class must cover these combinations rather than only one example:

1. **Result routes:** questionnaire early outside, completed outside, verify, positive, policy block; record identity, link repair, confirmation, conflict, outside, verify, positive, policy block; input/technical errors and native validation interception.
2. **Fields/sources:** reseller; distributor; Halo billing; product/model/seats/current term; renewal/date/cutoff; agreement; next term; scheduled term/frequency; current frequency/start/end; subscription/line/customer identity. Test both source systems and no-source claims.
3. **Priority interactions:** policy plus bad input; missing identity plus conflict; link mismatch plus outside; conflict plus outside/unknown; outside plus unknown; several same-priority issues; first issue repaired, next issue remains. Do not demand downstream analysis when parsing/identity cannot support it.
4. **State transitions:** initial result, direct edit, Back, voluntary continuation after early exit, accept-file, keep-answer, replacement evidence, changed raw cells with same derivation, ID change, next-term change, agreement change, clear, rerun, delayed read, new run, midnight, policy expiry, refresh/history restoration.
5. **Interaction modes:** model-only assertions, real-browser button/focus assertions, keyboard, mobile, zoom/contrast, screen reader, and actual MSP comprehension. A successful model action does not prove an operable browser action.
6. **Data variants:** exact supported token; explicit outside; blank/documented unknown; unrecognized label; adversarial source words; delimiter/encoding/quotes; zero/one/multiple matching rows; malformed/oversize/overlong evidence; stale/unavailable real originals.

The acceptance oracle must require that (a) the action is correct for the cause, (b) its control works, (c) completing a valid repair removes that cause or yields an explicit justified stop, (d) remaining issues persist and become primary in the expected order, and (e) no new result implies unavailable verification or financial authority.

## Recommended closure order

1. Replace message parsing with typed issues carrying stable code, condition, source system, original-source description, repair target, and outcome. Keep copy and raw cell text as presentation only. This addresses F1 and supports precise fixes for F2/F3/F5.
2. Preserve failed-input source and distinguish missing/invalid ID from missing/duplicate source rows. Add both-source and both-file recovery tests.
3. Add direct record outside-scope correction controls tied to typed causes. Verify actual focus and a successful corrected rerun for every outside cause.
4. Preserve answered early uncertainties and define agreement dependency/reset ownership. Add transition tests that compare displayed action to current model inputs.
5. Resolve S1, assert the full action schema, and add independent adversarial/source-target assertions. Repair the README verification ledger.
6. Rerun model, browser, syntax, relevant axe states, and explicit whitespace checks over changed/untracked files. Save concrete receipts.
7. Close real export, original-system access, user comprehension, keyboard, and screen-reader gates when those inputs/users are available. Financial coverage and deadline decisions stay outside this prototype unless separately implemented and validated.

Until steps 1–6 pass, the correct status is **implemented with known local Principle 7 defects**. Even after that, step 7 remains a separate acceptance boundary.
