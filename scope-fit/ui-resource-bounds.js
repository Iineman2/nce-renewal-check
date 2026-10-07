async page => {
  const passed=[], measurements=[], errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const fixture=await (await page.request.get('http://localhost:8765/qc-worker-fixture.js')).text();
  await page.addInitScript({content:fixture});
  // Bind local lexical reconstruction to the actual stopped native Worker,
  // current File/request and graph-free completion received independently.
  await page.addInitScript(() => {
    const Native = Worker; window.__qcReconstructionContext = null;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); this.__qcReconstructionModule = args[1]?.type === 'module'; this.__qcReconstructionRequest = null;
        this.addEventListener('message', event => {
          const packet = event.data, request = this.__qcReconstructionRequest;
          if (request && !packet?.__qcTrace && packet?.id === request.id) window.__qcReconstructionContext = { worker: this, request, packet };
        });
      }
      postMessage(request, ...args) {
        if (request?.file instanceof File) this.__qcReconstructionRequest = request;
        return super.postMessage(request, ...args);
      }
    };
    window.__qcReconstructedCell = (object, input) => {
      const context = window.__qcReconstructionContext;
      if (!context || context.request.file !== input || context.request.role !== 'pax-file' || context.request.operation !== 'find-case' ||
          context.worker !== __qcNativeWorkers.at(-1) || !context.worker.__qcReconstructionModule || Object.prototype.toString.call(context.worker) !== '[object Worker]' ||
          !context.worker.__qcStopped || context.worker.__qcTrace.stops !== 1 || context.packet.status !== 'completed' || context.packet.scan !== null ||
          !['protocol','id','role','operation','profile','policy','reader'].every(name => context.packet[name] === context.request[name]) ||
          context.packet.metadata?.name !== input.name || context.packet.metadata?.lastModified !== input.lastModified ||
          !object || typeof object !== 'object' || Array.isArray(object) || ![Object.prototype,null].includes(Object.getPrototypeOf(object)) || !Object.isFrozen(object)) return false;
      const keys = Object.getOwnPropertyNames(object), own = name => Object.getOwnPropertyDescriptor(object, name);
      const expected=['columnIndex','lexeme','rawValue','normalizedValue','startOffset','endOffset','startByte','endByte'];
      if (keys.length !== expected.length || !expected.every((key,index)=>keys[index]===key)) return false;
      const fields=expected.map(own);
      if (!fields.every(data => data && Object.hasOwn(data,'value') && data.enumerable && !data.configurable && !data.writable)) return false;
      const [column,lexeme,raw,normalized,start,end,startByte,endByte]=fields.map(data=>data.value),text=context.packet.text;
      return Number.isInteger(column) && column >= 1 && column <= 64 && typeof lexeme === 'string' && typeof raw === 'string' && typeof normalized === 'string' &&
        normalized===raw.trim() && typeof text==='string' && Number.isInteger(start) && Number.isInteger(end) && start>=0 && end>=start && end<=text.length &&
        lexeme===text.slice(start,end) && Number.isInteger(startByte) && Number.isInteger(endByte) && startByte>=0 && endByte>=startByte && endByte<=input.size;
    };
  });
  await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-12-30T12:00:00']));}};});
  const pax='source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  const halo='line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const need=(value,message)=>{if(!value)throw Error(message);};
  const fresh=()=>page.goto('http://localhost:8765/');
  // Real host workers: busy work is injected inside each native processing phase.
  for(const phase of ['read','hash','decode','scan','stalled-read']) {
    await page.route('**/file-processing-worker.mjs',async route=>{
      const response=await route.fetch();
      const code=`const __busy=()=>{self.postMessage({__qcTrace:true});let n=0;for(;;){if(++n%1000000===0)self.postMessage({__qcTrace:true});}};
      const __phase=${JSON.stringify(phase)};
      if(__phase==='read')File.prototype.arrayBuffer=__busy;
      if(__phase==='hash'){const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=(algorithm,bytes)=>bytes.byteLength>3?__busy():digest(algorithm,bytes);}
      if(__phase==='decode'){const decode=TextDecoder.prototype.decode;TextDecoder.prototype.decode=function(bytes,...a){return bytes?.byteLength>20?__busy():decode.call(this,bytes,...a);};}
      if(__phase==='scan'){const U=Uint32Array;globalThis.Uint32Array=class extends U{constructor(n,...a){if(typeof n==='number'&&n>20)__busy();super(n,...a);}};}
      if(__phase==='stalled-read')File.prototype.arrayBuffer=function(){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});};\n`;
      await route.fulfill({response,body:code+await response.text()});
    });
    await fresh();
    await page.evaluate(async pax=>{
      const reader=await import('/bounded-reader.mjs');window.__reader=reader;window.__controller=new AbortController();window.__heartbeats=0;
      window.__beat=setInterval(()=>window.__heartbeats++,10);window.__result=null;
      window.__pending=reader.readBoundedLocalEvidence(new File([pax],'busy.csv'),'pax-file',(await import('/actions.mjs')).SOURCES.pax,30000,'find-case',window.__controller.signal).then(e=>{window.__result=e;return {unexpected:true};},e=>({name:e.name,message:e.message}));
    },pax);
    await page.waitForFunction(()=>window.__qcWorkers[0]?.ticks>2&&window.__heartbeats>2);
    const observed=await page.evaluate(async()=>{const start=performance.now();__controller.abort();const outcome=await __pending;clearInterval(__beat);return {ms:performance.now()-start,outcome,state:__reader.processingState(),ticks:__qcWorkers[0].ticks,stops:__qcWorkers[0].stops,beats:__heartbeats,published:!!__result};});
    need(observed.ms<=250&&observed.stops===1&&!observed.published&&observed.state.activeJobs===0&&observed.state.reservedBytes===0,'Native cancellation/cleanup failed '+phase+JSON.stringify(observed));
    await page.waitForTimeout(100);
    need(await page.evaluate(()=>__qcWorkers[0].ticks)===observed.ticks,'Canceled native work continued '+phase);
    measurements.push({phase,...observed});passed.push('F13P3-B01-'+phase);await page.unroute('**/file-processing-worker.mjs');
  }
  // A runnable deadline terminates a genuinely stalled native worker and permits retry.
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:"File.prototype.arrayBuffer=function(){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});};\n"+await response.text()});});
  await fresh();
  const timeout=await page.evaluate(async pax=>{const r=await import('/bounded-reader.mjs'),s=(await import('/actions.mjs')).SOURCES;const start=performance.now();try{await r.readBoundedLocalEvidence(new File([pax],'timeout.csv'),'pax-file',s.pax,200,'find-case');throw Error('Unexpected completion');}catch(e){return{message:e.message,ms:performance.now()-start,state:r.processingState(),stops:__qcWorkers[0].stops};}},pax);
  need(timeout.message.includes('timed out')&&timeout.stops===1&&timeout.state.activeJobs===0,'Native timeout failed');measurements.push({phase:'deadline',...timeout});passed.push('F13P3-B02');await page.unroute('**/file-processing-worker.mjs');
  // Canonical native acquisition at intersecting byte/cell frontiers, with exact recovery.
  await fresh();
  const native=await page.evaluate(async({pax,halo})=>{
    const r=await import('/bounded-reader.mjs'),s=(await import('/actions.mjs')).SOURCES,e=await import('/file-evidence.mjs'),p=await import('/preflight.mjs'),fixture=await import('/qc-resource-fixtures.mjs');
    const cols=[...p.PAX8_COLUMNS,...Array.from({length:64-p.PAX8_COLUMNS.length},(_,i)=>'extra_'+i)];
    const row=['s','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew',...Array(64-p.PAX8_COLUMNS.length).fill('x')];
    const wide=[cols.join(','),...Array(1023).fill(row.join(','))].join('\n');const a=await r.readBoundedLocalEvidence(new File([wide],'wide.csv'),'pax-file',s.pax,30000,'find-case');
    const projection=e.sourceProjection(a.handle,'pax-file',1023);if(a.problem||projection.pageSize!==1||projection.records[0].cells.length!==64||projection.recordCount!==1024)throw Error('Wide bounded result wrong');
    const exact=new TextDecoder().decode(e.originalBytes(a.handle,'pax-file'));if(exact!==wide)throw Error('Wide original lost');e.releaseFileEvidence(a.handle);
    const input=fixture.padCsvBytes(pax,2000000),b=await r.readBoundedLocalEvidence(new File([input],'maximum.csv'),'pax-file',s.pax),c=await r.readBoundedLocalEvidence(new File([halo],'halo.csv'),'halo-file',s.halo);
    if(b.problem||c.problem||e.originalBytes(b.handle,'pax-file').byteLength!==2000000||new TextDecoder().decode(e.originalBytes(b.handle,'pax-file'))!==input||r.processingState().cachedSources!==2)throw Error('Maximum byte/cache acquisition wrong');
    const rows=p.parseCsv(b.text,p.PAX8_COLUMNS);if(p.parseCsv(b.text,p.PAX8_COLUMNS)!==rows||!Object.isFrozen(rows))throw Error('Canonical row reuse absent');
    e.releaseFileEvidence(b.handle);e.releaseFileEvidence(c.handle);return{wideBytes:new TextEncoder().encode(wide).length,totalCells:65536,byteFrontier:2000000,state:r.processingState()};
  },{pax,halo});need(native.state.cachedSources===0,'Source release failed');measurements.push({phase:'frontiers',...native});passed.push('F13P3-B03');
  // Both maxima in one real source, with main-thread heartbeat through graph-free verification, local reconstruction and publication.
  await fresh();
  const heavy=await page.evaluate(async()=>{
    const p=await import('/preflight.mjs'),fixture=await import('/qc-resource-fixtures.mjs'),r=await import('/bounded-reader.mjs'),e=await import('/file-evidence.mjs'),sources=(await import('/actions.mjs')).SOURCES;
    const cols=['source_account_id',...p.PAX8_COLUMNS,...Array.from({length:54},(_,i)=>'e'+i)];
    const text=fixture.maximumCellByteCsv(cols,['a','$id','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew']);
    const ticks=[performance.now()],timer=setInterval(()=>ticks.push(performance.now()),10),start=performance.now();
    const outcome=await r.readBoundedLocalEvidence(new File([text],'combined-maxima.csv'),'pax-file',sources.pax,30000,'find-case');
    await new Promise(resolve=>setTimeout(resolve,20));clearInterval(timer);
    const maxGap=Math.max(...ticks.slice(1).map((time,i)=>time-ticks[i]));
    if(outcome.problem||e.originalBytes(outcome.handle,'pax-file').byteLength!==2000000||e.sourceProjection(outcome.handle,'pax-file').recordCount!==1024)throw Error('Combined frontier was not admitted');
    e.releaseFileEvidence(outcome.handle);return{ms:performance.now()-start,maxGap,ticks:ticks.length,bytes:2000000,cells:65536,state:r.processingState()};
  });need(Number.isFinite(heavy.maxGap)&&heavy.maxGap<=100&&heavy.ticks>5,'Heavy main-thread heartbeat exceeded100ms '+JSON.stringify(heavy));measurements.push({phase:'combined-maxima',...heavy});passed.push('F13P3-B07');
  // Cancel reaches genuine partial local lexical reconstruction after a stopped
  // native Worker supplied graph-free completion. No partial source is published.
  await fresh();
  const reconstructing=await page.evaluate(async()=>{
    const p=await import('/preflight.mjs'),f=await import('/qc-resource-fixtures.mjs'),r=await import('/bounded-reader.mjs'),actions=await import('/actions.mjs'),sources=actions.SOURCES;
    const cols=['source_account_id',...p.PAX8_COLUMNS,...Array.from({length:54},(_,i)=>'e'+i)],text=f.maximumCellByteCsv(cols,['a','$id','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew']);
    const controller=new AbortController(),native=Object.freeze,input=new File([text],'cancel-reconstruction.csv');let visited=0,scheduled=null,ack=null,reached=false,checkedInvalid=false,sawLastColumn=false,held=null,phase=null;
    const foreign=native({columnIndex:1,lexeme:'foreign',rawValue:'foreign',normalizedValue:'foreign',startOffset:0,endOffset:7,startByte:0,endByte:7});
    if(__qcReconstructedCell(foreign,input))throw Error('Unowned data reached native reconstruction');
    Object.freeze=function(object){const result=native(object);if(__qcReconstructedCell(result,input)){
      if(!checkedInvalid){checkedInvalid=true;for(const column of[0,65]){const probe={...object,columnIndex:column},before=visited;Object.freeze(probe);if(__qcReconstructedCell(probe,input)||visited!==before)throw Error('Invalid column reached live local reconstruction');}
        const twin=new File([text],input.name,{lastModified:input.lastModified});if(__qcReconstructedCell(result,twin))throw Error('Equivalent metadata substituted for the current File occurrence');}
      if(Object.getOwnPropertyDescriptor(object,'columnIndex').value===64)sawLastColumn=true;
      if(++visited===1000){reached=true;held=r.processingState();const context=__qcReconstructionContext;phase={native:Object.prototype.toString.call(context.worker)==='[object Worker]',module:context.worker.__qcReconstructionModule,currentFile:context.request.file===input,role:context.request.role,operation:context.request.operation,wireScanNull:context.packet.scan===null,stops:context.worker.__qcTrace.stops};scheduled=performance.now();setTimeout(()=>{controller.abort();ack=performance.now();},0);}
    }return result;};
    try {
      let published=false,message='',ownedRepair=false;try{await r.readBoundedLocalEvidence(input,'pax-file',sources.pax,30000,'find-case',controller.signal);published=true;}catch(e){message=e.message;ownedRepair=e instanceof actions.InputProblem&&e.target==='pax-file'&&e.source===sources.pax;}
      const deadline=performance.now()+2000;while(r.processingState().activeJobs){if(performance.now()>deadline)throw Error('Canceled reconstruction cleanup did not settle');await new Promise(resolve=>setTimeout(resolve,1));}
      if(!checkedInvalid||!sawLastColumn)throw Error('Local reconstruction did not prove invalid-column rejection and genuine column64');
      return{reached,visited,completeCells:65536,ackMs:ack-scheduled,published,message,ownedRepair,held,phase,state:r.processingState()};
    }finally{Object.freeze=native;}
  });need(reconstructing.reached&&reconstructing.visited>=1000&&reconstructing.visited<reconstructing.completeCells&&!reconstructing.published&&reconstructing.ownedRepair&&reconstructing.message.includes('canceled')&&Number.isFinite(reconstructing.ackMs)&&reconstructing.ackMs<=250&&reconstructing.phase.native&&reconstructing.phase.module&&reconstructing.phase.currentFile&&reconstructing.phase.wireScanNull&&reconstructing.phase.stops===1&&reconstructing.held.activeJobs===1&&reconstructing.held.reservedBytes===2000000&&reconstructing.held.cachedSources===0&&reconstructing.state.cachedSources===0&&reconstructing.state.reservedBytes===0&&reconstructing.state.activeJobs===0,'Local reconstruction cancellation failed '+JSON.stringify(reconstructing));measurements.push({phase:'cancel-local-reconstruction',...reconstructing});passed.push('F13P3-B08');
  await page.evaluate(async pax=>{
    const r=await import('/bounded-reader.mjs'),e=await import('/file-evidence.mjs'),source=(await import('/actions.mjs')).SOURCES.pax;
    const retry=await r.readBoundedLocalEvidence(new File([pax],'reconstruction-retry.csv'),'pax-file',source,30000,'find-case');
    if(retry.problem||new TextDecoder().decode(e.originalBytes(retry.handle,'pax-file'))!==pax||__qcWorkers.length!==2||__qcWorkers.some(worker=>worker.stops!==1))throw Error('Fresh native retry after reconstruction cancellation failed');
    e.releaseFileEvidence(retry.handle);const state=r.processingState();if(state.activeJobs||state.reservedBytes||state.cachedSources||state.halted)throw Error('Fresh reconstruction retry left owned work');
  },pax);
  // Honest termination failure quarantines its reservation; fixture cleanup uses the independent native primitive.
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:"File.prototype.arrayBuffer=function(){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});};\n"+await response.text()});});
  await fresh();
  const quarantine=await page.evaluate(async pax=>{
    const r=await import('/bounded-reader.mjs'),technical=(await import('/runtime.mjs')).FileEvidenceRuntimeError,source=(await import('/actions.mjs')).SOURCES.pax,controller=new AbortController(),input=new File([pax],'quarantine.csv');
    const result=r.readBoundedLocalEvidence(input,'pax-file',source,30000,'find-case',controller.signal).then(()=>({unexpected:true}),e=>({technical:e instanceof technical,name:e.name}));
    const waiting=performance.now()+2000;while(!__qcWorkers[0].ticks){if(performance.now()>waiting)throw Error('Native stalled worker did not start');await new Promise(resolve=>setTimeout(resolve,1));}
    __qcFailTermination=true;controller.abort();const error=await result,state=r.processingState();let blocked=false;
    try{await r.readBoundedLocalEvidence(input,'pax-file',source);}catch(e){blocked=e instanceof technical;}
    for(const worker of __qcNativeWorkers)__qcActualStop(worker);return{error,state,blocked,bytes:input.size};
  },pax);need(quarantine.error.technical&&quarantine.state.halted&&quarantine.state.activeJobs===1&&quarantine.state.reservedBytes===quarantine.bytes&&quarantine.blocked,'Termination quarantine failed '+JSON.stringify(quarantine));measurements.push({phase:'quarantine',...quarantine});passed.push('F13P3-B09');await page.unroute('**/file-processing-worker.mjs');await fresh();
  // Actual browser DOM nodes, units and depth: each individual frontier, without intersection masking.
  const dom=await page.evaluate(async()=>{
    const check=(await import('/resource-packet.mjs')).assertPresentationBudget,results=[];
    for(const [type,limit]of[['globalElements',10000],['globalNodes',20000],['ownedElements',1500],['ownedNodes',3000],['units',4000000],['depth',64]])for(const n of[limit-1,limit,limit+1]){
      const d=document.implementation.createHTMLDocument(''),root=d.createElement('section');d.body.append(root);const before=check(root);
      if(type==='units')root.textContent='x'.repeat(n);
      else if(type==='depth'){let parent=root;for(let i=3;i<n;i++){const next=d.createElement('i');parent.append(next);parent=next;}}
      else {const owned=type.startsWith('owned'),elements=type.endsWith('Elements'),parent=owned?root:d.body;const fragment=d.createDocumentFragment();for(let i=before[type];i<n;i++)fragment.append(elements?d.createElement('i'):d.createComment(''));parent.append(fragment);}
      let rejected=false;try{const counts=check(root);if(type!=='depth'&&counts[type]!==n)throw Error('Frontier fixture counted incorrectly '+type+n);}catch(e){if(!/exceeds/.test(e.message))throw e;rejected=true;}
      if(rejected!==(n>limit))throw Error('DOM frontier incorrectly admitted '+type+n);results.push({type,n,rejected});
    }return results;
  });need(dom.length===18,'Incomplete DOM matrix');measurements.push({phase:'dom',cases:dom});passed.push('F13P3-B04');
  const fit=async()=>{await fresh();if(await page.locator('#fit-form').count()||!await page.locator('#preflight').isVisible())throw Error('Direct records entry is unavailable');};
  const discovered=async()=>{await page.waitForFunction(()=>{const c=document.getElementById('case-choice');return c&&!c.disabled&&c.querySelector('option[value="1"]')&&document.getElementById('read-status').hidden;});};
  const info=()=>page.locator('#open-evidence').click(),controls=()=>page.locator('#close-evidence').click();
  const supply=async(text=pax)=>{for(const[id,value]of[['halo-file',halo],['pax-file',text]])await page.locator('#'+id).setInputFiles({name:id+'.csv',mimeType:'text/csv',buffer:Buffer.from(value)});await discovered();await page.locator('#subscription-id').fill('s');await page.locator('#renewal-term').selectOption('annual');await page.locator('#agreement').selectOption('yes');};
  // Cover candidates are capped before the first evidence clone, including harmless offscreen covers.
  for(const count of[63,64,65]){
    await fit();await supply();await discovered();await info();
    const result=await page.evaluate(count=>{const native=Node.prototype.cloneNode;window.__cloneCalls=0;Node.prototype.cloneNode=function(...a){if(this.id==='original-evidence')__cloneCalls++;return native.apply(this,a);};const f=document.createDocumentFragment();for(let i=0;i<count;i++){const n=document.createElement('div');n.style.cssText='position:fixed;z-index:100;background:black;top:-9999px;width:10px;height:10px';f.append(n);}document.body.append(f);window.dispatchEvent(new Event('resize'));return{cloneCalls:__cloneCalls,stopped:document.getElementById('runtime-warning').textContent.includes('could not finish')||!document.getElementById('runtime-warning').hidden};},count);
    need(result.stopped===(count>64),'Cover frontier wrong '+count+JSON.stringify(result));if(count>64)need(result.cloneCalls===0,'Cover cap cloned before rejection');passed.push('F13P3-B05-'+count);measurements.push({phase:'covers',count,...result});
  }
  // User-visible path and reference interaction timings with the widest admitted source.
  await fit();
  const wide=pax.split('\n')[0]+', '+Array.from({length:54},(_,i)=>'e'+i).join(',')+'\n'+Array.from({length:1022},(_,i)=>`a,s${i},c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew,`+Array(54).fill('x').join(',')).join('\n')+'\n'+pax.split('\n')[1]+','+Array(54).fill('x').join(',')+'\n';
  await page.evaluate(()=>{window.__selectionAck=null;document.getElementById('pax-file').addEventListener('change',()=>{const start=performance.now();requestAnimationFrame(()=>{window.__selectionAck={ms:performance.now()-start,name:document.getElementById('pax-file').files[0]?.name,visible:document.getElementById('pax-file').getBoundingClientRect().width>0,statusHidden:document.getElementById('read-status').hidden,phaseKnown:!document.getElementById('cancel-case-finder').hidden||!document.getElementById('read-status').hidden||Boolean(document.querySelector('#case-choice option[value="1"]:not([disabled])'))};});},true);});
  await supply(wide);await page.waitForFunction(()=>__selectionAck!==null);const selectionAck=await page.evaluate(()=>__selectionAck);need(Number.isFinite(selectionAck.ms)&&selectionAck.ms>=0&&selectionAck.ms<=100&&selectionAck.name==='pax-file.csv'&&selectionAck.visible&&selectionAck.phaseKnown,'Reference selection acknowledgement exceeded 100ms '+JSON.stringify(selectionAck));
  await discovered();
  await page.locator('#case-query').fill('s');await page.locator('#case-choice').selectOption('1');await info();
  need(await page.locator('#original-pax-file .original-cell').count()===64,'Wide native page rendered beyond or below 64 cells');
  await page.locator('#original-pax-file').evaluate(n=>n.open=true);await page.locator('#original-pax-file button[data-page-direction=Next]').click();
  need(await page.locator('#original-pax-file .original-cell').count()===64,'Paged wide view lost cell bounds');
  await page.screenshot({path:'output/file-compatibility-principle-3/bounded-evidence.png',fullPage:true});measurements.push({phase:'selection',selectionAck});passed.push('F13P3-B06');
  // The actual operator Cancel path stays responsive with a disclosed64-cell original view.
  await fit();
  const uiMax=await page.evaluate(async()=>{const p=await import('/preflight.mjs'),f=await import('/qc-resource-fixtures.mjs');return f.maximumCellByteCsv(['source_account_id',...p.PAX8_COLUMNS,...Array.from({length:54},(_,i)=>'e'+i)],['a','$id','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew']);});
  await supply(uiMax);await discovered();await page.locator('#case-choice').selectOption('1');await info();
  await page.locator('#original-pax-file').evaluate(n=>n.open=true);await page.locator('#original-pax-file button[data-page-direction=Next]').click();await page.locator('#original-pax-file .original-record').evaluate(n=>n.open=true);
  await controls();await page.locator('#renewal-term').selectOption('annual');await page.locator('#agreement').selectOption('yes');
  await page.route('**/file-processing-worker.mjs',async route=>{const response=await route.fetch();await route.fulfill({response,body:"const __nativeRead=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name==='halo-file.csv'){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});}return __nativeRead.call(this);};\n"+await response.text()});});
  await page.getByRole('button',{name:'Check records',exact:true}).click();await page.waitForFunction(()=>__qcWorkers.some(worker=>worker.ticks>0));
  await page.evaluate(()=>{window.__cancelAck=null;document.getElementById('cancel-read').addEventListener('click',()=>{const start=performance.now();requestAnimationFrame(()=>{window.__cancelAck={ms:performance.now()-start,statusHidden:document.getElementById('read-status').hidden,ready:!document.querySelector('#record-form button[type=submit]').disabled,focused:document.activeElement===document.querySelector('#record-form button[type=submit]'),resultHidden:document.getElementById('record-result').hidden};});},true);});
  await page.getByRole('button',{name:'Cancel this check',exact:true}).click();await page.waitForFunction(()=>__cancelAck!==null);
  const uiCancel=await page.evaluate(async()=>({ack:__cancelAck,state:(await import('/bounded-reader.mjs')).processingState(),trace:__qcWorkers.find(worker=>worker.ticks>0),inspectorAvailable:document.querySelectorAll('#original-pax-file .save-original').length===1}));
  need(Number.isFinite(uiCancel.ack.ms)&&uiCancel.ack.ms>=0&&uiCancel.ack.ms<=250&&uiCancel.ack.statusHidden&&uiCancel.ack.ready&&uiCancel.ack.focused&&uiCancel.ack.resultHidden&&uiCancel.state.activeJobs===0&&uiCancel.state.reservedBytes===0&&uiCancel.trace.stops===1&&uiCancel.inspectorAvailable,'Operator cancellation failed '+JSON.stringify(uiCancel));
  const stoppedTicks=uiCancel.trace.ticks;await page.waitForTimeout(100);need(await page.evaluate(()=>__qcWorkers.find(worker=>worker.ticks>0).ticks)===stoppedTicks,'UI-canceled native activity continued');
  await page.screenshot({path:'output/file-compatibility-principle-3/operator-cancel.png',fullPage:true});measurements.push({phase:'operator-cancel',...uiCancel});passed.push('F13P3-B10');await page.unroute('**/file-processing-worker.mjs');
  if(errors.length)throw Error(errors.join('\n'));
  return 'PASS: F13P3-BROWSER:'+JSON.stringify({assertions:passed,measurements,scope:'actual local Chromium native module Workers; observed algorithm/input/DOM bounds and responsiveness; no peak memory, OS or universal hardware guarantee'});
}
