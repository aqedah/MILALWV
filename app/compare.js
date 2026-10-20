/* ===== compare.js — 본문 비교기 (5단계 첫 기능, 2026-10-20) =====
   두 범위를 나란히 놓고 **같은 어휘(lexeme)** 를 색으로 잇는다. 형태까지 같으면 실선 밑줄, 어휘만 같고 형태가 다르면 점선 밑줄, 한쪽에만 있으면 표시 없음.
   공통 연쇄(어순이 같은 공통 어휘 2개 이상)와 차이(LCS 정렬: 공통 / A에만 / B에만)를 보여 준다.
   자동으로 "인용이다·재진술이다·뜻이 바뀌었다"를 판정하지 않는다 — 관찰 자료만 주고, 해석은 사용자가 메모에 적는다. 자료는 BHSA 어휘·형태(SD.wl/SD.wm) 그대로. */
const CMP_FN=new Set(["art","prep","conj","prps","prde","prin","nega","inrg","intj"]);   /* 기능어(기본은 뺌; 켜면 포함) */
const CMP_PRESETS=[
  {n:"창 22장 안의 반복(1–10절 ↔ 11–19절)",a:"창 22:1-10",b:"창 22:11-19",t:"repeat"},
  {n:"욥 1:5 ↔ 34:5",a:"욥 1:5",b:"욥 34:5",t:"restate"},
  {n:"욥 32–37 발언 도입(32:6 ↔ 34:1)",a:"욥 32:6",b:"욥 34:1",t:"quote"},
  {n:"욥 발언 도입(35:1 ↔ 36:1)",a:"욥 35:1",b:"욥 36:1",t:"quote"}];
const CMP_PAL=["#F6E27A","#BFE3B4","#BBD6F3","#F3C4D8","#E6D3F7","#FFD9B3","#C9EDEA","#E0E0A8"];
function cmpParse(q){ q=String(q||"").trim(); if(!q) return null; const m=q.match(/^(.+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*[-–~]\s*(?:(\d+)\s*[:：]\s*)?(\d+))?$/); const r=m?parseStudyRef(`${m[1]} ${m[2]}:${m[3]}`):parseStudyRef(q); if(!r||r.err) return r||{err:"범위를 읽지 못했습니다"};
  const c1=r.c, v1=r.v||1, c2=m&&m[4]?+m[4]:c1, v2=m&&m[5]?+m[5]:(m?v1:999); return {b:r.b,c1,v1,c2,v2,label:`${PLAN.abbr[r.b-1]} ${c1}:${v1}${c2!==c1||v2!==v1?`–${c2!==c1?c2+":":""}${v2===999?"끝":v2}`:""}`}; }
function cmpVerses(R){ if(!R||!SD.loaded.has(R.b)) return []; const out=[]; const chs=[...SD.book[R.b].chs].filter(c=>c>=R.c1&&c<=R.c2).sort((x,y)=>x-y);
  for(const c of chs){ const vs=SD.ch.get(R.b+"-"+c)||[]; for(const vi of vs){ const v=SD.V[vi][2]; if((c===R.c1&&v<R.v1)||(c===R.c2&&v>R.v2)) continue; out.push(vi); } } return out; }
function cmpWords(vis){ const W=[]; for(const vi of vis){ const s=SD.V[vi][5], n=SD.V[vi][6]; for(let i=s;i<s+n;i++) W.push(i); } return W; }
const cmpForm=wi=>wHeb(wi).replace(/[֑-ֽֿ֯׀׃-ׇׅ]/g,"").trim();   /* 형태 비교: 악센트(타아밈)는 빼고 모음은 둔다 */
function cmpLCS(A,B){ const n=A.length,m=B.length; const T=Array.from({length:n+1},()=>new Int16Array(m+1)); for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) T[i][j]=A[i]===B[j]?T[i+1][j+1]+1:Math.max(T[i+1][j],T[i][j+1]);
  const ops=[]; let i=0,j=0; while(i<n&&j<m){ if(A[i]===B[j]){ ops.push(["=",i,j]); i++; j++; } else if(T[i+1][j]>=T[i][j+1]){ ops.push(["A",i,null]); i++; } else { ops.push(["B",null,j]); j++; } } while(i<n){ ops.push(["A",i,null]); i++; } while(j<m){ ops.push(["B",null,j]); j++; } return ops; }
function cmpCompute(S){ const A=cmpWords(cmpVerses(S.a)), B=S.b?cmpWords(cmpVerses(S.b)):[]; const keep=wi=>S.fn||!CMP_FN.has(SD.L[SD.wl[wi]][2]);
  const fa=A.filter(keep), fb=B.filter(keep); const cnt=W=>{ const M=new Map(); for(const wi of W){ const li=SD.wl[wi]; (M.get(li)||M.set(li,[]).get(li)).push(wi); } return M; };
  const ca=cnt(fa), cb=cnt(fb); const single=!S.b;
  const shared=[...ca.keys()].filter(li=>single?ca.get(li).length>=2:cb.has(li)).map(li=>{ const wa=ca.get(li), wb=single?[]:cb.get(li); const FA=new Set(wa.map(cmpForm)), FB=new Set((single?wa:wb).map(cmpForm)); const same=single?FA.size<wa.length:[...FA].some(f=>FB.has(f));
    return {li,wa,wb,formsA:[...FA],formsB:[...FB],same}; }).sort((x,y)=>(y.wa.length+y.wb.length)-(x.wa.length+x.wb.length));
  const color=new Map(shared.map((s,k)=>[s.li,CMP_PAL[k%CMP_PAL.length]])); const sharedSet=new Set(shared.map(s=>s.li));
  const onlyA=[...ca.keys()].filter(li=>!single&&!cb.has(li)), onlyB=[...cb.keys()].filter(li=>!ca.has(li));
  const ops=single?[]:cmpLCS(fa.map(wi=>SD.wl[wi]),fb.map(wi=>SD.wl[wi])); const runs=[]; let cur=null; for(const [op,i,j] of ops){ if(op==="="){ if(!cur) cur={a:[],b:[]}; cur.a.push(fa[i]); cur.b.push(fb[j]); } else { if(cur&&cur.a.length>=2) runs.push(cur); cur=null; } } if(cur&&cur.a.length>=2) runs.push(cur);
  const mark=(W)=>{ const M=new Map(); for(const wi of W){ const li=SD.wl[wi]; if(!sharedSet.has(li)) continue; const s=shared.find(x=>x.li===li); const f=cmpForm(wi); const other=single?s.formsA.filter((_,k)=>true):s.formsB; const sameForm=single?s.wa.filter(w=>cmpForm(w)===f).length>=2:(S.b?s.formsB.includes(f):false); M.set(wi,{bg:color.get(li),same:sameForm}); } return M; };
  return {A,B,fa,fb,shared,onlyA,onlyB,runs,ops,markA:mark(fa),markB:mark(single?[]:fb),single}; }
function cmpVerseHTML(vi,M){ const s=SD.V[vi][5], n=SD.V[vi][6], H=sHeb(vi); return `<div class="cmpv"><small>${esc(sRef(vi))}</small><p class="heb cmph" dir="rtl">${H.map((t,j)=>{ const wi=s+j, m=M.get(wi); const txt=esc(t.replace(/\s+$/,"")), sp=/\s$/.test(t)?" ":""; return m?`<span class="cw ${m.same?"cw-same":"cw-diff"}" style="background:${m.bg}" data-cw="${wi}">${txt}</span>${sp}`:`<span class="cw0" data-cw="${wi}">${txt}</span>${sp}`; }).join("")}</p>${krvText(vi)?`<p class="cmpk">${esc(krvText(vi))}</p>`:""}</div>`; }
function renderCompare(){ const S=view.st; S.cmp ||= {a:null,b:null,fn:false,t:"repeat",qa:"",qb:"",stack:false}; const C=S.cmp;
  let h=`<section class="sec"><span class="label">본문 비교기 <small>— 두 범위를 나란히 놓고 같은 어휘를 봅니다. 인용·재진술인지는 앱이 정하지 않습니다</small></span>
    <div class="cmpin"><label>A <input id="cmpA" type="text" placeholder="예: 창 22:1-10" value="${esc(C.qa)}"></label><label>B <input id="cmpB" type="text" placeholder="비워 두면 A 안의 반복만" value="${esc(C.qb)}"></label><button class="btn small" id="cmpGo">비교</button></div>
    <div class="cmppre">${CMP_PRESETS.map((p,k)=>`<button class="achip" data-cmppre="${k}">${esc(p.n)}</button>`).join("")}</div>
    <div class="rfrow"><div class="seg sseg mseg" style="flex:1">${[["repeat","반복"],["quote","인용 후보"],["restate","재진술 후보"]].map(([k,n])=>`<button aria-checked="${C.t===k}" data-cmpt="${k}">${n}</button>`).join("")}</div><label class="anchk" style="margin:0"><input type="checkbox" id="cmpFn"${C.fn?" checked":""}> 기능어 포함</label></div>`;
  if(!C.a){ return h+`<p class="lead">범위를 넣거나 위 보기를 누르세요. 형식: <code>창 22:1-10</code>, <code>욥 1:5</code>, <code>욥 32:6-33:33</code>.</p></section>`; }
  const need=[C.a.b,C.b&&C.b.b].filter(b=>b&&!SD.loaded.has(b)); if(need.length){ Promise.all(need.map(b=>loadBook(b))).then(()=>render()); return h+`<p class="lead">자료를 받는 중…</p></section>`; }
  const R=cmpCompute(C); S.cmpR=R; const va=cmpVerses(C.a), vb=C.b?cmpVerses(C.b):[];
  const tip=C.t==="repeat"?"같은 어휘가 두 구간(또는 한 구간 안)에서 얼마나 되풀이되는지 봅니다.":C.t==="quote"?"공통 표현과 <b>어순</b>(공통 연쇄)을 봅니다. 어순까지 같은 연쇄가 있어도 앱은 인용이라 단정하지 않습니다.":"공통 어휘·달라진 어휘·빠진 것·더해진 것을 차이 보기로 봅니다. 뜻이 바뀌었는지는 사용자가 판단합니다.";
  h+=`<p class="lead" style="margin:6px 0">${tip} <b>색</b>=같은 어휘 · <b>실선</b>=형태까지 같음 · <b>점선</b>=어휘만 같고 형태 다름 · 표시 없음=한쪽에만. 낱말을 누르면 형태·품사·뜻.</p>
    <div class="rfrow"><span class="label" style="margin:0">A ${esc(C.a.label)} · 낱말 ${R.A.length}${C.b?` · B ${esc(C.b.label)} · 낱말 ${R.B.length}`:""} · 공통 어휘 ${R.shared.length}</span><span style="flex:1"></span><button class="btn small ghost" id="cmpStack">${C.stack?"나란히":"위아래로"}</button></div>
    <div class="cmpcols${C.stack||!C.b?" stack":""}"><div class="cmpcol"><div class="cmphd">A · ${esc(C.a.label)}</div>${va.map(vi=>cmpVerseHTML(vi,R.markA)).join("")}</div>${C.b?`<div class="cmpcol"><div class="cmphd">B · ${esc(C.b.label)}</div>${vb.map(vi=>cmpVerseHTML(vi,R.markB)).join("")}</div>`:""}</div></section>`;
  /* 공통 어휘 표 */
  const lexBtn=(li,extra)=>`<button class="cmplex" data-cmplex="${li}"><span class="heb">${esc(SD.L[li][0])}</span><b>${esc(lexGloss(li))}</b><small>${esc(SP_K[SD.L[li][2]]||SD.L[li][2])}${extra?" · "+extra:""}</small></button>`;
  h+=`<section class="sec"><span class="label">공통 어휘 ${R.shared.length}${R.single?" (한 구간 안 반복)":""}</span>`;
  if(!R.shared.length) h+=`<p class="lead">공통 어휘가 없습니다${C.fn?"":" (기능어는 뺐습니다)"}.</p>`;
  else h+=`<div class="cmptbl">${R.shared.map(s=>`<div class="cmprow" style="border-left:6px solid ${s.li!=null?(R.markA.get(s.wa[0])||{}).bg||"#ddd":"#ddd"}">${lexBtn(s.li,R.single?`${s.wa.length}번 · 형태 ${s.formsA.length}가지${s.same?" (같은 형태 되풀이)":""}`:`A ${s.wa.length} · B ${s.wb.length} · ${s.same?"같은 형태 있음":"형태 다름"}`)}<small class="heb cmpforms">${esc(s.formsA.join(" · "))}${R.single?"":` ‖ ${esc(s.formsB.join(" · "))}`}</small></div>`).join("")}</div>`;
  h+=`</section>`;
  if(!R.single){ h+=`<section class="sec"><details class="mdet" open><summary>A에만 ${R.onlyA.length} · B에만 ${R.onlyB.length}</summary><div class="cmp2"><div><b>A에만</b>${R.onlyA.map(li=>lexBtn(li)).join("")||"<small>없음</small>"}</div><div><b>B에만</b>${R.onlyB.map(li=>lexBtn(li)).join("")||"<small>없음</small>"}</div></div></details></section>`;
    h+=`<section class="sec"><span class="label">공통 연쇄 ${R.runs.length} <small>(어순이 같은 공통 어휘 2개 이상 — 인용 후보의 관찰 자료)</small></span>${R.runs.length?R.runs.map(r=>`<div class="cmprun"><span class="heb" dir="rtl">${r.a.map(wi=>esc(wHeb(wi).trim())).join(" ")}</span><small>A ${esc(sRef(SD.vOf[r.a[0]]))} ‖ B ${esc(sRef(SD.vOf[r.b[0]]))} · 어휘 ${r.a.length}개</small></div>`).join(""):`<p class="lead">없음</p>`}</section>`;
    h+=`<section class="sec"><details class="mdet"${C.t==="restate"?" open":""}><summary>차이 보기 (정렬: 공통 / A에만 / B에만 — 생략·추가 관찰)</summary><div class="cmpdiff" dir="rtl">${R.ops.map(([op,i,j])=>{ const wi=op==="B"?R.fb[j]:R.fa[i]; return `<span class="cd cd-${op==="="?"s":op}" data-cw="${wi}" title="${op==="="?"공통":op==="A"?"A에만":"B에만"}">${esc(wHeb(wi).trim())}</span>`; }).join(" ")}</div><p class="lead"><span class="cd cd-s">공통</span> <span class="cd cd-A">A에만</span> <span class="cd cd-B">B에만</span> — 기계적 정렬이며 '생략했다·더했다'는 해석이 아닙니다.</p></details></section>`; }
  h+=`<section class="sec"><div class="rfrow"><button class="btn small" id="cmpNote">이 비교에 관찰·해석 쓰기</button><button class="btn small ghost" id="cmpMd">Markdown 내보내기</button></div><p class="lead">메모는 A 구간에 붙고 B 범위가 함께 기록됩니다(기록 탭의 구간 메모, 태그 #비교).</p></section>`;
  return h; }
function bindCompare(m){ const S=view.st, C=S.cmp; const go=()=>{ const qa=m.querySelector("#cmpA").value, qb=m.querySelector("#cmpB").value; const a=cmpParse(qa); if(!a||a.err){ toast(a?a.err:"A 범위를 넣으세요."); return; } const b=qb.trim()?cmpParse(qb):null; if(b&&b.err){ toast("B: "+b.err); return; } C.qa=qa; C.qb=qb; C.a=a; C.b=b; render(); };
  const g=m.querySelector("#cmpGo"); if(g) g.onclick=go; m.querySelectorAll("#cmpA,#cmpB").forEach(i=>i.onkeydown=e=>{ if(e.key==="Enter") go(); });
  m.querySelectorAll("[data-cmppre]").forEach(b=>b.onclick=()=>{ const p=CMP_PRESETS[+b.dataset.cmppre]; C.qa=p.a; C.qb=p.b; C.t=p.t; C.a=cmpParse(p.a); C.b=cmpParse(p.b); render(); });
  m.querySelectorAll("[data-cmpt]").forEach(b=>b.onclick=()=>{ C.t=b.dataset.cmpt; render(); }); const fn=m.querySelector("#cmpFn"); if(fn) fn.onchange=()=>{ C.fn=fn.checked; render(); };
  const st=m.querySelector("#cmpStack"); if(st) st.onclick=()=>{ C.stack=!C.stack; render(); };
  m.querySelectorAll("[data-cw]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); const wi=+x.dataset.cw; sheet(`낱말 · ${sRef(SD.vOf[wi])}`,`<div class="sdetail" id="rDet">${readDetail(wi)}</div>`); const d=document.getElementById("rDet"); if(d&&window.bindReadDet) bindReadDet(d); });
  m.querySelectorAll("[data-cmplex]").forEach(x=>x.onclick=()=>{ const li=+x.dataset.cmplex; S.mode="word"; S.lex=li; S.q=SD.L[li][0]; render(); scrollTo({top:0}); });
  const nb=m.querySelector("#cmpNote"); if(nb) nb.onclick=()=>{ const va=cmpVerses(C.a); if(!va.length) return; const anchor=anchorRange(va[0],va[va.length-1]); if(C.b){ const vb=cmpVerses(C.b); anchor.compare={book:C.b.b,ch:C.b.c1,vs:C.b.v1,ch2:C.b.c2,vs2:vb.length?SD.V[vb[vb.length-1]][2]:C.b.v2,label:C.b.label}; }
    const R=S.cmpR||{shared:[]}; const seed=R.shared.slice(0,6).map(s=>SD.L[s.li][0]+"("+lexGloss(s.li)+")").join(", ");
    openAnnotEditor("range",null,{kind:"range",key:"cmp:"+anchor.span.from_word+"-"+anchor.span.to_word+(C.b?"/"+C.b.label:""),anchor,_new:true,tags:["비교"],observation:seed?`공통 어휘: ${seed}${R.shared.length>6?" …":""}`:""}); };
  const md=m.querySelector("#cmpMd"); if(md) md.onclick=()=>exportCompare(); }
function exportCompare(){ const S=view.st, C=S.cmp, R=S.cmpR; if(!C||!C.a||!R) return; const date=new Date().toISOString().slice(0,10); const va=cmpVerses(C.a), vb=C.b?cmpVerses(C.b):[];
  const L=[`# 본문 비교 — ${C.a.label}${C.b?" ↔ "+C.b.label:" (한 구간 안 반복)"}`,``,`- 내보낸 날: ${date} · 자료: BHSA ${SD.bhsa||"2021"} · 비교 유형: ${({repeat:"반복",quote:"인용 후보",restate:"재진술 후보"})[C.t]} · 기능어 ${C.fn?"포함":"제외"}`,`- 앱은 인용·재진술·뜻 변화를 판정하지 않습니다. 아래는 어휘·형태·어순의 기계적 대조이고, 해석은 사용자의 것입니다.`,``,`## A · ${C.a.label}`,``];
  for(const vi of va) L.push(`- **${sRef(vi)}** ${sHeb(vi).join("").trim()}${krvText(vi)?`  \n  ${krvText(vi)}`:""}`);
  if(C.b){ L.push(``,`## B · ${C.b.label}`,``); for(const vi of vb) L.push(`- **${sRef(vi)}** ${sHeb(vi).join("").trim()}${krvText(vi)?`  \n  ${krvText(vi)}`:""}`); }
  L.push(``,`## 공통 어휘 ${R.shared.length}`,``,`| 어휘 | 뜻 | 품사 | ${R.single?"횟수 | 형태":"A | B | 형태 같음 | A 형태 | B 형태"} |`,`|---|---|---|${R.single?"---|---":"---|---|---|---|---"}|`);
  for(const s of R.shared) L.push(`| ${SD.L[s.li][0]} | ${lexGloss(s.li)} | ${SP_K[SD.L[s.li][2]]||SD.L[s.li][2]} | ${R.single?`${s.wa.length} | ${s.formsA.join(" · ")}`:`${s.wa.length} | ${s.wb.length} | ${s.same?"예":"아니오"} | ${s.formsA.join(" · ")} | ${s.formsB.join(" · ")}`} |`);
  if(!R.single){ L.push(``,`## A에만 (${R.onlyA.length})`,``,R.onlyA.map(li=>`${SD.L[li][0]}(${lexGloss(li)})`).join(", ")||"없음",``,`## B에만 (${R.onlyB.length})`,``,R.onlyB.map(li=>`${SD.L[li][0]}(${lexGloss(li)})`).join(", ")||"없음",``,`## 공통 연쇄 (어순 같은 공통 어휘 2개 이상) ${R.runs.length}`,``);
    for(const r of R.runs) L.push(`- ${r.a.map(wi=>wHeb(wi).trim()).join(" ")} — A ${sRef(SD.vOf[r.a[0]])} ‖ B ${sRef(SD.vOf[r.b[0]])}`);
    L.push(``,`## 차이 보기 (정렬)`,``,R.ops.map(([op,i,j])=>{ const wi=op==="B"?R.fb[j]:R.fa[i]; const w=wHeb(wi).trim(); return op==="="?w:op==="A"?`[A:${w}]`:`[B:${w}]`; }).join(" ")); }
  const txt=L.join("\n"), name=`milal-비교-${date}.md`; const url=URL.createObjectURL(new Blob([txt],{type:"text/markdown;charset=utf-8"})); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },500);
  window.__lastExport={name,txt}; if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast("Markdown 파일을 내려받고 클립보드에도 복사했습니다."),()=>toast("파일을 내려받았습니다.")); else toast("파일을 내려받았습니다."); }
