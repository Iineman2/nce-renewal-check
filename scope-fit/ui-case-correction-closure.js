async page => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

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
  async function check(){await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.getByRole('button',{name:'Confirm this source case',exact:true}).waitFor();}
  async function confirmed(){await check();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();}
  async function empty(label){
    if(await page.locator('#record-result').isVisible())throw Error(label+': comparison survived');
    if((await page.locator('#case-subject').innerText()).includes('Case selection: confirmed'))throw Error(label+': confirmation survived');
    if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count())throw Error(label+': assertions survived');
    if(await page.locator('#read-status').isVisible()||await page.locator('#record-form button[type=submit]').isDisabled())throw Error(label+': read owner survived');
  }
  for(const mode of ['manual-C','ABA','file-replacement','explicit-clear','canceled-reset']){
    await setup();await confirmed();
    if(mode==='explicit-clear'){await page.locator('#change-case').click();await page.locator('#subscription-id').fill('B');}
    else if(mode==='canceled-reset'){await page.locator('#record-form').evaluate(n=>{n.addEventListener('reset',e=>e.preventDefault(),{once:true});n.reset();});}
    else await page.locator('#subscription-id').fill('B');
    await empty(mode+' first');await assertions();
    if(mode==='file-replacement')await page.locator('#pax-file').setInputFiles({name:'replaced.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
    else await page.locator('#subscription-id').fill(mode==='ABA'?'A':'C');
    await empty(mode+' second');await assertions();await confirmed();passed.push(mode);
  }
  for(const group of ['renewalTerm','agreement']){
    await setup();await confirmed();await page.locator('#subscription-id').evaluate(n=>n.value='B');
    await page.locator(`input[name=${group}][value=${group==='agreement'?'no':'monthly'}]`).check();
    if(await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').count()!==1)throw Error('Silent correction retained other answer');
    await page.locator('#subscription-id').fill('C');await empty('silent draft '+group);passed.push('silent-'+group);
  }
  await setup();await confirmed();await page.locator('#subscription-id').fill('B');await assertions();
  await page.locator('#load-case-finder').click();await page.getByRole('button',{name:'Use case C, record 3',exact:true}).click();await empty('finder draft');passed.push('finder-draft');
  for(const [group,values] of [['renewalTerm',['annual','monthly','other','unknown']],['agreement',['yes','no','unknown']]])for(const value of values){
    await setup();await confirmed();await page.locator('#subscription-id').fill('B');
    await page.locator(`input[name=${group}][value=${value}]`).check();await page.locator('#subscription-id').fill('C');await empty(group+value);
    await assertions();await page.locator('#subscription-id').fill('A');await empty('third hop');passed.push('value-'+group+'-'+value);
  }
  for(const phase of ['pax','halo'])for(const finish of ['resolve','reject']){
    await setup();
    await page.evaluate(phase=>{const original=File.prototype.text;window.__pending=[];window.__mode=phase==='pax'?'all':'halo';window.__processingTextControl = function(){if(window.__mode==='all'||(window.__mode==='halo'&&this.name==='halo-file.csv'))return new Promise((resolve,reject)=>window.__pending.push({resolve:()=>original.call(this).then(resolve),reject:()=>reject(Error('old read'))}));return original.call(this);};},phase);
    await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.waitForFunction(()=>window.__pending.length===1);
    if(phase==='halo')await page.getByRole('button',{name:'Confirm this source case',exact:true}).click();
    await page.locator('#change-case').click();await page.locator('#subscription-id').fill('B');await assertions();await page.evaluate(()=>window.__mode='all');
    await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.waitForFunction(()=>window.__pending.length===2);
    await page.evaluate(async finish=>{window.__pending.shift()[finish]();await new Promise(r=>setTimeout(r,100));},finish);
    const busy=await page.locator('#record-form button[type=submit]').isDisabled();const reading=await page.locator('#read-status').isVisible();
    const noOld=!(await page.locator('#case-subject').innerText()).includes('Customer reference: cA');
    if(!busy||!reading||!noOld)throw Error('Old owner altered new read');
    await page.evaluate(async()=>{window.__mode='none';window.__pending.shift().resolve();});await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).waitFor();
    await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();
    if(!(await page.locator('#case-subject').innerText()).includes('Customer reference: cB'))throw Error('Wrong overlap case');passed.push('overlap-'+phase+'-'+finish);
  }
  await assertions();await check();await page.screenshot({path:'output/one-case-principle-7-closure/correction.png',fullPage:true});
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: P7-CLOSURE-ASSERTIONS:'+JSON.stringify(passed);
}
