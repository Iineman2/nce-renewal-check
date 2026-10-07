# Principle 8 failure and edge-case audit

30 September 2026; source policy nce-scope-v10. Audit only: production implementation and prior passing receipts were not modified. Reproduction code and outputs are in output/principle-8-audit/.

Principle 8 fails when original, supplied, reviewed and effective claims are conflated; their history or case binding changes silently; the trace disagrees with rules; provisional evidence is promoted to authenticated truth; or the evidence used to claim acceptance is stale or incomplete. A truthful verification/unsupported/technical stop is expected behavior, not itself a principle failure.

This is a finite, source-grounded matrix of 128 failure conditions across 16 families, plus required interaction products. No finite test suite proves every possible vendor record, browser, concurrent ordering or human interpretation. Each row states its coverage boundary rather than presenting an untested possibility as passed.

The earlier 101-test/19-browser/30-syntax checkpoint remains evidence for its bounded normal-data scenarios. This deeper audit found new gaps; its conclusions supersede any broad reading that every strict gate and every edge case has been closed. The six gap families are open, and seven external acceptance gates remain pending. No deployment, provider access or financial action occurred.

Statuses: C = explicit existing automated coverage; S = guard/source behavior inspected, not a claim that every variant was executed; G1-G6 = confirmed open finding; U = additional negative/interaction test or hardening needed; P = external/human acceptance pending. Existing evidence filenames below refer to scope-fit/ unless they name this audit's JSON/text receipts.


Six confirmed gap families emerged after the original bounded suite passed:

| Finding | Boundary and observed result | Required closure |
| --- | --- | --- |
| G1: Unstable/accessor inputs | A getter returned yes during rules and no during projection: result looks-in-scope but traced input classifies outside. Direct API only; ordinary form data has no accessors. | Canonical plain-data snapshot once at entry; reject accessors/exotic inputs; assert classifier/trace equivalence. |
| G2: Unsupported snapshot values | An inactive function date remained a mutable reference; Date became an empty object; a cycle threw RangeError. Direct API/helper inputs, not ordinary HTML date values. | Define/validate scalar input schema, including inactive fields. Bound or reject unsupported types/depth/cycles with controlled errors. |
| G3: Raw fidelity and review binding | CSV parsing trims cells. Changing pax8 to a space-padded value retained old API link and acceptance basis; displayed raw was trimmed. Normal UI file change still invalidates the result. | Preserve actual raw versus normalized values and bind the intended evidence representation; test whitespace, quotes and normalization changes. |
| G4: Stale QC evidence | In a disposable copy, changing actionAuthorized false to true still passed check-source.py using old receipts; checker also replaced the old manifest. Production source was not changed. | Immutable source/run binding; verify hashes before writes; invalidate receipts after changes; negative stale-receipt tests. |
| G5: Conflicting source-stage labels | Real browser legacy provenance calls agreement and next-term responses questionnaire, while the new trail correctly calls them preparation and record-stage responses. | One consistent source label owner; remove or correct contradictory legacy copy; add independent copy/comprehension assertions. |
| G6: Missing projection accepted | Browser-only fault injection removed claimReview; positive questionnaire heading still rendered with no trail. Not a normal producer path, but renderer does not enforce mandatory trace completeness. | Validate required projection schema before result DOM changes; visibly stop on missing/malformed/inconsistent trace. |

Bidi controls were also retained in raw cells. This is a confirmed hardening/test gap, not proof of a financial bypass or observed human misunderstanding. Accessibility/comprehension acceptance remains pending.


## Full matrix


### Claim capture and original responses

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-01-01 | C | CSV acceptance overwrites original questionnaire controls | Keep originals; show chosen source only in effective input | source-following.test.mjs; ui-source-following.js |
| P8-01-02 | C | Known file silently overwrites an unknown response | Preserve unknown original and disclose the informed effective claim | source-following.test.mjs; ui-source-following.js |
| P8-01-03 | C | Approximate response becomes falsely exact in the original | Keep approximation; attribute exact effective date to supplied CSV | source-following.test.mjs; ui-source-following.js |
| P8-01-04 | C | A later stored answer affects an early-exit result | Exclude suffix inputs and mark retained responses not assessed | source-following.test.mjs; fit.test.mjs |
| P8-01-05 | C | Unasked agreement is displayed as known unavailable | Keep not-asked distinct from no and unknown | source-following.test.mjs; ui-source-lifecycle.js |
| P8-01-06 | C | A retained inactive date is presented as evaluated | Keep exact input snapshot but mark unused date not assessed | source-following.test.mjs |
| P8-01-07 | C | Conflicted date cleared to undefined becomes not-asked | Label the conflicted input unknown | source-following.test.mjs; ui-source-following.js |
| P8-01-08 | C | Later caller mutation changes a valid plain-data snapshot | Deep detach and freeze originals, raw cells and choices | source-following.test.mjs |

### Source interpretation and uncertainty

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-02-01 | C | Blank source cell is interpreted as known false | Classify unknown and request original-source verification | preflight.test.mjs; ui-unknown.js |
| P8-02-02 | C | Documented unknown tokens become other | Preserve unknown rather than invent exclusion | preflight.test.mjs |
| P8-02-03 | C | Unrecognized distributor or billing label becomes supported | Request verification without guessing the vendor | preflight.test.mjs |
| P8-02-04 | C | Supported answer fills missing source evidence | Downgrade supported effective claim to unknown | source-following.test.mjs; ui-source-following.js |
| P8-02-05 | C | Missing source erases a known outside response | Retain that outside self-report and source gap | source-following.test.mjs; ui-unknown.js |
| P8-02-06 | C | One unknown compound component hides another known false | Preserve known unsupported commitment evidence | preflight.test.mjs |
| P8-02-07 | C | Blank, n/a or invented end state appears known | Existing decision branch supplies unknown or unrecognized state | source-following.test.mjs; ui-source-following.js |
| P8-02-08 | C | Agreement between answer and file is called authentication | Attribute agreement to supplied CSV; authenticated remains false | source-following.test.mjs; ui-source-following.js |

### Conflict choices and review binding

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-03-01 | C | An unresolved conflict receives a positive result | Effective conflicted value unknown; route to review | preflight.test.mjs; ui-source-following.js |
| P8-03-02 | C | Only one of several conflicts is resolved but all are cleared | Keep remaining conflicts unresolved and independently reviewable | preflight.test.mjs; ui-smoke.js |
| P8-03-03 | C | Keep-answer uses the original value to clear conflicting evidence | Keep original visible; effective value stays unknown until repair | source-following.test.mjs; ui-source-following.js |
| P8-03-04 | C | Accept-file is relabeled verified or financially safe | Record a choice, never authority or authenticated truth | source-following.test.mjs; ui-source-following.js |
| P8-03-05 | C | A choice transfers to another subscription with identical claims | Bind exact case identity, responses and selected records | preflight.test.mjs |
| P8-03-06 | C | Changed date, term, agreement or answer reuses choices | Reject stale basis or clear choices before new run | source-following.test.mjs; ui-source-lifecycle.js |
| P8-03-07 | C | Changed raw case or optional context reuses a decision | Reject the changed selected-record basis | preflight.test.mjs; source-following.test.mjs |
| P8-03-08 | G3 | Whitespace-only raw cell change reuses API choices and link confirmation | Preserve raw cells or disclose normalization and strengthen binding | model-probes.json |

### Input types and snapshot boundaries

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-04-01 | G1 | Accessor or proxy changes a value between validation, classification and trace | Read validated plain data once; reject accessors or unsupported objects | model-probes.json |
| P8-04-02 | G2 | Function-valued inactive date remains a mutable snapshot reference | Reject non-data values; never retain mutable function references | model-probes.json |
| P8-04-03 | G2 | Date, Map or other class instance loses its value in cloning | Reject unsupported types or explicitly preserve a supported type | model-probes.json reproduces Date becoming an empty object; Map source inspection |
| P8-04-04 | G2 | Cyclic or deeply nested inactive value overflows recursion | Bound input shape/depth and reject with controlled input error | model-probes.json reproduces cycles; depth variant not separately run |
| P8-04-05 | S | Null, array or absent answers reach ordinary rule evaluation | Reject unsupported answer containers before classification | fit.mjs validation; existing omitted/choice tests |
| P8-04-06 | S | Unexpected categorical values bypass explicit choices | Reject invalid values rather than silently normalize them | fit.mjs validation; fit.test.mjs |
| P8-04-07 | U | Prototype pollution, inherited data or exotic resolution objects create inconsistent snapshots | Define own-property/plain-data schema and test hostile object shapes | resolutions has prototype guard; answer-object hardening not fully tested |
| P8-04-08 | U | Serialization drops undefined or rewrites snapshots before a future consumer uses them | Specify null/absence/state serialization contract before adding export or storage | no export or persistence currently exists |

### Identity and mapping

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-05-01 | C | Missing, absent or duplicate Pax8 identity produces a selected case | Unavailable identity trail; require one justified row | preflight.test.mjs; ui-source-following.js |
| P8-05-02 | C | Zero or multiple Halo lines are silently selected | Stop for link review; do not fabricate a unique mapping | preflight.test.mjs |
| P8-05-03 | C | Different customer references are linked | Comparison only; repair original-system mapping | preflight.test.mjs; ui-source-following.js |
| P8-05-04 | C | Equal references alone are treated as verified identity | Require explicit same-case self-attestation and retain trust limits | preflight.test.mjs; ui-source-following.js |
| P8-05-05 | C | Repeated Halo line ID elsewhere in file passes as unique | Reject duplicated selected line ID | preflight.mjs; action-closure.test.mjs |
| P8-05-06 | C | Missing, invisible, control or oversized identifiers are used | Reject or stop on responsible source | action-closure.test.mjs; ui-action-closure.js |
| P8-05-07 | P | Legitimate multi-line billing or tenant-specific customer aliases are forced into one match | Stop unsupported mapping; validate a native adapter separately | PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md |
| P8-05-08 | P | Lookalike IDs or same short reference in another tenant identify the wrong real customer | Authoritative tenant/account/identity verification outside local CSV matching | external authenticity and mapping boundary |

### Freshness, clock and policy

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-06-01 | C | Local midnight leaves an earlier source result active | Clear records, choices and trace before recheck | ui-source-lifecycle.js; ui-freshness.js |
| P8-06-02 | C | Expired policy permits classification or comparison | Fail closed with unavailable policy trail | source-following.test.mjs; ui-action-policy.js |
| P8-06-03 | C | Same-day renewal is mistaken for time remaining | Require cutoff and timezone verification | fit.test.mjs; preflight.test.mjs |
| P8-06-04 | C | Past, day-60, day-61 or leap dates use wrong window | Use calendar arithmetic and tested boundaries | fit.test.mjs |
| P8-06-05 | C | History restoration or reload restores an accepted trail | Clear previous results and records; fresh check required | ui-source-lifecycle.js; ui-action-policy.js |
| P8-06-06 | P | Wrong device clock or timezone produces a misleading window | Obtain authoritative time and cutoff before decisions | device date is explicitly provisional; no trusted clock |
| P8-06-07 | P | Files or live systems change within the same day | Do not imply freshness from checkedToday or a self-attestation | no vendor observation or export freshness validation |
| P8-06-08 | U | Policy deployment, mixed cached modules or an open old tab keeps an old version active | Version-bound release and stale-client handling need explicit tests | basis includes local policy version; no live policy handshake |

### Economic and record contributors

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-07-01 | C | Monthly invoicing is interpreted as a monthly commitment | Separate commitment_term from billing_frequency | preflight.test.mjs; ui-precise-language.js |
| P8-07-02 | C | Current annual term substitutes for the next renewal term | Keep record-stage next-term response independent | preflight.test.mjs; ui-economic-edge.js |
| P8-07-03 | C | Absent scheduled columns prove no scheduled change | Disclose absence; never infer absence of a real change | preflight.mjs caveat; source-following.test.mjs |
| P8-07-04 | C | Unknown or inconsistent scheduled term clears scope | Keep verification and economic uncertainty override | preflight.test.mjs |
| P8-07-05 | C | Accepted commitment ignores an economic inconsistency | Guard effective commitment to unknown while retaining choice | source-following.test.mjs; ui-source-following.js |
| P8-07-06 | C | Partial, invalid, reversed or shortened term dates are trusted | Surface verification and retain raw economic context | preflight.test.mjs; ui-economic-edge.js |
| P8-07-07 | C | Invoice date or misaligned renewal date is treated as authoritative term renewal | Check optional alignment context; do not certify cutoff | preflight.test.mjs |
| P8-07-08 | C | End state, next term, link or economic issues disappear because fit inputs alone look supported | Carry record contributors and authoritative top-level record status | source-following.test.mjs |

### Trace schema, provenance and copy

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-08-01 | G5 | Legacy list calls agreement availability a questionnaire answer | Use preparation-self-report consistently in both displays | ui-probe.txt |
| P8-08-02 | G5 | Legacy list calls record-stage next term a questionnaire answer | Use record-stage source consistently in both displays | ui-probe.txt |
| P8-08-03 | G3 | Displayed raw cells are trimmed rather than original source cells | Expose normalized and actual raw separately, or stop claiming byte/raw fidelity | model-probes.json |
| P8-08-04 | G6 | Missing claimReview silently leaves a positive result without the required trail | Validate mandatory trace for valid result; stop on missing projection | ui-probe.txt fault injection |
| P8-08-05 | U | Unknown stage, origin, system, reason or field key is rendered inconsistently | Add full runtime projection schema validation and negative tests | row validates reason only; renderer has no complete schema validator |
| P8-08-06 | U | A downstream consumer uses scopeRuleStatus while ignoring blocked record status | Make candidate rule status explicitly subordinate to record usage/link state | current UI respects top-level status; future consumer hazard |
| P8-08-07 | U | Schema changes add a classifier input but omit its trace/origin  | Enforce field/schema completeness and effective-input equivalence | fixed SCOPE_KEYS and current branch tests; future migration hazard |
| P8-08-08 | P | Internal codes such as annual-m365-nce or not-asked confuse a visitor | Validate language comprehension; use consistent human-readable value labels | MSP comprehension gate pending |

### UI changes and invalidation

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-09-01 | C | Editing questionnaire answers leaves a record trail usable | Clear trace DOM and case decisions; originals stay editable | ui-source-lifecycle.js |
| P8-09-02 | C | Changing either file leaves an accepted source choice active | Invalidate old case and link confirmation | ui-source-lifecycle.js |
| P8-09-03 | C | Editing subscription ID retains another case interpretation | Clear record result and choices on input | ui-source-lifecycle.js |
| P8-09-04 | C | Agreement edit leaves stale questionnaire dependency or trace | Recompute questionnaire availability and clear record result | ui-source-lifecycle.js; ui-action-closure.js |
| P8-09-05 | C | Next-term edit leaves a current record interpretation active | Clear record result and force new comparison | ui-source-lifecycle.js |
| P8-09-06 | C | Clear/reset leaves old source cells or agreement responses visible | Reset record data, trace and dependent questionnaire preparation | ui-source-lifecycle.js |
| P8-09-07 | U | Autofill, external reset or scripted value mutation emits no subscribed event | Check live control basis before confirmation/choice as well as event invalidation | normal event paths tested; silent mutation variant not exercised |
| P8-09-08 | U | Double-click, programmatic submit or detached old control reruns old closure data | Test rapid ordering and bind each interaction to current visible case | nonce/read guards inspected; full rapid-interaction matrix not run |

### File ingestion and normalized input

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-10-01 | C | Empty, missing-header or native-schema file is treated as usable evidence | Reject and route to exact source-file repair | preflight.test.mjs; action-closure.test.mjs |
| P8-10-02 | C | Duplicate headers or wrong row width cause ambiguous data | Reject before comparison | preflight.test.mjs; action-closure.test.mjs |
| P8-10-03 | C | Malformed quoting changes field boundaries | Strict CSV parse; no best-effort guessing | action-closure.test.mjs |
| P8-10-04 | C | Quoted commas, escaped quotes or CRLF are misparsed | Maintain supported CSV dialect; test limits | action-closure.test.mjs |
| P8-10-05 | C | File, row count or cell length exceeds bounds | Reject with repair path; no partial successful comparison | action-closure.test.mjs |
| P8-10-06 | C | Unreadable or replacement-character text is used | Reject file read and request readable normalized UTF-8 CSV | action-closure.test.mjs; ui-action-lifecycle.js |
| P8-10-07 | P | Localized dates, enum spellings, semicolon CSV or native display labels are mapped incorrectly | Fail unsupported input and validate native mapping separately | normalized schema only; no native adapter |
| P8-10-08 | U | Very long headers, many extra columns or worst-case parser/DOM shape exhausts resources | Test maximum allowed adversarial shapes and bound header/column resources | bytes/rows/cells bounded; separate header/column/performance stress not run |

### Asynchronous and technical failure

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-11-01 | C | Slow read produces an unbounded wait or false completed trail | Bound read timeout, allow cancellation and explicit repair | ui-action-lifecycle.js |
| P8-11-02 | C | Cancelled read later restores a result | Nonce invalidation prevents resurrection | ui-source-lifecycle.js |
| P8-11-03 | C | Clear during read restores the old case later | Clear data and invalidate active nonce | ui-race.js; ui-action-lifecycle.js |
| P8-11-04 | S | Changing inputs during read mixes old files with new answers | Discard old run on event change; require a new run | app.mjs nonce checks inspected; direct input-edit-during-read variant not separately executed |
| P8-11-05 | C | Read rejection is treated as a source fact | No comparison; structured input repair instead | ui-action-lifecycle.js |
| P8-11-06 | C | Missing module or File API produces a usable result | Visible startup stop and no classification | ui-action-policy.js |
| P8-11-07 | C | Repair control/render exception silently does nothing | Technical stop, clear current case and deny result reuse | ui-action-lifecycle.js; safeRecordRender |
| P8-11-08 | U | Unsupported snapshot shape or partial trace throws during questionnaire rendering outside record catch | Validate input and trace before DOM mutation; ensure controlled questionnaire stop | model-probes.json; missing/partial projection fault boundary |

### Accessibility, security and interpretation

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-12-01 | C | HTML/script in source cells executes in the trail | Use textContent and literal source rendering | ui-source-accessibility.js |
| P8-12-02 | C | Keyboard cannot expand or collapse trail | Native summary controls respond to Enter and Space | ui-source-accessibility.js |
| P8-12-03 | C | Long trail displaces primary next-action focus | Keep action before source detail and preserve focus ordering | ui-source-accessibility.js; ui-a11y.js |
| P8-12-04 | C | Long raw strings overflow mobile or enlarged text | Wrap source cells; 320px/200% tested | ui-source-accessibility.js |
| P8-12-05 | U | Bidi, zero-width or other format controls visually disguise raw facts | Escape or visibly label controls and validate assistive rendering | model-probes.json retains bidi control; misleading-user effect not demonstrated |
| P8-12-06 | P | Screen reader misses result or cannot distinguish original/source/effective values | Human task-based assistive testing on actual platform | human accessibility gate pending |
| P8-12-07 | P | Visitor never opens details or assumes acceptance equals verification | Test discoverability and comprehension on critical tasks | MSP comprehension gate pending |
| P8-12-08 | U | Print, clipboard, screenshot, forced styles or browser extension omits trust caveats | Test intended sharing/print surfaces before claiming those uses supported | no application export; user-controlled sharing not certified |

### Real-source trust and authority

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-13-01 | P | Fabricated or edited CSV looks authentic because values match | Require independent original-system evidence; never authenticate CSV locally | external authenticity gate |
| P8-13-02 | P | Stale export is accepted as current vendor state | Verify timestamp and original live state separately | external freshness gate |
| P8-13-03 | P | Operator checks another account or lacks the needed role | Verify exact tenant/account and authorized evidence access | external roles and identity gate |
| P8-13-04 | P | HaloPSA label is mistaken for active recurring billing | Authoritatively verify active line, quantities and billing state | external billing gate |
| P8-13-05 | P | Agreement available is mistaken for signed applicable clauses | Review actual signed customer order, term and scope separately | external agreement gate |
| P8-13-06 | P | CSV presence proves reseller financial responsibility | Obtain commercial responsibility evidence; preserve self-report limit | external commercial evidence boundary |
| P8-13-07 | P | A date proves a safe cancellation or renewal deadline | Obtain exact authoritative cutoff/timezone before action | external deadline gate |
| P8-13-08 | P | False self-attestation or agreeing wrong sources become financial permission | Never grant financial authority; independent verification remains required | trust flags false; real attestation correctness cannot be established locally |

### QC evidence and policy governance

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-14-01 | G4 | Changed source passes old unit/browser/syntax receipts | Bind all execution receipts to immutable source hashes and actual runs | evidence-probe.json |
| P8-14-02 | G4 | Checker replaces manifest before deciding whether evidence is current | Separate capture from verification; compare saved manifest before any write | evidence-probe.json |
| P8-14-03 | C | Browser CLI exit zero with an error block is counted as passing | Reject error blocks and require explicit PASS | run-browser-qc.ps1 |
| P8-14-04 | U | Hard-coded counts survive new tests, renamed scripts or incomplete receipt collection | Validate expected manifest and executions, not magic substring totals | check-source.py fixed counts; current nineteen-name completeness check exists |
| P8-14-05 | U | Source metadata tests share the same mistake as merge implementation | Use independent expected inputs and fault/mutation tests | existing field matrix independent; new probes expose untested boundaries |
| P8-14-06 | P | Automated axe success is treated as human accessibility acceptance | Keep external acceptance pending | QC ledger and human acceptance protocol |
| P8-14-07 | U | A future projection/policy change omits version or review-basis update | Require migration assertions and stale-client tests | current policy version included; future release process not tested |
| P8-14-08 | S | Later audit findings leave old closure report appearing universally current | Add an explicit audit supersession notice and track open findings | this audit supersedes broad all-gates wording; baseline receipts preserved |

### Interactions requiring combined coverage

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-15-01 | C | Accepted commitment plus scheduled inconsistency hides uncertainty | Show acceptance and guarded unknown simultaneously | source-following.test.mjs; ui-source-following.js |
| P8-15-02 | C | Unconfirmed/mismatched link plus otherwise supported fields shows completed preflight | Comparison-only trail and identity/link priority | source-following.test.mjs; ui-source-following.js |
| P8-15-03 | C | Known outside self-report plus unknown source loses either condition | Retain known false and missing-source verification | source-following.test.mjs; ui-unknown.js |
| P8-15-04 | C | Approximate original plus valid file date silently rewrites response | Exact effective date from CSV; approximate original stays intact | ui-source-following.js |
| P8-15-05 | C | Policy expiry plus malformed files offers input repair instead of policy stop | Policy takes precedence; no source reliance | source-following.test.mjs; ui-policy-priority.js |
| P8-15-06 | U | Two simultaneous conflicts plus economic override plus switching keep/accept chooses stale origins | Test the interaction product and independent invariants | individual branches and multi-conflict smoke covered; full combined product not run |
| P8-15-07 | U | Late read plus input change plus midnight/history restoration resurrects a mixed case | Test combined race orderings, not only individual invalidations | individual lifecycle cases pass; full interleaving product not run |
| P8-15-08 | P | Contradictory originals plus no access plus user misunderstanding yields wrong financial action | Maintain unresolved stop; real operator task acceptance required | external evidence and comprehension gate |

### Data handling and delivery boundaries

| ID | Status | Failure condition | Required behavior | Evidence/boundary |
| --- | --- | --- | --- | --- |
| P8-16-01 | C | Source trail addition uploads local files or stores answers | No application upload or browser persistence | ui-smoke.js |
| P8-16-02 | C | Reload silently restores private case data and review choices | No persistent case state; require a new check | ui-source-lifecycle.js; ui-smoke.js |
| P8-16-03 | U | Unrelated sensitive optional columns enter the review basis and later logs | Minimize stored trace context and define safe logging/serialization before integration | basis includes full selected rows; no current logging/export feature |
| P8-16-04 | P | Real customer identifiers are exposed by screen sharing or a shared device | Define real-data access/privacy handling before real acceptance | synthetic tests do not certify shared-device confidentiality |
| P8-16-05 | U | Trace is embedded in later email, PDF or telemetry without trust/context fields | Require explicit downstream schema and redaction contract | no such outbound feature currently exists |
| P8-16-06 | U | Mixed deployed versions or cached HTML display copy inconsistent with the decision module | Test release/cache/version coherence before hosted acceptance | current local module delivery only; no authenticated deployment acceptance |
| P8-16-07 | P | Compromised host, extension or browser changes displayed source facts | Define trusted delivery and operator environment for real acceptance | pure local prototype cannot certify host integrity |
| P8-16-08 | S | Oversized accidental contract or wrong file is retained as successful source data | Limit reads and required normalized schema; signed terms are not accepted as coverage evidence | file-size/schema guards; no contract parser |

## Required combined test design

Use all seven canonical scope fields, four source-conflict fields, three source semantic states (supported/outside/unknown), three original states where defined, and unresolved/accept/keep review states. Include exact/approximate/unknown renewal, same-day/past/day-60/day-61 dates, all agreement and next-term choices, supported/unknown/unrecognized end states, link unusable/pending/self-attested, economic guard present/absent, and policy current/expired.

For each applicable combination, independently assert: original controls and snapshot unchanged; raw/normalized values distinguished; effective input and origin agree with the owning branch; no positive result with a blocking issue; record status governs candidate rule status; every trust/authority flag remains false; choices are tied to the current case; traces are removed after invalidation. Do not multiply impossible combinations or substitute code-generated expectations that merely repeat the merge logic.

Add mutation/fault tests that remove the trace, corrupt an origin/state, drop a contributor, preserve a stale case, erase a trust warning, and feed stale receipts after source changes. Each must produce a controlled rejection or a failing quality gate. Exercise race orderings for read start/finish, input edits, cancel/reset, midnight, policy expiry, history and a new run; verify only the newest valid case can render.

Do human task acceptance on the actual MSP/browser/screen-reader combination. Test whether the operator can identify original versus supplied versus effective values, why an override occurred, what a confirmation means, where evidence must be checked and what the result does not authorize. Real native mapping, source freshness/roles, active billing, signed clauses and authoritative deadlines remain separate evidence requirements.

## Reproduction and completion criteria

- node output/principle-8-audit/probe.mjs writes model-probes.json.
- python output/principle-8-audit/probe-evidence.py writes evidence-probe.json; all mutations happen in a disposable temporary copy.
- The browser probe-ui.js ran in a fresh p8audit session; ui-probe.txt records both real legacy labels and local-response-only missing-trace injection.
- Prior checkpoint: scope-fit/PRINCIPLE_8_QC_CLOSURE.md and output/principle-8-qc/final-browser/summary.json.
- External protocol: scope-fit/PRINCIPLE_7_EXTERNAL_ACCEPTANCE.md.

Closure requires fixing G1-G6 with independent negative regressions and new source-bound execution receipts; resolving or explicitly limiting U scenarios; and retaining P gates as pending until authoritative evidence exists. Broad claims of complete acceptance are not justified before that work. This audit does not implement those fixes.

