async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-12-30T12:00:00'])); } };
    const original = File.prototype.text;
    window.__stall = false;
    window.__processingTextControl = function () { return window.__stall ? new Promise(resolve => { (window.__reads ??= []).push(() => original.call(this).then(resolve)); }) : original.call(this); };
  });
  await page.goto('http://localhost:8765/');
  for (const [field, value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) {
    await page.locator(`input[name="${field}"][value="${value}"]`).check(); await page.getByRole('button',{name:'Next',exact:true}).click();
  }
  await page.locator('input[name="renewal"][value="exact"]').check(); await page.locator('#renewal-date').fill('2027-01-15');
  await page.getByRole('button',{name:'Check fit',exact:true}).click();
  await page.getByRole('radio',{name:'Annual commitment',exact:true}).check(); await page.getByRole('radio',{name:'Yes',exact:true}).check();
  const header = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const row = (id,customer,date='2027-01-15') => `synthetic-account,${id},${customer},pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const supply = async (pax, halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n') => {
    for (const [id,text] of [['pax-file',pax],['halo-file',halo]]) await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  };
  const submit = () => page.getByRole('button',{name:'Check record facts',exact:true}).click();
  const card = page.locator('#case-subject');
  const check = async (pattern, message) => { try { await page.waitForFunction(source => new RegExp(source).test(document.querySelector('#case-subject').innerText.replace(/\n+/g, '\n')), pattern.source); } catch { throw new Error(message + ': ' + await card.innerText()); } };
  await supply(header+row('s','c')+row('s2','c2')); await page.locator('#subscription-id').fill('s'); await submit();
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
  await check(/Customer reference: c\nPax8 subscription: s\nRenewal occurrence: 2027-01-15/, 'Exact subject absent');
  if(await page.locator('#case-subject-title').count()!==1) throw new Error('More than one subject');
  await page.locator('#subscription-id').fill('s2'); await check(/No source-selected case/, 'Old subject survived edit');
  await submit(); await page.getByRole('heading',{name:'Confirm the record link',exact:true}).waitFor();
  await check(/Customer reference: c2\nPax8 subscription: s2/, 'Halo failure hid or mixed subject');
  await supply(header+row('s','<img src=x onerror=alert(1)>'),'bad'); await page.locator('#subscription-id').fill('s'); await submit();
  await page.getByRole('heading',{name:'Repair the supplied input',exact:true}).waitFor();
  await check(/<img src=x onerror=alert\(1\)>/, 'Literal customer hidden');
  if(await card.locator('img').count()) throw new Error('Source executed as markup');
  await supply(header+row('s','','unknown')); await submit();
  await check(/Customer reference: Unresolved.*\nPax8 subscription: s\nRenewal occurrence: Unresolved/, 'Unknown identity invented');
  await supply(header+row('s','c')+row('s','different')); await submit();
  await check(/Selection unresolved:.*found 2/, 'Duplicate produced subject');
  await supply(header+row('s','c')); await page.evaluate(()=>{window.__stall=true;}); await submit();
  await page.getByRole('button',{name:'Cancel this check',exact:true}).click();
  await page.evaluate(async()=>{window.__stall=false; await Promise.all(window.__reads.splice(0).map(read=>read()));});
  await check(/No source-selected case/, 'Cancelled late read resurrected subject');
  await submit(); await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
  await page.evaluate(()=>{document.querySelector('#subscription-id').value='s2';window.dispatchEvent(new Event('focus'));});
  await check(/No source-selected case/, 'Silent mutation survived focus');
  if(errors.length) throw new Error(errors.join('\n'));
  return 'PASS: one current case, distinct multi-row selection, unknown and duplicate states, billing failure independence, literal text, edit and late-cancel invalidation, silent mutation and no page errors';
}
