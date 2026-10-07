// Test instrumentation, never imported by the product. Installation precedes
// document construction; arming excludes trusted bootstrap/test assets.
export function installRecipientAudit(scope, effect, allowParentTerminal = false) {
  const installed = [];
  const api = (owner, names, prefix = '') => { for (const key of names) if (owner && typeof owner[key] === 'function') {
    const prior = owner[key], name = prefix + key;
    owner[key] = function(...args) { if (!(allowParentTerminal && owner === scope && key === 'postMessage' && ['completed','error'].includes(args[0]?.status))) effect(name); return prior.apply(this, args); };
    installed.push(name);
  } };
  api(scope,['postMessage','fetch','open','importScripts']);
  api(scope.Window?.prototype,['postMessage'],'Window.');
  api(scope.MessagePort?.prototype,['postMessage'],'MessagePort.');
  api(scope.BroadcastChannel?.prototype,['postMessage'],'BroadcastChannel.');
  for(const name of ['WebSocket','EventSource','RTCPeerConnection','BroadcastChannel','MessageChannel','SharedWorker'])if(typeof scope[name]==='function'){
    const Native=scope[name];scope[name]=new Proxy(Native,{construct(target,args,newTarget){effect(name);return Reflect.construct(target,args,newTarget);}});installed.push(name);
  }
  api(scope.navigator,['sendBeacon']);api(scope.navigator?.serviceWorker,['register'],'serviceWorker.');
  api(scope.XMLHttpRequest?.prototype,['open','send'],'XHR.');
  api(scope.indexedDB,['open','deleteDatabase'],'indexedDB.');api(scope.IDBDatabase?.prototype,['transaction','createObjectStore','deleteObjectStore'],'IDBDatabase.');api(scope.IDBObjectStore?.prototype,['add','put','delete','clear'],'IDBObjectStore.');api(scope.IDBCursor?.prototype,['update','delete'],'IDBCursor.');
  api(scope.caches,['open','delete'],'caches.');api(scope.Cache?.prototype,['put','add','addAll','delete'],'Cache.');api(scope.cookieStore,['set','delete'],'cookieStore.');
  api(scope.navigator?.clipboard,['write','writeText'],'clipboard.');api(scope.navigator?.storage,['getDirectory'],'storage.');api(scope,['showSaveFilePicker','showOpenFilePicker','showDirectoryPicker']);api(scope.FileSystemFileHandle?.prototype,['createWritable'],'FileSystemFileHandle.');api(scope.FileSystemWritableFileStream?.prototype,['write','truncate'],'FileSystemWritableFileStream.');api(scope.FileSystemSyncAccessHandle?.prototype,['write','truncate','flush'],'FileSystemSyncAccessHandle.');
  api(scope.console,['log','info','warn','error','debug','table','dir','dirxml','trace','assert','timeLog','timeEnd','count','group','groupCollapsed','clear']);
  return installed;
}
export function installDataAudit(installRecipients) {
  window.__p4AuditArmed=false;window.__p4Construction=[];window.__p4Effects=[];window.__p4RecoveryPermit=null;
  let count=0;
  const record=(kind,value)=>{if(!window.__p4AuditArmed)return;if(++count>20000)throw Error('Data audit observation bound exceeded');__p4Construction.push({kind,value:String(value).slice(0,4096)});};
  const effect=name=>{if(window.__p4AuditArmed){if(__p4Effects.length>=20000)throw Error('Data audit effect bound exceeded');__p4Effects.push(name);}};
  const active=/^(script|iframe|object|embed|base|style|form|img|svg|link|a|audio|video|source|math)$/i;
  const recoveryAnchors=new WeakSet();
  const recovery=(node,name,value)=>{
    const p=window.__p4RecoveryPermit;if(!p||!recoveryAnchors.has(node))return false;
    const mint=window.__p4Blobs?.at(-1);
    if(name==='href')return __p4Blobs.length===p.blobStart+1&&mint?.url===String(value)&&mint.type==='application/octet-stream'&&mint.size===p.bytes;
    if(name==='download')return String(value)==='original-'+(p.role==='pax-file'?'pax8':'halopsa')+'-'+p.sha256.slice(0,12)+'.bin';
    return false;
  };
  const resource=/^(on.*|href|src|srcset|srcdoc|action|formaction|xlink:href|data|poster|background|ping|data-file-canary)$/i;
  // CSS escapes/comments and image-set string resources evade a url-only regex.
  const css=value=>{
    const decoded=String(value).replace(/\\([0-9a-f]{1,6})\s?/gi,(_,hex)=>{const n=parseInt(hex,16);return !n||n>0x10ffff||n>=0xd800&&n<=0xdfff?'\uFFFD':String.fromCodePoint(n);}).replace(/\\([^\r\n])/g,'$1').replace(/\/\*[\s\S]*?\*\//g,'');
    return /(url\s*\(|expression\s*\(|@import|image-set\s*\(|-moz-binding|behavior\s*:)/i.test(decoded);
  };
  window.__p4UnsafeNode=node=>node.nodeType===1&&(active.test(node.localName)||[...node.attributes].some(a=>resource.test(a.name)||a.name==='style'&&css(a.value)));
  const styleText=(node,value)=>{if(node.nodeType===1&&node.localName==='style'||node.parentNode?.localName==='style')record('style-text-write',value);};
  for(const [owner,key]of [[Node.prototype,'textContent'],[Node.prototype,'nodeValue'],[CharacterData.prototype,'data']]){const d=Object.getOwnPropertyDescriptor(owner,key);if(d?.set)Object.defineProperty(owner,key,{...d,set(value){styleText(this,value);return d.set.call(this,value);}});}
  for(const key of ['appendData','insertData','replaceData','deleteData','splitText']){const native=(key==='splitText'?Text.prototype:CharacterData.prototype)[key];(key==='splitText'?Text.prototype:CharacterData.prototype)[key]=function(...args){styleText(this,args.at(-1));return native.apply(this,args);};}
  const hook=(owner,key,fn)=>{if(!owner||typeof owner[key]!=='function')return;const native=owner[key];owner[key]=function(...args){fn.call(this,args);return native.apply(this,args);};};
  for(const key of ['createElement','createElementNS'])hook(Document.prototype,key,args=>{
    const tag=String(args[key==='createElementNS'?1:0]).split(':').at(-1);if(active.test(tag)&&!(tag.toLowerCase()==='a'&&window.__p4RecoveryPermit?.anchors===0))record('active-construction',tag);
  });
  const create=document.createElement.bind(document);document.createElement=function(tag,...args){const node=create(tag,...args);if(String(tag).toLowerCase()==='a'&&__p4RecoveryPermit?.anchors===0){__p4RecoveryPermit.anchors++;recoveryAnchors.add(node);}return node;};
  for(const key of ['setAttribute','setAttributeNS'])hook(Element.prototype,key,function(args){const name=args[key==='setAttributeNS'?1:0],value=args[key==='setAttributeNS'?2:1];if((resource.test(name)||name==='download')&&!recovery(this,name,value)||name==='style'&&css(value))record('active-attribute',name+':'+value);});
  for(const [owner,key] of [[Element.prototype,'innerHTML'],[Element.prototype,'outerHTML'],[ShadowRoot.prototype,'innerHTML'],[HTMLIFrameElement.prototype,'srcdoc']]){
    const d=Object.getOwnPropertyDescriptor(owner,key);if(d?.set)Object.defineProperty(owner,key,{...d,set(value){record('markup-write',key);return d.set.call(this,value);}});
  }
  for(const owner of [HTMLElement.prototype,SVGElement.prototype,HTMLAnchorElement.prototype,HTMLImageElement.prototype,HTMLScriptElement.prototype,HTMLFormElement.prototype,HTMLInputElement.prototype,HTMLLinkElement.prototype])for(const key of Object.getOwnPropertyNames(owner)){
    if(!resource.test(key))continue;const d=Object.getOwnPropertyDescriptor(owner,key);
    if(d?.set)Object.defineProperty(owner,key,{...d,set(value){if(!recovery(this,key,value)&&!(key.startsWith('on')&&typeof value==='function'))record('active-property',key);return d.set.call(this,value);}});
  }
  for(const [owner,key]of [[Element.prototype,'insertAdjacentHTML'],[Document.prototype,'write'],[Document.prototype,'writeln'],[DOMParser.prototype,'parseFromString'],[Range.prototype,'createContextualFragment']])hook(owner,key,()=>record('markup-write',key));
  for(const key of ['setProperty'])hook(CSSStyleDeclaration.prototype,key,args=>{if(css(args.join(':')))record('resource-style',args.join(':'));});
  for(const key of ['cssText','background','backgroundImage','listStyle','listStyleImage','cursor','content']){
    const d=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,key);if(d?.set)Object.defineProperty(CSSStyleDeclaration.prototype,key,{...d,set(value){if(css(value))record('resource-style',value);return d.set.call(this,value);}});
  }
  for(const key of ['insertRule','replace','replaceSync'])hook(CSSStyleSheet.prototype,key,args=>{if(css(args[0]))record('resource-style',args[0]);});
  const inspect=node=>{
    let visited=0;const stack=[node];while(stack.length){const n=stack.pop();if(++visited>20000){record('observation-bound','nodes');break;}
      if(n.nodeType===1){if(active.test(n.localName)&&!(n.tagName==='A'&&recovery(n,'href',n.getAttribute('href'))&&recovery(n,'download',n.getAttribute('download'))))record('active-insertion',n.localName);for(const a of n.attributes)if(resource.test(a.name)&&!recovery(n,a.name,a.value)||a.name==='style'&&css(a.value))record('active-insertion-attribute',a.name);if(n.content)stack.push(n.content);if(n.shadowRoot)stack.push(n.shadowRoot);}
      if(n.childNodes)stack.push(...n.childNodes);
    }
  };
  for(const key of ['appendChild','insertBefore','replaceChild'])hook(Node.prototype,key,function(args){if(window.__p4AuditArmed){styleText(this,args[0]?.textContent);inspect(args[0]);}});
  for(const owner of [Element.prototype,DocumentFragment.prototype,Document.prototype])for(const key of ['append','prepend','replaceChildren'])hook(owner,key,function(args){if(window.__p4AuditArmed)for(const n of args){styleText(this,n instanceof Node?n.textContent:n);if(n instanceof Node)inspect(n);}});
  for(const owner of [Element.prototype,CharacterData.prototype,DocumentType.prototype])for(const key of ['before','after','replaceWith'])hook(owner,key,function(args){if(window.__p4AuditArmed)for(const n of args){styleText(this,n instanceof Node?n.textContent:n);if(n instanceof Node)inspect(n);}});
  for(const owner of [Element.prototype,CharacterData.prototype,DocumentType.prototype])hook(owner,'remove',function(){styleText(this,this.textContent);});
  hook(Node.prototype,'removeChild',function(args){styleText(this,args[0]?.textContent);});
  hook(Element.prototype,'insertAdjacentElement',args=>{if(window.__p4AuditArmed)inspect(args[1]);});
  for(const [owner,key]of [[Node.prototype,'cloneNode'],[Document.prototype,'importNode']]){const native=owner[key];owner[key]=function(...args){const n=native.apply(this,args);if(window.__p4AuditArmed)inspect(n);return n;};}
  // Recorded ancestry is captured at operation time; later removal cannot erase it.
  const observer=new MutationObserver(records=>{if(!window.__p4AuditArmed)return;for(const r of records){if(r.type==='childList'&&r.target.localName==='style')record('observed-style-children','style');if(r.type==='characterData'){styleText(r.target,r.oldValue||'');styleText(r.target,r.target.data);}if(r.type==='attributes'&&!recovery(r.target,r.attributeName,r.target.getAttribute(r.attributeName))&&(resource.test(r.attributeName)||r.attributeName==='style'&&css(r.oldValue||'')))record('observed-attribute',r.attributeName);}});
  observer.observe(document,{subtree:true,attributes:true,attributeOldValue:true,characterData:true,characterDataOldValue:true,childList:true});
  let armed=false;
  Object.defineProperty(window,'__p4AuditArmed',{configurable:true,get:()=>armed,set:value=>{if(value&&!armed)observer.takeRecords();armed=Boolean(value);}});
  document.addEventListener('click',event=>{const p=window.__p4RecoveryPermit;if(p&&event.isTrusted&&event.target.closest('#original-'+p.role+' .save-original'))p.nativeClicks++;},true);
  hook(HTMLAnchorElement.prototype,'click',function(){const p=window.__p4RecoveryPermit;if(p){if(p.nativeClicks!==1||!recovery(this,'href',this.href)||!recovery(this,'download',this.download))record('invalid-recovery-click',this.href);else p.anchorClicks++;}});
  const api=(owner,names)=>{for(const key of names)hook(owner,key,()=>effect(key));};
  window.__p5RecipientInventory=installRecipients(window,effect);
  api(Storage.prototype,['setItem','removeItem','clear']);
  for(const key of ['localStorage','sessionStorage']){const d=Object.getOwnPropertyDescriptor(window,key);if(d?.get){const storage=d.get.call(window),proxy=new Proxy(storage,{get(t,k){const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;},set(t,k,v){effect(key+'.property');return Reflect.set(t,k,v,t);},deleteProperty(t,k){effect(key+'.delete');return Reflect.deleteProperty(t,k);},defineProperty(t,k,v){effect(key+'.defineProperty');return Reflect.defineProperty(t,k,v);}});Object.defineProperty(window,key,{...d,get:()=>proxy});}}
  const cookie=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');if(cookie?.set)Object.defineProperty(Document.prototype,'cookie',{...cookie,set(v){effect('cookie');return cookie.set.call(this,v);}});
}
