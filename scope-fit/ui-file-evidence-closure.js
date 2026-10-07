async page => {
  const passed=[], downloads=[], requests=[], errors=[], logs=[], downloadEvents=[], workerPrivacy=[];
  try {
  page.on('download',d=>downloadEvents.push(d.suggestedFilename()));
  page.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>logs.push(m.type()));
  await page.exposeFunction('__recordEvidencePrivacy',operation=>workerPrivacy.push(operation));
  const head='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state,scheduled_commitment_term';
  const pax=head+'\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2026-10-15,renew,annual\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const bytes=x=>Buffer.isBuffer(x)?x:Buffer.from(x), original=r=>page.locator('#original-'+r), short=r=>r==='pax-file'?'pax':'halo';
  const hash=async data=>page.evaluate(async values=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(values)))).map(n=>n.toString(16).padStart(2,'0')).join(''),Array.from(data));
  // Route the real module Worker. Configure/release messages are consumed by this
  // fixture before the unchanged production request reaches its native handler.
  const workerPreamble=String.raw`
const fixturePost=self.postMessage.bind(self), fixtureHeld=[];
let fixtureMode='',fixtureRole=null,fixtureScope=null;
const fixtureSignal=(kind,extra={})=>fixturePost({__f13WorkerFixture:1,kind,mode:fixtureMode,role:fixtureRole,native:self instanceof WorkerGlobalScope&&!('document' in self),...extra});
self.addEventListener('message',event=>{const control=event.data?.__f13WorkerControl;if(control==='configure'){event.stopImmediatePropagation();fixtureMode=event.data.mode;fixtureScope=event.data.scope;fixtureRole=event.data.role;fixtureSignal('configured');}else if(control==='release'){event.stopImmediatePropagation();for(const done of fixtureHeld.splice(0))done();}},true);
const fixtureApplies=()=>!fixtureScope||fixtureRole===fixtureScope;
const fixtureHold=run=>{fixtureSignal('held');return new Promise((resolve,reject)=>fixtureHeld.push(()=>Promise.resolve().then(run).then(resolve,reject)));};
const fixtureDigest=crypto.subtle.digest.bind(crypto.subtle);
crypto.subtle.digest=(algorithm,data)=>{if(data.length>3&&fixtureApplies()&&(fixtureMode==='pending-hash'||fixtureMode==='pending-halo'&&fixtureRole==='halo-file'))return fixtureHold(()=>fixtureDigest(algorithm,data));return fixtureDigest(algorithm,data);};
const fixtureRead=File.prototype.arrayBuffer,fixtureText=File.prototype.text;
File.prototype.arrayBuffer=function(){if(fixtureApplies()){if(['stage-hold','pending-read','hold-all'].includes(fixtureMode)||['pending-halo','hold-halo'].includes(fixtureMode)&&fixtureRole==='halo-file')return fixtureHold(()=>fixtureRead.call(this));if(fixtureMode==='byte-reject'){fixtureSignal('reached');return Promise.reject(Error('controlled byte IO'));}if(fixtureMode==='size-disagree'){fixtureSignal('reached');return Promise.resolve(new ArrayBuffer(1));}}return fixtureRead.call(this);};
File.prototype.text=function(){if(fixtureApplies()&&fixtureMode==='text-disagree'){fixtureSignal('reached');return Promise.resolve('forged supplied text');}if(fixtureApplies()&&fixtureMode==='text-reject'){fixtureSignal('reached');return Promise.reject(Error('controlled text IO'));}return fixtureText.call(this);};
const fixtureDecode=TextDecoder.prototype.decode;
TextDecoder.prototype.decode=function(data,...args){if(data?.length>24&&fixtureApplies()){if(fixtureMode==='decoder-mutates'){fixtureSignal('reached');data[0]=0;}if(fixtureMode.startsWith('decoder-')&&fixtureMode!=='decoder-mutates'){fixtureSignal('reached');if(fixtureMode==='decoder-error')throw Error('CONFIDENTIAL supplied source');if(fixtureMode==='decoder-type')throw TypeError('CONFIDENTIAL supplied source');if(fixtureMode==='decoder-zero')throw 0;if(fixtureMode==='decoder-false-text')return 'invented decoded source';if(fixtureMode==='decoder-oversized'){fixtureSignal('altered',{altered:true});return 'a'.repeat(data.length+1);}if(['decoder-unpaired-high','decoder-unpaired-low'].includes(fixtureMode)){const value=fixtureDecode.call(this,data,...args),changed=value.replace('\uFFFD',fixtureMode.endsWith('high')?'\uD800':'\uDC00');fixtureSignal('altered',{altered:changed!==value});return changed;}}}return fixtureDecode.call(this,data,...args);};
for(const [owner,methods]of [[IDBFactory.prototype,['open','deleteDatabase']],[CacheStorage.prototype,['open','delete']]])for(const kind of methods){const old=owner[kind];owner[kind]=function(...args){fixtureSignal('privacy',{operation:kind});return old.apply(this,args);};}
for(const kind of ['log','info','warn','debug','error','table','dir','dirxml','trace']){const old=console[kind];console[kind]=function(...args){fixtureSignal('privacy',{operation:'console.'+kind});return old.apply(this,args);};}
`;
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('self.onmessage = async event =>')||!body.includes('await readLocalEvidence('))throw Error('Native processing worker owner missing');await route.fulfill({response,body:workerPreamble+'\n'+body});});
  await page.addInitScript(()=>{
    const D=Date;window.__date='2026-10-03T12:00:00';window.Date=class extends D{constructor(...args){super(...(args.length?args:[window.__date]));}};
    window.__held=[];window.__fault=null;window.__created=[];window.__revoked=[];window.__writes=[];window.__nativeClicks=0;window.__workerEvents=[];window.__workerRecords=[];window.__workerPrivacy=[];window.__deferredHeldObservations=[];window.__deferHeldObservation=false;const mode='';
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker{
      constructor(url,options){super(url,options);const record={url:String(url),module:options?.type==='module',native:this instanceof NativeWorker,terminated:false};window.__workerRecords.push(record);this.__fixtureRecord=record;this.addEventListener('message',event=>{const data=event.data;if(data?.__f13WorkerFixture!==1)return;event.stopImmediatePropagation();if(data.native!==true)throw Error('Fault did not run inside a native Worker');const observe=()=>{window.__workerEvents.push({...data,receiverId:record.id});if(data.kind==='privacy'){window.__workerPrivacy.push(data.operation);void window.__recordEvidencePrivacy('worker.'+data.operation);}if(data.kind==='held')window.__held.push(()=>NativeWorker.prototype.postMessage.call(this,{__f13WorkerControl:'release'}));if(data.kind==='altered')window.__decoderAltered=data.altered;};if(data.kind==='held'&&data.mode==='hold-all'&&window.__deferHeldObservation){window.__deferredHeldObservations.push(observe);return;}observe();});}
      postMessage(request,...args){if(request?.file instanceof File&&request.protocol){this.__fixtureRecord.role=request.role;this.__fixtureRecord.id=request.id;this.__fixtureRecord.operation=request.operation;NativeWorker.prototype.postMessage.call(this,{__f13WorkerControl:'configure',mode:window.__fixtureArmed?(window.__fault??mode??''):'stage-hold',scope:window.__workerFaultRole??null,role:request.role});}return NativeWorker.prototype.postMessage.call(this,request,...args);}
      terminate(){this.__fixtureRecord.terminated=true;return NativeWorker.prototype.terminate.call(this);}
    };

    const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){__nativeClicks++;return click.call(this);};
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const u=create(blob);__created.push(u);return u;};URL.revokeObjectURL=u=>{__revoked.push(u);return revoke(u);};
    for(const k of ['setItem','removeItem','clear']){const old=Storage.prototype[k];Storage.prototype[k]=function(...args){__writes.push(k);return old.apply(this,args);};}
    window.__release=async()=>{for(const done of __held.splice(0))await done();await new Promise(resolve=>setTimeout(resolve,80));};
  });
  await page.route('**/preflight.mjs',async route=>{
    const response=await route.fetch();let body=await response.text();
    if(!body.includes('export function inspectRecords('))throw Error('Canonical comparison owner missing');
    body=body.replace('export function inspectRecords(','function closureOriginalInspection(');
    body+='\nexport function inspectRecords(...args){const genuine=closureOriginalInspection(...args);if(!globalThis.__semanticFault||!genuine.caseHandoff||genuine.caseHandoff.selection.status!=="confirmed")return genuine;const {caseHandoff,...ordinary}=genuine,d=structuredClone(ordinary);d.caseHandoff=caseHandoff;const fault=globalThis.__semanticFault;function fact(key,value){const f=d.claimReview.fields.find(f=>f.key===key);f.supplied.value=value;if(key==="renewalTerm")d.claimReview.contributors.nextTerm.scheduledClaim=value;else if(key==="endState"){f.effective.value=value;d.claimReview.contributors.endState.value=value;d.endState=value;}else{f.effective.value=value;d.claimReview.scopeInputs[key]=value;d.provenance[key].file=value;d.fileClaims[key]=value;}}if(fault==="renew-cancel")fact("endState","cancel");if(fault==="cancel-renew"||fault==="promotion")fact("endState","renew");if(fault==="promotion"){const i={...args[0],pax8Text:args[0].pax8Text.replace(",cancel,",",renew,")},good=closureOriginalInspection(i);d.status="supplied-claims-look-in-scope";d.errors=[];d.issues.errors=[];d.claimReview.contributors.recordResultStatus=d.status;d.nextAction=good.nextAction;d.nextStep=good.nextStep;}if(fault==="scheduled")fact("renewalTerm","monthly");if(fault==="distributor")fact("distributor","other");if(fault==="billing")fact("billing","other");if(fault==="commitment")fact("commitment","monthly");if(fault==="renewal-date")fact("renewalDate","2026-10-16");if(fault==="economic")d.claimReview.contributors.economicContext.raw[0]="monthly";if(fault==="resolution")d.claimReview.fields[0].reviewChoice="accept-file";if(fault==="unknown")d.claimReview.fields.find(f=>f.key==="endState").effective.value="unknown";globalThis.__mutated=true;return d;}\n';
    await route.fulfill({response,body});
  });
  const fit=async(today='2026-10-03T12:00:00')=>{
    await page.goto('http://localhost:8765/');
    await page.evaluate(value=>{window.__date=value;window.dispatchEvent(new Event('focus'));},today);
    if(await page.locator('#fit-form').count()||!await page.locator('#preflight').isVisible())throw Error('Direct records entry is unavailable');

  };
  const supply=async(r,value,name=short(r)+'-source.csv')=>{await controls();await page.evaluate(()=>window.__fixtureArmed=false);await page.locator('#'+r).setInputFiles({name,mimeType:'application/octet-stream',buffer:bytes(value)});};
  const inputs=async(p=pax,h=halo,names={})=>{await supply('pax-file',p,names.pax);await supply('halo-file',h,names.halo);await page.locator('#subscription-id').fill('s');await controls();await page.locator('#renewal-term').selectOption('annual');await controls();await page.locator('#agreement').selectOption('yes');};
  const controls=async()=>{if(await page.locator('#evidence-panels').isVisible())await page.locator('#close-evidence').click();};
  const info=async()=>{if(await page.locator('#runtime-warning').isVisible())return;if(!await page.locator('#evidence-panels').isVisible())await page.locator('#open-evidence').click();};
  const beginCompare=async()=>{await controls();await page.evaluate(()=>{window.__fixtureArmed=true;window.__held=[];});await page.getByRole('button',{name:'Check records',exact:true}).click();};
  const compare=async()=>{await beginCompare();await page.waitForFunction(()=>document.getElementById('read-status').hidden);await info();};
  const attest=async()=>{await controls();await page.getByRole('button',{name:'I checked this subscription, line, and customer in the original systems',exact:true}).click();await page.waitForFunction(()=>document.getElementById('read-status').hidden);await info();};
  const ready=async(p=pax,h=halo,names={})=>{await fit();await inputs(p,h,names);await compare();await stoppedWorkers();};
  const open=async(r='pax-file')=>{await info();await original(r).evaluate(n=>n.open=true);await original(r).locator('summary').first().scrollIntoViewIfNeeded();};
  const halt=async()=>{await page.evaluate(v=>window.__priorGates=v,passed);await page.waitForFunction(()=>!document.getElementById('runtime-warning').hidden);if(await page.locator('.save-original').count()||await page.locator('#record-result').isVisible()||await page.locator('#preflight').isVisible())throw Error('Terminal fault retained current authority or recovery');};
  const healthy=async()=>{if(await page.locator('#runtime-warning').isVisible())throw Error('Genuine source view was falsely halted');};
  const workerReached=async(mode,role,kind='reached')=>{if(!await page.evaluate(({mode,role,kind})=>__workerEvents.some(event=>event.mode===mode&&event.role===role&&event.kind===kind&&event.native===true),{mode,role,kind}))throw Error('Native worker fault was not reached: '+mode+' '+role);};
  const currentWorker=async(role,operation)=>page.evaluate(({role,operation})=>{const workers=__workerRecords.filter(record=>!record.terminated&&record.role===role&&record.operation===operation);if(workers.length!==1||!workers[0].native||!workers[0].module||!Number.isSafeInteger(workers[0].id))throw Error('Current native request was not reached');return workers[0].id;},{role,operation});
  const heldRequest=(id,mode,role,operation)=>({id,mode,role,operation});
  const waitHeldWorker=async request=>{await page.waitForFunction(({id,mode,role,operation})=>{const record=__workerRecords.find(record=>record.id===id);return record&&!record.terminated&&record.native&&record.module&&record.role===role&&record.operation===operation&&__workerEvents.some(event=>event.receiverId===id&&event.mode===mode&&event.role===role&&event.kind==='held'&&event.native===true);},request);};
  const stoppedWorkers=async()=>{const state=await page.evaluate(async()=>({records:__workerRecords.map(r=>({...r})),events:__workerEvents.map(e=>({...e})),state:(await import('/bounded-reader.mjs')).processingState()}));if(state.state.activeJobs||state.state.reservedBytes||!state.records.length||state.records.some(r=>!r.native||!r.module||!r.terminated||new URL(r.url).pathname!=='/file-processing-worker.mjs')||state.records.some(r=>!state.events.some(e=>e.kind==='configured'&&e.role===r.role&&e.native)))throw Error('Acquisition did not stop its actual native workers');return state;};
  const recover=async(id,r,value)=>{
    await open(r);const pending=page.waitForEvent('download');await original(r).locator('.save-original').click();const d=await pending;
    const path='output/file-compatibility-principle-3/final-artifacts/closure/downloads/'+id+'.bin';await d.saveAs(path);
    const chunks=[],stream=await d.createReadStream();for await(const c of stream)chunks.push(c);const got=Buffer.concat(chunks),expected=bytes(value);
    if(!got.equals(expected)||await d.failure())throw Error('Original recovery changed bytes: '+id);await healthy();
    downloads.push({id,role:r,file:'downloads/'+id+'.bin',byteLength:got.length,sha256:await hash(expected),suggestedFilename:d.suggestedFilename()});
    if(!await page.evaluate(()=>__created.every(u=>__revoked.includes(u))))throw Error('Successful recovery retained URL');
  };
  for(const fault of ['renew-cancel','cancel-renew','promotion','scheduled','distributor','billing','commitment','renewal-date','economic','resolution','unknown']){
    const p=['cancel-renew','promotion'].includes(fault)?pax.replace(',renew,',',cancel,'):pax;
    await ready(p);if(!await page.evaluate(()=>['pax-file','halo-file'].every(role=>__workerRecords.some(record=>record.role===role)&&__workerEvents.some(event=>event.kind==='configured'&&event.role===role&&event.native))))throw Error('Semantic baseline bypassed native Worker acquisition');await controls();
    await page.evaluate(f=>window.__semanticFault=f,fault);await attest();
    await page.getByRole('heading',{name:'The check could not finish',exact:true}).waitFor();
    if(!await page.evaluate(()=>__mutated)||await page.locator('.save-original').count()!==2||(await page.locator('#case-subject').textContent()).includes('Case selection: confirmed'))throw Error('Canonical comparison fault retained a confirmed claim: '+fault);
    await healthy();passed.push('semantic-'+fault);
  }
  for(const r of ['pax-file','halo-file'])for(const fault of ['error','type','zero','false-text']){
    await fit();await inputs();await page.evaluate(({fault,role})=>{window.__fault='decoder-'+fault;window.__workerFaultRole=role;},{fault,role:r});
    await compare();await halt();await workerReached('decoder-'+fault,r);await stoppedWorkers();
    if(fault==='false-text'){
      const p=r==='pax-file'?pax.replace(',c,',',c\uFFFD,'):pax,h=r==='halo-file'?halo.replace(',c,',',c\uFFFD,'):halo;
      await ready(p,h);await healthy();if(await page.locator('.save-original').count()!==2)throw Error('Genuine replacement character lost original custody');
      for(const kind of ['unpaired-high','unpaired-low','oversized']){
        await fit();await inputs(p,h);
        await page.evaluate(({kind,role})=>{window.__decoderAltered=false;window.__fault='decoder-'+kind;window.__workerFaultRole=role;},{kind,role:r});
        await compare();await halt();await workerReached('decoder-'+kind,r);await workerReached('decoder-'+kind,r,'altered');await stoppedWorkers();if(!await page.evaluate(()=>window.__decoderAltered))throw Error('Surrogate decoder fault did not alter actual supplied source');
      }
    }
    passed.push('decoder-'+short(r)+'-'+fault);
  }
  for(const fault of ['same-background','near-opacity','cover','cover-pointer-none','cumulative-opacity','small-font','small-line','image','gradient','text-fill','horizontal','pointer-events','cssom','focus-race']){
    if(fault==='focus-race'){
      await ready();await open('halo-file');
      // Direct entry removes the preceding questionnaire height. Reserve inert
      // scroll space so this positive still reaches the same native viewport edge.
      await page.evaluate(()=>{const space=document.createElement('div');space.style.height='100vh';document.body.append(space);});
      // Scrolling may expose only a subpixel edge of an intact source heading.
      await page.evaluate(()=>{const root=document.getElementById('original-evidence');root.style.paddingTop='.25px';const s=document.querySelector('#original-halo-file > summary'),range=document.createRange();range.selectNodeContents(s);const box=range.getClientRects()[0];window.scrollBy(0,box.top-innerHeight+0.75);const edge=range.getClientRects()[0],height=Math.min(innerHeight,edge.bottom)-Math.max(0,edge.top),width=Math.min(innerWidth,edge.right)-Math.max(0,edge.left);if(!(height>0&&height<1&&width>=1))throw Error('Viewport-edge positive did not exercise a visible subpixel text sliver '+JSON.stringify({height,width,top:edge.top,bottom:edge.bottom,scrollY,maxScroll:document.documentElement.scrollHeight-innerHeight}));window.dispatchEvent(new Event('focusin'));});
      await healthy();await open('halo-file');await healthy();
    }
    if(fault==='cover'){
      // Independent controls: local z-index cannot outrank the source's context.
      for(const behind of ['higher-source','negative-parent','transparent-parent','faint-parent']){
        await ready();await open();await page.evaluate(behind=>{const root=document.getElementById('original-evidence'),b=root.getBoundingClientRect(),parent=document.createElement('div'),cover=document.createElement('div');parent.id='behind-control';if(behind==='higher-source')root.style.cssText='position:relative;z-index:2';else if(behind==='negative-parent')parent.style.cssText='position:relative;z-index:-1';else parent.style.opacity=behind==='transparent-parent'?'0':'.1';cover.style.cssText=`position:fixed;z-index:1;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;background:black;pointer-events:none`;parent.append(cover);document.body.append(parent);window.dispatchEvent(new Event('focus'));},behind);await healthy();await page.locator('#behind-control').evaluate(n=>n.remove());
      }
    }
    await ready();await open();await original('pax-file').locator('.original-record').nth(1).evaluate(n=>n.open=true);
    await page.evaluate(f=>{
      const root=document.getElementById('original-evidence'),text=document.querySelector('#original-pax-file .original-content-identity');
      const rule=value=>{const style=document.createElement('style');document.head.append(style);style.sheet.insertRule('#original-pax-file .original-content-identity{'+value+'}');};
      if(f==='same-background'){root.style.color='white';root.style.backgroundColor='white';}
      if(f==='near-opacity')root.style.opacity='.001';
      if(f.startsWith('cover')){const b=text.getBoundingClientRect(),cover=document.createElement('div');cover.style.cssText=`position:fixed;z-index:999999;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;background:white;${f.endsWith('none')?'pointer-events:none;visibility:visible':''}`;if(f.endsWith('none')){const parent=document.createElement('div');parent.style.visibility='hidden';parent.append(cover);document.body.append(parent);}else document.body.append(cover);}
      if(f==='cumulative-opacity'){root.style.opacity='.95';root.parentElement.style.opacity='.94';}
      if(f==='small-font')rule('font-size:1px');if(f==='small-line')rule('line-height:1px');
      if(f==='image')rule('background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8xkAAAAASUVORK5CYII=")');
      if(f==='gradient')rule('background-image:linear-gradient(black,white)');if(f==='text-fill')rule('-webkit-text-fill-color:transparent');
      if(f==='horizontal')root.style.cssText='position:relative;left:10000px';if(f==='pointer-events')root.style.pointerEvents='none';
      if(f==='cssom'){const style=document.createElement('style');document.head.append(style);style.sheet.insertRule('#original-evidence{opacity:.001}');}
      if(f==='focus-race'){const b=document.querySelector('#original-pax-file .save-original');b.addEventListener('focus',()=>root.style.opacity='.001',{once:true});b.focus();}
      window.dispatchEvent(new Event('focus'));
    },fault);await halt();passed.push('visibility-'+fault);
  }
  for(const r of ['pax-file','halo-file'])for(const fault of ['removed-native-listener','lost-property','suppressed','silent-property','blob-throws','revoke-throws','double-save']){
    await ready();await open(r);const save=original(r).locator('.save-original'),saveNode=await save.elementHandle();
    if(fault==='removed-native-listener'){
      await save.evaluate(n=>{const dummy=()=>{};n.addEventListener('click',dummy);n.removeEventListener('click',dummy);n.removeEventListener('click',n.onclick);if(typeof n.onclick!=='function')throw Error('Save lacks its owned property handler');});
      await recover(short(r)+'-listener',r,r==='pax-file'?pax:halo);
    }else if(fault==='double-save'){await recover(short(r)+'-double-1',r,r==='pax-file'?pax:halo);await recover(short(r)+'-double-2',r,r==='pax-file'?pax:halo);}
    else{
      if(fault==='lost-property'||fault==='silent-property')await save.evaluate((n,f)=>{n.onclick=f==='lost-property'?null:()=>{};},fault);
      if(fault==='suppressed')await save.evaluate(n=>n.addEventListener('click',e=>e.stopImmediatePropagation(),true));
      if(fault==='blob-throws')await page.evaluate(()=>{window.Blob=class{constructor(){throw Error('CONFIDENTIAL supplied bytes');}};});
      if(fault==='revoke-throws')await page.evaluate(()=>{URL.revokeObjectURL=()=>{throw Error('CONFIDENTIAL native URL');};});
      await saveNode.evaluate(n=>n.click());await halt();
    }
    passed.push('action-'+short(r)+'-'+fault);
  }
  const pages='a,b\n'+Array.from({length:11},(_,i)=>`${i},value\n`).join('');
  for(const scenario of ['both-directions','disclosures','keyboard-focus','stale-control']){
    await ready();await supply('pax-file',pages);await compare();await open();await open('halo-file');
    const next=original('pax-file').getByRole('button',{name:'Next Pax8 evidence page',exact:true}),stale=await next.elementHandle();
    await original('halo-file').locator('.original-record').first().evaluate(n=>n.open=true);
    const first=await original('pax-file').locator('.original-record > summary').allTextContents();await next.click();
    if(scenario==='both-directions'){await original('pax-file').getByRole('button',{name:'Previous Pax8 evidence page',exact:true}).click();if(JSON.stringify(await original('pax-file').locator('.original-record > summary').allTextContents())!==JSON.stringify(first))throw Error('Paging did not return exact first page');await ready(pax,pages);await open('halo-file');const hfirst=await original('halo-file').locator('.original-record > summary').allTextContents();await original('halo-file').getByRole('button',{name:'Next HaloPSA evidence page',exact:true}).click();await original('halo-file').getByRole('button',{name:'Previous HaloPSA evidence page',exact:true}).click();if(JSON.stringify(await original('halo-file').locator('.original-record > summary').allTextContents())!==JSON.stringify(hfirst))throw Error('Halo backward paging omitted source records');}
    if(scenario==='disclosures'&&!await original('halo-file').evaluate(n=>n.open&&n.querySelector('.original-record').open))throw Error('Paging erased other source disclosure state');
    if(scenario==='keyboard-focus'){if(!await original('pax-file').getByRole('button',{name:'Next Pax8 evidence page',exact:true}).evaluate(n=>n===document.activeElement))throw Error('Paging lost keyboard focus');await page.keyboard.press('Enter');if(!await original('pax-file').locator('summary').first().evaluate(n=>n===document.activeElement))throw Error('Last page did not restore summary focus');}
    if(scenario==='stale-control'){await stale.evaluate(n=>n.click());await halt();await ready(pax,pages);await open('halo-file');const control=await original('halo-file').getByRole('button',{name:'Next HaloPSA evidence page',exact:true}).elementHandle();await control.evaluate(n=>{n.removeEventListener('click',n.onclick);n.onclick=null;n.click();});await halt();}else await healthy();passed.push('preview-'+scenario);
  }
  const previews={
    'surrogate-excerpt':'x\n"'+('a'.repeat(1022)+'😀')+'"\n',
    'huge-lexeme':'x\n"a"'+('\t'.repeat(16000))+'\n',
    'many-empty-runs':'x\n'+Array.from({length:20},(_,i)=>`\n${i}\n`).join(''),
    'dense-page':Array.from({length:64},(_,i)=>'h'+i).join(',')+'\n'+Array.from({length:5},()=>Array.from({length:64},()=> '😀'.repeat(32)).join(',')).join('\n')+'\n',
    'partial-boundary':'x\n1\n2\n3\n4\n"unterminated',
    'long-filename':pax,
  };
  for(const [scenario,text]of Object.entries(previews)){
    const name=scenario==='long-filename'?'x'.repeat(6000)+'😀\u202e.csv':undefined;
    await ready(text,halo,{pax:name});await open();await original('pax-file').locator('.original-record').last().evaluate(n=>n.open=true);
    const content=await original('pax-file').textContent();
    if(scenario==='surrogate-excerpt'&&(!content.includes('first 1023 of 1026 UTF-16')||content.includes('\\ud83d"')))throw Error('Preview split a surrogate pair');
    if(scenario==='huge-lexeme'&&(!content.includes('Known lexical failure: CSV lexical field exceeds 4096 UTF-16 code units')||!content.includes('partial; no selectable success')))throw Error('Large lexeme exceeded its resource bound without explicit partial failure');
    if(scenario==='many-empty-runs'&&!content.includes('first 5 of 20 counted runs'))throw Error('Empty-run truncation lacks complete count');
    if(scenario==='dense-page'&&(await original('pax-file').locator('.original-record').count()!==1||await original('pax-file').locator('.original-cell').count()!==64))throw Error('Dense preview exceeded its current one-record/64-cell page bound');
    if(scenario==='partial-boundary'&&!content.includes('partial; no selectable success'))throw Error('Malformed suffix promoted complete scan');
    if(scenario==='long-filename'&&(!content.includes('recover the original for the remainder')||await original('pax-file').locator('p').first().textContent().then(s=>s.length>1400)))throw Error('Long display metadata not bounded');
    await recover(scenario,'pax-file',text);passed.push('preview-'+scenario);
  }
  for(const r of ['pax-file','halo-file'])for(const [scenario,value]of [['empty',''],['header-only',r==='pax-file'?head+'\n':'line_id,subscription_id,customer_ref,billing_system\n'],['bom-only','\uFEFF'],['malformed','x\n"unfinished'],['invalid-encoding',Buffer.from([0xff])]]){
    await ready();await supply(r,value);await compare();if(await page.locator('.save-original').count()!==2||await page.getByRole('heading',{name:'Supplied records look in scope provisionally',exact:true}).count())throw Error('Rejected source gained a positive case or erased the independently read original');
    await recover('rejection-'+short(r)+'-'+scenario,r,value);passed.push('rejection-'+short(r)+'-'+scenario);
  }
  await fit();await inputs();await page.evaluate(()=>__fault='hold-halo');await beginCompare();await page.waitForFunction(()=>__workerRecords.some(record=>!record.terminated&&record.role==='halo-file'&&record.operation==='compare-records'));const delayedHaloId=await currentWorker('halo-file','compare-records');await waitHeldWorker(heldRequest(delayedHaloId,'hold-halo','halo-file','compare-records'));await workerReached('hold-halo','halo-file','held');await page.locator('#subscription-id').fill('changed');await page.evaluate(()=>__release());await page.waitForFunction(()=>document.getElementById('read-status').hidden);await stoppedWorkers();if(await page.locator('#record-result').isVisible()||await page.locator('.save-original').count()!==1)throw Error('Delayed read crossed changed context');passed.push('lifecycle-halo-delay-context');
  await ready(pax,Buffer.from([0xff]));await supply('pax-file','x\n"unfinished');await compare();if(await page.locator('.save-original').count()!==2||await page.getByRole('button',{name:'Confirm this source case',exact:true}).count())throw Error('Paired rejection invented a case or erased independently captured evidence');passed.push('lifecycle-paired-rejection');
  await fit();await inputs();
  const staleDiscoveryId=await currentWorker('pax-file','find-case');await waitHeldWorker(heldRequest(staleDiscoveryId,'stage-hold','pax-file','find-case'));
  await page.evaluate(()=>{window.__staleHeldCallback=__held.at(-1);window.__fault='hold-all';window.__deferHeldObservation=true;});await beginCompare();
  const heldPaxId=await currentWorker('pax-file','compare-records'),heldPaxRequest=heldRequest(heldPaxId,'hold-all','pax-file','compare-records');
  await page.waitForFunction(()=>__deferredHeldObservations.length===1);
  await page.evaluate(staleId=>{const stale=__workerRecords.find(record=>record.id===staleId);if(!stale?.terminated||!__workerEvents.some(event=>event.receiverId===staleId&&event.mode==='stage-hold'&&event.kind==='held'&&event.native===true)||typeof __staleHeldCallback!=='function')throw Error('Genuine stale native discovery was not reached');__held.push(__staleHeldCallback);},staleDiscoveryId);
  let heldPaxReached=false;const heldPaxWait=waitHeldWorker(heldPaxRequest).then(()=>{heldPaxReached=true;});await page.waitForTimeout(40);
  if(heldPaxReached||!await page.evaluate(()=>__held.length===1))throw Error('Stale discovery observation released the current request phase wait');
  await page.evaluate(()=>{__deferHeldObservation=false;for(const observe of __deferredHeldObservations.splice(0))observe();});await heldPaxWait;
  await workerReached('hold-all','pax-file','held');await page.locator('#cancel-read').click();await stoppedWorkers();await supply('pax-file',pax.replace(',renew,',',cancel,'));await page.evaluate(()=>__release());await page.evaluate(()=>__fault=null);await compare();await stoppedWorkers();if(await page.locator('.save-original').count()!==2||(await page.locator('#case-subject').textContent()).includes('Case selection: confirmed'))throw Error('Cancellation/replacement transferred prior authority');passed.push('lifecycle-double-cancel-replace');
  await ready();await open();const reentrantBefore=downloadEvents.length;await page.evaluate(()=>{const native=URL.createObjectURL;URL.createObjectURL=blob=>{document.getElementById('record-form').reset();return native(blob);};});await original('pax-file').locator('.save-original').evaluate(n=>n.click());await halt();if(!await page.evaluate(()=>__nativeClicks===0&&__created.length===1&&__created.every(u=>__revoked.includes(u)))||downloadEvents.length!==reentrantBefore)throw Error('Reentrant recovery initiated a stale download or leaked its URL');passed.push('lifecycle-reentrant-save');
  await ready();await open();const expiredSave=await original('pax-file').locator('.save-original').elementHandle(),expiredBefore=downloadEvents.length;await page.evaluate(()=>{__date='2026-10-04T12:00:00';window.dispatchEvent(new Event('focus'));});if(await page.locator('#record-result').isVisible()||await page.locator('.save-original').count())throw Error('Expiry retained a current result or original binding');await expiredSave.evaluate(n=>n.click());await halt();if(!await page.evaluate(()=>__nativeClicks===0)||downloadEvents.length!==expiredBefore)throw Error('Expired disconnected recovery initiated a download');await fit('2026-10-04T12:00:00');await inputs();await compare();await recover('expired-reselected-source','pax-file',pax);passed.push('lifecycle-expiry-save');
  for(const scenario of ['width320','font400','forced-colors','print-scope']){
    await page.setViewportSize({width:scenario==='width320'?320:800,height:900});await ready();await open();await open('halo-file');
    if(scenario==='font400')await page.evaluate(()=>document.body.style.fontSize='400%');
    if(scenario==='forced-colors')await page.emulateMedia({forcedColors:'active'});
    if(scenario==='print-scope'){await page.emulateMedia({media:'print'});if(!(await original('pax-file').textContent()).includes('cannot confirm that the operating system saved'))throw Error('Print exposure gained save-completion authority');await page.emulateMedia({media:'screen'});}
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await healthy();if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))throw Error('Evidence overflow at '+scenario);
    await page.addScriptTag({url:'http://localhost:8765/qc-vendor/axe-4.10.3.min.js'});if(await page.evaluate(()=>axe.version)!=='4.10.3')throw Error('Axe dependency changed');
    const v=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));if(v.length)throw Error('Evidence accessibility '+scenario+': '+JSON.stringify(v));
    if(scenario==='width320'){
      const identities=await page.locator('.original-content-identity').allTextContents();
      for(const viewport of [{width:1,height:900},{width:320,height:1},{width:1,height:1}]){
        await page.setViewportSize(viewport);await page.waitForTimeout(80);
        if(await page.locator('.save-original').count()!==2)throw Error('Unobservable viewport lost original custody');
        await page.setViewportSize({width:320,height:900});await page.waitForTimeout(80);await healthy();
        if(JSON.stringify(await page.locator('.original-content-identity').allTextContents())!==JSON.stringify(identities))throw Error('Viewport restoration changed source identity');
      }
      const save=await original('pax-file').locator('.save-original').elementHandle(),before=downloadEvents.length;
      await page.setViewportSize({width:320,height:1});await page.waitForTimeout(80);await save.evaluate(n=>n.click());await halt();
      if(downloadEvents.length!==before||await page.evaluate(()=>__nativeClicks)!==0)throw Error('Unobservable viewport bypassed direct recovery validation');
      await page.setViewportSize({width:320,height:900});await ready();await open();await open('halo-file');
      await page.evaluate(()=>{const s=document.createElement('style');document.head.append(s);window.__viewportStyle=s;});
      await page.setViewportSize({width:1,height:900});await page.waitForTimeout(80);
      await page.evaluate(()=>__viewportStyle.sheet.insertRule('#original-evidence{opacity:.001}'));
      await page.setViewportSize({width:320,height:900});await halt();
    }
    if(scenario==='forced-colors'){await page.evaluate(()=>{const style=document.createElement('style');document.head.append(style);style.sheet.insertRule('#original-pax-file .original-content-identity{-webkit-text-fill-color:transparent}');window.dispatchEvent(new Event('focus'));});await halt();await page.emulateMedia({forcedColors:'none'});}passed.push('accessibility-'+scenario);
  }
  await page.setViewportSize({width:800,height:900});await ready();await open();await open('halo-file');
  const clean=await page.evaluate(()=>!localStorage.length&&!sessionStorage.length&&!document.cookie&&!__writes.length&&!__workerPrivacy.length&&__created.length===__revoked.length);
  if(!clean||logs.length||workerPrivacy.length||requests.some(r=>r.method!=='GET'||r.body||!(r.url.startsWith('http://localhost:8765/')||r.url.startsWith('blob:http://localhost:8765/')||r.url.startsWith('data:image/png;base64,'))))throw Error('Evidence escaped local custody');await stoppedWorkers();passed.push('privacy-local');
  await recover('exact-pax','pax-file',pax);await recover('exact-halo','halo-file',halo);passed.push('exact-originals');
  if(errors.length||await page.evaluate(()=>document.body.textContent.includes('CONFIDENTIAL'))||downloadEvents.length!==downloads.length+2)throw Error('Runtime exposed source diagnostics or initiated an unowned download: '+errors.join(','));passed.push('runtime-diagnostics');
  const screenshot=await page.screenshot({path:'output/file-compatibility-principle-3/final-artifacts/closure/evidence-closure.png',fullPage:true});
  await healthy();
  const producer={sha256:await hash(screenshot),scope:'local synthetic evidence closure',viewportWidth:800,roles:['pax-file','halo-file'],recordDisclosures:'collapsed',browserGroupCount:79};
  return 'PASS: F13P2C-BROWSER-ASSERTIONS:'+JSON.stringify(passed)+'\nF13P2C-DOWNLOAD-PRODUCER:'+JSON.stringify(downloads)+'\nF13P2C-SCREENSHOT-PRODUCER:'+JSON.stringify(producer);
  } catch (error) {
    const state=await page.evaluate(()=>({warning:document.getElementById('runtime-warning')?.textContent,halted:!document.getElementById('runtime-warning')?.hidden,viewport:[innerWidth,innerHeight],originals:document.querySelectorAll('.save-original').length,panelOpen:document.getElementById('evidence-panels')?.open,guideVisible:!document.getElementById('file-guide')?.hidden}));
    throw Error(error.message+'\nCompleted groups: '+passed.join(',')+'\nState: '+JSON.stringify(state));
  }
}
