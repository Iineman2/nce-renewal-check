async page => {
  const origin = 'http://localhost:8765';
  const assertions = [], measurements = [], scans = [], errors = [];
  const expected = [
    ...['display','visibility','opacity','pointer','transparent','font','clip','ancestor-pointer','cover','cover-pointer-none'].map(kind => 'F13P3C-CANCEL-' + kind),
    ...['protocol','operation','profile','status','bytes','scan','text','hash','metadata'].map(kind => 'F13P3C-PACKET-' + kind),
    'F13P3C-COPY-cancel',
    ...['cancel-pax','cancel-halo','cancel-both','deadline-both'].map(kind => 'F13P3C-ADOPTION-' + kind),
    ...['read','hash','decode','scan','stalled-read','copy','probe','full'].flatMap(stage => ['guide','evidence','pagehide','reset','remove','replace'].map(action => 'F13P3C-LIFECYCLE-' + stage + '-' + action)),
    ...['id','term','agreement','expiry'].map(kind => 'F13P3C-EDIT-' + kind),
    'F13P3C-MIXED-near-limits','F13P3C-CACHE-churn',
    ...['error-setter','listener-add','message-setter','error-suppression'].map(kind => 'F13P3C-RUNTIME-' + kind),
    'F13P3C-A11Y-pending','F13P3C-A11Y-forced-colors','F13P3C-DEADLINE-default',
  ];
  let phase = 'startup';
  const need = (value, message) => { if (!value) throw Error(message); };
  const add = (id, family, kind, result) => {
    need(!assertions.includes(id), 'Duplicate resource closure identity ' + id);
    assertions.push(id); measurements.push({ id, family, kind, ...result });
  };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript({ content: await (await page.request.get(origin + '/qc-worker-fixture.js')).text() });
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
          !object || typeof object !== 'object' || Array.isArray(object) || Object.getPrototypeOf(object)!==null || !Object.isFrozen(object)) return false;
      const keys = Object.getOwnPropertyNames(object), own = name => Object.getOwnPropertyDescriptor(object, name);
      const expected=['columnIndex','lexeme','rawValue','normalizedValue','startOffset','endOffset','startByte','endByte'];
      if(keys.length!==8||expected.some((key,index)=>keys[index]!==key)||Object.getOwnPropertySymbols(object).length)return false;
      if(!expected.map(own).every(data=>data&&Object.hasOwn(data,'value')&&data.enumerable&&!data.configurable&&!data.writable))return false;
      return Number.isInteger(object.columnIndex)&&object.columnIndex>=1&&object.columnIndex<=64&&typeof object.lexeme==='string'&&typeof object.rawValue==='string'&&object.normalizedValue===object.rawValue.trim()&&
        ['startOffset','endOffset','startByte','endByte'].every(key=>Number.isInteger(object[key])&&object[key]>=0)&&object.startOffset<=object.endOffset&&object.endOffset<=context.packet.text.length&&object.startByte<=object.endByte&&object.endByte<=input.size&&
        object.lexeme===context.packet.text.slice(object.startOffset,object.endOffset);
    };
  });
  await page.addInitScript(() => {
    const NativeDate = Date; window.__date = '2026-12-30T12:00:00';
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [window.__date])); } };
  });
  const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\na,s,c,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,renew\n';
  const halo = 'line_id,subscription_id,customer_ref,billing_system\nl,s,c,HaloPSA\n';
  const file = (id, text, name = id + '.csv') => page.locator('#' + id).setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
  const healthy = async () => need(await page.locator('#runtime-warning').isHidden(), 'Resource closure falsely halted at ' + phase);
  const fresh = async () => { await page.goto(origin + '/'); await page.locator('#file-support-contract dd').last().waitFor({ state: 'attached' }); await healthy(); };
  const selected = async (text = pax) => {
    await file('halo-file', halo); await file('pax-file', text);
    await page.waitForFunction(() => document.querySelector('#case-choice option[value="1"]:not([disabled])') && document.getElementById('cancel-case-finder').hidden);
    await page.locator('#case-choice').selectOption('1');
  };
  const nativeState = () => page.evaluate(async () => ({
    native: __qcNativeWorkers.length > 0 && __qcNativeWorkers.every(worker => Object.prototype.toString.call(worker) === '[object Worker]'),
    workers: __qcWorkers.map(worker => ({ ...worker })), state: (await import('/bounded-reader.mjs')).processingState(),
    copies: document.querySelectorAll('.save-original').length, resultHidden: document.getElementById('record-result').hidden,
    claimsEmpty: document.getElementById('record-info').textContent === '', warning: !document.getElementById('runtime-warning').hidden,
  }));
  const quietTicks = async before => {
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => __qcWorkers.map(worker => worker.ticks));
    need(JSON.stringify(after) === JSON.stringify(before.workers.map(worker => worker.ticks)), 'Stopped native activity continued at ' + phase);
    return true;
  };
  const terminal = async () => {
    await page.locator('#runtime-warning').waitFor({ state: 'visible' });
    const result = await nativeState();
    result.cleaned = await page.evaluate(() => ['record-result','record-info','case-subject','finder-results','original-evidence'].every(id => {
      const node = document.getElementById(id); return node.hidden && node.childNodes.length === 0;
    }));
    need(result.native && result.cleaned && result.copies === 0 && result.state.activeJobs === 0 && result.state.reservedBytes === 0 && result.state.cachedSources === 0 && result.workers.every(worker => worker.stops === 1), 'Terminal resource cleanup incomplete ' + JSON.stringify(result));
    result.postStopTicksUnchanged = await quietTicks(result); return result;
  };
  const retry = async () => {
    await fresh(); await selected(); await page.getByRole('button', { name: 'Check records', exact: true }).click();
    await page.waitForFunction(() => document.getElementById('read-status').hidden && !document.getElementById('record-result').hidden);
    await healthy();
    return page.evaluate(async ({ pax, halo }) => {
      const view = await import('/file-evidence.mjs'), r = await import('/bounded-reader.mjs'), s = (await import('/actions.mjs')).SOURCES;
      const results = [];
      for (const [role, text, source] of [['pax-file', pax, s.pax], ['halo-file', halo, s.halo]]) {
        const input = new File([text], 'retry-' + role + '.csv');
        const outcome = await r.readBoundedLocalEvidence(input, role, source, 30000, role === 'pax-file' ? 'find-case' : 'compare-records');
        results.push({ role, compatible: outcome.problem === null, exactBytes: new TextDecoder().decode(view.originalBytes(outcome.handle, role)) === text });
        view.releaseFileEvidence(outcome.handle);
      }
      return { results, state: r.processingState(), heading: document.querySelector('#record-info h3')?.textContent ?? '', copies: document.querySelectorAll('.save-original').length };
    }, { pax, halo });
  };
  const stallHalo = async () => {
    await page.route('**/file-processing-worker.mjs', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: "const __read=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name==='halo-file.csv'){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});}return __read.call(this);};\n" + await response.text() });
    });
    await fresh(); await selected(); await page.getByRole('button', { name: 'Check records', exact: true }).click();
    await page.waitForFunction(() => __qcWorkers.some(worker => worker.ticks > 1) && !document.getElementById('read-status').hidden);
    need(await page.getByRole('button', { name: 'Cancel this check', exact: true }).isVisible(), 'Pending Cancel lacks visible baseline');
    await healthy();
  };
  try {
    const cssFaults = {
      display: 'display:none', visibility: 'visibility:hidden', opacity: 'opacity:.001', pointer: 'pointer-events:none',
      transparent: 'color:transparent;-webkit-text-fill-color:transparent', font: 'font-size:0', clip: 'clip-path:inset(100%)',
      'ancestor-pointer': null, cover: null, 'cover-pointer-none': null,
    };
    for (const [kind, rule] of Object.entries(cssFaults)) {
      phase = 'cancel-' + kind; await stallHalo();
      const observed = await page.evaluate(({ kind, rule }) => {
        const node = document.getElementById('cancel-read'), rect = node.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1 || node.disabled || document.getElementById('read-status').hidden) throw Error('Cancel fault lacks actionable baseline');
        window.__retiredCancel = node;
        const start = performance.now();
        if (rule || kind === 'ancestor-pointer') {
          const style = document.createElement('style'); document.head.append(style);
          style.sheet.insertRule((kind === 'ancestor-pointer' ? '#read-status' : '#cancel-read') + '{' + (rule ?? 'pointer-events:none') + '}');
        } else {
          const cover = document.createElement('div');
          Object.assign(cover.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', zIndex: '2147483647', background: 'rgb(0,0,0)', pointerEvents: kind === 'cover-pointer-none' ? 'none' : 'auto' });
          document.body.append(cover);
        }
        window.dispatchEvent(new Event('focus'));
        return { reached: 1, baseline: { width: rect.width, height: rect.height }, ms: performance.now() - start };
      }, { kind, rule });
      const result = await terminal();
      const replaySafe = await page.evaluate(async () => {
        const reader = await import('/bounded-reader.mjs'), before = JSON.stringify(reader.processingState()), roots = () => JSON.stringify(['record-result','record-info','case-subject','finder-results','original-evidence'].map(id => [document.getElementById(id).hidden, document.getElementById(id).innerHTML]));
        const previous = roots(); __retiredCancel.click(); return before === JSON.stringify(reader.processingState()) && previous === roots();
      });
      need(observed.ms <= 250 && replaySafe, 'Cancel fault stop or retired replay failed');
      await page.unroute('**/file-processing-worker.mjs'); const recovered = await retry();
      need(recovered.results.every(value => value.compatible && value.exactBytes), 'Fresh recovery after Cancel fault failed');
      add('F13P3C-CANCEL-' + kind, 'cancel', kind, { ...observed, ...result, replaySafe, retry: recovered });
    }

    for (const kind of ['protocol','operation','profile','status','bytes','scan','text','hash','metadata']) {
      phase = 'packet-' + kind;
      await page.route('**/file-processing-worker.mjs', async route => {
        const response = await route.fetch();
        const prefix = `const __post=self.postMessage.bind(self);self.postMessage=(packet,...args)=>{if(packet?.status==='completed'){if(packet.scan!==null)throw Error('Expected graph-free wire baseline');const kind=${JSON.stringify(kind)};if(kind==='protocol')packet.protocol='foreign';if(kind==='operation')packet.operation='foreign';if(kind==='profile')packet.profile='foreign';if(kind==='status')packet.status='foreign';if(kind==='bytes')packet.bytes=new ArrayBuffer(0);if(kind==='scan')packet.scan={records:Array(999900).fill(0)};if(kind==='text')packet.text=[];if(kind==='hash')packet.sha256='foreign';if(kind==='metadata')packet.metadata={...packet.metadata,foreign:true};__post({__qcTrace:true});}return __post(packet,...( ${JSON.stringify(kind)}==='bytes'?[]:args));};\n`;
        await route.fulfill({ response, body: prefix + await response.text() });
      });
      await fresh();
      const result = await page.evaluate(async ({pax,kind}) => {
        const reader = await import('/bounded-reader.mjs'), Runtime = (await import('/runtime.mjs')).FileEvidenceRuntimeError;
        const nativeDefine = Object.defineProperty; let copiedProperties = 0, maxGap = 0, ticks = 0, last = performance.now();
        Object.defineProperty = function (object, key, ...args) { if (object && typeof object === 'object' && !Array.isArray(object) && [Object.prototype,null].includes(Object.getPrototypeOf(object))) copiedProperties++; return nativeDefine.call(Object, object, key, ...args); };
        Object.defineProperty({},'ordinary-control',{value:0});Object.defineProperty(Object.create(null),'null-control',{value:0});
        if(copiedProperties!==2)throw Error('Early-copy counter failed ordinary/null controls');copiedProperties=0;
        const beat = setInterval(() => { const current = performance.now(); maxGap = Math.max(maxGap, current - last); last = current; ticks++; }, 10);
        let technical = false, published = false; const start = performance.now();
        try { await reader.readBoundedLocalEvidence(new File([pax], 'hostile.csv'), 'pax-file', (await import('/actions.mjs')).SOURCES.pax, 30000, 'find-case'); published = true; }
        catch (error) { technical = error instanceof Runtime; }
        finally { Object.defineProperty = nativeDefine; }
        await new Promise(resolve => setTimeout(resolve, 30)); clearInterval(beat);
        return { reached: __qcWorkers[0]?.ticks ?? 0, native: __qcNativeWorkers.every(worker => Object.prototype.toString.call(worker) === '[object Worker]'), packetValues: kind==='scan'?999900:0, mutation:kind, wireBaseline:'scan:null', copiedProperties, maxGap, beats: ticks, ms: performance.now() - start, technical, published, workers: __qcWorkers.map(worker => ({ ...worker })), state: reader.processingState() };
      }, {pax,kind});
      need(result.native && result.reached === 1 && result.technical && !result.published && result.copiedProperties === 0 && result.maxGap <= 100 && result.beats >= 2 && result.workers.length === 1 && result.workers[0].stops === 1 && !result.state.activeJobs && !result.state.reservedBytes && !result.state.cachedSources, 'Wrong-schema packet was copied or left work ' + JSON.stringify(result));
      result.postStopTicksUnchanged = await quietTicks(result); await page.unroute('**/file-processing-worker.mjs');
      add('F13P3C-PACKET-' + kind, 'packet', kind, result);
    }

    // Keep the historical receipt identity; the reached phase is now local
    // canonical construction after the graph-free native Worker has stopped.
    phase = 'reconstruction-cancel'; await fresh();
    const copied = await page.evaluate(async () => {
      const reader = await import('/bounded-reader.mjs'), fixture = await import('/qc-resource-fixtures.mjs'), profile = await import('/preflight.mjs'), actions = await import('/actions.mjs'), source = actions.SOURCES.pax;
      const text = fixture.maximumCellByteCsv(['source_account_id', ...profile.PAX8_COLUMNS, ...Array.from({ length: 54 }, (_, index) => 'extra' + index)], ['a','$id','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew']);
      const controller = new AbortController(), nativeFreeze = Object.freeze, input = new File([text],'reconstruction.csv'); let fields = 0, reached = 0, cancelAt = null, settledAt = null, published = false, checkedInvalid = false, checkedTwin = false, sawLastColumn = false, held = null, canceled = false;
      const foreign=nativeFreeze(Object.assign(Object.create(null),{columnIndex:0,lexeme:'',rawValue:'',normalizedValue:'',startOffset:0,endOffset:0,startByte:0,endByte:0}));
      if(__qcReconstructedCell(foreign,input))throw Error('Unowned data reached canonical reconstruction');
      Object.freeze = function (object) { const value = nativeFreeze.call(Object, object); if (__qcReconstructedCell(object,input)) {
        if(!checkedInvalid){checkedInvalid=true;for(const column of[0,65]){const probe=Object.assign(Object.create(null),object,{columnIndex:column}),before=fields;Object.freeze(probe);if(__qcReconstructedCell(probe,input)||fields!==before)throw Error('Invalid column reached the live canonical reconstruction phase');}const twin=new File([text],input.name,{type:input.type,lastModified:input.lastModified});checkedTwin=!__qcReconstructedCell(object,twin);if(!checkedTwin)throw Error('Different File occurrence reached canonical reconstruction');}
        if(Object.getOwnPropertyDescriptor(object,'columnIndex').value===64)sawLastColumn=true;
        if(++fields===1000)setTimeout(() => { held=reader.processingState(); reached++; cancelAt = performance.now(); controller.abort(); }, 0);
      } return value; };
      try { await reader.readBoundedLocalEvidence(input, 'pax-file', source, 30000, 'find-case', controller.signal); published = true; }
      catch (error) { settledAt = performance.now(); canceled=error instanceof actions.InputProblem&&error.target==='pax-file'&&error.source===source&&/canceled/i.test(error.message);if(!canceled)throw error; }
      finally { Object.freeze = nativeFreeze; }
      const end = performance.now() + 3000; while (reader.processingState().activeJobs) { if (performance.now() > end) throw Error('Canceled packet cleanup did not finish'); await new Promise(resolve => setTimeout(resolve, 1)); }
      if(!checkedInvalid||!checkedTwin||!sawLastColumn)throw Error('Canonical reconstruction did not prove invalid columns, File identity and genuine column64');
      return { phase:'canonical-reconstruction', reached, fields, checkedInvalid, checkedTwin, sawLastColumn, held, canceled, ms: settledAt - cancelAt, published, inputBytes: input.size, native: __qcNativeWorkers.length === 1 && Object.prototype.toString.call(__qcNativeWorkers[0]) === '[object Worker]', workers: __qcWorkers.map(worker => ({ ...worker })), state: reader.processingState() };
    });
    need(copied.reached === 1 && copied.fields >= 1000 && copied.fields < 65536 && copied.canceled && copied.held.activeJobs===1 && copied.held.reservedBytes===copied.inputBytes && copied.held.cachedSources===0 && copied.ms >= 0 && copied.ms <= 250 && !copied.published && copied.native && copied.inputBytes === 2000000 && copied.workers[0].stops === 1 && !copied.state.activeJobs && !copied.state.reservedBytes && !copied.state.cachedSources, 'Actual canonical reconstruction cancellation failed '+JSON.stringify(copied));
    copied.postStopTicksUnchanged = await quietTicks(copied); add('F13P3C-COPY-cancel', 'copy', 'cancel', copied);
    const copyRetry=await retry();need(copyRetry.results.every(value=>value.compatible&&value.exactBytes)&&copyRetry.state.activeJobs===0&&copyRetry.state.reservedBytes===0&&copyRetry.state.cachedSources===0&&!copyRetry.state.halted,'Fresh native retry after reconstruction cancellation failed');

    for (const kind of ['cancel-pax','cancel-halo','cancel-both','deadline-both']) {
      phase = 'adoption-' + kind; await fresh();
      const result = await page.evaluate(async ({ pax, halo, kind }) => {
        const reader = await import('/bounded-reader.mjs'), evidence = await import('/file-evidence.mjs'), sources = (await import('/actions.mjs')).SOURCES;
        const files = [new File([pax], 'p.csv'), new File([halo], 'h.csv')], roles = ['pax-file','halo-file'], controllers = [new AbortController(), new AbortController()];
        const nativeDigest = crypto.subtle.digest.bind(crypto.subtle), releases = new Map();
        crypto.subtle.digest = (algorithm, bytes) => bytes.byteLength === 3 ? nativeDigest(algorithm, bytes) : new Promise(resolve => releases.set(bytes.byteLength === files[0].size ? 0 : 1, () => nativeDigest(algorithm, bytes).then(resolve)));
        const published = [false, false], results = [];
        const pending = files.map((input, index) => reader.readBoundedLocalEvidence(input, roles[index], index ? sources.halo : sources.pax, kind === 'deadline-both' ? 1000 : 30000, index ? 'compare-records' : 'find-case', controllers[index].signal).then(outcome => { published[index] = true; results[index] = outcome; return 'published'; }, error => { results[index] = error; return error.name; }));
        const end = performance.now() + 4000;
        while (releases.size < 2) { if (performance.now() > end) throw Error('Both native custody digests were not reached'); await new Promise(resolve => setTimeout(resolve, 1)); }
        const heldBefore = reader.processingState(), start = performance.now();
        const canceled = kind === 'cancel-pax' ? [0] : kind === 'cancel-halo' ? [1] : [0,1];
        if (kind !== 'deadline-both') canceled.forEach(index => controllers[index].abort());
        await Promise.all(canceled.map(index => pending[index])); const ms = performance.now() - start, heldAfter = reader.processingState();
        const order = kind === 'cancel-pax' || kind === 'deadline-both' ? [0,1] : [1,0];
        const releasedStates = []; crypto.subtle.digest = nativeDigest;
        for (const index of order) {
          await releases.get(index)(); const count = 2 - releasedStates.length;
          while (reader.processingState().activeJobs >= count) { if (performance.now() > end) throw Error('Native custody cleanup did not release its slot'); await new Promise(resolve => setTimeout(resolve, 1)); }
          releasedStates.push(reader.processingState());
        }
        const outcomeNames = await Promise.all(pending), originals = [];
        for (let index = 0; index < 2; index++) if (published[index]) { originals.push({ role: roles[index], exactBytes: new TextDecoder().decode(evidence.originalBytes(results[index].handle, roles[index])) === (index ? halo : pax) }); evidence.releaseFileEvidence(results[index].handle); }
        return { reached: releases.size, native: __qcNativeWorkers.length === 2 && __qcNativeWorkers.every(worker => Object.prototype.toString.call(worker) === '[object Worker]'), roles, canceled, order, ms, heldBefore, heldAfter, releasedStates, published, outcomeNames, originals, workers: __qcWorkers.map(worker => ({ ...worker })), state: reader.processingState(), inputBytes: files.map(input => input.size) };
      }, { pax, halo, kind });
      const both = kind.endsWith('both');
      need(result.native && result.reached === 2 && result.heldBefore.activeJobs === 2 && result.heldAfter.activeJobs === 2 && result.heldAfter.reservedBytes === Buffer.byteLength(pax + halo) && result.releasedStates[0].activeJobs === 1 && result.releasedStates[1].activeJobs === 0 && result.published.filter(Boolean).length === (both ? 0 : 1) && result.originals.every(value => value.exactBytes) && result.workers.every(worker => worker.stops === 1) && !result.state.activeJobs && !result.state.reservedBytes && !result.state.cachedSources && (kind === 'deadline-both' ? result.ms >= 0 && result.ms <= 1500 : result.ms >= 0 && result.ms <= 250), 'Paired native adoption lifetime failed ' + JSON.stringify(result));
      result.postStopTicksUnchanged = await quietTicks(result); add('F13P3C-ADOPTION-' + kind, 'adoption', kind, result);
    }

    // Fixed finite grid: initial Pax discovery in five native phases and three
    // receiving/adoption phases. No arbitrary Cartesian or device claim.
    const transitions = ['read','hash','decode','scan','stalled-read','copy','probe','full'].flatMap(stage =>
      ['guide','evidence','pagehide','reset','remove','replace'].map(action => ({ kind: stage + '-' + action, stage, action })));
    for (const scenario of transitions) {
      phase = 'lifecycle-' + scenario.kind;
      const workerStage = ['read','hash','decode','scan','stalled-read'].includes(scenario.stage);
      if (workerStage) await page.route('**/file-processing-worker.mjs', async route => {
        const response = await route.fetch(), stage = scenario.stage;
        // Only the retired occurrence is fault-controlled; a replacement uses
        // the unaltered native acquisition/decoder/lexer in a separate Worker.
        const prefix = `const __stage=${JSON.stringify(stage)},__read=File.prototype.arrayBuffer;let __controlled=false;const __busy=()=>{self.postMessage({__qcTrace:true});let n=0;for(;;)if(++n%1000000===0)self.postMessage({__qcTrace:true});};File.prototype.arrayBuffer=function(){__controlled=this.name==='pax-file.csv';if(__controlled&&__stage==='read')return __busy();if(__controlled&&__stage==='stalled-read'){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});}return __read.call(this);};if(__stage==='hash'){const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=(algorithm,bytes)=>__controlled&&bytes.byteLength>3?new Promise(()=>setInterval(()=>self.postMessage({__qcTrace:true}),10)):digest(algorithm,bytes);}if(__stage==='decode'){const decode=TextDecoder.prototype.decode;TextDecoder.prototype.decode=function(bytes,...args){return __controlled&&bytes.byteLength>20?__busy():decode.call(this,bytes,...args);};}if(__stage==='scan'){const Native=Uint32Array;globalThis.Uint32Array=class extends Native{constructor(n,...args){if(__controlled&&typeof n==='number'&&n>20)__busy();super(n,...args);}};}\n`;
        await route.fulfill({ response, body: prefix + await response.text() });
      });
      await fresh();
      let input = pax;
      if (scenario.stage === 'copy') input = await page.evaluate(async () => { const p = await import('/preflight.mjs'), f = await import('/qc-resource-fixtures.mjs'); return f.maximumCellByteCsv(['source_account_id', ...p.PAX8_COLUMNS, ...Array.from({ length: 54 }, (_, i) => 'extra' + i)], ['a','$id','c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew']); });
      await page.evaluate(async ({ scenario, input }) => {
        const reader=await import('/bounded-reader.mjs');
        const { stage, action } = scenario;
        window.__closureReached = 0; window.__closureFields = 0; window.__closureDigestBytes = null; window.__closureAck = null; window.__closureInput = input; window.__closureArmed = false; window.__closureCheckedInvalid = false; window.__closureCheckedTwin = false; window.__closureSawColumn64 = false; window.__closureHeld = null;
        const type = action === 'pagehide' ? 'pagehide' : ['remove','replace'].includes(action) ? 'change' : 'click';
        const id = ({ guide: 'open-file-guide', evidence: 'open-evidence', reset: 'clear-records', remove: 'pax-file', replace: 'pax-file' })[action];
        window.addEventListener(type, event => {
          if (!window.__closureArmed || window.__closureAck !== null || (type !== 'pagehide' && event.target.closest?.('[id]')?.id !== id)) return;
          if (action === 'replace') window.__closureReplacementFile = document.getElementById('pax-file').files[0];
          window.__closureAck = { pending: true }; const started = performance.now();
          requestAnimationFrame(() => { window.__closureAck = { ms: performance.now() - started, stops: __qcWorkers[0].stops, statusHidden: document.getElementById('cancel-case-finder').hidden }; });
        }, true);
        window.__closureAction = () => {
          if (action === 'guide') document.getElementById('open-file-guide').click();
          if (action === 'evidence') document.getElementById('open-evidence').click();
          if (action === 'reset') document.getElementById('clear-records').click();
          if (action === 'pagehide') window.dispatchEvent(new PageTransitionEvent('pagehide'));
          if (action === 'remove' || action === 'replace') {
            const control = document.getElementById('pax-file'), transfer = new DataTransfer();
            if (action === 'replace') transfer.items.add(new File([__closureInput], 'replacement-pax-file.csv', { type: 'text/csv' }));
            control.files = transfer.files; control.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };
        if (['copy','probe','full'].includes(stage)) {
          if (stage === 'copy') {
            const nativeFreeze = Object.freeze; let fields = 0; window.__restoreDependency = () => { Object.freeze = nativeFreeze; };
            Object.freeze = function (object) { const value = nativeFreeze.call(Object, object);const input=document.getElementById('pax-file').files[0]; if (__qcReconstructedCell(object,input)) {
              if(!__closureCheckedInvalid){window.__closureCheckedInvalid=true;for(const column of[0,65]){const probe=Object.assign(Object.create(null),object,{columnIndex:column}),before=fields;Object.freeze(probe);if(__qcReconstructedCell(probe,input)||fields!==before)throw Error('Invalid column reached the live lifecycle reconstruction phase');}const twin=new File([__closureInput],input.name,{type:input.type,lastModified:input.lastModified});window.__closureCheckedTwin=!__qcReconstructedCell(object,twin);if(!__closureCheckedTwin)throw Error('Different File occurrence reached lifecycle reconstruction');}
              if(Object.getOwnPropertyDescriptor(object,'columnIndex').value===64)window.__closureSawColumn64=true;
              window.__closureFields = ++fields; if (fields === 1000) setTimeout(() => { window.__closureHeld=reader.processingState(); __closureReached++; window.__closureArmed = true; __closureAction(); }, 0);
            } return value; };
          } else {
            const nativeDigest = crypto.subtle.digest.bind(crypto.subtle); let held = false; window.__restoreDependency = () => { crypto.subtle.digest = nativeDigest; };
            crypto.subtle.digest = (algorithm, bytes) => !held && (stage === 'probe' ? bytes.byteLength === 3 : bytes.byteLength > 3) ? new Promise(resolve => { held = true; __closureReached++; window.__closureDigestBytes = bytes.byteLength; window.__releaseDependency = () => nativeDigest(algorithm, bytes).then(resolve); }) : nativeDigest(algorithm, bytes);
          }
        }
      }, { scenario, input });
      // The initial upload must not consume the acknowledgement intended for
      // removal/replacement. Arm only once the exact processing phase is reached.
      await file('pax-file', input);
      if (workerStage) await page.waitForFunction(() => __qcWorkers[0]?.ticks > 1);
      else await page.waitForFunction(() => __closureReached > 0);
      if (scenario.stage !== 'copy') await page.evaluate(() => { window.__closureArmed = true; window.__closureAck = null; });
      // Reconstruction's next-task hook already owns the transition; arm its event earlier
      // than any external await so it cannot be lost to CLI round-trip scheduling.
      if (scenario.stage === 'copy') {
        // Its acknowledgement was produced in the same task as reached. Retain it
        // from the captured event; no second action is allowed.
      } else if (workerStage) {
        if (scenario.action === 'guide') await page.locator('#open-file-guide').click();
        if (scenario.action === 'evidence') await page.locator('#open-evidence').click();
        if (scenario.action === 'reset') await page.locator('#clear-records').click();
        if (scenario.action === 'pagehide') await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
        if (scenario.action === 'remove') await page.locator('#pax-file').setInputFiles([]);
        if (scenario.action === 'replace') await file('pax-file', input, 'replacement-pax-file.csv');
      } else await page.evaluate(() => __closureAction());
      await page.waitForFunction(() => window.__closureAck && !__closureAck.pending);
      const initial = await nativeState(), ack = await page.evaluate(() => __closureAck), reached = await page.evaluate(workerStage => workerStage ? __qcWorkers[0].ticks : __closureReached, workerStage);
      const phaseObservation = await page.evaluate(() => {if(__closureFields>0&&(!__closureCheckedInvalid||!__closureCheckedTwin||!__closureSawColumn64))throw Error('Lifecycle reconstruction did not prove invalid columns, File identity and genuine column64');return {phase:__closureFields>0?'canonical-reconstruction':null,copiedFields:__closureFields,reconstructedFields:__closureFields,held:__closureHeld,digestBytes:__closureDigestBytes};});
      need(initial.native && initial.workers[0].stops === 1 && ack.stops === 1 && ack.ms >= 0 && ack.ms <= 250 && (scenario.action === 'replace' || ack.statusHidden) && (workerStage ? reached > 1 : reached === 1) && !initial.warning && (scenario.stage !== 'copy' || phaseObservation.reconstructedFields >= 1000&&phaseObservation.reconstructedFields <65536&&phaseObservation.held.activeJobs===1&&phaseObservation.held.reservedBytes===Buffer.byteLength(input)&&phaseObservation.held.cachedSources===0) && (scenario.stage !== 'probe' || phaseObservation.digestBytes === 3) && (scenario.stage !== 'full' || phaseObservation.digestBytes === Buffer.byteLength(input)), 'Reached transition failed ' + JSON.stringify({ initial, ack, reached, phaseObservation }));
      if (!workerStage) {
        need(scenario.stage === 'copy' || initial.state.activeJobs === 1 && initial.state.reservedBytes === Buffer.byteLength(input), 'Pending native verification released its reservation early');
        await page.evaluate(async () => { __restoreDependency(); if (window.__releaseDependency) await __releaseDependency(); });
      }
      await page.waitForFunction(async () => !(await import('/bounded-reader.mjs')).processingState().activeJobs);
      const oldTicks = await page.evaluate(() => __qcWorkers[0].ticks); await page.waitForTimeout(100);
      need(await page.evaluate(ticks => __qcWorkers[0].ticks === ticks && __qcWorkers[0].stops === 1, oldTicks), 'Retired occurrence activity survived transition');
      let replacement = null;
      if (scenario.action === 'replace') {
        // A canceled adopting task still owns capacity until native crypto/yield
        // settles. Its replacement may show a repair; the explicit current-file
        // change after cleanup is the retry, not a queue or capacity bypass.
        if (!workerStage) await page.evaluate(() => document.getElementById('pax-file').dispatchEvent(new Event('change', { bubbles: true })));
        await page.waitForFunction(() => document.querySelector('#case-choice option[value="1"]:not([disabled])') && document.getElementById('cancel-case-finder').hidden);
        const beforeRecovery = await page.evaluate(() => ({ workers: __qcWorkers.length, current: document.getElementById('pax-file').files[0].name, sameFile: document.getElementById('pax-file').files[0] === window.__closureReplacementFile }));
        await page.locator('#open-evidence').click();
        await page.locator('#original-pax-file').evaluate(node => { node.open = true; });
        const pendingDownload = page.waitForEvent('download'); await page.locator('#original-pax-file .save-original').click();
        const download = await pendingDownload, chunks = [], stream = await download.createReadStream();
        for await (const chunk of stream) chunks.push(chunk);
        const recoveredBytes = Buffer.concat(chunks), expectedBytes = Buffer.from(input);
        const replacementPath = 'output/file-compatibility-principle-3-closure/native-replacement/' + scenario.stage + '.bin';
        await download.saveAs(replacementPath);
        const replacementHash = await page.evaluate(async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes)))).map(byte => byte.toString(16).padStart(2, '0')).join(''), Array.from(recoveredBytes));
        need(!await download.failure(), 'Replacement original download failed'); await healthy();
        replacement = await page.evaluate(({ beforeRecovery, exactBytes, byteLength }) => ({
          filename: document.getElementById('pax-file').files[0].name,
          exactFileIdentity: beforeRecovery.sameFile && document.getElementById('pax-file').files[0] === window.__closureReplacementFile,
          exactBytes, byteLength, recoveryWithoutNewWorker: __qcWorkers.length === beforeRecovery.workers,
          workerCount: __qcWorkers.length, chooserReady: Boolean(document.querySelector('#case-choice option[value="1"]:not([disabled])')),
          oldFilenameAbsent: !document.getElementById('original-evidence').textContent.includes('metadata): pax-file.csv.'),
        }), { beforeRecovery, exactBytes: recoveredBytes.equals(expectedBytes), byteLength: recoveredBytes.length });
        replacement.retryPerformed = !workerStage;
        replacement.download = { id: scenario.stage, role: 'pax-file', byteLength: recoveredBytes.length, sha256: replacementHash, file: replacementPath };
        need(replacement.filename === 'replacement-pax-file.csv' && replacement.exactFileIdentity && replacement.exactBytes && replacement.recoveryWithoutNewWorker && replacement.workerCount === 2 && replacement.chooserReady && replacement.oldFilenameAbsent, 'Replacement source is not the current intact occurrence ' + JSON.stringify(replacement));
      }
      const result = await nativeState();
      need(!result.warning && !result.state.activeJobs && !result.state.reservedBytes && result.state.cachedSources === (replacement ? 1 : 0) && result.copies === (replacement ? 1 : 0) && result.resultHidden && result.claimsEmpty && result.workers.length === (replacement ? 2 : 1) && result.workers.every(worker => worker.stops === 1), 'Lifecycle final state retained old authority/work ' + JSON.stringify(result));
      result.postStopTicksUnchanged = await quietTicks(result);
      add('F13P3C-LIFECYCLE-' + scenario.kind, 'lifecycle', scenario.kind, { ...result, reached, stage: scenario.stage, action: scenario.action, inputBytes: Buffer.byteLength(input), phaseObservation, ms: ack.ms, ack, held: initial.state, replacement });
      if (workerStage) await page.unroute('**/file-processing-worker.mjs');
    }

    for (const kind of ['id','term','agreement','expiry']) {
      phase = 'comparison-edit-' + kind; await stallHalo();
      const observed = await page.evaluate(kind => {
        window.__comparisonEditAck = null;
        const eventType = kind === 'id' ? 'input' : kind === 'expiry' ? 'focus' : 'change', targetId = ({ id: 'subscription-id', term: 'renewal-term', agreement: 'agreement' })[kind];
        window.addEventListener(eventType, event => {
          if (__comparisonEditAck !== null || (kind !== 'expiry' && event.target.id !== targetId)) return;
          const start = performance.now(); window.__comparisonEditAck = { pending: true };
          requestAnimationFrame(() => { window.__comparisonEditAck = { ms: performance.now() - start, stops: __qcWorkers[2].stops, statusHidden: document.getElementById('read-status').hidden }; });
        }, true);
        return { reached: __qcWorkers[2].ticks, role: 'halo-file', activeBefore: null };
      }, kind);
      observed.activeBefore = (await nativeState()).state;
      if (kind === 'id') await page.locator('#subscription-id').fill('new-current-id');
      if (kind === 'term') await page.locator('#renewal-term').selectOption('monthly');
      if (kind === 'agreement') await page.locator('#agreement').selectOption('yes');
      if (kind === 'expiry') await page.evaluate(() => { __date = '2026-12-31T12:00:00'; window.dispatchEvent(new Event('focus')); });
      await page.waitForFunction(() => window.__comparisonEditAck && !__comparisonEditAck.pending);
      const result = await nativeState(), ack = await page.evaluate(() => __comparisonEditAck);
      const subjectCleared = await page.evaluate(() => document.getElementById('case-subject').textContent.includes('No source-selected case.'));
      need(observed.reached > 1 && observed.activeBefore.activeJobs === 1 && observed.activeBefore.reservedBytes === Buffer.byteLength(halo) && result.native && result.workers.length === 3 && result.workers.every(worker => worker.stops === 1) && ack.stops === 1 && ack.statusHidden && ack.ms >= 0 && ack.ms <= 250 && !result.state.activeJobs && !result.state.reservedBytes && result.state.cachedSources === (kind === 'expiry' ? 0 : 1) && result.copies === (kind === 'expiry' ? 0 : 1) && result.resultHidden && result.claimsEmpty && subjectCleared && !result.warning, 'Pending comparison edit left stale source authority ' + JSON.stringify({ observed, result, ack, subjectCleared }));
      result.postStopTicksUnchanged = await quietTicks(result); await page.unroute('**/file-processing-worker.mjs');
      const recovered = await retry(); need(recovered.results.every(value => value.compatible && value.exactBytes), 'Retry after comparison edit failed');
      add('F13P3C-EDIT-' + kind, 'edit', kind, { ...observed, ...result, ack, ms: ack.ms, subjectCleared, retry: recovered });
    }

    phase = 'mixed-near-limits'; await fresh();
    const mixed = await page.evaluate(async () => {
      const p = await import('/preflight.mjs'), r = await import('/bounded-reader.mjs'), e = await import('/file-evidence.mjs'), source = (await import('/actions.mjs')).SOURCES.pax, budget = (await import('/resource-packet.mjs')).assertPresentationBudget;
      const columns = ['source_account_id', ...p.PAX8_COLUMNS, ...Array.from({ length: 54 }, (_, i) => 'extra' + i)], quote = value => '"' + value.replaceAll('"', '""') + '"';
      const rows = Array.from({ length: 1021 }, (_, i) => ['a','s' + i,'c','pax8','Microsoft 365','NCE','yes','annual','2027-01-15','renew', ...Array(54).fill('é漢😀"\r\n'.repeat(2))]);
      const blanks = [Array(63).fill('""').join(','), Array(64).fill('""').join(',')];
      const assemble = () => '\uFEFF' + [columns.join(','), ...rows.map((row, i) => row.map(quote).join(',') + (i === 100 ? '\r\n' + blanks.join('\r\n') : ''))].join('\r\n');
      let text = assemble(), remaining = 1999999 - new TextEncoder().encode(text).length;
      if (remaining < 0) throw Error('Mixed fixture is too large');
      for (let i = rows.length - 1; i >= 0 && remaining; i--) for (let c = 63; c >= 10 && remaining; c--) { const amount = Math.min(1024 - rows[i][c].length, remaining); rows[i][c] += 'x'.repeat(amount); remaining -= amount; }
      text = assemble(); if (remaining || new TextEncoder().encode(text).length !== 1999999) throw Error('Mixed bytes differ from independent target');
      const root = document.getElementById('original-evidence'), before = budget(root), comments = document.createDocumentFragment();
      for (let i = before.globalNodes; i < 19999; i++) comments.append(document.createComment('bounded fixture'));
      document.body.append(comments); const dom = budget(root);
      let maxGap = 0, beats = 0, last = performance.now(); const beat = setInterval(() => { const current = performance.now(); maxGap = Math.max(maxGap, current - last); last = current; beats++; }, 10);
      const start = performance.now(), input = new File([text], 'mixed.csv'), outcome = await r.readBoundedLocalEvidence(input, 'pax-file', source, 30000, 'find-case'), projection = e.sourceProjection(outcome.handle, 'pax-file');
      await new Promise(resolve => setTimeout(resolve, 30)); clearInterval(beat);
      const suppliedBytes = new TextEncoder().encode(text), recoveredBytes = e.originalBytes(outcome.handle, 'pax-file');
      const exactBytes = suppliedBytes.length === recoveredBytes.length && suppliedBytes.every((byte, index) => recoveredBytes[index] === byte);
      const cells = projection.headers.length + 1021 * 64 + projection.emptyRuns.reduce((sum, run) => sum + run.totalCells, 0);
      e.releaseFileEvidence(outcome.handle);
      return { reached: 1, native: __qcNativeWorkers.length === 1 && Object.prototype.toString.call(__qcNativeWorkers[0]) === '[object Worker]', ms: performance.now() - start, maxGap, beats, inputBytes: input.size, cells, sourceRecords: projection.sourceRecordCount, recordCount: projection.recordCount, skipped: projection.emptyRecordCount, dom, compatible: outcome.problem === null, exactBytes, pageCells: projection.records.reduce((sum, record) => sum + record.cells.length, 0), workers: __qcWorkers.map(worker => ({ ...worker })), state: r.processingState() };
    });
    need(mixed.native && mixed.compatible && mixed.exactBytes && mixed.inputBytes === 1999999 && mixed.cells === 65535 && mixed.recordCount === 1022 && mixed.skipped === 2 && mixed.sourceRecords === 1024 && mixed.dom.globalNodes === 19999 && mixed.pageCells === 64 && mixed.maxGap <= 100 && mixed.beats >= 2 && mixed.workers[0].stops === 1 && !mixed.state.activeJobs && !mixed.state.reservedBytes && !mixed.state.cachedSources, 'Mixed near-limit input/DOM qualification failed ' + JSON.stringify(mixed));
    mixed.postStopTicksUnchanged = await quietTicks(mixed); add('F13P3C-MIXED-near-limits', 'mixed', 'near-limits', mixed);

    phase = 'cache-churn'; await fresh();
    const churn = await page.evaluate(async ({ pax, halo }) => {
      const r = await import('/bounded-reader.mjs'), e = await import('/file-evidence.mjs'), source = (await import('/actions.mjs')).SOURCES, handles = [null, null], samples = [];
      for (let round = 0; round < 12; round++) {
        const index = round % 2, role = index ? 'halo-file' : 'pax-file', text = (index ? halo : pax).replace(',s,', ',s' + round + ','), input = new File([text], role + '.csv');
        const outcome = await r.readBoundedLocalEvidence(input, role, index ? source.halo : source.pax, 30000, index ? 'compare-records' : 'find-case'), previous = handles[index]; handles[index] = outcome.handle;
        e.releaseFileEvidence(previous);
        const state = r.processingState(), exactBytes = new TextDecoder().decode(e.originalBytes(outcome.handle, role)) === text;
        if (outcome.problem || !exactBytes || state.activeJobs || state.reservedBytes || state.cachedSources > 2) throw Error('Churn lost occurrence or capacity');
        samples.push({ round, role, compatible: outcome.problem === null, exactBytes, state });
      }
      handles.forEach(handle => e.releaseFileEvidence(handle));
      return { reached: samples.length, rounds: 12, native: __qcNativeWorkers.length === 12 && __qcNativeWorkers.every(worker => Object.prototype.toString.call(worker) === '[object Worker]'), samples, workers: __qcWorkers.map(worker => ({ ...worker })), state: r.processingState() };
    }, { pax, halo });
    need(churn.native && churn.samples.length === 12 && churn.workers.every(worker => worker.stops === 1) && !churn.state.activeJobs && !churn.state.reservedBytes && !churn.state.cachedSources, 'Bounded churn did not release');
    churn.postStopTicksUnchanged = await quietTicks(churn); add('F13P3C-CACHE-churn', 'cache', 'churn', churn);

    for (const kind of ['error-setter','listener-add','message-setter','error-suppression']) {
      phase = 'runtime-' + kind; await fresh();
      const result = await page.evaluate(async ({ pax, kind }) => {
        const reader = await import('/bounded-reader.mjs'), source = (await import('/actions.mjs')).SOURCES.pax, Native = Worker, controller = new AbortController(); let reached = 0, sends = 0;
        window.Worker = class extends Native {
          postMessage(...args) { sends++; return super.postMessage(...args); }
          addEventListener(type, listener, ...args) { const result = super.addEventListener(type, listener, ...args); if (kind === 'listener-add' && type === 'messageerror') { reached++; controller.abort(); } return result; }
          get onerror() { return super.onerror; }
          set onerror(handler) { super.onerror = handler; if (kind === 'error-setter' && handler) { reached++; handler(new ErrorEvent('error')); } }
          get onmessage() { return super.onmessage; }
          set onmessage(handler) { super.onmessage = handler; if (kind === 'message-setter' && handler) { reached++; controller.abort(); } }
        };
        let published = false, name = ''; const start = performance.now(), pending = reader.readBoundedLocalEvidence(new File([pax], 'reentry.csv'), 'pax-file', source, 30000, 'find-case', controller.signal).then(() => { published = true; }, error => { name = error.name; });
        if (kind === 'error-suppression') {
          const worker = __qcNativeWorkers[0], event = new ErrorEvent('error', { cancelable: true });
          Object.defineProperty(event, 'preventDefault', { value() { reached++; throw Error('controlled suppression fault'); } });
          worker.dispatchEvent(event);
        }
        await pending; const worker = __qcNativeWorkers[0];
        return { reached, native: Object.prototype.toString.call(worker) === '[object Worker]', ms: performance.now() - start, sends, name, published, messageCleared: worker.onmessage === null, errorCleared: worker.onerror === null, workers: __qcWorkers.map(item => ({ ...item })), state: reader.processingState() };
      }, { pax, kind });
      need(result.native && result.reached === 1 && !result.published && result.name === 'InputProblem' && result.ms >= 0 && result.ms <= 250 && result.sends === (kind === 'error-suppression' ? 1 : 0) && result.messageCleared && result.errorCleared && result.workers[0].stops === 1 && !result.state.activeJobs && !result.state.reservedBytes, 'Controlled native setup/error retirement failed ' + JSON.stringify(result));
      result.postStopTicksUnchanged = await quietTicks(result); add('F13P3C-RUNTIME-' + kind, 'runtime', kind, result);
    }

    for (const kind of ['pending','forced-colors']) {
      phase = 'a11y-' + kind; await page.emulateMedia({ forcedColors: kind === 'forced-colors' ? 'active' : 'none' }); await stallHalo();
      await page.addScriptTag({ url: origin + '/qc-vendor/axe-4.10.3.min.js' });
      const scan = await page.evaluate(async () => { const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }); return { version: result.testEngine.version, violations: result.violations.map(value => ({ id: value.id, nodes: value.nodes.length })), rulesPassed: result.passes.length }; });
      need(scan.version === '4.10.3' && scan.rulesPassed > 0 && scan.violations.length === 0, 'Pending cancellation accessibility failed ' + JSON.stringify(scan));
      scans.push({ name: kind, ...scan }); await page.getByRole('button', { name: 'Cancel this check', exact: true }).focus(); await page.keyboard.press('Enter');
      const result = await nativeState();
      need(result.native && result.workers.some(worker => worker.ticks > 1) && result.workers.every(worker => worker.stops === 1) && !result.state.activeJobs && !result.state.reservedBytes && result.resultHidden && result.claimsEmpty && !result.warning, 'Keyboard cancellation did not stop native work');
      result.postStopTicksUnchanged = await quietTicks(result); add('F13P3C-A11Y-' + kind, 'a11y', kind, { reached: 1, ...result }); await page.unroute('**/file-processing-worker.mjs');
    }
    await page.emulateMedia({ forcedColors: 'none' });
    phase = 'literal-default-deadline';
    await page.route('**/file-processing-worker.mjs', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: "File.prototype.arrayBuffer=function(){setInterval(()=>self.postMessage({__qcTrace:true}),10);return new Promise(()=>{});};\n" + await response.text() });
    });
    await fresh();
    const deadline = await page.evaluate(async pax => {
      const reader = await import('/bounded-reader.mjs'), Input = (await import('/actions.mjs')).InputProblem, source = (await import('/actions.mjs')).SOURCES.pax;
      let published = false, ownedTimeout = false, message = ''; const started = performance.now();
      try { await reader.readBoundedLocalEvidence(new File([pax], 'default-deadline.csv'), 'pax-file', source); published = true; }
      catch (error) { message = error.message; ownedTimeout = error instanceof Input && /timed out/.test(message); }
      return { reached: __qcWorkers[0]?.ticks ?? 0, native: __qcNativeWorkers.length === 1 && Object.prototype.toString.call(__qcNativeWorkers[0]) === '[object Worker]', ms: performance.now() - started, timeoutMs: 30000, ownedTimeout, published, message, workers: __qcWorkers.map(worker => ({ ...worker })), state: reader.processingState() };
    }, pax);
    need(deadline.native && deadline.reached > 1 && deadline.ms >= 30000 && deadline.ms <= 30250 && deadline.ownedTimeout && !deadline.published && deadline.workers[0].stops === 1 && !deadline.state.activeJobs && !deadline.state.reservedBytes && !deadline.state.cachedSources, 'Literal native default deadline failed ' + JSON.stringify(deadline));
    deadline.postStopTicksUnchanged = await quietTicks(deadline); await page.unroute('**/file-processing-worker.mjs'); add('F13P3C-DEADLINE-default', 'deadline', 'default', deadline);
    need(assertions.length === 85 && JSON.stringify(assertions) === JSON.stringify(expected) && measurements.length === 85 && errors.length === 0, 'Resource closure inventory or uncaught errors changed ' + JSON.stringify({ assertions, errors }));
    return 'PASS: F13P3-RESOURCE-CLOSURE:' + JSON.stringify({ assertions, measurements, scans, scope: 'finite local Chromium native Worker and custody lifecycle qualification plus explicitly injected CSS, packet and host faults; no universal device, OS termination or peak resident-memory claim' });
  } catch (error) {
    throw Error(error.message + ' phase=' + phase + ' passed=' + JSON.stringify(assertions));
  }
}
