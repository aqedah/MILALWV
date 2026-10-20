/* ===== 연구 기록(주석): 절·절 원자 메모, 관찰과 해석을 나눠 적는다. docs/NOTES_STORAGE_DESIGN.md
   - 기기 저장: IndexedDB "milal-annots" (localStorage 아님 — 용량). Firestore 동기화는 규칙 승인 뒤(작업 E).
   - 본문 자리는 BHSA 번호로 못 박는다. MILAL 관계는 참조만 저장하고 절대 고치지 않는다.
   - 낱말 메모(milal-study-notes)는 그대로 둔다. 여기로 옮기지 않는다. ===== */
const AN_DB="milal-annots", AN_STORE="annots";
let anDB=null, AN_FALLBACK=false, AN_MEM=null; /* IndexedDB 를 못 쓰면(사생활 모드·차단·오류) 메모리+localStorage 로 버틴다 — 화면에 경고하고 백업을 권한다 */
const AN_FB_KEY="milal-annots-fallback";
function anFallbackLoad(){ if(AN_MEM) return AN_MEM; AN_MEM=new Map(); try{ const L=JSON.parse(localStorage.getItem(AN_FB_KEY)||"[]"); for(const a of L) if(a&&a.id) AN_MEM.set(a.id,a); }catch(e){} return AN_MEM; }
function anFallbackSave(){ try{ localStorage.setItem(AN_FB_KEY,JSON.stringify([...anFallbackLoad().values()])); return true; }catch(e){ return false; } }
function anOpen(){ if(anDB) return Promise.resolve(anDB); if(AN_FALLBACK) return Promise.reject(new Error("fallback")); return new Promise((res,rej)=>{ if(!window.indexedDB){ rej(new Error("IndexedDB 없음")); return; }
  let rq; try{ rq=indexedDB.open(AN_DB,1); }catch(e){ rej(e); return; }
  rq.onupgradeneeded=()=>{ const db=rq.result; if(!db.objectStoreNames.contains(AN_STORE)){ const st=db.createObjectStore(AN_STORE,{keyPath:"id"}); st.createIndex("book","anchor.book",{unique:false}); st.createIndex("updated","updated",{unique:false}); } };
  rq.onsuccess=()=>{ anDB=rq.result; res(anDB); }; rq.onerror=()=>rej(rq.error||new Error("IndexedDB 열기 실패")); rq.onblocked=()=>rej(new Error("IndexedDB 막힘")); }).catch(e=>{ AN_FALLBACK=true; AN_FALLBACK_WHY=String(e&&e.message||e); anFallbackLoad(); throw e; }); }
let AN_FALLBACK_WHY="";
/* 저장소 한 번 거치기: IndexedDB 가 되면 트랜잭션, 안 되면 메모리 Map(+localStorage). fn(st) 는 IDB 저장소 흉내(get/put/getAll)를 받는다 */
function anTx(mode,fn){ return anOpen().then(db=>new Promise((res,rej)=>{ let tx; try{ tx=db.transaction(AN_STORE,mode); }catch(e){ rej(e); return; } const st=tx.objectStore(AN_STORE); let out; try{ out=fn(st); }catch(e){ rej(e); return; } tx.oncomplete=()=>res(out&&out.result!==undefined?out.result:out); tx.onerror=()=>rej(tx.error||new Error("저장 실패")); tx.onabort=()=>rej(tx.error||new Error("저장이 취소됨(용량 부족?)")); }))
  .catch(e=>{ if(!AN_FALLBACK) throw e; const M=anFallbackLoad(); const fake={ get:id=>{ const r={result:M.get(id)}; setTimeout(()=>r.onsuccess&&r.onsuccess(),0); return r; }, put:a=>{ M.set(a.id,a); return {result:a.id}; }, getAll:()=>({result:[...M.values()]}) };
    return new Promise((res,rej)=>{ let out; try{ out=fn(fake); }catch(e2){ rej(e2); return; } setTimeout(()=>{ if(mode==="readwrite"&&!anFallbackSave()){ rej(new Error("이 브라우저의 저장 공간이 부족하거나 막혀 있습니다. 기록을 백업(JSON)으로 내려받아 두세요.")); return; } res(out&&out.result!==undefined?out.result:out); },0); }); }); }
/* 동기화가 기기 기록을 바꿀 때 쓰는 입구(firebase.js): 묶음으로 넣고 목록 새로 고침 */
function anPutMany(list){ return anTx("readwrite",st=>{ for(const a of list) st.put(a); }).then(()=>anAll()); }
function anSyncHint(){ const S=window.ANNOT_SYNC_STATE; if(!S) return `<p class="lead" style="margin-top:6px">기록은 이 기기에 저장됩니다. 기기끼리 맞추기(동기화)는 운영 규칙 승인 뒤 켭니다.</p>`;
  return `<p class="lead" style="margin-top:6px">동기화: ${esc(S.text)}${S.pending?` · 올릴 것 ${S.pending}건`:""}${S.conflicts?` · 충돌 사본 ${S.conflicts}건(메모 안에 ⟪충돌 사본⟫)`:""}</p>`; }
function anStoreHint(){ return AN_FALLBACK?`<p class="lead warn">⚠ 이 브라우저에서 안전한 저장소(IndexedDB)를 쓸 수 없어(${esc(AN_FALLBACK_WHY)}) 기록을 임시 저장소에 두고 있습니다. 브라우저 자료를 지우면 사라질 수 있으니 <b>JSON 백업</b>을 내려받아 두세요.</p>`:""; }
const anId=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
let AN_CACHE=null; /* 전체 목록(지운 것 제외) — 화면용 */
function anAll(){ return anTx("readonly",st=>st.getAll()).then(L=>{ AN_CACHE=(L||[]).filter(a=>!a.deleted).sort((x,y)=>y.updated-x.updated); return AN_CACHE; }); }
const AN_DEVICE=(()=>{ try{ let d=localStorage.getItem("milal-device"); if(!d){ d=Math.random().toString(36).slice(2,10); localStorage.setItem("milal-device",d); } return d; }catch(e){ return "?"; } })();
function anSave(a){ const before={updated:a.updated,created:a.created,id:a.id,rev:a.rev,device:a.device}; a.updated=Date.now(); if(!a.created) a.created=a.updated; if(!a.id) a.id=anId(); a.rev=(a.rev||0)+1; a.device=AN_DEVICE; a.deleted=!!a.deleted; a.dirty=true; /* 동기화용: 서버에 올릴 것 */
  return anTx("readwrite",st=>st.put(a)).then(()=>anAll()).then(()=>{ if(window.onAnnotSaved) try{ onAnnotSaved(a); }catch(e){} return a; })
    .catch(e=>{ Object.assign(a,before); const q=/quota|exceeded|용량/i.test(String(e&&(e.name+" "+e.message))); throw new Error(q?"저장 공간이 부족합니다. 기록을 JSON 백업으로 내려받고 브라우저 저장 공간을 확인하세요.":String(e&&e.message||e)); }); }
/* 지움은 표시만(동기화에서 되살아나지 않게 묘비 유지) */
function anDelete(id){ return anTx("readwrite",st=>{ const g=st.get(id); g.onsuccess=()=>{ const a=g.result; if(a){ a.deleted=true; a.updated=Date.now(); a.rev=(a.rev||0)+1; a.device=AN_DEVICE; a.dirty=true; st.put(a); } }; }).then(()=>anAll()).then(()=>{ if(window.onAnnotDeleted) try{ onAnnotDeleted(id); }catch(e){} }); }
function anList(){ return AN_CACHE||[]; }
function anFor(kind,key){ return anList().filter(a=>a.kind===kind&&a.key===key); }
/* 자리(anchor) 만들기 — BHSA 번호 */
function anchorAtom(aid){ const w0=atomFirstWord(aid), vi=SD.vOf[w0], [b,c,v]=SD.V[vi], cid=SD.wc[w0]; const ws=[]; for(let i=w0;i<SD.wa.length&&SD.wa[i]===aid;i++) ws.push(i);
  const bf=SD.V[SD.book[b].a][5]; const slot=i=>SD.bs[b-1]+(i-bf);
  return {book:b,ch:c,vs:v,bhsa:SD.bhsa||"2021",clause_atom_ids:[SD.can[aid]],clause_ids:[String(SD.ccn[cid])],word_ids:ws.map(slot),heb:ws.map(j=>{ const vj=SD.vOf[j]; return sHeb(vj)[j-SD.V[vj][5]]; }).join("").trim()}; }
function anchorVerse(vi){ const [b,c,v,,,s,n]=SD.V[vi]; const bf=SD.V[SD.book[b].a][5]; const slot=i=>SD.bs[b-1]+(i-bf); const atoms=new Set(), cls=new Set(); for(let i=s;i<s+n;i++){ atoms.add(SD.can[SD.wa[i]]); cls.add(String(SD.ccn[SD.wc[i]])); }
  return {book:b,ch:c,vs:v,bhsa:SD.bhsa||"2021",clause_atom_ids:[...atoms],clause_ids:[...cls],word_ids:Array.from({length:n},(_,k)=>slot(s+k)),heb:sHeb(vi).join("").trim()}; }
const anKey=(kind,anchor)=>kind==="atom"?"a:"+anchor.clause_atom_ids[0]:"v:"+anchor.book+"-"+anchor.ch+"-"+anchor.vs;

/* --- 편집 창 --- */
function openAnnotEditor(kind,ref,existing){ const isNew=!existing||existing._new; const anchor=existing?existing.anchor:(kind==="atom"?anchorAtom(ref):anchorVerse(ref)); const key=existing?existing.key:anKey(kind,anchor); if(existing&&existing._new) existing={anchor:existing.anchor,key:existing.key};
  const b=anchor.book, st=window.ML&&ML[b]; let milal=null;
  if(!existing&&st&&st.state==="ok"&&kind==="atom"){ const m=milalForAtom(b,ref); if(m){ const ids=[...m.o.inRel,...m.o.outRel].map(r=>r.id); if(ids.length) milal={stage:st.data.source.milal.stage,file_status:st.data.file_status,network_sha256:st.data.source.milal.network_sha256||"",relation_ids:ids}; } }
  const ex=existing||{}; const where=kind==="range"?rangeLabel({anchor}):PLAN.abbr[b-1]+" "+anchor.ch+":"+anchor.vs;
  sheet((isNew?"메모 쓰기":"메모 고치기")+" · "+where,`<p class="lead" style="margin:0 0 4px">${kind==="atom"?"절 원자":kind==="range"?`구간 · 절 원자 ${anchor.clause_atom_ids.length}개 · 낱말 ${anchor.span?anchor.span.words:""}개`:"절"} · BHSA clause_atom ${kind==="range"?anchor.clause_atom_ids[0]+" … "+anchor.clause_atom_ids[anchor.clause_atom_ids.length-1]:anchor.clause_atom_ids.join(", ")}</p><p class="heb svheb" style="margin:0 0 8px">${esc(anchor.heb)}</p>
    <label class="anlab">관찰 <small>본 것 — 본문·문법·표지에서 확인한 사실</small></label><textarea id="anObs" rows="3" placeholder="예: 와이크톨이 끊기고 명사문이 온다">${esc(ex.observation||"")}</textarea>
    <label class="anlab">해석 <small>내 결론 — 관찰에서 이끌어 낸 뜻</small></label><textarea id="anInt" rows="3" placeholder="예: 서술자가 장면을 멈추고 배경을 알린다">${esc(ex.interpretation||"")}</textarea>
    <label class="anlab">표시 <small>쉼표로</small></label><input id="anTags" type="text" value="${esc((ex.tags||[]).join(", "))}" placeholder="전환, 반복">
    ${milal?`<label class="anchk"><input type="checkbox" id="anRef" checked> 보고 있던 MILAL 관계 ${milal.relation_ids.length}개를 참조로 함께 저장 (${esc(milal.stage)}${milal.file_status==="TEST_ONLY"?" · 시험 자료":""}) — 참조일 뿐, MILAL 판정을 바꾸지 않습니다</label>`:ex.milal_ref?`<p class="lead">MILAL 참조: ${esc(ex.milal_ref.stage)} · 관계 ${ex.milal_ref.relation_ids.length}개</p>`:""}
    <div class="row" style="justify-content:space-between"><span>${!isNew?`<button class="btn small ghost" id="anDel">지우기</button>`:""}</span><button class="sbtn" id="anSave" style="width:auto;margin:0;padding:10px 18px">저장</button></div>`);
  const root=document.getElementById("sheetRoot");
  root.querySelector("#anSave").onclick=()=>{ const obs=root.querySelector("#anObs").value.trim(), it=root.querySelector("#anInt").value.trim(); if(!obs&&!it){ toast("관찰이나 해석 중 하나는 적어 주세요."); return; }
    const a=Object.assign({},ex,{kind,key,anchor,observation:obs,interpretation:it,tags:root.querySelector("#anTags").value.split(",").map(s=>s.trim()).filter(Boolean)});
    if(milal&&root.querySelector("#anRef")&&root.querySelector("#anRef").checked) a.milal_ref=milal;
    anSave(a).then(()=>{ root.innerHTML=""; toast(isNew?"메모를 저장했습니다.":"메모를 고쳤습니다."); render(); }).catch(e=>toast("저장하지 못했습니다: "+e.message)); };
  const d=root.querySelector("#anDel"); if(d) d.onclick=()=>{ if(!confirm("이 메모를 지울까요?")) return; anDelete(ex.id).then(()=>{ root.innerHTML=""; toast("지웠습니다."); render(); }).catch(e=>toast("지우지 못했습니다: "+e.message)); }; }
/* 상세 창·읽기 화면에 끼우는 목록 */
function annotListHTML(kind,key,ref){ const L=anFor(kind,key);
  return `<div class="src3"><span class="label">내 메모 <small>(내 기록 — MILAL 판정과 별개)</small></span>${L.map(a=>`<div class="anitem"><div>${a.observation?`<p><b>관찰</b> ${esc(a.observation)}</p>`:""}${a.interpretation?`<p><b>해석</b> ${esc(a.interpretation)}</p>`:""}${a.tags&&a.tags.length?`<small>${a.tags.map(t=>"#"+esc(t)).join(" ")}</small>`:""}</div><button class="btn small ghost" data-anedit="${a.id}">고치기</button></div>`).join("")}<button class="btn small" data-annew="${kind}:${ref}">${kind==="atom"?"이 절 원자에":"이 절에"} 관찰·해석 쓰기</button></div>`; }
function bindAnnots(root){ root.querySelectorAll("[data-anedit]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const a=anList().find(x=>x.id===b.dataset.anedit); if(a) openAnnotEditor(a.kind,null,a); });
  root.querySelectorAll("[data-annew]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const [k,r]=b.dataset.annew.split(":"); openAnnotEditor(k,+r); }); }
/* 기록 탭 목록: 책·장별 */
function annotsPage(){ const L=anList(); if(!L.length) return `<section class="sec"><span class="label">절·절 원자 메모 · 0</span><p class="lead">아직 없습니다. 본문에서 절을 펼친 뒤 '이 절에 관찰·해석 쓰기', 또는 구조 화면에서 줄 이름표를 눌러 '이 절 원자에 관찰·해석 쓰기'를 누르세요.</p></section>`;
  const by=new Map(); for(const a of L){ const k=a.anchor.book+"-"+a.anchor.ch; (by.get(k)||by.set(k,[]).get(k)).push(a); }
  const keys=[...by.keys()].sort((x,y)=>{ const [a1,b1]=x.split("-").map(Number),[a2,b2]=y.split("-").map(Number); return a1-a2||b1-b2; });
  let h=`<section class="sec"><span class="label">절·절 원자 메모 · ${L.length}</span><p class="lead">이 기기에 저장됩니다(동기화는 규칙 승인 뒤). 누르면 그 자리로 갑니다.</p>`;
  for(const k of keys){ const [b,c]=k.split("-").map(Number); h+=`<div class="pkgrp">${esc(PLAN.full[b-1])} ${c}장</div><div class="snlist">`+by.get(k).sort((x,y)=>x.anchor.vs-y.anchor.vs).map(a=>`<div class="snitem"><button class="snjump" data-ango="${a.id}"><span class="heb">${esc(a.anchor.heb.slice(0,40))}</span><b>${a.anchor.vs}절 · ${a.kind==="atom"?"절 원자":"절"}</b>${a.observation?`<span class="snm"><b>관찰</b> ${esc(a.observation)}</span>`:""}${a.interpretation?`<span class="snm"><b>해석</b> ${esc(a.interpretation)}</span>`:""}<small>${new Date(a.updated).toLocaleDateString("ko-KR")}${a.milal_ref?" · MILAL 참조":""}${a.tags&&a.tags.length?" · "+a.tags.map(t=>"#"+t).join(" "):""}</small></button><button class="sndel" data-anedit="${a.id}" aria-label="고치기">✎</button></div>`).join("")+`</div>`; }
  return h+`</section>`; }
function bindAnnotsPage(root){ bindAnnots(root); root.querySelectorAll("[data-ango]").forEach(b=>b.onclick=()=>{ const a=anList().find(x=>x.id===b.dataset.ango); if(!a) return; const {book,ch,vs}=a.anchor;
    if(a.kind==="atom"){ const aid=anAtomOf(a); if(aid!=null){ gotoAtom(book,aid); return; } } view.st.rd="read"; studyOpenVerse(book,ch,vs); }); }
/* 메모의 BHSA 절 원자 번호 → 앱 번호 (책이 아직 안 받아졌으면 받고 나서) */
function anAtomOf(a){ const b=a.anchor.book; if(!SD.loaded.has(b)){ loadBook(b).then(()=>{ const aid=anAtomOf(a); if(aid!=null) gotoAtom(b,aid); }); return null; }
  const want=a.anchor.clause_atom_ids[0]; const a0=SD.bookA[b-1], a1=b<39?SD.bookA[b]:SD.can.length; for(let i=a0;i<a1;i++) if(SD.can[i]===want) return i; return null; }
anOpen().catch(()=>{}).then(()=>anAll()).catch(()=>{}); /* IndexedDB 가 안 되면 임시 저장소에서라도 읽는다 */

/* ===================== D-1 본문 표시(형광펜·밑줄·괄호) =====================
   kind:"mark" — anchor.word_ids(BHSA 낱말 번호)에 style(hl|ul|br)·color 를 입힌다. 원문은 바꾸지 않는다. */
const MARK_COLORS=[["y","#F6E27A","노랑"],["g","#BFE3B4","초록"],["b","#BBD6F3","파랑"],["p","#F3C4D8","분홍"]];
function markColor(c){ const k=MARK_COLORS.find(x=>x[0]===c); return k?k[1]:(/^#[0-9a-f]{6}$/i.test(c||"")?c:"#F6E27A"); }
function marksHidden(){ try{ return localStorage.getItem("milal-marks-hide")==="1"; }catch(e){ return false; } }
function marksToggle(){ try{ localStorage.setItem("milal-marks-hide",marksHidden()?"0":"1"); }catch(e){} render(); }
/* 앱 낱말 i → BHSA 슬롯, 그 역 */
function slotOf(i){ const b=SD.V[SD.vOf[i]][0], bf=SD.V[SD.book[b].a][5]; return SD.bs[b-1]+(i-bf); }
/* 절 vi 의 낱말마다 적용되는 표시 목록 → [{hl,ul,brOpen,brClose}] */
function marksForVerse(vi){ if(marksHidden()) return null; const [, , , , ,s,n]=SD.V[vi]; const lo=slotOf(s), hi=slotOf(s+n-1);
  const M=anList().filter(a=>a.kind==="mark"&&a.anchor.book===SD.V[vi][0]&&a.anchor.word_ids.some(w=>w>=lo&&w<=hi)); if(!M.length) return null;
  const per=Array.from({length:n},()=>({hl:null,ul:false,bo:0,bc:0,ids:[]}));
  for(const a of M){ const ws=a.anchor.word_ids.filter(w=>w>=lo&&w<=hi).sort((x,y)=>x-y); if(!ws.length) continue;
    for(const w of ws){ const p=per[w-lo]; if(a.style==="hl") p.hl=markColor(a.color); if(a.style==="ul") p.ul=true; p.ids.push(a.id); }
    if(a.style==="br"){ per[ws[0]-lo].bo++; per[ws[ws.length-1]-lo].bc++; } }
  return per; }
/* 절의 히브리어 줄: 낱말마다 span (표시가 있을 때만 쓴다) */
function hebMarked(vi,per){ const H=sHeb(vi); return H.map((t,j)=>{ const p=per[j]; const txt=esc(t.replace(/\s+$/,"")), sp=/\s$/.test(t)?" ":""; if(!p||(!p.hl&&!p.ul&&!p.bo&&!p.bc)) return txt+sp;
  return `${"⟩".repeat(p.bc)?"":""}${"⟦".repeat(p.bo)}<span class="mk${p.ul?" mk-ul":""}" ${p.hl?`style="background:${p.hl}"`:""} data-mkid="${p.ids[0]||""}">${txt}</span>${"⟧".repeat(p.bc)}${sp}`; }).join(""); }
function marksForWords(vis){ if(marksHidden()) return null; const out=new Map(); for(const vi of vis){ const per=marksForVerse(vi); if(!per) continue; const s=SD.V[vi][5]; per.forEach((p,j)=>{ if(p.hl||p.ul) out.set(s+j,p); }); } return out.size?out:null; }
/* 표시 고르기 창: 낱말 번호 목록(앱 번호)에 스타일 적용 */
function openMarkPicker(wordIdx,label){ if(!wordIdx.length){ toast("먼저 낱말을 고르세요."); return; }
  const vi=SD.vOf[wordIdx[0]], [b,c,v]=SD.V[vi]; const heb=wordIdx.map(j=>{ const vj=SD.vOf[j]; return sHeb(vj)[j-SD.V[vj][5]]; }).join("").trim();
  sheet("표시 · "+PLAN.abbr[b-1]+" "+c+":"+v,`<p class="heb svheb" style="margin:0 0 6px">${esc(heb)}</p><p class="lead" style="margin:0 0 8px">${esc(label||"")} · 낱말 ${wordIdx.length}개 · 원문은 바뀌지 않고 표시만 덧입힙니다</p>
    <div class="mgrp">형광펜</div><div class="mkrow">${MARK_COLORS.map(([k,hex,n])=>`<button class="mkc" data-mk="hl:${k}" style="background:${hex}" aria-label="${n}"></button>`).join("")}<label class="mkc mkcustom" title="색 직접"><input type="color" id="mkCustom" value="#F6E27A"><span>직접</span></label></div>
    <div class="mgrp">그 밖</div><div class="mkrow"><button class="btn small" data-mk="ul:">밑줄</button><button class="btn small" data-mk="br:">괄호로 묶기 ⟦ ⟧</button></div>
    <input id="mkLabel" type="text" placeholder="이 표시의 뜻 (예: 반복되는 말) — 비워도 됨" style="width:100%;margin-top:10px;font:inherit;font-size:14px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);box-sizing:border-box">`);
  const root=document.getElementById("sheetRoot"); const save=(style,color)=>{ const a={kind:"mark",key:"m:"+anId(),anchor:{book:b,ch:c,vs:v,bhsa:SD.bhsa||"2021",word_ids:wordIdx.map(slotOf),clause_atom_ids:[...new Set(wordIdx.map(j=>SD.can[SD.wa[j]]))],clause_ids:[...new Set(wordIdx.map(j=>String(SD.ccn[SD.wc[j]])))],heb},style,color,observation:"",interpretation:"",tags:(root.querySelector("#mkLabel").value.trim()?[root.querySelector("#mkLabel").value.trim()]:[])};
    anSave(a).then(()=>{ root.innerHTML=""; view.st.mkSel=null; toast("표시했습니다."); render(); }).catch(e=>toast("표시를 저장하지 못했습니다: "+e.message)); };
  root.querySelectorAll("[data-mk]").forEach(x=>x.onclick=()=>{ const [st,co]=x.dataset.mk.split(":"); save(st,co); });
  root.querySelector("#mkCustom").onchange=e=>save("hl",e.target.value); }
function openMarkEdit(id){ const a=anList().find(x=>x.id===id); if(!a) return; sheet("표시",`<p class="heb svheb" style="margin:0 0 6px">${esc(a.anchor.heb)}</p><p class="lead">${esc(PLAN.abbr[a.anchor.book-1])} ${a.anchor.ch}:${a.anchor.vs} · ${a.style==="hl"?"형광펜":a.style==="ul"?"밑줄":"괄호"}${a.tags&&a.tags[0]?" · "+esc(a.tags[0]):""}</p><div class="row" style="justify-content:space-between"><button class="btn small ghost" id="mkDel">표시 지우기</button><button class="btn small" id="mkNote">이 자리에 메모 쓰기</button></div>`);
  const root=document.getElementById("sheetRoot"); root.querySelector("#mkDel").onclick=()=>anDelete(id).then(()=>{ root.innerHTML=""; render(); }).catch(e=>toast("지우지 못했습니다: "+e.message));
  root.querySelector("#mkNote").onclick=()=>{ root.innerHTML=""; const vi=SD.ref.get(a.anchor.book+"-"+a.anchor.ch+"-"+a.anchor.vs)?.[0]; if(vi!=null) openAnnotEditor("verse",vi); }; }

/* ===================== D-2 구간 메모 =====================
   읽기 화면에서 '구간' 모드: 시작 절, 끝 절을 차례로 누른다(같은 책 안, 장을 넘어도 됨) */
function anchorRange(vi1,vi2){ if(vi1>vi2) [vi1,vi2]=[vi2,vi1]; const [b,c1,v1]=SD.V[vi1], [,c2,v2]=SD.V[vi2]; const s=SD.V[vi1][5], e=SD.V[vi2][5]+SD.V[vi2][6]-1;
  const atoms=new Set(), cls=new Set(); for(let i=s;i<=e;i++){ atoms.add(SD.can[SD.wa[i]]); cls.add(String(SD.ccn[SD.wc[i]])); }
  return {book:b,ch:c1,vs:v1,ch2:c2,vs2:v2,bhsa:SD.bhsa||"2021",clause_atom_ids:[...atoms],clause_ids:[...cls],word_ids:[slotOf(s),slotOf(e)],span:{from_word:slotOf(s),to_word:slotOf(e),words:e-s+1},heb:sHeb(vi1).join("").trim().slice(0,60)+(vi2>vi1?" …":"")}; }
function rangeLabel(a){ const A=a.anchor; return `${PLAN.abbr[A.book-1]} ${A.ch}:${A.vs}${A.ch2!=null&&(A.ch2!==A.ch||A.vs2!==A.vs)?`–${A.ch2!==A.ch?A.ch2+":":""}${A.vs2}`:""}`; }
function rangePick(vi){ const S=view.st; if(S.rangeStart==null){ S.rangeStart=vi; toast(`시작: ${sRef(vi)} — 끝 절을 누르세요`); render(); return; }
  const a1=S.rangeStart; S.rangeStart=null; S.rangeMode=false; if(SD.V[a1][0]!==SD.V[vi][0]){ toast("같은 책 안에서 고르세요."); render(); return; }
  const anchor=anchorRange(a1,vi); render(); openAnnotEditor("range",null,{kind:"range",key:"r:"+anchor.span.from_word+"-"+anchor.span.to_word,anchor,_new:true}); }
/* 절 줄 머리에 붙는 구간 칩: 이 절에서 시작하는 구간 메모 */
function rangeChips(vi){ const [b,c,v]=SD.V[vi]; const L=anList().filter(a=>a.kind==="range"&&a.anchor.book===b&&a.anchor.ch===c&&a.anchor.vs===v); if(!L.length) return "";
  return L.map(a=>`<button class="rgchip" data-anedit="${a.id}">구간 ${esc(rangeLabel(a).replace(/^\S+ /,""))}${a.tags&&a.tags[0]?" · "+esc(a.tags[0]):""}</button>`).join(""); }

/* ===================== D-3 기록 탭 통합 =====================
   낱말 메모(옛 저장)와 주석(새 저장)을 한 목록에서 — 저장은 따로, 보기는 같이 */
function allRecords(){ const W=studyNotes().map(n=>({id:"w:"+n.t,kind:"word",book:n.b,ch:n.c,vs:n.v,heb:n.heb,title:n.gl,observation:n.m||"",interpretation:"",tags:[],updated:n.t,word:n}));
  const A=anList().map(a=>({id:a.id,kind:a.kind,book:a.anchor.book,ch:a.anchor.ch,vs:a.anchor.vs,heb:a.anchor.heb,title:a.kind==="range"?rangeLabel(a):"",observation:a.observation||"",interpretation:a.interpretation||"",tags:a.tags||[],updated:a.updated,style:a.style,color:a.color,milal_ref:a.milal_ref,a}));
  return W.concat(A); }
const KIND_KO={word:"낱말 메모",verse:"절 메모",atom:"절 원자 메모",range:"구간 메모",mark:"표시"};
function recordsPage(){ const S=view.st; S.rf ||= {kind:"all",tag:"",q:"",sort:"recent"}; const F=S.rf; let L=allRecords();
  const tags=[...new Set(L.flatMap(r=>r.tags))].sort();
  if(F.kind!=="all") L=L.filter(r=>r.kind===F.kind); if(F.tag) L=L.filter(r=>r.tags.includes(F.tag));
  if(F.q){ const q=F.q.toLowerCase(); L=L.filter(r=>[r.observation,r.interpretation,r.heb,r.title,r.tags.join(" ")].join(" ").toLowerCase().includes(q)); }
  L.sort(F.sort==="recent"?(x,y)=>y.updated-x.updated:(x,y)=>x.book-y.book||x.ch-y.ch||x.vs-y.vs||x.updated-y.updated);
  let h=`<section class="sec"><div class="rfbar"><input id="rfQ" type="search" placeholder="기록 찾기 (관찰·해석·원문·태그)" value="${esc(F.q)}"><div class="seg sseg mseg rfkind">${[["all","전체"],["word","낱말"],["verse","절"],["atom","절 원자"],["range","구간"],["mark","표시"]].map(([k,n])=>`<button aria-checked="${F.kind===k}" data-rfk="${k}">${n}</button>`).join("")}</div>
    <div class="rfrow"><select id="rfTag"><option value="">태그 전체</option>${tags.map(t=>`<option value="${esc(t)}"${F.tag===t?" selected":""}>#${esc(t)}</option>`).join("")}</select><div class="seg sseg mseg" style="flex:1"><button aria-checked="${F.sort==="recent"}" data-rfs="recent">최근 순</button><button aria-checked="${F.sort==="text"}" data-rfs="text">본문 순</button></div></div>
    <div class="rfrow"><span class="label" style="margin:0">${L.length}건</span><span style="flex:1"></span><button class="btn small ghost" data-export="md">Markdown 내보내기</button><button class="btn small ghost" data-export="csv">CSV</button></div>
    <div class="rfrow"><span class="label" style="margin:0">백업</span><span style="flex:1"></span><button class="btn small ghost" id="bkOut" style="white-space:nowrap">JSON 백업 내려받기</button><button class="btn small ghost" id="bkIn" style="white-space:nowrap">복원</button><input type="file" id="bkFile" accept=".json,application/json" hidden></div>
    <small class="lead" style="display:block;margin:-2px 0 0">JSON 백업은 기록 전부(지운 표시 포함)를 그대로 담아 다시 불러올 수 있습니다. Markdown·CSV는 읽기용입니다.</small></div>${anStoreHint()}${anSyncHint()}`;
  if(!L.length) return h+`<p class="lead">기록이 없습니다. 본문에서 절을 펼쳐 메모·표시를 남기세요.</p></section>`;
  let lastG=""; for(const r of L){ const g=F.sort==="text"?`${PLAN.full[r.book-1]} ${r.ch}장`:""; if(g&&g!==lastG){ h+=`<div class="pkgrp">${esc(g)}</div>`; lastG=g; }
    const where=r.kind==="range"?r.title:`${PLAN.abbr[r.book-1]} ${r.ch}:${r.vs===0?"표제":r.vs}`;
    h+=`<div class="snitem"><button class="snjump" data-rgo="${r.id}"><span class="heb">${esc((r.heb||"").slice(0,40))}</span><b>${esc(where)} · ${KIND_KO[r.kind]}${r.kind==="mark"?` (${r.style==="hl"?"형광펜":r.style==="ul"?"밑줄":"괄호"})`:""}${r.kind==="word"?" · "+esc(r.title):""}</b>${r.observation?`<span class="snm"><b>관찰</b> ${esc(r.observation)}</span>`:""}${r.interpretation?`<span class="snm"><b>해석</b> ${esc(r.interpretation)}</span>`:""}<small>${new Date(r.updated).toLocaleDateString("ko-KR")}${r.milal_ref?" · MILAL 참조":""}${r.tags.length?" · "+r.tags.map(t=>"#"+esc(t)).join(" "):""}</small></button>${r.kind==="word"?`<button class="sndel" data-snd="${r.word.t}" aria-label="지우기">✕</button>`:`<button class="sndel" data-anedit="${r.id}" aria-label="고치기">✎</button>`}</div>`; }
  return h+`</section>`; }
function bindRecordsPage(root){ const S=view.st, F=S.rf; bindAnnots(root);
  root.querySelectorAll("[data-anedit]").forEach(b=>{ const a=anList().find(x=>x.id===b.dataset.anedit); if(a&&a.kind==="mark") b.onclick=e=>{ e.stopPropagation(); openMarkEdit(a.id); }; });
  const q=root.querySelector("#rfQ"); if(q) q.oninput=()=>{ F.q=q.value; const y=scrollY; render(); scrollTo({top:y}); const q2=document.getElementById("rfQ"); if(q2){ q2.focus(); q2.setSelectionRange(q2.value.length,q2.value.length); } };
  root.querySelectorAll("[data-rfk]").forEach(b=>b.onclick=()=>{ F.kind=b.dataset.rfk; render(); }); root.querySelectorAll("[data-rfs]").forEach(b=>b.onclick=()=>{ F.sort=b.dataset.rfs; render(); });
  const t=root.querySelector("#rfTag"); if(t) t.onchange=()=>{ F.tag=t.value; render(); };
  root.querySelectorAll("[data-rgo]").forEach(b=>b.onclick=()=>{ const r=allRecords().find(x=>x.id===b.dataset.rgo); if(!r) return;
    if(r.kind==="word"){ view.st.rd="read"; studyOpenVerse(r.book,r.ch,r.vs); return; }
    if(r.kind==="atom"){ const aid=anAtomOf(r.a); if(aid!=null) gotoAtom(r.book,aid); return; }
    view.st.rd="read"; view.st.rangeStart=null; studyOpenVerse(r.book,r.ch,r.vs); });
  root.querySelectorAll("[data-export]").forEach(b=>b.onclick=()=>exportRecords(b.dataset.export));
  const bo=root.querySelector("#bkOut"); if(bo) bo.onclick=()=>exportBackup().catch(e=>toast("백업하지 못했습니다: "+e.message));
  const bi=root.querySelector("#bkIn"), bf=root.querySelector("#bkFile"); if(bi&&bf){ bi.onclick=()=>bf.click(); bf.onchange=()=>{ const f=bf.files&&bf.files[0]; if(f) f.text().then(t=>restoreBackupText(t)).catch(e=>toast("복원하지 못했습니다: "+e.message)); bf.value=""; }; } }

/* ===================== D-4 내보내기 (Markdown / CSV) ===================== */
function exportRecords(fmt){ const S=view.st, F=S.rf||{kind:"all",tag:"",q:"",sort:"text"}; let L=allRecords();
  if(F.kind!=="all") L=L.filter(r=>r.kind===F.kind); if(F.tag) L=L.filter(r=>r.tags.includes(F.tag)); if(F.q){ const q=F.q.toLowerCase(); L=L.filter(r=>[r.observation,r.interpretation,r.heb,r.title,r.tags.join(" ")].join(" ").toLowerCase().includes(q)); }
  L.sort((x,y)=>x.book-y.book||x.ch-y.ch||x.vs-y.vs||x.updated-y.updated);
  const where=r=>r.kind==="range"?r.title:`${PLAN.full[r.book-1]} ${r.ch}:${r.vs===0?"표제":r.vs}`;
  const styleKo=r=>r.kind!=="mark"?"":(r.style==="hl"?"형광펜 "+(r.color||""):r.style==="ul"?"밑줄":"괄호");
  const milalTxt=r=>r.milal_ref?`${r.milal_ref.stage} (${r.milal_ref.file_status==="TEST_ONLY"?"시험 자료":"MILAL 출력"}; sha ${(r.milal_ref.network_sha256||"").slice(0,12)}) 관계 ${r.milal_ref.relation_ids.join(", ")}`:"";
  const date=new Date().toISOString().slice(0,10); let txt, name;
  if(fmt==="md"){ const lines=[`# MILAL 연구 기록`,``,`- 내보낸 날: ${date}`,`- 자료: BHSA ${SD.bhsa||"2021"} · 번역 ${TR_INFO.tr.name||"없음"} · 앱 자료판 ${STUDY_V}`,`- 기록 ${L.length}건 (${F.kind==="all"?"전체":KIND_KO[F.kind]}${F.tag?" · #"+F.tag:""}${F.q?" · 검색 \""+F.q+"\"":""})`,``,`> **구분**: '관찰'은 본문에서 본 것, '해석'은 나(사용자)의 결론입니다. 'MILAL 참조'는 메모를 쓸 때 보고 있던 MILAL의 **기계·연구자 판정 기록**을 가리키는 것이지, 내 해석이 MILAL의 판정이라는 뜻이 아닙니다.`,``];
    let g=""; for(const r of L){ const gg=`${PLAN.full[r.book-1]} ${r.ch}장`; if(gg!==g){ lines.push(`## ${gg}`,``); g=gg; }
      lines.push(`### ${where(r)} — ${KIND_KO[r.kind]}${r.kind==="word"?" ("+r.title+")":""}${styleKo(r)?" ("+styleKo(r)+")":""}`); if(r.heb) lines.push(``,`> ${r.heb}`,``);
      if(r.observation) lines.push(`- **관찰**: ${r.observation}`); if(r.interpretation) lines.push(`- **해석**: ${r.interpretation}`); if(r.tags.length) lines.push(`- 태그: ${r.tags.map(t=>"#"+t).join(" ")}`); if(r.milal_ref) lines.push(`- MILAL 참조: ${milalTxt(r)}`); lines.push(`- 기록일: ${new Date(r.updated).toLocaleDateString("ko-KR")}`,``); }
    txt=lines.join("\n"); name=`milal-기록-${date}.md`; }
  else { const esc2=s=>`"${String(s||"").replace(/"/g,'""')}"`; const rows=[["위치","종류","표시","원문","관찰","해석","태그","MILAL 참조","기록일","BHSA 낱말 번호"].map(esc2).join(",")];
    for(const r of L) rows.push([where(r),KIND_KO[r.kind]+(r.kind==="word"?" "+r.title:""),styleKo(r),r.heb||"",r.observation,r.interpretation,r.tags.join(" "),milalTxt(r),new Date(r.updated).toISOString().slice(0,10),r.a?(r.a.anchor.word_ids||[]).join(" "):""].map(esc2).join(","));
    txt="﻿"+rows.join("\r\n"); name=`milal-기록-${date}.csv`; }
  const blob=new Blob([txt],{type:fmt==="md"?"text/markdown;charset=utf-8":"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },500);
  if(navigator.clipboard&&fmt==="md") navigator.clipboard.writeText(txt).then(()=>toast("Markdown 파일을 내려받고 클립보드에도 복사했습니다."),()=>toast("파일을 내려받았습니다.")); else toast("파일을 내려받았습니다.");
  window.__lastExport={name,txt}; }

/* ===================== B 백업·복원 (JSON) — docs/NOTES_STORAGE_DESIGN.md §5 =====================
   백업: 주석 전부(묘비 포함, 칸 그대로) + 낱말 메모 목록. 규격 MILALWV-BACKUP-1.
   복원: id 로 맞춰 본다. 없는 것은 넣고, 있는 것은 rev 가 큰 쪽을 두되 묘비는 되살리지 않고,
         rev 가 같은데 내용이 다르면 기존 것을 두고 들어온 것을 '복원 충돌 사본'으로 따로 보존한다(아무것도 잃지 않음). */
function anAllRaw(){ return anTx("readonly",st=>st.getAll()).then(L=>L||[]); }
function backupObject(){ return anAllRaw().then(L=>({schema:"MILALWV-BACKUP-1",exported_at:new Date().toISOString(),app_data_version:window.STUDY_V||"",bhsa:(window.SD&&SD.bhsa)||"2021",device:AN_DEVICE,
  counts:{annots:L.length,annots_deleted:L.filter(a=>a.deleted).length,word_notes:studyNotes().length},annots:L,word_notes:studyNotes()})); }
function exportBackup(){ return backupObject().then(B=>{ const txt=JSON.stringify(B,null,1), name=`milal-백업-${B.exported_at.slice(0,10)}.json`; const url=URL.createObjectURL(new Blob([txt],{type:"application/json"}));
  const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },500); window.__lastBackup={name,txt}; toast(`백업을 내려받았습니다 (기록 ${B.counts.annots}건, 낱말 메모 ${B.counts.word_notes}건).`); return B; }); }
const AN_KINDS=["word","verse","atom","range","note","mark"];
function annotValid(a){ if(!a||typeof a!=="object") return "형식 아님"; if(typeof a.id!=="string"||!a.id) return "id 없음"; if(!AN_KINDS.includes(a.kind)) return "종류 모름"; const A=a.anchor; if(!A||typeof A!=="object") return "자리 없음";
  if(!(Number.isInteger(A.book)&&A.book>=1&&A.book<=39&&Number.isInteger(A.ch)&&Number.isInteger(A.vs))) return "자리(책·장·절) 이상"; if(!Array.isArray(A.word_ids)||!Array.isArray(A.clause_atom_ids)) return "낱말·절 원자 번호 없음";
  if(!Number.isInteger(a.rev)||a.rev<1) return "rev 이상"; if(!Number.isInteger(a.updated)) return "updated 이상"; if(a.kind==="mark"&&!["hl","ul","br"].includes(a.style)) return "표시 종류 모름"; return ""; }
const anBody=a=>JSON.stringify({o:a.observation||"",i:a.interpretation||"",t:a.tags||[],s:a.style||"",c:a.color||"",d:!!a.deleted,m:a.milal_ref||null});
/* 복원 계획 세우기(아직 저장 안 함): 들어온 기록마다 add / update / skip_older / skip_deleted / same / conflict / invalid */
function restorePlan(B){ if(!B||B.schema!=="MILALWV-BACKUP-1"||!Array.isArray(B.annots)) throw new Error("MILALWV 백업 파일(JSON)이 아닙니다");
  return anAllRaw().then(L=>{ const cur=new Map(L.map(a=>[a.id,a])); const plan={add:[],update:[],same:[],skip_older:[],skip_deleted:[],conflict:[],invalid:[],word_add:[]}; const seen=new Set();
    for(const a of B.annots){ const why=annotValid(a); if(why){ plan.invalid.push({a,why}); continue; } if(seen.has(a.id)){ plan.invalid.push({a,why:"백업 안에 같은 id 가 둘"}); continue; } seen.add(a.id);
      const c=cur.get(a.id); if(!c){ plan.add.push(a); continue; }
      if(c.deleted&&!a.deleted){ plan.skip_deleted.push(a); continue; }
      if(a.rev>c.rev){ plan.update.push(a); continue; } if(a.rev<c.rev){ plan.skip_older.push(a); continue; }
      if(anBody(a)===anBody(c)) plan.same.push(a); else plan.conflict.push({a,c}); }
    const have=new Set(studyNotes().map(n=>n.t)); for(const n of (B.word_notes||[])){ if(n&&Number.isInteger(n.t)&&n.b&&!have.has(n.t)) plan.word_add.push(n); }
    return plan; }); }
function restoreApply(plan){ const now=Date.now(); const writes=[...plan.add,...plan.update].map(a=>Object.assign({},a));
  for(const {a,c} of plan.conflict){ const cp=Object.assign({},a,{id:a.id+"~r"+now.toString(36),key:a.key,rev:1,device:AN_DEVICE,created:a.created||now,updated:now,deleted:false,tags:[...(a.tags||[]),"복원충돌"],
      observation:`⟪복원 충돌 사본 · 원본 id ${a.id} · rev ${a.rev} 같음, 내용 다름 · ${new Date(now).toLocaleString("ko-KR")}⟫\n`+(a.observation||"")}); writes.push(cp); }
  return anTx("readwrite",st=>{ for(const w of writes) st.put(w); }).then(()=>{ if(plan.word_add.length) saveStudyNotes(studyNotes().concat(plan.word_add)); return anAll(); }).then(()=>({written:writes.length,word_added:plan.word_add.length})); }
function restoreBackupText(txt){ let B; try{ B=JSON.parse(txt); }catch(e){ toast("JSON 을 읽지 못했습니다."); return Promise.resolve(); }
  return restorePlan(B).then(plan=>new Promise(res=>{ const n=k=>plan[k].length;
    sheet("백업 복원 — 미리 보기",`<p class="lead">백업한 때: ${esc(B.exported_at?new Date(B.exported_at).toLocaleString("ko-KR"):"?")} · 기록 ${B.annots.length}건 · 낱말 메모 ${(B.word_notes||[]).length}건${B.device&&B.device!==AN_DEVICE?" · 다른 기기에서 만든 백업":""}</p>
      <ul class="bklist"><li>새로 들어올 기록: <b>${n("add")}</b></li><li>더 새 판(rev 큼)으로 고쳐질 기록: <b>${n("update")}</b></li><li>이미 같음: ${n("same")}</li><li>기기 쪽이 더 새 것이라 건너뜀: ${n("skip_older")}</li><li>기기에서 지운 것은 되살리지 않음: ${n("skip_deleted")}</li>
      <li>rev 같은데 내용 다름 → 기존 것 두고 <b>충돌 사본 ${n("conflict")}</b>건 따로 보존</li><li>형식이 맞지 않아 건너뜀: ${n("invalid")}${n("invalid")?" ("+esc(plan.invalid.slice(0,3).map(x=>x.why).join(", "))+")":""}</li><li>낱말 메모 새로 들어올 것: ${n("word_add")}</li></ul>
      <p class="lead">기존 기록은 지워지거나 덮어써서 사라지지 않습니다(더 새 판으로 바뀌는 것만). 복원 전에 지금 상태를 백업해 두면 되돌릴 수 있습니다.</p>
      <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn small ghost" id="bkNow">지금 상태 먼저 백업</button><button class="sbtn" id="bkGo" style="width:auto;margin:0;padding:10px 18px">복원하기</button></div>`);
    const root=document.getElementById("sheetRoot"); root.querySelector("#bkNow").onclick=()=>exportBackup();
    root.querySelector("#bkGo").onclick=()=>restoreApply(plan).then(r=>{ root.innerHTML=""; toast(`복원했습니다: 기록 ${r.written}건 (충돌 사본 ${n("conflict")}), 낱말 메모 ${r.word_added}건.`); window.__lastRestore={plan:Object.fromEntries(Object.keys(plan).map(k=>[k,plan[k].length])),r}; render(); res(r); }).catch(e=>{ toast("복원하지 못했습니다: "+e.message); res(null); }); }));
}
