import { padCsvBytes } from './qc-resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCaseFinder, searchCaseFinder, assertCaseFinder, selectFoundCase, assertFoundCase, assertCaseSubject, confirmCaseSelection, reviewCaseSelection, parseCsv, PAX8_COLUMNS } from './preflight.mjs';
import { isoDateUTC, validIsoDate, visibleText, exactTextJson, frozenData } from './input.mjs';
import { readLocalFile } from './runtime.mjs';
import { SOURCES } from './actions.mjs';
const ledger = JSON.parse(readFileSync(new URL('../output/one-case-principle-5-closure/closure-ledger.json', import.meta.url)));
const columns = ['source_account_id', ...PAX8_COLUMNS, 'customer_name', 'product_name', 'product_sku', 'seat_count'];
const row = (id = 's', changes = {}) => ({ source_account_id:'a', subscription_id:id, customer_ref:'c', distributor:'pax8', product_family:'Microsoft 365', commerce_model:'NCE', seat_based:'yes', commitment_term:'annual', renewal_date:'2027-01-15', end_of_term_state:'renew', customer_name:'Acme Café', product_name:'Business Premium', product_sku:'sku-123', seat_count:'25', ...changes });
const q = x => '"' + String(x ?? '').replaceAll('"', '""') + '"';
const csv = (rows, cols = columns) => cols.map(q).join(',') + '\n' + rows.map(r => cols.map(k => q(r[k])).join(',')).join('\n');
const handle = rows => createCaseFinder(csv(rows));
const find = (h, filters = {}, offset = 0) => assertCaseFinder(searchCaseFinder(h, filters, offset), h, filters, offset);
const choose = (h, n) => assertFoundCase(selectFoundCase(h, n), h, n);
let resource;
function profile() {
  if (resource) return resource;
  const start = performance.now();
  const descriptors = 'abcdefghijklmnopqrstuvwxyz '.repeat(37).slice(0, 999);
  const text = csv(Array.from({length:1700}, (_, i) => row('s'+i, {customer_name:descriptors})));
  const h = createCaseFinder(text); let p;
  for (let i=0;i<20;i++) p=find(h,{query:'a b c d e f g h missing-last-token'});
  assert.equal(p.matchCount,0); for(let i=0;i<3;i++)assert.equal(choose(h,1700).subject.subscriptionId,'s1699');
  const multi = csv(Array.from({length:800}, (_,i)=>row('u'+i,{customer_name:'漢'.repeat(600)})));
  assert.ok(Buffer.byteLength(multi)<2000000); assert.equal(find(createCaseFinder(multi),{customer:'漢'}).matchCount,800);
  const cols=[...columns,...Array.from({length:64-columns.length},(_,i)=>'extra_'+i)];
  const item=row(); for(const key of cols.slice(columns.length)) item[key]='x'.repeat(1024);
  const wide=csv(Array.from({length:24},(_,i)=>({...item,subscription_id:'w'+i})),cols);
  assert.ok(Buffer.byteLength(wide)<2000000); const selected=choose(createCaseFinder(wide),24);
  assert.equal(selected.subject.evidence.fields.length,64); assert.equal(selected.subject.evidence.fields.at(-1).rawValue.length,1024);
  const elapsedMs=performance.now()-start; assert.ok(elapsedMs<10000);
  resource={rows:1700,wideColumns:64,wideRows:24,multibyteRows:800,repeatedQueries:20,sourceBytes:Buffer.byteLength(text),elapsedMs,heapUsedBytes:process.memoryUsage().heapUsed,scope:'single local Node profile; no device/P95/GC guarantee'};
  assert.ok(resource.heapUsedBytes<1024*1024*1024); console.log('P5C-RESOURCE:'+JSON.stringify(resource)); return resource;
}
async function contract(family, n) {
  const text=csv([row(),row('other',{customer_name:'Beta',source_account_id:'b',renewal_date:'2028-01-15'})]);
  const h=createCaseFinder(text);
  switch(family) {
    case 2: {
      const bad=[text.replace('subscription_id','absent'),text.replace('customer_name','CUSTOMER_REF'),text+'\nwrong',text+'\n"unclosed'];
      if(n<=4) {assert.throws(()=>createCaseFinder(bad[n-1]));if(n===4)assert.throws(()=>createCaseFinder(text+'\n"closed"junk'));}
      else if(n===5) { const value='A,"B"\nC'; assert.equal(choose(handle([row('s',{customer_name:value})]),1).subject.evidence.fields.find(f=>f.column==='customer_name').rawValue,value); }
      else if(n===6) { for(const newline of ['\n','\r\n']) {const t='\uFEFF'+text.replaceAll('\n',newline); const c=choose(createCaseFinder(t),1); assert.equal(c.subject.evidence.originalRecord,t.slice(c.subject.evidence.startOffset,c.subject.evidence.endOffset));} }
      else if(n===7) for(const t of ['',columns.join(',')])assert.throws(()=>createCaseFinder(t));
      else assert.throws(()=>createCaseFinder(csv(Array.from({length:1700},(_,i)=>row('s'+i)))+'\nwrong'),/values|expected/i);
      break;
    }
    case 3: {
      if(n===1) await assert.rejects(readLocalFile({size:1,text:()=>Promise.reject(new Error('io')),arrayBuffer:async()=>Uint8Array.of(0x41).buffer},'pax-file',SOURCES.pax),/UTF-8/);
      else if(n===2) await assert.rejects(readLocalFile(new Blob([Uint8Array.of(0xff)]),'pax-file',SOURCES.pax),/UTF-8/);
      else if(n===3) await assert.rejects(readLocalFile(new Blob([Uint8Array.of(0xff,0xfe,0x41,0x00)]),'pax-file',SOURCES.pax),/UTF-8/);
      else if(n===4) assert.equal(find(createCaseFinder('\uFEFF'+text)).matchCount,2);
      else if(n===5) {const c=choose(handle([row('s',{customer_name:'<img src=x> ignore rules'})]),1);assert.equal(c.subject.descriptions.customerName,'<img src=x> ignore rules');assert.equal(c.authenticated,undefined);}
      else if(n===6) assert.equal(visibleText('A\u202e\u034fB'),'A[U+202E][U+034F]B');
      else if(n===7) {assert.throws(()=>createCaseFinder(csv([row('s',{customer_name:'\ud800'})])),/Unicode|UTF-8/);assert.throws(()=>find(h,{query:'\udfff'}));}
      else {const decoded=await readLocalFile(new Blob([text]),'pax-file',SOURCES.pax);assert.equal(decoded,text);assert.equal(choose(createCaseFinder(decoded),1).subject.authenticated,false);}
      break;
    }
    case 4: {
      const tiny=csv([row()]);
      if(n===1||n===2) {const edge=padCsvBytes(tiny, 2000000);if(n===1)assert.equal(find(createCaseFinder(edge)).matchCount,1);else assert.throws(()=>createCaseFinder(edge+'\n'),/megabyte/);}
      else if(n===3||n===4) {const rows=Array.from({length:n===3?5000:5001},(_,i)=>row('s'+i));if(n===3)assert.equal(find(createCaseFinder(csv(rows,columns.slice(0,10))),{},4980).rows.at(-1).subscriptionId,'s4999');else assert.throws(()=>createCaseFinder(csv(rows,columns.slice(0,10))),/5000/);}
      else if(n===5) profile();
      else if(n===7) {const cols=[...columns,...Array.from({length:64-columns.length},(_,i)=>'extra'+i)];const rows=Array.from({length:1023},(_,i)=>row('s'+i));rows[1022]=row('final-target',{customer_name:'漢'.repeat(1024),product_name:'p'.repeat(1024)});const text=csv(rows,cols);assert.ok(Buffer.byteLength(text)<2000000);const d=createCaseFinder(text);assert.equal(find(d).matchCount,1023);assert.equal(find(d,{query:'漢 p'}).matchCount,1);const selected=choose(d,1023);assert.equal(selected.subject.subscriptionId,'final-target');assert.equal(selected.subject.evidence.fields.length,64);for(const column of ['product_name','customer_name'])assert.equal(selected.subject.evidence.fields.find(f=>f.column===column).rawValue.length,1024);}
      else if(n===6) {assert.throws(()=>parseCsv('a,'+Array.from({length:64},(_,i)=>'c'+i).join(',')+'\n'+Array(65).fill('x').join(','),['a']),/64/);assert.throws(()=>parseCsv('a\n'+'x'.repeat(1025),['a']),/1024/);}
      else assert.throws(()=>handle([row('s',{customer_name:'x'.repeat(1025)})]),/1024/);
      break;
    }
    case 5: {
      const c=choose(handle([row(' s ',{customer_name:' A,"B"\nC ',notes:'<img>\u202e'})]),1);
      if(n===1) {assert.equal(c.subject.subscriptionId,'s');assert.equal(c.subject.raw.subscription_id,' s ');}
      else if(n===2) assert.equal(c.subject.evidence.fields.find(f=>f.column==='customer_name').rawValue,' A,"B"\nC ');
      else if(n===3) {const x=choose(h,2);assert.equal(x.subject.evidence.originalRecord,text.slice(x.subject.evidence.startOffset,x.subject.evidence.endOffset));}
      else if(n===4) {const t=csv([row('first',{customer_name:'first\nsecond\nthird'}),row('second')]);const second=choose(createCaseFinder(t),2);assert.equal(second.subject.recordNumber,2);assert.ok(t.slice(0,second.subject.evidence.startOffset).split('\n').length>3);assert.equal(second.subject.evidence.originalRecord,t.slice(second.subject.evidence.startOffset,second.subject.evidence.endOffset));}
      else if(n===5) {const t=csv([row('s',{notes:'exact'})],[...columns,'notes']);assert.equal(choose(createCaseFinder(t),1).subject.evidence.fields.at(-1).rawValue,'exact');}
      else if(n===6) {const p=find(handle([row('one'),row('two')]));assert.deepEqual(p.rows.map(r=>r.subscriptionId),['one','two']);}
      else {const source=csv([row(' s ',{customer_name:' "Acme"\u034f '})]);const d=createCaseFinder(source);const c=choose(d,1);assert.equal(c.subject.raw.subscription_id,' s ');assert.equal(c.subject.subscriptionId,'s');const raw=c.subject.evidence.fields.find(f=>f.column==='customer_name').rawValue;assert.equal(raw,' "Acme"\u034f ');assert.equal(visibleText(raw),' "Acme"[U+034F] ');assert.equal(JSON.parse(exactTextJson(raw)),raw);assert.equal(find(d,{query:'Acme'}).matchCount,1);}
      break;
    }
    case 6: {
      const queries={1:['Acme','c'],2:['Premium','Microsoft','sku-123'],3:['s','a','25','annual','2027-01-15']};
      if(n<=3) for(const query of queries[n]) assert.ok(find(h,{query}).rows.some(r=>r.subscriptionId==='s'));
      else if(n===4) {const c=choose(handle([row('s',{customer_name:'',product_name:''})]),1);assert.equal(c.subject.descriptions.customerName,null);assert.equal(c.subject.subscriptionId,'s');}
      else if(n===5) assert.equal(find(createCaseFinder(csv([row('s',{notes:'unique-note'})],[...columns,'notes'])),{query:'unique-note'}).matchCount,0);
      else assert.equal(find(h,{query:'nonexistent-alias'}).matchCount,0);
      break;
    }
    case 7: {
      if(n===1) assert.equal(find(h,{query:'   '}).matchCount,2);
      else if(n===2) assert.equal(find(h,{query:'Acme premium 25'}).matchCount,1);
      else if(n===3) assert.equal(find(h,{query:'Acme Beta'}).matchCount,0);
      else if(n===4) {const x=handle([row('s',{customer_name:'[.*] <img>'})]);for(const query of ['[.*]','<img>'])assert.equal(find(x,{query}).matchCount,1);}
      else if(n===5) assert.equal(find(handle([row('s',{seat_count:'125'})]),{query:'25'}).matchCount,1);
      else for(const query of ['Acme OR Beta','Acme*','"Acme premium"'])assert.equal(find(h,{query}).matchCount,0);
      break;
    }
    case 8: {
      const values={1:['Café','cafe',0],2:['İSTANBUL','İSTANBUL',1],3:['Café','Cafe\u0301',0],4:['Straße','STRASSE',0],5:['Ａcme','Acme',0],7:['😀','😀',1]};const [name,query,count]=values[n];assert.equal(find(handle([row('s',{customer_name:name})]),{query}).matchCount,count);assert.equal(choose(handle([row('S'),row('s')]),1).subject.subscriptionId,'S');if(n===1)assert.equal(find(h,{query:'café'}).matchCount,1);if(n===2)assert.equal(find(handle([row('s',{customer_name:'İSTANBUL'})]),{query:'ISTANBUL'}).matchCount,0);if(n===4){assert.equal(find(handle([row('s',{customer_name:'Σ'})]),{query:'σ'}).matchCount,1);assert.equal(find(handle([row('s',{customer_name:'Σ'})]),{query:'ς'}).matchCount,0);}if(n===7)assert.throws(()=>find(h,{query:'😀'.repeat(81)}));
      break;
    }
    case 9: {
      if(n===1) for(const key of ['query','customer','product'])assert.throws(()=>find(h,{[key]:'x'.repeat(161)}));
      else if(n===2) assert.throws(()=>find(h,{account:'x'.repeat(129)}));
      else if(n===3) { for(const value of ['x\t','x\n','x\u034f','\ud800'])assert.throws(()=>find(h,{query:value})); assert.throws(()=>find(h,{account:'x\uFFFD'})); }
      else if(n===4) {let calls=0;const cycle={};cycle.query=cycle;for(const value of [{extra:'x'},[],{query:4},{get query(){calls++;return '';}},Object.create({query:'Acme'}),cycle])assert.throws(()=>find(h,value));assert.equal(calls,0);}
      else if(n===5||n===6) {for(const key of ['query','account','customer','product','from','to'])for(const value of [null,undefined])assert.throws(()=>find(h,{[key]:value}));assert.equal(find(h).matchCount,2);}
      else if(n===7) {assert.throws(()=>find(h,{query:'x'.repeat(161)}));assert.equal(find(h,{query:''}).matchCount,2);}
      else assert.throws(()=>find(h,{from:'2027-02-29'}));
      break;
    }
    case 10: {
      if(n===1) assert.equal(find(h,{account:'A'}).matchCount,0);
      else if(n===2) assert.equal(find(h,{account:' a '}).matchCount,1);
      else if(n===3||n===4) {const d=handle([row('s'),row('s',{source_account_id:'b'})]);const p=find(d,{account:'a'});assert.equal(p.matchCount,1);assert.equal(p.rows[0].duplicateCount,2);assert.throws(()=>choose(d,1));}
      else if(n===5) assert.equal(find(h,{account:'alias-a'}).matchCount,0);
      else if(n===6) assert.equal(find(handle([row('s',{source_account_id:''})]),{account:'a'}).matchCount,0);
      else {const x=handle([row('s',{source_account_id:'001'}),row('other',{source_account_id:'1'})]);assert.equal(find(x,{account:'001'}).rows[0].subscriptionId,'s');assert.equal(find(x,{account:'1'}).rows[0].subscriptionId,'other');}
      break;
    }
    case 11: {
      if(n===1) assert.equal(find(h,{customer:'Acme',product:'unknown'}).matchCount,0);
      else if(n===2) assert.equal(find(h,{product:'Premium',customer:'unknown'}).matchCount,0);
      else if(n===3) for(const customer of ['c','ACME'])assert.equal(find(h,{account:'a',customer}).matchCount,1);
      else if(n===4) for(const product of ['Microsoft','Premium','SKU-123'])assert.equal(find(h,{account:'a',product}).matchCount,1);
      else if(n===5) assert.equal(find(h,{account:'a',customer:'Acme',product:'Premium',from:'2027-01-15',to:'2027-01-15'}).matchCount,1);
      else assert.equal(find(h,{customer:'Acme Beta'}).matchCount,0);
      break;
    }
    case 12: {
      if(n===1) assert.equal(find(h,{from:'2027-01-15',to:'2027-01-15'}).matchCount,1);
      else if(n===2) {assert.equal(find(h,{from:'2028-01-15'}).matchCount,1);assert.equal(find(h,{to:'2027-01-15'}).matchCount,1);}
      else if(n===3) assert.throws(()=>find(h,{from:'2028-01-01',to:'2027-01-01'}));
      else if(n===4) {assert.throws(()=>find(h,{from:'2027-02-29'}));assert.doesNotThrow(()=>find(h,{from:'2028-02-29'}));assert.equal(validIsoDate('1900-02-29'),false);assert.equal(validIsoDate('2000-02-29'),true);}
      else if(n===5) for(const from of ['15/01/2027','2027-01-15T00:00:00Z'])assert.throws(()=>find(h,{from}));
      else {for(const date of ['0001-01-01','0099-12-31','0100-01-01','9999-12-31'])assert.equal(new Date(isoDateUTC(date)).getUTCFullYear(),Number(date.slice(0,4)));assert.equal(validIsoDate('0000-01-01'),false);}
      break;
    }
    case 13: {
      const d=handle([row('bad',{renewal_date:'unknown'}),row('blank',{renewal_date:''}),row('old',{renewal_date:'2026-01-01'}),row('valid')]);
      if(n===1) assert.equal(find(d).matchCount,4);
      else if(n===2) assert.equal(find(d,{from:'2027-01-01'}).excludedDates,2);
      else if(n===3) assert.equal(find(d,{query:'absent',from:'2027-01-01'}).excludedDates,0);
      else if(n===4) {const p=find(d,{query:'bad',from:'2027-01-01'});assert.equal(p.matchCount,0);assert.equal(p.excludedDates,1);}
      else if(n===5) {const p=find(d,{from:'2027-01-01'});assert.equal(p.matchCount,1);assert.equal(p.excludedDates,2);assert.equal(p.totalRows,4);}
      else assert.equal(choose(d,1).subject.renewalDate,null);
      break;
    }
    case 14: {
      if(n===4) {const d=handle([row('S'),row('s'),row('Ｓ')]);assert.equal(find(d).rows.every(x=>x.selectable),true);assert.equal(choose(d,3).subject.subscriptionId,'Ｓ');}
      else if(n===5) for(const id of ['', 's\u034f','x'.repeat(129)]){const d=handle([row(id)]);assert.equal(find(d).rows[0].selectable,false);assert.throws(()=>choose(d,1));}
      else {const variants=n===2?[{customer_name:'Different'},{source_account_id:'b'},{customer_ref:'other'}]:[{customer_name:n===1?'Acme Café':'Different',source_account_id:n===7?'b':'a',renewal_date:n===6?'2028-01-15':'2027-01-15'}];for(const variant of variants){const d=handle([row(n===3?' s ':'s'),row('s',variant)]);assert.equal(find(d,{customer:'Acme'}).rows.every(x=>!x.selectable),true);assert.throws(()=>choose(d,1));assert.throws(()=>choose(d,2));}}
      break;
    }
    case 15: {
      const variants=n===2?[{source_account_id:''},{customer_ref:''},{renewal_date:''}]:n===3?[{source_account_id:'',customer_ref:''}]:[{source_account_id:'',customer_ref:'',renewal_date:'unknown'}];for(const changes of variants){const t=csv([row('s',changes)]);const d=createCaseFinder(t);assert.equal(find(d).rows[0].selectable,true);assert.equal(choose(d,1).status,'unresolved');assert.equal(choose(d,1).canConfirm,false);assert.throws(()=>confirmCaseSelection(t,'s'));}if(n===3){const d=handle([row('',{customer_name:'Great labels'})]);assert.equal(find(d).rows[0].selectable,false);assert.throws(()=>choose(d,1));}
      break;
    }
    case 16: {
      if(n===1) {const p=find(handle([row()]));assert.equal(p.matchCount,1);assert.equal(choose(handle([row()]),1).status,'candidate');}
      else if(n===2) assert.equal(find(h).rows.length,2);
      else if(n===3) assert.equal(find(h,{query:'absent'}).matchCount,0);
      else if(n===4) {assert.throws(()=>createCaseFinder('bad'));assert.equal(find(h,{query:'absent'}).matchCount,0);}
      else assert.equal(find(h).matchCount,2);
      break;
    }
    case 17: {
      if(n===2){const d=handle(Array.from({length:41},(_,i)=>row('s'+i)));assert.deepEqual([0,20,40].map(offset=>find(d,{},offset).rows.length),[20,20,1]);}
      for(const count of [1,19,20,21,39,40,41,100]){const d=handle(Array.from({length:count},(_,i)=>row('s'+i)));const ids=[];for(let offset=0;offset<count;offset+=20){const p=find(d,{},offset);assert.equal(p.matchCount,count);assert.ok(p.rows.length<=20);ids.push(...p.rows.map(r=>r.recordNumber));}assert.deepEqual(ids,Array.from({length:count},(_,i)=>i+1));if(n===5)assert.throws(()=>find(d,{query:'absent'},20));}
      if(n===6)for(const offset of [-1,1,0.1,Infinity,NaN,'20'])assert.throws(()=>find(h,{},offset));
      break;
    }
    case 18: {
      if(n===3) assert.throws(()=>assertFoundCase(choose(h,2),h,1));
      else if(n===4) {const fake=structuredClone(find(h));fake.rows[0].subscriptionId='other';assert.throws(()=>assertCaseFinder(fake,h));}
      else if(n===6) {const receipt=confirmCaseSelection(text,'s');assert.equal(reviewCaseSelection(text+'\n','s',receipt).status,'candidate');}
      else {const c=choose(h,1);assert.equal(c.subject.subscriptionId,'s');assert.equal(c.status,'candidate');assert.equal(c.subject.authenticated,false);assert.equal(c.subject.evidence.originalRecord,text.slice(c.subject.evidence.startOffset,c.subject.evidence.endOffset));assert.deepEqual(c,assertCaseSubject(c,text,'s'));}
      break;
    }
    case 30: profile(); break;
    case 34: {
      if(n===1) {for(const d of [{},structuredClone(h),JSON.parse(JSON.stringify(h)),null])assert.throws(()=>find(d));const other=await import('./preflight.mjs?closure-foreign');assert.throws(()=>other.searchCaseFinder(h));}
      else if(n===2) for(const i of [0,-1,3,1.2,NaN,Infinity,'1'])assert.throws(()=>choose(h,i));
      else if(n===3||n===7) {const valid=find(h);for(const [key,value] of [['matchCount',99],['totalRows',0],['offset',20],['pageSize',1],['excludedDates',1],['version','wrong'],['filters',{query:'Beta'}],['rows',[...valid.rows].reverse()]])assert.throws(()=>assertCaseFinder({...valid,[key]:value},h));for(const key of Object.keys(valid.rows[0])) {const fake=structuredClone(valid);fake.rows[0][key]=fake.rows[0][key]===true?false:'wrong';assert.throws(()=>assertCaseFinder(fake,h));}}
      else if(n===4) {let calls=0;assert.throws(()=>find(h,{get query(){calls++;return 'Acme';}}));assert.throws(()=>assertFoundCase({get subject(){calls++;return null;}},h,1));assert.equal(calls,0);}
      else if(n===5) {const cycle={};cycle.query=cycle;for(const x of [cycle,{[Symbol('x')]:'bad'},new Date(),Object.create({query:'Acme'})])assert.throws(()=>find(h,x));assert.throws(()=>frozenData(Array(2)));}
      else if(n===6) {let getCalls=0,reads=0;const projection=find(h);const proxy=new Proxy(projection,{get(){getCalls++;throw new Error('get');},getOwnPropertyDescriptor(target,key){reads++;return Reflect.getOwnPropertyDescriptor(target,key);}});assert.deepEqual(assertCaseFinder(proxy,h),projection);assert.equal(getCalls,0);assert.equal(reads,Object.keys(projection).length);const shared={query:'Acme'};const captured=frozenData({a:shared,b:shared});shared.query='Beta';assert.equal(captured.a.query,'Acme');assert.equal(captured.b.query,'Acme');const fake=structuredClone(projection);fake.rows[0].customerName='wrong';assert.throws(()=>assertCaseFinder(fake,h));}
      else {const other=await import('./preflight.mjs?closure-other-boundary');assert.throws(()=>other.selectFoundCase(h,1));}
      break;
    }
    default: throw new Error('Unimplemented model family '+family);
  }
}
const completedAssertions=new Set();
for(const item of ledger.cases.filter(c=>c.owner==='model'&&c.lane==='local-regression')) {
  const [,family,n]=item.id.split('-');
  test(`${item.requiredAssertion}: ${item.condition}${item.contractChange?' [Current contract: '+item.contractChange+']':''}`,async()=>{await contract(Number(family),Number(n));completedAssertions.add(item.requiredAssertion);});
}
test.after(()=>console.log('P5C-MODEL-ASSERTIONS:'+JSON.stringify({source:'scope-fit/case-finder-closure.test.mjs',assertions:[...completedAssertions].sort()})));
