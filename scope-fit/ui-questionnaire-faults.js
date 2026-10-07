async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  await page.addInitScript(() => {
    const NativeDate = Date; window.__today = '2026-12-30';
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [window.__today + 'T12:00:00'])); } static now() { return new NativeDate(window.__today + 'T12:00:00').valueOf(); } };
    const original = File.prototype.text; window.__stall = false;
    window.__processingTextControl = function () { return window.__stall ? new Promise(resolve => { window.__finishRead = () => original.call(this).then(resolve); }) : original.call(this); };
  });
  const fit = async () => {
    await page.goto('http://localhost:8765/');
    for (const name of ['We manage and resell it for a customer', 'Pax8', 'HaloPSA', 'Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']) { await page.getByRole('radio', { name, exact: true }).check(); await page.getByRole('button', { name: 'Next', exact: true }).click(); }
    await page.getByRole('radio', { name: 'I know the date', exact: true }).check(); await page.locator('#renewal-date').fill('2027-01-15'); await page.getByRole('button', { name: 'Check fit', exact: true }).click();
    await page.getByRole('radio', { name: 'Annual commitment', exact: true }).check(); await page.getByRole('radio', { name: 'Yes', exact: true }).check();
    const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
    const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
    for (const [id, text] of [['pax-file', pax], ['halo-file', halo]]) await page.locator(`#${id}`).setInputFiles({ name: id + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
    await page.locator('#subscription-id').fill('s');
    return { pax, halo };
  };
  const submit = () => page.getByRole('button', { name: 'Check record facts', exact: true }).click();
  const checked = async () => { await submit(); await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems' }).click(); };
  const gone = async label => { if (await page.locator('#record-result .claim-trail').count() || await page.locator('#record-result').isVisible()) throw new Error(`${label} retained old source trail`); };
  const fitGone = async label => { if (await page.locator('#result .claim-trail').count()) throw new Error(`${label} retained old questionnaire trace DOM`); };
  const faults = {
    'old-schema': 'value.schemaVersion = "scope-claim-review-v2";',
    'empty-inputs': 'value.scopeInputs = {};',
    'missing-value': 'delete value.fields[0].effective.value;',
    'invalid-date': 'value.originalInputs.renewalDate = "not-a-date"; value.scopeInputs.renewalDate = "not-a-date"; value.fields[5].original.value = "not-a-date"; value.fields[5].effective.value = "not-a-date";',
    'bad-column': 'value.fields[1].supplied = { authenticated: false, system: "Pax8", rowId: "s", columns: [{}], raw: ["pax8"], value: "pax8" };',
  };
  for (const [name, mutation] of Object.entries(faults)) {
    await page.route('**/fit.mjs', async route => {
      const response = await route.fetch(); let source = await response.text();
      source = source.replace('import { questionnaireClaimReview }', 'import { questionnaireClaimReview as realQuestionnaireClaimReview }');
      source += `\nfunction questionnaireClaimReview(...args) { const value = structuredClone(realQuestionnaireClaimReview(...args)); ${mutation} return value; }`;
      await route.fulfill({ response, body: source });
    });
    await page.goto('http://localhost:8765/');
    for (const [field,value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) { await page.locator(`input[name="${field}"][value="${value}"]`).check(); await page.getByRole('button',{name:'Next',exact:true}).click(); }
    await page.locator('input[name="renewal"][value="exact"]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();
    await page.getByText(/could not produce a consistent claim trail/).waitFor();
    if (await page.locator('#result').isVisible() || await page.locator('.claim-trail').count()) throw new Error('Corrupt positive retained: '+name);
    await page.unroute('**/fit.mjs');
  }
  await page.route('**/fit.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response }); });
  for (const mode of ['next','refresh','timer']) {
    await page.goto('http://localhost:8765/');
    if (mode === 'next') {
      await page.locator('input[name="reseller"][value="yes"]').check();
      await page.evaluate(()=>document.querySelector('input[name="reseller"]:checked').value='unsupported');
      await page.getByRole('button',{name:'Next',exact:true}).click();
    } else {
      await fit();
      await page.evaluate(mode=>{ if(mode==='refresh') document.querySelector('input[name="reseller"]:checked').value='unsupported'; else window.__today='not-a-date'; },mode);
      if(mode==='refresh') await page.locator('input[name="agreement"][value="no"]').click();
      else await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    }
    await page.getByText(/No current result is available/).waitFor();
    if(await page.locator('#result').isVisible() || await page.locator('#record-result').isVisible()) throw new Error('Handler exception retained result: '+mode);
  }
  return 'PASS: empty inputs, missing value, invalid active date, malformed source metadata fail closed; Next, agreement refresh and policy focus errors stop visibly';
}
