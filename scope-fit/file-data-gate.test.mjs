import test from 'node:test';
import assert from 'node:assert/strict';
import {dataGate} from './qc-file-data-gate.mjs';
const origin='http://localhost:8782';
const base={requests:0,errors:0,dialogs:0,popups:0,navigations:0,downloads:0,proofs:0,blobs:0,revoked:0};
const state=()=>({hits:0,active:0,calls:[],proofs:[],workers:[],blobs:[],revoked:[],mutations:[],traffic:[],effects:[],errors:0,dialogs:0,popups:0,navigations:0,downloads:0,healthy:true,authority:null});
test('F13P4-G01 clean complete snapshot accepted and missing facts fail closed',()=>{
  const s=state();assert.equal(dataGate(s,base,{origin}),null);
  for(const key of Object.keys(s)){const bad=structuredClone(s);delete bad[key];assert.equal(dataGate(bad,base,{origin}),'observation-schema');}
});
test('F13P4-G09 malformed authority cannot stand in for captured null',()=>{for(const authority of [false,0,'',[],{}]){const s=state();s.authority=authority;assert.ok(dataGate(s,base,{origin}));}});
test('F13P4-G10 source-bearing allowed header names still reject values',()=>{for(const [key,value]of [['accept','PRIVATE-SOURCE'],['referer',origin+'/?source=secret'],['referer',origin+'/private.csv'],['referer','http://secret@localhost:8782/'],['referer','http://user:secret@localhost:8782/'],['origin','https://invalid.example'],['user-agent','PRIVATE-SOURCE'],['sec-ch-ua','PRIVATE-SOURCE']]){const s=state();s.traffic=[{url:origin+'/fit.mjs',method:'GET',type:'script',body:null,headersComplete:true,headers:{[key]:value}}];assert.equal(dataGate(s,base,{origin}),'source-request');}});
for(const [field,value,cause]of [['hits',1,'source-execution'],['mutations',[{kind:'active-construction'}],'introduced-active-dom'],['calls',['cookie'],'source-request-attempt'],['downloads',1,'premature-download'],['navigations',1,'source-navigation'],['popups',1,'source-dialog-or-popup'],['effects',[{name:'fetch'}],'worker-source-execution'],['errors',1,'unexpected-page-error'],['authority',{actionAuthorized:true,financialVerdict:'approved'},'source-financial-authority'],['healthy',false,'runtime-health']])test('F13P4-G02 replay decisive '+cause,()=>{
  const s=state();s[field]=value;assert.equal(dataGate(s,base,{origin}),cause);assert.equal(dataGate(state(),base,{origin}),null);
});
for(const id of [-1,0,1.5,'1',true,Number.MAX_SAFE_INTEGER+1])test('F13P4-G03 native ownership rejects '+JSON.stringify(id),()=>{const s=state();s.proofs=[{native:true,hits:0,calls:[],id,role:'pax-file',operation:'find-case'}];assert.equal(dataGate(s,base,{origin}),'native-proof-schema');});
for(const mode of ['header','type','query','post','same-origin-other','cross-origin'])test('F13P4-G04 precise traffic rejects '+mode,()=>{
  const s=state(),r={url:origin+'/fit.mjs',method:'GET',type:'script',body:null,headersComplete:true,headers:{'sec-fetch-dest':'script'}};
  if(mode==='header')r.headers['x-source-value']='secret';if(mode==='type')r.type='fetch';if(mode==='query')r.url+='?secret=x';if(mode==='post')r.method='POST';if(mode==='same-origin-other')r.url=origin+'/rogue.mjs';if(mode==='cross-origin')r.url='https://invalid.example/fit.mjs';s.traffic=[r];assert.equal(dataGate(s,base,{origin}),'source-request');
});
test('F13P4-G05 fixed native Worker resource branch accepted only with worker destination',()=>{
  const s=state();s.traffic=[{url:origin+'/file-processing-worker.mjs',method:'GET',type:'other',body:null,headersComplete:true,headers:{'sec-fetch-dest':'worker'}}];assert.equal(dataGate(s,base,{origin}),null);s.traffic[0].headers['sec-fetch-dest']='empty';assert.equal(dataGate(s,base,{origin}),'source-request');
});
for(const key of ['requests','proofs'])test('F13P4-G06 out-of-range baseline cannot hide '+key,()=>{const b={...base,[key]:1};assert.equal(dataGate(state(),b,{origin}),'observation-schema');});
test('F13P4-G07 null nested facts fail with owned schema cause',()=>{const s=state();s.traffic=[null];assert.equal(dataGate(s,base,{origin}),'observation-schema');});
test('F13P4-G08 typed interpretation oracle rejects an evaluated replacement',()=>{const s=state(),typed={field:'commitment_term',raw:'=IF(TRUE,"annual","monthly")',claim:'commitment',canonical:'unknown',diagnostic:null};s.typed={raw:{commitment_term:typed.raw},claims:{commitment:'unknown'},economicIssues:[]};assert.equal(dataGate(s,base,{origin,typed}),null);s.typed.claims.commitment='annual-m365-nce';assert.equal(dataGate(s,base,{origin,typed}),'source-typed-interpretation');});
const recovered=()=>{const s=state(),url='blob:'+origin+'/native-id';s.downloads=1;s.blobs=[{url,type:'application/octet-stream',size:19}];s.revoked=[url];return {s,o:{origin,allowDownload:1,allowBlob:true,recovery:{anchors:1,nativeClicks:1,anchorClicks:1,blobStart:0,bytes:19}}};};
test('F13P5-G11 Blob mint and allowBlob cannot grant recovery',()=>{
  const s=state();s.blobs=[{url:'blob:'+origin+'/native-id',type:'application/octet-stream',size:19}];assert.equal(dataGate(s,base,{origin}),'original-recovery-permit');
  assert.equal(dataGate(state(),base,{origin,allowBlob:true}),'original-recovery-permit');
  const good=recovered();assert.equal(dataGate(good.s,base,good.o),null);
});
for(const kind of ['post','body','cookie','authorization','private-header','query','old-url','unrevoked','extra-mint','extra-revoke','user-info','hash'])test('F13P5-G12 exact recovery traffic rejects '+kind,()=>{
  const {s,o}=recovered();const r={url:s.blobs[0].url,method:'GET',body:null,type:'document',headersComplete:true,headers:{}};s.traffic=[r];assert.equal(dataGate(s,base,o),null);
  if(kind==='post')r.method='POST';if(kind==='body')r.body='private';if(kind==='cookie')r.headers.cookie='secret=1';if(kind==='authorization')r.headers.authorization='Bearer private';if(kind==='private-header')r.headers['x-value']='not-a-marker';if(kind==='query')r.url+='?private';if(kind==='old-url')r.url='blob:'+origin+'/older';if(kind==='unrevoked')s.revoked=[];if(kind==='extra-mint')s.blobs.push({...s.blobs[0],url:'blob:'+origin+'/extra'});if(kind==='extra-revoke')s.revoked.push('blob:'+origin+'/extra');if(kind==='user-info')r.url=origin.replace('http://','http://private@')+'/fit.mjs';if(kind==='hash')r.url=origin+'/fit.mjs#private';assert.ok(dataGate(s,base,o));
});
test('F13P5-G13 incomplete header capture is not qualified',()=>{const s=state();s.traffic=[{url:origin+'/fit.mjs',method:'GET',body:null,type:'script',headers:{}}];assert.equal(dataGate(s,base,{origin}),'observation-schema');s.traffic[0].headersComplete=true;assert.equal(dataGate(s,base,{origin}),null);});
test('F13P5-G14 captured cold-browser headers accepted without a private wildcard',()=>{const s=state();s.traffic=[{url:origin+'/termline.css',method:'GET',body:null,type:'stylesheet',headersComplete:true,headers:{accept:'text/css,*/*;q=0.1','accept-encoding':'gzip, deflate, br, zstd',referer:origin+'/'}}];assert.equal(dataGate(s,base,{origin}),null);s.traffic[0].headers.accept='text/css,private-value';assert.equal(dataGate(s,base,{origin}),'source-request');});
