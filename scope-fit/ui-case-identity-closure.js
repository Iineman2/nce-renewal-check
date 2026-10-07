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
  await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('export function inspectRecords(', 'function originalInspectRecords(');
    body+=`\nexport function inspectRecords(...args){const value=originalInspectRecords(...args);if(!value.selected)return value;const original=value.selected;const fault=globalThis.__fault;globalThis.__getterReads=0;globalThis.__descriptorReads=0;
      if(fault==='root-getter')Object.defineProperty(value,'selected',{enumerable:true,get(){globalThis.__getterReads++;return original;}});
      if(fault==='nested-getter')Object.defineProperty(original,'customerRef',{enumerable:true,get(){globalThis.__getterReads++;return 'c';}});
      if(fault==='blocked-selected'){const blocked=originalInspectRecords({...input,subscriptionId:'absent'});blocked.selected=original;return blocked;}
      if(fault==='extra')value.selected={...original,actionAuthorized:true};
      if(fault==='number')value.selected={...original,subscriptionId:1};
      if(fault==='cycle')value.selected.self=value.selected;
      if(fault==='descriptor-drift')return new Proxy(value,{getOwnPropertyDescriptor(target,key){if(key==='selected'){globalThis.__descriptorReads++;return {configurable:true,enumerable:true,writable:true,value:globalThis.__descriptorReads===1?original:{...original,subscriptionId:'FORGED'}};}return Reflect.getOwnPropertyDescriptor(target,key);},get(target,key){if(key==='selected')return {...original,subscriptionId:'FORGED'};return Reflect.get(target,key);}});
      if(fault==='alias-mutation')queueMicrotask(()=>{original.subscriptionId='FORGED';original.customerRef='FORGED';});
      return value;}`;await route.fulfill({response,body});});
  for(const fault of ['root-getter','nested-getter','extra','number','cycle','blocked-selected','descriptor-drift','alias-mutation']){
    await fit();await supply(header2+accountRow(),halo);await page.locator('#subscription-id').fill('s');await page.evaluate(fault=>window.__fault=fault,fault);await submit();
    if(['descriptor-drift','alias-mutation'].includes(fault)){
      await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).waitFor();
      const text=await page.locator('#record-result').innerText();if(text.includes('FORGED')||!text.includes('Selected Pax8 subscription s; HaloPSA line l; customer reference c.'))throw new Error('Alias reread during '+fault);
      if(fault==='descriptor-drift'&&await page.evaluate(()=>window.__descriptorReads)!==1)throw new Error('Descriptor read repeatedly');
      await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();
      await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();
      if((await page.locator('#record-result').innerText()).includes('FORGED'))throw new Error('Alias reread after confirmation');
    }else{
      await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();
      if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Malformed selection permits confirmation');
      if(await page.evaluate(()=>window.__getterReads)!==0)throw new Error('Accessor executed');
    }
  }
  await page.unroute('**/preflight.mjs');await load();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();
  await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).waitFor();
  await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(header2+accountRow('s','c','unknown'))});
  await check(/No source-selected case/,'Known to unknown account retained identity');await submit();await check(/Source identity is incomplete/,'Unknown account complete');
  await page.getByRole('heading',{name:'Resolve case selection uncertainty'}).waitFor();
  if(await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).count())throw new Error('Unknown account permits confirmation');
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: root/nested getters rejected without execution; selected extras/types/cycles stop; descriptor captured once; proxy/alias mutations cannot change validated/rendered IDs before or after confirmation; known-to-unknown account replacement invalidates';
}
