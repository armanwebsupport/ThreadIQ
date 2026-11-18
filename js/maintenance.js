/* Phase 4: maintenance jobs for vehicles and tyres (repair, retread, balancing, alignment, pressure...). */
const MTYPES=['Puncture Repair','Tyre Repair','Retreading','Wheel Balancing','Wheel Alignment','Pressure Correction','Valve / Rim Service','Wheel Nut Check','Other'];
const MSTAT=['Scheduled','In Progress','Completed','Cancelled'],mCls={'Scheduled':'y','In Progress':'y','Completed':'g','Cancelled':'n'};
let mFilter='Open';
const mOpen=j=>['Scheduled','In Progress'].includes(j.status),mLate=j=>mOpen(j)&&j.dueDate&&j.dueDate<today();
async function maintenance(){
  const js=(await DB.all('maintenance')).sort((a,b)=>b.id.localeCompare(a.id));
  $('#view').innerHTML=`<h2>Maintenance</h2><button class="btn" onclick="go('maintenance-add')">+ New Maintenance Job</button><div class="chips" style="margin-top:12px">${['Open','Completed','All'].map(f=>`<span class="chip ${f===mFilter?'d':''}" onclick="mFilter='${f}';maintenance()">${f} (${js.filter(j=>f==='All'||(f==='Open'?mOpen(j):j.status===f)).length})</span>`).join('')}</div><div id="ml"></div>`;
  const l=js.filter(j=>mFilter==='All'||(mFilter==='Open'?mOpen(j):j.status===mFilter));
  $('#ml').innerHTML=l.length?l.map(j=>`<div class="card" style="cursor:pointer" onclick="go('jobcard/${j.id}')"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${esc(j.type)}</b> <span class="mut">${j.id}</span><div class="mut">${[j.reg,j.tyreId].filter(Boolean).map(esc).join(' · ')}</div></div><div style="text-align:right"><span class="pill ${mCls[j.status]}">${j.status}</span>${mLate(j)?'<br><span class="pill r" style="margin-top:4px">Overdue</span>':''}</div></div>
   <div class="mut">${j.dueDate?'Due '+fmt(j.dueDate)+' · ':''}${j.doneDate?'Done '+fmt(j.doneDate)+' · ':''}${esc(j.technician)}</div>${j.notes?`<div class="mut">${esc(j.notes)}</div>`:''}
   ${mOpen(j)?`<div class="row" style="margin-top:8px">${j.status==='Scheduled'?`<button class="btn sec" onclick="event.stopPropagation();mAct('${j.id}','In Progress')">Start</button>`:'<span></span>'}<button class="btn" onclick="event.stopPropagation();mAct('${j.id}','Completed')">Complete</button></div><button class="btn sec" style="margin-top:8px" onclick="event.stopPropagation();mAct('${j.id}','Cancelled')">Cancel Job</button>`:''}</div>`).join(''):'<div class="card mut">No jobs here.</div>'}
async function mAct(id,st){if(['Completed','Cancelled'].includes(st)&&!confirm(`Mark this job as ${st}?`))return;const j=await DB.get('maintenance',id);j.status=st;if(st==='Completed')j.doneDate=today();await DB.put('maintenance',j);
  if(j.tyreId&&['Completed','In Progress'].includes(st)){const t=await DB.get('tyres',j.tyreId);if(t){addEvent(t,'Maintenance',`${j.type} ${st==='Completed'?'completed':'started'}`);await DB.put('tyres',t)}}toast('Job '+st.toLowerCase());maintenance()}
async function maintenanceForm(){
  const vs=(await DB.all('vehicles')).filter(v=>v.active!==false),ty=(await DB.all('tyres')).filter(t=>t.status!=='Scrapped');
  $('#view').innerHTML=`<h2>New Maintenance Job</h2><form id="mf" class="card"><label>Job Type *</label><select id="mt">${MTYPES.map(t=>`<option>${t}</option>`).join('')}</select>
  <label>Vehicle (optional)</label><select id="mv"><option value="">— None —</option>${vs.map(v=>`<option value="${v.id}">${esc(v.reg)}</option>`).join('')}</select>
  <label>Tyre (optional)</label><select id="mty"></select><label>Status</label><select id="ms">${MSTAT.slice(0,3).map(s=>`<option>${s}</option>`).join('')}</select>
  <div class="row"><div><label>Due Date</label><input id="mdu" type="date"></div><div><label>Date Done</label><input id="mdo" type="date"></div></div>
  <div class="row"><div><label>Vehicle KM (optional)</label><input id="mk" type="number" min="0" step="any" inputmode="decimal"></div><div><label>Engine Hours (optional)</label><input id="mh" type="number" min="0" step="0.1" inputmode="decimal"></div></div>
  <label>Technician</label><input readonly value="${esc(prof().name)}"><label>Work Details / Notes</label><textarea id="mn" rows="3"></textarea><br><button class="btn">Save Job</button></form>`;
  const fillT=()=>{const vid=$('#mv').value;$('#mty').innerHTML='<option value="">— None —</option>'+ty.filter(t=>!vid||t.vehicleId===vid).map(t=>`<option value="${t.id}">${t.id} – ${esc(t.brand)} ${esc(t.size)} (${t.status})</option>`).join('')};$('#mv').onchange=fillT;fillT();
  $('#mf').onsubmit=async e=>{e.preventDefault();const v=vs.find(x=>x.id===$('#mv').value),tid=$('#mty').value,st=$('#ms').value;if(!v&&!tid)return toast('Select a vehicle or a tyre');
    if(v&&$('#mk').value!==''){const er=await applyReading(v,$('#mk').value,$('#mh').value);if(er)return toast(er)}
    const j={id:await DB.nextId('MT',6),type:$('#mt').value,vehicleId:v?v.id:null,reg:v?v.reg:'',tyreId:tid||null,status:st,dueDate:$('#mdu').value,doneDate:st==='Completed'?($('#mdo').value||today()):$('#mdo').value,km:v&&$('#mk').value!==''?+$('#mk').value:null,hours:v&&$('#mh').value!==''?+$('#mh').value:null,notes:$('#mn').value.trim(),technician:prof().name,created:new Date().toISOString()};
    await DB.put('maintenance',j);if(tid&&st!=='Scheduled'){const t=await DB.get('tyres',tid);addEvent(t,'Maintenance',`${j.type} ${st==='Completed'?'completed':'started'}`);await DB.put('tyres',t)}
    toast('Maintenance job saved');mFilter='Open';go('maintenance')}}
