async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(() => {
    const NativeDate=Date;window.__today='2026-12-30';
    window.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[window.__today+'T12:00:00']));}};
    const original=File.prototype.text; window.__mode=null;window.__reads=[];
    window.__processingTextControl = function(){
      if(window.__mode===this.name) return new Promise((resolve,reject)=>window.__reads.push({resolve:()=>original.call(this).then(resolve),reject:()=>reject(new Error('unreadable'))}));
      return original.call(this);
    };
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
  const header = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const row = (id,customer,date='2027-01-15') => `synthetic-account,${id},${customer},pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const supply = async (pax, halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n') => {
    for (const [id,text] of [['pax-file',pax],['halo-file',halo]]) await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  };
  const submit = () => page.getByRole('button',{name:'Check record facts',exact:true}).click();
  const card = page.locator('#case-subject');
  const check = async (pattern, message) => { try { await page.waitForFunction(source => new RegExp(source).test(document.querySelector('#case-subject').innerText.replace(/\n+/g, '\n')), pattern.source); } catch { throw new Error(message + ': ' + await card.innerText()); } };

  const fresh=async()=>{await fit();await supply(header+row('s','c'));await page.locator('#subscription-id').fill('s');};
  const checked=async()=>{await submit();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();await check(/Pax8 subscription: s/, 'Expected subject');};
  const none=label=>check(/No source-selected case/,label);
  await fresh();await checked();await page.getByRole('button',{name:'Clear files and result',exact:true}).click();await none('clear');
  await fresh();await checked();await page.evaluate(()=>document.querySelector('#record-form').reset());await none('native reset');
  await fresh();await checked();await page.evaluate(()=>document.querySelector('#fit-form').reset());await none('questionnaire native reset');
  if(await page.locator('#result').isVisible())throw new Error('Questionnaire reset retained fit result');
  await fresh();await checked();
  await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(header+row('s','changed'))});
  await none('same-name replacement');await submit();await check(/Customer reference: changed/, 'replacement customer');
  for(const stage of ['pax-file.csv','halo-file.csv']) {
    await fresh();await page.evaluate(stage=>window.__mode=stage,stage);await submit();
    await page.waitForFunction(()=>window.__reads.length===1);
    if(stage==='halo-file.csv') await check(/Pax8 subscription: s/, 'subject before Halo completes');else await none('before Pax completes');
    await page.getByRole('button',{name:'Cancel this check',exact:true}).click();await none('cancel '+stage);
    await page.evaluate(async()=>{window.__mode=null;await window.__reads.shift().resolve();});await none('late '+stage);
    await submit();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
  }
  for(const stage of ['pax-file.csv','halo-file.csv']) {
    await fresh();await page.evaluate(stage=>window.__mode=stage,stage);await submit();await page.waitForFunction(()=>window.__reads.length===1);
    await page.evaluate(()=>window.__reads.shift().reject());
    await page.getByRole('heading',{name:'Repair the supplied input',exact:true}).waitFor();
    if(stage==='pax-file.csv') await none('failed Pax');else await check(/Pax8 subscription: s/, 'failed Halo retains subject');
  }
  for(const stage of ['pax-file.csv','halo-file.csv']) {
    await fresh();await page.evaluate(stage=>{window.__mode=stage;const original=window.setTimeout;window.setTimeout=(callback,delay,...args)=>original(callback,delay===30000?500:delay,...args);},stage);await submit();
    await page.getByRole('heading',{name:'Repair the supplied input',exact:true}).waitFor();
    if(stage==='pax-file.csv')await none('Pax timeout');else await check(/Pax8 subscription: s/,'Halo timeout preserves current subject');
    await page.evaluate(async()=>{window.__mode=null;await window.__reads.shift().resolve();});
    if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Late timed-out read revived comparison');
  }
  for(const fault of ['missing','duplicate']) {
    await fresh();await page.evaluate(fault=>{const region=document.querySelector('#case-subject');if(fault==='missing')region.remove();else region.after(region.cloneNode(true));},fault);await page.evaluate(()=>document.querySelector('#record-form').requestSubmit());
    try { await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor({timeout:5000}); } catch { throw new Error('Expected technical stop for '+fault+': '+await page.locator('body').innerText()); }
    if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Invalid subject region permits comparison');
  }
  await fresh();await page.evaluate(()=>window.__mode='halo-file.csv');await submit();await page.waitForFunction(()=>window.__reads.length===1);
  await page.evaluate(()=>{document.querySelector('#subscription-id').value='different';window.__reads.shift().reject();});
  await none('silent change during failed Halo');await page.getByText(/The case inputs changed/).waitFor();
  await fresh();await checked();await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await none('history restoration');
  for(const day of ['2026-12-31','2027-04-01']) {
    await fresh();await checked();
    const state=await page.evaluate(day=>{window.__today=day;window.dispatchEvent(new Event('focus'));return {warning:document.querySelector('#time-warning').textContent,result:document.querySelector('#result').innerText,none:document.querySelector('#case-subject').innerText};},day);
    if(!state.none.includes('No source-selected case'))throw new Error('First date event kept subject');
    if(day==='2027-04-01'&&!state.result.includes('policy'))throw new Error('First expiry event failed policy routing: '+state.result);
    if(day==='2026-12-31'&&!state.warning.includes('local calendar date changed'))throw new Error('Date cause masked');
    if(day==='2027-04-01') {
      const resetState=await page.evaluate(async()=>{document.querySelector('#fit-form').reset();await Promise.resolve();return {result:document.querySelector('#result').innerText,formHidden:document.querySelector('#fit-form').hidden};});
      if(!resetState.formHidden||!resetState.result.includes('policy'))throw new Error('Native reset removed expired policy block');
    }
  }
  await page.route('**/preflight.mjs',async route=>{
    const response=await route.fetch();let body=await response.text();body=body.replace('export function selectCaseSubject(', 'function originalSelectCaseSubject(');
    body+=`\nexport function selectCaseSubject(text,id){const value=structuredClone(originalSelectCaseSubject(text,id));const fault=globalThis.__fault;if(fault==='identity'){value.subject.subscriptionId='wrong';value.subject.customerRef='wrong';}else if(fault==='raw'){value.subject.raw.customer_ref='wrong';}else if(fault==='date')value.subject.renewalDate='2027-01-16';else if(fault==='position')value.subject.recordNumber=2;else if(fault==='authority')value.subject.authenticated=true;else if(fault==='status')value.status='unresolved';else if(fault==='missing')delete value.subject;else if(fault==='extra')value.actionAuthorized=true;return value;}`;
    await route.fulfill({response,body});
  });
  for(const fault of ['identity','raw','date','position','authority','status','missing','extra']) {
    await fresh();await page.evaluate(fault=>window.__fault=fault,fault);await submit();
    try { await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor({timeout:5000}); } catch { throw new Error('Expected technical stop for '+fault+': '+await page.locator('body').innerText()); }await none('corrupt '+fault);
    if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Corrupt projection permits linkage');
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: clear/native reset/same-name replacement; both read-stage cancellation/error/timeout/late retry; missing/duplicate regions; silent error mutation; history; first-event date and policy expiry; eight inconsistent projection stops; zero page errors';
}
