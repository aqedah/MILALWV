/* ===== 쉬운 검색(조건 카드) — 새 화면 전용.
   카드는 검색식 상자(S.qb)를 만드는 '앞면'일 뿐이다. 실행은 같은 엔진(study_qe.js)·같은 워커가 하고, 검색 의미는 카드→상자→TF 식으로 정해진다.
   · 카드 하나 = 낱말 하나. 카드 안의 조건은 모두 '같은 낱말'이 함께 갖춰야 한다.
   · 카드를 더하면 '같은 절 안의 다른 낱말'. 엔진은 형제 상자가 같은 낱말에 걸릴 수 있으므로, 순서로 갈리지 않는 짝에는 w1 # w2 를 붙여 '서로 다른 낱말'을 보장한다.
   · 카드로 담을 수 없는 식(맨 앞에·이름 관계·정규식 등)은 고급 검색(TF 검색식)에서 고친다. ===== */
const QC_WF=["lex","sp","vs","vt","ps","gn","nu"];
const QC_OPS=[["","순서 상관없이"],["<","앞 낱말보다 뒤에"],["<:","앞 낱말 바로 뒤에"]];
const QC_N="①②③④⑤⑥⑦⑧⑨";
const QC_JOB=[[3,31,"욥과 세 친구"],[32,37,"엘리후"],[38,41,"하나님"]];
const qcCard=()=>({c:{},fn:"",op:""});
function qcNew(tgt){ return {tgt:tgt||"word",cl:{},ws:[qcCard()]}; }
/* '서로 다른 낱말'을 따로 걸어야 하는 짝: 순서 조건으로 이어져 앞 카드가 맨 낱말이면 이미 다르고, 서로 다른 역할의 구 안이면 이미 다르다 */
function qcPairs(Q){ const W=Q.ws, P=[]; for(let i=0;i<W.length;i++) for(let j=i+1;j<W.length;j++){ let ord=true; for(let k=i+1;k<=j;k++) if(!W[k].op){ ord=false; break; }
    if(ord&&!W[i].fn) continue; if(W[i].fn&&W[j].fn&&W[i].fn!==W[j].fn) continue; P.push([i,j]); } return P; }
function qcNode(cd,name,op){ const w=qNew("word"); for(const f of QC_WF) if(cd.c[f]) w.c[f]=cd.c[f]; if(name) w.name=name; if(!cd.fn){ w.op=op; return w; } const p=qNew("phrase"); p.c.function=cd.fn; p.op=op; p.ch.push(w); return p; }
function qcClC(Q){ const o={}; for(const k of ["typ","domain"]) if(Q.cl[k]) o[k]=Q.cl[k]; return o; }
function qcBlock(Q){ const cl=qcClC(Q);
  if(Q.tgt==="word"){ const n=qcNode(Q.ws[0]||qcCard(),"",""); if(!Object.keys(cl).length) return n; const r=qNew("clause"); r.c=cl; r.ch.push(n); return r; }
  const pairs=qcPairs(Q), named=new Set(pairs.flat()); const r=qNew("clause"); r.c=cl;
  r.ch=Q.ws.map((cd,i)=>qcNode(cd,named.has(i)?"w"+(i+1):"",i?cd.op||"":""));
  if(pairs.length) r.rels=pairs.map(([i,j])=>({a:"w"+(i+1),op:"#",b:"w"+(j+1)})); return r; }
/* 상자 → 카드. 카드가 뜻을 그대로 담을 때만(같은 식이 다시 나와야 함). 아니면 null → 고급 검색에서 */
function qcFromBlock(b){ try{
  const cardOf=(n,i)=>{ let fn="", w=n; if(!["","<","<:"].includes(n.op||"")) return null;
    if(n.t==="phrase"){ if(n.x.length||n.ch.length!==1||Object.keys(n.c).some(k=>k!=="function")||!n.c.function) return null; fn=n.c.function; w=n.ch[0]; if(w.op) return null; }
    if(w.t!=="word"||w.x.length||w.ch.length||Object.keys(w.c).some(k=>!QC_WF.includes(k))) return null; return {c:{...w.c},fn,op:i?(n.op||""):""}; };
  let Q=null;
  if(b.t==="word"||b.t==="phrase"){ if(b.op) return null; const c=cardOf(b,0); if(!c) return null; Q={tgt:"word",cl:{},ws:[c]}; }
  else if(b.t==="clause"){ if(b.x.length||b.op||Object.keys(b.c).some(k=>!["typ","domain"].includes(k))||(b.ch[0]&&b.ch[0].op)) return null; const ws=b.ch.map(cardOf); if(ws.some(x=>!x)) return null; Q={tgt:"clause",cl:{...b.c},ws}; }
  if(!Q) return null; const P0=qParse(qGen(b)), P1=qParse(qGen(qcBlock(Q))); if(P0.err||P1.err||qCanon(P0)!==qCanon(P1)) return null; return Q; }catch(e){ return null; } }
function qcFromText(t){ const P=qParse(t); if(P.err) return null; return qcFromBlock(qFromParse(P.root,P)); }
/* 카드가 바뀔 때마다 상자·식을 다시 만든다 — 실행·보관·메모는 기존 길(S.qb)을 그대로 쓴다 */
function qcSync(){ const S=view.st; S.qb=qcBlock(S.qc); S.qMode="blocks"; S.qt=qGen(S.qb); }
/* 절의 종류: 코드 대신 갈래(봐이크톨·완료·명사문…)로 */
function qcTyOpts(){ const g=new Map(); SD.TY.forEach(c=>{ const f=TY_FAM(c); if(!f) return; if(!g.has(f)) g.set(f,[]); g.get(f).push(c); }); return [...g].map(([f,cs])=>[cs.join("|"),f]); }
function qcSel(key,f,opts,cur,label){ return `<label class="qf">${label}<select data-qcs="${key}" data-f="${f}"><option value="">조건 없음</option>${opts.map(([v,n])=>`<option value="${esc(v)}"${cur===v?" selected":""}>${esc(n)}</option>`).join("")}${cur&&!opts.some(o=>o[0]===cur)?`<option value="${esc(cur)}" selected>${esc(cur.split("|").map(v=>((opts.find(o=>o[0]===v)||[])[1]||v)).join(" 또는 "))}</option>`:""}</select></label>`; }
function qcCardKo(cd){ const b=qNew("word"); for(const f of QC_WF) if(cd.c[f]) b.c[f]=cd.c[f]; let s=Object.keys(b.c).length?qSay(b):"아무 <b>낱말</b>"; if(cd.fn) s=`${esc(FN_K[cd.fn]||cd.fn)} 구 안의 `+s; return s; }
function qcSay(Q){ const where=`<b>${esc(stRangeLabel())}</b>`, cl={t:"clause",c:qcClC(Q),x:[],ch:[]}, has=Object.keys(cl.c).length, clT=has?qSay(cl):"<b>절</b>";
  if(Q.tgt==="word"){ const w=qcCardKo(Q.ws[0]||qcCard()); return `${where}에서 ${has?clT+" 안에 있는 ":""}${w}${qJosa(w,"을","를")} 찾습니다.`; }
  if(!Q.ws.length) return `${where}에서 ${clT}${qJosa(clT,"을","를")} 찾습니다.`;
  const parts=Q.ws.map((cd,i)=>`${QC_N[i]||i+1} ${i&&cd.op==="<"?`${QC_N[i-1]}보다 뒤에 오는 `:i&&cd.op==="<:"?`${QC_N[i-1]} 바로 뒤에 오는 `:""}${qcCardKo(cd)}`);
  return `${where}의 ${clT} 가운데, ${parts.join(", ")}${Q.ws.length>1?" — 이 낱말들이 함께":qJosa(parts[0],"이","가")} 들어 있는 절을 찾습니다.${Q.ws.length>1?`<br><small>${[...Q.ws.keys()].map(i=>QC_N[i]).join("·")}는 서로 다른 낱말입니다. 한 낱말에 여러 조건을 걸려면 같은 카드 안에 넣으세요.</small>`:""}`; }
function qcCardHTML(Q,cd,i){ const k=String(i), c=cd.c; let f="";
  const lk=c.lex, li=lk&&SD.lexByKey[lk]?SD.lexByKey[lk][0]:null;
  f+=`<label class="qf qlex">사전형${li!=null?`<span class="qlexv"><span class="heb">${esc(SD.L[li][0])}</span> ${esc(lexGloss(li))}<button class="qx" data-qclexx="${k}" aria-label="지우기">✕</button></span>`:lk?`<span class="qlexv">${esc(lk)}<button class="qx" data-qclexx="${k}">✕</button></span>`:`<input data-qclexq="${k}" placeholder="뜻·히브리어·H번호" autocomplete="off"><span class="qsug" id="qcsug-${k}"></span>`}</label>`;
  f+=qcSel(k,"sp",Object.entries(SP_K),c.sp,"품사");
  if(c.sp==="verb") f+=qcSel(k,"vs",Object.entries(VS_K),c.vs,"줄기")+qcSel(k,"vt",Object.entries(VT_K),c.vt,"형태");
  if(cd.more||c.ps||c.gn||c.nu) f+=qcSel(k,"ps",[["p1","1인칭"],["p2","2인칭"],["p3","3인칭"]],c.ps,"인칭")+qcSel(k,"gn",[["m","남성"],["f","여성"],["c","공성"]],c.gn,"성")+qcSel(k,"nu",[["sg","단수"],["pl","복수"],["du","쌍수"]],c.nu,"수");
  else f+=`<button class="qmore" data-qcmore="${k}">인칭·성·수 ›</button>`;
  f+=qcSel(k,"fn",SD.FN.filter(x=>FN_K[x]).map(x=>[x,FN_K[x]]),cd.fn,"문장 속 역할");
  const del=Q.tgt==="clause"?`<button class="qx" data-qcdel="${k}" aria-label="이 낱말 지우기">✕</button>`:"";
  return `${i?`<div class="qcjoin"><span>그리고 같은 절 안의 <b>다른 낱말</b></span><select data-qcop="${k}" aria-label="앞 낱말과의 순서">${QC_OPS.map(([v,n])=>`<option value="${v}"${(cd.op||"")===v?" selected":""}>${n}</option>`).join("")}</select></div>`:""}
  <div class="qcard"><div class="qch"><b>${Q.tgt==="word"?"찾을 낱말":"낱말 "+(QC_N[i]||i+1)}</b>${del}</div><div class="qfs">${f}</div><p class="qcnote">이 카드의 조건은 모두 <b>한 낱말</b>이 함께 갖춰야 합니다.${cd.fn?" '문장 속 역할'은 그 낱말이 들어 있는 구(주어·목적어…)의 역할입니다.":""}</p></div>`; }
function qcJobHTML(){ return `<div class="qcjob"><span class="label">예시 — 욥기에서 말하는 이별로 좁히기 <small>(장 단위)</small></span><div class="achips">${QC_JOB.map(([a,z,n])=>`<button class="achip" data-rjob="${a}-${z}">${n} · 욥 ${a}–${z}장</button>`).join("")}</div><p class="lead" style="margin:2px 0 0;font-size:12.5px">장으로 나눈 대략의 구간입니다. 장 안의 서술 문장(예: 32:1–5, 38:1)이나 짧은 대답(40:3–5)도 함께 들어갑니다. 서술만·인물의 말만 보려면 절의 조건 '누구의 말'을 쓰세요.</p></div>`; }
/* 화면 */
function qcRender(){ const S=view.st; S.qc ||= qcNew("word");
  /* 다른 길(예시 단계·0건 진단·보관함·검색 메모)로 식이 바뀌었으면 카드로 다시 읽는다. 못 읽으면 고급 검색으로 */
  const cur=S.qMode==="text"?(S.qt||""):qGen(S.qb||qcBlock(S.qc));
  if(qCanonT(cur)!==qCanonT(qGen(qcBlock(S.qc)))){ const Q=qcFromText(cur); if(Q){ S.qc=Q; qcSync(); } else if(cur.trim()){ S.qui="adv"; S.qEdit=true; return renderQuery(); } else qcSync(); }
  else if(!S.qb||S.qMode!=="blocks") qcSync();
  const Q=S.qc, R=S.qres, hasRes=!!(R&&(R.hits||R.err));
  let h=`<section class="sec">${S.fromText?`<div class="srcnote"><span><button class="mtog back" id="qcBackText">← 본문으로 돌아가기 (${esc(S.fromText.ref)})</button></span></div>`:""}<h2 class="qtitle">문법·문장 모양으로 찾기</h2><p class="lead" style="margin:0 0 8px">찾는 곳은 <b>현재 ${esc(rScopeLabel()||stRangeLabel())}</b>입니다.</p>
    <span class="label">무엇을 찾으시나요?</span><div class="qctgt">${[["word","낱말","한 낱말의 사전형·품사·동사 형태"],["clause","절","절의 종류, 한 절 안의 여러 낱말"]].map(([k,n,d])=>`<button aria-checked="${Q.tgt===k}" data-qctgt="${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>`;
  const clBox=`<div class="qfs">${qcSel("cl","typ",qcTyOpts(),Q.cl.typ,"절의 종류")}${qcSel("cl","domain",[["N","서술"],["Q","인물의 말"],["D","담화(율법·시 등)"]],Q.cl.domain,"누구의 말")}</div>`;
  if(Q.tgt==="clause") h+=`<div class="qcbox"><div class="qch"><b>절의 조건</b></div>${clBox}</div>`;
  h+=Q.ws.map((cd,i)=>qcCardHTML(Q,cd,i)).join("");
  h+=`<div class="qcaddw"><button class="btn ghost small" id="qcAdd">＋ 같은 절 안의 다른 낱말 더하기</button>${Q.tgt==="word"?`<small>더하면 '절' 찾기로 바뀝니다</small>`:""}</div>`;
  if(Q.tgt==="word") h+=`<details class="qcbox qccl"${Object.keys(qcClC(Q)).length?" open":""}><summary>이 낱말이 있는 절의 조건 <small>(선택 — 절의 종류·누구의 말)</small></summary>${clBox}</details>`;
  h+=`<div class="qsay"><b>읽어 보면</b> ${qcSay(Q)}</div>`;
  h+=`${hasRes?qChangedNote():""}<div class="row"><button class="btn" id="qRun" style="flex:1">${hasRes?"다시 찾기":"찾기"}</button><button class="btn ghost small" id="qSave">보관</button><button class="btn ghost small" id="qSaved">보관함 ${qSavedList().length}</button></div>`;
  h+=qcJobHTML();
  h+=`<details class="mdet qqd"${S.qOpenQs?" open":""}><summary>예시로 시작하기</summary><div class="qqs">${Q_QUESTIONS.filter(x=>x.key!=="__custom").map(x=>`<button class="qq${S.qkey===x.key?" on":""}" data-qcq="${esc(x.key)}"><b>${esc(x.q)}</b><small>${esc(x.desc)}</small></button>`).join("")}</div></details>`;
  h+=`<div class="qadv"><span class="qadvb">고급 검색</span><b>Text-Fabric 검색식</b><p>구·절을 여러 겹으로 넣거나, '맨 앞에'·이름 관계·정규식 같은 조건이 필요할 때 씁니다. 지금 카드의 조건을 그대로 검색식으로 옮겨 시작합니다.</p><button class="btn small" id="qcToAdv">고급 검색식으로 열기 ›</button></div></section>`;
  if(R) h+=qResultsHTML(R);
  return h; }
function qCanonT(t){ const P=qParse(t||""); return P.err?"!"+t:qCanon(P); }
/* 본문의 원어 분석에서 '이 낱말 모양으로 찾기' — 사전형과(동사면) 줄기·형태를 채운 카드로 */
function qcFromWord(wi){ const S=view.st; if(S.mode==="verse") S.fromText={R:{...S.R},vc:S.vc,rv:S.rv,rw:S.rw,rd:S.rd,y:scrollY,ref:S.rw!=null?sRef(SD.vOf[S.rw]):rLabel(S.R)};
  const li=SD.wl[wi], m=SD.M[SD.wm[wi]], c={lex:SD.L[li][1]}; if(m[0]==="verb"){ c.sp="verb"; if(VS_K[m[1]]) c.vs=m[1]; if(VT_K[m[2]]) c.vt=m[2]; }
  S.qc={tgt:"word",cl:{},ws:[{c,fn:"",op:""}]}; qcSync(); S.qui="card"; S.qres=null; S.qkey=null; S.qEdit=false; S.qPending=null; S.mode="query"; S.rmode="query";
  if(S.fromText){ try{ history.pushState({milal:"word"},""); }catch(e){} } render(); scrollTo({top:0}); }
function qcJob(a,z){ const S=view.st, go=()=>{ S.wide=false; setRange({b:18,c1:a,c2:z}); render(); }; if(SD.loaded.has(18)) go(); else loadBook(18).then(go); }
function bindQueryCards(m){ const S=view.st, Q=S.qc; if(!Q) return; const rr=()=>{ qcSync(); const y=scrollY; render(); scrollTo({top:y}); };
  m.querySelectorAll("[data-qctgt]").forEach(b=>b.onclick=()=>{ const t=b.dataset.qctgt; if(t===Q.tgt) return; Q.tgt=t; if(t==="word"){ Q.ws=Q.ws.slice(0,1); if(!Q.ws.length) Q.ws=[qcCard()]; Q.ws[0].op=""; } rr(); });
  m.querySelectorAll("[data-qcs]").forEach(s=>s.onchange=()=>{ const k=s.dataset.qcs, f=s.dataset.f, v=s.value; if(k==="cl"){ if(v) Q.cl[f]=v; else delete Q.cl[f]; rr(); return; }
    const cd=Q.ws[+k]; if(f==="fn") cd.fn=v; else { if(v) cd.c[f]=v; else delete cd.c[f]; if(f==="sp"&&v!=="verb"){ delete cd.c.vs; delete cd.c.vt; } } rr(); });
  m.querySelectorAll("[data-qcop]").forEach(s=>s.onchange=()=>{ Q.ws[+s.dataset.qcop].op=s.value; rr(); });
  m.querySelectorAll("[data-qcmore]").forEach(b=>b.onclick=()=>{ Q.ws[+b.dataset.qcmore].more=1; rr(); });
  m.querySelectorAll("[data-qcdel]").forEach(b=>b.onclick=()=>{ Q.ws.splice(+b.dataset.qcdel,1); if(Q.ws[0]) Q.ws[0].op=""; rr(); });
  m.querySelectorAll("[data-qclexx]").forEach(b=>b.onclick=e=>{ e.preventDefault(); delete Q.ws[+b.dataset.qclexx].c.lex; rr(); });
  m.querySelectorAll("[data-qclexq]").forEach(inp=>inp.oninput=()=>{ const k=inp.dataset.qclexq, box=document.getElementById("qcsug-"+k); const L=lexSuggest(inp.value).slice(0,8);
    box.innerHTML=L.map(li=>`<button data-qcpick="${li}"><span class="heb">${esc(SD.L[li][0])}</span> ${esc(lexGloss(li))} <small>${SD.L[li][7]}</small></button>`).join("");
    box.querySelectorAll("[data-qcpick]").forEach(b=>b.onclick=e=>{ e.preventDefault(); Q.ws[+k].c.lex=SD.L[+b.dataset.qcpick][1]; rr(); }); });
  const add=m.querySelector("#qcAdd"); if(add) add.onclick=()=>{ Q.tgt="clause"; Q.ws.push(qcCard()); rr(); };
  m.querySelectorAll("[data-qcq]").forEach(b=>b.onclick=()=>{ const k=b.dataset.qcq, t=Q_RECIPES[k]; S.qkey=k; S.qstep=0; S.qOpenQs=false; const C=qcFromText(t); if(C){ S.qc=C; qcSync(); } else { S.qui="adv"; S.qEdit=true; S.qMode="text"; S.qt=t; } qExec(); render(); document.getElementById("qResults")?.scrollIntoView({block:"start"}); });
  m.querySelectorAll(".qqd").forEach(d=>d.ontoggle=()=>{ S.qOpenQs=d.open; });
  const adv=m.querySelector("#qcToAdv"); if(adv) adv.onclick=()=>{ qcSync(); S.qui="adv"; S.qEdit=true; S.qMode="text"; S.qkey=S.qkey||null; render(); scrollTo({top:0}); };
  const bt=m.querySelector("#qcBackText"); if(bt) bt.onclick=()=>leaveWordToText();
}
/* 결과 보기 전환: '맞은 낱말 모아 보기' — 카드(낱말 상자)마다 맞은 낱말을 사전형별로 세고 형태를 덧붙인다 */
function qTallyHTML(R){ const S=view.st; if(!R.nw||!R.nw.length) return `<p class="lead">낱말 조건이 없는 검색이라 모아 볼 낱말이 없습니다. '절 목록'으로 보세요.</p>`;
  const fk=w=>{ const m=SD.M[SD.wm[w]]; return m[0]==="verb"?`${VS_K[m[1]]||m[1]} ${VT_K[m[2]]||m[2]}`:(SP_K[m[0]]||m[0]); };
  const lim=S.tallyMore?200:12;
  return (R.status!=="full"?`<p class="lead warn">결과가 ${R.status==="limit"?"20,000건에서 잘려":"계산이 중단되어"} 아래 수는 찾은 것까지만 센 것입니다.</p>`:"")+R.nw.map(([k,ids],ci)=>{ const by=new Map(); for(const w of ids){ const li=SD.wl[w]; let e=by.get(li); if(!e){ e={n:0,f:new Map()}; by.set(li,e); } e.n++; const f=fk(w); e.f.set(f,(e.f.get(f)||0)+1); }
    const L=[...by].sort((a,b)=>b[1].n-a[1].n), nd=R.order&&R.order[k];
    return `<div class="qtally"><span class="label">${R.nw.length>1?`낱말 ${QC_N[ci]||ci+1} — `:""}${nd?esc(qNodeKo(nd)):""} · ${ids.length.toLocaleString()}개, 사전형 ${L.length}가지</span><div class="qtrows">${L.slice(0,lim).map(([li,e])=>`<button class="qtrow" data-qtlex="${li}"><span class="heb">${esc(SD.L[li][0])}</span><b>${esc(lexGloss(li))}</b><i>${e.n.toLocaleString()}</i><small>${[...e.f].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([f,n])=>`${esc(f)} ${n}`).join(" · ")}</small></button>`).join("")}</div>${L.length>lim?`<button class="morebtn" data-qtmore="1">${L.length-lim}가지 더 보기 ▾</button>`:""}</div>`; }).join("")+`<p class="lead" style="font-size:12.5px">줄을 누르면 그 낱말의 다른 용례(구약 전체, 책별)를 엽니다.</p>`; }
function bindTally(m){ const S=view.st; m.querySelectorAll("[data-qview]").forEach(b=>b.onclick=()=>{ S.qview=b.dataset.qview; const y=scrollY; render(); scrollTo({top:y}); });
  m.querySelectorAll("[data-qtmore]").forEach(b=>b.onclick=()=>{ S.tallyMore=1; const y=scrollY; render(); scrollTo({top:y}); });
  m.querySelectorAll("[data-qtlex]").forEach(b=>b.onclick=()=>{ S.mode="word"; S.rmode="word"; S.lex=+b.dataset.qtlex; S.dom=""; S.vs=""; S.vt=""; S.q=""; S.more=1; S.wbook=null; render(); scrollTo({top:0}); }); }
