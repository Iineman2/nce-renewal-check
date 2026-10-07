# Principle 4 final verification

Complete on 7 October 2026. The defined supported normalized-CSV contract passes; no reproduced applicable failure or material review finding remains open.

The trusted isolated bootstrap returned PASS_WITHIN_SUPPORTED_LOCAL_CONTRACT, verified 2,484 sealed leaves, all current source/fixture/process/response/receipt bindings, the original 223-condition disposition ledger, exact original bytes, all five aligned reviews and all 7,708 preserved historical leaves. It replayed the 57 proof-consumer negative controls. Three additional actual CLI checks reject a wrong PIN, a missing PIN and missing verifier hashes before pack evaluation.

The first isolated attempt exposed a host-runtime dependency issue: C:/Python312 keeps PIL in its excluded user package directory. That failed receipt is retained as bootstrap-verification-1.txt. The existing bundled Python 3.12.14 includes PIL in its standard package directory and completed bootstrap-verification-2.json. Isolation remains -I -B for both entry point and verifier. No sealed proof/source was modified or dependency installed to make the verification pass.

## Reverify

Run this PowerShell command from any directory. The expected PIN digest below is mandatory and must remain independent of the mutable PIN file. The external entry point and native/runtime dependencies are trusted host inputs.

```powershell
& "C:\Users\aryas\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -I -B "C:\Users\aryas\OneDrive\Documents\ChatGPT\goal\docs\goals\file-compatibility-principle-4-closure\bootstrap.py" cf19d3e11274b61f8e7bbebb0a61ee475712991173e6181610068c38634789b7
```

## Trust anchors

- PIN SHA-256: `cf19d3e11274b61f8e7bbebb0a61ee475712991173e6181610068c38634789b7`
- Bootstrap SHA-256: `e6871b7bd824199ccdbaf275e67ab0102a541a65e5c9c51ad6bb3d4b6d9e4cc0`
- Index SHA-256: `3b8313d5b57b0a28c2493c217e74919121c9582b95d597b9c0a1cf60ade31e95`
- Verifier SHA-256: `d970fcb585798beb5887e23f10f895f3e20a507b20a14aa38a7e64f9a547bbe9`

## Evidence

- Current sealed report: output/file-compatibility-principle-4-closure/REPORT.md.
- Complete 223-condition ledger: output/file-compatibility-principle-4-closure/closure-ledger.json.
- Exact executed qualification: output/file-compatibility-principle-4-closure/qualification.json.
- Five bound independent review verdicts: output/file-compatibility-principle-4-closure/reviews.json.
- Canonical positive isolated verification: bootstrap-verification-2.json and bootstrap-verification-2.txt.
- Actual entry point negatives: entry-negative-controls.json.
- Machine-readable final status and identities: FINAL_VERIFICATION.json.

The final snapshot is candidate-10. Only two QC files changed from candidate-9; all 176 other files are identical. Full models, source syntax and the affected native security suite reran on candidate-10. The 13 unchanged native/pristine/regression receipts retain their actual candidate-9 identities and require the exact two-file bridge; four corrupted bridge controls fail. No changed application implementation is accepted through that bridge.

This pass applies to the fixed normalized UTF-8 CSV readers and captured local environment. The ledger separately records finite mechanism execution, source-only boundaries, disabled future readers/consumers, native/OS/downstream host trust, environment limits and adjacent authenticity/authority/resource obligations. It does not certify an infinite payload/environment product, vendor authenticity, financial permission, disabled rich formats or third-party opening.

The owned qualification server on 8782 is stopped. The user prototype on 8765 (PID 51092) remains untouched. Historical owners and the sealed pack remain unchanged.
