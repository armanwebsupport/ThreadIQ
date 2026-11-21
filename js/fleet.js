/* Vehicle list: search by number / code / ID, vehicle code label, and a real inspection status on every card. */
const vLabel=v=>esc(v.reg)+(v.code?' · '+esc(v.code):'');
const agoText=d=>{const n=Math.floor((Date.now()-new Date(d).getTime())/864e5);return n<=0?'today':n===1?'yesterday':n+' days ago'};
async function fleetStatus(){const S={};for(const i of await DB.all('inspections')){const s=S[i.vehicleId]||(S[i.vehicleId]={last:null,draft:0});if(i.status==='Draft')s.draft++;else if(!s.last||i.dateTime>s.last)s.last=i.dateTime}return S}
function vStatus(v,ty,fs){const s=fs[v.id]||{},cs=ty.filter(x=>x.vehicleId===v.id&&x.status==='In-Service'&&x.condition).map(x=>CONDS.indexOf(x.condition)),w=cs.length?CONDS[Math.max(...cs)]:null,due=cfg().inspDays;
  if(!s.last)return{cls:'n',label:'Not inspected',sub:s.draft?'Draft saved':'',over:false};
  const days=Math.floor((Date.now()-new Date(s.last).getTime())/864e5),over=hasV(due)&&days>+due;
  return{cls:w?condCls(w):'n',label:w||'Inspected',sub:(over?'Inspection due · ':'Inspected ')+agoText(s.last)+(s.draft?' · draft saved':''),over}}
const vehCard=(ty,fs,more)=>v=>{const t=ty.filter(x=>x.vehicleId===v.id),st=vStatus(v,ty,fs||{});
  return`<div class="card veh" onclick="go('vehicle/${v.id}')"><div><b>${esc(v.reg)}</b>${v.code?` <span class="pill n" style="margin-left:4px">${esc(v.code)}</span>`:''}<div class="mut">${esc(v.make)} ${esc(v.model)}</div><div class="mut">${v.wheels} tyres · ${t.filter(x=>HEALTHY.includes(x.condition)).length} healthy</div>${more?`<div class="mut">${v.odo} KM · ${v.hours} hrs${v.location?' · '+esc(v.location):''} · ${v.id}</div>`:''}</div>
  <div style="text-align:right;flex:none"><span class="pill ${st.cls}">${esc(st.label)}</span>${st.sub?`<div class="mut" style="font-size:.7rem;margin-top:4px;${st.over?'color:var(--warn)':''}">${esc(st.sub)}</div>`:''}</div></div>`};
let vq='';
async function vehicles(){const vs=(await DB.all('vehicles')).filter(v=>v.active!==false),ty=await DB.all('tyres'),fs=await fleetStatus();
  $('#view').innerHTML=`<h2>Vehicles</h2><button class="btn" onclick="go('vehicle-add')">+ Add New Vehicle</button><input id="vsq" type="search" placeholder="Search vehicle number or code" value="${esc(vq)}" autocomplete="off" style="margin-top:12px"><div class="mut" id="vcnt" style="margin:6px 2px"></div><div id="vl"></div>`;
  const draw=()=>{const q=vq.trim().toLowerCase(),nq=normReg(vq),l=!q?vs:vs.filter(v=>[v.reg,v.code,v.id,v.make,v.model,v.chassis,v.location,v.vtype].join(' ').toLowerCase().includes(q)||(nq&&[v.reg,v.code].some(x=>normReg(x||'').includes(nq))));
    $('#vcnt').textContent=q?`${l.length} of ${vs.length} vehicles`:`${vs.length} vehicle${vs.length===1?'':'s'}`;$('#vl').innerHTML=l.length?l.map(vehCard(ty,fs,!!q)).join(''):'<div class="card mut">No vehicle matches your search.</div>'};
  $('#vsq').oninput=e=>{vq=e.target.value;draw()};draw()}
