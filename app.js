(function(){'use strict';
const P=window.PLAN,K='icuday.v2',$=s=>document.querySelector(s),V=$('#view'),BAR=$('#bar');
const TOP={};P.topics.forEach((t,i)=>{t.ord=i;TOP[t.id]=t});
(window.ESICM||[]).forEach(([tp,s,ph,pr,t,src],n)=>{(P.plan[tp]=P.plan[tp]||[]).push({i:'es'+n,t,ph,pr,tp,s,src})});
const ITEM={};Object.values(P.plan).forEach(l=>l.forEach(a=>ITEM[a.i]=a));const U2=window.UI2;
let S;try{S=JSON.parse(localStorage.getItem(K))||{}}catch(e){S={}}S.patients=S.patients||[];
// migrate v1
try{const o=JSON.parse(localStorage.getItem('icuday.v1')||'null');if(o&&o.patients&&!S.migrated){o.patients.forEach(p=>S.patients.push({id:p.id,bed:p.bed,ini:p.ini,admit:p.admit,pres:[],flags:{},extra:p.tags||[],done:{}}));S.migrated=1;if(o.dark)S.dark=1}}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){toast('Storage full')}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plain=h=>h.replace(/<[^>]+>/g,'');
if(S.dark)document.documentElement.classList.add('dark');
$('#theme').onclick=()=>{S.dark=!S.dark;document.documentElement.classList.toggle('dark',S.dark);save()};
$('#back').onclick=()=>{const h=location.hash;if(/^#(step|day)\//.test(h))go('p/'+h.split('/')[1]);else if(/^#tools\/[^/]+\/./.test(h))history.back();else if(/^#tools\//.test(h))go('tools');else go('today')};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>go(b.dataset.r));
const go=h=>{if(location.hash==='#'+h)route();else location.hash=h};
function toast(m){document.querySelectorAll('.toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function buzz(){try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}}
function head(t,s,back){$('#htitle').textContent=t;$('#hsub').textContent=s||'Critical Care Center, CMH Dhaka';$('#back').style.visibility=back?'visible':'hidden'}
function tab(r){document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.r===r))}
function bar(html){BAR.innerHTML=html||'';document.body.classList.toggle('hasbar',!!html)}
const PRES={};P.pres.forEach(x=>PRES[x[0]]=x);const FLAGS={};P.flags.forEach(x=>FLAGS[x[0]]=x);
const PH={h1:'0–1 h · immediate',h6:'1–6 h · confirm & start treatment',h24:'6–24 h · organ support & prevention',dy:'Daily review',d23:'Days 2–3 · reassess & de-escalate',wn:'Wean / stop criteria',d47:'Days 4–7 · recovery & complications'};
const PRN={A:'Life-threat · resuscitate now',B:'Time-critical treatment',C:'Diagnosis & work-up',D:'Organ support & targets',E:'Prevention & care'};
const CAP={h1:16,h6:14,h24:14,dy:22,d23:8,wn:8,d47:8,esc:14,no:12};
// ---------- plan engine ----------
function topicsOf(p){const s=[];const add=a=>a.forEach(t=>{if(TOP[t]&&!s.includes(t))s.push(t)});(p.pres||[]).forEach(k=>PRES[k]&&add(PRES[k][2]));(p.extra||[]).forEach(t=>add([t]));Object.keys(p.flags||{}).forEach(k=>p.flags[k]&&FLAGS[k]&&add(FLAGS[k][2]));if(p.age==='old')add(['16c-epicc-perioperative-care']);return s}
const cache={};
function build(p){const tps=topicsOf(p),sig=tps.join(',')+'|'+p.age;if(cache[p.id]&&cache[p.id].sig===sig)return cache[p.id];
 const by={};const seenK={},seenT={};
 const push=(ph,a,rank,core)=>{const pt=plain(a.t).toLowerCase().replace(/\W+/g,' ').trim();
  if(seenT[pt]){return}
  if(a.k&&ph!=='no'&&ph!=='esc'){const prev=seenK[a.k];if(prev){if(!prev.also.includes(a.tp))prev.also.push(a.tp);return}}
  const o=Object.assign({},a,{ph,rank,core,also:[]});seenT[pt]=1;if(a.k&&ph!=='no'&&ph!=='esc')seenK[a.k]=o;(by[ph]=by[ph]||[]).push(o)};
 // collect topic actions, sorted priority then interleaved rank
 const all=[];tps.forEach((t,ti)=>{const cnt={};(P.plan[t]||[]).forEach(a=>{const r=cnt[a.ph]=(cnt[a.ph]||0)+1;all.push({a,ti,r})})});
 const po=x=>'ABCDE'.indexOf(x.a.pr||'E');
 all.sort((x,y)=>po(x)-po(y)||x.ti-y.ti||x.r-y.r);
 all.forEach(x=>push(x.a.ph,x.a,x.r,0));
 // core items for every patient
 Object.entries(P.core).forEach(([ph,list])=>list.forEach(([t,si,n])=>{(P.plan[t]||[]).filter(a=>a.s===si).slice(0,n).forEach(a=>push(ph,Object.assign({},a,{pr:'E'}),99,1))}));
 const out={sig,tps,ph:{},more:{}};
 Object.keys(by).forEach(ph=>{let l=by[ph];if(ph==='dy'){const c=l.filter(a=>a.core),o=l.filter(a=>!a.core);l=o.slice(0,CAP.dy-Math.min(c.length,10)).concat(c)}
  const cap=CAP[ph]||12;out.ph[ph]=l.slice(0,cap);out.more[ph]=l.slice(cap);
  out.ph[ph].sort((x,y)=>'ABCDE'.indexOf(x.pr||'E')-'ABCDE'.indexOf(y.pr||'E'))});
 cache[p.id]=out;return out}
const hrs=p=>(Date.now()-new Date(p.admit).getTime())/36e5;
const dayOf=p=>Math.max(0,Math.floor(hrs(p)/24));
function dayPhases(d){return d===0?['h1','h6','h24']:d===1?['dy']:d<=3?['d23','wn','dy']:['wn','d47','dy']}
function dayName(d){return d===0?'Day 0':d<=3?'Day '+d:d<=7?'Day '+d:'Day '+d}
function itemsFor(p,d,ph){const b=build(p);const l=(b.ph[ph]||[]).slice();if(ph==='dy'&&d>=8)return l.filter(a=>a.pr!=='E'||a.core);return l}
function st(p,d,id){return ((p.done||{})[d]||{})[id]}
function setSt(p,d,id,v){if(ITEM[id])U2.record(p,d,ITEM[id],v);p.done=p.done||{};p.done[d]=p.done[d]||{};if(v)p.done[d][id]=v;else delete p.done[d][id];save()}
function dayList(p,d){const r=[];dayPhases(d).forEach(ph=>itemsFor(p,d,ph).forEach(a=>r.push(Object.assign({phx:ph},a))));return r}
const pending=(p,d,a)=>{const s=st(p,d,a.i);return !s||s==='s'};
function phaseDue(d,ph,h){if(d!==0)return 24*(d+1);return ph==='h1'?1:ph==='h6'?6:24}
function nowInfo(p){const d=dayOf(p),h=hrs(p);const L=dayList(p,d);const pend=L.filter(a=>pending(p,d,a));
 pend.sort((x,y)=>(st(p,d,x.i)==='s')-(st(p,d,y.i)==='s'));
 const first=pend[0];const od=d===0&&first&&h>phaseDue(0,first.phx);return{d,first,od,n:L.length,left:pend.length,doneN:L.length-pend.length}}
// ---------- formatting ----------
function doses(h,w){if(!w)return h;return h.replace(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(mg|mcg|µg|g|mL|ml|U|units|mmol|ng|mU)\s*\/\s*kg(?!\s*PBW)(\s*\/\s*(?:min|h|hr|day|d))?/g,(m,a,b,u,per)=>{const f=x=>{const v=parseFloat(x)*w;return v>=100?Math.round(v):v>=10?Math.round(v*10)/10:Math.round(v*100)/100};return m+` <span class="dose">≈ ${f(a)}${b?'–'+f(b):''} ${u}${per?per.replace(/\s/g,''):''} for ${w} kg</span>`})}
function txt(p,a){let h=a.t;if(/dose per CMH formulary/i.test(h)===false&&/\b(dose|bolus|infusion)\b/i.test(plain(h))&&!/\d/.test(plain(h)))h+=' <i class="mut">(dose per CMH formulary)</i>';return doses(h,p&&p.w)}
function srcOf(a){const t=TOP[a.tp];if(a.src)return `<b>${esc(a.src)}</b> <span class="mut">(shown under ${esc(t.title)})</span>`;return `ACE: ${esc(t.title)} › ${esc(t.secs[a.s])}`+(a.also&&a.also.length?` <br>Also in: ${a.also.map(x=>esc(TOP[x].title)).join(', ')}`:'')}
const fmt=s=>new Date(s).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
function pLabel(p){return `Bed ${esc(p.bed)}${p.ini?' · '+esc(p.ini.toUpperCase()):''}`}
// ---------- views ----------
function today(){head('Today','Critical Care Center, CMH Dhaka',0);tab('today');bar('');
 if(!S.patients.length){V.innerHTML=`<div class="empty"><div style="font-size:48px">🛏</div><h2>No patients yet</h2><p>Add a new admission and the app will guide you step by step through the ACE protocols for that patient.</p></div><button class="btn p full tap" onclick="location.hash='new'">＋ New admission</button>`+foot();return}
 const rows=S.patients.map(p=>{const n=nowInfo(p);const pct=n.n?Math.round(100*n.doneN/n.n):0;return{p,n,pct}}).sort((a,b)=>(b.n.od-a.n.od)||(b.n.left-a.n.left));
 V.innerHTML=U2.notifCard()+`<h3>${S.patients.length} patient${S.patients.length>1?'s':''} · highest-priority next action</h3>`+rows.map(({p,n,pct})=>`<button class="card pt tap" data-p="${p.id}"><div class="top"><span class="bed">${pLabel(p)}</span>${n.od?'<span class="badge od">OVERDUE</span>':n.left?`<span class="badge">${n.left} to do</span>`:'<span class="badge ok">Day done</span>'}</div>
 <div class="mut">${dayName(n.d)} · admitted ${fmt(p.admit)} · ${topicsOf(p).slice(0,3).map(t=>esc(TOP[t].title)).join(', ')}</div>
 ${n.first?`<div class="next"><span class="pr pr${n.first.pr||'E'}">${n.first.pr||'E'}</span>${txt(p,n.first)}</div>`:'<div class="next">All of today\'s actions are done. Check the escalation alerts.</div>'}
 ${U2.todayTimers(p)}<div class="prog"><i style="width:${pct}%"></i></div></button>`).join('')+`<button class="btn p full tap" onclick="location.hash='new'">＋ New admission</button>`+foot();
 V.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>go('p/'+b.dataset.p));U2.bindNotif()}
function foot(){return `<div class="foot">Critical Care Center, CMH Dhaka · based on ESICM Academy ACE modules · decision support only, not a substitute for clinical judgement · data stays on this device · v${esc(P.v)}</div>`}
// intake wizard
let W=null;
function wizard(){tab('new');head('New admission','Step-by-step setup',1);
 if(!W)W={step:0,p:{id:'p'+Date.now().toString(36),bed:'',ini:'',age:'adult',w:'',admit:new Date().toISOString(),pres:[],flags:{},extra:[],done:{}},ago:0};
 const p=W.p,s=W.step;const dots=`<div class="steps">${[0,1,2,3,4].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('')}</div>`;let h='';
 if(s===0)h=`<h2>Who and where?</h2><div class="row"><div><label class="l">Bed number *</label><input id="bed" inputmode="numeric" value="${esc(p.bed)}" autocomplete="off"></div><div><label class="l">Initials only</label><input id="ini" maxlength="4" value="${esc(p.ini)}" autocomplete="off" autocapitalize="characters"></div></div>
 <label class="l">Age group</label><div class="seg" id="age">${[['adult','Adult'],['old','Very old (> 85 y)']].map(([k,l])=>`<button class="pill ${p.age===k?'on':''}" data-k="${k}">${l}</button>`).join('')}</div>
 <label class="l">Weight in kg (optional, used to work out per-kg doses that ACE gives)</label><input id="wt" type="number" inputmode="decimal" value="${esc(p.w)}" placeholder="e.g. 70"><p class="mut">No names. Bed and initials only; all data stays on this phone.</p>`;
 if(s===1)h=`<h2>When was the admission?</h2><div class="seg" id="ago">${[[0,'Just now'],[1,'1 h ago'],[3,'3 h ago'],[6,'6 h ago'],[12,'12 h ago'],[24,'Yesterday']].map(([k,l])=>`<button class="pill ${W.ago===k?'on':''}" data-k="${k}">${l}</button>`).join('')}</div><label class="l">Or exact time</label><input id="adm" type="datetime-local" value="${localIso(p.admit)}">`;
 if(s===2)h=`<h2>What brings the patient in?</h2><p class="mut">Tap all that apply.</p><div class="seg" id="pres">${P.pres.map(x=>`<button class="pill ${p.pres.includes(x[0])?'on':''}" data-k="${x[0]}">${esc(x[1])}</button>`).join('')}</div>
 <details ${p.extra.length?'open':''}><summary>＋ Other ACE topics (${p.extra.length} chosen)</summary>${groups().map(([g,ts])=>`<div class="grp">${esc(g)}</div><div class="seg">${ts.map(t=>`<button class="pill ex ${p.extra.includes(t.id)?'on':''}" data-t="${t.id}">${esc(t.title)}</button>`).join('')}</div>`).join('')}</details>`;
 if(s===3){const auto=autoFlags(p);h=`<h2>Quick questions</h2><p class="mut">Each "yes" adds the matching ACE protocol to the plan.</p><div class="card">${P.flags.map(([k,l])=>{const v=k in p.flags?p.flags[k]:auto[k];return `<div class="flag"><span>${esc(l)}</span><span class="yn" data-k="${k}"><button class="y ${v===true?'on':''}">Yes</button><button class="n ${v===false?'on':''}">No</button></span></div>`}).join('')}</div>`}
 if(s===4){const b=build(p);const n0=['h1','h6','h24'].reduce((a,k)=>a+(b.ph[k]||[]).length,0);h=`<h2>Ready</h2><div class="card"><div class="bed">${pLabel(p)}</div><div class="mut">Admitted ${fmt(p.admit)}${p.w?' · '+esc(p.w)+' kg':''}</div><div style="margin-top:8px">${b.tps.map(t=>`<span class="chip">${esc(TOP[t].title)}</span>`).join('')||'<span class="mut">No diagnosis chosen: you will get the general admission and daily plan.</span>'}</div></div>
 <div class="card"><b>Day 0 plan: ${n0} actions</b><div class="mut">0–1 h: ${(b.ph.h1||[]).length} · 1–6 h: ${(b.ph.h6||[]).length} · 6–24 h: ${(b.ph.h24||[]).length}<br>Daily review from Day 1: ${(b.ph.dy||[]).length} · If-then alerts: ${(b.ph.esc||[]).length}</div></div>`}
 V.innerHTML=dots+h;
 bar(`${s?'<button class="btn g tap" id="wb">Back</button>':''}<button class="btn p tap" id="wn">${s===4?'Start guided plan ▶':s===3?'Review':'Next'}</button>`);
 const sel=(id,fn)=>V.querySelectorAll(id+' .pill').forEach(b=>b.onclick=()=>{buzz();fn(b);});
 if(s===0){sel('#age',b=>{p.age=b.dataset.k;V.querySelectorAll('#age .pill').forEach(x=>x.classList.toggle('on',x===b))})}
 if(s===1){sel('#ago',b=>{W.ago=+b.dataset.k;p.admit=new Date(Date.now()-W.ago*36e5).toISOString();$('#adm').value=localIso(p.admit);V.querySelectorAll('#ago .pill').forEach(x=>x.classList.toggle('on',x===b))});$('#adm').onchange=e=>{if(e.target.value){p.admit=new Date(e.target.value).toISOString();W.ago=-1;V.querySelectorAll('#ago .pill').forEach(x=>x.classList.remove('on'))}}}
 if(s===2){sel('#pres',b=>{const k=b.dataset.k;tog(p.pres,k);b.classList.toggle('on')});V.querySelectorAll('.ex').forEach(b=>b.onclick=()=>{buzz();tog(p.extra,b.dataset.t);b.classList.toggle('on');V.querySelector('summary').textContent=`＋ Other ACE topics (${p.extra.length} chosen)`})}
 if(s===3)V.querySelectorAll('.yn').forEach(y=>y.querySelectorAll('button').forEach(b=>b.onclick=()=>{buzz();const v=b.classList.contains('y');p.flags[y.dataset.k]=v;y.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))}));
 const grab=()=>{if(s===0){p.bed=$('#bed').value.trim();p.ini=$('#ini').value.trim().slice(0,4);p.w=parseFloat($('#wt').value)||''}};
 if($('#wb'))$('#wb').onclick=()=>{grab();W.step--;wizard();scrollTo(0,0)};
 $('#wn').onclick=()=>{grab();if(s===0&&!p.bed){toast('Enter a bed number');$('#bed').focus();return}
  if(s===3){const a=autoFlags(p);P.flags.forEach(([k])=>{if(!(k in p.flags)&&a[k])p.flags[k]=true})}
  if(s<4){W.step++;wizard();scrollTo(0,0);return}
  S.patients.push(p);save();const id=p.id;W=null;go('step/'+id)}}
function autoFlags(p){const a={};const tp=topicsOf(Object.assign({},p,{flags:{}}));P.flags.forEach(([k,l,ts])=>{if(ts.every(t=>tp.includes(t)))a[k]=true});return a}
function tog(arr,k){const i=arr.indexOf(k);i<0?arr.push(k):arr.splice(i,1)}
function localIso(s){const d=new Date(s);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}
function groups(){const g={};P.topics.forEach(t=>(g[t.group]=g[t.group]||[]).push(t));return Object.entries(g)}
const getP=id=>S.patients.find(x=>x.id===id);
// guided stepper
function stepper(id){const p=getP(id);if(!p)return go('today');tab('');const d=dayOf(p);head(pLabel(p),'Guided steps · '+dayName(d),1);
 const L=dayList(p,d);const pend=L.filter(a=>pending(p,d,a)).sort((x,y)=>(st(p,d,x.i)==='s')-(st(p,d,y.i)==='s'));
 if(!pend.length){V.innerHTML=`<div class="empty pop"><div style="font-size:56px">✅</div><h2>${dayName(d)} actions done</h2><p>Keep watching the if-then alerts. Tomorrow's plan appears automatically.</p></div>`+alerts(p,4);bar(`<button class="btn p tap" id="ov">Patient overview</button>`);$('#ov').onclick=()=>go('p/'+id);return}
 const a=pend[0],ph=a.phx,inPh=L.filter(x=>x.phx===ph),k=inPh.filter(x=>!pending(p,d,x)).length;
 const why=(P.why[a.tp+':'+a.s]||[]);
 V.innerHTML=` <div class="mut" style="margin-bottom:6px">${L.length-pend.length} of ${L.length} done today · ${pend.length} left</div><div class="prog" style="margin-bottom:12px"><i style="width:${Math.round(100*(L.length-pend.length)/L.length)}%"></i></div>
 <div class="card step" id="stp"><div class="ph">${d===0?PH[ph]:dayName(d)+' · '+PH[ph]} · ${k+1} of ${inPh.length}${d===0&&hrs(p)>phaseDue(0,ph)?' · <span style="color:var(--bad)">OVERDUE</span>':''}</div>
 ${U2.chip(p,d,a)}<div class="act"><span class="pr pr${a.pr||'E'}">${a.pr||'E'}</span>${txt(p,a)}</div><div class="sec">${esc(PRN[a.pr||'E'])}${a.src?' · <span class="esb">ESICM</span>':''}</div>${U2.shortcuts(a,p)}
 ${a.det&&a.det.length?`<div class="card" style="margin:6px 0 0;padding:8px 12px">${a.det.map(x=>`<div class="dt">• ${doses(x,p.w)}</div>`).join('')}</div>`:''}<details><summary>Why · details · ACE source</summary><div class="src">${srcOf(a)}</div>${why.map(w=>`<div class="alert" style="border-left-color:var(--acc)">${w}</div>`).join('')}${sib(p,a).map(x=>`<div class="mut" style="margin-top:6px">• ${x}</div>`).join('')}<button class="btn g full tap" id="card">Open full protocol card</button></details>${window.BOOK.stepHtml(a.tp)}
 ${st(p,d,a.i)==='s'?'<div class="mut" style="margin-top:8px">Skipped earlier</div>':''}</div>`+alerts(p,2,true);
 bar(`<button class="btn g tap" id="sk">Skip</button><button class="btn tap" id="na">N/A</button><button class="btn ok tap" id="dn" style="flex:1.6">✓ Done</button>`);
 const adv=v=>{buzz();setSt(p,d,a.i,v);const c=$('#stp');c.classList.add('out');setTimeout(()=>stepper(id),160)};
 $('#dn').onclick=()=>adv('d');$('#na').onclick=()=>adv('na');$('#sk').onclick=()=>adv('s');
 $('#card').onclick=()=>go('ref/'+a.tp+'/'+a.s);
 let x0=null;const c=$('#stp');c.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});c.addEventListener('touchmove',e=>{if(x0==null)return;const dx=e.touches[0].clientX-x0;if(dx<0)c.style.transform=`translateX(${dx/3}px)`},{passive:true});c.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x0;x0=null;c.style.transform='';if(dx<-90)adv('d')})}
function sib(p,a){return []}
function alerts(p,n,compact){const b=build(p);const l=(b.ph.esc||[]);if(!l.length)return'';return `<h3>If → then alerts</h3>`+l.slice(0,n).map(a=>`<div class="alert">${a.src?'<span class="esb">ESICM</span> ':`<b>${esc(TOP[a.tp].secs[a.s])}:</b> `}${txt(p,a)}${a.src?`<div class="src">${esc(a.src)}</div>`:''}</div>`).join('')+(l.length>n?`<button class="more" onclick="location.hash='p/${p.id}/esc'">All ${l.length} alerts ›</button>`:'')}
// patient overview
function overview(id,sub){const p=getP(id);if(!p)return go('today');tab('');const d=dayOf(p),b=build(p);head(pLabel(p),dayName(d)+' · admitted '+fmt(p.admit),1);
 const mode=sub||S.mode||'now';const n=nowInfo(p);
 let h=`<div class="card"><div>${b.tps.map(t=>`<span class="chip">${esc(TOP[t].title)}</span>`).join('')||'<span class="mut">General plan</span>'}</div><div class="mut" style="margin-top:6px">${p.w?esc(p.w)+' kg · ':''}${n.doneN}/${n.n} done today${n.od?' · <b style="color:var(--bad)">overdue items</b>':''}</div></div>`;
 h+=`<div class="nnl">${[['now','Now'],['next','Next'],['later','Later'],['esc','Alerts'],['days','Days']].map(([k,l])=>`<button class="${mode===k?'on':''}" data-m="${k}">${l}</button>`).join('')}</div><div id="sub"></div>`+window.BOOK.sugHtml(p,b.tps)+U2.timeline(p);
 V.innerHTML=h+`<div class="row" style="margin-top:8px"><button class="btn g tap" id="edit">Edit diagnoses</button><button class="btn g tap" id="del">Discharge</button></div>`+foot();
 bar(n.left?`<button class="btn p tap" id="gs">▶ Guide me: next step (${n.left} left)</button>`:`<button class="btn p tap" id="gs">Today done ✓ · review</button>`);
 $('#gs').onclick=()=>go('step/'+id);$('#edit').onclick=()=>{W={step:2,p:p,ago:-1,edit:1};S.patients=S.patients.filter(x=>x!==p);delete cache[p.id];go('new')};
 $('#del').onclick=()=>{if(confirm('Remove this patient from the phone?')){S.patients=S.patients.filter(x=>x!==p);save();go('today')}};
 V.querySelectorAll('.nnl button').forEach(x=>x.onclick=()=>{S.mode=x.dataset.m;save();V.querySelectorAll('.nnl button').forEach(y=>y.classList.toggle('on',y===x));subv(p,x.dataset.m)});
 subv(p,mode)}
function rowsHtml(p,d,list){return list.map(a=>{const s=st(p,d,a.i);return `<button class="it ${s==='d'?'d':s==='na'?'na':''}" data-i="${a.i}" data-d="${d}"><span class="bx">${s==='d'?'✓':s==='na'?'–':''}</span><span class="tx"><span class="pr pr${a.pr||'E'}">${a.pr||'E'}</span>${a.src?'<span class="esb">ESICM</span> ':''}${txt(p,a)}${U2.chip(p,d,a)}${a.det&&a.det.length?`<span class="dl">${a.det.map(x=>'• '+doses(x,p.w)).join('<br>')}</span>`:''}</span></button>`}).join('')}
function bindRows(p,el){el.querySelectorAll('.it').forEach(r=>r.onclick=(e)=>{if(r.querySelector('.dl')&&!e.target.closest('.bx')){r.classList.toggle('open');return}buzz();const d=+r.dataset.d,i=r.dataset.i,s=st(p,d,i);const v=!s||s==='s'?'d':s==='d'?'na':null;setSt(p,d,i,v);r.className='it '+(v==='d'?'d':v==='na'?'na':'');r.querySelector('.bx').textContent=v==='d'?'✓':v==='na'?'–':''})}
function subv(p,m){const el=$('#sub'),d=dayOf(p),b=build(p),h=hrs(p);let o='';
 const blk=(t,d,l,note)=>l.length?`<div class="card"><b>${t}</b>${note?`<div class="mut">${note}</div>`:''}${rowsHtml(p,d,l)}</div>`:'';
 if(m==='now'||m==='next'||m==='later'){const L=dayList(p,d);const phs=dayPhases(d);
  let cur=d===0?(h<1?'h1':h<6?'h6':'h24'):phs[0];
  if(m==='now'){const ov=d===0?phs.filter(x=>phaseDue(0,x)<h):[];o=ov.map(x=>blk('Overdue · '+PH[x],d,L.filter(a=>a.phx===x&&pending(p,d,a)))).join('')+(d===0?blk('Now · '+PH[cur],d,L.filter(a=>a.phx===cur)):phs.map(x=>blk(PH[x],d,L.filter(a=>a.phx===x))).join(''));if(!o)o='<div class="empty">Nothing pending right now.</div>'}
  if(m==='next'){if(d===0){const nx=phs[phs.indexOf(cur)+1];o=nx?blk('Next · '+PH[nx],0,L.filter(a=>a.phx===nx),`Due by ${fmt(new Date(new Date(p.admit).getTime()+phaseDue(0,nx)*36e5))}`):blk('Next · tomorrow: daily review (Day 1)',1,itemsFor(p,1,'dy'))}else{const dn=d+1;o=dayPhases(dn).map(x=>blk(dayName(dn)+' · '+PH[x],dn,itemsFor(p,dn,x).filter(a=>!(x==='dy'&&dayPhases(d).includes('dy'))))).join('')||'<div class="empty">Same daily review tomorrow, plus any new items.</div>'}}
  if(m==='later'){o=['d23','wn','d47'].map(x=>blk('Later · '+PH[x],x==='d23'?2:4,b.ph[x]||[])).join('')+((b.ph.no||[]).length?`<div class="card"><b>Do not (ACE)</b>${b.ph.no.map(a=>`<div class="alert avoid">${a.src?'<span class="esb">ESICM</span> ':''}${txt(p,a)}${a.src?`<div class="src">${esc(a.src)}</div>`:''}</div>`).join('')}</div>`:'')}
 }
 if(m==='esc')o=`<div class="card"><b>If → then (escalation triggers from ACE)</b>${(b.ph.esc||[]).map(a=>`<div class="alert">${a.src?'<span class="esb">ESICM</span> ':`<b>${esc(TOP[a.tp].secs[a.s])}:</b> `}${txt(p,a)}${a.src?`<div class="src">${esc(a.src)}</div>`:''}</div>`).join('')||'<div class="mut">None for these diagnoses.</div>'}</div>`;
 if(m==='days'){const sel=S.dsel!=null&&S.dsel<=d+3?S.dsel:d;o=`<div class="tabs2">${Array.from({length:Math.max(d+2,5)},(_,i)=>`<button class="${i===sel?'on':''}" data-d="${i}">${dayName(i)}${i===d?' •':''}</button>`).join('')}</div>`+dayPhases(sel).map(x=>blk(PH[x],sel,itemsFor(p,sel,x))+((b.more[x]||[]).length?`<details class="card"><summary>＋ ${b.more[x].length} more ACE items · ${PH[x]}</summary>${rowsHtml(p,sel,b.more[x])}</details>`:'')).join('');}
 el.innerHTML=o;bindRows(p,el);el.querySelectorAll('.tabs2 button').forEach(x=>x.onclick=()=>{S.dsel=+x.dataset.d;subv(p,'days')})}
// reference
let refsP=null;
function loadRefs(){if(window.REFS)return Promise.resolve();if(!refsP)refsP=new Promise((r,j)=>{const s=document.createElement('script');s.src='refs.js';s.onload=r;s.onerror=j;document.head.appendChild(s)});return refsP}
function ref(id,si){tab('ref');bar('');
 if(!id){head('ACE protocols','52 topics · search',0);V.innerHTML=`<input id="q" placeholder="Search all protocols (e.g. lactate, PEEP)" autocomplete="off"><div id="res">${groups().map(([g,ts])=>`<div class="grp">${esc(g)}</div>`+ts.map(t=>`<button class="it" data-t="${t.id}"><span class="tx">${esc(t.title)}</span></button>`).join('')).join('')}</div>`+foot();
  const bind=()=>V.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>go('ref/'+b.dataset.t+(b.dataset.s?'/'+b.dataset.s:'')));bind();
  let tm;$('#q').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{const q=e.target.value.trim().toLowerCase();if(q.length<2){ref();return}loadRefs().then(()=>{const r=[];Object.entries(window.REFS).forEach(([t,x])=>x.secs.forEach((s,i)=>{const tx=plain(s.h+' '+s.html);const k=tx.toLowerCase().indexOf(q);if(k>=0&&r.length<60)r.push(`<button class="it" data-t="${t}" data-s="${i}"><span class="tx"><b>${esc(TOP[t].title)}</b> › ${esc(s.h)}<br><span class="mut">…${esc(tx.slice(Math.max(0,k-40),k+80))}…</span></span></button>`)}));$('#res').innerHTML=r.join('')||'<div class="empty">No match</div>';bind()})},180)};return}
 const t=TOP[id];head(t.title,'ACE quick reference',1);V.innerHTML='<div class="empty">Loading…</div>';
 loadRefs().then(()=>{const x=window.REFS[id];V.innerHTML=`<div class="card"><i>${esc(x.slogan)}</i><div class="src">${esc(x.ref)}</div></div>`+x.secs.map((s,i)=>`<div class="card refsec" id="s${i}"><h4>${esc(s.n)}. ${esc(s.h)}</h4>${s.html}</div>`).join('')+(x.legend?`<div class="mut">${esc(x.legend)}</div>`:'')+foot();if(si!=null){const e=$('#s'+si);e&&e.scrollIntoView();scrollBy(0,-64)}}).catch(()=>V.innerHTML='<div class="empty">Could not load the reference cards.</div>')}
function settings(){tab('settings');head('Settings','Alerts · backup · data stays on this phone',0);bar('');
 V.innerHTML=(U2.notifCard()||'<div class="card"><b>🔔 Timer alerts</b><div class="mut">Notifications are on.</div></div>')+`<div class="card"><b>Export</b><p class="mut">Saves all patients and ticks as a JSON file.</p><button class="btn p full tap" id="ex">Export backup</button></div><div class="card"><b>Import</b><p class="mut">Replaces the data on this phone.</p><input type="file" id="im" accept="application/json,.json"></div><div class="card"><b>About</b><p class="mut">Guided ICU plans from the ESICM Academy ACE modules (52 topics). Where ACE gives no dose: dose per CMH formulary. Noradrenaline maximum 3 mcg/kg/min is shown as written by ACE and flagged "verify". Version ${esc(P.v)}.</p></div>`+foot();
 U2.bindNotif();$('#ex').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:'application/json'}));a.download='icu-guide-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
 $('#im').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{const o=JSON.parse(t);if(!o.patients)throw 0;S=o;save();toast('Imported '+o.patients.length+' patients');go('today')}).catch(()=>toast('Not a valid backup'))}}
function route(){const h=location.hash.slice(1)||'today',[r,a,b]=h.split('/');
 if(r!=='new'&&W&&W.edit){S.patients.push(W.p);save();W=null}
 if(r==='new'){if(W&&W.edit&&W.step===4){}wizard()}else if(r==='step')stepper(a);else if(r==='p')overview(a,b);else if(r==='ref')ref(a,b!=null?+b:null);else if(r==='settings')settings();else if(r==='lib')window.BOOK.page(V,a,b);else if(r==='tools'){tab('tools');bar('');U2.page(V,a,b)}else today();
 if(r!=='ref'||b==null)scrollTo(0,0);U2.tick()}
// wizard save in edit mode: re-add patient
const _wiz=wizard;
window.BOOK.init({tab,bar,head,foot,toast});U2.init({S:()=>S,save,dayOf,dayList,st,pending:(p,d,a)=>pending(p,d,a),getP:id=>S.patients.find(x=>x.id===id),head,foot,go,toast,pLabel,rerender:()=>route()});
addEventListener('hashchange',route);route();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__icu={build,S:()=>S};
})();
