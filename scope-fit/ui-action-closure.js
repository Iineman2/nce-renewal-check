async (page) => {
  let scenarios = 0;
  const checks = [];
  const axe = async (name) => {
    if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});
    const violations = await page.evaluate(async () => (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(x=>x.id));
    if(violations.length)throw new Error(`${name}: ${violations}`); checks.push(name);
  };
  const focus = async id => { const actual=await page.evaluate(()=>document.activeElement.id);if(actual!==id)throw new Error(`Expected ${id}, focused ${actual}`); };
  const fit = async (reseller='We manage and resell it for a customer', distributor='Pax8') => {
    await page.goto('http://localhost:8765/');
    for(const name of [reseller,distributor,'HaloPSA','Annual commitment for seat-based Microsoft 365 NCE (may be billed monthly)']){
      await page.getByRole('radio',{name,exact:true}).check();await page.getByRole('button',{name:'Next',exact:true}).click();
      if(await page.locator('#result').isVisible())return;
    }
    const date=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+14);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
    await page.getByRole('radio',{name:'I know the date',exact:true}).check();await page.locator('#renewal-date').fill(date);await page.getByRole('button',{name:'Check fit',exact:true}).click();return date;
  };
  const rows = date => ({pax:`source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\nsynthetic-account,s,c,pax8,Microsoft 365,NCE,yes,annual,${date},renew\n`,halo:'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n'});
  const files = async (pax,halo) => {
    for(const [id,text] of [['pax-file',pax],['halo-file',halo]])await page.locator(`#${id}`).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('s');
    await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();
  };
  const check = async heading => {await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.getByRole('heading',{name:heading,exact:true}).waitFor();};
  const confirm = async heading => {await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems'}).click();await page.getByRole('heading',{name:heading,exact:true}).waitFor();};
  const positive = async () => {await check('Confirm these records describe the same case');await confirm('Supplied records look in scope provisionally');};

  // Independently break each input; repair must reach the right file and yield a new result.
  for(const id of ['pax-file','halo-file']){
    const date=await fit();const r=rows(date);await files(id==='pax-file'?'broken\nvalue\n':r.pax,id==='halo-file'?'broken\nvalue\n':r.halo);
    await check('Repair the supplied input');await axe(`malformed-${id}`);
    await page.getByRole('button',{name:'Correct the supplied input'}).click();await focus(id);
    await page.locator(`#${id}`).setInputFiles({name:'fixed.csv',mimeType:'text/csv',buffer:Buffer.from(id==='pax-file'?r.pax:r.halo)});
    if(await page.locator('#record-result').isVisible())throw new Error('Stale error after file replacement');await positive();scenarios++;
  }
  const date=await fit();const r=rows(date);
  await files(r.pax+r.pax.split('\n')[1]+'\n',r.halo);await check('Select one subscription');
  await page.getByRole('button',{name:'Replace or correct supplied records'}).click();await focus('pax-file');await axe('duplicate-pax');
  await page.locator('#pax-file').setInputFiles({name:'fixed.csv',mimeType:'text/csv',buffer:Buffer.from(r.pax)});await positive();scenarios++;

  // No match differs from duplicate, and still offers ID correction alongside file repair.
  await page.locator('#subscription-id').fill('absent');await check('Select one subscription');
  await page.getByRole('button',{name:'Correct subscription ID'}).click();await focus('subscription-id');
  await page.locator('#subscription-id').fill('s');
  await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();await positive();scenarios++;

  await fit("I'm not sure",'Another distributor or Microsoft directly');
  if(!await page.getByText('Confirm who holds the Microsoft 365 subscription commitment for this customer.',{exact:true}).isVisible())throw new Error('Earlier answered uncertainty lost');
  await axe('early-mixed');scenarios++;

  // Invalid IDs on each source and ambiguous customer linkage need different controls.
  for(const [which,pax,halo,id] of [['pax',r.pax.replace('s,c,','s,,'),r.halo,'pax-file'],['halo',r.pax,r.halo.replace('l,s,c,',',s,c,'),'halo-file'],['both',r.pax,r.halo.replace(',c,',',different,'),'pax-file']]){
    await fit();await files(pax,halo);await check('Confirm the record link');
    await page.getByRole('button',{name:which==='both'?'Review or replace Pax8 CSV':'Replace or correct supplied records'}).click();await focus(id);
    if(which==='both'){await page.getByRole('button',{name:'Review or replace HaloPSA CSV'}).click();await focus('halo-file');}
    await axe(`link-${which}`);await files(r.pax,r.halo);await positive();scenarios++;
  }

  // Adversarial words must not redirect a Pax8 data issue into other sources/answers.
  for(const word of ['agreement','HaloPSA','next term']){
    await fit();await files(r.pax.replace('end_of_term_state\n','end_of_term_state,billing_frequency\n').replace(',renew\n',`,renew,${word}\n`),r.halo);
    await check('Confirm these records describe the same case');await confirm('More evidence is needed');
    const text=await page.locator('#record-next-action').innerText();if(!text.includes('Original Pax8'))throw new Error(`Wrong source for ${word}`);
    await page.getByRole('button',{name:'Update the item to verify'}).click();await focus('pax-file');
    await files(r.pax,r.halo);await positive();scenarios++;
  }

  // Direct correction for every supported family of outside source causes.
  for(const [field,oldValue,newValue] of [['distributor','pax8','other'],['product_family','Microsoft 365','Azure'],['commerce_model','NCE','legacy'],['seat_based','yes','no'],['commitment_term','annual','monthly']]){
    await fit();await files(r.pax.replace(`,${oldValue},`,`,${newValue},`),r.halo);await check('Confirm these records describe the same case');await confirm('Resolve conflicting claims');
    await page.getByRole('button',{name:`Use supplied Pax8 value for ${field==='distributor'?'distributor':'commitment'}`,exact:true}).click();
    await page.getByRole('heading',{name:'Supplied information indicates outside this release'}).waitFor();
    await page.getByRole('button',{name:'Correct the outside-scope item'}).click();await focus('pax-file');
    await files(r.pax,r.halo);await positive();scenarios++;
  }
  await fit();await files(r.pax,r.halo.replace('HaloPSA','other'));await check('Confirm these records describe the same case');await confirm('Resolve conflicting claims');
  await page.getByRole('button',{name:'Use supplied HaloPSA value for billing',exact:true}).click();
  await page.getByRole('button',{name:'Correct the outside-scope item'}).click();await focus('halo-file');await files(r.pax,r.halo);await positive();scenarios++;
  for(const end of ['cancel','extended']){
    await fit();await files(r.pax.replace(',renew\n',`,${end}\n`),r.halo);await check('Confirm these records describe the same case');await confirm('Supplied information indicates outside this release');
    await page.getByRole('button',{name:'Correct the outside-scope item'}).click();await focus('pax-file');await files(r.pax,r.halo);await positive();scenarios++;
  }
  for(const name of ['Monthly commitment','Another term or product']){
    await fit();await files(r.pax,r.halo);await page.getByRole('radio',{name,exact:true}).check();await check('Confirm these records describe the same case');await confirm('Supplied information indicates outside this release');
    await page.getByRole('button',{name:'Correct the outside-scope item'}).click();
    if(!await page.locator('input[name="renewalTerm"]').first().evaluate(el=>el===document.activeElement))throw new Error('Next-term repair target wrong');
    await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await positive();scenarios++;
  }

  // Agreement changes/reset recompute the dependent fit without hiding record controls.
  await fit();await page.getByRole('radio',{name:'I need to find it',exact:true}).check();
  await page.getByRole('heading',{name:'May fit — verify these items'}).waitFor();
  if(!await page.locator('#preflight').isVisible())throw new Error('Agreement change hid record controls');
  await page.getByRole('button',{name:'Update agreement availability'}).click();
  if(!await page.locator('input[name="agreement"]').first().evaluate(el=>el===document.activeElement))throw new Error('Agreement target wrong');
  await page.getByRole('button',{name:'Clear files and result',exact:true}).click();await page.getByRole('heading',{name:'Answers look in scope'}).waitFor();scenarios++;
  await files(r.pax,r.halo);await page.getByRole('radio',{name:"I'm not sure",exact:true}).last().check();await check('Confirm these records describe the same case');await confirm('More evidence is needed');
  await page.getByRole('button',{name:'Update the item to verify'}).click();
  if(!await page.locator('input[name="agreement"]').first().evaluate(el=>el===document.activeElement))throw new Error('Record agreement target wrong');
  await page.locator('#record-next-action').screenshot({path:'output/playwright/principle-7-next-action.png'});
  await page.locator('#record-result summary').filter({ hasText: 'If I cannot obtain or verify the evidence' }).click();
  if(!await page.locator('#record-result').getByText(/Keep this case unresolved/).isVisible())throw new Error('No feasible unavailable-evidence stop');await axe('agreement-unavailable');scenarios++;

  await page.setViewportSize({width:320,height:740});await page.addStyleTag({content:':root {font-size:200%;}'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw new Error('Zoomed mobile result overflows');
  await axe('zoomed-mobile');await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await axe('forced-colors');
  await page.screenshot({path:'output/playwright/principle-7-recovery-mobile.png',fullPage:true});
  return `PASS: ${scenarios} cause-specific repair/recheck scenarios; ${checks.length} zero-violation axe states; mobile zoom/forced colors; unavailable-evidence stop`;
}
