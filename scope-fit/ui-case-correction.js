async page => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const passed=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-12-30T12:00:00']));}}});
  const header='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const source=header+'a,A,cA,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\na,B,cB,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nlA,A,cA,HaloPSA\nlB,B,cB,HaloPSA\n';
  async function setup(){
    await page.goto('http://localhost:8765/');
    for(const [n,v] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]){await page.locator(`input[name="${n}"][value="${v}"]`).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
    await page.locator('input[name=renewal][value=exact]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();
    for(const [id,text] of [['pax-file',source],['halo-file',halo]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('A');await assertions();
  }
  async function assertions(){await page.locator('input[name=renewalTerm][value=annual]').check();await page.locator('input[name=agreement][value=yes]').check();}
  async function check(){await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.getByRole('button',{name:'Confirm this source case',exact:true}).waitFor();}
  async function confirmed(){await check();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();}
  async function empty(label){
    if(await page.locator('#record-result').isVisible())throw Error(label+': comparison survived');
    if((await page.locator('#case-subject').innerText()).includes('Case selection: confirmed'))throw Error(label+': confirmation survived');
    if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count())throw Error(label+': assertions survived');
    if(await page.locator('#read-status').isVisible()||await page.locator('#record-form button[type=submit]').isDisabled())throw Error(label+': read owner survived');
  }
  for(const phase of ['candidate','confirmed']){
    await setup();if(phase==='confirmed')await confirmed();else await check();
    await page.evaluate(()=>{window.__old=[...document.querySelectorAll('#case-subject button,#record-result button')];window.__files=[...document.querySelectorAll('input[type=file]')].map(n=>n.files[0]);});
    await page.locator('#change-case').click();await empty(phase);
    if(await page.locator('#subscription-id').inputValue()!==''||!(await page.locator('#subscription-id').evaluate(n=>n===document.activeElement)))throw Error('Correction ID/focus wrong');
    if(!(await page.evaluate(()=>window.__files.every((f,i)=>f===document.querySelectorAll('input[type=file]')[i].files[0]))))throw Error('Correction discarded files');
    await page.evaluate(()=>window.__old.forEach(b=>b.click()));await empty('detached-'+phase);passed.push('explicit-'+phase);
    await page.locator('#change-case').click();await empty('repeat');passed.push('repeat-'+phase);
    await page.locator('#subscription-id').fill('B');await assertions();await confirmed();
    const subject=await page.locator('#case-subject').innerText();if(!subject.includes('cB')||subject.includes('cA'))throw Error('Wrong corrected customer');if(await page.locator('#correction-status').innerText())throw Error('Stale correction status');passed.push('fresh-B-'+phase);
  }
  for(const mode of ['manual','aba','silent','source','finder']){
    await setup();await confirmed();
    if(mode==='manual'||mode==='aba'){await page.locator('#subscription-id').fill('B');if(mode==='aba')await page.locator('#subscription-id').fill('A');}
    else if(mode==='silent'){await page.locator('#subscription-id').evaluate(n=>{n.value='B';});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
    else if(mode==='source')await page.locator('#pax-file').setInputFiles({name:'replacement.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
    else{await page.locator('#load-case-finder').click();await page.locator('.case-finder-row button').first().waitFor();await page.getByRole('button',{name:'Use case B, record 2',exact:true}).click();}
    await empty(mode);passed.push(mode);
  }
  await setup();await confirmed();await check();
  if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count()!==2)throw Error('Same-case retry discarded assertions');
  if(!(await page.locator('#case-subject').innerText()).includes('Case selection: candidate'))throw Error('Retry reused confirmation');passed.push('same-case-retry');
  for(const fileId of ['pax-file','halo-file'])for(const finish of ['resolve','reject']){
    await setup();
    await page.evaluate(fileId=>{window.__pending=[];const original=File.prototype.text;window.__processingTextControl = function(){if(this.name===fileId+'.csv')return new Promise((resolve,reject)=>window.__pending.push({resolve:()=>original.call(this).then(resolve),reject:()=>reject(Error('old read'))}));return original.call(this);};},fileId);
    await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.waitForFunction(()=>window.__pending.length===1);
    await page.locator('#change-case').click();await empty('pending');
    await page.evaluate(async finish=>{window.__pending.shift()[finish]();await new Promise(r=>setTimeout(r,100));},finish);await empty('late');passed.push('pending-'+fileId+'-'+finish);
  }
  await setup();await confirmed();await page.locator('#record-form').evaluate(n=>{n.addEventListener('reset',e=>e.preventDefault(),{once:true});n.reset();});await empty('canceled-reset');passed.push('canceled-reset');
  await setup();await confirmed();await page.locator('#subscription-id').focus();await page.locator('#subscription-id').press('End');await page.locator('#subscription-id').pressSequentially('BC');
  if(await page.locator('#subscription-id').inputValue()!=='ABC'||!(await page.locator('#subscription-id').evaluate(n=>n===document.activeElement)))throw Error('Correction stole keyboard focus');await empty('keyboard');passed.push('keyboard-focus');
  await setup();await page.locator('#pax-file').setInputFiles([]);await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.locator('#record-result:not([hidden])').waitFor();
  await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
  if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count()!==2)throw Error('Initial input repair discarded unbound assertions');passed.push('initial-repair');
  await setup();await page.locator('#subscription-id').fill('missing');await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.locator('#record-result:not([hidden])').waitFor();await page.locator('#subscription-id').fill('A');
  if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count()!==2)throw Error('No-match repair discarded unbound assertions');passed.push('no-match-repair');
  await setup();await confirmed();await page.locator('#clear-records').click();await empty('full-clear');if(await page.locator('input[type=file]').evaluateAll(ns=>ns.some(n=>n.files.length)))throw Error('Full clear retained files');passed.push('full-clear');
  await setup();await confirmed();await page.locator('#change-case').click();await page.locator('#subscription-id').fill('B');await assertions();await check();
  await page.screenshot({path:'output/one-case-principle-7/correction.png',fullPage:true});passed.push('visible-recovery');
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: P7-CORRECTION-ASSERTIONS:'+JSON.stringify(passed);
}
