/* Phase 4: tyre replacement. The old tyre keeps its full history; the new tyre starts a new fitment lifecycle. */
const AFTER_STATUS=['Removed','Spare','Under Repair','Scrapped'];
const tyDesc=t=>t?`${t.brand} ${t.model||''} · ${t.size} · S/N ${t.serial}`:'';
async function replacement(arg){
  const vs=(await DB.all('vehicles')).filter(v=>v.active!==false),ty=await DB.all('tyres'),store=ty.filter(t=>!t.vehicleId&&['New','Spare'].includes(t.status)),rps=(await DB.all('replacements')).sort((a,b)=>b.id.localeCompare(a.id));
  const hist=rps.length?rps.map(r=>`<div class="card"><b style="color:var(--cyan)">${r.id}</b> · ${esc(r.reg)} · ${esc(r.positionLabel)}<div><span style="cursor:pointer" onclick="go('tyre/${r.oldTyreId}')">${r.oldTyreId}</span> → <span style="cursor:pointer;color:var(--ok)" onclick="go('tyre/${r.newTyreId}')">${r.newTyreId}</span></div><div class="mut">${fmt(r.date)} · ${r.km} KM · ${r.hours} hrs · ${esc(r.reason)} · ${esc(r.technician)}</div>${r.remarks?`<div class="mut">${esc(r.remarks)}</div>`:''}</div>`).join(''):'<div class="card mut">No replacements recorded yet.</div>';
  $('#view').innerHTML='<h2>Tyre Replacement</h2>'+(!vs.length?'<div class="card mut">Add a vehicle first.</div>':`<form id="rpf" class="card">
  <label>Vehicle Registration Number *</label><select id="rpv" required><option value="">Select vehicle</option>${vs.map(v=>`<option value="${v.id}" ${v.id===arg?'selected':''}>${vLabel(v)}</option>`).join('')}</select>
  <label>Position to Replace (Old Tyre) *</label><select id="rpo" required></select><div class="mut" id="rpoi"></div>
  <label>New Tyre (in store: New or Spare) *</label><select id="rpn" required><option value="">Select tyre</option>${store.map(t=>`<option value="${t.id}">${t.id} – ${esc(t.brand)} ${esc(t.size)}</option>`).join('')}</select><div class="mut" id="rpni">${store.length?'':'No New/Spare tyre in store. Register one from Tyre Inventory first.'}</div>
  <label>Replacement Date</label><input id="rpd" type="date" value="${today()}">${rdRow(null)}
  <label>Old Tyre Removal Reason *</label><select id="rpr">${REMOVE_REASONS.map(r=>`<option>${r}</option>`).join('')}</select>
  <label>Old Tyre Status After Removal</label><select id="rps">${AFTER_STATUS.map(s=>`<option>${s}</option>`).join('')}</select>
  <label>New Tyre Installation Details</label><textarea id="rpi" rows="2" placeholder="Rim, valve, wheel nut torque, balancing..."></textarea>
  <label>Technician</label><input readonly value="${esc(prof().name)}"><label>Remarks</label><textarea id="rpm" rows="2"></textarea><br><button class="btn">Complete Replacement</button></form>`)+'<h3>Replacement History</h3>'+hist;
  if(!vs.length)return;
  const vOf=()=>vs.find(x=>x.id===$('#rpv').value),tAt=()=>{const v=vOf();return v&&ty.find(x=>x.vehicleId===v.id&&x.positionId===$('#rpo').value)};
  const fill=()=>{const v=vOf();$('#rpo').innerHTML='<option value="">Select position</option>'+(v?buildLayout(v.axles).map(p=>{const t=ty.find(x=>x.vehicleId===v.id&&x.positionId===p.id);return t?`<option value="${p.id}">${p.label} – ${t.id}</option>`:''}).join(''):'');if(v){$('#rk').value=v.odo;$('#rh').value=v.hours}$('#rpoi').textContent=''};
  $('#rpv').onchange=fill;$('#rpo').onchange=()=>{$('#rpoi').textContent=tyDesc(tAt())};$('#rpn').onchange=()=>{$('#rpni').textContent=tyDesc(ty.find(x=>x.id===$('#rpn').value))};fill();
  $('#rpf').onsubmit=async e=>{e.preventDefault();const v=vOf(),all=await DB.all('tyres'),old=all.find(t=>t.vehicleId===v.id&&t.positionId===$('#rpo').value),nw=all.find(t=>t.id===$('#rpn').value);
    if(!old||!nw)return toast('Select the old and the new tyre');if(nw.vehicleId||!['New','Spare'].includes(nw.status))return toast('The new tyre must be in store (New or Spare)');
    const pos=old.positionId,lbl=posLabel(v,pos),date=$('#rpd').value||today(),reason=$('#rpr').value,st=$('#rps').value;
    const pre=chkReading(v,$('#rk').value,$('#rh').value);if(pre)return toast(pre);
    if(!confirm(`Replace ${old.id} with ${nw.id}?\nVehicle: ${v.reg}\nPosition: ${lbl}\nOld tyre will be marked: ${st}`))return;
    const er=await applyReading(v,$('#rk').value,$('#rh').value);if(er)return toast(er);
    for(const f of(await DB.all('fitments')).filter(f=>f.tyreId===old.id&&!f.toDate)){f.toDate=date;f.toKm=v.odo;f.toHours=v.hours;f.reason=reason;await DB.put('fitments',f)}
    old.vehicleId=null;old.positionId=null;old.status=st;addEvent(old,st==='Scrapped'?'Scrapped':'Removed',`Replaced by ${nw.id} on ${v.reg} – ${lbl} at ${v.odo} KM / ${v.hours} hrs. Reason: ${reason}`,date);await DB.put('tyres',old);
    await fitTyre(nw,v,pos,date);const det=$('#rpi').value.trim();addEvent(nw,'Replacement',`Installed as replacement for ${old.id}${det?'. '+det:''}`,date);await DB.put('tyres',nw);
    const id=await DB.nextId('RP',6);await DB.put('replacements',{id,vehicleId:v.id,reg:v.reg,positionId:pos,positionLabel:lbl,oldTyreId:old.id,oldBrand:old.brand,oldSize:old.size,oldStatusAfter:st,newTyreId:nw.id,newBrand:nw.brand,newSize:nw.size,date,km:v.odo,hours:v.hours,reason,installDetails:det,technician:prof().name,remarks:$('#rpm').value.trim(),created:new Date().toISOString()});
    toast('Replacement completed: '+id);replacement(v.id)}}
