(function(){
const A=window.ACE,K='icuday.v1',$=s=>document.querySelector(s),V=$('#view');
const TOP={};A.topics.forEach(t=>TOP[t.id]=t);const MOD={};A.modules.forEach(m=>MOD[m.id]=m);
let S;try{S=JSON.parse(localStorage.getItem(K))||{}}catch(e){S={}}S.patients=S.patients||[];
const save=()=>localStorage.setItem(K,JSON.stringify(S));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const strip=h=>h.replace(/<[^>]+>/g,'');
if(S.dark)document.documentElement.classList.add('dark');
$('#theme').onclick=()=>{S.dark=!S.dark;document.documentElement.classList.toggle('dark',S.dark);save()};
$('#back').onclick=()=>history.length>1?history.back():go('today');
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>go(b.dataset.r));
function go(h){location.hash=h}
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
function dayOf(p,now=Date.now()){return Math.max(0,Math.floor((now-new Date(p.admit).getTime())/864e5))}
function dayLabel(d){return d===0?'Day 0':d>=8?'Day '+d+' (8+)':'Day '+d}
function phaseOf(d){return d===0?'Admission (first 24 h)':d===1?'Day 1 – stabilise & full review':d<=3?'Days 2–3 – reassess, de-escalate, wean':d<=7?'Days 4–7 – recovery & complications':'Day 8+ – ongoing / weekly review'}
// Build sections for a patient/day: [{key,title,groups:[{h,items}]}]
function plan(p,d){
 const out=[];const P=d===0?[['h1','0–1 h · immediate'],['h6','1–6 h · confirm, work-up, start treatment']]:d===1?[['d1','Day 1 · organ support, targets & monitoring']]:d<=3?[['d23','Days 2–3 · reassess / de-escalate / wean']]:[['d47',d<=7?'Days 4–7 · recovery, complications, follow-up':'Day 8+ · weekly reassessment']];
 P.forEach(([ph,lab])=>{const mods=p.tags.map(t=>MOD[t]).filter(Boolean).map(m=>({m,items:m.items.filter(i=>i.p===ph)})).filter(x=>x.items.length);if(mods.length)out.push({lab,mods})});
 return out}
function roundsLabel(d){return d===0?'6–24 h · first full systems round (then daily)':'Daily rounds by system'}
function allItems(p,d){let ids=[];plan(p,d).forEach(s=>s.mods.forEach(x=>x.items.forEach(i=>ids.push(i.id))));A.rounds.forEach(r=>r.items.forEach(i=>ids.push(i.id)));return ids}
function prog(p,d){const ids=allItems(p,d),c=(p.checks||{})[d]||{};const n=ids.filter(i=>c[i]).length;return{n,t:ids.length,pct:ids.length?Math.round(100*n/ids.length):0}}
function bar(pct){return `<div class="bar"><i style="width:${pct}%"></i></div>`}
function head(t,s,back){$('#htitle').textContent=t;$('#hsub').textContent=s||'Critical Care Center, CMH Dhaka';$('#back').style.visibility=back?'visible':'hidden'}
function tab(r){document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.r===r))}
function tagChips(p){return p.tags.map(t=>`<span class="chip">${esc(MOD[t]?MOD[t].title:t)}</span>`).join('')}
const fmt=s=>new Date(s).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
function patCard(p,extra=''){const d=dayOf(p),g=prog(p,d);return `<button class="card pt" data-p="${p.id}"><div class="row"><span class="bed">${esc(p.bed)}</span><div style="flex:1"><b>${esc(p.ini)}</b> · ${dayLabel(d)}<div class="mu">Admitted ${fmt(p.admit)} · ${phaseOf(d)}</div></div><b>${g.pct}%</b></div><div style="margin-top:6px">${tagChips(p)}</div>${bar(g.pct)}<div class="mu" style="margin-top:4px">${g.n}/${g.t} done today${extra}</div></button>`}
function bindPts(){V.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>go('p/'+b.dataset.p))}
const R={
today(){tab('today');head('Today',new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}));const ps=S.patients.filter(p=>!p.out);
 if(!ps.length){V.innerHTML=`<div class="card"><h2>No patients yet</h2><p class="mu">Add a patient with bed number and initials only. Data stays on this phone.</p><a class="btn w" href="#new">+ Add patient</a></div>`;return}
 V.innerHTML=`<h2>Outstanding items</h2>`+ps.map(p=>{const d=dayOf(p),c=(p.checks||{})[d]||{};let first=[];plan(p,d).forEach(s=>s.mods.forEach(x=>x.items.forEach(i=>{if(!c[i.id]&&first.length<3)first.push(i.t)})));A.rounds.forEach(r=>r.items.forEach(i=>{if(!c[i.id]&&first.length<3)first.push(i.t)}));return patCard(p,first.length?'<ul style="margin:6px 0 0;padding-left:18px">'+first.map(t=>`<li>${t}</li>`).join('')+'</ul>':' · all done ✓')}).join('');bindPts()},
patients(){tab('patients');head('Patients','Stored on this device only');const act=S.patients.filter(p=>!p.out),old=S.patients.filter(p=>p.out);
 V.innerHTML=`<a class="btn w" href="#new" style="margin-bottom:12px">+ Add patient</a>`+act.map(p=>patCard(p)).join('')+(old.length?`<h2>Discharged</h2>`+old.map(p=>patCard(p)).join(''):'');bindPts()},
new(id){tab('patients');const p=S.patients.find(x=>x.id===id)||{bed:'',ini:'',admit:'',tags:[]};head(id?'Edit patient':'New patient','No names – bed & initials only',1);
 const now=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
 const groups={};A.modules.forEach(m=>(groups[m.group]=groups[m.group]||[]).push(m));
 V.innerHTML=`<div class="card"><label class="f">Bed no.</label><input id="bed" value="${esc(p.bed)}" inputmode="text" placeholder="e.g. 7"><label class="f">Initials</label><input id="ini" maxlength="5" value="${esc(p.ini)}" placeholder="e.g. MR" autocapitalize="characters"><label class="f">ICU admission date & time</label><input id="adm" type="datetime-local" value="${p.admit?p.admit.slice(0,16):now}"></div><h2>Diagnosis / problem modules</h2><input id="tq" placeholder="Filter problems…" style="margin-bottom:10px">`+Object.entries(groups).map(([g,ms])=>`<details open class="tg"><summary>${esc(g)}</summary>${ms.map(m=>`<label class="it"><input type="checkbox" value="${m.id}" ${p.tags.includes(m.id)?'checked':''}><span class="tx">${esc(m.title)}</span></label>`).join('')}</details>`).join('')+`<button class="btn w" id="sv">Save</button>${id?`<div class="row" style="margin-top:12px"><button class="btn ghost" id="dc" style="flex:1">${p.out?'Re-admit':'Mark discharged'}</button><button class="btn danger" id="del" style="flex:1">Delete</button></div>`:''}`;
 $('#tq').oninput=e=>{const q=e.target.value.toLowerCase();V.querySelectorAll('.tg label').forEach(l=>l.style.display=l.textContent.toLowerCase().includes(q)?'':'none')};
 $('#sv').onclick=()=>{const bed=$('#bed').value.trim(),ini=$('#ini').value.trim().toUpperCase(),adm=$('#adm').value;if(!bed||!ini||!adm)return toast('Bed, initials and admission time needed');
  const tags=[...V.querySelectorAll('.tg input:checked')].map(i=>i.value);
  if(id)Object.assign(p,{bed,ini,admit:adm,tags});else S.patients.push({id:Date.now().toString(36),bed,ini,admit:adm,tags,checks:{},notes:{}});save();go('p/'+(id||S.patients[S.patients.length-1].id))};
 if(id){$('#del').onclick=()=>{if(confirm('Delete bed '+p.bed+' ('+p.ini+') and all checklists?')){S.patients=S.patients.filter(x=>x!==p);save();go('patients')}};$('#dc').onclick=()=>{p.out=!p.out;save();go('patients')}}},
p(id,dd){tab('patients');const p=S.patients.find(x=>x.id===id);if(!p)return go('patients');const cur=dayOf(p);const d=dd===undefined||dd===''?cur:+dd;
 head('Bed '+p.bed+' · '+p.ini,dayLabel(cur)+' today · admitted '+fmt(p.admit),1);
 const max=Math.max(cur,3);let days='';for(let i=0;i<=max;i++)days+=`<button data-d="${i}" class="${i===d?'on':''} ${i===cur?'cur':''}">${i===0?'Day 0':'Day '+i}</button>`;
 p.checks=p.checks||{};p.notes=p.notes||{};const c=p.checks[d]=p.checks[d]||{};
 const item=(i,src,topic)=>`<label class="it ${c[i.id]?'done':''}"><input type="checkbox" data-i="${i.id}" ${c[i.id]?'checked':''}><span class="tx">${i.t}<br><a class="src" href="#ref/${topic}">${esc(src)}</a></span></label>`;
 let h=`<div class="days">${days}</div><div class="card"><div class="row"><div style="flex:1"><b>${phaseOf(d)}</b><div class="mu">${tagChips(p)||'No problem modules – add diagnosis tags'}</div></div><a class="btn ghost" href="#new/${p.id}">Edit</a></div><div id="pg"></div></div>`;
 plan(p,d).forEach(s=>{h+=`<div class="ph">${s.lab}</div>`;s.mods.forEach(x=>{const n=x.items.filter(i=>c[i.id]).length;let last='';h+=`<details ${d===cur?'open':''}><summary>${esc(x.m.title)}<span class="cnt">${n}/${x.items.length}</span></summary>`+x.items.map(i=>{let s2=i.sec!==last?`<div class="sech">${esc(i.sec)}</div>`:'';last=i.sec;return s2+item(i,'ACE · '+x.m.title,x.m.id)}).join('')+`</details>`})});
 h+=`<div class="ph">${roundsLabel(d)}</div>`+A.rounds.map(r=>{const n=r.items.filter(i=>c[i.id]).length;let last='';return `<details><summary>${esc(r.name)}<span class="cnt">${n}/${r.items.length}</span></summary>`+r.items.map(i=>{let s2=i.sec!==last?`<div class="sech">${esc(i.sec)}</div>`:'';last=i.sec;return s2+item(i,'ACE · '+i.src,i.topic)}).join('')+`</details>`}).join('');
 h+=`<div class="ph">Notes – ${dayLabel(d)}</div><textarea id="nt" placeholder="Plan, results, family discussion…">${esc(p.notes[d]||'')}</textarea>`;
 V.innerHTML=h;const upd=()=>{const g=prog(p,d);$('#pg').innerHTML=bar(g.pct)+`<div class="mu" style="margin-top:4px">${g.n}/${g.t} items done (${g.pct}%)</div>`};upd();
 V.querySelectorAll('.days button').forEach(b=>b.onclick=()=>{history.replaceState(null,'','#p/'+id+'/'+b.dataset.d);R.p(id,b.dataset.d)});
 const cb=V.querySelector('.days .on');cb&&cb.scrollIntoView({inline:'center',block:'nearest'});
 V.querySelectorAll('[data-i]').forEach(x=>x.onchange=()=>{if(x.checked)c[x.dataset.i]=1;else delete c[x.dataset.i];x.closest('.it').classList.toggle('done',x.checked);save();upd();const det=x.closest('details');const all=det.querySelectorAll('[data-i]');det.querySelector('.cnt').textContent=[...all].filter(y=>y.checked).length+'/'+all.length});
 $('#nt').oninput=e=>{p.notes[d]=e.target.value;save()}},
ref(id){tab('ref');if(id){const t=TOP[id];if(!t)return go('ref');head(t.title,t.group,1);
  V.innerHTML=`<div class="card">${t.slogan?`<div class="slogan">${esc(t.slogan)}</div>`:''}`+t.secs.map(s=>`<div class="refsec"><h4>${s.n?s.n+'. ':''}${esc(s.h)}</h4><div class="tw">${s.html}</div></div>`).join('')+`${t.legend?`<p class="mu">${esc(t.legend)}</p>`:''}<p class="mu">Source: ${esc(t.ref)}</p></div>`;return}
 head('Reference cards','52 ACE quick-reference topics');const q0=sessionStorage.q||'';
 V.innerHTML=`<input id="q" type="search" placeholder="Search thresholds, drugs, targets…" value="${esc(q0)}" style="margin-bottom:12px"><div id="res"></div>`;
 const run=q=>{sessionStorage.q=q;q=q.toLowerCase().trim();let h='';
  if(!q){const g={};A.topics.forEach(t=>(g[t.group]=g[t.group]||[]).push(t));h=Object.entries(g).map(([k,ts])=>`<details open><summary>${esc(k)}<span class="cnt">${ts.length}</span></summary>${ts.map(t=>`<a class="it" style="color:inherit;text-decoration:none" href="#ref/${t.id}"><span class="tx">${esc(t.title)}</span>›</a>`).join('')}</details>`).join('')}
  else{A.topics.forEach(t=>{const hits=t.secs.filter(s=>(s.h+' '+strip(s.html)).toLowerCase().includes(q));if(hits.length||t.title.toLowerCase().includes(q))h+=`<a class="card pt" style="display:block;text-decoration:none" href="#ref/${t.id}"><b>${esc(t.title)}</b>${hits.slice(0,3).map(s=>{const tx=strip(s.html),i=tx.toLowerCase().indexOf(q);return `<div class="mu" style="margin-top:4px"><b>${esc(s.h)}</b>${i>=0?': …'+esc(tx.slice(Math.max(0,i-50),i+90))+'…':''}</div>`}).join('')}</a>`});h=h||'<p class="mu">No matches.</p>'}
  $('#res').innerHTML=h};$('#q').oninput=e=>run(e.target.value);run(q0)},
settings(){tab('settings');head('Backup & info','Data never leaves this phone unless you export');
 V.innerHTML=`<div class="card"><h3>Backup</h3><p class="mu">Export all patients and checklists to a JSON file (save to Files / Drive). Import restores it on this or another phone.</p><div class="row"><button class="btn" id="ex" style="flex:1">Export</button><label class="btn ghost" style="flex:1">Import<input id="im" type="file" accept=".json,application/json" hidden></label></div></div>
 <div class="card"><h3>About</h3><p>Day-by-day ICU checklist for an individual intensivist. Every item is taken from the ESICM Academy ACE eModule quick-reference cards and carries its ACE source tag. Where ACE gives no dose, cards say <b>“dose per CMH formulary”</b>. Items flagged <span class="flag">per ACE – verify</span> must be checked against the formulary.</p><p class="mu">${A.modules.length} problem modules · ${A.modules.reduce((a,m)=>a+m.items.length,0)} module items · ${A.rounds.reduce((a,r)=>a+r.items.length,0)} daily-round items.</p><button class="btn ghost w" id="wipe">Erase all data on this phone</button></div>`;
 $('#ex').onclick=()=>{const b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='icu-day-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
 $('#im').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{const o=JSON.parse(t);if(!Array.isArray(o.patients))throw 0;if(confirm('Replace current data with backup ('+o.patients.length+' patients)?')){S=o;save();toast('Imported');go('patients')}}).catch(()=>toast('Not a valid backup file'))};
 $('#wipe').onclick=()=>{if(confirm('Erase ALL patients?')){S={patients:[],dark:S.dark};save();toast('Erased')}}}
};
function route(){const [r,a,b]=(location.hash.slice(1)||'today').split('/');window.scrollTo(0,0);(R[r]||R.today)(a,b)}
window.onhashchange=route;route();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').then(()=>window.SW_OK=1).catch(e=>console.log(e));
})();
