/* Vehicle config + axle/wheel layout. Axle code: S = single wheel per side, D = dual (outer+inner) per side. */
const CATS={
 car:{label:'Car – 4 Wheels',wheels:[4]},lcv:{label:'Light Commercial Vehicle – 4 or 6 Wheels',wheels:[4,6]},
 t6:{label:'Truck – 6 Wheels',wheels:[6]},t10:{label:'Truck – 10 Wheels',wheels:[10]},
 h12:{label:'Heavy Truck – 12 Wheels',wheels:[12]},h14:{label:'Heavy Truck – 14 Wheels',wheels:[14]},h18:{label:'Heavy Truck – 18 Wheels',wheels:[18]},
 custom:{label:'Custom Configuration',wheels:[4,6,10,12,14,18]}};
const PRESETS={4:['S','S'],6:['S','D'],10:['S','D','D'],12:['S','S','D','D'],14:['S','D','D','D'],18:['S','D','D','D','D']};
const MAKES=['Tata','BharatBenz','Ashok Leyland','Volvo','Scania','Mahindra','Eicher','Caterpillar','Komatsu','BEML','Other'];
const wheelsOf=ax=>ax.reduce((n,a)=>n+(a==='D'?4:2),0);
const axName=n=>n===1?'Front':['','','2nd','3rd','4th','5th','6th','7th','8th'][n]+' Axle';
/* Position id (A2-LO) is a slot id only – never a tyre identity. */
function buildLayout(ax){const out=[];ax.forEach((a,i)=>{const n=i+1,nm=axName(n);
  ['L','R'].forEach(s=>{const side=s==='L'?'Left':'Right';
   if(a==='S')out.push({id:`A${n}-${s}`,axle:n,side:s,type:'S',label:`${nm} ${side}`});
   else['O','I'].forEach(p=>out.push({id:`A${n}-${s}${p}`,axle:n,side:s,type:'D',pos:p,label:`${nm} ${side} ${p==='O'?'Outer':'Inner'}`}))})});return out}
function diagram(v,colors={}){const ax=v.axles,H=70+ax.length*62,W=240;let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:300px"><rect x="78" y="14" width="84" height="${H-28}" rx="14" fill="#0A3A70" stroke="#0879D8" stroke-width="2"/><text x="120" y="34" fill="#00D5F2" font-size="10" text-anchor="middle">FRONT ▲</text>`;
 buildLayout(ax).forEach(t=>{const y=48+(t.axle-1)*62,c={g:'#20D997',y:'#FFC928',r:'#F04452'}[colors[t.id]]||'#6b7f99';
  const x=t.side==='L'?(t.type==='S'?52:(t.pos==='O'?30:54)):(t.type==='S'?166:(t.pos==='O'?188:164));
  s+=`<g onclick="posTap('${v.id||''}','${t.id}')" style="cursor:pointer"><rect x="${x}" y="${y}" width="22" height="40" rx="6" fill="${c}" stroke="#fff" stroke-opacity=".4"/><text x="${x+11}" y="${y+24}" font-size="9" text-anchor="middle" fill="#012" font-weight="700">${t.axle}</text></g>`});
 return s+'</svg>'}
const normReg=r=>r.toUpperCase().replace(/[^A-Z0-9]/g,'');
