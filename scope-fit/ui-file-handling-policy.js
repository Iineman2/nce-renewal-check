async page => {
  const origin='http://localhost:8765',assertions=[],observations=[],responses=[];let mode=null;
  const need=(ok,cause)=>{if(!ok)throw Error('P5-POLICY:'+cause);};
  const hash=async text=>page.evaluate(async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join(''),text);
  await page.addInitScript(()=>{const W=Worker;window.__policyWorkers=[];window.Worker=class extends W{constructor(url,o){super(url,o);__policyWorkers.push({url:String(url),native:this instanceof W});}};});
  await page.route('**/file-support.mjs',async route=>{
    const response=await route.fetch(),original=await response.text();let body=original;
    if(mode){need(original.includes('authorizedHandling: AUTHORIZED_HANDLING'),'policy anchor');
      const value=mode==='missing'?'undefined':mode==='null'?'null':mode==='clone'?'Object.freeze({...AUTHORIZED_HANDLING})':mode==='empty-glossary'?'Object.freeze({...AUTHORIZED_HANDLING,glossary:Object.freeze([])})':mode==='sparse-glossary'?'Object.freeze({...AUTHORIZED_HANDLING,glossary:Object.freeze(new Array(6))})':mode==='altered-prose'?'Object.freeze({...AUTHORIZED_HANDLING,glossary:Object.freeze(AUTHORIZED_HANDLING.glossary.map((x,i)=>i?x:Object.freeze({...x,definition:"Remote processing allowed"})))})':mode==='extra-field'?'Object.freeze({...AUTHORIZED_HANDLING,upload:true})':mode==='remote'?'Object.freeze({...AUTHORIZED_HANDLING,remoteProcessing:true})':'Object.freeze({...AUTHORIZED_HANDLING,version:"foreign-selection-v0"})';
      body=body.replace('authorizedHandling: AUTHORIZED_HANDLING','authorizedHandling: '+value);
    }
    responses.push({mode:mode??'current',url:route.request().url(),status:response.status(),originalSha256:await hash(original),executedSha256:await hash(body),transformed:body!==original});await route.fulfill({response,body});
  });
  const text='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  for(const kind of ['missing','foreign','remote','null','clone','empty-glossary','sparse-glossary','altered-prose','extra-field']){
    mode=kind;await page.goto(origin+'/');await page.locator('#runtime-warning').waitFor({state:'visible'});
    await page.locator('#pax-file').setInputFiles({name:'original.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    const after=await page.evaluate(async()=>({workers:__policyWorkers,files:['pax-file','halo-file'].map(id=>document.getElementById(id).files.length),originals:document.querySelectorAll('.save-original').length,results:document.getElementById('record-result').textContent,info:document.getElementById('record-info').textContent,state:(await import('/bounded-reader.mjs')).processingState()}));
    need(after.workers.length===0&&after.files.every(x=>x===0)&&after.originals===0&&after.results===''&&after.info===''&&after.state.activeJobs===0&&after.state.reservedBytes===0&&after.state.cachedSources===0,'mixed declaration admitted evidence');observations.push({kind,after});assertions.push('P5-POLICY-'+kind.toUpperCase());
  }
  mode=null;await page.goto(origin+'/');await page.locator('#file-support-contract dd').last().waitFor({state:'attached'});await page.locator('#pax-file').setInputFiles({name:'original.csv',mimeType:'text/csv',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.querySelector('#case-choice option[value="1"]:not([disabled])')&&document.getElementById('cancel-case-finder').hidden);const good=await page.evaluate(()=>({workers:__policyWorkers,originals:document.querySelectorAll('.save-original').length,healthy:document.getElementById('runtime-warning').hidden}));need(good.healthy&&good.workers.length===1&&good.workers[0].native&&good.originals===1,'current declaration positive flow');observations.push({kind:'current',good});assertions.push('P5-POLICY-CURRENT');
  return 'PASS: F13P5-POLICY:'+JSON.stringify({assertions,observations,responses,controlledModuleTransform:true});
}
