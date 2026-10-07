async page => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const passed = [], frontier = [];
  await page.addInitScript(() => {
    const D = Date; window.Date = class extends D { constructor(...args) { super(...(args.length ? args : ['2026-12-30T12:00:00'])); } };
    const mode = new URL(location.href).searchParams.get('fault');
    const append = Element.prototype.append;
    Element.prototype.append = function (...children) {
      const result = append.apply(this, children);
      if (this.id === 'file-support-contract' && !window.__faultRan) {
        const title = document.getElementById('file-support-title');
        if (mode === 'accessible-name') { title.setAttribute('aria-label', 'Native PDF readers enabled'); window.__faultRan = true; }
        if (mode === 'wrong-tag') { const forged = document.createElement('div'); forged.id = title.id; forged.textContent = title.textContent; title.replaceWith(forged); window.__faultRan = true; }
        if (mode === 'wrong-parent') { document.getElementById('preflight').appendChild(this); window.__faultRan = true; }
        if (mode === 'disclosure-text') { this.parentElement.appendChild(document.createTextNode('PDF files authorize financial action')); window.__faultRan = true; }
        if (mode === 'read-label') { document.querySelector('#read-status [role=status]').setAttribute('aria-label', 'No deadline'); window.__faultRan = true; }
        if (mode === 'read-duplicate') { const status = document.getElementById('read-status'); status.appendChild(status.firstElementChild.cloneNode(true)); window.__faultRan = true; }
      }
      if (this.id === 'file-support-contract') for (const child of children) {
        const text = child.textContent ?? '';
        if (mode === 'unavailable' && text.startsWith('Unavailable:')) { child.textContent = 'Enabled: native exports XLSX PDF DOCX OCR'; window.__faultRan = true; }
        if (mode === 'versions' && text.startsWith('Current contract:')) { child.textContent = 'Current contract: forged native reader'; window.__faultRan = true; }
        if (mode === 'columns' && text.startsWith('Normalized Pax8 CSV required columns:')) { child.textContent = 'Required columns: native_subscription_key'; window.__faultRan = true; }
        if (mode === 'hidden' && text.startsWith('Unavailable:')) { child.hidden = true; window.__faultRan = true; }
        if (mode === 'authority' && text.startsWith('Readable normalized records')) { child.textContent = 'Financial action is authorized.'; window.__faultRan = true; }
        if (mode === 'throw' && text.startsWith('Normalized Pax8 CSV required columns:')) { window.__faultRan = true; throw Error('controlled append'); }
      }
      return result;
    };
    const content = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(Node.prototype, 'textContent', { configurable: true, get: content.get, set(value) {
      if (mode === 'summary' && this.id === 'file-support-summary') { window.__faultRan = true; return content.set.call(this, 'Current file support: signed PDFs and native spreadsheets.'); }
      return content.set.call(this, value);
    } });
    const text = File.prototype.text; window.__pending = [];
    window.__processingTextControl = function () {
      if (this.name === window.__holdName) return new Promise((resolve, reject) => window.__pending.push({ resolve: () => text.call(this).then(resolve), reject: () => reject(Error('old IO')) }));
      if (this.name === window.__faultName && window.__readFault === 'read-rejection') return Promise.reject(Error('controlled IO'));
      if (this.name === window.__faultName && window.__readFault === 'read-timeout') return new Promise(() => {});
      if (this.name === window.__faultName && window.__readFault === 'inconsistent-text-bytes') return text.call(this).then(value => value + 'changed');
      return text.call(this);
    };
    const timer = window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => timer(fn, window.__fast && ms === 30000 ? 500 : ms, ...args);
    const missing = new URL(location.href).searchParams.get('missing');
    if (missing === 'text' || missing === 'arrayBuffer') File.prototype[missing] = undefined;
    else if (missing) window[missing] = undefined;
    const broken = new URL(location.href).searchParams.get('broken');
    if (broken === 'encoder-throw') window.TextEncoder = class { constructor() { throw TypeError('host encoder'); } };
    if (broken === 'encoder-false') window.TextEncoder = class { encode() { return Uint8Array.of(0); } };
  });
  const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,customer_name,product_name\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew,Acme,Premium\n';
  const halo = 'line_id,subscription_id,customer_ref,billing_system,customer_name\nl,s,c,HaloPSA,Acme\n';
  const fit = async () => {
    await page.goto('http://localhost:8765/');
    for (const [name, value] of [['reseller', 'yes'], ['distributor', 'pax8'], ['billing', 'halopsa'], ['commitment', 'annual-m365-nce']]) {
      await page.locator(`input[name="${name}"][value="${value}"]`).check(); await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.locator('input[name=renewal][value=exact]').check(); await page.locator('#renewal-date').fill('2027-01-15'); await page.getByRole('button', { name: 'Check fit', exact: true }).click();
  };
  const supply = (role, value, name = role === 'pax-file' ? 'pax.csv' : 'halo.csv', mimeType = 'text/csv') => page.locator('#' + role).setInputFiles({ name, mimeType, buffer: typeof value === 'string' ? Buffer.from(value) : value });
  const controls = async () => { await page.locator('#subscription-id').fill('s'); await page.locator('input[name=renewalTerm][value=annual]').check(); await page.locator('input[name=agreement][value=yes]').check(); };
  const inputs = async () => { await supply('pax-file', pax); await supply('halo-file', halo); await controls(); };
  const run = op => page.locator(op === 'find-case' ? '#load-case-finder' : '#record-form button[type=submit]').click();
  const stopTrigger = async op => {
    // Capture the real control before invalidating the host. A scroll/focus
    // guard may hide it before Playwright can complete a visible mouse click.
    const node = await page.locator(op === 'find-case' ? '#load-case-finder' : '#record-form button[type=submit]').elementHandle();
    if (!node || !await node.isVisible() || !await node.evaluate(n=>n.isConnected&&!n.disabled&&!n.closest('[hidden]'))) throw Error('Technical-stop trigger was not initially live');
    return () => node.evaluate(n=>n.click());
  };
  const success = async op => {
    if (op === 'find-case') await page.locator('.case-finder-row button').waitFor();
    else await page.getByRole('heading', { name: 'Confirm these records describe the same case', exact: true }).waitFor();
  };
  const stopped = async () => {
    try { await page.locator('#runtime-warning').waitFor({ state: 'visible', timeout: 5000 }); }
    catch { throw Error('Expected runtime stop at ' + page.url() + '; completed: ' + passed.join(',') + '; state: ' + JSON.stringify(await page.evaluate(() => ({ file: typeof globalThis.File, decoder: typeof globalThis.TextDecoder, form: document.getElementById('fit-form').hidden, record: document.getElementById('record-result').textContent, warning: document.getElementById('runtime-warning').textContent })))); }
    for (const id of ['fit-form', 'preflight', 'result', 'record-result']) if (await page.locator('#' + id).isVisible()) throw Error('Stop left active ' + id);
    if (await page.locator('#record-result').textContent() || await page.locator('#finder-results').textContent() || await page.locator('#case-subject').textContent()) throw Error('Stop retained derived authority');
    if (!await page.evaluate(() => [...document.querySelectorAll('#result,#record-result,#case-subject,#finder-results')].every(node => node.hidden && !node.textContent))) throw Error('Stop left a derived region uncleared or individually active');
  };
  const release = () => page.evaluate(async () => { window.__holdName = ''; await Promise.all(window.__pending.splice(0).map(value => value.resolve())); });

  for (const mode of ['unavailable', 'versions', 'columns', 'hidden', 'authority', 'summary', 'throw', 'accessible-name', 'wrong-tag', 'wrong-parent', 'disclosure-text', 'read-label', 'read-duplicate']) {
    await page.goto('http://localhost:8765/?fault=' + mode); await stopped();
    if (!await page.evaluate(() => window.__faultRan === true)) throw Error('Unexecuted startup fault: ' + mode);
    passed.push('startup-' + mode);
  }
  for (const mode of ['summary', 'hidden', 'duplicate', 'replacement', 'root-duplicate', 'clipping', 'aria', 'transparent', 'limits', 'extra-reader', 'accessible-name', 'labelledby', 'paragraph-role', 'wrapper-role', 'disclosure-claim', 'disclosure-text', 'guidance-claim', 'preflight-label', 'read-label', 'read-duplicate', 'summary-after', 'paragraph-before', 'wrapper-after', 'read-after']) {
    await fit(); await inputs(); await run('compare-records'); await success('compare-records');
    await page.getByRole('button', { name: 'Confirm this source case', exact: true }).click();
    if (['clipping', 'transparent'].includes(mode)) await page.locator('#file-support-title').click();
    await page.evaluate(mode => {
      const root = document.getElementById('file-support-contract');
      if (mode === 'summary') document.getElementById('file-support-summary').textContent = 'Native readers enabled';
      if (mode === 'hidden') root.children[7].style.display = 'none';
      if (mode === 'duplicate') root.append(root.firstElementChild.cloneNode(true));
      if (mode === 'replacement') root.replaceWith(root.cloneNode(true));
      if (mode === 'root-duplicate') root.parentElement.append(root.cloneNode(true));
      if (mode === 'clipping') { root.style.height = '1px'; root.style.overflow = 'hidden'; }
      if (mode === 'aria') root.setAttribute('aria-hidden', 'true');
      if (mode === 'transparent') root.children[7].style.color = 'transparent';
      if (mode === 'limits') root.children[6].textContent = 'Unlimited rows and bytes';
      if (mode === 'extra-reader') { const p = document.createElement('p'); p.textContent = 'PDF enabled'; root.append(p); }
      if (mode === 'accessible-name') document.getElementById('file-support-title').setAttribute('aria-label', 'Native PDF readers authorize financial action');
      if (mode === 'labelledby') document.getElementById('file-support-title').setAttribute('aria-labelledby', 'finder-status');
      if (mode === 'paragraph-role') root.children[7].setAttribute('role', 'presentation');
      if (mode === 'wrapper-role') root.setAttribute('role', 'img');
      if (mode === 'disclosure-claim') { const p = document.createElement('p'); p.textContent = 'PDF enabled'; root.parentElement.append(p); }
      if (mode === 'disclosure-text') root.parentElement.appendChild(document.createTextNode('PDF enabled'));
      if (mode === 'guidance-claim') root.lastElementChild.textContent = 'Unknown means financial action approved';
      if (mode === 'preflight-label') document.getElementById('preflight').setAttribute('aria-label', 'Native readers enabled');
      if (mode === 'read-label') document.querySelector('#read-status [role=status]').setAttribute('aria-label', 'No deadline');
      if (mode === 'read-duplicate') { const status = document.getElementById('read-status'); status.appendChild(status.firstElementChild.cloneNode(true)); }
      if (['summary-after', 'paragraph-before', 'wrapper-after', 'read-after'].includes(mode)) {
        const style = document.createElement('style');
        const id = mode === 'summary-after' ? 'file-support-summary' : mode === 'wrapper-after' ? 'preflight' : mode === 'read-after' ? 'read-status-message' : 'file-support-contract p';
        style.textContent = '#' + id + (mode === 'paragraph-before' ? '::before' : '::after') + '{content:"XLSX PDF DOCX enabled and financial action approved";display:block}';
        document.head.append(style);
      }
    }, mode);
    await stopped(); passed.push('late-' + mode);
  }
  for (const api of ['File', 'text', 'arrayBuffer', 'TextDecoder', 'TextEncoder', 'FormData']) {
    await page.goto('http://localhost:8765/?missing=' + api); await stopped(); passed.push('startup-api-' + api);
    await fit(); await inputs(); await run('compare-records'); await success('compare-records');
    const trigger = await stopTrigger('compare-records');
    await page.evaluate(api => { if (api === 'text' || api === 'arrayBuffer') File.prototype[api] = undefined; else window[api] = undefined; }, api);
    await trigger(); await stopped(); passed.push('late-api-' + api);
  }
  for (const mode of ['encoder-throw', 'encoder-false']) {
    await page.goto('http://localhost:8765/?broken=' + mode); await stopped(); passed.push('startup-broken-' + mode);
    await fit(); await inputs(); await run('compare-records'); await success('compare-records');
    const trigger = await stopTrigger('compare-records');
    await page.evaluate(mode => { window.TextEncoder = mode === 'encoder-throw' ? class { constructor() { throw TypeError('host encoder'); } } : class { encode() { return Uint8Array.of(0); } }; }, mode);
    await trigger(); await stopped(); passed.push('late-broken-' + mode);
  }
  for (const mode of ['transparent', 'clipping']) {
    await fit(); await inputs();
    await page.evaluate(() => window.__holdName = 'pax.csv'); await run('compare-records');
    await page.waitForFunction(() => window.__pending.length === 1 && !document.getElementById('read-status').hidden);
    await page.evaluate(mode => { const text = document.getElementById('read-status-message'); if (mode === 'transparent') text.style.color = 'transparent'; else { text.style.height = '1px'; text.style.overflow = 'hidden'; } }, mode);
    await stopped(); await release(); await stopped(); passed.push('pending-read-' + mode);
  }
  if (!await page.evaluate(() => !document.getElementById('record-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))) throw Error('A halted guard permitted native submission');
  await stopped(); passed.push('halted-submit-canceled');
  await fit(); await inputs(); await run('compare-records'); await success('compare-records'); passed.push('genuine-reinitialization');
  const foreign = await page.evaluate(async text => {
    const iframe = document.createElement('iframe'); document.body.append(iframe);
    const file = new iframe.contentWindow.File([text], 'foreign.csv');
    const bytes = await file.arrayBuffer(); const { readLocalFile } = await import('./runtime.mjs'); const { SOURCES } = await import('./actions.mjs');
    const decoded = await readLocalFile(file, 'pax-file', SOURCES.pax); iframe.remove();
    return { foreign: !(bytes instanceof ArrayBuffer), equal: decoded === text };
  }, pax);
  if (!foreign.foreign || !foreign.equal) throw Error('Genuine foreign File failed'); passed.push('genuine-realm-file');
  await fit(); await supply('pax-file', pax.replace('Acme', 'Acme\uFFFD').replace('Premium', 'Premium\uFFFD')); await run('find-case'); await success('find-case');
  for (const [id, value] of [['case-query', 'Acme\uFFFD'], ['case-customer', 'Acme\uFFFD'], ['case-product', 'Premium\uFFFD']]) {
    await page.locator('#' + id).fill(value); if (await page.locator('.case-finder-row').count() !== 1) throw Error('Readable description was not searchable'); await page.locator('#' + id).fill('');
  }
  passed.push('literal-customer-product-replacement');
  await fit(); await inputs(); await supply('pax-file', pax, '<img src=x>-\u202everified-native.pdf.csv', 'application/pdf'); await controls(); await run('compare-records'); await success('compare-records');
  const subject = await page.locator('#case-subject').innerText();
  if (!subject.includes('[U+202E]') || !subject.includes('Case selection: candidate') || await page.locator('#case-subject img,#case-subject script').count()) throw Error('Metadata changed authority or markup');
  passed.push('inert-hostile-filename');
  await fit(); const title = page.locator('#file-support-title'); await title.focus(); await page.keyboard.press('Enter');
  if (!await page.locator('#file-support-details').evaluate(el => el.open)) throw Error('Keyboard disclosure failed');
  await page.keyboard.press('Space'); if (await page.locator('#file-support-details').evaluate(el => el.open)) throw Error('Keyboard disclosure failed to close'); passed.push('keyboard-details');
  await page.setViewportSize({ width: 320, height: 900 }); await title.click(); await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  if (!await page.evaluate(() => document.documentElement.scrollWidth === 320)) throw Error('Expanded support overflows');
  await page.addScriptTag({ url: 'http://localhost:8765/qc-vendor/axe-4.10.3.min.js' });
  const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => v.id));
  if (violations.length) throw Error('Expanded support axe: ' + violations.join(',')); passed.push('expanded-mobile-font200-axe');
  await page.setViewportSize({ width: 1280, height: 900 });

  const pairs = [['pax-file', 'find-case'], ['pax-file', 'compare-records'], ['halo-file', 'compare-records']];
  const faults = ['missing-file', 'wrong-profile', 'malformed-utf8', 'valid-replacement-character', 'utf16-no-bom', 'unsupported-dialect', 'malformed-final-record', 'limit-exceeded', 'read-rejection', 'read-timeout', 'inconsistent-text-bytes', 'unavailable-api'];
  const contexts = ['fresh-check', 'after-prior-success', 'after-cancellation', 'after-source-replacement'];
  for (const [role, operation] of pairs) for (const condition of faults) for (const context of contexts) {
    await fit(); await inputs();
    if (context === 'after-prior-success') {
      await run(operation); await success(operation);
      if (operation === 'find-case') await page.locator('.case-finder-row button').first().click();
      await page.getByRole('button', { name: 'Confirm this source case', exact: true }).click();
    }
    if (context === 'after-cancellation' || context === 'after-source-replacement') {
      await page.evaluate(name => window.__holdName = name, role === 'pax-file' ? 'pax.csv' : 'halo.csv');
      await run(operation); await page.waitForFunction(() => window.__pending.length === 1);
      if (context === 'after-cancellation') await page.locator(operation === 'find-case' ? '#cancel-case-finder' : '#cancel-read').click();
      await page.evaluate(() => window.__holdName = '');
    }
    // Actual new File objects and change events replace the prior selected source.
    const base = role === 'pax-file' ? pax : halo;
    let value = base;
    if (condition === 'wrong-profile') value = role === 'pax-file' ? halo : pax;
    if (condition === 'malformed-utf8') value = Buffer.from([255]);
    if (condition === 'valid-replacement-character') value = base.replace('Acme', 'Acme\uFFFD').replace('Premium', 'Premium\uFFFD');
    if (condition === 'utf16-no-bom') value = Buffer.from(base, 'utf16le');
    if (condition === 'unsupported-dialect') value = base.replaceAll(',', ';');
    if (condition === 'malformed-final-record') value = base + 'bad,final\n';
    if (condition === 'limit-exceeded') value = base + '\n'.repeat(2000001 - Buffer.byteLength(base));
    if (condition === 'missing-file') await page.locator('#' + role).setInputFiles([]); else await supply(role, value);
    await controls();
    const expected = condition === 'valid-replacement-character' ? 'readable' : condition === 'unavailable-api' ? 'technical-stop' : 'needs-input-repair';
    const trigger = expected === 'technical-stop' ? await stopTrigger(operation) : null;
    await page.evaluate(({ role, condition }) => { window.__faultName = role === 'pax-file' ? 'pax.csv' : 'halo.csv'; window.__readFault = condition; window.__fast = condition === 'read-timeout'; if (condition === 'unavailable-api') window.TextDecoder = undefined; }, { role, condition });
    if (trigger) await trigger(); else await run(operation);
    let actual;
    if (expected === 'readable') { await success(operation); actual = 'readable'; }
    else if (expected === 'technical-stop') { await stopped(); actual = 'technical-stop'; }
    else if (operation === 'find-case') {
      await page.waitForFunction(() => document.getElementById('finder-status').textContent.includes('Could not find cases'));
      if (await page.locator('.case-finder-row').count()) throw Error('Failure retained finder rows'); actual = 'needs-input-repair';
    } else {
      await page.getByRole('heading', { name: 'Repair the supplied input', exact: true }).waitFor();
      if (role === 'halo-file' && !(await page.locator('#case-subject').textContent()).includes('Pax8 subscription: s')) throw Error('Halo failure erased valid Pax evidence');
      actual = 'needs-input-repair';
    }
    if (await page.locator('#case-subject').textContent().then(t => t.includes('Case selection: confirmed'))) throw Error('New operation inherited confirmation');
    await release();
    if (expected === 'technical-stop') await stopped();
    else if (expected === 'readable') await success(operation);
    else if (operation !== 'find-case' && !await page.getByRole('heading', { name: 'Repair the supplied input', exact: true }).isVisible()) throw Error('Late canceled/replaced read overrode repair');
    frontier.push({ role, operation, condition, context, expected, actual, status: 'PASS' });
  }
  if (frontier.length !== 144) throw Error('Incomplete frontier'); passed.push('frontier-144');
  await fit(); await page.locator('#file-support-title').click();
  if (await page.locator('#runtime-warning').isVisible()) throw Error('Genuine final support view was halted');
  const png = await page.screenshot({ path: 'output/file-compatibility-principle-1-closure/support-closure.png', fullPage: true });
  if (await page.locator('#runtime-warning').isVisible()) throw Error('Genuine support screenshot left a halted view');
  const sha256 = await page.evaluate(async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))).map(v => v.toString(16).padStart(2, '0')).join(''), Array.from(png));
  if (errors.length) throw Error(errors.join('\n'));
  return 'PASS: F13P1C-BROWSER-ASSERTIONS:' + JSON.stringify(passed) + '\nF13P1C-FRONTIER:' + JSON.stringify(frontier) + '\nF13P1C-SCREENSHOT-PRODUCER:' + JSON.stringify({ sha256, policyVersion: 'file-support-v4', readerVersion: 'normalized-csv-v4' });
}
