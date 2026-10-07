async (page) => {
  // Migrated lifecycle/read faults use a real Worker gate, not a main-realm File API override.
  await page.addInitScript({content: await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+await (await page.request.get('http://localhost:8765/qc-worker-entry.js')).text()});});

  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const original=File.prototype.text; window.__readMode='normal';
    window.__processingTextControl = function(){
      if(window.__readMode==='reject')return Promise.reject(new Error('read failed'));
      if(window.__readMode==='stall')return new Promise(resolve=>{window.__finishRead=()=>original.call(this).then(resolve);});
      return original.call(this);
    };
    const timer=window.setTimeout.bind(window);window.setTimeout=(callback,ms,...args)=>timer(callback,ms===30000&&window.__readMode==='timeout'?15:ms,...args);
  });
  const fit=async()=>{
    await page.goto('http://localhost:8765/');for(const name of ['We manage and resell it for a customer','Pax8','HaloPSA','Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']){await page.getByRole('radio',{name,exact:true}).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
    const date=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+14);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
    await page.getByRole('radio',{name:'I know the date',exact:true}).check();await page.locator('#renewal-date').fill(date);await page.getByRole('button',{name:'Check fit'}).click();
    const pax=`source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,s,c,pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
    const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
    await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();
    for(const [id,text] of [['pax-file',pax],['halo-file',halo]])await page.locator(`#${id}`).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('s');
  };
  const submit=()=>page.getByRole('button',{name:'Check record facts',exact:true}).click();
  const positive=async()=>{await submit();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();};
  await fit();await page.evaluate(()=>window.__readMode='reject');await submit();await page.getByRole('heading',{name:'Repair the supplied input'}).waitFor();
  await page.getByRole('button',{name:'Correct the supplied input'}).click();if(await page.evaluate(()=>document.activeElement.id)!=='pax-file')throw new Error('Read rejection target wrong');
  await page.evaluate(()=>window.__readMode='normal');await positive();
  await fit();await page.evaluate(()=>{window.__readMode='timeout';window.__processingTextControl = ()=>new Promise(()=>{});});await submit();await page.getByRole('heading',{name:'Repair the supplied input'}).waitFor();
  if(!await page.locator('#record-next-action').getByText(/Processing this file timed out/).isVisible())throw new Error('Timeout lacks retry action');
  await fit();await page.evaluate(()=>window.__readMode='stall');await submit();await page.getByRole('button',{name:'Cancel this check'}).click();
  if(!await page.getByRole('button',{name:'Check record facts'}).evaluate(el=>el===document.activeElement&&!el.disabled))throw new Error('Cancel lost keyboard retry focus');
  await page.evaluate(()=>{window.__readMode='normal';window.__finishRead();});await positive();
  await fit();await page.evaluate(()=>window.__readMode='stall');await submit();await page.getByRole('button',{name:'Clear files and result'}).click();await page.evaluate(()=>{window.__readMode='normal';window.__finishRead();});
  if(await page.locator('#record-result').isVisible())throw new Error('Cleared read resurrected a result');
  // Removed controls change the live basis and must invalidate before a repair action.
  await fit();await page.getByRole('radio',{name:'I have not confirmed the next term'}).check();await submit();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();
  await page.evaluate(()=>document.querySelectorAll('input[name="renewalTerm"]').forEach(el=>el.remove()));await page.getByRole('button',{name:'Update the item to verify'}).click();
  await page.getByText(/The case inputs changed/).waitFor();if(await page.locator('#record-result').isVisible())throw new Error('Removed control retained old result');
  await fit();await positive();await page.reload();if(await page.locator('#result').isVisible()||await page.locator('#record-result').isVisible())throw new Error('Reload retained authoritative result');
  // Missing independent inputs have structured accessible repair, bypassing native validation ambiguity.
  await fit();await page.getByRole('button',{name:'Clear files and result'}).click();await submit();await page.getByRole('button',{name:'Correct the supplied input'}).click();
  if(await page.evaluate(()=>document.activeElement.id)!=='pax-file')throw new Error('Missing file target wrong');
  if(errors.length)throw new Error(`Uncaught errors: ${errors}`);
  return 'PASS: read rejection, bounded timeout, keyboard cancellation, late completion, clear/reset, technical stop, reload and missing-input recovery; zero uncaught page errors';
}
