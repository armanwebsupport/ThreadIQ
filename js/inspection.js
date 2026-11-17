/* Phase 3: tyre inspections (multi-tyre sessions, drafts), tread depth, damage, photos, history. Completed inspections are never overwritten. */
const PHYSICAL=['No Visible Damage','Cut','Sidewall Cut','Tread Cut','Crack','Bulge','Puncture','Shoulder Wear','Irregular Wear','Uneven Wear','Exposed Cord','Other'];
const CONDS=['Good','Satisfactory','Needs Attention','Critical','Unserviceable'];
const WEAR=['Normal','Shoulder Wear','Centre Wear','Irregular Wear','Uneven Wear'],SEV=['None','Minor','Moderate','Severe'];
let ins=null,step=1,cur=null,insPre='',hf={q:'',c:'All',d:''};
const num=v=>v===''||v==null||isNaN(+v)?null:+v;
const nowLocal=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const sel=(id,arr,val)=>`<select id="${id}">${arr.map(x=>`<option ${x===val?'selected':''}>${x}</option>`).join('')}</select>`;
const kv=(k,x)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #1b3f70"><span class="mut">${k}</span><b style="text-align:right">${esc(x===0?'0':x||'—')}</b></div>`;
const prevOf=t=>t.currentTread!=null?t.currentTread:t.initialTread;
const mm=x=>x==null?'—':x+' mm';
function shrink(file,max=800){return new Promise(ok=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,max/Math.max(im.width,im.height));c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.6))};im.src=URL.createObjectURL(file)})}
async function persist(){if(!ins.id){ins.id=await DB.nextId('INS',6);ins.created=new Date().toISOString()}ins.updated=new Date().toISOString();await DB.put('inspections',ins)}
window.insBack=()=>{if(!ins)return false;if(step===3){step=2;render();return true}if(step===2){step=1;render();return true}return false};

async function inspection(arg){if(arg){const d=await DB.get('inspections',arg);if(!d||d.status!=='Draft')return go('history');ins=d;step=2}else if(!ins)step=1;render()}
const render=()=>step===1?stepVehicle():step===2?stepTyres():stepForm();

async function stepVehicle(){const vs=(await DB.all('vehicles')).filter(v=>v.active!==false),drafts=(await DB.all('inspections')).filter(i=>i.status==='Draft').sort((a,b)=>b.id.localeCompare(a.id));
  const pre=(ins&&ins.vehicleId)||insPre;insPre='';
  $('#view').innerHTML=`<h2>New Inspection</h2><div class="mut">Step 1 of 4 · Select vehicle</div><form id="s1" class="card"><label>Vehicle Registration Number *</label><select id="iv" required><option value="">Select vehicle</option>${vs.map(v=>`<option value="${v.id}" ${v.id===pre?'selected':''}>${esc(v.reg)}</option>`).join('')}</select>
  <label>Vehicle Model</label><input id="im" readonly><div class="row"><div><label>Current KM Reading *</label><input id="ik" type="number" min="0" step="any" inputmode="decimal" required></div><div><label>Engine Hours Meter</label><input id="ih" type="number" min="0" step="0.1" inputmode="decimal"></div></div>
  <label>Inspection Date &amp; Time</label><input id="id" type="datetime-local" value="${ins?ins.dateTime:nowLocal()}"><label>Inspector Name</label><input value="${esc(prof().name)}" readonly><br><button class="btn">Next: Select Tyres</button></form>
  ${drafts.length?'<h3>Draft Inspections</h3>'+drafts.map(d=>`<div class="card veh" onclick="go('inspection/${d.id}')"><div><b>${d.id}</b> · ${esc(d.vehicleReg)}<div class="mut">${d.entries.length} tyre(s) inspected · ${fmt(d.dateTime)}</div></div><span class="pill y">Resume</span></div>`).join(''):''}`;
  const fill=()=>{const v=vs.find(x=>x.id===$('#iv').value);$('#im').value=v?v.make+' '+v.model:'';const same=ins&&v&&ins.vehicleId===v.id;$('#ik').value=v?(same?ins.km:v.odo):'';$('#ih').value=v?(same?ins.hours:v.hours):''};
  $('#iv').onchange=fill;fill();
  $('#s1').onsubmit=async e=>{e.preventDefault();const v=await DB.get('vehicles',$('#iv').value),km=num($('#ik').value),h=$('#ih').value===''?v.hours:num($('#ih').value);
    if(km<v.odo)return toast(`KM cannot be lower than the vehicle's current reading (${v.odo})`);if(h<v.hours)return toast(`Hours cannot be lower than the vehicle's current reading (${v.hours})`);
    if(!(await DB.all('tyres')).some(t=>t.vehicleId===v.id))return toast('No tyres are fitted on this vehicle yet');
    const keep=ins&&ins.vehicleId===v.id;ins={...(keep?ins:{id:null,entries:[],remarks:'',status:'Draft'}),vehicleId:v.id,vehicleReg:v.reg,vehicleModel:v.make+' '+v.model,km,hours:h,dateTime:$('#id').value||nowLocal(),inspector:prof().name};step=2;render()}}

async function stepTyres(){const v=await DB.get('vehicles',ins.vehicleId),ty=(await DB.all('tyres')).filter(t=>t.vehicleId===v.id),L=buildLayout(v.axles);
  $('#view').innerHTML=`<h2>${esc(v.reg)}</h2><div class="mut">Step 2 of 4 · Select tyre · ${ins.entries.length}/${ty.length} inspected in this session</div><br>
  ${L.map(p=>{const t=ty.find(x=>x.positionId===p.id);if(!t)return`<div class="card mut">${p.label} – Empty</div>`;const e=ins.entries.find(x=>x.tyreId===t.id);
   return`<div class="card veh" onclick="openTyre('${t.id}')"><div><b>${p.label}</b><div><span style="color:var(--cyan)">${t.id}</span> · ${esc(t.brand)} · ${esc(t.size)}</div><div class="mut">Last inspected: ${t.lastInspection?fmt(t.lastInspection):'Never'} · Previous tread: ${mm(prevOf(t))}</div></div>${e?`<span class="pill ${condCls(e.condition)}">✔ ${e.condition}</span>`:'<span class="pill n">Pending</span>'}</div>`}).join('')}
  <label>Session Remarks</label><textarea id="sr" rows="2">${esc(ins.remarks)}</textarea><br><button class="btn" onclick="finishIns()">Complete Inspection</button><button class="btn sec" onclick="saveDraft()">Save Draft</button><button class="btn sec" onclick="cancelIns()">Cancel Inspection</button>`}
async function openTyre(id){cur=await DB.get('tyres',id);step=3;render()}
async function saveDraft(){ins.remarks=$('#sr').value.trim();if(!ins.entries.length)return toast('Inspect at least one tyre to save a draft');await persist();ins=null;step=1;toast('Draft saved');render()}
async function cancelIns(){if(!confirm('Discard this inspection session? Any saved draft will be deleted.'))return;if(ins.id)await DB.del('inspections',ins.id);ins=null;step=1;render()}

async function stepForm(){const t=cur,v=await DB.get('vehicles',ins.vehicleId),e=ins.entries.find(x=>x.tyreId===t.id)||{physical:[],photos:[],wearObs:'Normal',severity:'None',condition:'Good',valve:'Good',rim:'Good',nut:'Tight'},prev=prevOf(t);
  let phys=[...e.physical],photos=[...e.photos];const inp=(id,l,val,st='0.1')=>`<div><label>${l}</label><input id="${id}" type="number" min="0" step="${st}" inputmode="decimal" value="${val??''}"></div>`;
  $('#view').innerHTML=`<h2>${posLabel(v,t.positionId)}</h2><div class="mut">Step 3 of 4 · <span style="color:var(--cyan)">${t.id}</span> · ${esc(t.brand)} ${esc(t.size)}</div><form id="s3" class="card">
  <h3 style="margin-top:0">A. Tread Depth</h3><div class="row">${inp('a1','Inner Shoulder (mm)',e.treadInner)}${inp('a2','Centre (mm)',e.treadCentre)}</div><div class="row">${inp('a3','Outer Shoulder (mm)',e.treadOuter)}<div><label>Previous Tread Depth</label><input readonly value="${mm(prev)}"></div></div>
  <label>Current Tread Depth (lowest reading)</label><input id="ac" readonly><label>Tread Wear Observation</label>${sel('aw',WEAR,e.wearObs)}
  <h3>B. Physical Condition</h3><div class="chips" id="ph"></div>
  <h3>C. Damage Details</h3><label>Damage Location</label><input id="dl" value="${esc(e.damageLocation)}"><label>Damage Description</label><textarea id="dd" rows="2">${esc(e.damageDescription)}</textarea><label>Damage Severity</label>${sel('ds',SEV,e.severity)}<label>Remarks</label><textarea id="dr" rows="2">${esc(e.remarks)}</textarea>
  <label>Add Inspection Photo (max 3)</label><input id="dp" type="file" accept="image/*" multiple><div id="pv"></div>
  <h3>D. Tyre Condition</h3>${sel('dc',CONDS,e.condition)}
  <h3>E. Additional Inspection</h3><div class="row">${inp('ep','Tyre Pressure (PSI)',e.pressure,'0.5')}<div><label>Valve Condition</label>${sel('ev1',['Good','Damaged','Missing','Leaking'],e.valve)}</div></div>
  <div class="row"><div><label>Rim Condition</label>${sel('er',['Good','Damaged','Rusted','Bent'],e.rim)}</div><div><label>Wheel Nut Condition</label>${sel('en',['Tight','Loose','Missing','Damaged'],e.nut)}</div></div><label>Visual Observation</label><textarea id="ev" rows="2">${esc(e.visual)}</textarea><br><button class="btn">Save Tyre Inspection</button></form>`;
  const low=()=>{const a=['a1','a2','a3'].map(i=>num($('#'+i).value)).filter(x=>x!=null);return a.length?Math.min(...a):null};
  ['a1','a2','a3'].forEach(i=>$('#'+i).oninput=()=>$('#ac').value=mm(low()));$('#ac').value=mm(low());
  const dp=()=>{$('#ph').innerHTML=PHYSICAL.map((p,i)=>`<span class="chip ${phys.includes(p)?'d':''}" onclick="tp(${i})">${p}</span>`).join('')},dv=()=>{$('#pv').innerHTML=photos.map((s,i)=>`<img class="photo" style="max-width:100px;display:inline-block;margin:6px 6px 0 0" src="${s}" onclick="rp(${i})">`).join('')+(photos.length?'<div class="mut">Tap a photo to remove it</div>':'')};
  window.tp=i=>{const p=PHYSICAL[i];phys=phys.includes(p)?phys.filter(x=>x!==p):(p==='No Visible Damage'?[p]:[...phys.filter(x=>x!=='No Visible Damage'),p]);dp()};window.rp=i=>{photos.splice(i,1);dv()};
  $('#dp').onchange=async ev=>{for(const f of ev.target.files){if(photos.length>=3){toast('Maximum 3 photos per tyre');break}photos.push(await shrink(f))}ev.target.value='';dv()};dp();dv();
  $('#s3').onsubmit=async ev=>{ev.preventDefault();const c=low();if(c==null)return toast('Enter at least one tread depth reading');
    if(prev!=null&&c>prev&&!confirm(`Current depth (${c} mm) is higher than the previous reading (${prev} mm). Save anyway?`))return;
    const ent={tyreId:t.id,brand:t.brand,size:t.size,positionId:t.positionId,positionLabel:posLabel(v,t.positionId),treadInner:num($('#a1').value),treadCentre:num($('#a2').value),treadOuter:num($('#a3').value),treadCurrent:c,treadPrevious:prev??null,wearObs:$('#aw').value,physical:phys,damageLocation:$('#dl').value.trim(),damageDescription:$('#dd').value.trim(),severity:$('#ds').value,remarks:$('#dr').value.trim(),photos,condition:$('#dc').value,pressure:num($('#ep').value),valve:$('#ev1').value,rim:$('#er').value,nut:$('#en').value,visual:$('#ev').value.trim()};
    ins.entries=[...ins.entries.filter(x=>x.tyreId!==t.id),ent];await persist();toast('Tyre inspection saved');step=2;render()}}

async function finishIns(){ins.remarks=$('#sr').value.trim();if(!ins.entries.length)return toast('Inspect at least one tyre first');
  if(!confirm(`Complete inspection of ${ins.entries.length} tyre(s)? Completed inspections cannot be edited.`))return;
  const v=await DB.get('vehicles',ins.vehicleId),er=await applyReading(v,ins.km,ins.hours);if(er)return toast(er);
  for(const e of ins.entries){const t=await DB.get('tyres',e.tyreId);t.condition=e.condition;t.currentTread=e.treadCurrent;t.lastInspection=ins.dateTime;addEvent(t,'Inspection',`${ins.id}: tread ${e.treadCurrent} mm, ${e.condition}`);await DB.put('tyres',t)}
  ins.status='Completed';ins.completedAt=new Date().toISOString();await persist();const id=ins.id;ins=null;step=1;toast('Inspection completed');go('inspection-view/'+id)}

async function inspHistory(){$('#view').innerHTML=`<h2>Inspection History</h2><input id="hq" placeholder="Search vehicle, tyre ID, inspector, brand" value="${esc(hf.q)}"><div class="row" style="margin-top:10px"><select id="hc">${['All',...CONDS].map(c=>`<option ${c===hf.c?'selected':''}>${c}</option>`).join('')}</select><input id="hd" type="date" value="${hf.d}"></div><div id="hl" style="margin-top:12px"></div>`;
  const all=(await DB.all('inspections')).sort((a,b)=>b.id.localeCompare(a.id));
  const draw=()=>{const q=hf.q.toLowerCase(),l=all.filter(i=>(!q||[i.vehicleReg,i.inspector,...i.entries.flatMap(e=>[e.tyreId,e.brand])].join(' ').toLowerCase().includes(q))&&(hf.c==='All'||i.entries.some(e=>e.condition===hf.c))&&(!hf.d||(i.dateTime||'').slice(0,10)===hf.d));
   $('#hl').innerHTML=l.length?l.map(i=>{const w=i.entries.reduce((m,e)=>Math.max(m,CONDS.indexOf(e.condition)),-1);return`<div class="card veh" onclick="go('inspection-view/${i.id}')"><div><b style="color:var(--cyan)">${i.id}</b> · ${esc(i.vehicleReg)}<div class="mut">${fmt(i.dateTime)} · ${esc(i.inspector)}</div><div class="mut">${i.entries.length} tyre(s)</div></div><div style="text-align:right"><span class="pill ${i.status==='Draft'?'y':'g'}">${i.status}</span>${w>=0?`<br><span class="pill ${condCls(CONDS[w])}" style="margin-top:4px">Worst: ${CONDS[w]}</span>`:''}</div></div>`}).join(''):'<div class="card mut">No inspections found.</div>'};
  $('#hq').oninput=e=>{hf.q=e.target.value;draw()};$('#hc').onchange=e=>{hf.c=e.target.value;draw()};$('#hd').onchange=e=>{hf.d=e.target.value;draw()};draw()}

async function inspView(id){const i=await DB.get('inspections',id);if(!i)return go('history');
  $('#view').innerHTML=`<h2 style="color:var(--cyan)">${i.id}</h2><div class="card"><span class="pill ${i.status==='Draft'?'y':'g'}">${i.status}</span>${kv('Vehicle',i.vehicleReg)}${kv('Model',i.vehicleModel)}${kv('KM Reading',i.km+' KM')}${kv('Engine Hours',i.hours+' hrs')}${kv('Date & Time',fmt(i.dateTime))}${kv('Inspector',i.inspector)}${kv('Remarks',i.remarks)}</div>
  ${i.status==='Draft'?`<button class="btn" onclick="go('inspection/${i.id}')">Resume Inspection</button><br>`:''}<h3>Tyres Inspected (${i.entries.length})</h3>
  ${i.entries.map(e=>`<div class="card"><div class="veh" onclick="go('tyre/${e.tyreId}')"><div><b>${esc(e.positionLabel)}</b><div style="color:var(--cyan)">${e.tyreId} · ${esc(e.brand)} ${esc(e.size)}</div></div><span class="pill ${condCls(e.condition)}">${e.condition}</span></div>
   ${kv('Inner / Centre / Outer',[e.treadInner,e.treadCentre,e.treadOuter].map(x=>x==null?'–':x).join(' / ')+' mm')}${kv('Current Tread',mm(e.treadCurrent))}${kv('Previous Tread',mm(e.treadPrevious))}${kv('Wear Observation',e.wearObs)}${kv('Physical Condition',e.physical.join(', ')||'Not recorded')}${kv('Damage Location',e.damageLocation)}${kv('Damage Description',e.damageDescription)}${kv('Severity',e.severity)}${kv('Pressure',e.pressure==null?'':e.pressure+' PSI')}${kv('Valve',e.valve)}${kv('Rim',e.rim)}${kv('Wheel Nut',e.nut)}${kv('Visual Observation',e.visual)}${kv('Remarks',e.remarks)}
   ${e.photos.map(s=>`<img class="photo" src="${s}">`).join('')}</div>`).join('')}`}
