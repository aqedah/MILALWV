/* ===== compare.js — 본문 비교기 (5단계, 2판 2026-10-20) =====
   두 범위를 나란히 놓고 **같은 어휘(lexeme)** 를 색으로 잇는다.
   - 실선 = 그 낱말의 형태가 **상대편 본문의 같은 어휘**에도 그대로 있음 · 점선 = 어휘만 같고 그 형태는 상대편에 없음 · 표시 없음 = 한쪽에만 있는 어휘
   - 색은 보조 정보(8색 반복). 어휘의 동일성은 색이 아니라 **공통 어휘 표에서 어휘를 눌러 강조**해 확인한다(다른 어휘는 흐려짐).
   - 공통 연쇄 = 어순이 같은 공통 어휘 2개 이상(양쪽 본문에서 이어진 자리). 차이 보기 = LCS 정렬(범위가 작을 때만 정확 정렬; 크면 생략하고 그렇다고 말한다).
   자동으로 "인용이다·재진술이다·뜻이 바뀌었다"를 판정하지 않는다. 자료는 BHSA 어휘(SD.wl)·형태(원문 낱말, 악센트 제거) 그대로. */
const CMP_FN=new Set(["art","prep","conj","prps","prde","prin","nega","inrg","intj"]);   /* 기능어(기본은 뺌; 켜면 포함) */
const CMP_PRESETS=[   /* 2026-10-21 목사님이 고른 대표 예시. g: 반복 / 인용 / 재진술. B 가 비면 A 한 구간 안의 반복 */
  {g:"repeat",n:"창 37:2–11 — '미워하다'",a:"창 37:2-11",b:"",t:"repeat",sel:"FN>["},
  {g:"repeat",n:"삼상 14장 — '건너가다(아바르)'",a:"삼상 14",b:"",t:"repeat",sel:"<BR["},
  {g:"quote",n:"안식일: 창 2:1–3 ↔ 출 20:8–11",a:"창 2:1-3",b:"출 20:8-11",t:"quote"},
  {g:"quote",n:"시온의 산: 사 2:1–4 ↔ 미 4:1–5",a:"사 2:1-4",b:"미 4:1-5",t:"quote"},
  {g:"quote",n:"고레스 칙령: 대하 36:22–23 ↔ 스 1:1–4",a:"대하 36:22-23",b:"스 1:1-4",t:"quote"},
  {g:"restate",n:"사람이 무엇이기에: 시 8:4 ↔ 욥 15:14",a:"시 8:4",b:"욥 15:14",t:"restate"},
  {g:"restate",n:"엘리후가 욥의 말을: 욥 13:24, 27 ↔ 33:9–11",a:"욥 13:24,27",b:"욥 33:9-11",t:"restate"},
  {g:"restate",n:"엘리후가 욥의 말을: 욥 13:18 ↔ 34:5",a:"욥 13:18",b:"욥 34:5",t:"restate"},
  {g:"restate",n:"엘리후가 욥의 말을: 욥 27:2 ↔ 34:6",a:"욥 27:2",b:"욥 34:6",t:"restate"}];
const CMP_PRE_G=[["repeat","반복 예시"],["quote","인용 후보 예시"],["restate","재진술 후보 예시"]];
/* 예시 단추·시험에서 쓰는 한 줄 실행 */
function cmpGo(qa,qb,t,selKey){ const S=view.st; S.cmp ||= {a:null,b:null,fn:false,t:"repeat",qa:"",qb:"",stack:false,sel:null}; const C=S.cmp; C.err=null; C.qa=qa; C.qb=qb||""; if(t) C.t=t; C.a=cmpParse(qa); C.b=qb?cmpParse(qb):null; C.sel=selKey&&SD.lexByKey[selKey]?SD.lexByKey[selKey][0]:null; C.selRun=null; render(); if(C.sel!=null){ const el=document.querySelector(".cmpsel"); if(el) el.scrollIntoView({block:"center"}); } }   /* 반복 예시는 그 낱말을 바로 강조 */
const CMP_PAL=["#F6E27A","#BFE3B4","#BBD6F3","#F3C4D8","#E6D3F7","#FFD9B3","#C9EDEA","#E0E0A8"];
const CMP_LCS_MAX=9000000;        /* 정확 정렬(LCS) 상한: 낱말 수 A×B. 3000×3000 ≈ 표 18MB(Uint16)·수십 ms */
const CMP_TYPE_KO={repeat:"반복",quote:"인용 후보",restate:"재진술 후보"};
/* ---- 범위 읽기: "창 22:1-10" · "욥 1:5" · "욥 32:6-33:33" · "창 22" (장 전체) ---- */
/* 쉼표로 떨어진 절들: "욥 13:24,27" · "욥 13:24-25, 27" · "욥 13:18, 14:3" — 같은 책 안에서 조각을 이어 붙인다 */
function cmpParseList(q){ const parts=q.split(/\s*[,，]\s*/).filter(Boolean); const first=cmpParse(parts[0]); if(!first||first.err) return first; const P=[{c1:first.c1,v1:first.v1,c2:first.c2,v2:first.v2}]; let lastC=first.c2;
  for(const t of parts.slice(1)){ const m=t.match(/^(?:(\d+)\s*[:：]\s*)?(\d+)(?:\s*[-–~]\s*(?:(\d+)\s*[:：]\s*)?(\d+))?$/); if(!m) return {err:`'${t}'를 읽지 못했습니다. 같은 책 안의 절만 쉼표로 이을 수 있습니다(예: 욥 13:24,27)`};
    const c1=m[1]?+m[1]:lastC, v1=+m[2], c2=m[3]?+m[3]:c1, v2=m[4]?+m[4]:v1; if(c2<c1||(c2===c1&&v2<v1)) return {err:`'${t}': 시작이 끝보다 뒤입니다.`}; P.push({c1,v1,c2,v2}); lastC=c2; }
  P.sort((x,y)=>x.c1-y.c1||x.v1-y.v1); const lab=P.map((p,k)=>{ const st=k===0||p.c1!==P[k-1].c2?`${p.c1}:${p.v1}`:`${p.v1}`; return st+(p.c2!==p.c1||p.v2!==p.v1?`–${p.c2!==p.c1?p.c2+":":""}${p.v2}`:""); }).join(", ");
  return {b:first.b,c1:P[0].c1,v1:P[0].v1,c2:P[P.length-1].c2,v2:P[P.length-1].v2,parts:P,label:`${PLAN.abbr[first.b-1]} ${lab}`}; }
function cmpParse(q){ q=String(q||"").trim(); if(!q) return null; if(/[,，]/.test(q)) return cmpParseList(q);
  const m=q.match(/^(.+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*[-–~]\s*(?:(\d+)\s*[:：]\s*)?(\d+))?$/); const mc=!m&&q.match(/^(.+?)\s*(\d+)(?:\s*[-–~]\s*(\d+))?\s*장?$/);
  const r=m?parseStudyRef(`${m[1]} ${m[2]}:${m[3]}`):mc?parseStudyRef(`${mc[1]} ${mc[2]}`):parseStudyRef(q); if(!r||r.err) return r||{err:"범위를 읽지 못했습니다. 예: 창 22:1-10, 욥 1:5, 욥 32:6-33:33"};
  let c1=r.c, v1=1, c2=c1, v2=999;
  if(m){ v1=+m[3]; c2=m[4]?+m[4]:c1; v2=m[5]?+m[5]:v1; } else if(mc&&mc[3]){ c2=+mc[3]; }
  if(c2<c1||(c2===c1&&v2<v1)) return {err:`시작(${c1}:${v1})이 끝(${c2}:${v2})보다 뒤입니다.`};
  if(c2!==c1&&!SD.book[r.b].chs.has(c2)) return {err:`${PLAN.full[r.b-1]}에는 ${c2}장이 없습니다.`};
  return {b:r.b,c1,v1,c2,v2,label:`${PLAN.abbr[r.b-1]} ${c1}:${v1}${c2!==c1||v2!==v1?`–${c2!==c1?c2+":":""}${v2===999?"끝":v2}`:""}`}; }
function cmpVerses(R){ if(!R||!SD.loaded.has(R.b)) return []; if(R.parts){ const seen=new Set(), acc=[]; for(const p of R.parts) for(const vi of cmpVerses({b:R.b,...p})) if(!seen.has(vi)){ seen.add(vi); acc.push(vi); } return acc.sort((x,y)=>x-y); } const out=[]; const chs=[...SD.book[R.b].chs].filter(c=>c>=R.c1&&c<=R.c2).sort((x,y)=>x-y);
  for(const c of chs){ const vs=SD.ch.get(R.b+"-"+c)||[]; for(const vi of vs){ const v=SD.V[vi][2]; if((c===R.c1&&v<R.v1)||(c===R.c2&&v>R.v2)) continue; out.push(vi); } } return out; }
function cmpWords(vis){ const W=[]; for(const vi of vis){ const s=SD.V[vi][5], n=SD.V[vi][6]; for(let i=s;i<s+n;i++) W.push(i); } return W; }
const cmpJoin=W=>W.map(wi=>wHeb(wi)).join("").trim();
/* 원문 구간(첫 낱말~끝 낱말)을 그대로 보이되, 기능어 제외로 건너뛴 낱말은 흐리게 */
const cmpSpanHTML=W=>{ const inRun=new Set(W); let h=""; for(let wi=W[0];wi<=W[W.length-1];wi++){ const t=esc(wHeb(wi)); h+=inRun.has(wi)?t:`<span class="cw-skip">${t}</span>`; } return h.trim(); };
const cmpSpanMd=W=>{ const inRun=new Set(W); let h=""; for(let wi=W[0];wi<=W[W.length-1];wi++){ const t=wHeb(wi); h+=inRun.has(wi)?t:`⟨${t.trim()}⟩${/\s$/.test(t)?" ":""}`; } return h.trim(); };
const cmpForm=wi=>wHeb(wi).replace(/[\u0591-\u05AF\u05BD-\u05C0\u05C3-\u05C6]/g,"").trim();   /* 형태 비교: 악센트(타아밈 U+0591–05AF)·메테그·마케프·라페·파세크·소프파수크는 빼고, 모음(U+05B0–05BB)·다게쉬·쉰/신 점은 둔다 */
/* 범위 검증(자료를 받은 뒤): 없는 절·역순·다른 책·같은 범위·겹침 */
function cmpValidate(C){ const E=[], W=[]; const chk=(R,tag)=>{ if(!R) return null; const vs=cmpVerses(R); if(!vs.length){ E.push(`${tag} ${R.label}: 그 범위에 절이 없습니다(${PLAN.full[R.b-1]} ${R.c1}장의 절 번호를 확인하세요).`); return null; }
    const last=SD.V[vs[vs.length-1]]; if(R.v2!==999&&(last[1]<R.c2||(last[1]===R.c2&&last[2]<R.v2))) W.push(`${tag} ${R.label}: 끝 절 ${R.c2}:${R.v2}가 없어 ${last[1]}:${last[2]}까지만 비교합니다.`);
    if(R.v1>1){ const first=SD.V[vs[0]]; if(first[1]!==R.c1||first[2]!==R.v1) E.push(`${tag} ${R.label}: ${R.c1}:${R.v1}절이 없습니다.`); } return vs; };
  const va=chk(C.a,"A"), vb=C.b?chk(C.b,"B"):null;
  if(va&&vb){ if(C.a.b!==C.b.b) W.push(`서로 다른 책(${PLAN.full[C.a.b-1]} ↔ ${PLAN.full[C.b.b-1]})을 비교합니다 — 공통 어휘는 같은 BHSA 어휘 번호로 찾습니다.`);
    const sa=new Set(va); const ov=vb.filter(v=>sa.has(v)).length;
    if(ov===va.length&&ov===vb.length) E.push("A와 B가 같은 범위입니다. 한 구간 안의 반복을 보려면 B를 비워 두세요.");
    else if(ov) W.push(`A와 B가 ${ov}절 겹칩니다 — 겹친 절의 낱말은 양쪽 모두에 세어지므로 공통 어휘 수가 부풀 수 있습니다.`); }
  return {errors:E,warnings:W,va:va||[],vb:vb||[]}; }
/* ---- 정확 정렬(LCS): 평평한 Uint16 표. 값은 ≤ min(n,m) ≤ 65535 ---- */
function cmpLCS(A,B){ const n=A.length,m=B.length,W=m+1; if(n*m>CMP_LCS_MAX||n>65000||m>65000) return null; const T=new Uint16Array((n+1)*W);
  for(let i=n-1;i>=0;i--){ const ai=A[i], row=i*W, nrow=row+W; for(let j=m-1;j>=0;j--) T[row+j]=ai===B[j]?T[nrow+j+1]+1:Math.max(T[nrow+j],T[row+j+1]); }
  const ops=[]; let i=0,j=0; while(i<n&&j<m){ if(A[i]===B[j]){ ops.push(["=",i,j]); i++; j++; } else if(T[(i+1)*W+j]>=T[i*W+j+1]){ ops.push(["A",i,null]); i++; } else { ops.push(["B",null,j]); j++; } } while(i<n){ ops.push(["A",i,null]); i++; } while(j<m){ ops.push(["B",null,j]); j++; } return ops; }
/* ---- 공통 연쇄: 어순이 같은 공통 어휘 2개 이상이 양쪽에서 이어진 자리(최대 확장, 겹치는 짧은 것은 제외). O(n·k) — 정렬과 무관하게 큰 범위에서도 돈다 ---- */
function cmpRuns(LA,LB,fa,fb){ const pos=new Map(); for(let j=0;j+1<LB.length;j++){ const k=LB[j]+"|"+LB[j+1]; (pos.get(k)||pos.set(k,[]).get(k)).push(j); }
  const runs=[], seen=new Set(); for(let i=0;i+1<LA.length;i++){ const L=pos.get(LA[i]+"|"+LA[i+1]); if(!L) continue; for(const j of L){ if(seen.has(i+","+j)) continue; let len=2; while(i+len<LA.length&&j+len<LB.length&&LA[i+len]===LB[j+len]) len++; for(let t=0;t<len-1;t++) seen.add((i+t)+","+(j+t)); runs.push({a:fa.slice(i,i+len),b:fb.slice(j,j+len),ai:i,bj:j,len}); } }
  return runs.sort((x,y)=>y.len-x.len||x.ai-y.ai); }
function cmpCompute(S){ const t0=performance.now(); const A=cmpWords(cmpVerses(S.a)), B=S.b?cmpWords(cmpVerses(S.b)):[]; const keep=wi=>S.fn||!CMP_FN.has(SD.L[SD.wl[wi]][2]);
  const fa=A.filter(keep), fb=B.filter(keep); const cnt=W=>{ const M=new Map(); for(const wi of W){ const li=SD.wl[wi]; (M.get(li)||M.set(li,[]).get(li)).push(wi); } return M; };
  const ca=cnt(fa), cb=cnt(fb); const single=!S.b;
  /* 공통 어휘: 양쪽에 있는 어휘(한 구간 모드는 2번 이상). 형태는 양쪽을 따로 모은다 */
  const shared=[...ca.keys()].filter(li=>single?ca.get(li).length>=2:cb.has(li)).map(li=>{ const wa=ca.get(li), wb=single?[]:cb.get(li); const FA=new Set(wa.map(cmpForm)), FB=new Set(wb.map(cmpForm));
    const sameForms=single?[...FA].filter(f=>wa.filter(w=>cmpForm(w)===f).length>=2):[...FA].filter(f=>FB.has(f));   /* 양쪽에 실제로 다 있는 형태만 */
    return {li,wa,wb,formsA:[...FA],formsB:[...FB],sameForms,same:sameForms.length>0}; }).sort((x,y)=>(y.wa.length+y.wb.length)-(x.wa.length+x.wb.length));
  const byLi=new Map(shared.map(s=>[s.li,s])); const color=new Map(shared.map((s,k)=>[s.li,CMP_PAL[k%CMP_PAL.length]]));
  const onlyA=[...ca.keys()].filter(li=>!single&&!cb.has(li)), onlyB=[...cb.keys()].filter(li=>!ca.has(li));
  /* 낱말별 표시: A 의 낱말은 B 쪽 같은 어휘의 형태 집합과, B 의 낱말은 A 쪽과 대조(대칭). 한 구간 모드는 같은 형태가 2번 이상이면 실선 */
  const mark=(W,side)=>{ const M=new Map(); for(const wi of W){ const s=byLi.get(SD.wl[wi]); if(!s) continue; const f=cmpForm(wi); const other=single?null:(side==="A"?s.formsB:s.formsA);
      const sameForm=single?s.sameForms.includes(f):other.includes(f); M.set(wi,{bg:color.get(s.li),same:sameForm,li:s.li,form:f}); } return M; };
  const LA=fa.map(wi=>SD.wl[wi]), LB=fb.map(wi=>SD.wl[wi]); const cost=LA.length*LB.length;
  const ops=single?[]:cmpLCS(LA,LB); const exact=single?true:ops!==null;
  /* 공통 연쇄를 둘로 나눈다(섞지 않음):
     ① 원문 연속 표현 — 기능어를 빼지 않은 실제 BHSA 낱말 순서에서 바로 이어지는 동일 어휘 연쇄(기능어 제외 설정이면 내용어가 2개 이상인 것만; 기능어만의 연쇄는 세지 않음)
     ② 기능어 제외 어순 대응 — 기능어를 뺀 배열에서만 같은 순서로 이어지는 표현(원문에서는 사이에 기능어가 끼어 있어 ①에 들지 않는 것) */
  const isFn=wi=>CMP_FN.has(SD.L[SD.wl[wi]][2]); const contig=W=>W.every((wi,k)=>k===0||wi===W[k-1]+1);
  const runsText=single?[]:cmpRuns(A.map(wi=>SD.wl[wi]),B.map(wi=>SD.wl[wi]),A,B).filter(r=>S.fn||r.a.filter(w=>!isFn(w)).length>=2).map(r=>Object.assign(r,{fnIn:r.a.filter(isFn).length,cross:SD.vOf[r.a[0]]!==SD.vOf[r.a[r.a.length-1]]||SD.vOf[r.b[0]]!==SD.vOf[r.b[r.b.length-1]]}));   /* cross: 절 경계를 넘는 연쇄 */
  const spanLex=W=>{ const o=[]; for(let wi=W[0];wi<=W[W.length-1];wi++) o.push(SD.wl[wi]); return o.join(","); };   /* 원문 구간(기능어 포함)의 어휘열이 양쪽에서 같으면 이미 ①이므로 ②에서 뺀다 */
  const runsFilt=single||S.fn?[]:cmpRuns(LA,LB,fa,fb).filter(r=>!(contig(r.a)&&contig(r.b))&&spanLex(r.a)!==spanLex(r.b)).map(r=>Object.assign(r,{skipA:r.a[r.a.length-1]-r.a[0]+1-r.a.length,skipB:r.b[r.b.length-1]-r.b[0]+1-r.b.length}));
  const runs=runsText;
  /* 기능어 영향: 포함/제외 두 경우의 공통 어휘 수(안내용) */
  let fnNote=null; if(!single){ const lexSet=(W,noFn)=>new Set(W.filter(w=>!noFn||!CMP_FN.has(SD.L[SD.wl[w]][2])).map(w=>SD.wl[w])); const inter=(x,y)=>[...x].filter(l=>y.has(l)).length;
    fnNote={withFn:inter(lexSet(A,false),lexSet(B,false)),withoutFn:inter(lexSet(A,true),lexSet(B,true))}; }
  return {A,B,fa,fb,shared,byLi,onlyA,onlyB,runs,runsText,runsFilt,ops:ops||[],exact,cost,markA:mark(fa,"A"),markB:mark(single?[]:fb,"B"),single,ms:Math.round(performance.now()-t0),fnNote}; }
function cmpVerseHTML(vi,M,sel){ const s=SD.V[vi][5], n=SD.V[vi][6], H=sHeb(vi); const SR=view.st.cmp&&view.st.cmp.selRun;   /* selRun: 고른 '기능어 제외 어순 대응' — 그 낱말은 강조, 사이에서 건너뛴 낱말은 흐리게 */
  const runCls=wi=>{ if(!SR) return ""; if(SR.in.has(wi)) return " cw-on"; if(SR.skip.has(wi)) return " cw-skip"; return ""; };
  return `<div class="cmpv"><small>${esc(sRef(vi))}</small><p class="heb cmph" dir="rtl">${H.map((t,j)=>{ const wi=s+j, m=M.get(wi); const txt=esc(t.replace(/\s+$/,"")), sp=/\s$/.test(t)?" ":"";
    if(!m) return `<span class="cw0${sel!=null?" cw-dim":""}${runCls(wi)}" data-cw="${wi}">${txt}</span>${sp}`;
    const on=sel!=null&&m.li===sel, dim=sel!=null&&!on; return `<span class="cw ${m.same?"cw-same":"cw-diff"}${on?" cw-on":""}${dim?" cw-dim":""}${runCls(wi)}" style="background:${dim?"transparent":m.bg}" data-cw="${wi}" data-li="${m.li}">${txt}</span>${sp}`; }).join("")}</p>${krvText(vi)?`<p class="cmpk">${esc(krvText(vi))}</p>`:""}</div>`; }
function renderCompare(){ const S=view.st; S.cmp ||= {a:null,b:null,fn:false,t:"repeat",qa:"",qb:"",stack:false,sel:null}; const C=S.cmp;
  let h=`<section class="sec"><span class="label">본문 비교기 <small>— 두 범위를 나란히 놓고 같은 어휘를 봅니다. 인용·재진술인지는 앱이 정하지 않습니다</small></span>
    <div class="cmpin"><label>A <input id="cmpA" type="text" placeholder="예: 창 2:1-3 · 욥 13:24,27" value="${esc(C.qa)}"></label><label>B <input id="cmpB" type="text" placeholder="비워 두면 A 안의 반복만" value="${esc(C.qb)}"></label><button class="btn small" id="cmpGo">비교</button></div>
    <div class="cmppre"><span class="label" style="margin:6px 0 4px">예시 — 누르면 그 본문을 바로 비교합니다</span>${CMP_PRE_G.map(([g,gn])=>`<div class="cmppreg"><small>${gn}</small>${CMP_PRESETS.map((p,k)=>p.g===g?`<button class="achip" data-cmppre="${k}">예시 · ${esc(p.n)}</button>`:"").join("")}</div>`).join("")}</div>
    <div class="rfrow"><div class="seg sseg mseg" style="flex:1">${[["repeat","반복"],["quote","인용 후보"],["restate","재진술 후보"]].map(([k,n])=>`<button aria-checked="${C.t===k}" data-cmpt="${k}">${n}</button>`).join("")}</div><label class="anchk" style="margin:0"><input type="checkbox" id="cmpFn"${C.fn?" checked":""}> 기능어 포함</label></div>`;
  if(C.err) h+=`<p class="lead warn">⚠ ${esc(C.err)}</p>`;
  if(!C.a){ return h+`<p class="lead">범위를 넣거나 위 보기를 누르세요. 형식: <code>창 22:1-10</code>, <code>욥 1:5</code>, <code>욥 32:6-33:33</code>, <code>창 22</code>(장 전체).</p></section>`; }
  const need=[C.a.b,C.b&&C.b.b].filter(b=>b&&!SD.loaded.has(b)); if(need.length){ Promise.all(need.map(b=>loadBook(b))).then(()=>render()); return h+`<p class="lead">자료를 받는 중…</p></section>`; }
  const V=cmpValidate(C); if(V.errors.length){ return h+V.errors.map(e=>`<p class="lead warn">⚠ ${esc(e)}</p>`).join("")+`</section>`; }
  h+=V.warnings.map(w=>`<p class="lead warn">⚠ ${esc(w)}</p>`).join("");
  const R=cmpCompute(C); S.cmpR=R; const va=V.va, vb=V.vb; const sel=C.sel!=null&&R.byLi.has(C.sel)?C.sel:null; C.sel=sel;
  const tip=C.t==="repeat"?"같은 어휘가 두 구간(또는 한 구간 안)에서 얼마나 되풀이되는지 봅니다.":C.t==="quote"?"공통 표현과 <b>어순</b>(공통 연쇄)을 봅니다. 어순까지 같은 연쇄가 있어도 앱은 인용이라 단정하지 않습니다.":"공통 어휘·달라진 어휘·빠진 것·더해진 것을 차이 보기로 봅니다. 뜻이 바뀌었는지는 사용자가 판단합니다.";
  h+=`<p class="lead" style="margin:6px 0">${tip} <b>색</b>=같은 어휘(보조 표시, 8색을 돌려 씀 — 같은 색이 같은 어휘라는 뜻은 아님) · <b>실선</b>=이 형태가 상대편에도 있음 · <b>점선</b>=어휘만 같고 이 형태는 상대편에 없음 · 표시 없음=한쪽에만. 어휘를 확실히 보려면 아래 표에서 어휘를 누르세요.</p>`;
  if(R.fnNote&&R.fnNote.withFn>=2*Math.max(1,R.fnNote.withoutFn)) h+=`<p class="lead">기능어(전치사·접속사·대명사 등)를 ${C.fn?"포함해서":"빼고"} 셌습니다 — 기능어 포함 ${R.fnNote.withFn} / 제외 ${R.fnNote.withoutFn}. 차이가 크니 두 쪽을 다 보세요.</p>`;
  const selS=sel!=null?R.byLi.get(sel):null;
  h+=`<div class="rfrow"><span class="label" style="margin:0">A ${esc(C.a.label)} · 낱말 ${R.A.length}${C.b?` · B ${esc(C.b.label)} · 낱말 ${R.B.length}`:""} · 공통 어휘 ${R.shared.length}</span><span style="flex:1"></span><button class="btn small ghost" id="cmpStack">${C.stack?"나란히":"위아래로"}</button></div>`;
  if(selS) h+=`<div class="cmpsel"><span class="heb">${esc(SD.L[sel][0])}</span> <b>${esc(lexGloss(sel))}</b> — A ${selS.wa.length}번${R.single?"":` · B ${selS.wb.length}번`}: ${[...selS.wa,...selS.wb].map(wi=>`<button class="mgo" data-cwgo="${wi}">${esc(sRef(SD.vOf[wi]))} <span class="heb">${esc(cmpForm(wi))}</span></button>`).join(" ")} <button class="btn small ghost" id="cmpSelOff">전체 보기</button></div>`;
  h+=`<div class="cmpcols${C.stack||!C.b?" stack":""}"><div class="cmpcol"><div class="cmphd">A · ${esc(C.a.label)}</div>${va.map(vi=>cmpVerseHTML(vi,R.markA,sel)).join("")}</div>${C.b?`<div class="cmpcol"><div class="cmphd">B · ${esc(C.b.label)}</div>${vb.map(vi=>cmpVerseHTML(vi,R.markB,sel)).join("")}</div>`:""}</div></section>`;
  /* 공통 어휘 표: 누르면 그 어휘만 강조 */
  const lexBtn=(li,extra,act)=>`<button class="cmplex${sel===li?" on":""}" data-${act||"cmplex"}="${li}"><span class="heb">${esc(SD.L[li][0])}</span><b>${esc(lexGloss(li))}</b><small>${esc(SP_K[SD.L[li][2]]||SD.L[li][2])}${extra?" · "+extra:""}</small></button>`;
  h+=`<section class="sec"><span class="label">공통 어휘 ${R.shared.length}${R.single?" (한 구간 안 반복)":""} <small>— 누르면 본문에서 그 어휘만 강조</small></span>`;
  if(!R.shared.length) h+=`<p class="lead">공통 어휘가 없습니다${C.fn?"":" (기능어는 뺐습니다 — '기능어 포함'을 켜 보세요)"}.</p>`;
  else h+=`<div class="cmptbl">${R.shared.map(s=>`<div class="cmprow${sel===s.li?" on":""}" style="border-left:6px solid ${(R.markA.get(s.wa[0])||{}).bg||"#ddd"}">${lexBtn(s.li,R.single?`${s.wa.length}번 · 형태 ${s.formsA.length}가지${s.same?" (같은 형태 되풀이)":""}`:`A ${s.wa.length} · B ${s.wb.length} · ${s.same?`같은 형태 ${s.sameForms.length}가지`:"형태 다름"}`)}<small class="heb cmpforms">${esc(s.formsA.join(" · "))}${R.single?"":` ‖ ${esc(s.formsB.join(" · "))}`}</small><button class="btn small ghost cmpinfo" data-cmpword="${s.wa[0]}">낱말 정보</button></div>`).join("")}</div>`;
  h+=`</section>`;
  if(!R.single){ h+=`<section class="sec"><details class="mdet" open><summary>A에만 있는 어휘 ${R.onlyA.length} · B에만 있는 어휘 ${R.onlyB.length}</summary><div class="cmp2"><div><b>A에만 있는 어휘</b>${R.onlyA.map(li=>lexBtn(li,"","cmpword0")).join("")||"<small>없음</small>"}</div><div><b>B에만 있는 어휘</b>${R.onlyB.map(li=>lexBtn(li,"","cmpword0")).join("")||"<small>없음</small>"}</div></div></details></section>`;
    const runLi=(r,withB,idx)=>withB?`<div class="cmprun cmprun-f${C.selRun&&C.selRun.idx===idx?" on":""}" data-cmprun="${idx}" role="button" tabindex="0"><span class="heb" dir="rtl"><small>A</small> ${cmpSpanHTML(r.a)}</span><span class="heb" dir="rtl"><small>B</small> ${cmpSpanHTML(r.b)}</span><small>A ${esc(sRef(SD.vOf[r.a[0]]))} ‖ B ${esc(sRef(SD.vOf[r.b[0]]))} · 같은 순서의 어휘 ${r.len}개 · 흐린 낱말은 기능어 제외로 건너뛴 것(A ${r.skipA}·B ${r.skipB})</small></div>`
      :`<div class="cmprun"><span class="heb" dir="rtl">${esc(cmpJoin(r.a))}</span><small>A ${esc(sRef(SD.vOf[r.a[0]]))} ‖ B ${esc(sRef(SD.vOf[r.b[0]]))} · 어휘 ${r.len}개${r.fnIn?` (기능어 ${r.fnIn} 포함)`:""}${r.cross?` · <b>절 경계를 넘음</b>`:""}</small></div>`;
    h+=`<section class="sec"><span class="label">원문 연속 표현 ${R.runsText.length} <small>(기능어를 빼지 않은 실제 낱말 순서에서 바로 이어지는 동일 어휘 2개 이상${C.fn?"":" · 내용어 2개 이상인 것만"}${R.runsText.some(r=>r.cross)?` · 절 경계를 넘는 것 ${R.runsText.filter(r=>r.cross).length}개는 따로 표시`:""} — 같은 말이 이어진다는 관찰일 뿐, 인용·재진술 판정이 아님)</small></span>${R.runsText.length?R.runsText.slice(0,60).map(r=>runLi(r,false)).join("")+(R.runsText.length>60?`<p class="lead">긴 것부터 60개만 보였습니다(전체 ${R.runsText.length}개는 Markdown 내보내기에).</p>`:""):`<p class="lead">없음</p>`}</section>`;
    if(!C.fn) h+=`<section class="sec"><span class="label">기능어 제외 어순 대응 ${R.runsFilt.length} <small>(기능어를 뺀 뒤에만 같은 순서로 이어지는 표현 — 원문에서는 사이에 기능어가 끼어 있음. 위의 '원문 연속 표현'과 섞지 않음. 항목을 누르면 A/B 본문에서 그 자리를 강조하고 건너뛴 낱말을 흐리게 보입니다)</small></span>${C.selRun?`<div class="cmpsel">대응 ${C.selRun.idx+1} 을 본문에 표시 중 — <button class="btn small ghost" data-cwgo="${C.selRun.a0}">A 자리로</button> <button class="btn small ghost" data-cwgo="${C.selRun.b0}">B 자리로</button> <button class="btn small ghost" id="cmpRunOff">표시 끄기</button></div>`:""}${R.runsFilt.length?R.runsFilt.slice(0,60).map((r,i)=>runLi(r,true,i)).join("")+(R.runsFilt.length>60?`<p class="lead">긴 것부터 60개만 보였습니다(전체 ${R.runsFilt.length}개는 Markdown 내보내기에).</p>`:""):`<p class="lead">없음</p>`}</section>`;
    if(R.exact) h+=`<section class="sec"><details class="mdet"${C.t==="restate"?" open":""}><summary>차이 보기 (정확 정렬 LCS: 공통 / A쪽 미대응 / B쪽 미대응)</summary><div class="cmpdiff" dir="rtl">${R.ops.map(([op,i,j])=>{ const wi=op==="B"?R.fb[j]:R.fa[i]; return `<span class="cd cd-${op==="="?"s":op}" data-cw="${wi}" title="${op==="="?"정렬에서 대응됨":op==="A"?"A쪽 미대응 출현":"B쪽 미대응 출현"}">${esc(wHeb(wi).trim())}</span>`; }).join(" ")}</div><p class="lead"><span class="cd cd-s">대응</span> <span class="cd cd-A">A쪽 미대응</span> <span class="cd cd-B">B쪽 미대응</span> — 기계적 정렬입니다. '미대응'은 <b>그 정렬에서 짝이 없는 출현</b>이지, 그 어휘가 상대편에 전혀 없다는 뜻이 아닙니다(어휘 유무는 위 '…에만 있는 어휘'). '생략했다·더했다'는 해석이 아닙니다.</p></details></section>`;
    else h+=`<section class="sec"><p class="lead warn">차이 보기(정확 정렬)는 범위가 커서 생략했습니다 — 낱말 A×B = ${R.fa.length}×${R.fb.length} = ${R.cost.toLocaleString()} (상한 ${CMP_LCS_MAX.toLocaleString()}). 공통 어휘·형태·공통 연쇄는 그대로 셌습니다. 정렬을 보려면 범위를 줄이세요.</p></section>`; }
  h+=`<section class="sec"><div class="rfrow"><button class="btn small" id="cmpNote">이 비교에 관찰·해석 쓰기</button><button class="btn small ghost" id="cmpMd">Markdown 내보내기</button><button class="btn small ghost" id="cmpPrint" title="브라우저 인쇄 → PDF로 저장">인쇄·PDF</button></div><p class="lead">메모는 A·B 범위의 낱말 번호와 비교 설정을 함께 보관합니다(기록 탭 '구간 메모', 태그 #비교 — 누르면 이 비교 화면이 다시 열립니다). 계산 ${R.ms}ms.</p></section>`;
  return h; }
function bindCompare(m){ const S=view.st, C=S.cmp; const go=()=>{ const qa=m.querySelector("#cmpA").value, qb=m.querySelector("#cmpB").value; C.err=null; const a=cmpParse(qa); if(!a||a.err){ C.err=a?("A: "+a.err):"A 범위를 넣으세요."; C.a=null; render(); return; } const b=qb.trim()?cmpParse(qb):null; if(b&&b.err){ C.err="B: "+b.err; C.a=null; render(); return; } C.qa=qa; C.qb=qb; C.a=a; C.b=b; C.sel=null; C.selRun=null; render(); };
  const g=m.querySelector("#cmpGo"); if(g) g.onclick=go; m.querySelectorAll("#cmpA,#cmpB").forEach(i=>i.onkeydown=e=>{ if(e.key==="Enter") go(); });
  m.querySelectorAll("[data-cmppre]").forEach(b=>b.onclick=()=>{ const p=CMP_PRESETS[+b.dataset.cmppre]; cmpGo(p.a,p.b,p.t,p.sel); });
  m.querySelectorAll("[data-cmpt]").forEach(b=>b.onclick=()=>{ C.t=b.dataset.cmpt; render(); }); const fn=m.querySelector("#cmpFn"); if(fn) fn.onchange=()=>{ C.fn=fn.checked; render(); };
  const st=m.querySelector("#cmpStack"); if(st) st.onclick=()=>{ C.stack=!C.stack; render(); };
  const openWord=wi=>{ sheet(`낱말 · ${sRef(SD.vOf[wi])}`,`<div class="sdetail" id="rDet">${readDetail(wi)}</div>`); const d=document.getElementById("rDet"); if(d&&window.bindReadDet) bindReadDet(d); };
  m.querySelectorAll("[data-cw]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); openWord(+x.dataset.cw); });
  m.querySelectorAll("[data-cmpword]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); openWord(+x.dataset.cmpword); });
  m.querySelectorAll("[data-cmplex]").forEach(x=>x.onclick=()=>{ const li=+x.dataset.cmplex; C.sel=C.sel===li?null:li; render(); const el=document.querySelector(".cmpsel"); if(el) el.scrollIntoView({block:"start"}); });
  m.querySelectorAll("[data-cmpword0]").forEach(x=>x.onclick=()=>{ const li=+x.dataset.cmpword0; S.mode="word"; S.lex=li; S.q=SD.L[li][0]; render(); scrollTo({top:0}); });
  const off=m.querySelector("#cmpSelOff"); if(off) off.onclick=()=>{ C.sel=null; C.selRun=null; render(); };
  m.querySelectorAll("[data-cmprun]").forEach(x=>x.onclick=()=>{ const i=+x.dataset.cmprun, r=S.cmpR&&S.cmpR.runsFilt[i]; if(!r) return; if(C.selRun&&C.selRun.idx===i){ C.selRun=null; render(); return; }
    const inSet=new Set([...r.a,...r.b]); const skip=new Set(); for(const W of [r.a,r.b]) for(let wi=W[0];wi<=W[W.length-1];wi++) if(!inSet.has(wi)) skip.add(wi);
    C.selRun={idx:i,in:inSet,skip,a0:r.a[0],b0:r.b[0]}; render(); const el=m.querySelector(`.cmph [data-cw="${r.a[0]}"]`)||document.querySelector(`.cmph [data-cw="${r.a[0]}"]`); if(el) el.scrollIntoView({block:"center"}); });
  const roff=m.querySelector("#cmpRunOff"); if(roff) roff.onclick=()=>{ C.selRun=null; render(); };
  m.querySelectorAll("[data-cwgo]").forEach(x=>x.onclick=()=>{ const el=m.querySelector(`.cmph [data-cw="${x.dataset.cwgo}"]`); if(el){ el.scrollIntoView({block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1500); } });
  const nb=m.querySelector("#cmpNote"); if(nb) nb.onclick=()=>cmpNewNote();
  const md=m.querySelector("#cmpMd"); if(md) md.onclick=()=>exportCompare();
  const pr=m.querySelector("#cmpPrint"); if(pr) pr.onclick=()=>{ if(window.printCompare) printCompare(); }; }
/* ---- 비교 메모: A 구간 메모(anchor = A 의 BHSA 낱말 번호) + anchor.compare 에 B 범위의 낱말 번호·주소와 비교 설정 ---- */
function cmpNewNote(){ const S=view.st, C=S.cmp; const va=cmpVerses(C.a); if(!va.length) return; const anchor=anchorRange(va[0],va[va.length-1]);
  const cmp={type:C.t,fn:!!C.fn,bhsa:SD.bhsa||"2021",a:{q:C.qa,book:C.a.b,ch:C.a.c1,vs:C.a.v1,ch2:SD.V[va[va.length-1]][1],vs2:SD.V[va[va.length-1]][2],label:C.a.label,word_ids:[anchor.span.from_word,anchor.span.to_word]}};
  if(C.b){ const vb=cmpVerses(C.b); const ab=anchorRange(vb[0],vb[vb.length-1]); cmp.b={q:C.qb,book:C.b.b,ch:C.b.c1,vs:C.b.v1,ch2:SD.V[vb[vb.length-1]][1],vs2:SD.V[vb[vb.length-1]][2],label:C.b.label,word_ids:[ab.span.from_word,ab.span.to_word]};
    /* 하위 호환: 옛 판이 읽던 평평한 칸도 둔다 */ Object.assign(cmp,{book:cmp.b.book,ch:cmp.b.ch,vs:cmp.b.vs,ch2:cmp.b.ch2,vs2:cmp.b.vs2,label:cmp.b.label}); }
  anchor.compare=cmp;
  const R=S.cmpR||{shared:[]}; const seed=R.shared.slice(0,6).map(s=>SD.L[s.li][0]+"("+lexGloss(s.li)+")").join(", ");
  openAnnotEditor("range",null,{kind:"range",key:"cmp:"+anchor.span.from_word+"-"+anchor.span.to_word+(C.b?"/"+C.b.label:""),anchor,_new:true,tags:["비교"],observation:seed?`공통 어휘: ${seed}${R.shared.length>6?" …":""}`:""}); }
/* 기록 탭에서 비교 메모를 누르면: A/B 범위와 설정을 되살려 비교 화면을 연다. 옛 메모(compare 에 word_ids 없음)는 주소로 되살린다 */
function cmpOpenFromAnnot(a){ const S=view.st; const cp=a.anchor&&a.anchor.compare; if(!cp) return false; const A=a.anchor;
  const rangeStr=(b,c1,v1,c2,v2)=>`${PLAN.abbr[b-1]} ${c1}:${v1}${(c2!=null&&(c2!==c1||v2!==v1))?`-${c2!==c1?c2+":":""}${v2}`:""}`;
  const B=cp.b||(cp.book?cp:null); const qa=cp.a&&cp.a.q||rangeStr(A.book,A.ch,A.vs,A.ch2,A.vs2); const qb=B?(B.q||rangeStr(B.book,B.ch,B.vs,B.ch2,B.vs2)):"";   /* 쉼표 목록은 입력한 글(q)로 되살린다 */
  S.cmp ||= {a:null,b:null,fn:false,t:"repeat",qa:"",qb:"",stack:false,sel:null}; const C=S.cmp; C.err=null; C.qa=qa; C.qb=qb; C.a=cmpParse(qa); C.b=qb?cmpParse(qb):null; C.t=cp.type||C.t; C.fn=!!cp.fn; C.sel=null; C.selRun=null; C.noteId=a.id;
  if(!C.a||C.a.err||(C.b&&C.b.err)){ toast("비교 범위를 되살리지 못했습니다: "+((C.a&&C.a.err)||(C.b&&C.b.err)||"")); return false; }
  S.mode="compare"; S.rmode="compare"; render(); scrollTo({top:0}); return true; }
function exportCompare(){ const S=view.st, C=S.cmp, R=S.cmpR; if(!C||!C.a||!R) return; const date=new Date().toISOString().slice(0,10); const va=cmpVerses(C.a), vb=C.b?cmpVerses(C.b):[];
  const L=[`# 본문 비교 — ${C.a.label}${C.b?" ↔ "+C.b.label:" (한 구간 안 반복)"}`,``,`- 내보낸 날: ${date} · 자료: BHSA ${SD.bhsa||"2021"} · 비교 유형: ${CMP_TYPE_KO[C.t]} · 기능어 ${C.fn?"포함":"제외"} · 정렬: ${R.single?"해당 없음":R.exact?"정확(LCS)":"생략(범위가 큼)"}`,
    `- 아래 1~4 절은 **기계가 관찰한 것**(어휘 번호·형태·어순의 대조)이고, 5 절은 **사용자가 쓴 관찰과 해석**입니다. 앱은 인용·재진술·뜻 변화를 판정하지 않습니다. '공통 연쇄'는 인용의 관찰 자료이지 인용 판정이 아닙니다.`,``,
    `## A · ${C.a.label}`,``]; for(const vi of va) L.push(`- **${sRef(vi)}** ${sHeb(vi).join("").trim()}${krvText(vi)?`  \n  ${krvText(vi)}`:""}`);
  if(C.b){ L.push(``,`## B · ${C.b.label}`,``); for(const vi of vb) L.push(`- **${sRef(vi)}** ${sHeb(vi).join("").trim()}${krvText(vi)?`  \n  ${krvText(vi)}`:""}`); }
  L.push(``,`## 1. 기계 관찰 — 동일 어휘 ${R.shared.length}${R.single?" (한 구간 안 반복)":""}`,``,`| 어휘 | 뜻 | 품사 | ${R.single?"횟수 | 형태 | 같은 형태 되풀이":"A 횟수 | B 횟수 | 양쪽에 다 있는 형태 | A 형태 | B 형태"} |`,`|---|---|---|${R.single?"---|---|---":"---|---|---|---|---"}|`);
  for(const s of R.shared) L.push(`| ${SD.L[s.li][0]} | ${lexGloss(s.li)} | ${SP_K[SD.L[s.li][2]]||SD.L[s.li][2]} | ${R.single?`${s.wa.length} | ${s.formsA.join(" · ")} | ${s.sameForms.join(" · ")||"없음"}`:`${s.wa.length} | ${s.wb.length} | ${s.sameForms.join(" · ")||"없음"} | ${s.formsA.join(" · ")} | ${s.formsB.join(" · ")}`} |`);
  if(!R.single){ L.push(``,`## 2. 기계 관찰 — 한쪽에만 있는 어휘`,``,`- A에만 있는 어휘 (${R.onlyA.length}): `+(R.onlyA.map(li=>`${SD.L[li][0]}(${lexGloss(li)})`).join(", ")||"없음"),`- B에만 있는 어휘 (${R.onlyB.length}): `+(R.onlyB.map(li=>`${SD.L[li][0]}(${lexGloss(li)})`).join(", ")||"없음"),
      ``,`## 3. 기계 관찰 — 공통 연쇄`,``,`### 3a. 원문 연속 표현 ${R.runsText.length} (기능어를 빼지 않은 실제 BHSA 낱말 순서에서 바로 이어지는 동일 어휘 2개 이상${C.fn?"":"; 내용어 2개 이상인 것만"})`,``); for(const r of R.runsText) L.push(`- ${cmpJoin(r.a)} — A ${sRef(SD.vOf[r.a[0]])} ‖ B ${sRef(SD.vOf[r.b[0]])} · 어휘 ${r.len}개${r.fnIn?` (기능어 ${r.fnIn} 포함)`:""}${r.cross?" · 절 경계를 넘음":""}`); if(!R.runsText.length) L.push("- 없음");
    if(!C.fn){ L.push(``,`### 3b. 기능어 제외 어순 대응 ${R.runsFilt.length} (기능어를 뺀 뒤에만 같은 순서로 이어지는 표현 — 원문에서는 사이에 기능어가 끼어 있으므로 3a 와 섞지 않음)`,``); for(const r of R.runsFilt) L.push(`- A: ${cmpSpanMd(r.a)} ‖ B: ${cmpSpanMd(r.b)} — A ${sRef(SD.vOf[r.a[0]])} ‖ B ${sRef(SD.vOf[r.b[0]])} · 같은 순서의 어휘 ${r.len}개 · ⟨ ⟩ 안은 기능어 제외로 건너뛴 낱말(A ${r.skipA}·B ${r.skipB})`); if(!R.runsFilt.length) L.push("- 없음"); }
    L.push(``,`## 4. 기계 관찰 — 정렬(LCS)`,``); if(R.exact){ L.push(`정렬에서 대응된 낱말은 그대로, 대응되지 않은 출현은 [A쪽 미대응: …] [B쪽 미대응: …] 로 표시. **미대응은 그 정렬에서 짝이 없는 출현이지, 그 어휘가 상대편에 없다는 뜻이 아니다**(어휘 유무는 2절).`,``,R.ops.map(([op,i,j])=>{ const wi=op==="B"?R.fb[j]:R.fa[i]; const w=wHeb(wi).trim(); return op==="="?w:op==="A"?`[A쪽 미대응: ${w}]`:`[B쪽 미대응: ${w}]`; }).join(" ")); } else L.push(`생략 — 범위가 커서 정확 정렬을 하지 않았다(낱말 ${R.fa.length}×${R.fb.length}).`); }
  /* 5. 사용자 메모: 이 A 범위에 붙은 #비교 메모 */
  const notes=(typeof anList==="function"?anList():[]).filter(a=>a.kind==="range"&&a.anchor&&a.anchor.compare&&(a.tags||[]).includes("비교")&&a.anchor.span&&va.length&&a.anchor.span.from_word===slotOf(SD.V[va[0]][5]));
  L.push(``,`## 5. 사용자 관찰·해석 (${notes.length}건)`,``); if(!notes.length) L.push("- (이 비교에 저장된 메모 없음)"); for(const a of notes){ L.push(`- **관찰** ${a.observation||"—"}`,`  **해석** ${a.interpretation||"—"}`,`  (${new Date(a.updated||a.created).toISOString().slice(0,10)}${a.anchor.compare.type?" · "+CMP_TYPE_KO[a.anchor.compare.type]:""})`); }
  const txt=L.join("\n"), name=`milal-비교-${date}.md`; const url=URL.createObjectURL(new Blob([txt],{type:"text/markdown;charset=utf-8"})); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },500);
  window.__lastExport={name,txt}; if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast("Markdown 파일을 내려받고 클립보드에도 복사했습니다."),()=>toast("파일을 내려받았습니다.")); else toast("파일을 내려받았습니다."); }
