/* ===== MILAL 판정 읽기·겹쳐 보기 (MILALWV-IF-1, docs/MILAL_INTERFACE_DRAFT.md) =====
   MILAL은 판정하고 여기서는 보여 주기만 한다. 받은 파일을 되쓰지 않는다.
   세 출처를 구별한다: BHSA 원자료(선·tab·typ·domain) / 앱 관찰 후보(색·표지) / MILAL 판정(이 파일) */
const MILAL_FILES=[{book:18,url:"study/milal/job.json",approvals:"study/milal/approvals.json",native:"study/milal/bhsa_native_job.json"}];   /* 책 번호(개역 순) → 분석 파일(실제 MILAL V1 출력, 2026-10-20 검증 통과, 승인 전) + 승인 기록 파일(분리). 시험 자료는 test/milal_test_only_job31-38.json (시험 스크립트 전용) */
const MK_KO={SUBORDINATE:"종속",PARALLEL:"병행",FRAME_CONTENT:"틀–내용",CONTINUATION:"이어짐",CLOSURE:"종결",MEMBERSHIP:"포함"};
const MS_KO={CONFIRMED:"확정",PROVISIONAL:"잠정",COMPETING:"경쟁",UNASSIGNED:"미배정"};
const MG_KO={LOCAL_SPEECH_UNIT:"발언 단위",CONDITIONAL_RESPONSE_UNIT:"조건부 응답 단위",UNRESOLVED_SCOPE_FRAGMENT:"범위 미결 조각",NARRATIVE_REPORT_SEGMENT_HYPOTHESIS:"서술 보고 구간(가설)",ENCLOSING_SPEECH_HYPOTHESIS:"큰 발언 가설",SURFACE_EVENT_ANCHOR:"표면 사건 표지",UNCOVERED_SOURCE_CONTEXT:"덮이지 않은 출처 문맥",REPORT_INTRODUCTION:"보고 도입(말하기 절)",REPORT_CONTENT:"보고 내용(말한 것)"};
const MI_KO={ALTERNATIVE_SET:"대안 묶음",UNRESOLVED:"미결",SCOPE_CONFLICT:"범위 충돌",UNASSIGNED_CLAUSE:"미배정 절",NO_DIRECT_RELATION:"직접 연결 없음(판정)"};
const ML={}; /* book → {state:"loading"|"ok"|"err", data, byCid, msg} */
/* 자료 상태 배지: 시험 자료 / 승인 전 / 승인됨 — '검증된 MILAL 자료'는 연구자 승인(APPROVED) 뒤에만 */
function milalBadgeFile(st){ if(!st||st.state!=="ok") return ""; if(st.test) return '<em class="mb mb-t">시험 자료</em>'; const a=st.apr||{status:"UNREVIEWED"};
  const who=a.last?`기록된 이름(입력값, 신원 확인 아님): ${a.last.approver} · ${a.last.date}`:"";
  return a.status==="APPROVED"?`<em class="mb mb-c" title="${esc(who)}">연구자 승인(전체)</em>`:a.status==="PARTIAL"?`<em class="mb mb-p" title="${esc(who)}">일부 승인 — 관계 ${a.approvedRel.size}/${a.total}</em>`:a.status==="REJECTED"?`<em class="mb mb-x" title="${esc(who)}">연구자 기각</em>`:'<em class="mb mb-i">승인 전 — 검증 대기</em>'; }
/* 관계 하나가 승인 범위에 드는가 — approval.js 가 계산한 집합(전체 승인·RELATIONS·CHAPTERS 범위, 기각 예외 반영) */
function relApproved(st,r){ const a=st.apr; return !!a&&a.approvedRel.has(r.id); }

function milalFile(b){ return MILAL_FILES.find(f=>f.book===b); }
function milalState(b){ return ML[b]; }
/* 절(cid) → MILAL 절 id(ccn) 역색인, 절 → 첫 절 원자 */
function milalIndex(){ if(SD.ccnMap&&SD.cFirstA) return; SD.ccnMap=new Map(); for(let c=0;c<SD.ccn.length;c++) SD.ccnMap.set(SD.ccn[c],c);
  SD.cFirstA=new Int32Array(SD.ccn.length).fill(-1); for(let i=0;i<SD.wc.length;i++){ const c=SD.wc[i]; if(SD.cFirstA[c]<0) SD.cFirstA[c]=SD.wa[i]; } }
function milalLoad(b){ const f=milalFile(b); if(!f||!SD||!SD.ccn) return null; if(ML[b]) return ML[b];
  const st=ML[b]={state:"loading"};
  const sha256=buf=>crypto.subtle?crypto.subtle.digest("SHA-256",buf).then(h=>[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")):Promise.resolve("");
  let fileSha="", approvals=null;
  fetch(f.url+"?v="+(window.STUDY_V||"1")).then(r=>{ if(!r.ok) throw new Error("HTTP "+r.status); return r.arrayBuffer(); })
  .then(async buf=>{ fileSha=await sha256(buf); if(f.approvals){ try{ const r=await fetch(f.approvals+"?v="+(window.STUDY_V||"1")); if(r.ok) approvals=await r.json(); }catch(e){} }
    /* BHSA 원자료 사본(절 원자·절의 mother/rela 그대로, 판정 없음) — 있으면 상세 창의 '원 자료' 칸에 쓴다 */
    if(f.native){ try{ const r=await fetch(f.native+"?v="+(window.STUDY_V||"1")); if(r.ok){ const B=await r.json(); if(B&&B.schema==="MILALWV-BHSA-NATIVE-1"){ st.bhsaNative=new Map(B.atoms.map(x=>[x.clause_atom,x])); st.bhsaNativeMeta={bhsa:B.bhsa,atoms:B.counts.clause_atoms}; } } }catch(e){} }
    return JSON.parse(new TextDecoder().decode(buf)); }).then(D=>{
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
    const natByAtom=new Map(), natByClause=new Map(); for(const x of D.native_relations||[]){ if(x.clause_atom!=null) natByAtom.set(x.clause_atom,x); (natByClause.get(x.clause_id)||natByClause.set(x.clause_id,[]).get(x.clause_id)).push(x); }
    /* 확정(CONFIRMED) 계층 관계만으로 깊이 계산. BHSA tab 과 별개. 잠정·경쟁은 깊이에 넣지 않는다 */
    const parent=new Map(); const key=e=>e.type==="group"?"g:"+e.id:"c:"+e.id;
    for(const r of D.relations) if(r.family==="HIERARCHY"&&r.status==="CONFIRMED"&&r.target.type!=="clause_set"&&r.source.type!=="clause_set") parent.set(key(r.target),key(r.source));
    const groupsOfClause=new Map(); for(const g of D.groups) if(g.kind!=="ENCLOSING_SPEECH_HYPOTHESIS") for(const m of g.members) (groupsOfClause.get(m)||groupsOfClause.set(m,[]).get(m)).push(g.id);
    const memo=new Map(); const depth=(k,seen)=>{ if(memo.has(k)) return memo.get(k); if(seen.has(k)) return 0; seen.add(k); let d=0; const p=parent.get(k); if(p) d=1+depth(p,seen); else if(k.startsWith("c:")){ for(const gid0 of groupsOfClause.get(k.slice(2))||[]){ const pg=parent.get("g:"+gid0); if(pg){ d=Math.max(d,1+depth(pg,seen)); } } } memo.set(k,d); return d; };
    const cdepth=new Map(); for(const n of D.nodes){ const d=depth("c:"+n.id,new Set()); if(d>0) cdepth.set(n.id,d); }
    /* 승인: 분리된 approvals.json 에서 이 파일의 sha256 과 같은 기록만. 파일 안 review.status 는 믿지 않는다(파일이 자기를 승인할 수 없음) */
    const recs=(approvals&&approvals.schema==="MILALWV-APPROVAL-1"&&approvals.records||[]);
    /* 관계의 장 범위: source·target 의 절(묶음이면 묶음의 절 전부)이 속한 장의 최소·최대 — CHAPTERS 범위 승인에 쓴다 */
    const nodeById=new Map(D.nodes.map(n=>[n.id,n])), grpById=new Map(D.groups.map(g=>[g.id,g]));
    const chOfEnd=e=>(e.type==="group"?((grpById.get(e.id)||{}).members||[]):[e.id]).map(c=>nodeById.get(c)).filter(n=>n&&n.ch!=null).map(n=>n.ch);
    const relById=new Map(D.relations.map(r=>[r.id,r])); const relCh=new Map(); for(const r of D.relations){ const cs=[...chOfEnd(r.source),...chOfEnd(r.target)]; if(cs.length) relCh.set(r.id,[Math.min(...cs),Math.max(...cs)]); }
    const apr=approvalResolve(recs,{fileSha,fileStatus:D.file_status,relIds:D.relations.map(r=>r.id),chaptersOf:id=>relCh.get(id)||null,ruleOf:id=>(relById.get(id)||{}).rule||null,kindOf:id=>(relById.get(id)||{}).kind||null}); apr.records=recs.filter(r=>r.if1_sha256===fileSha); apr.sha=fileSha;
    if(D.review&&D.review.status==="APPROVED"&&apr.status!=="APPROVED") apr.note="파일 안의 review.status=APPROVED 는 무시함(승인 기록 없음)";
    Object.assign(st,{state:"ok",data:D,byCid,byGid,gid,ev,nodeCid,unmatched,badN,natByAtom,natByClause,cdepth,warn:chk.warn,test:D.file_status==="TEST_ONLY",review:apr.status,apr}); render();
  }).catch(e=>{ st.state="err"; const m=String(e.message||e); st.msg=/HTTP 404/.test(m)?"분석 파일이 서버에 없습니다(아직 올리지 않았거나 파일 이름이 바뀜) — 본문·구조 화면은 그대로 쓸 수 있습니다":/Failed to fetch|NetworkError|HTTP 5/.test(m)?"분석 파일을 내려받지 못했습니다. 인터넷 연결을 확인하고 '끄기' 뒤 다시 켜 보세요":m; render(); });
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
  const dp=ML[b].cdepth.get(m.o.node.id); if(dp) t+=`<em class="mb mb-d" title="확정된 모절 사슬의 길이. 그 위가 미확정이면 전체 깊이가 아님. BHSA tab 과 다른 값">확정 사슬 ${dp}</em>`;
  const iss=m.o.issues.filter(s=>s.kind!=="UNASSIGNED_CLAUSE"); if(iss.length&&!t) t=`<em class="mb mb-i">${MI_KO[iss[0].kind]}</em>`;
  if(m.o.badWords) t+=`<em class="mb mb-x">낱말 불일치</em>`; return t; }
function annotDot(aid){ return (window.anFor&&SD.can&&anFor("atom","a:"+SD.can[aid]).length)?`<em class="mb mb-n" title="내 메모 있음">메모</em>`:""; }
/* 묶음 시작 줄: 머리띠 */
function milalGroupHead(b,aid){ const m=milalForAtom(b,aid); if(!m||!m.firstAtom) return ""; const gs=m.o.groups.filter(x=>x.first&&x.g.kind!=="ENCLOSING_SPEECH_HYPOTHESIS"); if(!gs.length) return "";
  const st=ML[b]; return gs.map(({g})=>{ const G=st.byGid.get(g.id), H=unitMothers(st,g), c=H.find(r=>r.status==="CONFIRMED"), p=H.find(r=>r.status==="PROVISIONAL"), q=H.filter(r=>r.status==="COMPETING"), un=G.issues.find(s=>s.kind==="UNRESOLVED");
    const bd=c?`<em class="mb mb-c">${MK_KO[c.kind]} 확정</em>`:q.length?`<em class="mb mb-q">모절 경쟁 ${q.length}</em>`:p?`<em class="mb mb-p">${MK_KO[p.kind]} 잠정</em>`:un?`<em class="mb mb-i">모절 미결</em>`:`<em class="mb mb-u">모절 자료 없음</em>`;
    return `<button class="mgh" data-mgh="${esc(g.id)}" title="묶음의 관계·근거 보기"><b>${esc(MG_KO[g.kind]||g.kind)}</b> <small>${esc(g.first)}–${esc(g.last)} · ${g.members.length}절${st.test?" · 시험 자료":""}</small> ${bd} <i class="mghgo">›</i></button>`; }).join(""); }

/* 상세 창: 세 출처를 나눠 보여 준다 */
/* 관계 한 줄(종류·상태·상대·규칙·근거) 그리기 — 절 원자 상세와 묶음 상세가 같이 쓴다 */
function relHelpers(st){ const lab=r=>`<b>${esc(MK_KO[r.kind]||r.kind)}</b> <em class="mb mb-${r.status[0].toLowerCase()==="c"&&r.status==="CONFIRMED"?"c":r.status==="PROVISIONAL"?"p":r.status==="COMPETING"?"q":"u"}">${esc(MS_KO[r.status]||r.status)}</em>`;
  const endLab=e=>{ if(e.type==="group"){ const g=st.gid.get(e.id); if(!g) return esc(e.id); const c0=st.nodeCid.get(g.members[0]); return `${esc(MG_KO[g.kind]||g.kind)} ${esc(g.first)}–${esc(g.last)}${c0!=null?` <button class="mgo" data-mgo="${SD.cFirstA[c0]}">가기 ›</button>`:""}`; } const ids=e.type==="clause"?[e.id]:e.ids; if(!st.nodeText) st.nodeText=new Map(st.data.nodes.map(n=>[n.id,(n.text||"").trim().split(/\s+/).slice(0,3).join(" ")])); return ids.map(i=>{ const c=st.nodeCid.get(i); return c!=null?`<button class="mgo" data-mgo="${SD.cFirstA[c]}">${esc(sRef(SD.vOf[atomFirstWord(SD.cFirstA[c])]))} <span class="heb">${esc(st.nodeText.get(i)||"")}</span> ›</button>`:esc(i); }).join(", "); };
  const relRow=(r,dir)=>{ const evs=(r.evidence_ids||[]).map(id=>st.ev.get(id)).filter(Boolean); const apb=relApproved(st,r)?' <em class="mb mb-c">승인</em>':"";
      const arrow=r.kind==="MEMBERSHIP"?(dir==="in"?"← 속한 묶음: ":"→ 구성원: "):r.kind==="PARALLEL"?"↔ 병행: ":r.kind==="CLOSURE"?(dir==="in"?"← 닫는 것: ":"→ 닫히는 것: "):(dir==="in"?"← 모절·틀: ":"→ 자절·내용: ");
      const oc=e=>({PASSED:["c","통과"],FAILED:["x","실패"],UNRESOLVED:["u","미결"],HUMAN:["c","연구자"]}[e.outcome]||["u",e.outcome]); const cnt={}; evs.forEach(e=>{ const k=oc(e)[1]; cnt[k]=(cnt[k]||0)+1; });
      const sum=`규칙 ${esc(r.rule)}${evs.length?" · 근거 "+Object.entries(cnt).map(([k,v])=>k+" "+v).join("·"):" · 근거 없음"}`;
      const body=`<small>출처 ${esc(r.record.table)} #${esc(r.record.id)}${r.extra&&r.extra.rela?" · rela="+esc(r.extra.rela):""}</small>${r.note?`<small>${esc(r.note)}</small>`:""}${evs.length?`<ul class="mev">${evs.map(e=>{ const o=oc(e); const role=e.role?` <em class="mb mb-${e.role==="COUNTEREVIDENCE"?"x":"u"}">${e.role==="COUNTEREVIDENCE"?"반례":"참고"}</em>`:""; const obs=e.observed&&Object.keys(e.observed).length?esc(Object.entries(e.observed).map(([k,v])=>k+"="+(Array.isArray(v)?v.map(x=>{ const c=st.nodeCid.get(String(x)); return c!=null?sRef(SD.vOf[atomFirstWord(SD.cFirstA[c])]):x; }).join(","):String(v))).join("; ")):"";
      return `<li><em class="mb mb-${o[0]}">${o[1]}</em>${role} ${esc(e.rule_id)}${e.check?" · "+esc(e.check):""} — ${esc(e.text||"")}${obs?` <span class="mobs">관찰: ${obs}</span>`:""}</li>`; }).join("")}</ul>`:""}`;
      /* 쉬운 줄(종류·상태·상대)을 먼저, 규칙·출처·근거는 접어 둔다 — 연구자는 펼쳐서 본다 */
      return `<div class="mrel"><div>${lab(r)}${apb} ${arrow+endLab(dir==="in"?r.source:r.target)}</div><details class="mdet"><summary>${sum}</summary>${body}</details></div>`; };
  return {lab,endLab,relRow}; }
function openAtomSheet(b,aid){ const w0=atomFirstWord(aid), cid=SD.wc[w0], vi=SD.vOf[w0], typ=SD.TY[SD.ay[aid]], txt=SD.TXT[SD.ax[aid]]||"", m=milalForAtom(b,aid), st=ML[b];
  const words=[]; for(let i=w0;i<SD.wa.length&&SD.wa[i]===aid;i++) words.push(i);
  const heb=words.map(j=>{ const vj=SD.vOf[j]; return sHeb(vj)[j-SD.V[vj][5]]; }).join("").trim();
  const mk=markerKind(words,null,typ), [kcls,klab]=atomKind(typ,txt,mk);
  let h=`<p class="heb svheb" style="margin:0 0 6px">${esc(heb)}</p><p class="lead" style="margin:0 0 8px">${esc(sRef(vi))}</p>`;
  /* 쉬운 말이 먼저: 절 종류·누구의 말. 노드 번호·코드는 접어 둔다(연구자는 펼쳐 봄) */
  const domKo=DOM_K[SD.DO[SD.cd[cid]]]||SD.DO[SD.cd[cid]];
  const bhsaBlock=`<div class="src3"><span class="label">BHSA 원자료</span><p class="lead" style="margin:0 0 4px">${esc((typeof TY_HELP!=="undefined"&&TY_HELP[typ])||TY_FAM(typ)||typ)} · ${esc(domKo)}</p><details class="mdet"><summary>코드·노드 번호</summary><small>종류 ${esc(typ)} · 층(tab) ${SD.at[aid]} · 영역 ${esc(txt)} · clause_atom ${SD.can?SD.can[aid]:"?"} · clause ${SD.ccn?SD.ccn[cid]:"?"} · BHSA ${SD.bhsa||"2021"}</small></details></div>`;
  const appBlock=`<div class="src3"><span class="label">앱의 관찰 후보 <small>(자동 — 판정 아님)</small></span><p class="lead" style="margin:0"><i class="k-${kcls} mkdot"></i> ${esc(klab)}${mk?` · 표지 판정: ${esc(mk)}`:""}</p></div>`;
  if(!milalFile(b)) h+=`<div class="src3"><span class="label">MILAL 판정</span><p class="lead">이 책의 MILAL 자료가 없습니다.</p></div>`;
  else if(!st||st.state!=="ok") h+=`<div class="src3"><span class="label">MILAL 판정</span><p class="lead">${st&&st.state==="err"?"읽지 못했습니다: "+esc(st.msg):"불러오는 중…"}</p></div>`;
  else if(!m) h+=`<div class="src3"><span class="label">MILAL 판정</span><p class="lead">이 절은 자료 범위 밖입니다 (자료 없음 — '연결 없음'이 아니라 '모름').</p></div>`;
  else {
    const {o}=m, D=st.data, {lab,endLab,relRow}=relHelpers(st);
    const mil=r=>true;
    h+=`<div class="src3"><span class="label">MILAL 판정 ${milalBadgeFile(st)}${st.test?" <small>— 실제 판정 아님</small>":st.review!=="APPROVED"?" <small>— 연구자 승인 전</small>":""}</span>`;
    const HIER=r=>r.kind!=="MEMBERSHIP"&&r.kind!=="PARALLEL"&&r.kind!=="CLOSURE";
    const cIn=o.inRel.filter(r=>HIER(r)&&r.status==="CONFIRMED"), pIn=o.inRel.filter(r=>HIER(r)&&r.status==="PROVISIONAL"), qIn=o.inRel.filter(r=>HIER(r)&&r.status==="COMPETING"), ndr=o.issues.filter(s=>s.kind==="NO_DIRECT_RELATION"&&s.about&&s.about[1]&&s.about[1].id===o.node.id);
    const gsorted=[...o.groups].sort((a,b)=>a.g.members.length-b.g.members.length); const small=gsorted[0]&&gsorted[0].g;
    /* 쉬운 말 요약 — 연구자용 세부(규칙·노드·근거)는 아래 접힌 칸에 */
    let sumT=cIn.length?`<b>확정된 모절</b>이 있습니다: ${endLab(cIn[0].source)} (${cIn[0].rule.startsWith("HUMAN")?"연구자 판정":"규칙 "+esc(cIn[0].rule)}).`:(pIn.length||qIn.length)?`모절 <b>후보</b>만 있습니다 — 잠정 ${pIn.length}개·경쟁 ${qIn.length}개 (연구자가 아직 확정하지 않음).`:ndr.length?`이 절의 <b>확정된 모절 기록은 없고</b>,`:`이 절의 모절에 대한 MILAL 판정 기록이 <b>없습니다(모름)</b> — '없다고 판정한 것'과 다릅니다.`;
    if(ndr.length) sumT+=` 직접 모절 후보 ${ndr.map(s=>endLab(s.about[0])).join(", ")}은(는) 연구자가 <b>기각</b>했습니다(다른 연결의 유무는 말하지 않음).`;
    const ndrAsSrc=o.issues.filter(s=>s.kind==="NO_DIRECT_RELATION"&&s.about&&s.about[0]&&s.about[0].id===o.node.id); if(ndrAsSrc.length) sumT+=` 또 이 절은 ${ndrAsSrc.map(s=>endLab(s.about[1])).join(", ")}의 직접 모절 <b>후보였으나 연구자가 기각</b>했습니다(기계 후보는 보존).`;
    if(small) sumT+=` 가장 작은 소속 묶음: <b>${esc(MG_KO[small.kind]||small.kind)} ${esc(small.first)}–${esc(small.last)}</b>(${small.members.length}절)${gsorted.length>1?`, 더 큰 묶음 ${gsorted.length-1}개.`:"."}`;
    h+=`<p class="msum">${sumT}</p>`;
    h+=`<p class="lead" style="margin:2px 0 6px"><small>확정=연구자 채택 · 잠정=규칙 통과, 연구자 미확인 · 경쟁=후보 여럿 · 미배정=묶이지 않음 · 소속·닫음은 모절 관계가 아님</small></p>`;
    const grpRow=({g})=>{ const G=st.byGid.get(g.id); return `<div class="mrel"><div><b>${esc(MG_KO[g.kind]||g.kind)}</b> ${esc(g.first)}–${esc(g.last)} · ${g.members.length}절${g.roles&&g.roles.introduction&&g.roles.introduction.includes(o.node.id)?" · <b>이 절이 도입</b>":""} <button class="mgo" data-unit="${esc(g.id)}">묶음 상세 ›</button></div>${G.inRel.filter(r=>r.kind!=="MEMBERSHIP").map(r=>`<small>${lab(r)} ${r.kind==="PARALLEL"?"↔":r.kind==="CLOSURE"?"← 닫는 것:":"← 모절·틀:"} ${endLab(r.source)}</small>`).join("")}</div>`; };
    if(gsorted.length){ h+=`<span class="label">속한 묶음</span>`+gsorted.slice(0,2).map(grpRow).join(""); if(gsorted.length>2) h+=`<details class="mdet"><summary>더 큰 묶음 ${gsorted.length-2}개 보기</summary>${gsorted.slice(2).map(grpRow).join("")}</details>`; }
    const dp=st.cdepth.get(o.node.id);
    h+=`<details class="mdet"><summary>확정 사슬 ${dp||0} · BHSA tab ${SD.at[aid]} · ${esc(D.source.milal.stage)} · 규칙판 ${esc(D.source.milal.rules_version)}</summary><small>${dp?"이 절 위로 확정된 모절이 "+dp+"단. 그 위는 미확정이므로 전체 깊이가 아님":"확정된 모절이 없음(미결이지 '최상위'가 아님)"} · BHSA tab 은 원자료의 들여쓰기 값으로 MILAL 사슬과 다른 값 · ${esc(D.source.generated_at.slice(0,10))}${!st.test&&D.source.milal.commit?` · 커밋 ${esc(D.source.milal.commit.slice(0,8))}`:""}${o.badWords?' · <em class="mb mb-x">낱말 대조 실패</em>':""}</small></details>`;
    const inM=o.inRel, outM=o.outRel;
    if(!inM.length&&!outM.length&&!o.issues.filter(s=>s.kind!=="UNASSIGNED_CLAUSE").length) h+=`<p class="lead">이 절 자체에 대한 MILAL 관계가 없습니다${o.groups.length?" (묶음 단위 관계는 위 '속한 묶음'에)":""}. 자료에 '직접 연결 없음' 판정도 없으므로 <b>모름</b>입니다.</p>`;
    if(inM.length) h+=`<span class="label">이 절에 들어오는 관계</span>`+inM.map(r=>relRow(r,"in")).join("");
    if(outM.length) h+=`<span class="label">이 절에서 나가는 관계</span>`+outM.map(r=>relRow(r,"out")).join("");
    const iss=o.issues; if(iss.length) h+=`<span class="label">미해결·대안</span>`+iss.map(s=>`<div class="mrel"><div><b>${esc(MI_KO[s.kind]||s.kind)}</b>${s.subkind?` · ${esc(s.subkind)}`:""}${s.rule_id?` · 규칙 ${esc(s.rule_id)}`:""}</div>${s.unresolved_checks?`<small>미결 검사: ${esc(s.unresolved_checks.join(", "))}</small>`:""}${s.options?`<small>선택지: ${s.options.map(x=>{ const g=st.gid.get(x); return g?esc((MG_KO[g.kind]||g.kind)+" "+g.first+"–"+g.last):esc(x); }).join(" / ")}</small>`:""}${s.note?`<small>${esc(s.note)}</small>`:""}</div>`).join("");
    h+=`</div>`;
    /* BHSA 원 자료의 mother/rela — 이 절 원자 것만, 판정 아님 */
    }
  h+=appBlock+bhsaBlock+(st&&st.state==="ok"?bhsaNativeBlock(b,aid,st):"");
  if(window.annotListHTML) h+=annotListHTML("atom","a:"+SD.can[aid],aid).replace(/<\/div>$/,`<button class="btn small ghost" data-mkatom="${aid}" style="margin-left:6px">이 절 원자 표시(형광펜·괄호)</button></div>`);
  sheet("절 원자 · "+sRef(vi),`<div class="sdetail sheetd">${h}</div>`); if(window.bindAnnots) bindAnnots(document.getElementById("sheetRoot"));
  document.querySelectorAll("#sheetRoot [data-unit]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); openUnitSheet(b,x.dataset.unit); });
  document.querySelectorAll("#sheetRoot [data-mkatom]").forEach(x=>x.onclick=()=>{ const a2=+x.dataset.mkatom, w1=atomFirstWord(a2), ws=[]; for(let i=w1;i<SD.wa.length&&SD.wa[i]===a2;i++) ws.push(i); openMarkPicker(ws,"절 원자"); });
  document.querySelectorAll("#sheetRoot [data-mgo]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); document.getElementById("sheetRoot").innerHTML=""; gotoAtom(b,+x.dataset.mgo); }); }
/* 묶음(발언 단위) 상세: 머리띠를 누르면. 묶음의 관계(들어오는 모절·틀, 경쟁 후보)와 근거, 미해결·대안, 구성 절 */
function openUnitSheet(b,gid){ const st=ML[b]; if(!st||st.state!=="ok") return; const g=st.gid.get(gid), G=st.byGid.get(gid); if(!g||!G) return; const {lab,endLab,relRow}=relHelpers(st);
  let h=`<p class="lead" style="margin:0 0 6px">${esc(MG_KO[g.kind]||g.kind)} · ${esc(g.first)}–${esc(g.last)} · ${g.members.length}절${st.test?' · <em class="mb mb-t">시험 자료</em>':""}</p>`;
  h+=`<div class="src3"><span class="label">MILAL 판정 ${milalBadgeFile(st)}${st.test?" <small>— 실제 판정 아님</small>":""}</span>`;
  const inM=G.inRel, outM=G.outRel.filter(r=>r.kind!=="MEMBERSHIP"); const q=inM.filter(r=>r.status==="COMPETING"), c=inM.find(r=>r.status==="CONFIRMED"&&r.kind!=="MEMBERSHIP"&&r.kind!=="PARALLEL");
  h+=`<p class="lead" style="margin:2px 0 6px">${c?`확정된 모절·틀이 있음`:q.length?`<b>모절 후보 ${q.length}개가 경쟁</b> — 아래 근거를 견주어 보고 연구자가 고른다(앱은 고르지 않음)`:inM.length?"잠정 관계만 있음":"이 묶음에 들어오는 관계 없음(모름)"}</p>`;
  if(inM.length) h+=`<span class="label">들어오는 관계 (모절·틀·닫음)</span>`+inM.map(r=>relRow(r,"in")).join("");
  if(outM.length) h+=`<span class="label">나가는 관계</span>`+outM.map(r=>relRow(r,"out")).join("");
  const iss=G.issues||[]; if(iss.length) h+=`<span class="label">미해결·대안</span>`+iss.map(s=>`<div class="mrel"><div><b>${esc(MI_KO[s.kind]||s.kind)}</b>${s.subkind?` · ${esc(s.subkind)}`:""}${s.rule_id?` · 규칙 ${esc(s.rule_id)}`:""}</div>${s.options?`<small>선택지: ${s.options.map(x=>{ const g2=st.gid.get(x); return g2?esc((MG_KO[g2.kind]||g2.kind)+" "+g2.first+"–"+g2.last):esc(x); }).join(" / ")}</small>`:""}${s.note?`<small>${esc(s.note)}</small>`:""}</div>`).join("");
  h+=`</div>`;
  const c0=st.nodeCid.get(g.members[0]), cN=st.nodeCid.get(g.members[g.members.length-1]);
  h+=`<div class="src3"><span class="label">구성 절</span><p class="lead">${g.members.length}절${g.roles&&g.roles.introduction&&g.roles.introduction.length?` · 도입 ${g.roles.introduction.length}절`:""} · ${c0!=null?`<button class="mgo" data-mgo="${SD.cFirstA[c0]}">첫 절 ${esc(g.first)} ›</button>`:""} ${cN!=null?`<button class="mgo" data-mgo="${SD.cFirstA[cN]}">끝 절 ${esc(g.last)} ›</button>`:""}</p></div>`;
  sheet(`${MG_KO[g.kind]||g.kind} · ${g.first}–${g.last}`,`<div class="sdetail sheetd">${h}</div>`);
  document.querySelectorAll("#sheetRoot [data-mgo]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); document.getElementById("sheetRoot").innerHTML=""; gotoAtom(b,+x.dataset.mgo); }); }
/* BHSA 원 자료(mother/rela) 칸: 원자료 사본(bhsa_native_job.json)을 우선, 없으면 V1 이 보존한 것. 쉬운 말로 먼저, 노드 번호는 뒤에. 판정 아님 */
const RELA_KO={NA:"종류 미지정(NA)",Coor:"나란히 이어짐(Coor)",Adju:"부사절(Adju)",Attr:"꾸밈절·관계절(Attr)",Objc:"목적절(Objc)",Resu:"결과(Resu)",Subj:"주어절(Subj)",RgRc:"다시 받는 관계절(RgRc)",Cmpl:"보충(Cmpl)",ReVo:"호격 되받음(ReVo)",Spec:"상술(Spec)",PreC:"술어 보충(PreC)"};
/* V1 보존 상태(순수 함수, 전수검사용): 절 원자 ca 의 BHSA mother 관계가 V1 에 어떻게 들어 있는가
   DIRECT_ATOM   절 원자 관계가 V1 에 직접 수록됨(bhsa_nodes.dependent == ca)
   CLAUSE_LEVEL  그 절의 관계가 절 수준으로 수록됨(dependent == clause; 절 원자 번호 없음)
   BHSA_ONLY     이 절 원자의 mother 는 BHSA 원자료에만 있음(같은 절의 다른 원자가 V1 에 있어도 이 원자 것은 아님)
   NO_MOTHER     원자료에 이 절 원자의 mother 가 없음(V1 에도 없음)
   UNKNOWN       원자료 사본이 없어 확인할 수 없음 */
function bhsaNativeStatus(st,ca,clauseId){ const y=st.bhsaNative&&st.bhsaNative.get(ca); const direct=st.natByAtom.get(ca); const cl=(st.natByClause.get(String(clauseId))||[]).find(x=>x.bhsa_nodes&&x.bhsa_nodes.dependent===Number(clauseId))||null;
  const clLevel=!!cl;
  if(direct&&direct.bhsa_nodes&&direct.bhsa_nodes.dependent===ca) return {code:"DIRECT_ATOM",v1:direct,y,clauseLevelAlso:cl};
  if(!st.bhsaNative) return {code:clLevel?"CLAUSE_LEVEL_UNVERIFIED":"UNKNOWN",v1:clLevel?cl:null,y:null};   /* 사본 없음: 절 수준 수록만 알 수 있고 원자 대응은 확인 못 함 */
  if(y&&y.mother_clause_atom!=null) return {code:"BHSA_ONLY",v1:null,y,clauseLevelAlso:clLevel?cl:null};   /* 이 원자 자신의 mother 는 V1 에 없음(절 수준 관계가 따로 있어도 이 원자 것은 아님) */
  if(clLevel) return {code:"CLAUSE_LEVEL",v1:cl,y};
  if(y) return {code:"NO_MOTHER",v1:null,y};
  return {code:"UNKNOWN",v1:null,y:null}; }
const NAT_STATUS_KO={DIRECT_ATOM:"절 원자 관계가 V1 에 직접 수록됨",CLAUSE_LEVEL:"이 절의 관계가 절 수준으로 수록됨(절 원자 번호 없음)",CLAUSE_LEVEL_UNVERIFIED:"절 수준 수록만 확인(원자료 사본 없음)",BHSA_ONLY:"이 절 원자의 관계는 BHSA 원자료에만 있음(V1 에 없음)",NO_MOTHER:"원자료에 이 절 원자의 mother 없음",UNKNOWN:"대응 관계를 확인할 수 없음"};
function bhsaNativeBlock(b,aid,st){ const ca=SD.can[aid], cid=SD.wc[atomFirstWord(aid)]; const S=bhsaNativeStatus(st,ca,SD.ccn[cid]); const y=S.y, v1=S.v1;
  if(!y&&!v1) return "";
  const refOf=a2=>a2!=null?`${esc(sRef(SD.vOf[atomFirstWord(a2)]))} <button class="mgo" data-mgo="${a2}">가기 ›</button>`:"";
  const atomApp=caNode=>{ if(caNode==null) return null; const a0=SD.bookA[b-1], a1=b<39?SD.bookA[b]:SD.can.length; for(let i=a0;i<a1;i++) if(SD.can[i]===caNode) return i; return null; };
  let rows="";
  if(y){ const mA=atomApp(y.mother_clause_atom); rows+=`<dt>절 원자의 모절</dt><dd>${y.mother_clause_atom!=null?`${refOf(mA)} · ${esc(RELA_KO[y.rela_atom]||y.rela_atom)}`:"없음(원자료에 mother 없음)"}</dd>`;
    const mt=y.mother_clause_type; if(!st.bhsaClauseAtom){ st.bhsaClauseAtom=new Map(); for(const z of st.bhsaNative.values()) if(!st.bhsaClauseAtom.has(z.clause)) st.bhsaClauseAtom.set(z.clause,z.clause_atom); } const mC=mt==="clause"?atomApp(st.bhsaClauseAtom.get(y.mother_clause)):null;
    rows+=`<dt>절의 모절</dt><dd>${y.mother_clause!=null?`${mt==="clause"?refOf(mC):mt==="phrase"?"구(phrase)에 걸림":mt==="word"?"낱말(word)에 걸림":esc(String(mt))} · ${esc(RELA_KO[y.rela_clause]||y.rela_clause)}`:"없음"}</dd>`;
    rows+=`<dt>V1 보존 여부</dt><dd>${esc(NAT_STATUS_KO[S.code]||S.code)}${v1?` (${esc(v1.origin_edge_id)})`:""}${S.clauseLevelAlso?` · 절 수준 관계는 따로 수록됨 (${esc(S.clauseLevelAlso.origin_edge_id)})`:""}</dd>`; }
  else { const mc=v1.mother_clause_id&&st.nodeCid.get(v1.mother_clause_id); rows+=`<dt>모절(V1 보존)</dt><dd>${mc!=null?refOf(SD.cFirstA[mc]):esc(String(v1.mother_clause_id))} · ${esc(RELA_KO[v1.rela]||v1.rela)}</dd><dt>V1 보존 여부</dt><dd>${esc(NAT_STATUS_KO[S.code]||S.code)}</dd>`; }
  const ids=`<details class="mdet"><summary>노드 번호</summary><small>clause_atom ${ca} · clause ${SD.ccn[cid]}${y?` · mother_clause_atom ${y.mother_clause_atom??"—"} · mother_clause ${y.mother_clause??"—"}(${y.mother_clause_type??"—"})`:""}${v1?` · V1 ${esc(v1.origin_edge_id)} · 복원 ${esc(v1.atom_resolution||"")}`:""}</small></details>`;
  return `<div class="src3"><span class="label">BHSA 원 자료의 모절 관계 <small>(원 데이터 ${st.bhsaNativeMeta?"· 사본 "+esc(st.bhsaNativeMeta.bhsa):""} — MILAL 판정 아님)</small></span><dl class="rdl">${rows}</dl>${ids}</div>`; }
/* 절 원자로 이동: 다른 장이면 범위를 바꾸고 구조 화면에서 그 줄을 비춘다 */
function gotoAtom(b,aid,noBack){ if(!SD.ccnMap||!SD.cFirstA) milalIndex(); const S=view.st, w0=atomFirstWord(aid), vi=SD.vOf[w0], [bb,c,v]=SD.V[vi];
  if(!noBack) S.back={R:S.R&&{...S.R},vc:S.vc,rd:S.rd,sv:S.sv,aid:S.curAid,y:scrollY,label:S.R?`${PLAN.abbr[S.R.b-1]} ${S.vc}장(${S.sv==="map"?"지도":S.sv==="speech"?"발화":"계층"})`:""};
  if(!S.R||S.R.b!==bb||c<S.R.c1||c>S.R.c2) setRange({b:bb,c1:c,c2:c}); S.vc=c; S.mode="verse"; S.rd="struct"; S.sv="tree"; S.milalOn=true; S.curAid=aid; render();
  setTimeout(()=>{ const el=document.querySelector(`.stl [data-sat="${aid}"]`)?.closest(".stl"); if(el){ el.scrollIntoView({block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),2200); } },60); }

function goBack(){ const S=view.st, B=S.back; if(!B) return; S.back=null; if(B.R){ setRange(B.R); S.vc=B.vc; } S.mode="verse"; S.rd=B.rd||"struct"; S.sv=B.sv||"tree"; render(); if(B.aid!=null){ setTimeout(()=>{ const el=document.querySelector(`.stl [data-sat="${B.aid}"]`)?.closest(".stl"); if(el){ el.scrollIntoView({block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),2200); } else scrollTo({top:B.y||0}); },60); } else scrollTo({top:B.y||0}); }
/* ===== 발화 보기: BHSA domain/txt(원자료) + MILAL 묶음(판정) ===== */
function speechView(b,c){ const vis=SD.ch.get(b+"-"+c)||[]; const atoms=[], seen=new Set();
  for(const vi of vis){ const [, , , , ,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ const a=SD.wa[j]; if(!seen.has(a)){ seen.add(a); atoms.push({a,vi,w0:j}); } } }
  const st=ML[b]; let h=`<p class="rdnote">${!milalFile(b)?"띠의 들여쓰기는 BHSA의 영역(서술 N / 인물의 말 Q / 담화 D)과 인용 깊이(원자료)입니다. 이 책은 MILAL 자료가 없어 발언 단위 묶음은 표시하지 않습니다.":"띠의 들여쓰기는 BHSA의 영역(서술 N / 인물의 말 Q / 담화 D)과 인용 깊이(원자료)입니다. 머리띠와 '도입/내용' 표시는 MILAL이 묶은 발언 단위(판정)입니다. 발화자 이름은 자료에 없어 붙이지 않습니다."} ${milalBadgeFile(st)}</p><div class="spv">`;
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
  let h=`<div class="srcnote"><span>이 지도는 <b>MILAL 묶음(판정)</b>을 본문 순서로 늘어놓은 것입니다. 단위 사이에 <b>확정된 계층 관계</b>가 있을 때만 선을 긋고, 없으면 순서만 보입니다. ${milalBadgeFile(st)}</span><span class="lead">범위: ${esc(lab)} · 단위 ${base.length}개 · 누르면 그 장의 구조로 갑니다.</span><span class="lead"><b>상자</b> = 발언 경계(MILAL 묶음, 문학적) · <b>점선</b> = 본문 순서(관계 아님) · <b>실선</b> = 확정된 구조적 모절 관계 · 후보는 켜야 보임</span><span><button class="mtog" data-mapcand="${S.mapCand?"0":"1"}">${S.mapCand?"후보 관계 숨기기":"후보 관계 보기 (잠정·경쟁, 점선)"}</button></span></div><div class="umap">`;
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
