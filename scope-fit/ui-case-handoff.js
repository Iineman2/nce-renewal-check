async page => {
  const passed=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-12-30T12:00:00']));}}});
  const header='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const source=header+'a,A,cA,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\na,B,cB,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\na,C,cC,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nlA,A,cA,HaloPSA\nlB,B,cB,HaloPSA\nlC,C,cC,HaloPSA\n';
  async function setup(){
    await page.goto('http://localhost:8765/');
    for(const [n,v] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]){await page.locator(`input[name="${n}"][value="${v}"]`).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
    await page.locator('input[name=renewal][value=exact]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();
    for(const [id,text] of [['pax-file',source],['halo-file',halo]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('A');await assertions();
  }
  async function assertions(){await page.locator('input[name=renewalTerm][value=annual]').check();await page.locator('input[name=agreement][value=yes]').check();}
  async function check(){await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.getByRole('button',{name:'Confirm this source case',exact:true}).waitFor();await page.waitForFunction(()=>document.getElementById('read-status').hidden);}
  async function confirmed(){await check();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();}
  async function empty(label){
    if(await page.locator('#record-result').isVisible())throw Error(label+': comparison survived');
    if((await page.locator('#case-subject').innerText()).includes('Case selection: confirmed'))throw Error(label+': confirmation survived');
    if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count())throw Error(label+': assertions survived');
    if(await page.locator('#read-status').isVisible()||await page.locator('#record-form button[type=submit]').isDisabled())throw Error(label+': read owner survived');
  }
  const observed=[];
  await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('export function inspectRecords(', 'function originalInspectRecords(');body+=`\nexport function inspectRecords(...args){const d=originalInspectRecords(...args);globalThis.__handoff=d.caseHandoff;if(globalThis.__handoffFault==='missing')delete d.caseHandoff;if(globalThis.__handoffFault&&globalThis.__handoffFault!=='missing'){const h=structuredClone(d.caseHandoff);if(globalThis.__handoffFault==='authority')h.actionAuthorized=true;if(globalThis.__handoffFault==='identity')h.selection.subject.customerRef='FORGED';if(globalThis.__handoffFault==='raw')h.selection.subject.raw.subscription_id='FORGED';if(globalThis.__handoffFault==='status')h.selection.status='confirmed';if(globalThis.__handoffFault==='uncertainty')delete h.selection.uncertainty;if(globalThis.__handoffFault==='getter'){Object.defineProperty(h,'selection',{enumerable:true,get(){globalThis.__getterRead=true;return d.caseHandoff.selection;}});}d.caseHandoff=h;if(globalThis.__handoffFault==='root-getter'){Object.defineProperty(d,'caseHandoff',{enumerable:true,get(){globalThis.__getterRead=true;document.getElementById('subscription-id').value='B';return h;}});}}return d;}`;await route.fulfill({response,body});});
  await setup();await check();
  let h=await page.evaluate(()=>window.__handoff);if(h.selection.status!=='candidate'||h.selection.subject.subscriptionId!=='A'||h.linkageVerdict!==null)throw Error('Candidate handoff changed meaning');passed.push('candidate');
  await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();
  await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();
  h=await page.evaluate(()=>window.__handoff);if(h.selection.status!=='confirmed'||h.actionAuthorized||h.eligibilityVerdict!==null)throw Error('Confirmation promoted authority');passed.push('confirmed');
  await page.locator('#subscription-id').fill('B');await assertions();await confirmed();h=await page.evaluate(()=>window.__handoff);
  if(h.selection.subject.subscriptionId!=='B'||h.selection.subject.customerRef!=='cB'||h.selection.subject.recordNumber!==2||h.selection.subject.raw.subscription_id!=='B')throw Error('Corrected handoff mixed identity');passed.push('corrected');
  if(!(await page.locator('[data-case-handoff]').innerText()).includes('Selection does not establish eligibility'))throw Error('Boundary absent');passed.push('visible-boundary');
  await page.screenshot({path:'output/one-case-principle-8/handoff.png',fullPage:true});
  for(const fault of ['missing','authority','identity','raw','status','uncertainty','getter','root-getter']){await setup();await page.evaluate(f=>window.__handoffFault=f,fault);await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();if(await page.evaluate(()=>window.__getterRead===true))throw Error('Getter executed');passed.push('reject-'+fault);}
  if(errors.length)throw Error(errors.join('\n'));return 'PASS: P8-HANDOFF-ASSERTIONS:'+JSON.stringify(passed);
}
