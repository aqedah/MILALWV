/* ===== 연구 기록(주석): 절·절 원자 메모, 관찰과 해석을 나눠 적는다. docs/NOTES_STORAGE_DESIGN.md
   - 기기 저장: IndexedDB "milal-annots" (localStorage 아님 — 용량). Firestore 동기화는 규칙 승인 뒤(작업 E).
   - 본문 자리는 BHSA 번호로 못 박는다. MILAL 관계는 참조만 저장하고 절대 고치지 않는다.
   - 낱말 메모(milal-study-notes)는 그대로 둔다. 여기로 옮기지 않는다. ===== */
const AN_DB="milal-annots", AN_STORE="annots";
let anDB=null;
function anOpen(){ if(anDB) return Promise.resolve(anDB); return new Promise((res,rej)=>{ if(!window.indexedDB){ rej(new Error("IndexedDB 없음")); return; }
  const rq=indexedDB.open(AN_DB,1); rq.onupgradeneeded=()=>{ const db=rq.result; if(!db.objectStoreNames.contains(AN_STORE)){ const st=db.createObjectStore(AN_STORE,{keyPath:"id"}); st.createIndex("book","anchor.book",{unique:false}); st.createIndex("updated","updated",{unique:false}); } };
  rq.onsuccess=()=>{ anDB=rq.result; res(anDB); }; rq.onerror=()=>rej(rq.error); }); }
function anTx(mode,fn){ return anOpen().then(db=>new Promise((res,rej)=>{ const tx=db.transaction(AN_STORE,mode), st=tx.objectStore(AN_STORE); let out; try{ out=fn(st); }catch(e){ rej(e); return; } tx.oncomplete=()=>res(out&&out.result!==undefined?out.result:out); tx.onerror=()=>rej(tx.error); })); }
const anId=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
let AN_CACHE=null; /* 전체 목록(지운 것 제외) — 화면용 */
function anAll(){ return anTx("readonly",st=>st.getAll()).then(L=>{ AN_CACHE=(L||[]).filter(a=>!a.deleted).sort((x,y)=>y.updated-x.updated); return AN_CACHE; }); }
function anSave(a){ a.updated=Date.now(); if(!a.created) a.created=a.updated; if(!a.id) a.id=anId(); return anTx("readwrite",st=>st.put(a)).then(()=>anAll()).then(()=>{ if(window.onAnnotSaved) try{ onAnnotSaved(a); }catch(e){} return a; }); }
/* 지움은 표시만(동기화에서 되살아나지 않게 묘비 유지) */
function anDelete(id){ return anTx("readwrite",st=>{ const g=st.get(id); g.onsuccess=()=>{ const a=g.result; if(a){ a.deleted=true; a.updated=Date.now(); st.put(a); } }; }).then(()=>anAll()).then(()=>{ if(window.onAnnotDeleted) try{ onAnnotDeleted(id); }catch(e){} }); }
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
function openAnnotEditor(kind,ref,existing){ const anchor=existing?existing.anchor:(kind==="atom"?anchorAtom(ref):anchorVerse(ref)); const key=existing?existing.key:anKey(kind,anchor);
  const b=anchor.book, st=window.ML&&ML[b]; let milal=null;
  if(!existing&&st&&st.state==="ok"&&kind==="atom"){ const m=milalForAtom(b,ref); if(m){ const ids=[...m.o.inRel,...m.o.outRel].map(r=>r.id); if(ids.length) milal={stage:st.data.source.milal.stage,file_status:st.data.file_status,network_sha256:st.data.source.milal.network_sha256||"",relation_ids:ids}; } }
  const ex=existing||{};
  sheet((existing?"메모 고치기":"메모 쓰기")+" · "+PLAN.abbr[b-1]+" "+anchor.ch+":"+anchor.vs,`<p class="lead" style="margin:0 0 4px">${kind==="atom"?"절 원자":"절"} · BHSA clause_atom ${anchor.clause_atom_ids.join(", ")}</p><p class="heb svheb" style="margin:0 0 8px">${esc(anchor.heb)}</p>
    <label class="anlab">관찰 <small>본 것 — 본문·문법·표지에서 확인한 사실</small></label><textarea id="anObs" rows="3" placeholder="예: 와이크톨이 끊기고 명사문이 온다">${esc(ex.observation||"")}</textarea>
    <label class="anlab">해석 <small>내 결론 — 관찰에서 이끌어 낸 뜻</small></label><textarea id="anInt" rows="3" placeholder="예: 서술자가 장면을 멈추고 배경을 알린다">${esc(ex.interpretation||"")}</textarea>
    <label class="anlab">표시 <small>쉼표로</small></label><input id="anTags" type="text" value="${esc((ex.tags||[]).join(", "))}" placeholder="전환, 반복">
    ${milal?`<label class="anchk"><input type="checkbox" id="anRef" checked> 보고 있던 MILAL 관계 ${milal.relation_ids.length}개를 참조로 함께 저장 (${esc(milal.stage)}${milal.file_status==="TEST_ONLY"?" · 시험 자료":""}) — 참조일 뿐, MILAL 판정을 바꾸지 않습니다</label>`:ex.milal_ref?`<p class="lead">MILAL 참조: ${esc(ex.milal_ref.stage)} · 관계 ${ex.milal_ref.relation_ids.length}개</p>`:""}
    <div class="row" style="justify-content:space-between"><span>${existing?`<button class="btn small ghost" id="anDel">지우기</button>`:""}</span><button class="sbtn" id="anSave" style="width:auto;margin:0;padding:10px 18px">저장</button></div>`);
  const root=document.getElementById("sheetRoot");
  root.querySelector("#anSave").onclick=()=>{ const obs=root.querySelector("#anObs").value.trim(), it=root.querySelector("#anInt").value.trim(); if(!obs&&!it){ toast("관찰이나 해석 중 하나는 적어 주세요."); return; }
    const a=Object.assign({},ex,{kind,key,anchor,observation:obs,interpretation:it,tags:root.querySelector("#anTags").value.split(",").map(s=>s.trim()).filter(Boolean)});
    if(milal&&root.querySelector("#anRef")&&root.querySelector("#anRef").checked) a.milal_ref=milal;
    anSave(a).then(()=>{ root.innerHTML=""; toast(existing?"메모를 고쳤습니다.":"메모를 저장했습니다."); render(); }).catch(e=>toast("저장하지 못했습니다: "+e.message)); };
  const d=root.querySelector("#anDel"); if(d) d.onclick=()=>{ if(!confirm("이 메모를 지울까요?")) return; anDelete(ex.id).then(()=>{ root.innerHTML=""; toast("지웠습니다."); render(); }); }; }
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
anOpen().then(()=>anAll()).catch(()=>{});
