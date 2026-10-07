import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaseFinder, searchCaseFinder, assertCaseFinder, selectFoundCase, assertFoundCase, selectCaseSubject, confirmCaseSelection, reviewCaseSelection, PAX8_COLUMNS } from './preflight.mjs';
const cols=['source_account_id',...PAX8_COLUMNS,'customer_name','product_name','product_sku','seat_count'];
const row=(id='s',overrides={})=>({source_account_id:'account-A',subscription_id:id,customer_ref:'c',distributor:'pax8',product_family:'Microsoft 365',commerce_model:'NCE',seat_based:'yes',commitment_term:'annual',renewal_date:'2027-01-15',end_of_term_state:'renew',customer_name:'Acme Customer',product_name:'Business Premium',product_sku:'sku-123',seat_count:'25',...overrides});
const quote=x=>'"'+x.replaceAll('"','""')+'"';
const csv=rows=>cols.map(quote).join(',')+'\n'+rows.map(r=>cols.map(k=>quote(r[k]??'')).join(',')).join('\n');
const make=rows=>createCaseFinder(csv(rows));

test('P5-01 recognizable attributes find exact source without memorized ID',()=>{
 const handle=make([row('one'),row('two',{customer_name:'Beta',product_name:'Exchange'})]);
 for(const query of ['ACME','premium','sku-123','25','2027-01-15','account-A','c','one'])assert.ok(searchCaseFinder(handle,{query}).rows.some(r=>r.subscriptionId==='one'));
 assert.equal(searchCaseFinder(handle,{query:' acme  PREMIUM sku-123 '}).matchCount,1);assert.equal(searchCaseFinder(handle,{query:'acme Exchange'}).matchCount,0);
});
test('P5-02 combined filters are intersections and date bounds inclusive',()=>{
 const h=make([row('a'),row('b',{source_account_id:'account-B',renewal_date:'2027-02-15'}),row('c',{customer_name:'Other',renewal_date:'2027-01-16'})]);
 assert.equal(searchCaseFinder(h,{account:'account-A',customer:'acme',product:'SKU-123',from:'2027-01-15',to:'2027-01-15'}).matchCount,1);
 assert.equal(searchCaseFinder(h,{account:'account-a'}).matchCount,0);assert.equal(searchCaseFinder(h,{account:' account-A '}).matchCount,2);
 assert.equal(searchCaseFinder(h,{from:'2027-01-16'}).matchCount,2);
});
test('P5-03 missing and invalid renewal dates stay visible and explicit exclusion is counted',()=>{
 const h=make([row('a',{renewal_date:''}),row('b',{renewal_date:'2027-02-29'}),row('c')]);
 assert.equal(searchCaseFinder(h).matchCount,3);const r=searchCaseFinder(h,{from:'2027-01-15'});assert.equal(r.matchCount,1);assert.equal(r.excludedDates,2);
 assert.equal(searchCaseFinder(h,{query:'no-match',from:'2027-01-15'}).excludedDates,0);
});
test('P5-04 every globally duplicate ID stays blocked after filtering to one row',()=>{
 const h=make([row(' same ',{customer_name:'Acme'}),row('same',{source_account_id:'account-B',customer_name:'Beta',renewal_date:'2028-01-15'})]);
 const r=searchCaseFinder(h,{account:'account-A',customer:'Acme',to:'2027-12-31'});assert.equal(r.matchCount,1);assert.equal(r.rows[0].duplicateCount,2);assert.equal(r.rows[0].selectable,false);assert.throws(()=>selectFoundCase(h,1));assert.throws(()=>selectFoundCase(h,2));
});
test('P5-05 case-sensitive opaque IDs remain distinct despite insensitive discovery',()=>{
 const text=csv([row('S-id-xyz'),row('s-id-xyz'),row('Ｓ-id-xyz')]);const h=createCaseFinder(text);assert.equal(searchCaseFinder(h,{query:'s-id-xyz'}).matchCount,2);
 for(const index of [1,2,3]){const chosen=selectFoundCase(h,index);assert.equal(chosen.status,'candidate');assert.deepEqual(chosen,selectCaseSubject(text,['S-id-xyz','s-id-xyz','Ｓ-id-xyz'][index-1]));}
});
test('P5-06 exact identity and original full evidence survives explicit handoff without confirmation',()=>{
 const text='\uFEFF'+csv([row(' exact-ID ',{customer_name:'A,"B"\nC'})]);const h=createCaseFinder(text);const chosen=selectFoundCase(h,1);
 assert.equal(chosen.subject.subscriptionId,'exact-ID');assert.equal(chosen.status,'candidate');assert.equal(chosen.authenticated,undefined);assert.equal(reviewCaseSelection(text,'exact-ID').status,'candidate');
 assert.equal(chosen.subject.evidence.fields.find(f=>f.column==='customer_name').rawValue,'A,"B"\nC');assert.equal(chosen.subject.evidence.originalRecord,text.slice(chosen.subject.evidence.startOffset,chosen.subject.evidence.endOffset));
});
test('P5-07 incomplete identity may be inspected but never confirmed or completed by search',()=>{
 const text=csv([row('s',{source_account_id:'',customer_ref:'',renewal_date:'unknown'})]);const h=createCaseFinder(text);assert.equal(searchCaseFinder(h).rows[0].selectable,true);assert.equal(selectFoundCase(h,1).status,'unresolved');assert.throws(()=>confirmCaseSelection(text,'s'));
});
test('P5-08 unusable IDs cannot be chosen even if recognized descriptive matches exist',()=>{
 for(const id of ['', 'x\u034f', 'x'.repeat(129)]){const h=make([row(id)]);assert.equal(searchCaseFinder(h,{query:'acme'}).rows[0].selectable,false);assert.throws(()=>selectFoundCase(h,1));}
});
test('P5-09 source order, pagination boundaries and exact totals are deterministic',()=>{
 for(const count of [1,20,21,40,41]){const h=make(Array.from({length:count},(_,i)=>row('s'+i)));const all=[];for(let offset=0;offset<count;offset+=20){const p=searchCaseFinder(h,{},offset);assert.equal(p.matchCount,count);assert.ok(p.rows.length<=20);all.push(...p.rows.map(r=>r.recordNumber));}assert.deepEqual(all,Array.from({length:count},(_,i)=>i+1));}
});
test('P5-10 literal metacharacters, Unicode and quoted descriptions are never regex or markup',()=>{
 const h=make([row('s',{customer_name:'<img src=x> A[.*] ישראל Café',product_name:'A,"B"\nC'})]);for(const query of ['<img','[.*]','ישראל','Café','A,"B"'])assert.equal(searchCaseFinder(h,{query}).matchCount,1);assert.equal(searchCaseFinder(h,{query:'cafe'}).matchCount,0);
 assert.equal(searchCaseFinder(h).rows[0].productName,'A,"B"\nC');
});
test('P5-11 search limits, invalid/reversed dates, unknown keys and hidden text are rejected',()=>{
 const h=make([row()]);for(const filters of [{query:'x'.repeat(161)},{account:'x'.repeat(129)},{query:'a\n'},{query:'a\u200b'},{account:'\uFFFD'},{from:'2027-02-29'},{from:'2027-03-01',to:'2027-01-01'},{unknown:'x'},{query:42},[]])assert.throws(()=>searchCaseFinder(h,filters));
 assert.equal(searchCaseFinder(h,{query:'x'.repeat(160)}).matchCount,0);assert.doesNotThrow(()=>searchCaseFinder(h,{from:'2028-02-29'}));
});
test('P5-12 page/record bounds and forged, cloned, serialized or foreign handles reject',async()=>{
 const h=make([row()]);for(const bad of [{},structuredClone(h),JSON.parse(JSON.stringify(h)),null]){assert.throws(()=>searchCaseFinder(bad));assert.throws(()=>selectFoundCase(bad,1));}
 const other=await import('./preflight.mjs?finder-other-owner');assert.throws(()=>other.searchCaseFinder(h));
 for(const n of [-1,1,20,0.1,Infinity,NaN])assert.throws(()=>searchCaseFinder(h,{},n));for(const n of [0,-1,2,'1',0.1,NaN])assert.throws(()=>selectFoundCase(h,n));
});
test('P5-13 getters never execute and forged result data fails canonical validation',()=>{
 let calls=0;const h=make([row()]);assert.throws(()=>searchCaseFinder(h,{get query(){calls++;return '';}}));assert.equal(calls,0);
 const r=searchCaseFinder(h);assert.throws(()=>assertCaseFinder({...r,matchCount:99},h));const fake=structuredClone(r);fake.rows[0].subscriptionId='other';assert.throws(()=>assertCaseFinder(fake,h));assert.equal(Object.isFrozen(r.rows[0]),true);
});
test('P5-14 source parse failure is different from an empty valid filtered match',()=>{
 for(const source of ['', 'bad',csv([row()])+'\nwrong',csv([row()]).replace('subscription_id','missing_id')])assert.throws(()=>createCaseFinder(source));assert.equal(searchCaseFinder(make([row()]),{query:'absent'}).matchCount,0);
});
test('P5-15 selection cannot reuse a receipt from different source bytes',()=>{
 const text=csv([row()]);const receipt=confirmCaseSelection(text,'s');const replaced=text+'\n';const selected=selectFoundCase(createCaseFinder(replaced),1);assert.equal(selected.status,'candidate');assert.equal(reviewCaseSelection(replaced,'s',receipt).status,'candidate');
});
test('P5-16 maximum source and repeated discovery stay bounded without truncating totals',()=>{
 const start=performance.now();const h=make(Array.from({length:4680},(_,i)=>row('s'+i,{customer_name:'Customer '+i})));let last;
 for(let i=0;i<20;i++)last=searchCaseFinder(h,{product:'premium'},4660);
 assert.equal(last.matchCount,4680);assert.equal(last.rows.length,20);assert.equal(last.rows.at(-1).subscriptionId,'s4679');assert.equal(searchCaseFinder(h,{query:'Customer 4679'}).matchCount,1);
 const elapsedMs=performance.now()-start;assert.ok(elapsedMs<10000);console.log('P5-RESOURCE:'+JSON.stringify({rows:4680,repeatedQueries:20,pageSize:20,elapsedMs}));
});

test('P5-25 a different valid record projection cannot replace the requested chosen record',()=>{
 const h=make([row('one'),row('two')]);assert.throws(()=>assertFoundCase(selectFoundCase(h,2),h,1));assert.deepEqual(assertFoundCase(selectFoundCase(h,1),h,1),selectFoundCase(h,1));let calls=0;assert.throws(()=>assertFoundCase({get subject(){calls++;return null;}},h,1));assert.equal(calls,0);
});
