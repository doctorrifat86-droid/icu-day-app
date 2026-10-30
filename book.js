(function(){'use strict';
// Library: book chapters live only in this phone's IndexedDB (imported from a private pack). Public app holds titles + mapping only.
const M=window.BOOKMETA,CH={},K='icuguy.book';M.ch.forEach(([id,n,t,part,p0,p1])=>CH[id]={id,n,t,part,p0,p1});
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let B;try{B=JSON.parse(localStorage.getItem(K))||{}}catch(e){B={}}B.fav=B.fav||[];B.pos=B.pos||{};B.fs=B.fs||17;B.have=B.have||[];
const sv=()=>{try{localStorage.setItem(K,JSON.stringify(B))}catch(e){}};
let dbp=null;
function db(){if(!dbp)dbp=new Promise((res,rej)=>{const r=indexedDB.open('icuguy-book',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('ch');d.createObjectStore('tx')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbp}
const tx=(st,mode,fn)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction(st,mode);const out=fn(t);t.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)}));
const get=(st,k)=>db().then(d=>new Promise((res,rej)=>{const r=d.transaction(st).objectStore(st).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const has=id=>B.have.includes(id);
const label=c=>c.n?`Ch. ${c.n}`:'Appendix';
const ttl=c=>c.n?`Ch. ${c.n} · ${c.t}`:c.t;
function plain(h){return h.replace(/<img[^>]*>/g,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ')}
// ---------- import
async function importFiles(files,prog){let n=0,tot=0,bad=0;
 for(const f of files){let o;try{o=JSON.parse(await f.text())}catch(e){bad++;continue}
  if(!o||o.pack!=='icuguy-bookpack'||!Array.isArray(o.chapters)){bad++;continue}
  tot+=o.chapters.length;
  for(const c of o.chapters){await tx(['ch','tx'],'readwrite',t=>{t.objectStore('ch').put(c,c.id);t.objectStore('tx').put(plain(c.html+' '+(c.refs||[]).join(' ')),c.id)});
   if(!B.have.includes(c.id))B.have.push(c.id);n++;prog&&prog(n,tot,f.name)}
  sv()}
 return {n,bad}}
async function usage(){try{const e=await navigator.storage.estimate();return e.usage}catch(e){return null}}
async function wipe(){await tx(['ch','tx'],'readwrite',t=>{t.objectStore('ch').clear();t.objectStore('tx').clear()});B.have=[];B.pos={};sv()}
// ---------- suggestions
function suggest(p,tps){const sc={},why={};const add=(ids,w,r)=>(ids||[]).forEach(id=>{if(!CH[id])return;sc[id]=(sc[id]||0)+w;(why[id]=why[id]||[]).includes(r)||why[id].push(r)});
 (p.pres||[]).forEach(k=>add(M.map.pres[k],3,'dx'));Object.entries(p.flags||{}).forEach(([k,v])=>v&&add(M.map.flags[k],2,'flag'));(tps||[]).forEach((t,i)=>add(M.map.topics[t],1.5-i*0.02,'topic'));
 return Object.keys(sc).sort((a,b)=>sc[b]-sc[a]||(CH[a].n||99)-(CH[b].n||99))}
function link(id,small){const c=CH[id];const ok=has(id);return `<a class="bk ${ok?'':'off'}" href="#lib/${id}"><span class="bkn">${label(c)}</span><span>${esc(c.n?c.t:c.t)}</span>${ok?'':'<small>import pack to read</small>'}</a>`}
function sugHtml(p,tps){const l=suggest(p,tps);const ev=M.map.every.filter(x=>!l.includes(x));
 if(!l.length&&!ev.length)return'';
 return `<div class="card"><b>📘 Suggested reading · ICU Protocols</b><div class="mut">${esc(M.title)}, ${esc(M.ed)}${B.have.length?'':' · <a href="#lib">import the book pack</a> to open chapters'}</div>${l.slice(0,6).map(x=>link(x)).join('')}${l.length>6?`<details><summary>＋ ${l.length-6} more for this patient</summary>${l.slice(6).map(x=>link(x)).join('')}</details>`:''}<details><summary>For every ICU patient (${ev.length})</summary>${ev.map(x=>link(x)).join('')}</details></div>`}
function stepHtml(tp){const l=(M.map.topics[tp]||[]).slice(0,2);if(!l.length)return'';return `<div class="bks"><span class="mut">📘 Read in ICU Protocols:</span>${l.map(x=>link(x)).join('')}</div>`}
// ---------- pages
let ctx=null;
function page(V,a,b){ctx.tab('lib');ctx.bar('');if(a&&CH[a])return reader(V,a,b);return home(V)}
function home(V){ctx.head('Library',M.title,0);const n=B.have.length,tot=M.ch.length;
 const parts={};M.ch.forEach(([id])=>{const c=CH[id];(parts[c.part]=parts[c.part]||[]).push(c)});
 const last=B.last&&CH[B.last];
 V.innerHTML=`<div class="card"><b>${esc(M.title)}</b><div class="mut">${esc(M.ed)} · ${tot} chapters &amp; appendices</div>
 <div class="mut" id="bkst">${n?`${n}/${tot} chapters on this phone`:'Book pack not imported yet. Chapter titles are listed below.'}</div>
 <button class="btn ${n?'g':'p'} full tap" id="bkb" style="margin-top:8px">${n?'Import / update pack files':'Import book pack (all 3 files)'}</button><input type="file" id="bkf" multiple accept=".json,application/json" hidden>
 <div id="bkp" class="prog" style="display:none"><i style="width:0"></i></div>${n?'<button class="btn g full tap" id="bkdel" style="margin-top:6px">Delete book from this phone</button>':''}
 <p class="mut" style="font-size:12px">The pack files are private (not part of the public app). They are stored only on this phone and work offline.</p></div>
 ${n?'<input id="bq" placeholder="Search the book (e.g. prone, heparin)" autocomplete="off"><div id="bres"></div>':''}
 ${last&&has(last.id)?`<div class="card"><b>Continue reading</b>${link(last.id)}</div>`:''}
 ${B.fav.length?`<div class="card"><b>★ Bookmarks</b>${B.fav.filter(x=>CH[x]).map(x=>link(x)).join('')}</div>`:''}
 <div id="bkl">${Object.entries(parts).map(([pt,cs])=>`<div class="grp">${esc(pt)}</div>`+cs.map(c=>link(c.id)).join('')).join('')}</div>`+ctx.foot();
 const f=V.querySelector('#bkf');V.querySelector('#bkb').onclick=()=>f.click();f.onchange=async()=>{const fs=[...f.files];if(!fs.length)return;const pb=V.querySelector('#bkp');pb.style.display='block';
  try{const r=await importFiles(fs,(i,t,nm)=>{pb.firstChild.style.width=Math.round(100*i/t)+'%';V.querySelector('#bkst').textContent=`Importing ${nm}: ${i}/${t}`});
   const u=await usage();ctx.toast(`Imported ${r.n} chapters${r.bad?` · ${r.bad} file(s) not a book pack`:''}`);home(V);if(u)V.querySelector('#bkst').textContent+=` · storage used ${(u/1048576).toFixed(1)} MB`}
  catch(e){ctx.toast('Import failed: '+(e&&e.message||e))}};
 const d=V.querySelector('#bkdel');if(d)d.onclick=async()=>{if(confirm('Delete the book from this phone? You can import the pack again later.')){await wipe();home(V)}};
 usage().then(u=>{if(u&&n){const e=V.querySelector('#bkst');if(e&&!/storage/.test(e.textContent))e.textContent+=` · storage used ${(u/1048576).toFixed(1)} MB`}});
 const q=V.querySelector('#bq');if(q){let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>search(q.value.trim(),V.querySelector('#bres')),250)}}}
async function search(q,el){if(q.length<3){el.innerHTML='';return}const ql=q.toLowerCase(),r=[];
 await db().then(d=>new Promise(res=>{const c=d.transaction('tx').objectStore('tx').openCursor();c.onsuccess=()=>{const cur=c.result;if(!cur)return res();const t=cur.value,lt=t.toLowerCase();let k=lt.indexOf(ql),hits=0;const first=k;while(k>=0&&hits<99){hits++;k=lt.indexOf(ql,k+ql.length)}
  if(hits)r.push({id:cur.key,hits,snip:t.slice(Math.max(0,first-60),first+100)});cur.continue()}}));
 r.sort((a,b)=>b.hits-a.hits);el.innerHTML=r.length?`<div class="mut">${r.length} chapters mention “${esc(q)}”</div>`+r.slice(0,40).map(x=>`<a class="bk" href="#lib/${x.id}/q=${encodeURIComponent(q)}"><span class="bkn">${label(CH[x.id])} · ${x.hits}×</span><span>${esc(CH[x.id].t)}<br><small class="mut">…${esc(x.snip)}…</small></span></a>`).join(''):'<div class="empty">No match</div>'}
async function reader(V,id,arg){const c=CH[id];ctx.head(ttl(c),`${c.part} · book pp. ${c.p0}–${c.p1}`,1);
 if(!has(id)){V.innerHTML=`<div class="card"><b>${esc(ttl(c))}</b><p class="mut">This chapter isn't on this phone yet. Import the private book pack in the Library tab to read it offline.</p><a class="btn p full tap" href="#lib">Go to Library</a></div>`+ctx.foot();return}
 V.innerHTML='<div class="empty">Opening…</div>';const x=await get('ch',id);if(!x){B.have=B.have.filter(y=>y!==id);sv();return reader(V,id)}
 B.last=id;sv();const fav=B.fav.includes(id);
 V.innerHTML=`<div class="rdbar"><select id="rj"><option value="">Jump to section…</option>${(x.toc||[]).map(([h,l,t])=>`<option value="h${h}">${l>3?'· ':''}${esc(t.slice(0,70))}</option>`).join('')}${x.refs&&x.refs.length?'<option value="refs">References</option>':''}</select><button class="hbtn2" id="fsm" aria-label="Smaller text">A−</button><button class="hbtn2" id="fsp" aria-label="Larger text">A+</button><button class="hbtn2 ${fav?'on':''}" id="fav" aria-label="Bookmark">${fav?'★':'☆'}</button></div>
 <article class="rd" id="rd" style="font-size:${B.fs}px"><h2>${esc(c.n?c.n+'. '+c.t:c.t)}</h2>${x.html}${x.refs&&x.refs.length?`<details id="refs"><summary>References (${x.refs.length})</summary><ol>${x.refs.map(r=>'<li>'+r+'</li>').join('')}</ol></details>`:''}</article>
 <div class="row" style="margin-top:10px">${nav(id,-1)}${nav(id,1)}</div><div class="foot">${esc(M.title)} · ${esc(M.ed)} · personal copy stored on this phone only</div>`;
 const rd=V.querySelector('#rd');
 V.querySelector('#rj').onchange=e=>{const v=e.target.value;if(!v)return;const el=V.querySelector('#'+v);if(el){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView();scrollBy(0,-110)}e.target.value=''};
 const fs=d=>{B.fs=Math.max(13,Math.min(26,B.fs+d));rd.style.fontSize=B.fs+'px';sv()};V.querySelector('#fsm').onclick=()=>fs(-1);V.querySelector('#fsp').onclick=()=>fs(1);
 V.querySelector('#fav').onclick=e=>{const i=B.fav.indexOf(id);i<0?B.fav.push(id):B.fav.splice(i,1);sv();e.target.textContent=i<0?'★':'☆';e.target.classList.toggle('on',i<0);ctx.toast(i<0?'Bookmarked':'Bookmark removed')};
 rd.querySelectorAll('figure img').forEach(im=>im.onclick=()=>zoom(im.src));
 if(arg&&arg.startsWith('q=')){const q=decodeURIComponent(arg.slice(2));mark(rd,q)}
 else{const y=B.pos[id];if(y)setTimeout(()=>scrollTo(0,y*(document.documentElement.scrollHeight)),30)}
 let tm;const onS=()=>{if(location.hash.indexOf('#lib/'+id)!==0){removeEventListener('scroll',onS);return}clearTimeout(tm);tm=setTimeout(()=>{B.pos[id]=scrollY/Math.max(1,document.documentElement.scrollHeight);sv()},300)};addEventListener('scroll',onS,{passive:true})}
function nav(id,d){const i=M.ch.findIndex(x=>x[0]===id)+d;if(i<0||i>=M.ch.length)return'<span></span>';const c=CH[M.ch[i][0]];return `<a class="btn g tap" href="#lib/${c.id}">${d<0?'‹ ':''}${label(c)}${d>0?' ›':''}</a>`}
function mark(rd,q){const w=document.createTreeWalker(rd,NodeFilter.SHOW_TEXT);const ql=q.toLowerCase();let n,first=null;const hits=[];while(n=w.nextNode()){if(n.nodeValue.toLowerCase().includes(ql))hits.push(n)}
 hits.slice(0,200).forEach(t=>{const s=t.nodeValue,i=s.toLowerCase().indexOf(ql);const m=document.createElement('mark');const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+q.length);try{r.surroundContents(m);first=first||m}catch(e){}});
 if(first){const d=first.closest('details');if(d)d.open=true;first.scrollIntoView();scrollBy(0,-120)}}
function zoom(src){const o=document.createElement('div');o.className='zm';let z=1;o.innerHTML=`<div class="zmb"><button data-z="-1">−</button><button data-z="1">＋</button><button data-x>✕ Close</button></div><div class="zmc"><img src="${src}"></div>`;document.body.appendChild(o);const im=o.querySelector('img');
 o.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{z=Math.max(1,Math.min(4,z+(+b.dataset.z)*0.5));im.style.width=(z*100)+'%'});o.querySelector('[data-x]').onclick=()=>o.remove()}
window.BOOK={init:c=>ctx=c,page,sugHtml,stepHtml,suggest,has,importFiles,meta:M}})();
