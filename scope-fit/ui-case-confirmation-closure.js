async page => {
  const passed=[];
  await page.addInitScript(()=>{const D=Date;window.__today='2026-12-30';window.Date=class extends D{constructor(...args){super(...(args.length?args:[window.__today+'T12:00:00']));}}});
  const source='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  async function load(){
    await page.goto('http://localhost:8765/');
    for(const [name,value] of [['reseller','yes'],['distributor','pax8'],['billing','halopsa'],['commitment','annual-m365-nce']]){await page.locator(`input[name="${name}"][value="${value}"]`).check();await page.getByRole('button',{name:'Next',exact:true}).click();}
    await page.locator('input[name="renewal"][value="exact"]').check();await page.locator('#renewal-date').fill('2027-01-15');await page.getByRole('button',{name:'Check fit',exact:true}).click();
    await page.getByRole('radio',{name:'Annual commitment',exact:true}).check();await page.getByRole('radio',{name:'Yes',exact:true}).check();
    for(const [id,text] of [['pax-file',source],['halo-file',halo]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await page.locator('#subscription-id').fill('s');await page.getByRole('button',{name:'Check record facts',exact:true}).click();await page.getByRole('button',{name:'Confirm this source case',exact:true}).waitFor();
  }
  async function assertStopped(label){
    if((await page.locator('#case-subject').textContent()).includes('Case selection: confirmed'))throw Error('Stale confirmation survived: '+label);
    if(await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).count())throw Error('Stale positive survived');
  }
  for(const mode of ['aria-hidden','hidden','inert','display','visibility','opacity','line-height','css','clip-path','mask-image','child-css','ancestor-replaced']){
    await load();
    await page.evaluate(mode=>{
      const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm this source case');
      const ancestor=document.getElementById('preflight');
      if(mode==='css'){const style=document.createElement('style');style.textContent='#case-subject{display:none}';document.head.append(style);}
      else if(mode==='clip-path')document.getElementById('case-subject').style.clipPath='inset(100%)';
      else if(mode==='mask-image')document.getElementById('case-subject').style.maskImage='linear-gradient(transparent,transparent)';
      else if(mode==='child-css'){const style=document.createElement('style');style.textContent='#case-subject p{display:none}';document.head.append(style);}
      else if(mode==='ancestor-replaced'){const fresh=ancestor.cloneNode(false);fresh.replaceChildren(...ancestor.childNodes);ancestor.replaceWith(fresh);}
      else if(['aria-hidden','hidden','inert'].includes(mode))ancestor.setAttribute(mode,mode==='aria-hidden'?'true':'');
      else ancestor.style.setProperty(mode,mode==='display'?'none':mode==='visibility'?'hidden':'0');
      button.click();
    },mode);
    await assertStopped(mode);passed.push('visibility-'+mode);
  }
  const mutations={selector:'document.getElementById("subscription-id").value="other";',file:'const dt=new DataTransfer();dt.items.add(new File(["changed"],"replacement.csv"));document.getElementById("pax-file").files=dt.files;',evidence:'document.getElementById("case-subject").querySelector("p").textContent="changed";',date:'window.__today="2026-12-31";',questionnaire:'document.getElementById("renewal-date").value="2028-01-15";',finder:'document.getElementById("case-query").value="other";',revoked:'revokeCaseSelectionConfirmation(receipt);',forged:'revokeCaseSelectionConfirmation(receipt);return structuredClone(receipt);'};
  for(const [mode,mutation] of Object.entries(mutations))for(const action of mode==='finder'?['source']:['source','joint']){
    await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('export function confirmCaseSelection(','function realConfirmCaseSelection(');body+=`\nexport function confirmCaseSelection(...args){const receipt=realConfirmCaseSelection(...args);globalThis.__issued={receipt,text:args[0],id:args[1]};${mutation}return receipt;}`;await route.fulfill({response,body,headers:{...response.headers(),'cache-control':'no-store'}});});
    await load();
    if(mode==='finder'){await page.locator('#load-case-finder').click();await page.locator('.case-finder-row button').first().click();}
    await page.getByRole('button',{name:action==='source'?'Confirm this source case':'I checked this subscription, line, and customer in the original systems',exact:true}).click();
    await assertStopped(mode+'-'+action);
    const status=await page.evaluate(async()=>{const m=await import('./preflight.mjs');const r=window.__issued;return m.reviewCaseSelection(r.text,r.id,r.receipt).status;});
    if(status!=='candidate')throw Error('New stale receipt was not revoked');
    passed.push('commit-'+mode+'-'+action);await page.unroute('**/preflight.mjs');
  }
  await page.route('**/preflight.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text(),headers:{...response.headers(),'cache-control':'no-store'}});});
  await load();await page.getByRole('button',{name:'Confirm this source case',exact:true}).click();
  if(!(await page.locator('#case-subject').textContent()).includes('Case selection: confirmed'))throw Error('Valid confirmation rejected');
  await page.locator('#case-subject > details > summary').click();await page.screenshot({path:'output/one-case-principle-6-closure/confirmation.png',fullPage:true});passed.push('valid-recovery');
  return 'PASS: P6C-BROWSER-ASSERTIONS:'+JSON.stringify({source:'scope-fit/ui-case-confirmation-closure.js',assertions:passed});
}
