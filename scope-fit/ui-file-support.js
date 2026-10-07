async page => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { const D = Date; window.Date = class extends D { constructor(...args) { super(...(args.length ? args : ['2026-12-30T12:00:00'])); } }; });
  const passed = []; let producer;
  const fit = async () => {
    await page.goto('http://localhost:8765/');
    for (const [name, value] of [['reseller', 'yes'], ['distributor', 'pax8'], ['billing', 'halopsa'], ['commitment', 'annual-m365-nce']]) {
      await page.locator(`input[name="${name}"][value="${value}"]`).check(); await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.locator('input[name=renewal][value=exact]').check(); await page.locator('#renewal-date').fill('2027-01-15'); await page.getByRole('button', { name: 'Check fit', exact: true }).click();
  };
  const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,customer_name\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew,Café\n';
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const supply = async (id, text, name = 'original.csv', mimeType = 'text/csv') => page.locator('#' + id).setInputFiles({ name, mimeType, buffer: typeof text === 'string' ? Buffer.from(text) : text });
  const inputs = async (p = pax, h = halo) => {
    await supply('pax-file', p); await supply('halo-file', h); await page.locator('#subscription-id').fill('s');
    await page.locator('input[name=renewalTerm][value=annual]').check(); await page.locator('input[name=agreement][value=yes]').check();
  };
  const compare = async () => { await page.getByRole('button', { name: 'Check record facts', exact: true }).click(); await page.waitForFunction(() => document.getElementById('read-status').hidden && !document.getElementById('record-form').querySelector('button[type=submit]').disabled); };
  const repair = async target => {
    await compare(); await page.getByRole('heading', { name: 'Repair the supplied input', exact: true }).waitFor();
    const text = await page.locator('#record-result').innerText();
    if (text.includes('look in scope') || text.includes('outside this release')) throw Error('Compatibility gained eligibility authority');
    await page.getByRole('button', { name: 'Correct the supplied input', exact: true }).click();
    if (await page.evaluate(() => document.activeElement.id) !== target) throw Error('Wrong file repair focus');
  };
  await fit(); await page.getByText('Current file support and required CSV columns', { exact: true }).click();
  const contract = await page.locator('#file-support-contract').innerText();
  for (const text of ['Normalized Pax8 CSV', 'Normalized HaloPSA CSV', 'UTF-8', '2,000,000', '5,000', '64', '1,024', 'UTF-16', 'file-support-v4', 'normalized-csv-v4', 'normalized-pax8-v1', 'normalized-halo-v1', 'Native Pax8/HaloPSA export profiles', 'Generic CSV field mapping', 'XLSX workbooks', 'PDF agreements', 'DOCX agreements', 'OCR', 'Keep the original file', 'No financial action']) if (!contract.includes(text)) throw Error('Missing support declaration: ' + text);
  const declared = await page.evaluate(async () => {
    const { FILE_SUPPORT } = await import('./file-support.mjs');
    return FILE_SUPPORT.profiles.every(profile => document.getElementById('file-support-contract').textContent.includes(profile.requiredColumns.join(', ')) && document.getElementById(profile.target).accept === FILE_SUPPORT.pickerAccept);
  });
  if (!declared || await page.locator('input[type=file]').count() !== 2) throw Error('UI contract does not match capability owner');
  passed.push('visible-contract');

  for (const [name, type, id] of [['native-export.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'metadata-xlsx'], ['agreement.pdf', 'application/pdf', 'metadata-pdf'], ['records', '', 'metadata-empty']]) {
    await fit(); await inputs(); await supply('pax-file', pax, name, type); await supply('halo-file', halo, name, type); await compare();
    await page.getByRole('heading', { name: 'Confirm these records describe the same case', exact: true }).waitFor();
    if (!(await page.locator('#case-subject').innerText()).includes('candidate')) throw Error('Metadata auto-confirmed the case'); passed.push(id);
  }
  for (const [id, text] of [['native-profile', 'SubscriptionId,CustomerName\ns,Acme'], ['pdf-renamed', '%PDF-1.7\n1 0 obj'], ['zip-renamed', 'PK\u0003\u0004[Content_Types].xml'], ['xml-renamed', '<w:document>agreement</w:document>'], ['json-renamed', '{"subscription_id":"s"}'], ['semicolon', pax.replaceAll(',', ';')], ['tab', pax.replaceAll(',', '\t')], ['last-row', pax + 'bad,final\n'], ['duplicate-header', pax.replace('customer_name', 'customer_ref')], ['blank-header', pax.replace('customer_name', '')]]) {
    await fit(); await inputs(text); await repair('pax-file');
    if (!(await page.locator('#record-result').innerText()).includes('Keep the original file')) throw Error('Unsupported content lacks supported alternative'); passed.push(id);
  }
  for (const [id, text] of [['invalid-utf8', Buffer.from([0xff])], ['utf16', Buffer.from([0xff, 0xfe, 0x41, 0])]]) {
    await fit(); await inputs(text); await repair('pax-file'); if (!(await page.locator('#record-result').innerText()).includes('UTF-8')) throw Error('Encoding repair imprecise'); passed.push(id);
  }
  await fit(); await inputs('\uFEFF' + pax.replace('Café', 'Café\uFFFD😀')); await compare(); await page.getByRole('heading', { name: 'Confirm these records describe the same case', exact: true }).waitFor(); passed.push('valid-bom-replacement');
  await fit(); await inputs(pax, pax); await repair('halo-file');
  if (!(await page.locator('#case-subject').innerText()).includes('Pax8 subscription: s')) throw Error('Wrong Halo profile erased independent Pax8 evidence'); passed.push('wrong-halo-retains-pax');
  await supply('halo-file', halo); await compare(); await page.getByRole('heading', { name: 'Confirm these records describe the same case', exact: true }).waitFor(); passed.push('corrected-profile-recovery');
  await fit(); await supply('pax-file', pax); await page.locator('#load-case-finder').click(); await page.locator('#finder-controls:not([hidden])').waitFor();
  if (await page.locator('.case-finder-row').count() !== 1) throw Error('Qualified finder unavailable'); passed.push('finder-qualified');
  await supply('pax-file', halo); await page.locator('#load-case-finder').click(); await page.waitForFunction(() => document.getElementById('finder-status').textContent.includes('Could not find cases'));
  if (await page.locator('.case-finder-row').count()) throw Error('Wrong finder profile kept rows'); passed.push('finder-wrong-profile');
  const unavailable = await page.evaluate(async () => {
    const { readLocalFile } = await import('./runtime.mjs'); let reads = 0;
    try { await readLocalFile({ get size() { reads++; return 1; } }, 'halo-file', 'HaloPSA', 30000, 'find-case'); return false; }
    catch { return reads === 0; }
  });
  if (!unavailable) throw Error('Undeclared operation read a file'); passed.push('wrong-operation');
  for (const api of ['arrayBuffer', 'TextDecoder']) {
    await page.route('**/app.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (api === 'arrayBuffer' ? 'File.prototype.arrayBuffer=undefined;\n' : 'globalThis.TextDecoder=undefined;\n') + await response.text() }); });
    await page.goto('http://localhost:8765/'); if (!await page.locator('#runtime-warning').isVisible() || await page.locator('#fit-form').isVisible()) throw Error('Missing API advertised capability');
    await page.unroute('**/app.mjs');
    // Restore the genuine response explicitly; a routed response can remain cached.
    await page.route('**/app.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response, body: await response.text() }); });
    passed.push('missing-api-' + api);
  }
  await fit(); await page.getByText('Current file support and required CSV columns', { exact: true }).click();
  const png = await page.screenshot({ path: 'output/file-compatibility-principle-1-closure/support.png', fullPage: true });
  const sha256 = await page.evaluate(async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))).map(value => value.toString(16).padStart(2, '0')).join(''), Array.from(png));
  producer = { sha256, policyVersion: 'file-support-v4', readerVersion: 'normalized-csv-v4' }; passed.push('visible-recovery');
  if (errors.length) throw Error(errors.join('\n'));
  return 'PASS: F13P1-SUPPORT-ASSERTIONS:' + JSON.stringify(passed) + '\nF13P1-SCREENSHOT-PRODUCER:' + JSON.stringify(producer);
}
