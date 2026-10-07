async page => {
  const origin = 'http://localhost:8765', assertions = [], measurements = [], downloads = [], errors = [];
  const scenarios = ['maxdense','longblank','latepartial','denseblank'];
  const expected = [1,2,3].flatMap(repetition => scenarios.map(scenario => 'F13P3C-RESP-' + scenario + '-' + repetition));
  const scope = 'finite local Chromium native processing responsiveness at declared ASCII normalized CSV input and structure frontiers; no universal device, platform preemption or peak resident-memory claim';
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript({ content: await (await page.request.get(origin + '/qc-worker-fixture.js')).text() });
  await page.addInitScript(() => {
    const NativeDate = Date; window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-12-30T12:00:00'])); } };
  });
  const need = (value, message) => { if (!value) throw Error(message); };
  for (const repetition of [1,2,3]) for (const scenario of scenarios) {
    const id = 'F13P3C-RESP-' + scenario + '-' + repetition, role = repetition === 2 ? 'halo-file' : 'pax-file';
    await page.goto(origin + '/'); await page.locator('#file-support-contract dd').last().waitFor({ state: 'attached' });
    const result = await page.evaluate(async ({ id, scenario, repetition, role }) => {
      const reader = await import('/bounded-reader.mjs'), evidence = await import('/file-evidence.mjs'), actions = await import('/actions.mjs');
      const operation = role === 'pax-file' ? 'find-case' : 'compare-records', profile = role === 'pax-file' ? 'normalized-pax8-v1' : 'normalized-halo-v1', source = role === 'pax-file' ? actions.SOURCES.pax : actions.SOURCES.halo;
      // These fixtures are literal, ASCII and independent of runtime limits or
      // production fixture builders. Every final input is exactly2,000,000bytes.
      const required = role === 'pax-file' ? ['source_account_id','subscription_id','customer_ref','distributor','product_family','commerce_model','seat_based','commitment_term','renewal_date','end_of_term_state'] : ['line_id','subscription_id','customer_ref','billing_system'];
      const values = role === 'pax-file' ? ['a','$id','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew'] : ['l','$id','c','HaloPSA'];
      const columns = [...required, ...Array.from({ length: 64 - required.length }, (_, i) => 'e' + i)];
      const base = required.join(',') + '\n' + values.map(value => value === '$id' ? 's' : value).join(',') + '\n';
      let text;
      if (scenario === 'maxdense') {
        const rows = Array.from({ length: 1023 }, (_, i) => [...values.map(value => value === '$id' ? 's' + i : value), ...Array(64 - values.length).fill('x'.repeat(29))]);
        const assemble = () => [columns.join(','), ...rows.map(row => row.join(','))].join('\n');
        let remaining = 2000000 - assemble().length;
        for (let r = rows.length - 1; r >= 0 && remaining; r--) for (let c = 63; c >= values.length && remaining; c--) {
          const amount = Math.min(1024 - rows[r][c].length, remaining); rows[r][c] += 'x'.repeat(amount); remaining -= amount;
        }
        if (remaining) throw Error('Dense source could not reach exact byte frontier'); text = assemble();
      } else if (scenario === 'denseblank') {
        // No data record is fabricated: header +1,022wide blanks +1thin blank.
        // Blank widths are preserved lexical work, then skipped by normalization.
        const rows = [...Array.from({ length: 1022 }, () => Array(64).fill('""')), ['""']];
        const assemble = () => [columns.join(','), ...rows.map(row => row.join(','))].join('\n');
        let remaining = 2000000 - assemble().length;
        for (let r = rows.length - 1; r >= 0 && remaining; r--) for (let c = rows[r].length - 1; c >= 0 && remaining; c--) {
          const amount = Math.min(4096 - rows[r][c].length, remaining); rows[r][c] += ' '.repeat(amount); remaining -= amount;
        }
        if (remaining) throw Error('Dense blank source could not reach exact byte frontier'); text = assemble();
      } else {
        let remaining = 2000000 - base.length; const record = '""' + ' '.repeat(4094) + '\n';
        text = base + record.repeat(Math.floor(remaining / 4097)); remaining %= 4097;
        text += '""' + ' '.repeat(remaining - 3) + '\n';
        if (scenario === 'latepartial') text = text.slice(0, -1) + 'x';
      }
      const input = new File([text], id + '.csv', { type: 'text/csv' });
      if (text.length !== 2000000 || input.size !== 2000000) throw Error('Responsiveness source disagrees with fixed input size');
      const started = performance.now(), samples = [0], timer = setInterval(() => samples.push(performance.now() - started), 10);
      let outcome;
      try {
        const pending = reader.readBoundedLocalEvidence(input, role, source, 30000, operation); window.__responsivenessAdmission = reader.processingState();
        outcome = await pending;
      } catch (error) { clearInterval(timer); throw error;
      } finally { window.__responsivenessSettled = performance.now() - started; }
      const elapsedMs = window.__responsivenessSettled;
      await new Promise(resolve => setTimeout(resolve, 20)); clearInterval(timer); const sampleEndMs = performance.now() - started;
      const projection = evidence.sourceProjection(outcome.handle, role), readState = reader.processingState();
      const scan = reader.cachedLexicalEvidence(outcome.text);
      if (!scan || scan.records.length !== projection.recordCount || scan.sourceRecordCount !== projection.sourceRecordCount ||
          scan.emptyRuns.reduce((sum, run) => sum + run.count, 0) !== projection.emptyRecordCount || scan.complete !== projection.lexicalComplete ||
          JSON.stringify(scan.failure) !== JSON.stringify(projection.failure) || scan.records[0].cells.length !== projection.headers.length) throw Error('Canonical scan and bounded preview disagree');
      const cells = scan.records.reduce((sum, record) => sum + record.cells.length, 0) + scan.emptyRuns.reduce((sum, run) => sum + run.totalCells, 0);
      // The full immutable original is retained after measuring the complete
      // acquisition/publication path. Byte comparison/download is outside its timer.
      const original = evidence.originalBytes(outcome.handle, role);
      window.__responsiveness = { handle: outcome.handle, input, text, original, role, sha256: projection.sha256 };
      const outcomeKind = outcome.problem === null ? 'compatible' : outcome.problem instanceof actions.InputProblem ? 'source-problem' : 'foreign-problem';
      return {
        id, scenario, repetition, role, operation, profile, inputBytes: input.size, inputCodeUnits: text.length,
        columns: projection.headers.length, totalCells: cells, retainedRecords: projection.recordCount, sourceRecords: projection.sourceRecordCount,
        emptyRecords: projection.emptyRecordCount, emptyRunCount: projection.emptyRuns.length, lexicalComplete: projection.lexicalComplete, failure: projection.failure,
        outcomeKind, problem: outcome.problem ? { name: outcome.problem.name, target: outcome.problem.target, source: outcome.problem.source, message: outcome.problem.message } : null,
        elapsedMs, maxGap: Math.max(...samples.slice(1).map((time, i) => time - samples[i])), ticks: samples.length, samples, sampleEndMs,
        native: __qcNativeWorkers.length === 1 && Object.prototype.toString.call(__qcNativeWorkers[0]) === '[object Worker]', workers: __qcWorkers.map(worker => ({...worker})),
        admissionState: window.__responsivenessAdmission, readState,
        projection: { authenticated: projection.authenticated, actionAuthorized: projection.actionAuthorized, financialVerdict: projection.financialVerdict },
        recovery: { sameFile: evidence.sourceMatches(outcome.handle, role, input), byteLength: original.length, sha256: projection.sha256 },
      };
    }, { id, scenario, repetition, role });
    const sourceProblem = ['latepartial','denseblank'].includes(scenario), complete = scenario !== 'latepartial';
    const counts = scenario === 'maxdense' ? [64,65536,1024,1024,0,0] : scenario === 'denseblank' ? [64,65473,1,1024,1023,1] : scenario === 'longblank' ? [role === 'pax-file' ? 10 : 4,role === 'pax-file' ? 509 : 497,2,491,489,1] : [role === 'pax-file' ? 10 : 4,role === 'pax-file' ? 508 : 496,2,490,488,1];
    need(result.native && result.workers.length === 1 && result.workers[0].stops === 1 && result.workers[0].ticks === 0 && result.workers[0].gated === false && result.workers[0].released === false, 'Native processing/retirement not observed ' + id);
    need(Number.isFinite(result.elapsedMs) && result.elapsedMs > 0 && result.elapsedMs < 30000 && Number.isFinite(result.maxGap) && result.maxGap <= 100 && result.maxGap >= 0 && result.ticks > 1 && result.ticks === result.samples.length && result.samples.every((value, i) => Number.isFinite(value) && value >= 0 && (i === 0 ? value === 0 : value >= result.samples[i - 1])) && result.samples.at(-1) >= result.elapsedMs && Number.isFinite(result.sampleEndMs) && result.sampleEndMs >= result.samples.at(-1) && result.sampleEndMs - result.samples.at(-1) <= 100 && result.sampleEndMs <= 30250 && result.maxGap === Math.max(...result.samples.slice(1).map((value, i) => value - result.samples[i])), 'Native responsiveness/deadline gate failed ' + JSON.stringify(result));
    need(result.inputBytes === 2000000 && result.inputCodeUnits === 2000000 && JSON.stringify([result.columns,result.totalCells,result.retainedRecords,result.sourceRecords,result.emptyRecords,result.emptyRunCount]) === JSON.stringify(counts) && result.lexicalComplete === complete && result.outcomeKind === (sourceProblem ? 'source-problem' : 'compatible'), 'Canonical frontier outcome differs ' + JSON.stringify(result));
    need(result.admissionState.activeJobs === 1 && result.admissionState.reservedBytes === 2000000 && result.admissionState.cachedSources === 0 && !result.admissionState.halted && result.readState.activeJobs === 0 && result.readState.reservedBytes === 0 && result.readState.cachedSources === 1 && !result.readState.halted, 'Native processing accounting differs ' + id);
    need(!result.projection.authenticated && !result.projection.actionAuthorized && result.projection.financialVerdict === null && result.recovery.sameFile && result.recovery.byteLength === 2000000, 'Recovery granted authority or lost current source ' + id);
    if (scenario === 'latepartial') need(result.failure?.message === 'Unexpected text after a quoted CSV value' && result.failure.startOffset === 1999999 && result.failure.endOffset === 1999999 && result.failure.startByte === 1999999 && result.failure.endByte === 1999999 && result.failure.sourceRecordOrdinal === 491, 'Partial frontier lost exact trace ' + id);
    else need(result.failure === null, 'Complete lexical source fabricated a failure ' + id);
    if (sourceProblem) need(result.problem?.name === 'InputProblem' && result.problem.target === role && result.problem.message.startsWith(scenario === 'latepartial' ? 'Unexpected text after a quoted CSV value' : 'CSV needs a header and at least one data row'), 'Source repair was misclassified ' + id);
    else need(result.problem === null, 'Compatible source fabricated a repair ' + id);
    const pendingDownload = page.waitForEvent('download');
    await page.evaluate(id => {
      window.__responsivenessURLs = { created: [], revoked: [] };
      const url = URL.createObjectURL(new Blob([__responsiveness.original], { type: 'application/octet-stream' })), link = document.createElement('a');
      __responsivenessURLs.created.push(url); link.href = url; link.download = id + '.csv'; document.body.append(link);
      try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); __responsivenessURLs.revoked.push(url); }
    }, id);
    const download = await pendingDownload, stream = await download.createReadStream(), chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const bytes = Buffer.concat(chunks), expectedBytes = Buffer.from(await page.evaluate(() => __responsiveness.text)), file = 'output/file-compatibility-principle-3-closure/native-responsiveness/' + scenario + '-' + repetition + '.bin';
    need(!await download.failure() && bytes.length === 2000000 && bytes.equals(expectedBytes), 'Original native recovery differs from supplied bytes ' + id);
    await download.saveAs(file); result.recovery.exactBytes = true;
    downloads.push({ id, role, byteLength: bytes.length, sha256: result.recovery.sha256, file, suggestedFilename: download.suggestedFilename() });
    const final = await page.evaluate(async () => {
      const evidence = await import('/file-evidence.mjs'), reader = await import('/bounded-reader.mjs'); evidence.releaseFileEvidence(__responsiveness.handle);
      return { state: reader.processingState(), urls: { created: __responsivenessURLs.created.length, revoked: __responsivenessURLs.revoked.length, allRevoked: __responsivenessURLs.created.every(url => __responsivenessURLs.revoked.includes(url)) },
        noAppAuthority: document.getElementById('record-result').hidden && document.getElementById('record-info').textContent === '' && document.querySelectorAll('.save-original').length === 0,
        warning: !document.getElementById('runtime-warning').hidden };
    });
    need(final.state.activeJobs === 0 && final.state.reservedBytes === 0 && final.state.cachedSources === 0 && !final.state.halted && final.urls.created === 1 && final.urls.revoked === 1 && final.urls.allRevoked && final.noAppAuthority && !final.warning, 'Native responsiveness source/URL/authority cleanup failed ' + id);
    Object.assign(result, final); assertions.push(id); measurements.push(result);
  }
  need(JSON.stringify(assertions) === JSON.stringify(expected) && measurements.length === 12 && downloads.length === 12 && errors.length === 0, 'Responsiveness fixed inventory or uncaught-error gate failed');
  return 'PASS: F13P3-RESOURCE-RESPONSIVENESS:' + JSON.stringify({ assertions, measurements, downloads, errors, scope });
}
