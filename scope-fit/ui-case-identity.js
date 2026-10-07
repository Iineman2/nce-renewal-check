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
  const fit=async()=>{
  await page.goto('http://localhost:8765/');
  for (const [field, value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) {
    await page.locator(`input[name="${field}"][value="${value}"]`).check(); await page.getByRole('button',{name:'Next',exact:true}).click();
  }
  await page.locator('input[name="renewal"][value="exact"]').check(); await page.locator('#renewal-date').fill('2027-01-15');
  await page.getByRole('button',{name:'Check fit',exact:true}).click();
  await page.getByRole('radio',{name:'Annual commitment',exact:true}).check(); await page.getByRole('radio',{name:'Yes',exact:true}).check();
  };
  const header = 'subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const row = (id,customer,date='2027-01-15') => `${id},${customer},pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const supply = async (pax, halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n') => {
    for (const [id,text] of [['pax-file',pax],['halo-file',halo]]) await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  };
  const submit = () => page.getByRole('button',{name:'Check record facts',exact:true}).click();
  const card = page.locator('#case-subject');
  const check = async (pattern, message) => { try { await page.waitForFunction(source => new RegExp(source).test(document.querySelector('#case-subject').innerText.replace(/\n+/g, '\n')), pattern.source); } catch { throw new Error(message + ': ' + await card.innerText()); } };

  const header2=header.trim()+',source_account_id,customer_name,product_name,product_sku,seat_count\n';
  const accountRow=(id='s',customer='c',account='a',name='Same customer')=>row(id,customer).trim()+','+[account,name,'Same product','sku','10'].join(',')+'\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\nl2,s2,c2,HaloPSA\n';
  const load=async(text=header2+accountRow()+accountRow('s2','c2'))=>{await fit();await supply(text,halo);await page.locator('#subscription-id').fill('s');await submit();};
  await load();await check(/Pax8 source account: a/, 'Account context missing');await check(/Descriptive labels only.*Same customer/, 'Descriptors missing');
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
  await page.locator('#subscription-id').fill('s2');await check(/No source-selected case/, 'Old identity survived correction');await submit();
  await check(/Customer reference: c2/, 'Same name merged customers');await check(/Pax8 subscription: s2/, 'Same product merged subscriptions');
  await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(header2+accountRow('s2','c2','b'))});
  await check(/No source-selected case/, 'Account replacement retained identity');await submit();await check(/Pax8 source account: b/, 'Replacement account missing');
  await load(header+row('s','c'));await check(/Source identity is incomplete/, 'Missing namespace treated complete');await check(/Pax8 source account: Unresolved/, 'Namespace invented');
  await load(header2+accountRow('s','c','unknown'));await check(/Source identity is incomplete/,'Unknown account created namespace');
  await load(header2+accountRow('s','c','a')+accountRow('s','c','b'));await check(/Selection unresolved:.*found 2/, 'Cross-account collision chosen');
  await load(header2+accountRow('s','c','<img>','<img>'));await check(/Pax8 source account: <img>/,'Literal account absent');if(await card.locator('img').count())throw new Error('Identity rendered markup');
  await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();let body=await response.text();
    body=body.replace('export function selectCaseSubject(', 'function originalSelectCaseSubject(').replace('export function inspectRecords(', 'function originalInspectRecords(');
    body+=`\nexport function selectCaseSubject(text,id){const value=structuredClone(originalSelectCaseSubject(text,id));if(globalThis.__fault==='subject')value.subject.identity.sourceAccountId='FORGED';return value;}\nexport function inspectRecords(...args){const value=originalInspectRecords(...args);if(globalThis.__fault==='handoff'&&value.selected)value.caseIdentity={...value.caseIdentity,key:'FORGED'};if(globalThis.__fault==='missing'&&value.selected)delete value.caseIdentity;if(globalThis.__fault==='missing-selected')delete value.selected;if(globalThis.__fault==='wrong-selected'&&value.selected)value.selected={...value.selected,subscriptionId:'FORGED'};return value;}`;
    await route.fulfill({response,body});});
  for(const fault of ['subject','handoff','missing','missing-selected','wrong-selected']){
    await fit();await supply(header2+accountRow(),halo);await page.locator('#subscription-id').fill('s');await page.evaluate(fault=>window.__fault=fault,fault);await submit();
    await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();
    if(fault==='subject')await check(/No source-selected case/,'Corrupt identity card');
    if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Corrupt identity permits handoff');
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: source-account namespace; identical customer/product descriptions remain distinct; correction and account replacement invalidate; missing namespace unresolved; duplicate IDs across accounts stop; literal identity; corrupt subject and handoff identity stop; zero page errors';
}
