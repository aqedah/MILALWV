/* ===== MILAL 판정 읽기·겹쳐 보기 (MILALWV-IF-1, docs/MILAL_INTERFACE_DRAFT.md) =====
   MILAL은 판정하고 여기서는 보여 주기만 한다. 받은 파일을 되쓰지 않는다.
   세 출처를 구별한다: BHSA 원자료(선·tab·typ·domain) / 앱 관찰 후보(색·표지) / MILAL 판정(이 파일) */
const MILAL_FILES=[{book:18,url:"test/milal_test_only_job31-38.json"}];   /* 책 번호(개역 순) → 파일. 실제 결과가 오면 여기만 바꾼다 */
const MK_KO={SUBORDINATE:"종속",PARALLEL:"병행",FRAME_CONTENT:"틀–내용",CONTINUATION:"이어짐",CLOSURE:"종결",MEMBERSHIP:"포함"};
const MS_KO={CONFIRMED:"확정",PROVISIONAL:"잠정",COMPETING:"경쟁",UNASSIGNED:"미배정"};
const MG_KO={LOCAL_SPEECH_UNIT:"발언 단위",CONDITIONAL_RESPONSE_UNIT:"조건부 응답 단위",UNRESOLVED_SCOPE_FRAGMENT:"범위 미결 조각",NARRATIVE_REPORT_SEGMENT_HYPOTHESIS:"서술 보고 구간(가설)",ENCLOSING_SPEECH_HYPOTHESIS:"큰 발언 가설",SURFACE_EVENT_ANCHOR:"표면 사건 표지",UNCOVERED_SOURCE_CONTEXT:"덮이지 않은 출처 문맥"};
const MI_KO={ALTERNATIVE_SET:"대안 묶음",UNRESOLVED:"미결",SCOPE_CONFLICT:"범위 충돌",UNASSIGNED_CLAUSE:"미배정 절",NO_DIRECT_RELATION:"직접 연결 없음(판정)"};
const ML={}; /* book → {state:"loading"|"ok"|"err", data, byCid, msg} */
/* 자료 상태 배지: 시험 자료 / 승인 전 / 승인됨 — '검증된 MILAL 자료'는 연구자 승인(APPROVED) 뒤에만 */
function milalBadgeFile(st){ if(!st||st.state!=="ok") return ""; if(st.test) return '<em class="mb mb-t">시험 자료</em>'; return st.review==="APPROVED"?'<em class="mb mb-c">연구자 승인</em>':'<em class="mb mb-i">승인 전 — 검증 대기</em>'; }

function milalFile(b){ return MILAL_FILES.find(f=>f.book===b); }
function milalState(b){ return ML[b]; }
/* 절(cid) → MILAL 절 id(ccn) 역색인, 절 → 첫 절 원자 */
function milalIndex(){ if(SD.ccnMap&&SD.cFirstA) return; SD.ccnMap=new Map(); for(let c=0;c<SD.ccn.length;c++) SD.ccnMap.set(SD.ccn[c],c);
  SD.cFirstA=new Int32Array(SD.ccn.length).fill(-1); for(let i=0;i<SD.wc.length;i++){ const c=SD.wc[i]; if(SD.cFirstA[c]<0) SD.cFirstA[c]=SD.wa[i]; } }
function milalLoad(b){ const f=milalFile(b); if(!f||!SD||!SD.ccn) return null; if(ML[b]) return ML[b];
  const st=ML[b]={state:"loading"};
  fetch(f.url+"?v="+(window.STUDY_V||"1")).then(r=>{ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }).then(D=>{
    const chk=milalCheck(D); if(chk.fatal.length){ st.state="err"; st.msg=chk.fatal.join(" · "); render(); return; }
    milalIndex();
    const byCid=new Map(), nodeCid=new Map(), unmatched=[];
    for(const n of D.nodes){ const c=SD.ccnMap.get(+n.id); if(c==null){ unmatched.push(n.id); continue; } nodeCid.set(n.id,c); byCid.set(c,{node:n,inRel:[],outRel:[],groups:[],issues:[],badWords:false}); }
    /* 낱말 대조(V5): 절의 BHSA 낱말 수가 앱의 절 낱말 수와 같은지 */
    /* V5: 절의 BHSA 낱말 번호 전체 대조 (앱 낱말 i → 책 첫 슬롯 bs[b-1] + 책 안 순번) */
    const slots=new Map(); if(SD.bs){ for(const v of SD.V){ const b=v[0], bf=SD.book[b].a!=null?SD.V[SD.book[b].a][5]:0; for(let i=v[5];i<v[5]+v[6];i++){ const c=SD.wc[i]; if(byCid.has(c)){ (slots.get(c)||slots.set(c,[]).get(c)).push(SD.bs[b-1]+(i-bf)); } } } }
    let badN=0; for(const [c,o] of byCid){ const got=slots.get(c)||[]; const want=o.node.word_ids; if(got.length!==want.length||got.some((x,k)=>x!==want[k])){ const a=new Set(got); if(got.length!==want.length||want.some(x=>!a.has(x))){ o.badWords=true; badN++; } } }
    /* 실제 출력은 불일치 0건이 완료 기준. 시험 자료만 10% 까지 봐준다 */
    if(D.file_status==="MILAL_OUTPUT"?badN>0:badN>byCid.size*0.1){ const bad=[...byCid.values()].filter(o=>o.badWords).slice(0,5).map(o=>o.node.ch+":"+o.node.vs+"(#"+o.node.id+")"); st.state="err"; st.msg=`낱말 번호 대조 실패 ${badN}절 (예: ${bad.join(", ")}) — 자료판이 다르거나 변환이 어긋남. 연구자 확인 전에는 읽지 않음`; render(); return; }
    if(unmatched.length&&D.file_status==="MILAL_OUTPUT"){ st.state="err"; st.msg=`앱 자료에 없는 절 id ${unmatched.length}개 (예: ${unmatched.slice(0,3).join(", ")})`; render(); return; }
    const gid=new Map(D.groups.map(g=>[g.id,g])), ev=new Map(D.evidence.map(e=>[e.id,e]));
    /* 절 끝점은 절에, 묶음 끝점은 묶음에 붙인다 (묶음 관계를 첫 절에 붙이면 뜻이 어긋난다) */
    const endCids=e=>e.type==="clause"?[nodeCid.get(e.id)]:e.type==="clause_set"?e.ids.map(i=>nodeCid.get(i)):[];
    const byGid=new Map(D.groups.map(g=>[g.id,{inRel:[],outRel:[],issues:[]}]));
    for(const r of D.relations){ for(const c of endCids(r.target)) if(c!=null&&byCid.has(c)) byCid.get(c).inRel.push(r); for(const c of endCids(r.source)) if(c!=null&&byCid.has(c)) byCid.get(c).outRel.push(r);
      if(r.target.type==="group"&&byGid.has(r.target.id)) byGid.get(r.target.id).inRel.push(r); if(r.source.type==="group"&&byGid.has(r.source.id)) byGid.get(r.source.id).outRel.push(r); }
    for(const g of D.groups){ g.members.forEach((m,i)=>{ const c=nodeCid.get(m); if(c!=null&&byCid.has(c)) byCid.get(c).groups.push({g,first:i===0,last:i===g.members.length-1}); }); }
    for(const s of D.issues){ const ab=Array.isArray(s.about)?s.about:s.about?[s.about]:[]; const cs=new Set(), gs=new Set();
      ab.forEach(e=>{ if(e.type==="group") gs.add(e.id); else endCids(e).forEach(c=>c!=null&&cs.add(c)); });
      (s.options||[]).forEach(o=>{ if(nodeCid.has(o)) cs.add(nodeCid.get(o)); else if(gid.has(o)) gs.add(o); });
      cs.forEach(c=>byCid.has(c)&&byCid.get(c).issues.push(s)); gs.forEach(g=>byGid.has(g)&&byGid.get(g).issues.push(s)); }
    /* BHSA 원 자료(native_relations): 절 원자 번호로 색인 — MILAL 판정과 다른 층 */
    const natByAtom=new Map(); for(const x of D.native_relations||[]) natByAtom.set(x.clause_atom,x);
    /* 확정(CONFIRMED) 계층 관계만으로 깊이 계산. BHSA tab 과 별개. 잠정·경쟁은 깊이에 넣지 않는다 */
    const parent=new Map(); const key=e=>e.type==="group"?"g:"+e.id:"c:"+e.id;
    for(const r of D.relations) if(r.family==="HIERARCHY"&&r.status==="CONFIRMED"&&r.target.type!=="clause_set"&&r.source.type!=="clause_set") parent.set(key(r.target),key(r.source));
    const groupsOfClause=new Map(); for(const g of D.groups) if(g.kind!=="ENCLOSING_SPEECH_HYPOTHESIS") for(const m of g.members) (groupsOfClause.get(m)||groupsOfClause.set(m,[]).get(m)).push(g.id);
    const memo=new Map(); const depth=(k,seen)=>{ if(memo.has(k)) return memo.get(k); if(seen.has(k)) return 0; seen.add(k); let d=0; const p=parent.get(k); if(p) d=1+depth(p,seen); else if(k.startsWith("c:")){ for(const gid0 of groupsOfClause.get(k.slice(2))||[]){ const pg=parent.get("g:"+gid0); if(pg){ d=Math.max(d,1+depth(pg,seen)); } } } memo.set(k,d); return d; };
    const cdepth=new Map(); for(const n of D.nodes){ const d=depth("c:"+n.id,new Set()); if(d>0) cdepth.set(n.id,d); }
    Object.assign(st,{state:"ok",data:D,byCid,byGid,gid,ev,nodeCid,unmatched,badN,natByAtom,cdepth,warn:chk.warn,test:D.file_status==="TEST_ONLY",review:(D.review&&D.review.status)||"UNREVIEWED"}); render();
  }).catch(e=>{ st.state="err"; st.msg=String(e.message||e); render(); });
  return st; }
/* 가벼운 검증 (V2·V3·V6·V7·V9; 전체 검사는 pipeline/milal_check.py) */
function milalCheck(D){ const fatal=[], warn=[];
  if(D.schema!=="MILALWV-IF-1") fatal.push("규격이 MILALWV-IF-1이 아님");
  if(D.source?.bhsa_version!=="2021") fatal.push("BHSA 판이 2021이 아님");
  const N=new Set((D.nodes||[]).map(n=>n.id)), G=new Set((D.groups||[]).map(g=>g.id)), E=new Set((D.evidence||[]).map(e=>e.id));
  const okEnd=e=>e.type==="clause"?N.has(e.id):e.type==="group"?G.has(e.id):e.ids.every(i=>N.has(i));
  let bad=0, badE=0; const par=new Map(), adj=new Map(); const key=e=>e.type+":"+(e.id||e.ids.join(","));
  for(const r of D.relations||[]){ if(!okEnd(r.source)||!okEnd(r.target)) bad++; for(const x of r.evidence_ids||[]) if(!E.has(x)) badE++;
    if(r.family==="HIERARCHY"&&r.status==="CONFIRMED"){ const s=key(r.source), t=key(r.target); (par.get(t)||par.set(t,new Set()).get(t)).add(s); (adj.get(s)||adj.set(s,new Set()).get(s)).add(t); } }
  if(bad) fatal.push(`끝점이 없는 관계 ${bad}`); if(badE) fatal.push(`없는 근거를 가리키는 관계 ${badE}`);
  for(const [t,ss] of par) if(ss.size>1){ fatal.push("확정 관계에 중복 모절: "+t); break; }
  const col=new Map(); const dfs=u=>{ col.set(u,1); for(const v of adj.get(u)||[]){ if(col.get(v)===1) return true; if(!col.has(v)&&dfs(v)) return true; } col.set(u,2); return false; };
  for(const u of adj.keys()) if(!col.has(u)&&dfs(u)){ fatal.push("확정 관계에 순환"); break; }
  for(const s of D.issues||[]) if(s.kind==="NO_DIRECT_RELATION"&&!(s.basis&&s.basis.kind&&s.record)){ fatal.push("근거 없는 '직접 연결 없음'"); break; }
  if(D.file_status==="MILAL_OUTPUT"){ const m=D.source?.milal||{}; if(!(m.commit&&m.network_sha256&&D.source?.generated_at)) fatal.push("실제 출력인데 커밋·해시·생성 시점이 없음"); }
  if(!Array.isArray(D.native_relations)) fatal.push("native_relations 없음(2판 규격)");
  return {fatal,warn}; }

/* 줄(절 원자 aid)에 붙일 MILAL 요약: 들어오는 계층 관계 (이 절이 기대는 모절) */
function milalForAtom(b,aid){ const st=ML[b]; if(!st||st.state!=="ok") return null; if(!SD.ccnMap||!SD.cFirstA) milalIndex(); const cid=SD.wc[atomFirstWord(aid)]; const o=st.byCid.get(cid); if(!o) return null;
  const firstAtom=SD.cFirstA[cid]===aid; return {o,cid,firstAtom}; }
function atomFirstWord(aid){ if(!SD.aFirstW){ SD.aFirstW=new Int32Array(SD.can.length).fill(-1); for(let i=0;i<SD.wa.length;i++) if(SD.aFirstW[SD.wa[i]]<0) SD.aFirstW[SD.wa[i]]=i; } return SD.aFirstW[aid]; }
function milalBadge(b,aid){ const m=milalForAtom(b,aid); if(!m||!m.firstAtom) return ""; const H=m.o.inRel.filter(r=>r.family==="HIERARCHY"&&!r.rule.startsWith("BHSA"));
  const c=H.find(r=>r.status==="CONFIRMED"), p=H.find(r=>r.status==="PROVISIONAL"), q=H.filter(r=>r.status==="COMPETING");
  let t=""; if(c) t=`<em class="mb mb-c">${MK_KO[c.kind]} 확정</em>`; else if(q.length) t=`<em class="mb mb-q">경쟁 ${q.length}</em>`; else if(p) t=`<em class="mb mb-p">${MK_KO[p.kind]} 잠정</em>`;
  const dp=ML[b].cdepth.get(m.o.node.id); if(dp) t+=`<em class="mb mb-d" title="MILAL 확정 관계로 계산한 깊이 (BHSA tab 아님)">M깊이 ${dp}</em>`;
  const iss=m.o.issues.filter(s=>s.kind!=="UNASSIGNED_CLAUSE"); if(iss.length&&!t) t=`<em class="mb mb-i">${MI_KO[iss[0].kind]}</em>`;
  if(m.o.badWords) t+=`<em class="mb mb-x">낱말 불일치</em>`; return t; }
/* 묶음 시작 줄: 머리띠 */
function milalGroupHead(b,aid){ const m=milalForAtom(b,aid); if(!m||!m.firstAtom) return ""; const gs=m.o.groups.filter(x=>x.first&&x.g.kind!=="ENCLOSING_SPEECH_HYPOTHESIS"); if(!gs.length) return "";
  const st=ML[b]; return gs.map(({g})=>{ const G=st.byGid.get(g.id), H=unitMothers(st,g), c=H.find(r=>r.status==="CONFIRMED"), p=H.find(r=>r.status==="PROVISIONAL"), q=H.filter(r=>r.status==="COMPETING"), un=G.issues.find(s=>s.kind==="UNRESOLVED");
    const bd=c?`<em class="mb mb-c">${MK_KO[c.kind]} 확정</em>`:q.length?`<em class="mb mb-q">모절 경쟁 ${q.length}</em>`:p?`<em class="mb mb-p">${MK_KO[p.kind]} 잠정</em>`:un?`<em class="mb mb-i">모절 미결</em>`:`<em class="mb mb-u">모절 자료 없음</em>`;
    return `<div class="mgh"><b>${esc(MG_KO[g.kind]||g.kind)}</b> <small>${esc(g.first)}–${esc(g.last)} · ${g.members.length}절${st.test?" · 시험 자료":""}</small> ${bd}</div>`; }).join(""); }

/* 상세 창: 세 출처를 나눠 보여 준다 */
function openAtomSheet(b,aid){ const w0=atomFirstWord(aid), cid=SD.wc[w0], vi=SD.vOf[w0], typ=SD.TY[SD.ay[aid]], txt=SD.TXT[SD.ax[aid]]||"", m=milalForAtom(b,aid), st=ML[b];
  const words=[]; for(let i=w0;i<SD.wa.length&&SD.wa[i]===aid;i++) words.push(i);
  const heb=words.map(j=>{ const vj=SD.vOf[j]; return sHeb(vj)[j-SD.V[vj][5]]; }).join("").trim();
  const mk=markerKind(words,null,typ), [kcls,klab]=atomKind(typ,txt,mk);
  let h=`<p class="heb svheb" style="margin:0 0 6px">${esc(heb)}</p><p class="lead" style="margin:0 0 8px">${esc(sRef(vi))}</p>`;
  h+=`<div class="src3"><span class="label">BHSA 원자료</span><dl class="rdl"><dt>절 원자 노드</dt><dd>clause_atom ${SD.can?SD.can[aid]:"?"} · clause ${SD.ccn?SD.ccn[cid]:"?"} (BHSA ${SD.bhsa||"2021"})</dd><dt>종류 · 층 · 영역</dt><dd>${esc(typ)} (${esc(TY_FAM(typ)||"")}) · tab ${SD.at[aid]} · ${esc(txt)} · ${esc(DOM_K[SD.DO[SD.cd[cid]]]||SD.DO[SD.cd[cid]])}</dd></dl></div>`;
  h+=`<div class="src3"><span class="label">앱의 관찰 후보 <small>(자동 — 판정 아님)</small></span><dl class="rdl"><dt>표시</dt><dd><i class="k-${kcls} mkdot"></i> ${esc(klab)}${mk?` · 표지 판정: ${esc(mk)}`:""}</dd></dl></div>`;
  if(!milalFile(b)) h+=`<div class="src3"><span class="label">MILAL 판정</span><p class="lead">이 책의 MILAL 자료가 없습니다.</p></div>`;
  else if(!st||st.state!=="ok") h+=`<div class="src3"><span class="label">MILAL 판정</span><p class="lead">${st&&st.state==="err"?"읽지 못했습니다: "+esc(st.msg):"불러오는 중…"}</p></div>`;
  else if(!m) h+=`<div class="src3"><span class="label">MILAL 판정</span><p class="lead">이 절은 자료 범위 밖입니다 (자료 없음 — '연결 없음'이 아니라 '모름').</p></div>`;
  else {
    const {o}=m, D=st.data, lab=r=>`<b>${esc(MK_KO[r.kind]||r.kind)}</b> <em class="mb mb-${r.status[0].toLowerCase()==="c"&&r.status==="CONFIRMED"?"c":r.status==="PROVISIONAL"?"p":r.status==="COMPETING"?"q":"u"}">${esc(MS_KO[r.status]||r.status)}</em>`;
    const endLab=e=>{ if(e.type==="group"){ const g=st.gid.get(e.id); if(!g) return esc(e.id); const c0=st.nodeCid.get(g.members[0]); return `${esc(MG_KO[g.kind]||g.kind)} ${esc(g.first)}–${esc(g.last)}${c0!=null?` <button class="mgo" data-mgo="${SD.cFirstA[c0]}">가기 ›</button>`:""}`; } const ids=e.type==="clause"?[e.id]:e.ids; return ids.map(i=>{ const c=st.nodeCid.get(i); return c!=null?`<button class="mgo" data-mgo="${SD.cFirstA[c]}">${esc(sRef(SD.vOf[atomFirstWord(SD.cFirstA[c])]))} ›</button>`:esc(i); }).join(", "); };
    const relRow=(r,dir)=>{ const evs=(r.evidence_ids||[]).map(id=>st.ev.get(id)).filter(Boolean);
      const arrow=r.kind==="MEMBERSHIP"?(dir==="in"?"← 속한 묶음: ":"→ 구성원: "):r.kind==="PARALLEL"?"↔ 병행: ":r.kind==="CLOSURE"?(dir==="in"?"← 닫는 것: ":"→ 닫히는 것: "):(dir==="in"?"← 모절·틀: ":"→ 자절·내용: ");
      return `<div class="mrel"><div>${lab(r)} ${arrow+endLab(dir==="in"?r.source:r.target)}</div><small>규칙 ${esc(r.rule)} · 출처 ${esc(r.record.table)} #${esc(r.record.id)}${r.extra&&r.extra.rela?" · rela="+esc(r.extra.rela):""}</small>${r.note?`<small>${esc(r.note)}</small>`:""}${evs.length?`<ul class="mev">${evs.map(e=>{ const oc={PASSED:["c","통과"],FAILED:["x","실패"],UNRESOLVED:["u","미결"],HUMAN:["c","연구자"]}[e.outcome]||["u",e.outcome]; const role=e.role?` <em class="mb mb-${e.role==="COUNTEREVIDENCE"?"x":"u"}">${e.role==="COUNTEREVIDENCE"?"반례":e.role==="REQUIRED"?"필수":"보조"}</em>`:""; const obs=(e.observed?.clause_ids||[]).map(i=>{ const c=st.nodeCid.get(i); return c!=null?`<button class="mgo" data-mgo="${SD.cFirstA[c]}">${esc(sRef(SD.vOf[atomFirstWord(SD.cFirstA[c])]))}</button>`:""; }).join(" ");
      return `<li><em class="mb mb-${oc[0]}">${oc[1]}</em>${role} ${esc(e.rule_id)}${e.check?" · "+esc(e.check):""} — ${esc(e.text||"")}${obs?` <span class="mobs">관찰: ${obs}</span>`:""}</li>`; }).join("")}</ul>`:""}</div>`; };
    const mil=r=>true;
    h+=`<div class="src3"><span class="label">MILAL 판정 ${milalBadgeFile(st)}${st.test?" <small>— 실제 판정 아님</small>":st.review!=="APPROVED"?" <small>— 연구자 승인 전</small>":""}</span>`;
    const dp=st.cdepth.get(o.node.id); h+=`<p class="lead" style="margin:2px 0 4px"><b>MILAL 깊이</b> ${dp?dp+" (확정 관계로 계산)":"없음 — 확정된 모절 사슬이 없음"} · <b>BHSA tab</b> ${SD.at[aid]} (원자료 들여쓰기, 모절 판정이 아님)</p>`;
    h+=`<p class="lead" style="margin:2px 0 6px">${esc(D.source.milal.stage)} · 규칙 ${esc(D.source.milal.rules_version)} · ${esc(D.source.generated_at.slice(0,10))}${!st.test&&D.source.milal.commit?` · 커밋 ${esc(D.source.milal.commit.slice(0,8))}`:""}${o.badWords?' · <em class="mb mb-x">낱말 대조 실패</em>':""}</p>`;
    if(o.groups.length){ h+=`<span class="label">속한 묶음</span>`; for(const {g} of o.groups){ const G=st.byGid.get(g.id); h+=`<div class="mrel"><div><b>${esc(MG_KO[g.kind]||g.kind)}</b> ${esc(g.first)}–${esc(g.last)} · ${g.members.length}절${g.roles&&g.roles.introduction&&g.roles.introduction.includes(o.node.id)?" · <b>이 절이 도입</b>":""}</div>${G.inRel.map(r=>`<small>${lab(r)} ${r.kind==="PARALLEL"?"↔":r.kind==="CLOSURE"?"← 닫는 것:":"← 모절·틀:"} ${endLab(r.source)} · 규칙 ${esc(r.rule)}</small>`).join("")}${G.outRel.filter(r=>r.kind!=="MEMBERSHIP").map(r=>`<small>${lab(r)} → ${endLab(r.target)} · 규칙 ${esc(r.rule)}</small>`).join("")}${G.issues.map(s=>`<small><b>${esc(MI_KO[s.kind]||s.kind)}</b>${s.unresolved_checks?" · "+esc(s.unresolved_checks.join(", ")):""}${s.options?" · "+s.options.map(x=>{ const gg=st.gid.get(x); return gg?esc((MG_KO[gg.kind]||gg.kind)+" "+gg.first+"–"+gg.last):esc(x); }).join(" / "):""}</small>`).join("")}</div>`; } }
    const inM=o.inRel, outM=o.outRel;
    if(!inM.length&&!outM.length&&!o.issues.filter(s=>s.kind!=="UNASSIGNED_CLAUSE").length) h+=`<p class="lead">이 절 자체에 대한 MILAL 관계가 없습니다${o.groups.length?" (묶음 단위 관계는 위 '속한 묶음'에)":""}. 자료에 '직접 연결 없음' 판정도 없으므로 <b>모름</b>입니다.</p>`;
    if(inM.length) h+=`<span class="label">이 절에 들어오는 관계</span>`+inM.map(r=>relRow(r,"in")).join("");
    if(outM.length) h+=`<span class="label">이 절에서 나가는 관계</span>`+outM.map(r=>relRow(r,"out")).join("");
    const iss=o.issues; if(iss.length) h+=`<span class="label">미해결·대안</span>`+iss.map(s=>`<div class="mrel"><div><b>${esc(MI_KO[s.kind]||s.kind)}</b>${s.subkind?` · ${esc(s.subkind)}`:""}${s.rule_id?` · 규칙 ${esc(s.rule_id)}`:""}</div>${s.unresolved_checks?`<small>미결 검사: ${esc(s.unresolved_checks.join(", "))}</small>`:""}${s.options?`<small>선택지: ${s.options.map(x=>{ const g=st.gid.get(x); return g?esc((MG_KO[g.kind]||g.kind)+" "+g.first+"–"+g.last):esc(x); }).join(" / ")}</small>`:""}${s.note?`<small>${esc(s.note)}</small>`:""}</div>`).join("");
    h+=`</div>`;
    /* BHSA 원 자료의 mother/rela — 이 절 원자 것만, 판정 아님 */
    const nx=st.natByAtom.get(SD.can[aid]); if(nx){ const mc=nx.mother_clause_id&&st.nodeCid.get(nx.mother_clause_id); h+=`<div class="src3"><span class="label">BHSA 원 자료의 mother/rela <small>(원 데이터 — MILAL 판정 아님)</small></span><dl class="rdl"><dt>이 절 원자의 mother</dt><dd>clause_atom ${nx.mother_clause_atom}${mc!=null?` · ${esc(sRef(SD.vOf[atomFirstWord(SD.cFirstA[mc])]))} <button class="mgo" data-mgo="${SD.cFirstA[mc]}">가기 ›</button>`:""}</dd><dt>rela</dt><dd>${esc(nx.rela)}${nx.rela_level==="clause"?" (절 수준 값)":""}</dd></dl></div>`; } }
  sheet("절 원자 · "+sRef(vi),`<div class="sdetail sheetd">${h}</div>`);
  document.querySelectorAll("#sheetRoot [data-mgo]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); document.getElementById("sheetRoot").innerHTML=""; gotoAtom(b,+x.dataset.mgo); }); }
/* 절 원자로 이동: 다른 장이면 범위를 바꾸고 구조 화면에서 그 줄을 비춘다 */
function gotoAtom(b,aid,noBack){ if(!SD.ccnMap||!SD.cFirstA) milalIndex(); const S=view.st, w0=atomFirstWord(aid), vi=SD.vOf[w0], [bb,c,v]=SD.V[vi];
  if(!noBack) S.back={R:S.R&&{...S.R},vc:S.vc,rd:S.rd,sv:S.sv,aid:S.curAid,y:scrollY,label:S.R?`${PLAN.abbr[S.R.b-1]} ${S.vc}장(${S.sv==="map"?"지도":S.sv==="speech"?"발화":"계층"})`:""};
  if(!S.R||S.R.b!==bb||c<S.R.c1||c>S.R.c2) setRange({b:bb,c1:c,c2:c}); S.vc=c; S.mode="verse"; S.rd="struct"; S.sv="tree"; S.milalOn=true; S.curAid=aid; render();
  setTimeout(()=>{ const el=document.querySelector(`.stl [data-sat="${aid}"]`)?.closest(".stl"); if(el){ el.scrollIntoView({block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),2200); } },60); }

function goBack(){ const S=view.st, B=S.back; if(!B) return; S.back=null; if(B.R){ setRange(B.R); S.vc=B.vc; } S.mode="verse"; S.rd=B.rd||"struct"; S.sv=B.sv||"tree"; render(); if(B.aid!=null){ setTimeout(()=>{ const el=document.querySelector(`.stl [data-sat="${B.aid}"]`)?.closest(".stl"); if(el){ el.scrollIntoView({block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),2200); } else scrollTo({top:B.y||0}); },60); } else scrollTo({top:B.y||0}); }
/* ===== 발화 보기: BHSA domain/txt(원자료) + MILAL 묶음(판정) ===== */
function speechView(b,c){ const vis=SD.ch.get(b+"-"+c)||[]; const atoms=[], seen=new Set();
  for(const vi of vis){ const [, , , , ,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ const a=SD.wa[j]; if(!seen.has(a)){ seen.add(a); atoms.push({a,vi,w0:j}); } } }
  const st=ML[b]; let h=`<p class="rdnote">띠의 들여쓰기는 BHSA의 영역(서술 N / 인물의 말 Q / 담화 D)과 인용 깊이(원자료)입니다. 머리띠와 '도입/내용' 표시는 MILAL이 묶은 발언 단위(판정)입니다. 발화자 이름은 자료에 없어 붙이지 않습니다. ${milalBadgeFile(st)}</p><div class="spv">`;
  let prev=null, run=[], out=[];
  const flush=()=>{ if(!run.length) return; out.push(run); run=[]; };
  for(const at of atoms){ const txt=SD.TXT[SD.ax[at.a]]||"", dom=SD.DO[SD.cd[SD.wc[at.w0]]], q=(txt.match(/Q/g)||[]).length, key=dom+q;
    const gh=milalGroupHead(b,at.a); if(gh){ flush(); out.push({head:gh}); }
    if(key!==prev){ flush(); prev=key; } run.push({at,dom,q,txt}); }
  flush();
  for(const blk of out){ if(blk.head){ h+=blk.head; continue; }
    const {dom,q}=blk[0]; const v0=SD.V[blk[0].at.vi][2], v1=SD.V[blk[blk.length-1].at.vi][2];
    const words=[]; for(const {at} of blk){ for(let i=at.w0;i<SD.wa.length&&SD.wa[i]===at.a;i++) words.push(i); }
    const heb=words.slice(0,14).map(j=>{ const vj=SD.vOf[j]; return sHeb(vj)[j-SD.V[vj][5]]; }).join("").trim()+(words.length>14?" …":"");
    /* MILAL 묶음의 역할(도입/내용)은 판정 — 원자료(영역)와 다른 줄에 표시 */
    let role=""; if(st&&st.state==="ok"){ const m0=milalForAtom(b,blk[0].at.a); if(m0){ for(const {g} of m0.o.groups){ if(g.kind==="ENCLOSING_SPEECH_HYPOTHESIS") continue; const R=g.roles||{}; if((R.introduction||[]).includes(m0.o.node.id)) role="도입"; else if((R.content||[]).includes(m0.o.node.id)) role="내용"; if(role) break; } } }
    h+=`<button class="spb d-${dom==="N"?"n":dom==="Q"?"q":"d"}" style="--qd:${Math.min(q,4)}" data-sat="${blk[0].at.a}"><span class="spm"><b>${esc(DOM_K[dom]||dom)}${q>1?` ${q}단`:""}</b><small>${v0===v1?v0:v0+"–"+v1}절 · ${blk.length}줄</small>${role?`<em class="mb ${role==="도입"?"mb-c":"mb-p"}" title="MILAL 묶음의 역할(판정)">${role}</em>`:""}</span><span class="heb">${esc(heb)}</span></button>`; }
  return h+`</div>`; }

/* 단위의 모절 후보: 단위 밖에서 들어오는 계층 관계만 (단위 안 도입→내용은 그 단위의 모절이 아님) */
function unitMothers(st,g){ return st.byGid.get(g.id).inRel.filter(r=>r.family==="HIERARCHY"&&!(r.source.type==="clause"&&g.members.includes(r.source.id))); }
/* ===== 발언·단위 지도: 장을 넘는 구조를 묶음(MILAL 판정) 순서로. 검증되지 않은 사이는 선을 긋지 않고 '순서만'으로 ===== */
function unitMapView(b){ const S=view.st, f=milalFile(b); if(!f) return `<section class="sec"><p class="lead">이 책에는 MILAL 자료가 없어 지도를 그릴 수 없습니다. 지도는 MILAL이 묶은 발언 단위로 그립니다.</p></section>`;
  const st=milalLoad(b); if(!st||st.state==="loading") return `<section class="sec"><p class="lead">MILAL 자료 불러오는 중…</p></section>`;
  if(st.state==="err") return `<section class="sec"><p class="lead">MILAL 자료를 읽지 않음: ${esc(st.msg)}</p></section>`;
  const D=st.data, base=D.groups.filter(g=>g.kind!=="ENCLOSING_SPEECH_HYPOTHESIS"&&g.kind!=="SURFACE_EVENT_ANCHOR"&&g.kind!=="UNCOVERED_SOURCE_CONTEXT");
  const pos=g=>{ const c=st.nodeCid.get(g.members[0]); return c!=null?SD.cFirstA[c]:1e9; }; base.sort((x,y)=>pos(x)-pos(y));
  const sc=D.source.scope, lab=`${PLAN.full[b-1]} ${sc.chapters?sc.chapters[0]+"–"+sc.chapters[1]+"장":""}`;
  let h=`<div class="srcnote"><span>이 지도는 <b>MILAL 묶음(판정)</b>을 본문 순서로 늘어놓은 것입니다. 단위 사이에 <b>확정된 계층 관계</b>가 있을 때만 선을 긋고, 없으면 순서만 보입니다. ${milalBadgeFile(st)}</span><span class="lead">범위: ${esc(lab)} · 단위 ${base.length}개 · 누르면 그 장의 구조로 갑니다.</span><span><button class="mtog" data-mapcand="${S.mapCand?"0":"1"}">${S.mapCand?"후보 관계 숨기기":"후보 관계 보기 (잠정·경쟁, 점선)"}</button></span></div><div class="umap">`;
  const relBetween=(a,c)=>{ const G=st.byGid.get(c.id); return G.inRel.filter(r=>r.family==="HIERARCHY"&&r.source.type==="group"&&r.source.id===a.id); };
  const pairPar=(a,c)=>{ const ia=(a.roles&&a.roles.introduction||[])[0], ic=(c.roles&&c.roles.introduction||[])[0]; if(!ia||!ic) return null; const o=st.byCid.get(st.nodeCid.get(ia)); return o&&o.outRel.find(r=>r.kind==="PARALLEL"&&r.target.type==="clause"&&r.target.id===ic); };
  const curC=S.vc; 
  base.forEach((g,i)=>{ const G=st.byGid.get(g.id), H=unitMothers(st,g), c=H.find(r=>r.status==="CONFIRMED"), q=H.filter(r=>r.status==="COMPETING"), p=H.find(r=>r.status==="PROVISIONAL"), un=G.issues.find(s=>s.kind==="UNRESOLVED");
    const c0=st.nodeCid.get(g.members[0]), aid=c0!=null?SD.cFirstA[c0]:null; const [ch0]=g.first.split(":").map(Number), [ch1]=g.last.split(":").map(Number); const here=curC>=ch0&&curC<=ch1;
    const dom=(()=>{ const cnt={N:0,Q:0,D:0}; g.members.forEach(m=>{ const cc=st.nodeCid.get(m); if(cc!=null){ const d=SD.DO[SD.cd[cc]]; cnt[d in cnt?d:"D"]++; } }); const t=g.members.length||1; return cnt.N/t>0.6?"서술":cnt.Q/t>0.6?"인물의 말":"섞임"; })();
    if(i>0){ const a=base[i-1], R=relBetween(a,g), rc=R.find(r=>r.status==="CONFIRMED"), rq=R.filter(r=>r.status==="COMPETING"), rp=R.find(r=>r.status==="PROVISIONAL"), par=pairPar(a,g);
      let k="none", t="본문 순서 · 직접 관계 미검증"; if(rc){ k="c"; t=`${MK_KO[rc.kind]} 확정`; }
      else if(S.mapCand){ if(rq.length){ k="q"; t=`후보: ${MK_KO[rq[0].kind]} 경쟁 ${rq.length}`; } else if(rp){ k="p"; t=`후보: ${MK_KO[rp.kind]} 잠정`; } }
      else if(rq.length||rp){ t+=` · 후보 ${rq.length+(rp?1:0)} (숨김)`; }
      /* '직접 연결 없음' 판정은 about=[모절 후보, 자절]이 각각 앞 단위·이 단위에 속할 때만 이 사이에 표시 */
      const inU=(e,u)=>e.type==="group"?e.id===u.id:u.members.includes(e.id);
      const nd=D.issues.find(s=>s.kind==="NO_DIRECT_RELATION"&&Array.isArray(s.about)&&s.about.length===2&&inU(s.about[0],a)&&inU(s.about[1],g)); if(k==="none"&&nd){ k="nd"; t="직접 연결 없음(판정)"; }
      h+=`<div class="ulink u-${k}"><i></i><span>${esc(t)}${par&&S.mapCand?` · 도입 구문 병행 ${esc(MS_KO[par.status])}`:""}</span></div>`; }
    h+=`<button class="unit${here?" here":""}" ${aid!=null?`data-mgo="${aid}"`:""}><span class="uk">${esc(MG_KO[g.kind]||g.kind)}</span><b>${esc(g.first===g.last?g.first:g.first+"–"+g.last)}</b><small>${g.members.length}절 · ${dom}${g.roles&&g.roles.introduction?` · 도입 ${g.roles.introduction.length}절 + 내용 ${(g.roles.content||[]).length}절`:""}</small><span class="ubd">${c?`<em class="mb mb-c">모절 ${MK_KO[c.kind]} 확정</em>`:q.length?`<em class="mb mb-q">모절 경쟁 ${q.length}</em>`:p?`<em class="mb mb-p">모절 ${MK_KO[p.kind]} 잠정</em>`:un?`<em class="mb mb-i">모절 미결</em>`:`<em class="mb mb-u">모절 자료 없음</em>`}</span></button>`; });
  h+=`</div>`;
  const enc=D.groups.filter(g=>g.kind==="ENCLOSING_SPEECH_HYPOTHESIS"); if(enc.length){ const alts=D.issues.filter(s=>s.kind==="ALTERNATIVE_SET"&&s.subkind==="OVERLAPPING_GROUPING_HYPOTHESES");
    h+=`<section class="sec"><span class="label">큰 발언 가설 <small>(겹치는 묶음 — 기본 지도에 적용하지 않음)</small></span>${enc.map(g=>`<div class="mrel"><div><b>${esc(MG_KO[g.kind])}</b> ${esc(g.first)}–${esc(g.last)} · ${g.members.length}절</div><small>${alts.some(a=>a.options.includes(g.id))?"다른 가설과 경쟁":""}</small></div>`).join("")}</section>`; }
  const una=D.issues.filter(s=>s.kind==="UNASSIGNED_CLAUSE"); if(una.length) h+=`<p class="lead">어느 단위에도 들지 않은 절 ${una.length}개 (미배정 — '관계 없음'이 아니라 '배정 안 됨').</p>`;
  return h; }
