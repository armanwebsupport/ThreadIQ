/* ThreadIQ database layer (IndexedDB). Stores are fixed for all phases. */
const DB=(()=>{
  const bell=()=>{if(typeof refreshBell==='function')refreshBell()};
  let db;const STORES=['vehicles','tyres','inspections','replacements','rotations','fitments','maintenance','meta'];
  const open=()=>new Promise((ok,no)=>{const r=indexedDB.open('threadiq',2);
    r.onupgradeneeded=e=>{const d=e.target.result;STORES.forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:s==='meta'?'key':'id'})})};
    r.onsuccess=e=>{db=e.target.result;ok()};r.onerror=()=>no(r.error)});
  const run=(s,m,f)=>new Promise((ok,no)=>{const t=db.transaction(s,m);const q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)});
  const nextId=(prefix,pad)=>new Promise((ok,no)=>{const t=db.transaction('meta','readwrite'),o=t.objectStore('meta');let n;
    o.get('ctr_'+prefix).onsuccess=e=>{n=((e.target.result||{}).value||0)+1;o.put({key:'ctr_'+prefix,value:n})};
    t.oncomplete=()=>ok(prefix+'-'+String(n).padStart(pad,'0'));t.onerror=()=>no(t.error)});
  const exportAll=async()=>{const o={app:'ThreadIQ',version:1,exported:new Date().toISOString()};for(const s of STORES)o[s]=await run(s,'readonly',x=>x.getAll());return o};
  const check=d=>{if(!d||d.app!=='ThreadIQ')throw new Error('This is not a ThreadIQ backup file');if(!Array.isArray(d.maintenance))d.maintenance=[];for(const s of STORES)if(!Array.isArray(d[s]))throw new Error('Backup file is incomplete ('+s+' missing)');return d};
  const write=async d=>{for(const s of STORES){await run(s,'readwrite',x=>x.clear());for(const r of d[s])await run(s,'readwrite',x=>x.put(r))}};
  const importAll=async d=>{check(d);const snap=await exportAll();try{await write(d)}catch(e){await write(snap);throw new Error('Restore failed. Your previous data was kept')}};
  return{open,nextId,exportAll,importAll,check,
    put:(s,v)=>run(s,'readwrite',o=>o.put(v)).then(r=>{bell();return r}),get:(s,k)=>run(s,'readonly',o=>o.get(k)),all:s=>run(s,'readonly',o=>o.getAll()),del:(s,k)=>run(s,'readwrite',o=>o.delete(k)).then(r=>{bell();return r})};
})();
