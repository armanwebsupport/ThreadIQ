/* Phase 4b: inspection findings on the tyre page + auto-filled job cards (stored in the 'maintenance' store). */
const REPAIR_DMG=['Cut','Sidewall Cut','Tread Cut','Crack','Bulge','Exposed Cord'],BAD_COND=['Needs Attention','Critical','Unserviceable'],isNormalWear=w=>!w||/^(normal|even)/i.test(w);
async function latestEntry(tid){let best=null;for(const i of await DB.all('inspections')){if(i.status!=='Completed')continue;const e=(i.entries||[]).find(x=>x.tyreId===tid);if(e&&(!best||i.dateTime>best.i.dateTime))best={i,e}}return best}
function problemsOf(e){const p=[],ph=(e.physical||[]).filter(x=>x!=='No Visible Damage');
  if(BAD_COND.includes(e.condition))p.push('Tyre condition: '+e.condition);
  if(ph.length)p.push(`Damage: ${ph.join(', ')}${e.severity&&e.severity!=='None'?' ('+e.severity+')':''}${e.damageLocation?' at '+e.damageLocation:''}`);
  if(e.damageDescription)p.push('Details: '+e.damageDescription);
  if(e.valve&&e.valve!=='Good')p.push('Valve: '+e.valve);if(e.rim&&e.rim!=='Good')p.push('Rim: '+e.rim);if(e.nut&&e.nut!=='Tight')p.push('Wheel nut: '+e.nut);
  if(!isNormalWear(e.wearObs))p.push('Tread wear: '+e.wearObs);if(e.remarks)p.push('Remarks: '+e.remarks);return p}
function suggestType(e){const ph=e.physical||[];if(ph.includes('Puncture'))return'Puncture Repair';if(ph.some(x=>REPAIR_DMG.includes(x)))return'Tyre Repair';if(e.nut&&e.nut!=='Tight')return'Wheel Nut Check';
  if((e.valve&&e.valve!=='Good')||(e.rim&&e.rim!=='Good'))return'Valve / Rim Service';if(ph.some(x=>['Shoulder Wear','Irregular Wear','Uneven Wear'].includes(x))||!isNormalWear(e.wearObs))return'Wheel Alignment';return'Other'}
const jOpen=j=>['Scheduled','In Progress'].includes(j.status);

/* Card shown at the top of the tyre profile (tap a wheel in the vehicle map) */
async function findingsCard(t){const r=await latestEntry(t.id);if(!r)return'<div class="card mut">No completed inspection for this tyre yet. Findings will appear here after an inspection.</div>';
  const {i,e}=r,pr=problemsOf(e),jobs=(await DB.all('maintenance')).filter(j=>j.tyreId===t.id),open=jobs.find(j=>jOpen(j)),last=jobs.filter(j=>j.status==='Completed').sort((a,b)=>b.id.localeCompare(a.id))[0],mm=x=>x==null?'–':x;
  const col={g:'var(--ok)',y:'var(--warn)',r:'var(--bad)',n:'var(--mut)'}[condCls(e.condition)];
  return`<div class="card" style="border-left:5px solid ${col}"><div style="display:flex;justify-content:space-between;gap:8px"><b>Latest Inspection</b><span class="pill ${condCls(e.condition)}">${esc(e.condition)}</span></div>
  <div class="mut"><span style="color:var(--cyan);cursor:pointer" onclick="go('inspection-view/${i.id}')">${i.id}</span> · ${fmt(i.dateTime)} · ${esc(i.inspector)} · ${i.km} KM</div>
  <div class="mut" style="margin-top:6px">Tread (mm): inner ${mm(e.treadInner)} · centre ${mm(e.treadCentre)} · outer ${mm(e.treadOuter)} · current ${mm(e.treadCurrent)} (previous ${mm(e.treadPrevious)})${e.pressure!=null&&e.pressure!==''?' · '+e.pressure+' PSI':''}</div>
  <h3 style="margin:12px 0 6px">${pr.length?'Problems Identified':'No problem identified'}</h3>${pr.map(x=>`<div style="padding:4px 0">⚠️ ${esc(x)}</div>`).join('')}
  ${(e.photos||[]).map(s=>`<img class="photo" style="max-width:100px;display:inline-block;margin:8px 6px 0 0" src="${s}">`).join('')}
  ${open?`<br><button class="btn" style="margin-top:10px" onclick="go('jobcard/${open.id}')">Open Job Card ${open.id}</button>`:pr.length?`<br><button class="btn" style="margin-top:10px" onclick="createJobCard('${t.id}')">Create Job Card</button>`:''}
  ${['Critical','Unserviceable'].includes(e.condition)&&t.vehicleId?`<button class="btn sec" style="margin-top:8px" onclick="go('replacement/${t.vehicleId}')">Replace This Tyre</button>`:''}
  ${!open&&last?`<div class="mut" style="margin-top:8px">Last job card ${last.id} completed ${fmt(last.doneDate)}</div>`:''}</div>`}

async function createJobCard(tid){const t=await DB.get('tyres',tid),r=await latestEntry(tid);if(!r)return toast('No inspection found for this tyre');
  const dup=(await DB.all('maintenance')).find(j=>j.tyreId===tid&&jOpen(j));if(dup)return go('jobcard/'+dup.id);
  const v=t.vehicleId?await DB.get('vehicles',t.vehicleId):null,e=r.e,j={id:await DB.nextId('MT',6),type:suggestType(e),vehicleId:v?v.id:null,reg:v?v.reg:'',tyreId:tid,positionLabel:e.positionLabel,status:'Scheduled',dueDate:'',doneDate:'',km:null,hours:null,inspectionId:r.i.id,problems:problemsOf(e),notes:'',actionTaken:'',partsUsed:'',technician:prof().name,created:new Date().toISOString(),source:'Inspection'};
  await DB.put('maintenance',j);addEvent(t,'Job Card',`${j.id} created from ${r.i.id}: ${j.type}`);await DB.put('tyres',t);toast('Job card created: '+j.id);go('jobcard/'+j.id)}

async function jobCard(id){const j=await DB.get('maintenance',id);if(!j)return go('maintenance');
  const t=j.tyreId?await DB.get('tyres',j.tyreId):null,v=j.vehicleId?await DB.get('vehicles',j.vehicleId):null,ins=j.inspectionId?await DB.get('inspections',j.inspectionId):null,e=ins&&(ins.entries||[]).find(x=>x.tyreId===j.tyreId),open=jOpen(j),late=open&&j.dueDate&&j.dueDate<today();
  const kv=(k,x)=>x?`<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #1b3f70"><span class="mut">${k}</span><b style="text-align:right">${x}</b></div>`:'';
  $('#view').innerHTML=`<h2>Job Card <span style="color:var(--cyan)">${j.id}</span></h2><div class="card"><span class="pill ${mCls[j.status]}">${j.status}</span>${late?' <span class="pill r">Overdue</span>':''}
  ${kv('Job Type',esc(j.type))}${kv('Vehicle',v?`<span style="color:var(--cyan);cursor:pointer" onclick="go('vehicle/${v.id}')">${esc(v.reg)}</span>`:'')}${kv('Tyre',t?`<span style="color:var(--cyan);cursor:pointer" onclick="go('tyre/${t.id}')">${t.id}</span> · ${esc(t.brand)} ${esc(t.size)}`:'')}${kv('Position',esc(j.positionLabel||''))}
  ${kv('Source',j.inspectionId?`<span style="color:var(--cyan);cursor:pointer" onclick="go('inspection-view/${j.inspectionId}')">${j.inspectionId}</span>`:'Manual job')}${kv('Due',j.dueDate?fmt(j.dueDate):'')}${kv('Technician',esc(j.technician))}</div>
  <h3>Problems Identified</h3><div class="card">${(j.problems&&j.problems.length)?j.problems.map(x=>`<div style="padding:4px 0">⚠️ ${esc(x)}</div>`).join(''):'<span class="mut">None recorded</span>'}${e?(e.photos||[]).map(s=>`<img class="photo" style="max-width:100px;display:inline-block;margin:8px 6px 0 0" src="${s}">`).join(''):''}${j.notes?`<div class="mut" style="margin-top:8px">${esc(j.notes)}</div>`:''}</div>
  ${open?`<form id="jf" class="card"><h3 style="margin-top:0">Repair / Fix Details</h3><label>Job Type</label><select id="jt">${MTYPES.map(x=>`<option ${x===j.type?'selected':''}>${x}</option>`).join('')}</select>
   <label>Action Taken *</label><textarea id="ja" rows="3" placeholder="What was repaired / fixed?">${esc(j.actionTaken)}</textarea><label>Parts / Material Used</label><input id="jp" value="${esc(j.partsUsed||'')}">
   ${v?'<div class="row"><div><label>Vehicle KM (optional)</label><input id="jk" type="number" min="0" step="any" inputmode="decimal"></div><div><label>Engine Hours (optional)</label><input id="jh" type="number" min="0" step="0.1" inputmode="decimal"></div></div>':''}
   ${t?`<label>Tyre condition after repair</label><select id="jc"><option value="">Unchanged (re-inspect later)</option>${CONDS.map(c=>`<option>${c}</option>`).join('')}</select>`:''}<br>
   ${j.status==='Scheduled'?'<button type="button" class="btn sec" onclick="jcAct(\''+j.id+'\',\'In Progress\')">Start Work</button><br>':''}<button type="button" class="btn" onclick="jcAct('${j.id}','Completed')">Complete Job</button><button type="button" class="btn red" onclick="jcAct('${j.id}','Cancelled')">Cancel Job Card</button></form>`
  :`<div class="card"><h3 style="margin-top:0">Repair / Fix Details</h3>${kv('Action Taken',esc(j.actionTaken||''))}${kv('Parts / Material',esc(j.partsUsed||''))}${kv('Date',j.doneDate?fmt(j.doneDate):'')}${kv('Tyre condition set to',esc(j.conditionAfter||''))}</div>`}`}

async function jcAct(id,st){const j=await DB.get('maintenance',id),t=j.tyreId?await DB.get('tyres',j.tyreId):null,v=j.vehicleId?await DB.get('vehicles',j.vehicleId):null;
  j.type=$('#jt').value;j.actionTaken=$('#ja').value.trim();j.partsUsed=$('#jp').value.trim();
  if(st==='Completed'){if(!j.actionTaken)return toast('Enter the action taken');const k=$('#jk')?$('#jk').value:'';if(v&&k!==''){const pre=chkReading(v,k,$('#jh').value);if(pre)return toast(pre)}
    if(!confirm(`Complete job card ${j.id}?`))return;if(v&&k!=='')await applyReading(v,k,$('#jh').value);j.doneDate=today();j.conditionAfter=$('#jc')?$('#jc').value:'';if(v&&k!==''){j.km=v.odo;j.hours=v.hours}}
  if(st==='Cancelled'&&!confirm(`Cancel job card ${j.id}?`))return;
  j.status=st;await DB.put('maintenance',j);
  if(t){if(st==='Completed'&&j.conditionAfter)t.condition=j.conditionAfter;if(st!=='Cancelled'||true)addEvent(t,'Maintenance',st==='Completed'?`${j.type} completed (${j.id}): ${j.actionTaken}${j.conditionAfter?'. Condition set to '+j.conditionAfter:''}`:st==='Cancelled'?`Job card ${j.id} cancelled`:`${j.type} started (${j.id})`);await DB.put('tyres',t)}
  toast(st==='Completed'?'Job completed':st==='Cancelled'?'Job card cancelled':'Work started');jobCard(id)}
