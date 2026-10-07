# Principle 8 strict local QC closure

Policy: `nce-scope-v11`. This closes the local implementation gaps in the historical 128-case failure audit. Qualification is conditional on the read-only verifier passing for this exact checkout. External and unsupported delivery/sharing conditions are not passed gates.

## Corrected behavior

- Own descriptor values are captured once; rules and traces use detached immutable plain data. Accessors, cycles, exotic instances, unsupported scalar values, sparse/out-of-range arrays and excessive shape are rejected predictably. Reflection traps cannot change an already captured tree; universal Proxy detection is not claimed.
- Raw means the decoded CSV cell before trimming. Normalized values classify; original decoded cells identify selected evidence and display provenance. Different CSV quoting that decodes to the same cell is deliberately equivalent. Selected required/economic columns enter the basis; unrelated columns are excluded. Headers are limited to 64 columns/64 characters, cells/rows/file size retain their existing bounds.
- Schema v2 binds the owning questionnaire result status. Mandatory type/stage/status/version/field/origin/state/input validation runs before result mutation. Rendering uses the returned canonical trace. Missing/corrupt traces stop visibly. Genuine input/technical stops need no source projection.
- Agreement and next-term origins are stage-specific self-reports. The obsolete prose provenance path is removed. End-state contributors retain the same raw cell as the field trace. Format controls display as explicit Unicode codes; raw HTML remains text.
- Reads capture answers, ID, term, date and selected File identities before awaiting. A changed live control basis stops the result even without an event. Serial/nonce checks prevent detached controls and late reads from reusing a case. Print reveals disclosure rows in tested Chrome.
- QC captures all local runtime, shared modules, tests, fixtures, specifications and verifier dependencies before execution. Exact commands, run IDs, tool versions, receipt hashes and served dependency hashes are recorded. Verification is read-only and refuses drift, omitted receipts or incomplete script sets. The old checker delegates to this current verifier; historical receipts cannot qualify new source.

## Required evidence

Run from the repository root with the `scope-fit` local server at port 8765:

```powershell
python output/principle-8-closure/qc.py capture
python output/principle-8-closure/qc.py unit
python output/principle-8-closure/qc.py syntax
python output/principle-8-closure/qc.py browser
python output/principle-8-closure/qc.py verify
python output/principle-8-closure/negative-qc.py
```

A repeat capture requires `--new`, preserving the preceding run. The expected complete suite is 108 model tests, 21 isolated browser scripts and 34 JavaScript syntax files. Counts are derived from actual receipts rather than accepted through fixed substring counts. Seven new model tests include 9,720 combined review/economic/end-state/agreement/term scenarios. New browser scripts fault missing/corrupt traces, verify canonical rendering, silent changes, detached controls, mixed date/history/read ordering, raw display and print. Existing accessibility, mobile, lifecycle and earlier-principle scripts remain regression gates.

`../output/principle-8-closure/closure-ledger.json` assigns every original audit case a closure disposition and evidence. The original audit and failed probes remain historical evidence; they are not regenerated as passes. Independent POST review findings were corrected and require final review signoff in the run's review receipt.

## Acceptance limits

No native real exports, accounts, agreements or real operators were supplied. The 20 external audit cases remain pending. Seven additional rows have explicit bounded contracts: absent downstream exports/telemetry, arbitrary cropped sharing/styles/extensions, future migrations and hosted cache/release coherence. Their absence or boundary is not proof those environments pass. Local decoded-cell evidence is neither source-byte archival nor vendor attestation. Device time is not an authoritative cutoff. Print was tested in Chrome; human screen-reader and comprehension acceptance remain pending.

Source hashes and locally recorded command metadata detect accidental drift; they are not signed evidence against a malicious host or receipt editor. Served bytes are checked before/after the fresh browser run; fault scripts deliberately modify projections within their isolated sessions. No deployment, provider access, persistence, upload or financial authority was added.
