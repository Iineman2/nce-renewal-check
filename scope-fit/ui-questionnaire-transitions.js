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
  await page.goto('http://localhost:8765/');
  await page.locator('input[name="reseller"][value="no"]').check(); await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Continue to record comparison',exact:true}).waitFor();
  await page.evaluate(()=>{window.oldContinue=Array.from(document.querySelectorAll('#result button')).find(button=>button.textContent==='Continue to record comparison');});
  await page.getByRole('button',{name:'Change answers',exact:true}).click();
  // Complete this same document so the detached original control survives.
  for(const [field,value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) {await page.locator(`input[name="${field}"][value="${value}"]`).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
  await page.locator('input[name="renewal"][value="exact"]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();
  await page.getByRole('heading',{name:'Answers look in scope'}).waitFor();await page.evaluate(()=>window.oldContinue.click());
  if(!await page.getByRole('heading',{name:'Answers look in scope'}).isVisible())throw new Error('Detached early continuation changed current result');
  await page.evaluate(()=>{window.oldGo=Array.from(document.querySelectorAll('#result button')).find(button=>button.textContent==='Go to record comparison');});
  await page.getByRole('button',{name:'Change answers',exact:true}).click();
  await page.locator('input[name="reseller"][value="no"]').check();await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('heading',{name:'Answers indicate outside this release'}).waitFor();
  const focus=await page.evaluate(()=>document.activeElement.id);await page.evaluate(()=>window.oldGo.click());
  if(await page.evaluate(()=>document.activeElement.id)!==focus || !await page.getByRole('heading',{name:'Answers indicate outside this release'}).isVisible())throw new Error('Detached positive continuation changed state/focus');
  await fit(); await page.evaluate(()=>{document.querySelector('input[name="reseller"][value="no"]').checked=true;});
  await page.getByRole('button',{name:'Go to record comparison',exact:true}).click();
  await page.getByText(/The case inputs changed/).waitFor();await fitGone('silent questionnaire basis');
  await fit();await page.locator('input[name="agreement"][value="no"]').check();
  await page.getByRole('button',{name:'Update agreement availability',exact:true}).waitFor();
  await page.evaluate(()=>{window.oldLocate=Array.from(document.querySelectorAll('#result button')).find(button=>button.textContent==='Update agreement availability');});
  await page.getByRole('button',{name:'Change answers',exact:true}).click();
  const beforeLocate=await page.evaluate(()=>document.activeElement.id);await page.evaluate(()=>window.oldLocate.click());
  if(await page.evaluate(()=>document.activeElement.id)!==beforeLocate)throw new Error('Detached agreement preparation changed focus');
  for(const mode of ['hidden','disabled','removed']) {
    await fit();await page.locator('input[name="renewalTerm"][value="unknown"]').check();await checked();
    await page.getByRole('button',{name:'Update the item to verify',exact:true}).waitFor();
    await page.evaluate(mode=>{document.querySelectorAll('input[name="renewalTerm"]').forEach(input=>{if(mode==='hidden')input.closest('fieldset').hidden=true;else if(mode==='disabled')input.disabled=true;else input.remove();});},mode);
    await page.getByRole('button',{name:'Update the item to verify',exact:true}).click();
    if(!await page.getByRole('heading',{name:'The check could not finish'}).isVisible()&&!await page.getByText(/The case inputs changed/).isVisible())throw new Error('Unavailable repair target lacks stop: '+mode);
  }
  // Repeated cancel/late completions and overlapping submits cannot retain mixed case.
  await fit();
  for(let index=0;index<8;index++) {
    await page.evaluate(()=>{window.__stall=true;});await submit();
    await page.getByRole('button',{name:'Cancel this check',exact:true}).click();
    await page.evaluate(async()=>{window.__stall=false;await window.__finishRead();});await gone('repeat cancelled read '+index);
    await submit();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();
    await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();
  }
  await page.evaluate(()=>{document.querySelector('#record-form').requestSubmit();document.querySelector('#record-form').requestSubmit();});
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
  if(await page.locator('#record-result .claim-trail').getAttribute('data-stage')!=='record-comparison')throw new Error('Overlapping submit reused confirmation');
  await page.evaluate(()=>{window.__today='2026-12-31';});
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();await gone('action-time date without timer');
  return 'PASS: detached early and positive navigation ignored; silent questionnaire mutation blocked; eight cancel/retry loops, overlapping submits and action-time date invalidation';
}
