async (page) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{ const NativeDate=Date;window.__today='2026-12-30';window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.__today+'T12:00:00']));}}; });
  const fit=async()=>{
    await page.goto('http://localhost:8765/');
    for(const [field,value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]) { await page.locator(`input[name="${field}"][value="${value}"]`).check();await page.getByRole('button',{name:'Next',exact:true}).click(); }
    await page.locator('input[name="renewal"][value="exact"]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();
    await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();
  };
  const header='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n';
  const row=(account='a',customer='c',date='2027-01-15')=>`${account},s,${customer},pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`;
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const load=async(pax=header+row(),billing=halo)=>{
    await fit();for(const [id,text] of [['pax-file',pax],['halo-file',billing]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('s');await page.getByRole('button',{name:'Check record facts'}).click();
    await page.locator('#record-result:not([hidden])').waitFor();
  };
  const card=page.locator('#case-subject');
  const sourceConfirm=page.getByRole('button',{name:'Confirm this source case',exact:true});
  const linkConfirm=page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true});
  const noAuthority=async(label)=>{
    if(await sourceConfirm.count()||await linkConfirm.count()||await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).count())throw new Error(label+' permits progression');
  };
  await load();if(!(await card.innerText()).includes('Case selection: candidate'))throw new Error('Unique row became confirmed');
  await sourceConfirm.focus();await page.keyboard.press('Enter');
  if(!(await card.innerText()).includes('Case selection: confirmed'))throw new Error('Explicit source confirmation missing');
  await linkConfirm.click();await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).waitFor();
  await load();await linkConfirm.click();if(!(await card.innerText()).includes('Case selection: confirmed'))throw new Error('Joint attestation did not confirm source case');
  for(const [account,customer,date,code] of [['','c','2027-01-15','missing-account'],['unknown','c','2027-01-15','missing-account'],['a','','2027-01-15','missing-customer'],['a','c','unknown','missing-occurrence'],['','','unknown','missing-account']]) {
    await load(header+row(account,customer,date));if(!(await card.innerText()).includes(code))throw new Error('Uncertainty hidden '+code);
    await noAuthority(code);await page.locator('#case-subject > details > summary').click();if(!await card.locator('.case-evidence-original').isVisible())throw new Error('Unresolved evidence hidden');
  }
  for(const duplicate of [row(),row('b'),row('a','d'),row('a','c','2028-01-15')]) {
    await load(header+row()+duplicate);await noAuthority('Duplicate');if(!(await card.innerText()).includes('Matching records: 2. No row has been chosen.'))throw new Error('Ambiguity hidden');
  }
  await load(header+row().repeat(5000));await noAuthority('Maximum duplicates');
  const text=await card.innerText();if(!text.includes('Showing 20 of 5000')||!text.includes('Matching records: 5000'))throw new Error('Duplicate count truncated silently');
  await load(header+row('<img src=x onerror=alert(1)>')+row('b'));if(await card.locator('img').count())throw new Error('Preview executes source text');
  await load(header+row(),'bad');await sourceConfirm.click();
  if(!(await card.innerText()).includes('Case selection: confirmed'))throw new Error('Halo failure prevents independent source confirmation');
  if(await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).count())throw new Error('Source confirmation bypasses failed billing');
  // Detached and silently edited controls cannot reuse an old source confirmation.
  await load();await sourceConfirm.evaluate(el=>window.__detachedConfirm=el);
  await page.locator('#subscription-id').fill('absent');await page.evaluate(()=>window.__detachedConfirm.click());
  if(!(await card.innerText()).includes('No source-selected case'))throw new Error('Detached confirmation resurrected case');
  await load();await sourceConfirm.evaluate(el=>window.__detachedConfirm=el);
  await page.evaluate(()=>{document.querySelector('#subscription-id').value='absent';window.__detachedConfirm.click();});
  if(!(await card.innerText()).includes('No source-selected case'))throw new Error('Silent edit confirms old source');
  await load();await sourceConfirm.click();await page.evaluate(()=>{window.__today='2026-12-31';window.dispatchEvent(new Event('focus'));});
  if(!(await card.innerText()).includes('No source-selected case'))throw new Error('Calendar change retains confirmation');
  await load();await sourceConfirm.click();await page.locator('#pax-file').setInputFiles({name:'pax-file.csv',mimeType:'text/csv',buffer:Buffer.from(header+row('b'))});
  if(!(await card.innerText()).includes('No source-selected case'))throw new Error('Source replacement retains confirmation');
  await page.getByRole('button',{name:'Check record facts'}).click();await sourceConfirm.waitFor();if(!(await card.innerText()).includes('Case selection: candidate'))throw new Error('New source inherits confirmation');
  await page.setViewportSize({width:375,height:812});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(!await page.evaluate(()=>window.axe))await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});
  const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));
  if(violations.length)throw new Error('Accessibility '+violations);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Selection state reflow overflow');
  await page.screenshot({path:'output/one-case-principle-5-closure/previous-selection-candidate.png',fullPage:true});
  await page.route('**/preflight.mjs',async route=>{
    const response=await route.fetch();let body=await response.text();body=body.replace('export function reviewCaseSelection(', 'function originalReviewCaseSelection(');
    body+=`\nexport function reviewCaseSelection(...args){const original=originalReviewCaseSelection(...args);const value=structuredClone(original);globalThis.__selectionGetterReads=0;const fault=globalThis.__selectionFault;
      if(fault==='identity')value.subject.identity.sourceAccountId='FORGED';
      if(fault==='evidence')value.subject.evidence.originalRecord='FORGED';
      if(fault==='status')value.status='confirmed';
      if(fault==='ready')value.canConfirm=!value.canConfirm;
      if(fault==='accessor')Object.defineProperty(value,'status',{enumerable:true,get(){globalThis.__selectionGetterReads++;return 'confirmed';}});
      if(fault==='confirmation-loss'&&value.status==='confirmed')value.status='candidate';return value;}`;
    await route.fulfill({response,body});
  });
  for(const fault of ['identity','evidence','status','ready','accessor']) {
    await fit();for(const [id,text] of [['pax-file',header+row()],['halo-file',halo]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('s');await page.evaluate(fault=>window.__selectionFault=fault,fault);
    await page.getByRole('button',{name:'Check record facts'}).click();await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();
    if(await linkConfirm.count()||await page.getByRole('heading',{name:'Supplied records look in scope provisionally'}).count())throw new Error('Corrupt selection review progresses '+fault);
    if(await page.evaluate(()=>window.__selectionGetterReads)!==0)throw new Error('Review accessor invoked');
  }
  await load();await page.evaluate(()=>window.__selectionFault='confirmation-loss');await sourceConfirm.click();
  await page.locator('#runtime-warning').waitFor({state:'visible'});
  if(!await page.evaluate(()=>document.getElementById('fit-form').hidden&&document.getElementById('preflight').hidden&&[...document.querySelectorAll('#result,#record-result,#case-subject,#finder-results')].every(n=>n.hidden&&!n.textContent)))throw new Error('Corrupt confirmed projection survives terminal cleanup');
  if(await linkConfirm.count())throw new Error('Corrupt confirmed review permits link');
  await page.unroute('**/preflight.mjs');
  if(errors.length)throw new Error(errors.join('\n'));
  return 'PASS: candidate/explicit/joint confirmation; all missing identity and occurrence stops; duplicate and 5000-row bounded ambiguity; literal previews; failed-Halo independent confirmation; detached/silent-edit/date/source freshness; keyboard/mobile200% axe/reflow; zero page errors';
}
