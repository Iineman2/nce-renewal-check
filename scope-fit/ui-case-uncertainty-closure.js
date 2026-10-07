async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const errors=[];page.on('pageerror',e=>errors.push(e.message));const covered=new Set();
  const mark=(...ids)=>ids.forEach(id=>covered.add(id));
  await page.addInitScript(()=>{
    const NativeDate=Date;window.__today='2026-12-30';window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.__today+'T12:00:00']));}};
    const text=File.prototype.text;window.__reads=[];window.__holdHalo=false;
    window.__processingTextControl = function(){if(window.__holdHalo&&this.name==='halo-file.csv')return new Promise((resolve,reject)=>window.__reads.push({resolve:()=>text.call(this).then(resolve),reject:()=>reject(new Error('audit read rejection'))}));return text.call(this);};
    const delay=window.setTimeout;window.setTimeout=(fn,ms,...args)=>delay(fn,window.__fastTimeout&&ms===30000?600:ms,...args);
  });
  const header='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const q=v=>'"'+v.replaceAll('"','""')+'"';
  const row=(account='a',customer='c',date='2027-01-15',id='s',distributor='pax8')=>[account,id,customer,distributor,'Microsoft 365','NCE','yes','annual',date,'renew'].map(q).join(',')+'\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const fit=async()=>{
    await page.goto('http://localhost:8765/');
    for(const [field,value]of[['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]){await page.locator(`input[name="${field}"][value="${value}"]`).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
    await page.locator('input[name="renewal"][value="exact"]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();
  };
  // A retry fixture explicitly supplies fresh answers after new File identities;
  // production must not carry these assertions across replacement itself.
  const supply=async(pax=header+row(),billing=halo)=>{
    const values=await page.locator('input[name=renewalTerm]:checked,input[name=agreement]:checked').evaluateAll(ns=>ns.map(n=>[n.name,n.value]));
    for(const [id,text]of[['pax-file',pax],['halo-file',billing]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});await page.locator('#subscription-id').fill('s');
    for(const [name,value]of values)await page.locator(`input[name="${name}"][value="${value}"]`).check();
  };
  const submit=()=>page.getByRole('button',{name:'Check record facts',exact:true}).click();
  const card=page.locator('#case-subject');const source=page.getByRole('button',{name:'Confirm this source case',exact:true});const link=page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true});
  const focus=async(id)=>{if(await page.evaluate(()=>document.activeElement.id)!==id)throw new Error('Expected focus '+id+', got '+await page.evaluate(()=>document.activeElement.tagName+':'+document.activeElement.id));};
  const confirmed=async()=>{if(!(await card.innerText()).includes('Case selection: confirmed'))throw new Error('Confirmation absent');};
  const stopped=async()=>{if(await link.count()||await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).count())throw new Error('Unresolved state progresses');};
  const empty=async()=>{if(!(await card.innerText()).includes('No source-selected case'))throw new Error('Obsolete source resurrected');await stopped();};
  const terminal=async()=>{await page.locator('#runtime-warning').waitFor({state:'visible'});const safe=await page.evaluate(()=>document.getElementById('fit-form').hidden&&document.getElementById('preflight').hidden&&[...document.querySelectorAll('#result,#record-result,#case-subject,#finder-results')].every(n=>n.hidden&&!n.textContent));if(!safe||await source.count()||await page.locator('.case-finder-row button').count())throw new Error('Terminal fault retained source content or confirmation');await stopped();};
  const release=async(mode='resolve')=>page.evaluate(async mode=>{window.__holdHalo=false;await Promise.all(window.__reads.splice(0).map(r=>r[mode]()));},mode);
  const pending=async(pax=header+row(),billing=halo,fast=false)=>{await fit();await supply(pax,billing);await page.evaluate(fast=>{window.__holdHalo=true;window.__fastTimeout=fast;},fast);await submit();await source.waitFor();};
  const load=async(pax=header+row(),billing=halo,setup=async()=>{})=>{await fit();await setup();await supply(pax,billing);await submit();await page.locator('#record-result:not([hidden])').waitFor();};

  for(const billing of ['bad',halo]){
    await load(header+row(),billing);
    const text=await card.innerText();if(!text.includes('Confirm only after checking the supplied account, customer reference, subscription ID and exact renewal occurrence against the original Pax8 record.')||!text.includes('leave this case unconfirmed'))throw new Error('Independent attestation prerequisites hidden');
    await page.locator('#case-subject > details > summary').click();await source.focus();await page.keyboard.press('Enter');await confirmed();
    if(!await page.locator('#case-subject > details').evaluate(el=>el.open))throw new Error('Confirmation closed inspected evidence');
    await focus(billing==='bad'?'case-subject':'record-result');if(billing==='bad')await stopped();
  }
  mark('P4-F01','P4-17-05','P4-27-01','P4-27-04','P4-27-05','P4-22-02','P4-22-03');
  for(const [account,customer,date]of[['','c','2027-01-15'],['a','','2027-01-15'],['a','c','unknown'],['','','unknown']]){
    await load(header+row(account,customer,date));await focus('record-result');await stopped();if(!(await card.innerText()).includes('Selection unresolved'))throw new Error('Incomplete uncertainty hidden');
  }
  mark('P4-27-03','P4-27-06');

  for(const mode of ['resolve','reject','timeout']){
    await pending(header+row(),halo,mode==='timeout');await source.focus();await page.keyboard.press('Enter');await focus('case-subject');await confirmed();await stopped();
    if(mode==='timeout') {await page.getByRole('heading',{name:'Repair the supplied input',exact:true}).waitFor();await release();}
    else await release(mode);
    await page.locator('#record-result:not([hidden])').waitFor();await confirmed();await focus('record-result');
    if(mode==='resolve'){if(await link.count()!==1)throw new Error('Halo completion failed to request link attestation');}
    else await stopped();
  }
  mark('P4-17-04','P4-27-02','P4-17-06','P4-17-07','P4-17-08');
  for(let i=0;i<3;i++){
    await pending();await source.click();await page.getByRole('button',{name:'Cancel this check',exact:true}).click();await release(i%2?'reject':'resolve');await empty();
    await supply();await submit();await link.waitFor();await source.click();await focus('record-result');await link.click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();
  }
  mark('P4-18-06','P4-27-07','P4-34-03');
  await load();await source.evaluate(el=>window.__oldSource=el);await source.click();await page.evaluate(()=>window.__oldSource.click());await confirmed();
  await link.evaluate(el=>window.__oldLink=el);await link.click();await page.evaluate(()=>window.__oldLink.click());await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();mark('P4-13-07');

  // Superseded rejection and duplicate repair cannot alter the newer case.
  await pending();await source.click();await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(header+row('b'))});await empty();await release('reject');await empty();
  await submit();await link.waitFor();await source.click();await confirmed();if(!(await card.innerText()).includes('Pax8 source account: b'))throw new Error('Wrong replacement account');
  mark('P4-34-04');
  await pending();
  for(let i=0;i<3;i++){await source.click();await page.getByRole('button',{name:'Cancel this check',exact:true}).click();if(i<2){await supply();await submit();await source.waitFor();}}
  await page.evaluate(()=>window.__holdHalo=false);await supply();await submit();await link.waitFor();await source.click();await link.click();await confirmed();await release('reject');await confirmed();await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();mark('P4-18-07');
  await fit();await supply(header+row()+row('b'));await page.evaluate(()=>window.__holdHalo=true);await submit();await page.waitForFunction(()=>document.querySelector('#case-subject').innerText.includes('found 2'));
  await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(header+row())});await release();await empty();await submit();await link.waitFor();if(!(await card.innerText()).includes('Case selection: candidate'))throw new Error('Repaired ambiguity inherited confirmation');mark('P4-19-08');

  for(const mutation of ['replace','duplicate']){
    await pending();await source.evaluate(el=>window.__storedSource=el);
    await page.evaluate(mutation=>{const el=document.querySelector('#subscription-id');const clone=el.cloneNode(true);if(mutation==='replace')el.replaceWith(clone);else el.after(clone);window.__storedSource.click();},mutation);
    if(mutation==='duplicate')await terminal();else await empty();await release();if(mutation==='duplicate')await terminal();else await empty();
  }
  mark('P4-20-08');
  for(const event of ['calendar','policy','history'])for(const mode of ['resolve','reject']){
    await pending();await source.click();
    await page.evaluate(event=>{if(event==='history')window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));else {window.__today=event==='policy'?'2027-01-01':'2026-12-31';window.dispatchEvent(new Event('focus'));}},event);
    await release(mode);await empty();
  }
  mark('P4-21-07');
  await fit();await supply(header+row()+row('b'));await page.evaluate(()=>{window.__holdHalo=true;window.__fastTimeout=true;});await submit();await page.waitForFunction(()=>document.querySelector('#case-subject').innerText.includes('found 2'));await page.getByRole('heading',{name:'Repair the supplied input',exact:true}).waitFor();if(!(await page.locator('#record-result').innerText()).includes('timed out'))throw new Error('Triple failure did not observe timeout');await page.evaluate(()=>{window.__today='2026-12-31';window.dispatchEvent(new Event('focus'));});await release();await empty();mark('P4-34-05');

  await load(header+row(''),halo+'l2,s,c,HaloPSA\n',async()=>{await page.evaluate(()=>document.querySelector('input[name=distributor][value=other]').checked=true);});await stopped();if(!(await card.innerText()).includes('missing-account'))throw new Error('Link priority hid account uncertainty');mark('P4-24-06');
  await load(header+row('','c','2027-01-15','s','other'),'line_id,subscription_id,customer_ref,billing_system\nl,s,other,HaloPSA',async()=>{await page.locator('input[name=agreement][value=unknown]').check();});await stopped();if(!(await card.innerText()).includes('missing-account'))throw new Error('Mixed outside/link/selection uncertainty hidden');mark('P4-34-07');
  await load(header+row('a','c','unknown'),'\uFFFD');await stopped();if(!(await card.innerText()).includes('missing-occurrence'))throw new Error('Encoding error hid source occurrence');await page.evaluate(()=>{window.__today='2026-12-31';window.dispatchEvent(new Event('focus'));});await empty();mark('P4-24-07');
  for(let i=0;i<2;i++){await pending(header+row('a','c','2027-01-15','s','other'));await source.click();await page.locator('#record-form').evaluate(el=>el.requestSubmit());await page.waitForFunction(()=>document.querySelector('#case-subject').innerText.includes('Case selection: candidate'));await source.click();await release();await link.waitFor();await link.click();const conflict=page.getByRole('button',{name:'Use supplied Pax8 value for distributor',exact:true});await conflict.waitFor();await conflict.evaluate(el=>window.__oldConflict=el);await page.getByRole('button',{name:'Clear files and result',exact:true}).click();await page.evaluate(()=>window.__oldConflict.click());await empty();}
  mark('P4-34-08');
  const maximum=header+row()+Array.from({length:4999},(_,i)=>row('a','c','2027-01-15','other'+i)).join('');await pending(maximum);await source.evaluate(el=>{el.click();document.querySelector('#record-form').requestSubmit();document.querySelector('#record-form').requestSubmit();});await page.waitForFunction(()=>document.querySelector('#case-subject').innerText.includes('Case selection: candidate'));await source.click();await confirmed();await page.getByRole('button',{name:'Cancel this check',exact:true}).click();await release();await empty();mark('P4-18-08');

  // Confirmed render faults must clear ownership before late read completion.
  await page.route('**/app.mjs',async route=>{const response=await route.fetch();let body=await response.text();const anchor='  const subject = selection.subject;';if(!body.includes(anchor))throw new Error('Fault anchor absent');body=body.replace(anchor,"  if(selection.status==='confirmed'&&globalThis.__confirmFault)throw new TypeError('Injected confirmed rendering failure');\n"+anchor);await route.fulfill({response,body});});
  for(const mode of ['resolve','reject']){
    await pending();await page.evaluate(()=>window.__confirmFault=true);await source.click();await terminal();await release(mode);await terminal();if(await source.count())throw new Error('Fault leaves confirmation control');
    await pending();await source.click();await confirmed();await release();await link.waitFor();
  }
  mark('P4-25-07','P4-25-08');await page.unroute('**/app.mjs');
  await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('export function reviewCaseSelection(','function originalReviewCaseSelection(');body+=`\nexport function reviewCaseSelection(...args){const value=structuredClone(originalReviewCaseSelection(...args));if(value.status==='confirmed'&&globalThis.__reviewFault)value.canConfirm=false;return value;}`;await route.fulfill({response,body});});
  for(const mode of ['resolve','reject']){await pending();await page.evaluate(()=>window.__reviewFault=true);await source.click();await terminal();await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await release(mode);await terminal();}
  mark('P4-16-08','P4-34-06');await page.unroute('**/preflight.mjs');

  // Representative maximum ambiguity layouts; every platform remains a bounded claim.
  const ambiguous=header+Array.from({length:21},()=>row('א'.repeat(128),'ك'.repeat(128))).join('');await load(ambiguous);await stopped();
  for(const [width,scale,rtl,forced]of[[320,'100%',false,false],[375,'200%',false,false],[1280,'400%',false,false],[1280,'400%',true,false],[375,'200%',false,true]]){
    await page.setViewportSize({width,height:812});await page.evaluate(({scale,rtl})=>{document.documentElement.style.fontSize=scale;document.documentElement.dir=rtl?'rtl':'ltr';}, {scale,rtl});await page.emulateMedia({forcedColors:forced?'active':'none'});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Maximum ambiguity overflow');if(!(await card.innerText()).includes('Showing 20 of 21'))throw new Error('Preview count lost in layout');
  }
  mark('P4-28-06');await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:1280,height:900});
  await load(header+row(''),halo);await focus('record-result');await page.screenshot({path:'output/one-case-principle-5-closure/previous-selection-outcomes.png',fullPage:true});
  await page.route('**/*axe*',route=>route.abort());let blocked=false;try{await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});}catch{blocked=true;}if(!blocked)throw new Error('Blocked QC dependency did not fail visibly');if(!(await card.innerText()).includes('missing-account'))throw new Error('QC dependency affects user selection');mark('P4-29-04');
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: expanded focus, explicit attestation, disclosure continuity, read/fault/expiry/correction crossproducts, bounded maximum layouts and zero page errors\nP4-ASSERTIONS:'+JSON.stringify([...covered].sort());
}
