/* Phase 2: unique tyre IDs (TQ-000001), tyre profiles, position mapping, fitment records, inventory. Position (A2-LO) and tyre identity (TQ-…) stay separate. */
const STATUSES=['New','In-Service','Removed','Spare','Under Repair','Scrapped'];
const BRANDS=['Apollo','MRF','CEAT','JK Tyre','Bridgestone','Michelin','Goodyear','Yokohama','Continental','BKT','Other'];
const REMOVE_REASONS=['Tread Wear','Sidewall Damage','Cut Damage','Tyre Burst','Irregular Wear','Repair Not Possible','Preventive Replacement','Other'];
const today=()=>new Date().toISOString().slice(0,10);
const condCls=c=>HEALTHY.includes(c)?'g':c==='Needs Attention'?'y':CRIT.includes(c)?'r':'n';
const statCls={'New':'g','In-Service':'g','Spare':'y','Removed':'n','Under Repair':'y','Scrapped':'r'};
const posLabel=(v,pid)=>(buildLayout(v.axles).find(x=>x.id===pid)||{label:pid}).label;
const addEvent=(t,type,text)=>{(t.history=t.history||[]).push({date:new Date().toISOString(),type,text,by:prof().name})};
const freePos=(v,all)=>v?buildLayout(v.axles).filter(p=>!all.some(t=>t.vehicleId===v.id&&t.positionId===p.id)):[];
const posOpts=(v,all,sel)=>freePos(v,all).map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${p.label}</option>`).join('');
const fmt=d=>d?new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:d.length>10?'short':undefined}):'—';

async function fitTyre(t,v,pid,date){t.vehicleId=v.id;t.positionId=pid;t.status='In-Service';t.installDate=date;
  await DB.put('fitments',{id:await DB.nextId('FT',5),tyreId:t.id,vehicleId:v.id,positionId:pid,fromDate:date,fromKm:v.odo,fromHours:v.hours,toDate:null,toKm:null,reason:''});
  addEvent(t,'Fitted',`Fitted on ${v.reg} – ${posLabel(v,pid)}`);await DB.put('tyres',t)}

/* Tap on a wheel in the vehicle diagram / position list */
async function posTap(vid,pid){if(!vid)return;const t=(await DB.all('tyres')).find(x=>x.vehicleId===vid&&x.positionId===pid);go(t?'tyre/'+t.id:'tyre-add/'+vid+':'+pid)}

async function vDetail(id){const v=await DB.get('vehicles',id);if(!v)return go('vehicles');
  const ty=(await DB.all('tyres')).filter(t=>t.vehicleId===id),L=buildLayout(v.axles),col={};
  L.forEach(p=>{const t=ty.find(x=>x.positionId===p.id);if(t)col[p.id]=condCls(t.condition)});
  $('#view').innerHTML=`<h2>${esc(v.reg)}</h2>${v.photo?`<img class="photo" src="${v.photo}">`:''}<div class="card"><b>${esc(v.make)} ${esc(v.model)}</b><div class="mut">${[esc(v.vtype),v.wheels+' wheels',v.axles.length+' axles ('+v.axles.join('-')+')'].filter(Boolean).join(' · ')}</div><div class="mut">${esc(v.location)} ${esc(v.company)}</div><div class="mut">Odometer ${v.odo} KM · ${v.hours} hrs · ID ${v.id}</div></div>
  <h3>Tyre Position Map</h3><div class="diagram">${diagram(v,col)}<div class="mut">🟢 Healthy 🟡 Attention 🔴 Critical ⚪ No inspection / empty · tap a wheel</div></div>
  <h3>Positions (${ty.length}/${v.wheels} fitted)</h3><div class="card">${L.map(p=>{const t=ty.find(x=>x.positionId===p.id);return`<div onclick="posTap('${v.id}','${p.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;cursor:pointer"><span>${p.label}</span>${t?`<span><b style="color:var(--cyan)">${t.id}</b> <span class="pill ${condCls(t.condition)}">${esc(t.condition||'Not inspected')}</span></span>`:'<span class="pill n">Empty · Fit tyre</span>'}</div>`}).join('')}</div>
  <button class="btn red" onclick="archiveV('${v.id}')">Archive Vehicle</button>`}

async function tyreForm(arg){const [vid,pid]=(arg||'').split(':'),vs=(await DB.all('vehicles')).filter(x=>x.active!==false),all=await DB.all('tyres');
  $('#view').innerHTML=`<h2>Add New Tyre</h2><form id="tf" class="card">
  <label>Brand / Manufacturer *</label><input id="tb" list="bl" required><datalist id="bl">${BRANDS.map(b=>`<option>${b}</option>`).join('')}</datalist>
  <label>Tyre Model</label><input id="tm"><div class="row"><div><label>Tyre Size *</label><input id="tz" required placeholder="12.00R20"></div><div><label>Construction</label><select id="tc"><option>Radial</option><option>Bias</option></select></div></div>
  <div class="row"><div><label>Ply Rating</label><input id="tp" placeholder="18PR"></div><div><label>Serial Number *</label><input id="ts" required></div></div>
  <label>Tread Pattern</label><input id="tt"><div class="row"><div><label>Purchase Date</label><input id="tpd" type="date"></div><div><label>Initial Tread Depth (mm)</label><input id="ti" type="number" min="0" step="0.1" inputmode="decimal"></div></div>
  <label>Fit on Vehicle</label><select id="tv"><option value="">Not fitted (keep in store)</option>${vs.map(x=>`<option value="${x.id}" ${x.id===vid?'selected':''}>${esc(x.reg)} – ${esc(x.model)}</option>`).join('')}</select>
  <div id="fw" class="hidden"><label>Tyre Position</label><select id="tpos"></select><label>Installation Date</label><input id="tid" type="date" value="${today()}"></div>
  <div id="sw"><label>Status</label><select id="tst"><option>New</option><option>Spare</option><option>Under Repair</option></select></div><br><button class="btn">Save Tyre</button></form>`;
  const sync=()=>{const v=vs.find(x=>x.id===$('#tv').value);$('#fw').classList.toggle('hidden',!v);$('#sw').classList.toggle('hidden',!!v);$('#tpos').innerHTML=posOpts(v,all,pid)};
  $('#tv').onchange=sync;sync();
  $('#tf').onsubmit=async e=>{e.preventDefault();const fresh=await DB.all('tyres'),serial=$('#ts').value.trim(),brand=$('#tb').value.trim();
    if(fresh.some(t=>t.serial.toLowerCase()===serial.toLowerCase()&&t.brand.toLowerCase()===brand.toLowerCase()))return toast('Is brand ka yeh serial number pehle se saved hai');
    const v=vs.find(x=>x.id===$('#tv').value),p=$('#tpos').value;
    if(v&&(!p||fresh.some(t=>t.vehicleId===v.id&&t.positionId===p)))return toast('Yeh position khali nahi hai');
    const t={id:await DB.nextId('TQ',6),brand,model:$('#tm').value.trim(),size:$('#tz').value.trim(),construction:$('#tc').value,ply:$('#tp').value,serial,pattern:$('#tt').value,purchaseDate:$('#tpd').value,initialTread:$('#ti').value===''?null:+$('#ti').value,installDate:'',vehicleId:null,positionId:null,status:$('#tst').value,condition:'',created:new Date().toISOString(),createdBy:prof().name,history:[]};
    addEvent(t,'Created','Tyre registered in ThreadIQ');if(v)await fitTyre(t,v,p,$('#tid').value||today());else await DB.put('tyres',t);
    toast('Tyre saved: '+t.id);go('tyre/'+t.id)}}

async function tyreView(id){const t=await DB.get('tyres',id);if(!t)return go('inventory');
  const vs=(await DB.all('vehicles')).filter(x=>x.active!==false),all=await DB.all('tyres'),v=t.vehicleId?await DB.get('vehicles',t.vehicleId):null,
   fts=(await DB.all('fitments')).filter(f=>f.tyreId===id).sort((a,b)=>b.id.localeCompare(a.id)),vname=async i=>((await DB.get('vehicles',i))||{}).reg||i;
  const row=(k,x)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #1b3f70"><span class="mut">${k}</span><b style="text-align:right">${esc(x||'—')}</b></div>`;
  let fh='';for(const f of fts){const fv=await DB.get('vehicles',f.vehicleId)||{axles:[],reg:f.vehicleId};fh+=`<div style="padding:7px 0;border-bottom:1px solid #1b3f70"><b>${esc(fv.reg)}</b> · ${posLabel(fv,f.positionId)}<div class="mut">${fmt(f.fromDate)} @ ${f.fromKm??'—'} KM → ${f.toDate?fmt(f.toDate)+' @ '+(f.toKm??'—')+' KM · '+esc(f.reason):'<b style="color:var(--ok)">Currently fitted</b>'}</div></div>`}
  const act=t.status==='Scrapped'?'<div class="card mut">Scrapped tyre – lifecycle closed. History safe hai.</div>':v?`<div class="card"><h3 style="margin-top:0">Remove from Vehicle</h3><label>Removal Reason</label><select id="rr">${REMOVE_REASONS.map(r=>`<option>${r}</option>`).join('')}</select><br><button class="btn red" onclick="doRemove('${t.id}')">Remove Tyre</button></div>`
   :`<div class="card"><h3 style="margin-top:0">Fit on Vehicle</h3><label>Vehicle</label><select id="fv"><option value="">Select vehicle</option>${vs.map(x=>`<option value="${x.id}">${esc(x.reg)}</option>`).join('')}</select><label>Position</label><select id="fp"></select><label>Date</label><input id="fd" type="date" value="${today()}"><br><button class="btn" onclick="doFit('${t.id}')">Fit Tyre</button></div>
   <div class="card"><h3 style="margin-top:0">Change Status</h3><select id="cs">${['New','Spare','Removed','Under Repair','Scrapped'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select><br><button class="btn sec" onclick="doStatus('${t.id}')">Update Status</button></div>`;
  $('#view').innerHTML=`<h2 style="color:var(--cyan)">${t.id}</h2><div class="card"><span class="pill ${statCls[t.status]}">${t.status}</span> <span class="pill ${condCls(t.condition)}">${esc(t.condition||'Not inspected')}</span>
   ${row('Brand',t.brand)}${row('Model',t.model)}${row('Size',t.size)}${row('Construction',t.construction)}${row('Ply Rating',t.ply)}${row('Serial Number',t.serial)}${row('Tread Pattern',t.pattern)}${row('Purchase Date',t.purchaseDate)}${row('Installation Date',t.installDate)}${row('Initial Tread Depth',t.initialTread==null?'':t.initialTread+' mm')}
   ${row('Current Vehicle',v?v.reg:'Not fitted')}${row('Current Axle',v?axName(+t.positionId.slice(1,t.positionId.indexOf('-'))):'')}${row('Current Position',v?posLabel(v,t.positionId):'')}</div>${act}
   <h3>Fitment History</h3><div class="card">${fh||'<span class="mut">Abhi tak fit nahi hua.</span>'}</div>
   <h3>Lifecycle Events</h3><div class="card">${[...t.history].reverse().map(h=>`<div style="padding:7px 0;border-bottom:1px solid #1b3f70"><b>${esc(h.type)}</b> – ${esc(h.text)}<div class="mut">${fmt(h.date)} · ${esc(h.by)}</div></div>`).join('')}</div>`;
  if(!v&&t.status!=='Scrapped'){window.fillFp=()=>{$('#fp').innerHTML=posOpts(vs.find(x=>x.id===$('#fv').value),all)};$('#fv').onchange=fillFp}}
async function doFit(id){const t=await DB.get('tyres',id),v=await DB.get('vehicles',$('#fv').value),p=$('#fp').value;if(!v||!p)return toast('Vehicle aur position select karo');
  if((await DB.all('tyres')).some(x=>x.vehicleId===v.id&&x.positionId===p))return toast('Yeh position khali nahi hai');await fitTyre(t,v,p,$('#fd').value||today());toast('Tyre fit ho gaya');tyreView(id)}
async function doRemove(id){if(!confirm('Tyre vehicle se hataein? History safe rahegi.'))return;const t=await DB.get('tyres',id),v=await DB.get('vehicles',t.vehicleId),r=$('#rr').value;
  for(const f of(await DB.all('fitments')).filter(f=>f.tyreId===id&&!f.toDate)){f.toDate=today();f.toKm=v.odo;f.reason=r;await DB.put('fitments',f)}
  addEvent(t,'Removed',`Removed from ${v.reg} – ${posLabel(v,t.positionId)}. Reason: ${r}`);t.vehicleId=null;t.positionId=null;t.status='Removed';await DB.put('tyres',t);toast('Tyre removed');tyreView(id)}
async function doStatus(id){const t=await DB.get('tyres',id),s=$('#cs').value;if(s===t.status)return;if(s==='Scrapped'&&!confirm('Scrap karne ke baad tyre dobara use nahi hoga. Continue?'))return;
  addEvent(t,'Status',`${t.status} → ${s}`);t.status=s;await DB.put('tyres',t);toast('Status updated');tyreView(id)}

let invCat='All',invQ='';
async function inventory(){$('#view').innerHTML=`<h2>Tyre Inventory</h2><button class="btn" onclick="go('tyre-add')">+ Add New Tyre</button><input id="iq" placeholder="Search ID, brand, serial, size, vehicle" value="${esc(invQ)}" style="margin-top:12px"><div class="chips" id="ic"></div><div id="il"></div>`;
  const ty=await DB.all('tyres'),vs=await DB.all('vehicles'),vOf=i=>vs.find(v=>v.id===i);
  const draw=()=>{const q=invQ.toLowerCase();$('#ic').innerHTML=['All',...STATUSES].map(s=>`<span class="chip ${s===invCat?'d':''}" onclick="invSet('${s}')">${s} (${s==='All'?ty.length:ty.filter(t=>t.status===s).length})</span>`).join('');
   const l=ty.filter(t=>(invCat==='All'||t.status===invCat)&&(!q||[t.id,t.brand,t.model,t.serial,t.size,(vOf(t.vehicleId)||{}).reg].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.id.localeCompare(a.id));
   $('#il').innerHTML=l.length?l.map(t=>{const v=vOf(t.vehicleId);return`<div class="card veh" onclick="go('tyre/${t.id}')"><div><b style="color:var(--cyan)">${t.id}</b><div>${esc(t.brand)} ${esc(t.model)} · ${esc(t.size)}</div><div class="mut">S/N ${esc(t.serial)} · ${v?esc(v.reg)+' – '+posLabel(v,t.positionId):'In store'}</div></div><div style="text-align:right"><span class="pill ${statCls[t.status]}">${t.status}</span><br><span class="pill ${condCls(t.condition)}" style="margin-top:4px">${esc(t.condition||'Not inspected')}</span></div></div>`}).join(''):'<div class="card mut">Koi tyre nahi mila.</div>'};
  window.invSet=s=>{invCat=s;draw()};$('#iq').oninput=e=>{invQ=e.target.value;draw()};draw()}
