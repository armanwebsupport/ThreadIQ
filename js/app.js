/* ThreadIQ app shell: boot, router, registration, dashboard, vehicles UI, settings. */
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)};
const prof=()=>JSON.parse(localStorage.getItem('tiq_profile')||'null');
const go=r=>{location.hash=r};
let draft={axles:[...PRESETS[6]],cat:'t6',photo:''};
const HEALTHY=['Good','Satisfactory'],CRIT=['Critical','Unserviceable'];

async function boot(){
  await DB.open();if('serviceWorker'in navigator){const native=window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform();
    if(native){navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister()));if(window.caches)caches.keys().then(k=>k.forEach(x=>caches.delete(x)))}else navigator.serviceWorker.register('sw.js').catch(()=>{})}
  setTimeout(()=>{$('#preloader').style.opacity=0;setTimeout(()=>$('#preloader').remove(),500);prof()?start():register()},1900)}
function register(){const r=$('#register');r.classList.remove('hidden');r.style.cssText='padding:30px 18px;max-width:480px;margin:auto';
  r.innerHTML=`<h1 class="brand" style="font-size:1.8rem">Thread<span>IQ</span></h1><p class="mut">Technician Registration</p><form id="rf" class="card" style="margin-top:16px">
  <label>Inspector / Technician Name *</label><input id="rn" required><label>Employee ID (optional)</label><input id="re"><label>Department (optional)</label><input id="rd"><label>Company Name (optional)</label><input id="rc"><br><button class="btn">Submit &amp; Continue</button></form>`;
  $('#rf').onsubmit=e=>{e.preventDefault();localStorage.setItem('tiq_profile',JSON.stringify({name:$('#rn').value.trim(),emp:$('#re').value.trim(),dept:$('#rd').value.trim(),company:$('#rc').value.trim()}));r.classList.add('hidden');start()}}
function start(){['#top','#nav'].forEach(s=>$(s).classList.remove('hidden'));window.onhashchange=route;route()}
const soon=(t,ph)=>{$('#view').innerHTML=`<h2>${t}</h2><div class="card mut">This module is coming in ${ph}.</div>`};
async function route(){const h=(location.hash||'#home').slice(1),[p,arg]=h.split('/');
  const tab=['vehicle-add','vehicle'].includes(p)?'vehicles':['home','vehicles','inspection','analytics'].includes(p)?p:'more';
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===tab));
  $('#view').innerHTML='';scrollTo(0,0);
  const R={home,vehicles,'vehicle-add':vAdd,vehicle:vDetail,inspection,history:inspHistory,replacement,rotation,maintenance,'maintenance-add':maintenanceForm,jobcard:jobCard,'inspection-view':inspView,more,settings,inventory,tyre:tyreView,'tyre-add':tyreForm,alerts:()=>soon('Alerts','Phase 5')};
  const L={inspection:'Inspection|Phase 3',analytics:'Analytics|Phase 5',inventory:'Tyre Inventory|Phase 2',replacement:'Replacement|Phase 4',rotation:'Rotation|Phase 4',reports:'Reports|Phase 5',history:'Inspection History|Phase 3',maintenance:'Maintenance|Phase 4',pressure:'Pressure Monitoring|Phase 3'};
  if(R[p])await R[p](arg);else if(L[p])soon(...L[p].split('|'));else go('home')}

async function home(){const p=prof(),vs=await DB.all('vehicles'),ty=await DB.all('tyres'),act=vs.filter(v=>v.active!==false);
  const h=ty.filter(t=>HEALTHY.includes(t.condition)).length,a=ty.filter(t=>t.condition==='Needs Attention').length,c=ty.filter(t=>CRIT.includes(t.condition)).length,ins=h+a+c,pct=ins?Math.round(h/ins*100):0,C=2*Math.PI*44;
  const Q=[['🚛','Vehicles','vehicles'],['🛞','Tyre Inventory','inventory'],['📝','New Inspection','inspection'],['🔧','Maintenance','maintenance'],['🔄','Tyre Rotation','rotation'],['♻️','Tyre Replacement','replacement'],['🎚️','Pressure','pressure'],['📄','Reports','reports'],['🕘','History','history'],['⚙️','Settings','settings']];
  $('#view').innerHTML=`<div class="hero"><p>Welcome Back</p><h2>${esc(p.name)}</h2><p>${esc(p.company)}</p></div>
  <div class="stats"><div class="stat"><b>${act.length}</b><span>Total Vehicles</span></div><div class="stat"><b>${ty.length}</b><span>Total Tyres</span></div><div class="stat"><b>${c}</b><span>Active Alerts</span></div><div class="stat"><b>${ins?pct+'%':'--'}</b><span>Fleet Health</span></div></div>
  <div class="card"><h3 style="margin-top:0">Tyre Health Overview</h3><div class="health"><div class="ring"><svg width="110" height="110" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#0A2142" stroke-width="10"/><circle cx="50" cy="50" r="44" fill="none" stroke="#20D997" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C*pct/100} ${C}"/></svg><div>${ins?pct+'%':'--'}</div></div>
  <div class="legend"><div><i class="dot" style="background:var(--ok)"></i>Healthy: ${h}</div><div><i class="dot" style="background:var(--warn)"></i>Attention: ${a}</div><div><i class="dot" style="background:var(--bad)"></i>Critical: ${c}</div></div></div></div>
  <h3>Quick Access</h3><div class="quick">${Q.map(q=>`<div class="q" onclick="go('${q[2]}')"><i>${q[0]}</i>${q[1]}</div>`).join('')}</div>
  <h3>Active Fleet</h3>${act.length?act.map(vehCard(ty)).join(''):'<div class="card mut">No vehicles yet. Add one from Vehicles.</div>'}`}
const vehCard=ty=>v=>{const t=ty.filter(x=>x.vehicleId===v.id);return`<div class="card veh" onclick="go('vehicle/${v.id}')"><div><b>${esc(v.reg)}</b><div class="mut">${esc(v.make)} ${esc(v.model)}</div><div class="mut">${v.wheels} tyres · ${t.filter(x=>HEALTHY.includes(x.condition)).length} healthy</div></div><span class="pill n">Not inspected</span></div>`};
async function vehicles(){const vs=(await DB.all('vehicles')).filter(v=>v.active!==false),ty=await DB.all('tyres');
  $('#view').innerHTML=`<h2>Vehicles</h2><button class="btn" onclick="go('vehicle-add')">+ Add New Vehicle</button><br>${vs.length?vs.map(vehCard(ty)).join(''):'<div class="card mut">No vehicles yet.</div>'}`}

function vAdd(){const d=draft,opt=a=>a.map(x=>`<option>${x}</option>`).join('');
  $('#view').innerHTML=`<h2>Add New Vehicle</h2><form id="vf" class="card">
  <label>Vehicle Category</label><select id="cat">${Object.entries(CATS).map(([k,c])=>`<option value="${k}" ${k==d.cat?'selected':''}>${c.label}</option>`).join('')}</select>
  <label>Number of Wheels (loads default axle layout)</label><select id="wh"></select>
  <label>Axle Layout (tap to toggle Single / Dual)</label><div class="chips" id="axl"></div><div class="mut" id="wsum"></div><div class="diagram" id="dg"></div>
  <label>Vehicle Registration Number *</label><input id="reg" required placeholder="JH09AB1234" style="text-transform:uppercase">
  <div class="row"><div><label>Manufacturer *</label><select id="make">${opt(MAKES)}</select></div><div><label>Model *</label><input id="model" required></div></div>
  <label>Vehicle Type</label><input id="vtype" placeholder="Dump Truck / Tipper / Bus...">
  <label>Chassis Number (optional)</label><input id="chas"><label>Deployment Location</label><input id="loc"><label>Company / Contractor</label><input id="comp" value="${esc(prof().company)}">
  <div class="row"><div><label>Initial Odometer (KM)</label><input id="km" type="number" min="0" inputmode="numeric"></div><div><label>Initial Engine Hours</label><input id="eh" type="number" min="0" step="0.1"></div></div>
  <label>Date of Registration</label><input id="dor" type="date"><label>Vehicle Photo (optional)</label><input id="ph" type="file" accept="image/*"><img id="pv" class="photo hidden"><br>
  <button class="btn">Save Vehicle</button></form>`;
  const drawAx=()=>{$('#axl').innerHTML=d.axles.map((a,i)=>`<span class="chip ${a=='D'?'d':''}" onclick="tgl(${i})">Axle ${i+1}: ${a=='D'?'Dual':'Single'}</span>`).join('')+`<span class="chip add" onclick="addAx()">+ Axle</span>${d.axles.length>1?'<span class="chip add" onclick="rmAx()">− Axle</span>':''}`;
    $('#wsum').textContent='Total wheels: '+wheelsOf(d.axles);$('#dg').innerHTML=diagram({axles:d.axles});const w=String(wheelsOf(d.axles));if([...$('#wh').options].some(o=>o.value==w))$('#wh').value=w};
  window.tgl=i=>{d.axles[i]=d.axles[i]=='D'?'S':'D';drawAx()};window.addAx=()=>{if(d.axles.length<8){d.axles.push('D');drawAx()}};window.rmAx=()=>{d.axles.pop();drawAx()};
  const fillW=()=>{const w=CATS[$('#cat').value].wheels;$('#wh').innerHTML=opt(w);drawAx()};
  $('#cat').onchange=()=>{d.cat=$('#cat').value;d.axles=[...PRESETS[CATS[d.cat].wheels[0]]];fillW()};
  $('#wh').onchange=()=>{d.axles=[...PRESETS[$('#wh').value]];drawAx()};fillW();
  $('#ph').onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,640/im.width);c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);d.photo=c.toDataURL('image/jpeg',.7);$('#pv').src=d.photo;$('#pv').classList.remove('hidden')};im.src=URL.createObjectURL(f)};
  $('#vf').onsubmit=async e=>{e.preventDefault();const reg=$('#reg').value.trim().toUpperCase(),all=await DB.all('vehicles');
    if(all.some(v=>normReg(v.reg)===normReg(reg)))return toast('This registration number is already saved');
    const v={id:await DB.nextId('VH',4),reg,make:$('#make').value,model:$('#model').value.trim(),category:d.cat,axles:[...d.axles],wheels:wheelsOf(d.axles),vtype:$('#vtype').value,chassis:$('#chas').value,location:$('#loc').value,company:$('#comp').value,photo:d.photo,odo:+$('#km').value||0,hours:+$('#eh').value||0,regDate:$('#dor').value,active:true,created:new Date().toISOString(),createdBy:prof().name};
    await DB.put('vehicles',v);draft={axles:[...PRESETS[6]],cat:'t6',photo:''};toast('Vehicle saved');go('vehicle/'+v.id)}}
async function archiveV(id){if(!confirm('Archive this vehicle? Its history will be kept.'))return;const v=await DB.get('vehicles',id);v.active=false;await DB.put('vehicles',v);toast('Archived');go('vehicles')}
function more(){const M=[['🛞','Tyre Inventory','inventory'],['♻️','Replacement','replacement'],['🔄','Rotation','rotation'],['🔧','Maintenance','maintenance'],['📄','Reports','reports'],['🕘','History','history'],['⚙️','Settings','settings']];
  $('#view').innerHTML=`<h2>More</h2><div class="quick">${M.map(q=>`<div class="q" onclick="go('${q[2]}')"><i>${q[0]}</i>${q[1]}</div>`).join('')}</div>`}
function settings(){const p=prof();$('#view').innerHTML=`<h2>Settings</h2><form id="pf" class="card"><h3 style="margin-top:0">Technician Profile</h3>
  <label>Name</label><input id="sn" value="${esc(p.name)}" required><label>Employee ID</label><input id="se" value="${esc(p.emp)}"><label>Department</label><input id="sd" value="${esc(p.dept)}"><label>Company</label><input id="sc" value="${esc(p.company)}"><br><button class="btn">Save Profile</button></form>
  <div class="card"><h3 style="margin-top:0">Backup &amp; Restore</h3><button class="btn" onclick="backup()">Download JSON Backup</button><label>Restore from backup file</label><input type="file" id="rs" accept=".json"></div>
  <div class="card mut" id="appinfo">ThreadIQ · App code: Phase 4 · Checking app version…</div>`;
  {const A=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App,el=$('#appinfo');if(A&&A.getInfo)A.getInfo().then(i=>{el.textContent=`ThreadIQ · App code: Phase 4 · Installed APK: v${i.version} (build ${i.build})`}).catch(()=>{el.textContent='ThreadIQ · App code: Phase 4'});else el.textContent='ThreadIQ · App code: Phase 4 (web version)'}
  $('#pf').onsubmit=e=>{e.preventDefault();localStorage.setItem('tiq_profile',JSON.stringify({name:$('#sn').value.trim(),emp:$('#se').value,dept:$('#sd').value,company:$('#sc').value}));toast('Profile updated')};
  $('#rs').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=DB.check(JSON.parse(await f.text()));if(!confirm(`Backup: ${d.vehicles.length} vehicles, ${d.tyres.length} tyres, ${d.inspections.length} inspections.\nThis will replace all current data. Continue?`))return;await DB.importAll(d);if(d.profile)localStorage.setItem('tiq_profile',JSON.stringify(d.profile));toast('Restore complete');go('home')}catch(x){toast(x.message)}finally{e.target.value=''}}}
async function backup(){const d=await DB.exportAll();d.profile=prof();const txt=JSON.stringify(d,null,1),name='threadiq-backup-'+new Date().toISOString().slice(0,10)+'.json',P=(window.Capacitor&&Capacitor.Plugins)||{};
  try{if(P.Filesystem&&P.Share){const r=await P.Filesystem.writeFile({path:name,data:txt,directory:'CACHE',encoding:'utf8'});await P.Share.share({title:'ThreadIQ Backup',text:'ThreadIQ backup '+name,url:r.uri,dialogTitle:'Where do you want to save the backup?'});return}
  const el=document.createElement('a');el.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));el.download=name;el.click()}catch(x){if(!/cancel/i.test(x.message||''))toast('Backup fail: '+(x.message||x))}}
boot();

/* Android hardware back button (Capacitor App plugin). Inner pages go back to parent/home; Home needs a double press to exit. */
(()=>{const A=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App;if(!A)return;let last=0;
A.addListener('backButton',()=>{const h=(location.hash||'#home').slice(1).split('/')[0];
 if(!$('#register').classList.contains('hidden')||$('#nav').classList.contains('hidden'))return A.exitApp();
 if(h==='home'||h===''){if(Date.now()-last<2000)return A.exitApp();last=Date.now();return toast('Press back again to exit')}
 if(h==='inspection'&&window.insBack&&insBack())return;if(['tyre','tyre-add','inspection-view','jobcard'].includes(h))return history.back();go(['vehicle','vehicle-add'].includes(h)?'vehicles':'home')})})();
