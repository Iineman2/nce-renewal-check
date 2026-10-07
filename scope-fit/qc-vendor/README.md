# Pinned accessibility test dependency

These files serve the exact unmodified axe-core 4.10.3 checker locally for browser QC. The application does not import the checker. The WCAG rules, scan contexts and deliberate blocked-dependency fixture remain unchanged.

The npm release tarball was fetched from its version-specific registry URL. Its SHA-512 integrity and SHA-1 were verified against the registry response before reading only package/axe.min.js, package/LICENSE and package/package.json. No package script ran. axe-provenance.json records the fixed tarball, asset and license hashes; the current QC owner independently pins and validates those bytes. The original MPL-2.0 copyright header and full license are preserved.

The checker, license and provenance are captured source and served-byte evidence. Browser scans therefore require no CDN access. A blocked or absent local checker still fails its gate visibly; it never grants a scan pass.
