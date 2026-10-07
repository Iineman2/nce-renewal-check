async page => {
  const assertions=[],measurements=[],errors=[];
  let phase='startup';try{
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript({content:await(await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text()});
  await page.addInitScript(()=>{const D=Date;window.__date='2026-12-30T12:00:00';window.Date=class extends D{constructor(...a){super(...(a.length?a:[window.__date]));}};});
  const pax='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const need=(v,m)=>{if(!v)throw Error(m);},fresh=()=>page.goto('http://localhost:8765/');
  const file=(id,text)=>page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  const ready=async()=>{await fresh();await file('halo-file',halo);await file('pax-file',pax);await page.waitForFunction(()=>document.querySelector('#case-choice option[value="1"]:not([disabled])')&&document.getElementById('cancel-case-finder').hidden);await page.locator('#case-choice').selectOption('1');await page.getByRole('button',{name:'Check records',exact:true}).click();await page.waitForFunction(()=>document.getElementById('read-status').hidden&&!document.getElementById('record-result').hidden);};
  const info=()=>page.locator('#open-evidence').click(),back=()=>page.locator('#close-evidence').click();
  const healthy=async()=>need(!await page.locator('#runtime-warning').isVisible(),'Canonical information falsely halted');
  const halted=async()=>{await page.waitForFunction(()=>!document.getElementById('runtime-warning').hidden);need(await page.locator('.save-original').count()===0&&await page.locator('#record-info').textContent()===''&&await page.locator('#preflight').isHidden(),'Tampered information retained authority');};
  // Native disclosure state changes are legitimate; claims retain exact identity across views.
  await ready();await info();const title=await page.locator('#record-info h3').textContent();await page.locator('#record-info details').evaluateAll(ns=>ns.forEach(n=>n.open=true));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await healthy();await back();await info();need(await page.locator('#record-info h3').textContent()===title,'Roundtrip changed canonical claims');await back();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await info();need(await page.locator('#record-info h3').textContent()==='More evidence is needed','Omitted reseller gained scope authority');await back();await info();await healthy();assertions.push('F13P3-I01-positive-disclosure-roundtrip');
  for(const visible of[false,true])for(const kind of['heading','caveat','trail','extra','attribute','clone','duplicate-result','move-result']){
    await ready();if(visible)await info();
    await page.evaluate(kind=>{const i=document.getElementById('record-info'),r=document.getElementById('record-result');if(kind==='heading')i.querySelector('h3').textContent='Authenticated and eligible';if(kind==='caveat')i.querySelector('[data-record-projection=caveat]').textContent='Financial action authorized';if(kind==='trail')i.querySelector('.claim-trail-row p').textContent='Forged source';if(kind==='extra')i.append(document.createElement('p'));if(kind==='attribute')i.querySelector('h3').setAttribute('aria-label','Approved');if(kind==='clone'){const n=i.querySelector('h3');n.replaceWith(n.cloneNode(true));}if(kind==='duplicate-result')r.after(r.cloneNode(true));if(kind==='move-result')document.body.append(r);window.dispatchEvent(new Event('focus'));},kind);
    await halted();assertions.push('F13P3-I02-'+(visible?'visible':'hidden')+'-'+kind);
  }
  // Subject-owned budgets are checked before source-view cloning, even inside the action's synchronous boundary.
  for(const kind of['ownedElements','ownedNodes','units']){
    phase='subject-budget-'+kind;
    await ready();const probe=await page.evaluate(async kind=>{const root=document.getElementById('case-subject'),check=(await import('/resource-packet.mjs')).assertPresentationBudget,counts=check(root),limit={ownedElements:1500,ownedNodes:3000,units:4000000},clone=Node.prototype.cloneNode;window.__subjectUnsafe=0;Node.prototype.cloneNode=function(...a){if(this===root)try{check(root);}catch{__subjectUnsafe++;}return clone.apply(this,a);};if(kind==='units')root.append(document.createTextNode('x'.repeat(limit.units+1-counts.units)));else{const f=document.createDocumentFragment();for(let i=counts[kind];i<=limit[kind];i++)f.append(kind==='ownedElements'?document.createElement('i'):document.createComment(''));root.append(f);}document.querySelector('#record-result button').click();return{unsafe:__subjectUnsafe};},kind);
    await page.waitForFunction(()=>document.getElementById('record-result').hidden&&document.getElementById('case-subject').textContent.includes('No source-selected case.')&&!document.querySelector('#case-subject .case-source-inspector'),{},{timeout:4000});need(probe.unsafe===0&&await page.locator('#record-info').textContent()==='','Subject cloned or retained claims after resource rejection '+kind);assertions.push('F13P3-I06-subject-budget-'+kind);
  }
  // Silent native control/date changes use ordinary freshness invalidation before reveal.
  for(const kind of['id','file','date']){
    await ready();const stale=await page.locator('#record-result button').first().elementHandle();
    await page.evaluate(({kind,pax})=>{if(kind==='id')document.getElementById('subscription-id').value='foreign';if(kind==='file'){const d=new DataTransfer();d.items.add(new File([pax],'changed.csv'));document.getElementById('pax-file').files=d.files;}if(kind==='date')window.__date='2026-12-31T12:00:00';},{kind,pax});
    await info();need(await page.locator('#record-info').textContent()===''&&await page.locator('#record-result').isHidden(),'Stale comparison revealed '+kind);await stale.evaluate(n=>n.click());need(await page.locator('#record-result').isHidden(),'Saved stale attestation revived claims');assertions.push('F13P3-I03-freshness-'+kind);
  }
  // Pending navigation/reset/removal all stop actual busy native Workers; no late custody.
  for(const action of['guide','evidence','pagehide','reset','remove','replace']){
    await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:"File.prototype.arrayBuffer=function(){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});};\n"+await response.text()});});
    await fresh();await file('pax-file',pax);await page.waitForFunction(()=>__qcWorkers[0]?.ticks>1);
    await page.evaluate(action=>{
      window.__navigationAcks=[];const seen=new Set();
      const observe=(event)=>{
        const target=event.target.closest?.('[id]'),id=target?.id;let label=null,index=0;
        if(event.type==='click'&&id===({guide:'open-file-guide',evidence:'open-evidence',reset:'clear-records'}[action]))label=action;
        if(event.type==='change'&&id==='pax-file'&&['remove','replace'].includes(action))label=action+'-change';
        if(event.type==='click'&&id==='cancel-case-finder'&&action==='replace'){label='replace-cancel';index=1;}
        if(event.type==='pagehide'&&action==='pagehide')label='pagehide';
        if(!label||seen.has(label))return;seen.add(label);const started=performance.now();
        requestAnimationFrame(()=>__navigationAcks.push({label,index,ms:performance.now()-started,stops:__qcWorkers[index]?.stops??0,ticks:__qcWorkers[index]?.ticks??0,statusHidden:document.getElementById('cancel-case-finder').hidden}));
      };
      for(const type of['click','change','pagehide'])window.addEventListener(type,observe,true);
    },action);
    if(action==='guide')await page.locator('#open-file-guide').click();if(action==='evidence')await info();if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));if(action==='reset')await page.locator('#clear-records').click();if(action==='remove')await page.locator('#pax-file').setInputFiles([]);if(action==='replace'){await file('pax-file',pax.replace(',s,',',new,'));await page.waitForFunction(()=>__qcWorkers.length===2&&__qcWorkers[1].ticks>1);await page.locator('#cancel-case-finder').click();}
    await page.waitForFunction(n=>__navigationAcks.length===n,action==='replace'?2:1);
    const state=await page.evaluate(async()=>({ms:Math.max(...__navigationAcks.map(v=>v.ms)),ackTimings:__navigationAcks,workers:__qcWorkers.map(w=>({...w})),state:(await import('/bounded-reader.mjs')).processingState(),copies:document.querySelectorAll('.save-original').length,claims:document.getElementById('record-info').textContent}));
    need(state.ackTimings.length===(action==='replace'?2:1)&&state.ackTimings.every(v=>Number.isFinite(v.ms)&&v.ms>=0&&v.ms<=250&&v.stops===1&&v.ticks>1)&&state.workers.every(w=>w.stops===1)&&!state.state.activeJobs&&!state.state.reservedBytes&&!state.copies&&!state.claims,'Pending transition leaked work or missed cancellation acknowledgement '+action+JSON.stringify(state));await page.waitForTimeout(100);need(JSON.stringify(await page.evaluate(()=>__qcWorkers.map(w=>w.ticks)))===JSON.stringify(state.workers.map(w=>w.ticks)),'Pending transition native work continued');measurements.push({action,...state});assertions.push('F13P3-I04-pending-'+action);await page.unroute('**/file-processing-worker.mjs');
  }
  // Hold real main-realm native custody hashing; cancellation rejects promptly but keeps reservation until crypto settles.
  for(const action of['cancel','deadline']){
    await fresh();const result=await page.evaluate(async({pax,action})=>{
      const r=await import('/bounded-reader.mjs'),e=await import('/file-evidence.mjs'),s=(await import('/actions.mjs')).SOURCES,real=crypto.subtle.digest.bind(crypto.subtle),controller=new AbortController();let release,reached=false;
      crypto.subtle.digest=(algorithm,bytes)=>bytes.byteLength>3?new Promise(resolve=>{reached=true;release=()=>real(algorithm,bytes).then(resolve);}):real(algorithm,bytes);
      const pending=r.readBoundedLocalEvidence(new File([pax],'adopt.csv'),'pax-file',s.pax,action==='deadline'?200:30000,'find-case',controller.signal).then(v=>({published:true,handle:v.handle}),x=>({published:false,name:x.name,message:x.message}));
      const end=performance.now()+3000;while(!reached){if(performance.now()>end)throw Error('Custody digest not reached');await new Promise(resolve=>setTimeout(resolve,1));}
      const start=performance.now();if(action==='cancel')controller.abort();const outcome=await pending,ms=performance.now()-start,held=r.processingState();let sameRoleBlocked=false;try{await r.readBoundedLocalEvidence(new File([pax],'same.csv'),'pax-file',s.pax);}catch{sameRoleBlocked=true;}
      crypto.subtle.digest=real;release();while(r.processingState().activeJobs){if(performance.now()>end)throw Error('Custody reservation never settled');await new Promise(resolve=>setTimeout(resolve,1));}
      const retry=await r.readBoundedLocalEvidence(new File([pax],'retry.csv'),'pax-file',s.pax);const good=!retry.problem;e.releaseFileEvidence(retry.handle);return{reached,outcome,ms,held,sameRoleBlocked,good,state:r.processingState(),workers:__qcWorkers};
    },{pax,action});need(result.reached&&!result.outcome.published&&result.ms<=250&&result.held.activeJobs===1&&result.held.reservedBytes===Buffer.byteLength(pax)&&result.sameRoleBlocked&&result.good&&!result.state.activeJobs&&!result.state.reservedBytes&&!result.state.cachedSources&&result.workers.every(w=>w.stops===1),'Native custody reservation dishonest '+JSON.stringify(result));measurements.push({action:'adoption-'+action,...result});assertions.push('F13P3-I05-native-custody-'+action);
  }
  if(errors.length)throw Error(errors.join('\n'));return 'PASS: F13P3-INFORMATION:'+JSON.stringify({assertions,measurements,scope:'current local controls/information lifecycle and actual native Worker/custody probes'});
  }catch(error){throw Error(error.message+' phase='+phase+' passed='+JSON.stringify(assertions)+' state='+JSON.stringify(await page.evaluate(()=>({warning:document.getElementById('runtime-warning').hidden,result:document.getElementById('record-result').hidden,subject:document.getElementById('case-subject').hidden,subjectNodes:document.getElementById('case-subject').childNodes.length,info:document.getElementById('record-info').textContent.slice(0,100)}))));}
}
