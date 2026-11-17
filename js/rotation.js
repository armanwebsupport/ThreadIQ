/* Phase 4: tyre rotation. A tyre keeps its permanent ID; positions change and every move is kept as a new fitment record. */
async function rotation(arg){
  const vs=(await DB.all('vehicles')).filter(v=>v.active!==false),ty=await DB.all('tyres'),rts=(await DB.all('rotations')).sort((a,b)=>b.id.localeCompare(a.id));
  const hist=rts.length?rts.map(r=>`<div class="card"><b style="color:var(--purple)">${r.id}</b> · ${esc(r.reg)}<div class="mut">${fmt(r.date)} · ${r.km} KM · ${r.hours} hrs · ${esc(r.technician)}</div>${r.moves.map(m=>`<div><span style="cursor:pointer;color:var(--cyan)" onclick="go('tyre/${m.tyreId}')">${m.tyreId}</span>: ${esc(m.fromLabel)} → ${esc(m.toLabel)}</div>`).join('')}${r.remarks?`<div class="mut">${esc(r.remarks)}</div>`:''}</div>`).join(''):'<div class="card mut">No rotations recorded yet.</div>';
  $('#view').innerHTML='<h2>Tyre Rotation</h2>'+(!vs.length?'<div class="card mut">Add a vehicle first.</div>':`<form id="rtf" class="card">
  <label>Vehicle Registration Number *</label><select id="rtv" required><option value="">Select vehicle</option>${vs.map(v=>`<option value="${v.id}" ${v.id===arg?'selected':''}>${esc(v.reg)}</option>`).join('')}</select>
  <label>Current Tyre Positions</label><div id="rtl" class="mut">Select a vehicle</div>
  <label>Tyre to Rotate *</label><select id="rtt" required></select><label>New Position *</label><select id="rtn" required></select><div class="mut" id="rti"></div>
  <label>Rotation Date</label><input id="rtd" type="date" value="${today()}">${rdRow(null)}<label>Remarks</label><textarea id="rtm" rows="2"></textarea><br><button class="btn">Rotate Tyre</button></form>`)+'<h3>Rotation History</h3>'+hist;
  if(!vs.length)return;
  const vOf=()=>vs.find(x=>x.id===$('#rtv').value),on=v=>ty.filter(t=>t.vehicleId===v.id),occ=(v,p)=>on(v).find(t=>t.positionId===p);
  const fillN=()=>{const v=vOf(),t=ty.find(x=>x.id===$('#rtt').value);$('#rtn').innerHTML='<option value="">Select new position</option>'+(v&&t?buildLayout(v.axles).filter(p=>p.id!==t.positionId).map(p=>{const o=occ(v,p.id);return`<option value="${p.id}">${p.label} ${o?'(swap with '+o.id+')':'(empty)'}</option>`}).join(''):'');$('#rti').textContent=''};
  const fill=()=>{const v=vOf();$('#rtl').innerHTML=v?buildLayout(v.axles).map(p=>{const o=occ(v,p.id);return`<div>${p.label}: <b style="color:var(--cyan)">${o?o.id:'Empty'}</b></div>`}).join(''):'Select a vehicle';
    $('#rtt').innerHTML='<option value="">Select tyre</option>'+(v?buildLayout(v.axles).map(p=>{const o=occ(v,p.id);return o?`<option value="${o.id}">${o.id} – ${p.label}</option>`:''}).join(''):'');if(v){$('#rk').value=v.odo;$('#rh').value=v.hours}fillN()};
  $('#rtv').onchange=fill;$('#rtt').onchange=fillN;
  $('#rtn').onchange=()=>{const v=vOf(),o=occ(v,$('#rtn').value);$('#rti').textContent=o?`${o.id} will move to the old position of the selected tyre.`:''};fill();
  $('#rtf').onsubmit=async e=>{e.preventDefault();const v=vOf(),all=(await DB.all('tyres')).filter(t=>t.vehicleId===v.id),t=all.find(x=>x.id===$('#rtt').value),to=$('#rtn').value,o=all.find(x=>x.positionId===to);
    if(!t||!to)return toast('Select a tyre and a new position');if(to===t.positionId)return toast('Choose a different position');
    const from=t.positionId,fl=posLabel(v,from),tl=posLabel(v,to),date=$('#rtd').value||today(),moves=[{t,from,to},...(o?[{t:o,from:to,to:from}]:[])];
    const pre=chkReading(v,$('#rk').value,$('#rh').value);if(pre)return toast(pre);
    if(!confirm(`Rotate ${t.id}\nFrom: ${fl}\nTo: ${tl}`+(o?`\n\n${o.id} will move from ${tl} to ${fl}`:'')+'\n\nContinue?'))return;
    const er=await applyReading(v,$('#rk').value,$('#rh').value);if(er)return toast(er);
    const log=[];for(const m of moves){for(const f of(await DB.all('fitments')).filter(f=>f.tyreId===m.t.id&&!f.toDate)){f.toDate=date;f.toKm=v.odo;f.toHours=v.hours;f.reason='Rotation';await DB.put('fitments',f)}
      await DB.put('fitments',{id:await DB.nextId('FT',5),tyreId:m.t.id,vehicleId:v.id,positionId:m.to,fromDate:date,fromKm:v.odo,fromHours:v.hours,toDate:null,toKm:null,reason:'',via:'Rotation'});
      m.t.positionId=m.to;addEvent(m.t,'Rotation',`Rotated on ${v.reg}: ${posLabel(v,m.from)} → ${posLabel(v,m.to)} at ${v.odo} KM / ${v.hours} hrs`);await DB.put('tyres',m.t);log.push({tyreId:m.t.id,from:m.from,to:m.to,fromLabel:posLabel(v,m.from),toLabel:posLabel(v,m.to)})}
    const id=await DB.nextId('RT',6);await DB.put('rotations',{id,vehicleId:v.id,reg:v.reg,date,km:v.odo,hours:v.hours,moves:log,remarks:$('#rtm').value.trim(),technician:prof().name,created:new Date().toISOString()});
    toast('Rotation completed: '+id);rotation(v.id)}}
