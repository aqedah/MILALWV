/* ===== MILALWV 화면: 구약 히브리어 원문 · BHSA (CBSR 성경연구 탭에서 떼어 냄) ===== */
const STUDY_ON=()=>true;
const STUDY_V=window.STUDY_V||"1";
/* ===== UX 시안 스위치(지시 10): preview.html 이 window.UX2=true 를 켠다. 운영 index.html 에서는 늘 꺼져 있어 아래 ux2() 가지는 타지 않는다 ===== */
const ux2=()=>!!window.UX2;
const expertOn=()=>{ try{ return localStorage.getItem("milal-expert")==="1"; }catch(e){ return false; } };
function expertSet(v){ try{ localStorage.setItem("milal-expert",v?"1":"0"); }catch(e){} if(!v){ view.st.milalOn=false; if(view.st.sv==="map") view.st.sv="tree"; } render(); }
/* 연구 시작 화면(시안): 다섯 메뉴 대신 '무엇을 하려는가'로 고른다. 기존 도구·낱말·검색식·비교·이론은 그대로 연결 */
const R_START=[
  {k:"repeat",t:"반복되는 낱말 찾기",d:"이 장(또는 묶은 장들)에서 유난히 자주 나오는 낱말",go:{mode:"tool",tool:"반복"}},
  {k:"usage",t:"낱말의 다른 용례 찾기",d:"한 낱말이 구약 전체에서 어디에(책별로) 쓰였는지",go:{mode:"word"}},
  {k:"compare",t:"두 본문 비교하기",d:"같은 말·같은 어순이 어디서 되풀이되는지(인용·재진술 관찰)",go:{mode:"compare"}},
  {k:"query",t:"더 자세한 문법·문장 검색",d:"문장 종류·구의 역할·낱말 형태를 묶어 찾기 (고급 검색)",go:{mode:"query"}}];
const R_FLOW=[["화자","서술과 인물의 말"],["장면","장면이 열리는 곳"],["전환","흐름이 멈추는 문장"],["인물","누가 주어인가"]];
function renderResearchStart(){ const S=view.st; const rg=rLabel(S.R);
  return `<section class="sec"><h2 class="qtitle">무엇을 살펴볼까요?</h2><p class="lead" style="margin:0 0 8px">살펴볼 곳은 위의 <b>${esc(rScopeLabel())}</b> 단추에서 바꿉니다.</p>
    <div class="qqs">${R_START.map(x=>`<button class="qq" data-rstart="${x.k}"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></button>`).join("")}</div>
    <span class="label" style="margin-top:12px">본문의 흐름 살펴보기</span><div class="stools rflow">${R_FLOW.map(([t,n])=>`<button class="stool" data-rstart="tool:${t}"><i class="tool">${t}</i><b>${n}</b></button>`).join("")}</div>
    <p class="lead" style="margin-top:10px"><button class="mtog" data-rstart="theory">이 도구들의 바탕이 되는 생각 ⓘ</button> · <button class="mtog" id="rSaved">보관한 검색식</button></p></section>`; }
/* UX 시안: 낱말 찾기 첫 화면에 이 범위에서 자주 나오는 낱말 5개를 보기로 — 누르면 바로 그 낱말의 용례 */
const UX_FN=new Set(["art","prep","conj","prps","prde","prin","nega","inrg","intj"]);
function topWordsHTML(){ const S=view.st, sp=S.R?[[S.R.b,S.R.c1,S.R.c2]]:null; const V=sp?spanVerses(sp):null; if(!V||!V.length) return ""; const M=new Map(); for(const vi of V){ const [, , , , ,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ const li=SD.wl[j]; if(UX_FN.has(SD.L[li][2])) continue; M.set(li,(M.get(li)||0)+1); } }
  const top=[...M].sort((a,b)=>b[1]-a[1]).slice(0,5); if(!top.length) return "";
  return `<div class="topw"><span class="label">${esc(rLabel(S.R))}에서 자주 나오는 낱말 — 누르면 구약 전체에서의 쓰임을 책별로 봅니다</span><div class="qqs">${top.map(([li,n])=>`<button class="qq" data-slex="${li}"><b><span class="heb">${esc(SD.L[li][0])}</span> ${esc(lexGloss(li))}</b><small>이 범위에서 ${n}번 · ${esc(SP_K[SD.L[li][2]]||SD.L[li][2])}</small></button>`).join("")}</div><p class="lead" style="margin-top:6px">다른 낱말은 위 칸에 뜻·히브리어·음역으로 찾습니다.</p></div>`; }
/* ===== UX 시안: 본문에서 낱말을 긁어 고르면 뜨는 작은 창(형광펜 색 4·밑줄·괄호·복사·메모). 한 절 안의 낱말만 받는다 ===== */
function selPopBind(m){ if(window.__selPopOn) return; window.__selPopOn=true; let tm=null;
  document.addEventListener("selectionchange",()=>{ clearTimeout(tm); tm=setTimeout(selPopShow,180); });
  document.addEventListener("pointerdown",e=>{ const pop=document.getElementById("selpop"); if(pop&&!pop.contains(e.target)) { /* 다른 곳을 누르면 닫힘(선택이 풀리며 selectionchange 로도 닫힘) */ } }); }
/* 고른 범위 → 히브리어 낱말(여러 절 가능, 같은 장 안) · 번역만 골랐으면 그 절들 */
function selPopWords(){ const sel=document.getSelection(); if(!sel||sel.isCollapsed||!sel.rangeCount) return null; const r=sel.getRangeAt(0); const box=document.querySelector(".rdv"); if(!box||!box.contains(r.commonAncestorContainer)) return null;
  const hw=[...box.querySelectorAll(".rdh .hw")].filter(w=>r.intersectsNode(w)).map(w=>+w.dataset.wi); const vs=[...box.querySelectorAll("[data-rdv]")].filter(v=>r.intersectsNode(v)).map(v=>+v.dataset.rdv);
  if(!hw.length&&!vs.length) return null; let tr=null;
  if(!hw.length){ const kts=[...box.querySelectorAll(".kt")].filter(k=>r.intersectsNode(k)); if(kts.length===1){ const k=kts[0], full=k.textContent; const off=(node,o)=>{ const q=document.createRange(); q.selectNodeContents(k); try{ q.setEnd(node,o); }catch(e){ return null; } return q.toString().length; };
      let from=k.contains(r.startContainer)?off(r.startContainer,r.startOffset):0, to=k.contains(r.endContainer)?off(r.endContainer,r.endOffset):full.length; if(from!=null&&to!=null){ while(from<to&&/\s/.test(full[from])) from++; while(to>from&&/\s/.test(full[to-1])) to--; if(to>from) tr={vi:+k.dataset.kv,from,to,text:full.slice(from,to)}; } } }
  return {ws:hw,tr,vis:[...new Set(hw.length?hw.map(w=>SD.vOf[w]):vs)].sort((x,y)=>x-y),text:sel.toString().trim()}; }
/* 고르면 화면 아래(하단 메뉴 바로 위)에 도구 줄이 뜬다 — 휴대전화의 '복사·공유' 말풍선(선택 위쪽)과 겹치지 않게 */
function selPopShow(){ let pop=document.getElementById("selpop"); const W=ux2()&&view.st.mode==="verse"?selPopWords():null; if(!W){ if(pop) pop.remove(); view.st.selW=null; return; } const S=view.st; S.selW=W;
  if(!pop){ pop=document.createElement("div"); pop.id="selpop"; document.body.appendChild(pop); }
  const heb=W.ws.length>0||!!W.tr; const ref=W.vis.length>1?`${sRef(W.vis[0])}–${SD.V[W.vis[W.vis.length-1]][2]}`:sRef(W.vis[0]);
  pop.innerHTML=`<div class="sprow"><b>${esc(ref)}</b>${W.ws.length?` · 낱말 ${W.ws.length}개`:W.tr?` · 번역 ${W.tr.text.length}자`:` · 번역 <small>(칠하기는 한 절 안에서)</small>`}</div><div class="sprow">${heb?`${MARK_COLORS.map(([k,hex,n])=>`<button class="mkc" data-sp="hl:${k}" style="background:${hex}" aria-label="형광펜 ${n}"></button>`).join("")}<button data-sp="ul:">밑줄</button><button data-sp="br:">⟦ ⟧ 괄호</button>`:""}<button data-sp="copy:">복사하기</button><button data-sp="note:">노트에 추가</button></div>`;
  const nav=document.querySelector(".bnav"); pop.style.bottom=((nav?nav.offsetHeight:56)+8)+"px";
  pop.querySelectorAll("[data-sp]").forEach(b=>{ b.onpointerdown=e=>e.preventDefault(); b.onmousedown=e=>e.preventDefault(); b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); selPopAct(b.dataset.sp); }; }); }
function selPopAct(k){ const S=view.st, W=S.selW; if(!W) return; const [st,co]=k.split(":"); const clear=()=>{ try{ document.getSelection().removeAllRanges(); }catch(e){} const p=document.getElementById("selpop"); if(p) p.remove(); S.selW=null; };
  const v0=W.vis[0], v1=W.vis[W.vis.length-1]; const ref=v0===v1?sRef(v0):`${sRef(v0)}–${SD.V[v1][2]}`; const quote=W.ws.length?W.ws.map(wi=>wHeb(wi)).join("").trim():W.text;
  if(st==="copy"){ const t=`${W.text||quote} (${ref})`; window.__lastSelCopy=t; (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast("복사했습니다"),()=>toast("복사하지 못했습니다 — 휴대전화의 '복사'를 쓰세요.")); clear(); return; }
  if(st==="note"){ clear(); if(!window.openAnnotEditor) return; if(v0===v1) openAnnotEditor("verse",v0,{kind:"verse",key:"v:"+SD.V[v0][0]+"-"+SD.V[v0][1]+"-"+SD.V[v0][2],anchor:anchorVerse(v0),_new:true,tags:[],observation:`${quote} — `});
    else { const anchor=anchorRange(v0,v1); openAnnotEditor("range",null,{kind:"range",key:"r:"+anchor.span.from_word+"-"+anchor.span.to_word,anchor,_new:true,tags:[],observation:`${quote} — `}); } return; }
  if(!W.ws.length&&!W.tr) return; const y=scrollY; (W.ws.length?markWordsNow(W.ws,st,co):markTrNow(W.tr.vi,W.tr.from,W.tr.to,W.tr.text,st,co)).then(()=>{ clear(); toast(st==="hl"?"형광펜을 칠했습니다.":st==="ul"?"밑줄을 그었습니다.":"괄호로 묶었습니다."); render(); scrollTo({top:y}); }).catch(e=>toast("표시를 저장하지 못했습니다: "+e.message)); }
const sfzHTML=()=>`<div class="sfz"><button class="s" data-sfz="-1" aria-label="글씨 작게"${sFs()<=0.8?" disabled":""}>가−</button><button class="l" data-sfz="1" aria-label="글씨 크게"${sFs()>=1.5?" disabled":""}>가+</button></div>`;
/* ===== 연구 탭의 '찾는 곳' — 범위를 정하는 곳은 여기 하나(새 화면). 모든 도구가 이것만 따른다 ===== */
function rBookLast(b){ const B=SD.book[b]; return B?Math.max(...B.chs):1; }
function rScopeLabel(){ const S=view.st; if(S.wide&&(S.mode==="query"||S.mode==="start")) return "구약 전체"; const R=S.R; if(!R) return ""; const u=R.b===19?"편":"장"; return R.c1===1&&R.c2===rBookLast(R.b)?`${PLAN.full[R.b-1]} 전체`:`${PLAN.full[R.b-1]} ${R.c1===R.c2?R.c1:R.c1+"–"+R.c2}${u}`; }
function rScopeHTML(){ return ""; /* 2026-10-21: 범위는 위 주소 단추에서(연구 탭에서는 '이 장/이 책 전체/구약 전체' 고르기) */ const S=view.st; return `<div class="rscope"><button class="rscopeb" id="rScope">찾는 곳: <b>${esc(rScopeLabel())}</b> ▾</button>${S.mode==="tool"&&S.wide?`<small>흐름 도구는 한 책 안에서만 봅니다</small>`:""}</div>`; }
function rScopeOpen(){ const S=view.st, R=S.R, b=R.b, c=(S.vc>=R.c1&&S.vc<=R.c2)?S.vc:R.c1, last=rBookLast(b), u=b===19?"편":"장"; const tool=S.mode==="tool";
  sheet("찾는 곳",`<div class="snlist">${[["ch",`이 ${u}만 — ${PLAN.full[b-1]} ${c}${u}`],["book",`이 책 전체 — ${PLAN.full[b-1]} 1–${last}${u}`],...(tool?[]:[["all","구약 전체 — 39권"]]),["pick","다른 책·장 고르기…"]].map(([k,n])=>`<button class="snjump" data-rsc="${k}"><b>${esc(n)}</b></button>`).join("")}</div><p class="lead" style="margin-top:8px">낱말 찾기·자세한 검색·흐름 도구가 모두 이 범위를 씁니다.</p>`);
  document.querySelectorAll("#sheetRoot [data-rsc]").forEach(x=>x.onclick=()=>{ const k=x.dataset.rsc; document.getElementById("sheetRoot").innerHTML="";
    if(k==="pick"){ S.pick=true; S.pk={b,c1:null,c2:null}; render(); scrollTo({top:0}); return; }
    if(k==="all"){ S.wide=true; } else { S.wide=false; setRange(k==="ch"?{b,c1:c,c2:c}:{b,c1:1,c2:last}); } render(); }); }
function rModeName(m){ return ({tool:"본문의 흐름",word:"낱말의 다른 용례",query:"문법·문장 검색",compare:"두 본문 비교",theory:"바탕이 되는 생각"})[m]||""; }
let SD=null, SDload=null, SDerr="";
view.st ||= {mode:"verse",vMode:"struct",range:"day",rb:1,rc1:1,rc2:0,lex:null,dom:"",vs:"",vt:"",vi:0,sel:-1,tool:"",more:1,q:""};
const SP_K={verb:"동사",subs:"명사",nmpr:"고유명사",adjv:"형용사",advb:"부사",prep:"전치사",conj:"접속사",prps:"인칭대명사",prde:"지시대명사",prin:"의문대명사",intj:"감탄사",nega:"부정어",inrg:"의문사",art:"관사"};
const VS_K={qal:"칼",nif:"니팔",piel:"피엘",pual:"푸알",hif:"히필",hof:"호팔",hit:"히트파엘",htpo:"히트포엘",hsht:"히쉬타펠",hotp:"호트파엘",nit:"니트파엘",poel:"포엘",poal:"포알",tif:"티프엘",pasq:"파사크",
  peal:"페알(아람어)",peil:"페일(아람어)",pael:"파엘(아람어)",haf:"하펠(아람어)",afel:"아펠(아람어)",shaf:"샤펠(아람어)",etpe:"이트페엘(아람어)",etpa:"이트파알(아람어)",htpe:"히트페엘(아람어)",htpa:"히트파알(아람어)"};
const VT_K={perf:"완료(카탈)",impf:"미완료(이크톨)",wayq:"봐이크톨",impv:"명령",infa:"부정사 절대형",infc:"부정사 연계형",ptca:"능동 분사",ptcp:"수동 분사"};
const VT_S={perf:"완료",impf:"미완료",wayq:"봐이크톨",impv:"명령",infa:"부정사",infc:"부정사",ptca:"분사",ptcp:"분사"};
const PS_K={p1:"1",p2:"2",p3:"3"}, GN_K={m:"남",f:"여",c:"공"}, NU_K={sg:"단",pl:"복",du:"쌍"};
const FN_K={Subj:"주어",Objc:"목적어",Pred:"서술어",PreO:"서술어+목적어",PreS:"서술어+주어",PreC:"서술어(보어)",Cmpl:"보충어",Adju:"부가어",Time:"때",Loca:"곳",Modi:"꾸밈말",Conj:"접속",Ques:"물음",Nega:"부정",Intj:"감탄",Voct:"부름말",Rela:"관계사",Frnt:"앞에 내세운 말",PrcS:"서술어 보어(주어 접미)",PtcO:"분사+목적어",NCoS:"부정 서술어",Supp:"보충",IntS:"감탄(주어)",PrAd:"서술 부가어",NCop:"부정 서술어",ModS:"꾸밈(주어)",Exst:"있음·없음",ExsS:"있음·없음(주어)",EPPr:"지시 서술어"};
const DOM_K={N:"서술",Q:"인물의 말",D:"담화(율법·시 등)","?":"구분 안 됨"};
const GOD_LEX=new Set(["JHWH/",">LHJM/"]);
/* ===== 자료 읽기: meta.json + index.json(절 목록·책별 시작 번호) → 책별 books/<b>.json 을 필요할 때 채움.
   전체 배열은 처음부터 전체 크기로 잡아 두고 책 조각을 제자리에 넣는다. 그래서 검색·검색식 코드는 전과 같다. ===== */
const BOOKLOAD={};
/* 글꼴: 1단계 히브리어만(첫 화면에 필요), 2단계 제목용 KR 세리프·고정폭(첫 화면 뒤) */
function fontsLoad(stage){ const add=(id,fam)=>{ if(document.getElementById(id)) return; const l=document.createElement("link"); l.id=id; l.rel="stylesheet"; l.href="https://fonts.googleapis.com/css2?"+fam+"&display=swap"; document.head.appendChild(l); };
  add("hebFont","family=Noto+Serif+Hebrew:wght@400;600"); if(stage>=2) add("uiFont","family=Noto+Serif+KR:wght@600;700&family=IBM+Plex+Mono:wght@500"); }
function studyLoad(firstBook){
  if(SDload) return SDload;
  fontsLoad(1);
  SDerr=""; SDload=Promise.all(["study/meta.json","study/index.json"].map(u=>fetch(u+"?v="+STUDY_V).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })))
  .then(([m,ix])=>{
    const N=ix.N, V=ix.V;
    const D={L:m.lex,M:m.morph.map(s=>s.split("|")),FN:m.fun,TY:m.typ,DO:m.dom,PTY:m.ptyp,BK:m.books,TXT:m.txt||[],
      V, bs:ix.bs, bhsa:ix.bhsa||"2021", N, nC:ix.nC, nP:ix.nP, nS:ix.nS, nA:ix.nA, bookW:ix.bookW, bookC:ix.bookC, bookP:ix.bookP, bookS:ix.bookS, bookA:ix.bookA,
      loaded:new Set(), allLoaded:false,
      heb:new Array(V.length), han:new Array(V.length),
      wl:new Uint16Array(N), wm:new Uint16Array(N), wf:new Uint8Array(N), wg:new Uint8Array(N),
      wc:new Uint32Array(N), wp:new Uint32Array(N), ws:new Uint32Array(N), wa:new Uint32Array(N), domW:new Uint8Array(N),
      ct:new Uint8Array(ix.nC), cd:new Uint8Array(ix.nC), ccn:new Uint32Array(ix.nC), pt:new Uint8Array(ix.nP),
      at:new Uint8Array(ix.nA), ay:new Uint8Array(ix.nA), ax:new Uint8Array(ix.nA), can:new Uint32Array(ix.nA)};
    D.vOf=new Int32Array(N); D.ref=new Map(); D.ch=new Map(); D.book={};
    V.forEach((x,vi)=>{ const [b,kc,kv,c,v,s,n]=x; for(let j=s;j<s+n;j++) D.vOf[j]=vi;
      const k=b+"-"+kc+"-"+kv; if(!D.ref.has(k)) D.ref.set(k,[]); D.ref.get(k).push(vi);
      const kk=b+"-"+kc; if(!D.ch.has(kk)) D.ch.set(kk,[]); D.ch.get(kk).push(vi);
      const B=D.book[b] ||= {a:vi,z:vi,chs:new Set()}; B.z=vi; B.chs.add(kc); });
    D.dN=D.DO.indexOf("N"); D.dQ=D.DO.indexOf("Q");
    D.lexByKey={}; D.L.forEach((x,i)=>{ (D.lexByKey[x[1]] ||= []).push(i); });
    D.hv=[]; D.hn=[]; SD=D;
    return loadBook(firstBook||1);
  }).then(()=>{ if(view.tab==="study") render(); setTimeout(()=>fontsLoad(2),800); })
  .catch(e=>{ SDload=null; SDerr="원문 자료를 내려받지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."; if(view.tab==="study") render(); });
  return SDload;
}
/* 책 하나 채우기 */
function loadBook(b){ if(!SD) return Promise.reject(new Error("no SD")); if(SD.loaded.has(b)) return Promise.resolve(); if(BOOKLOAD[b]) return BOOKLOAD[b];
  return BOOKLOAD[b]=fetch(`study/books/${b}.json?v=`+STUDY_V).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(B=>{ fillBook(B); SD.loaded.add(b); if(SD.loaded.size>=39) SD.allLoaded=true;
    SD.qi=null; SD.ccnMap=null; SD.cFirstA=null; SD.aFirstW=null; if(window.bibleBook) bibleBook(b); }).catch(e=>{ delete BOOKLOAD[b]; throw e; }); }
function fillBook(B){ const D=SD, u8=s=>{ const b=atob(s), a=new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return a; };
  const w0=B.w0, n=B.n;
  D.wl.set(new Uint16Array(u8(B.wl).buffer),w0); D.wm.set(new Uint16Array(u8(B.wm).buffer),w0); D.wf.set(u8(B.wf),w0); D.wg.set(u8(B.wg),w0);
  const dec=(o,base,out)=>{ const s=u8(o.s); let mx=base-1, prev=base-1, k=0; for(let i=0;i<s.length;i++){ const c=s[i]; if(c===1){ mx++; prev=mx; } else if(c===2){ prev=o.x[k++]; if(prev>mx) mx=prev; } out[w0+i]=prev; } };
  dec(B.wc,B.c0,D.wc); dec(B.wp,B.p0,D.wp); dec(B.ws,D.bookS[B.b-1],D.ws); dec(B.wa,B.a0,D.wa);
  D.ct.set(u8(B.ct),B.c0); D.cd.set(u8(B.cd),B.c0); D.pt.set(u8(B.pt),B.p0); D.at.set(u8(B.at),B.a0); D.ay.set(u8(B.ay),B.a0); D.ax.set(u8(B.ax),B.a0);
  let acc=0; for(let i=0;i<B.ccn.length;i++){ acc+=B.ccn[i]; D.ccn[B.c0+i]=acc; } acc=0; for(let i=0;i<B.can.length;i++){ acc+=B.can[i]; D.can[B.a0+i]=acc; }
  for(let i=w0;i<w0+n;i++) D.domW[i]=D.cd[D.wc[i]];
  const a=D.book[B.b].a; for(let k=0;k<B.heb.length;k++){ D.heb[a+k]=B.heb[k]; D.han[a+k]=B.han[k]; D.hv[a+k]=undefined; D.hn[a+k]=undefined; } }
/* 구약 전체가 필요한 일(전체 낱말 검색·검색식) 전에 나머지 책을 받는다 */
function ensureAll(){ if(!SD) return Promise.reject(new Error("no SD")); if(SD.allLoaded) return Promise.resolve(); if(SD._allP) return SD._allP;
  const todo=[]; for(let b=1;b<=39;b++) if(!SD.loaded.has(b)) todo.push(b);
  return SD._allP=Promise.all(todo.map(b=>loadBook(b))).then(()=>{ SD._allP=null; }).catch(e=>{ SD._allP=null; throw e; }); }
const loadedCount=()=>SD?SD.loaded.size:0;
/* 한글 사전 풀이(LOG)는 따로 받는다 — 낱말 상세·낱말 검색에서만 필요 */
let LKload=null; function lexKoLoad(){ if(SD.LK||LKload) return LKload||Promise.resolve(); return LKload=fetch("study/lexko.json?v="+STUDY_V).then(r=>r.json()).then(j=>{ SD.LK=j; LKload=null; render(); }).catch(()=>{ LKload=null; }); }
const lexKo=li=>SD.LK?(SD.LK[li]||""):"";
const sHeb=vi=>SD.hv[vi] ||= (SD.heb[vi]||"").split("\t");
const sHan=vi=>SD.hn[vi] ||= (SD.han[vi]||"").split("\t");
const lexGloss=li=>{ const x=SD.L[li]; return x[9]||lexKo(li).split(/\s*[\/,;]\s*/).slice(0,2).join(", ")||x[5]; };
const sRef=vi=>{ const [b,c,v]=SD.V[vi]; return `${PLAN.abbr[b-1]} ${c}:${v===0?"표제":v}`; };
const krvText=vi=>{ const [b,c,v]=SD.V[vi]; if(!window.BIBLE||!BIBLE[b-1]) return ""; if(v===0) return "(시편 표제 — 이 번역에는 따로 없습니다)"; try{ return BIBLE[b-1][c-1][v-1]||""; }catch(e){ return ""; } };
function morphShort(mi){ const m=SD.M[mi]; const sp=m[0];
  if(sp==="verb") return ["동사",VS_K[m[1]]||m[1],VT_S[m[2]]||""].filter(Boolean).join(" ");
  return SP_K[sp]||sp; }
function morphFull(mi){ const [sp,vs,vt,ps,gn,nu,st,pp,pg,pn]=SD.M[mi]; const o=[SP_K[sp]||sp];
  if(sp==="verb"){ if(VS_K[vs]) o.push(VS_K[vs]+" 줄기"); if(VT_K[vt]) o.push(VT_K[vt]); }
  const png=[PS_K[ps]?PS_K[ps]+"인칭":"",GN_K[gn]?GN_K[gn]+"성":"",NU_K[nu]?NU_K[nu]+"수":""].filter(Boolean).join(" "); if(png) o.push(png);
  if(st==="c") o.push("연계형"); if(st==="e") o.push("강조형");
  if(pp&&pp!=="NA"&&pp!=="unknown"){ o.push("인칭 접미어 "+[PS_K[pp]?PS_K[pp]+"인칭":"",GN_K[pg]?GN_K[pg]+"성":"",NU_K[pn]?NU_K[pn]+"수":""].filter(Boolean).join(" ")); }
  return o.join(" · "); }
/* 범위: [[책, 장 시작, 장 끝]] 또는 null(구약 전체) */
function stSpans(){ const S=view.st; if(ux2()&&S.mode==="word") return null;   /* 새 화면: 낱말의 다른 용례는 늘 구약 전체 */ if(S.wide&&(S.mode==="word"||S.mode==="query")) return null; const R=S.R; return R?[[R.b,R.c1,R.c2]]:null; }
const rLabel=R=>R?`${PLAN.full[R.b-1]} ${R.c1===R.c2?R.c1:R.c1+"–"+R.c2}${R.b===19?"편":"장"}`:"";
function stRangeLabel(){ const sp=stSpans(); if(!sp) return "구약 전체"; return rLabel(view.st.R); }
/* 오늘 본문 가운데 구약 첫 책의 장 범위 */
function todayOT(){ return null; } /* 통독 일정이 없으므로 늘 없음 */
function saveRange(R){ try{ localStorage.setItem("milal-study-range",JSON.stringify(R)); }catch(e){} }
function lastRange(){ try{ const R=JSON.parse(localStorage.getItem("milal-study-range")||"null"); return R&&R.b>=1&&R.b<=39?R:null; }catch(e){ return null; } }
function setRange(R){ const S=view.st; S.home=false; S.R=R; S.vc=R.c1; S.entered=true; S.pick=false; S.pk=null; S.more=1; saveRange(R); const L=SD&&spanVerses([[R.b,R.c1,R.c2]]); if(L&&L.length&&!L.includes(S.vi)) S.vi=L[0]; S.sel=-1;
  try{ let rc=JSON.parse(localStorage.getItem("milal-study-recent")||"[]")||[]; rc=[R,...rc.filter(x=>!(x.b===R.b&&x.c1===R.c1&&x.c2===R.c2))].slice(0,6); localStorage.setItem("milal-study-recent",JSON.stringify(rc)); }catch(e){} }
function recentRanges(){ try{ return (JSON.parse(localStorage.getItem("milal-study-recent")||"[]")||[]).filter(x=>x&&x.b>=1&&x.b<=39); }catch(e){ return []; } }
/* '왕상 18', '왕상18', '창 22:1', '열왕기상 18장' */
function parseStudyRef(q){ q=String(q||"").replace(/\s+/g," ").trim(); const m=q.match(/^(.+?)\s*(\d+)\s*(?:장|편)?(?:\s*[:：]\s*(\d+))?/); if(!m) return null;
  const nm=m[1].replace(/\s/g,""); let b=PLAN.full.findIndex(x=>x===nm)+1; if(!b) b=PLAN.abbr.findIndex(x=>x===nm)+1; if(!b) b=PLAN.full.findIndex(x=>x.startsWith(nm))+1;
  if(!b) return {err:"책 이름을 찾지 못했습니다."}; if(b>39) return {err:"지금은 구약만 됩니다."}; const c=+m[2]; if(!SD.book[b].chs.has(c)) return {err:`${PLAN.full[b-1]}에는 ${c}${b===19?"편":"장"}이 없습니다.`}; return {b,c,v:m[3]?+m[3]:0}; }
function chStep(dir){ const S=view.st, b=S.R.b, chs=[...SD.book[b].chs].sort((x,y)=>x-y); const cur=S.mode==="verse"?(S.vc||S.R.c1):(dir<0?S.R.c1:S.R.c2); const k=chs.indexOf(cur)+dir; if(k<0||k>=chs.length) return; const c=chs[k];
  if(S.mode==="verse"&&c>=S.R.c1&&c<=S.R.c2){ S.vc=c; } else { const m=S.mode; setRange({b,c1:c,c2:c}); S.mode=m; } }
function openAddr(){ const S=view.st, T=todayOT(), RC=recentRanges();
  const chip=(R,lab)=>`<button class="achip" data-ar='${JSON.stringify(R)}'>${esc(lab||rLabel(R))}</button>`;
  sheet("어디로 갈까요",`<div class="afind"><input id="aIn" type="search" placeholder="예: 왕상 18, 창 22:1, 시 23" autocomplete="off"><button class="sbtn" id="aGo" style="width:auto;margin:0;padding:10px 16px">가기</button></div><p class="lead" id="aMsg" style="min-height:1em;margin:4px 0"></p>
   <div class="achips">${RC.length?`<span class="achip off">최근 본 곳</span>`:""}${RC.map(R=>chip(R)).join("")}</div>
   ${BOOK_GRP.map(([g,a,z])=>`<div class="pkgrp">${g}</div><div class="pkbooks">${Array.from({length:z-a+1},(_,i)=>a+i).map(b=>`<button data-ab="${b}">${esc(PLAN.full[b-1])}</button>`).join("")}</div>`).join("")}<div id="aCh"></div>`);
  const root=document.getElementById("sheetRoot"), close=()=>{ root.innerHTML=""; };
  const go=(R,v)=>{ close(); const m=S.mode==="theory"?"verse":S.mode; setRange(R); S.mode=m; S.scrollV=v||0; render(); scrollTo({top:0}); };
  root.querySelectorAll("[data-ar]").forEach(b=>b.onclick=()=>go(JSON.parse(b.dataset.ar)));
  const inp=root.querySelector("#aIn"), msg=root.querySelector("#aMsg"), sub=()=>{ const r=parseStudyRef(inp.value); if(!r){ msg.textContent="책과 장을 넣어 주세요. 예: 왕상 18"; return; } if(r.err){ msg.textContent=r.err; return; } go({b:r.b,c1:r.c,c2:r.c},r.v); };
  root.querySelector("#aGo").onclick=sub; inp.onkeydown=e=>{ if(e.key==="Enter") sub(); };
  root.querySelectorAll("[data-ab]").forEach(btn=>btn.onclick=()=>{ const b=+btn.dataset.ab; root.querySelectorAll("[data-ab]").forEach(x=>x.classList.toggle("on",x===btn)); const box=root.querySelector("#aCh"), u=b===19?"편":"장";
    box.innerHTML=`<div class="pkgrp">${esc(PLAN.full[b-1])} · ${u}을 누르면 바로 갑니다</div><div class="pkchs">${[...SD.book[b].chs].sort((x,y)=>x-y).map(c=>`<button data-ac="${c}">${c}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-ac]").forEach(cb=>cb.onclick=()=>go({b,c1:+cb.dataset.ac,c2:+cb.dataset.ac})); box.scrollIntoView({block:"start",inline:"nearest",behavior:"smooth"}); }); }
function openStudyInfo(){ sheet("장 구조 보는 법",`<div class="theory"><p>한 줄은 ETCBC가 나눈 '절 원자'(동사 하나를 중심으로 한 가장 작은 문장 단위)입니다. 오른쪽의 선은 ETCBC가 매긴 문장의 층으로, 줄이 어느 문장에 기대어 있는지 보여 줍니다(┤ 아래에 같은 층이 더 있음, ┘ 그 층의 마지막).</p>
  <div class="stlegend"><span class="k-main">이야기 줄기</span><span class="k-bg">배경·멈춤</span><span class="k-msyn">이야기 표지</span><span class="k-q">인물의 말</span></div>
  <p><b>이야기 줄기</b>(봐이크톨)는 사건을 앞으로 밀고 가고, <b>배경·멈춤</b>(명사문, 다른 말이 앞선 완료형, 분사)은 흐름을 멈추고 설명·이전 일·대조를 알립니다.</p>
  <p><b>이야기 표지</b>: 봐예히·웨하야가 때(때 구, 베/케+부정사, 키)나 곳과 함께 새 장면을 여는 자리, 그리고 홀로 선 '보라'·'이제'입니다. 봐예히에 주어나 보어가 붙어 실제로 무엇이 생긴 경우는 이야기 줄기로 둡니다.</p>
  <p><b>인물의 말</b>: 따옴표 안의 말입니다. 말 속의 말은 '2단'으로 표시합니다. 위의 ⇕ 단추로 말을 모두 접으면 이야기 뼈대만 남고, 줄마다 '말 접기'로 하나씩 접을 수도 있습니다.</p>
  <p>줄마다 BHSA 2021의 절 원자 노드 번호를 간직하고 있어, MILAL이 판정한 관계를 그대로 받아 겹쳐 보일 수 있습니다(준비 중). 낱말을 누르면 뜻·꼴·문장 속 역할이 나옵니다. 오른쪽 끝 숫자는 절 번호입니다. 이 구분은 ETCBC(탈스트라)와 니카치의 본문언어학을 따른 참고 표시입니다.</p></div>`); }

function inSpan(vi,sp){ if(!sp) return true; const [b,c]=SD.V[vi]; for(const [B,a,z] of sp) if(b===B&&c>=a&&c<=z) return true; return false; }
function spanVerses(sp){ if(!sp) return null; const out=[]; for(const [B,a,z] of sp){ const bk=SD.book[B]; if(!bk) continue; for(let vi=bk.a;vi<=bk.z;vi++){ const c=SD.V[vi][1]; if(c>=a&&c<=z) out.push(vi); } } return out; }
function forWords(sp,fn){ if(!sp){ if(SD.allLoaded){ const N=SD.wl.length; for(let i=0;i<N;i++) fn(i); return; } for(const b of SD.loaded){ const z=SD.book[b].z, end=SD.V[z][5]+SD.V[z][6]; for(let i=SD.V[SD.book[b].a][5];i<end;i++) fn(i); } return; } for(const vi of spanVerses(sp)){ const [,,,,,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++) fn(j); } }
/* 공통 결과 목록: hits = Map(vi → Set(낱말 번호)) */
function hitList(hits,more,emptyMsg){
  const vs=[...hits.keys()].sort((a,b)=>a-b); if(!vs.length) return `<p class="lead">${emptyMsg||"찾은 곳이 없습니다."}</p>`;
  const lim=30*(more||1);
  let h=`<div class="shits">`+vs.slice(0,lim).map(vi=>{ const H=sHeb(vi), set=hits.get(vi);
    const heb=H.map((t,j)=>{ const wi=SD.V[vi][5]+j; return set.has(wi)?`<mark>${esc(t.trimEnd())}</mark>${t.endsWith(" ")?" ":""}`:esc(t); }).join("");
    const words=[...set].map(wi=>{ const j=wi-SD.V[vi][5]; return `${esc(sHan(vi)[j])}`; }).join(", ");
    return `<button class="shit" data-svi="${vi}" data-swj="${[...set][0]}"><small>${esc(sRef(vi))}${words?` · ${words}`:""}</small><span class="heb">${heb}</span><span class="kr">${esc(krvText(vi))}</span></button>`; }).join("")+`</div>`;
  if(vs.length>lim) h+=`<button class="btn ghost small" id="sMore">${Math.min(30,vs.length-lim)}곳 더 보기 (남은 ${vs.length-lim}곳)</button>`;
  return h; }
/* 새 화면: 낱말의 쓰임을 책별로 — 책을 누르면 그 책의 절들. 지금 보던 책을 맨 위에 */
function wordByBookHTML(H,cnt){ const S=view.st, B=new Map(); for(const [vi,set] of H){ const b=SD.V[vi][0]; const e=B.get(b)||B.set(b,{n:0,v:0}).get(b); e.n+=set.size; e.v++; }
  const cur=S.R&&S.R.b; const L=[...B.entries()].sort((a,b)=>(b[0]===cur)-(a[0]===cur)||a[0]-b[0]); const mx=Math.max(1,...L.map(x=>x[1].n)); if(S.wbook!=null&&!B.has(S.wbook)) S.wbook=null;
  return `<p class="lead"><b>구약 전체</b>에서 ${cnt.toLocaleString()}번 · ${B.size}권 · ${H.size.toLocaleString()}절 — 책을 누르면 그 책의 구절이 펼쳐집니다</p><div class="wbooks">${L.map(([b,e])=>{ const on=S.wbook===b; let sub="";
    if(on){ const Hb=new Map([...H].filter(([vi])=>SD.V[vi][0]===b)); sub=`<div class="wbookhits">${hitList(Hb,S.more)}</div>`; }
    return `<div class="wbook${on?" on":""}"><button class="wbookb" data-wbk="${b}"><span class="n">${esc(PLAN.full[b-1])}${b===cur?" <small>(지금 보는 책)</small>":""}</span><span class="bar"><i style="width:${Math.max(4,e.n/mx*100)}%"></i></span><b>${e.n}</b><i>${on?"▴":"▾"}</i></button>${sub}</div>`; }).join("")}</div>`; }
function distBars(hits,sp){ const C=new Map(); for(const [vi,set] of hits){ const [b,c]=SD.V[vi]; const k=(!sp||sp.length>1&&new Set(sp.map(x=>x[0])).size>1)?b:b*1000+c; C.set(k,(C.get(k)||0)+set.size); }
  const byBook=!sp||new Set(sp.map(x=>x[0])).size>1; const L=[...C.entries()].sort((a,b)=>a[0]-b[0]); if(L.length<2) return "";
  const mx=Math.max(...L.map(x=>x[1]));
  return `<div class="sdist">${L.map(([k,n])=>`<div class="amrow"><span class="n">${byBook?esc(PLAN.abbr[k-1]):esc(PLAN.abbr[Math.floor(k/1000)-1]+" "+(k%1000))}</span><span class="bar"><i style="width:${Math.max(4,n/mx*100)}%"></i></span><b>${n}</b></div>`).join("")}</div>`; }
function lexRow(li,extra,attr){ const x=SD.L[li]; return `<button class="slex" ${attr||`data-slex="${li}"`}><span class="heb">${esc(x[0])}</span><span class="sl"><b>${esc(lexGloss(li))}</b><small>${esc(x[6])}${x[3]?` · H${x[3]}`:""} · ${SP_K[x[2]]||x[2]}${x[8]?" · 아람어":""}</small></span>${extra||`<i>${x[7].toLocaleString()}</i>`}</button>`; }
/* 일곱 도구 연결 */
const ST_TOOLS=[["반복","되풀이되는 말","이 범위에서 유난히 자주 나오는 낱말"],["화자","서술과 인물의 말","누가 말하는지, 서술자가 '보라'로 인물의 눈을 빌리는 곳"],["장면","장면이 열리는 곳","'그리고 ~ 일이 있었다(봐예히)', 때를 앞세운 문장"],["전환","흐름이 멈추는 문장","이야기 사이에 끼어든 설명·배경·대조"],["인물","누가 주어인가","주어로 나오는 인물, 하나님이 하시는 일"]];
function toolResult(){ const S=view.st, sp=stSpans(), t=S.tool;
  if(t==="반복"){ const C=new Map(), CN=new Map(); let tot=0;
    forWords(sp,i=>{ tot++; const li=SD.wl[i]; C.set(li,(C.get(li)||0)+1); if(SD.domW[i]===SD.dN) CN.set(li,(CN.get(li)||0)+1); });
    const NT=SD.wl.length, skip=new Set(["W","H","L","B","K","M",">T","MN","<L",">L",">CR","KJ","KL/","L>","HJH[",">MR[","ZH","HW>","JHWH/",">LHJM/"]);
    /* 두 가지 정렬: '많이 나온 순'(단순 횟수) / '두드러진 순'(구약 평균 대비 몰림 점수 c·log(c/기대)). 후보 집합과 점수 계산은 같다 */
    const srt=S.repSort||"count";
    const R0=[...C.entries()].filter(([li,c])=>c>=3&&!skip.has(SD.L[li][1])&&["subs","verb","adjv","nmpr","advb"].includes(SD.L[li][2])).map(([li,c])=>{ const e=SD.L[li][7]/NT*tot; return [li,c,c*Math.log(c/Math.max(e,0.5)),e]; }).filter(x=>x[2]>0);
    const R=R0.sort(srt==="count"?((a,b)=>b[1]-a[1]||b[2]-a[2]):((a,b)=>b[2]-a[2])).slice(0,15);
    const seg=`<div class="seg sseg mseg" style="margin:4px 0 8px">${[["count","많이 나온 순"],["salient","이 범위에서 두드러진 순"]].map(([k,n])=>`<button aria-checked="${srt===k}" data-repsort="${k}">${n}</button>`).join("")}</div>`;
    if(!R.length) return seg+`<p class="lead">범위가 짧아 세 번 이상 나오는 낱말이 없습니다. 범위를 넓혀 보세요.</p>`;
    const mx=Math.max(...R.map(x=>x[1]));
    const expl=srt==="count"?"이 범위에서 <b>세 번 이상</b> 나온 낱말을 <b>나온 횟수</b>대로 늘어놓았습니다(흔한 기능어는 뺌). 누르면 나오는 곳을 봅니다.":"같은 낱말들을 <b>구약 전체 평균에 견주어 이 범위에 얼마나 몰려 있는지</b>로 늘어놓았습니다 — 횟수가 적어도 구약에서 드문 말이면 위로 옵니다. 횟수만 보려면 '많이 나온 순'.";
    return seg+`<p class="lead">${expl}</p>`+R.map(([li,c,sc,e])=>{ const n=CN.get(li)||0; return lexRow(li,`<span class="scount"><b>${c}번</b><small>서술 ${n} · 그 밖 ${c-n}${srt==="salient"?` · 기대 ${e<1?e.toFixed(1):Math.round(e)}번`:""}</small><span class="bar"><i style="width:${c/mx*100}%"></i></span></span>`); }).join(""); }
  if(t==="화자"){ const C=new Map(); const byBook=!sp||new Set(sp.map(x=>x[0])).size>1;
    forWords(sp,i=>{ const [b,c]=SD.V[SD.vOf[i]]; const k=byBook?b:b*1000+c; const o=C.get(k)||[0,0,0]; const d=SD.domW[i]; o[d===SD.dN?0:d===SD.dQ?1:2]++; C.set(k,o); });
    const L=[...C.entries()].sort((a,b)=>a[0]-b[0]);
    let h=`<p class="lead">BHSA는 문장마다 서술자의 말인지, 인물이 하는 말(따옴표 안)인지 표시해 둡니다. 막대는 낱말 수의 비율입니다.</p><div class="slegend"><i class="n"></i>서술 <i class="q"></i>인물의 말 <i class="o"></i>율법·시·구분 안 됨</div><div class="sdist">${L.slice(0,80).map(([k,[a,b,c]])=>{ const s=a+b+c||1; return `<div class="amrow"><span class="n">${byBook?esc(PLAN.abbr[k-1]):esc(PLAN.abbr[Math.floor(k/1000)-1]+" "+(k%1000))}</span><span class="bar3"><i class="n" style="width:${a/s*100}%"></i><i class="q" style="width:${b/s*100}%"></i><i class="o" style="width:${c/s*100}%"></i></span><b>${Math.round(b/s*100)}%</b></div>`; }).join("")}</div>`;
    const hn=SD.lexByKey["HNH"]||[]; const hits=new Map(); forWords(sp,i=>{ if(hn.includes(SD.wl[i])&&SD.domW[i]===SD.dN){ const vi=SD.vOf[i]; if(!hits.has(vi)) hits.set(vi,new Set()); hits.get(vi).add(i); } });
    h+=`<span class="label" style="margin-top:14px">서술 속 '보라(힌네)': 인물의 눈으로 보는 곳</span><p class="lead">서술자가 '보라'를 쓰면, 독자는 그 순간 인물이 본 것을 함께 봅니다. 따옴표 밖의 '힌네'만 모았습니다. (${hits.size}곳)</p>`+hitList(hits,S.more,"이 범위의 서술에는 '보라'가 없습니다.");
    return h; }
  if(t==="장면"){ const hits=new Map(), add=i=>{ const vi=SD.vOf[i]; if(!hits.has(vi)) hits.set(vi,new Set()); hits.get(vi).add(i); };
    const hy=new Set(SD.lexByKey["HJH["]||[]), tm=SD.FN.indexOf("Time");
    forWords(sp,i=>{ if(!(SD.wg[i]&1)) return; if(SD.domW[i]===SD.dQ) return; const vt=SD.M[SD.wm[i]][2];
      const j=SD.L[SD.wl[i]][1]==="W"?i+1:i; if(hy.has(SD.wl[j])&&SD.M[SD.wm[j]][2]==="wayq"){ const a=SD.wa[i], W=[]; for(let x=i;x<i+12&&x<SD.wl.length&&SD.wa[x]===a;x++) W.push(x); const N=[]; for(let x=W[W.length-1]+1;x<W[W.length-1]+6&&x<SD.wl.length&&SD.wa[x]===SD.wa[W[W.length-1]+1];x++) N.push(x); if(markerKind(W,N,SD.TY[SD.ay[a]])) add(j); return; }
      if(SD.wf[i]===tm&&SD.domW[i]===SD.dN) add(i);
      else if(SD.TY[SD.ct[SD.wc[i]]]==="MSyn") add(i); });
    return `<p class="lead">이야기에서 새 장면은 흔히 '그리고 ~ 일이 있었다(봐예히)'나 때를 알리는 말로 시작합니다. ETCBC가 '이야기 표지(MSyn)'로 분류한 문장(봐예히·보라·이제 등이 홀로 선 것)도 함께 모았습니다. 인물의 말 속의 봐예히는 뺐습니다. (${hits.size}곳)</p>`+hitList(hits,S.more); }
  if(t==="전환"){ const G={a:["상태·설명",["NmCl","AjCl","WXNm"],"동사 없이 상태나 정체를 말하는 문장"],b:["앞선 일·대조",["XQtl","WXQt","xQtX","xQt0","WxQ0","WxQX","ZQt0","ZQtX"],"주어나 다른 말이 앞에 나오고 완료형이 따르는 문장. 이야기 진행을 멈추고 배경·이전 일·대조를 알립니다"],c:["진행 중인 일",["Ptcp"],"분사로 그때 벌어지고 있던 일을 보여 주는 문장"]};
    const hits={a:new Map(),b:new Map(),c:new Map()}; const T2G={}; for(const k in G) G[k][1].forEach(t=>T2G[SD.TY.indexOf(t)]=k);
    forWords(sp,i=>{ if(SD.domW[i]!==SD.dN) return; const g=T2G[SD.ct[SD.wc[i]]]; if(!g) return; const vi=SD.vOf[i]; const H=hits[g]; if(!H.has(vi)) H.set(vi,new Set()); H.get(vi).add(i); });
    const sel=S.sub&&G[S.sub]?S.sub:"b";
    return `<p class="lead">이야기는 '봐이크톨' 동사(그리고 ~했다)가 줄지어 나아갑니다. 그 줄이 끊기는 문장은 서술자가 잠시 멈춰 무언가를 알려 주는 자리입니다. 서술 부분만 모았습니다.</p><div class="seg sseg">${Object.entries(G).map(([k,g])=>`<button aria-checked="${k===sel}" data-ssub="${k}">${g[0]} <small>${hits[k].size}</small></button>`).join("")}</div><p class="lead">${G[sel][2]}</p>`+hitList(hits[sel],S.more,"이 범위의 서술에는 해당 문장이 없습니다."); }
  if(t==="인물"){ const subj=new Set(["Subj","PreS","IntS","ModS","ExsS","PrcS"].map(f=>SD.FN.indexOf(f)).filter(x=>x>=0)), pred=new Set(["Pred","PreO","PreS","PreC","PtcO"].map(f=>SD.FN.indexOf(f)).filter(x=>x>=0));
    const P=new Map(), godCl=new Set();
    forWords(sp,i=>{ if(!subj.has(SD.wf[i])) return; const x=SD.L[SD.wl[i]]; if(x[2]==="nmpr"||GOD_LEX.has(x[1])){ P.set(SD.wl[i],(P.get(SD.wl[i])||0)+1); if(GOD_LEX.has(x[1])) godCl.add(SD.wc[i]); } });
    const V=new Map(); forWords(sp,i=>{ if(godCl.has(SD.wc[i])&&pred.has(SD.wf[i])&&SD.M[SD.wm[i]][0]==="verb"){ const li=SD.wl[i]; V.set(li,(V.get(li)||0)+1); } });
    const PL=[...P.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10), VL=[...V.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15);
    const m1=Math.max(1,...PL.map(x=>x[1])), m2=Math.max(1,...VL.map(x=>x[1]));
    return `<span class="label">주어로 나오는 이름</span><p class="lead">문장의 주어 자리에 이름이 직접 나온 횟수입니다(동사에 숨은 주어 '그가'는 세지 않습니다).</p>${PL.map(([li,c])=>lexRow(li,`<span class="scount"><b>${c}번</b><span class="bar"><i style="width:${c/m1*100}%"></i></span></span>`)).join("")||`<p class="lead">없습니다.</p>`}
      <span class="label" style="margin-top:14px">하나님(여호와)이 주어인 동사</span><p class="lead">'여호와'나 '하나님'이 주어로 나온 문장의 동사입니다. 누르면 그 동사가 나오는 곳을 봅니다.</p>${VL.map(([li,c])=>lexRow(li,`<span class="scount"><b>${c}번</b><span class="bar"><i style="width:${c/m2*100}%"></i></span></span>`,`data-sgod="${li}"`)).join("")||`<p class="lead">이 범위에는 없습니다.</p>`}
      ${S.godv!=null?`<span class="label" style="margin-top:14px">하나님이 '${esc(lexGloss(S.godv))}' 하신 곳</span>`+hitList((()=>{ const H=new Map(); forWords(sp,i=>{ if(SD.wl[i]===S.godv&&godCl.has(SD.wc[i])&&pred.has(SD.wf[i])){ const vi=SD.vOf[i]; if(!H.has(vi)) H.set(vi,new Set()); H.get(vi).add(i); } }); return H; })(),S.more):""}`; }
  return ""; }
function wordHits(){ const S=view.st, sp=stSpans(), H=new Map(); if(S.lex==null) return H;
  forWords(sp,i=>{ if(SD.wl[i]!==S.lex) return; if(S.dom&&SD.DO[SD.domW[i]]!==S.dom) return; const m=SD.M[SD.wm[i]]; if(S.vs&&m[1]!==S.vs) return; if(S.vt&&m[2]!==S.vt) return; const vi=SD.vOf[i]; if(!H.has(vi)) H.set(vi,new Set()); H.get(vi).add(i); });
  return H; }
function lexSuggest(q){ q=(q||"").trim(); if(!q) return [];
  const strip=s=>s.replace(/[֑-ׇ]/g,""); const heb=/[א-ת]/.test(q), qs=strip(q); const sm=q.match(/^[hH]?\s*(\d{1,4})$/);
  const out=[]; SD.L.forEach((x,i)=>{ let s=-1;
    if(sm) s=x[3]===+sm[1]?0:-1; else if(heb) s=strip(x[0])===qs?0:strip(x[0]).startsWith(qs)?1:-1;
    else s=(x[9]||"").split(/[,\s()]+/).includes(q)?0:(x[9]||"").includes(q)?1:x[6]===q?1:x[6].startsWith(q)?2:lexKo(i).includes(q)?3:-1;
    if(s>=0) out.push([i,s]); });
  return out.sort((a,b)=>a[1]-b[1]||SD.L[b[0]][7]-SD.L[a[0]][7]).slice(0,20).map(x=>x[0]); }
function verseView(){ const S=view.st; let vi=Math.max(0,Math.min(SD.V.length-1,S.vi|0)); const RV=spanVerses([[S.R.b,S.R.c1,S.R.c2]]); if(!RV.includes(vi)) vi=RV[0]; S.vi=vi;
  const [b,c,v,hc,hv,s,n]=SD.V[vi], H=sHeb(vi), HN=sHan(vi);
  const books=Array.from({length:39},(_,i)=>i+1), chs=[...SD.book[b].chs].filter(x=>x>=S.R.c1&&x<=S.R.c2).sort((a,b)=>a-b), vss=(SD.ch.get(b+"-"+c)||[]);
  let h=`<div class="seg sseg" style="margin-bottom:10px">${[["verse","한 절 자세히"],["struct","장 구조 보기"]].map(([k,n])=>`<button aria-checked="${(S.vMode||"verse")===k}" data-svmode="${k}">${n}</button>`).join("")}</div><div class="svnav"><button class="iconbtn" id="sPrev" aria-label="앞 절">‹</button><span class="svsel"><select id="sC">${chs.map(x=>`<option${x===c?" selected":""}>${x}</option>`).join("")}</select><select id="sV">${vss.map(x=>`<option value="${x}"${x===vi?" selected":""}>${SD.V[x][2]===0?"표제":SD.V[x][2]}</option>`).join("")}</select></span><button class="iconbtn" id="sNext" aria-label="다음 절">›</button></div>`;
  if(S.vMode==="struct") return h+structView(b,c);
  h+=`<p class="kr svkr"><b>${esc(sRef(vi))}</b> ${esc(krvText(vi))}</p><p class="heb svheb">${H.map(esc).join("")}</p>`;
  if(hc!==c||hv!==v) h+=`<p class="lead">히브리어 성경에서는 ${hc}:${hv}절입니다.</p>`;
  h+=`<div class="swords">${H.map((t,j)=>{ const wi=s+j, li=SD.wl[wi]; const on=S.sel===wi; return `<button class="sw1${on?" on":""}${SD.wg[wi]&4?" qere":""}" data-swi="${wi}"><span class="heb">${esc(t.replace(/[ ׃]+$/,""))}</span><small class="hn">${esc(HN[j])}</small><span class="gl">${esc(lexGloss(li))}</span><small class="mf">${esc(morphShort(SD.wm[wi]))}</small></button>`; }).join("")}</div>`;
  if(S.sel>=s&&S.sel<s+n) h+=`<div class="sdetail">${wordDetail(S.sel)}</div>`;
  else h+=`<p class="lead">낱말을 누르면 뜻·꼴·문장 속 역할이 나옵니다. 오른쪽에서 왼쪽으로 읽습니다.</p>`;
  return h; }
function rangeBox(){ const S=view.st; if(ux2()) return ""; if(!(S.mode==="word"||S.mode==="query")) return "";
  return `<div class="seg sseg swide">${[["","이 범위 · "+(S.R?`${PLAN.abbr[S.R.b-1]} ${S.R.c1}–${S.R.c2}`:"")],["1","구약 전체"]].map(([k,n])=>`<button aria-checked="${(S.wide?"1":"")===k}" data-swide="${k}">${esc(n)}</button>`).join("")}</div>`; }
const BOOK_GRP=[["율법서",1,5],["역사서",6,17],["시가서",18,22],["선지서",23,39]];
function pickerHTML(){ const S=view.st, pk=S.pk ||= {b:null,c1:null,c2:null};
  if(!pk.b) return `<section class="sec"><p class="lead">살펴볼 책을 고르세요.</p>${BOOK_GRP.map(([g,a,z])=>`<div class="pkgrp">${g}</div><div class="pkbooks">${Array.from({length:z-a+1},(_,i)=>a+i).map(b=>`<button data-pkb="${b}">${esc(PLAN.full[b-1])}</button>`).join("")}</div>`).join("")}${S.R?`<button class="sbtn ghost" id="pkCancel">돌아가기</button>`:""}</section>`;
  const chs=[...SD.book[pk.b].chs].sort((a,b)=>a-b), u=pk.b===19?"편":"장";
  const lo=pk.c1!=null&&pk.c2!=null?Math.min(pk.c1,pk.c2):pk.c1, hi=pk.c1!=null&&pk.c2!=null?Math.max(pk.c1,pk.c2):pk.c1;
  return `<section class="sec"><button class="sback" id="pkBook">← 책 다시 고르기</button><h3 class="pktitle">${esc(PLAN.full[pk.b-1])}</h3><p class="lead" style="margin:0 0 8px">시작 ${u} → 끝 ${u}을 차례로 누르세요. 같은 ${u}을 두 번 누르면 그 한 ${u}만 고릅니다.</p>
   <div class="pkchs">${chs.map(c=>`<button data-pkc="${c}" class="${c===lo||c===hi?"end":lo!=null&&hi!=null&&c>lo&&c<hi?"mid":""}">${c}</button>`).join("")}</div>
   ${lo!=null?`<p class="pksel">고른 범위 · <b>${esc(PLAN.full[pk.b-1])} ${pk.c2==null?lo+u+" (끝 "+u+"을 누르세요)":(lo===hi?lo:lo+"–"+hi)+u}</b></p>`:""}
   <button class="sbtn" id="pkGo"${lo==null?" disabled":""}>이 범위로 연구</button><p class="lead" style="font-size:12px">한 번에 한 책 안에서 고릅니다.</p></section>`; }
function gateHTML(){ const L=lastRange(), RC=recentRanges(); let h=`<section class="sec">`;
  h+=`<div class="scard"><small>BIBLIA HEBRAICA · BHSA</small><h3>어디로 갈까요</h3><p class="lead">책과 장을 고르면 히브리어 원문을 읽기·구조·낱말·검색식으로 살핍니다.</p><button class="sbtn" id="sOther">책 → 장 고르기</button></div>`;
  if(RC.length) h+=`<div class="pkgrp">최근 본 곳</div><div class="achips">${RC.map(R=>`<button class="achip" data-ar='${JSON.stringify(R)}'>${esc(rLabel(R))}</button>`).join("")}</div>`;
  h+=`<p class="lead" style="margin-top:16px">구약 히브리어 원문(BHSA)으로 낱말과 문장 구조를 살피는 곳입니다. 무료·비영리로 운영합니다.</p></section>`;
  return h; }
function renderStudy(){
  const S=view.st;
  fontsLoad(1);
  let h=`<section class="shead2"><div class="sh1"><button class="sh1t" id="sHome" aria-label="책·장 고르기">${esc(window.APP_NAME||"MILAL")}</button><span class="ssub">히브리어 원문 · BHSA</span><span id="hostAcct">${window.hostMenuHTML?hostMenuHTML():""}</span></div>`;
  if(!SD){ studyLoad((lastRange()||{b:1}).b); return h+`</section><section class="sec"><p class="lead">${SDerr?esc(SDerr):"원문 자료를 내려받는 중입니다."}</p>${SDerr?`<button class="sbtn" id="sdRetry">다시 시도</button>`:""}</section>`; }
  if(S.pick) return h+`</section>`+pickerHTML();
  if(!S.entered||!S.R){ const m=S.mode; setRange(lastRange()||{b:1,c1:1,c2:1}); S.mode=m&&m!=="verse"?m:"verse"; }
  if(RESEARCH_MODES.includes(S.mode)) S.rmode=S.mode;
  if(!SD.loaded.has(S.R.b)){ loadBook(S.R.b).then(()=>render()).catch(()=>{ SDerr=`${PLAN.full[S.R.b-1]} 자료를 내려받지 못했습니다.`; render(); });
    return h+`</section><section class="sec"><p class="lead">${SDerr?esc(SDerr):PLAN.full[S.R.b-1]+" 자료를 내려받는 중…"}</p></section>`; }
  const needAll=S.mode==="query"||(S.mode==="word"&&S.lex!=null); if(needAll&&!SD.allLoaded){ ensureAll().then(()=>render()).catch(()=>{}); }
  if((S.mode==="word"||(S.mode==="verse"&&S.rv>=0))&&!SD.LK) lexKoLoad();
  const T=todayOT(), isT=T&&T.b===S.R.b&&T.c1===S.R.c1&&T.c2===S.R.c2;
  h+=`<div class="sbar"><button class="iconbtn" id="sCPrev" aria-label="앞 장">‹</button><button class="saddr" id="sAddr">${esc(ux2()&&["start","tool","query"].includes(S.mode)?rScopeLabel():`${PLAN.abbr[S.R.b-1]} ${S.R.c1===S.R.c2?S.R.c1:S.R.c1+"–"+S.R.c2}${S.R.b===19?"편":"장"}`)} <i>▾</i></button><button class="iconbtn" id="sCNext" aria-label="다음 장">›</button>${S.mode==="verse"&&rdMode()==="struct"?`<button class="iconbtn sfa${S.foldAll?" on":""}" id="sFoldAll" title="말 모두 접기/펼치기" aria-label="말 모두 접기">⇕</button>`:""}<button class="iconbtn" id="sInfo" aria-label="보는 법">ⓘ</button></div></section>`;
  if(T&&!isT&&!S.todayHide) h+=`<button class="stoday" id="sGoToday">오늘 본문 · ${esc(rLabel(T))}으로 가기 ›</button>`;
  if(ux2()&&S.mode==="start") return h+renderResearchStart();
  if(RESEARCH_MODES.includes(S.mode)) h+=ux2()?`<div class="rback"><button class="mtog back" id="rStart">← 연구 시작</button> <b>${esc(S.mode==="tool"&&S.tool?S.tool+" · "+(ST_TOOLS.find(x=>x[0]===S.tool)||[])[1]:rModeName(S.mode))}</b></div>${["tool","word","query"].includes(S.mode)?rScopeHTML():""}`:`<div class="seg smode rseg" role="tablist">${[["tool","도구"],["word","낱말"],["query","검색식"],["compare","비교"],["theory","이론"]].map(([k,n])=>`<button role="tab" aria-checked="${S.mode===k}" data-smode="${k}">${n}</button>`).join("")}</div>`;
  if(S.mode==="theory") return h+renderTheory();
  if(S.mode==="notes") return h+notesPage();
  if(S.mode==="verse"){ const chs=[...SD.book[S.R.b].chs].filter(c=>c>=S.R.c1&&c<=S.R.c2).sort((x,y)=>x-y); const vc=chs.includes(S.vc)?S.vc:chs[0]; S.vc=vc; const k=chs.indexOf(vc), multi=chs.length>1, u=S.R.b===19?"편":"장", rd=rdMode();
    h+=`<section class="sec"><div class="schrow">${multi?`<button class="iconbtn" id="sVcP" aria-label="앞 장"${k<=0?" disabled":""}>‹</button>`:""}${ux2()&&!multi?"":`<h3 class="sch">${esc(PLAN.full[S.R.b-1])} ${vc}${u}${multi?` <small>${k+1} / ${chs.length}</small>`:""}</h3>`}${multi?`<button class="iconbtn" id="sVcN" aria-label="다음 장"${k>=chs.length-1?" disabled":""}>›</button>`:""}</div>
      ${ux2()&&rd==="read"?"":`<div class="svrow">${rd==="struct"?`<div class="seg svm ${ux2()&&!expertOn()?"":"sv3"}">${[["tree","계층"],["speech","발화"],["map",ux2()?"MILAL 관계 그림":"지도"]].filter(([x])=>x!=="map"||!ux2()||expertOn()).map(([x,n])=>`<button aria-checked="${(S.sv||"tree")===x}" data-ssv="${x}">${n}</button>`).join("")}</div>`:`<span></span>`}${sfzHTML()}</div>`}
      ${rd==="read"?readView(S.R.b,vc):((S.sv||"tree")==="map"?unitMapView(S.R.b):structHead(S.R.b)+((S.sv||"tree")==="speech"?speechView(S.R.b,vc):structView(S.R.b,vc,true)))}
      ${multi&&k<chs.length-1?`<button class="sbtn snextch" id="sVcN2">${chs[k+1]}${u} 이어서 보기 ›</button>`:""}</section>`; }
  else if(S.mode==="query") h+=renderQuery();
  else if(S.mode==="compare") h+=(window.renderCompare?renderCompare():"");
  else if(S.mode==="word"){
    h+=`<section class="sec">${rangeBox()}<div class="ssearch"><input id="sQ" type="search" placeholder="뜻(예: 창조하다), 히브리어, 음역, 스트롱 번호(H1254)" value="${esc(S.q||"")}" autocomplete="off"></div><div id="sSug">${S.lex==null?sugHTML(S.q):""}</div>${ux2()&&S.lex==null&&!(S.q||"").trim()?topWordsHTML():""}`;
    if(S.lex!=null){ const x=SD.L[S.lex], H=wordHits(); let cnt=0; H.forEach(s=>cnt+=s.size);
      const forms={vs:new Map(),vt:new Map()}; if(x[2]==="verb"){ const ids=new Set([S.lex]); for(let i=0;i<SD.wl.length;i++) if(SD.wl[i]===S.lex){ const m=SD.M[SD.wm[i]]; forms.vs.set(m[1],(forms.vs.get(m[1])||0)+1); forms.vt.set(m[2],(forms.vt.get(m[2])||0)+1); } }
      h+=`<div class="slexhd">${lexRow(S.lex,`<button class="iconbtn" id="sLexX" aria-label="다른 낱말 찾기">✕</button>`,'data-noop="1"')}${lexKo(S.lex)?`<p class="lead">사전 풀이: ${esc(lexKo(S.lex))}</p>`:""}</div>
        <div class="sfilt"><label>누구의 말<select id="sDom"><option value="">모두</option><option value="N"${S.dom==="N"?" selected":""}>서술</option><option value="Q"${S.dom==="Q"?" selected":""}>인물의 말</option><option value="D"${S.dom==="D"?" selected":""}>율법·시 등</option></select></label>
        ${x[2]==="verb"?`<label>줄기<select id="sVs"><option value="">모두</option>${[...forms.vs.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<option value="${k}"${S.vs===k?" selected":""}>${esc(VS_K[k]||k)} (${n})</option>`).join("")}</select></label><label>형태<select id="sVt"><option value="">모두</option>${[...forms.vt.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<option value="${k}"${S.vt===k?" selected":""}>${esc(VT_K[k]||k)} (${n})</option>`).join("")}</select></label>`:""}</div>
        ${!SD.allLoaded?`<p class="lead" style="color:var(--accent)">구약 전체 자료를 받는 중입니다 (${loadedCount()}/39권). 다 받으면 결과가 바뀔 수 있습니다.</p>`:""}${ux2()?wordByBookHTML(H,cnt):`<p class="lead"><b>${esc(stRangeLabel())}</b>에서 ${cnt.toLocaleString()}번, ${H.size.toLocaleString()}절</p>${distBars(H,stSpans())}${hitList(H,S.more)}`}`; }
    h+=`</section>`; }
  else { h+=`<section class="sec">${ux2()?"":`<button class="srangeline" id="sMulti">범위: <b>${esc(rLabel(S.R))}</b> · 여러 장 묶기 ▾</button><div class="stools">${ST_TOOLS.map(([t,n,d])=>`<button class="stool${S.tool===t?" on":""}" data-stool="${t}"><i class="tool">${t}</i><b>${n}</b><small>${d}</small></button>`).join("")}</div>`}</section>`;
    if(S.tool){ const rk=S.tool==="전환"?"전환"+(S.sub||"b"):Q_RECIPES[S.tool]?S.tool:""; h+=`<section class="sec" id="sToolRes"><span class="label">${esc(S.tool)} · ${esc(stRangeLabel())}</span>${rk?`<button class="qlink" data-sqopen="${rk}">이 결과의 검색식 보기 ›</button>`:""}${toolResult()}</section>`; }
    else h+=`<section class="sec"><p class="lead">위에서 도구를 고르면 고른 범위를 원문에서 살핍니다. 아이러니와 공백은 기계로 찾을 수 없어 넣지 않았습니다.</p></section>`; }
  h+=`<section class="sec ssrc"><span class="label">자료 출처</span><p class="lead">${window.BIBLE&&TR_INFO.tr&&TR_INFO.tr.src?"번역 본문: "+esc(TR_INFO.tr.src)+" · ":""}원문·문법·문장 구분: BHSA (Biblia Hebraica Stuttgartensia Amstelodamensis, ETCBC, CC BY-NC 4.0) · 스트롱 번호 연결: Open Scriptures Hebrew Bible (OSHB, CC BY 4.0) · 한국어 사전 풀이: Lexicon Omnium Gentium (E. Timothy Uy, 2026, CC BY 4.0, 영어 사전을 기계 번역한 자료) · 유래·단어 정의·KJV에서 옮긴 말: Strong's Hebrew Dictionary(공개 저작물, Open Scriptures HebrewLexicon 정리본 CC BY 4.0)를 우리말로 옮긴 참고용 · 짧은 뜻과 이름 표기는 BHSA 영어 뜻과 위 사전을 바탕으로 개역개정 표기에 맞춰 정리한 참고용이며, 음역은 BHSA 음운 전사를 한글로 옮긴 참고용입니다.</p></section>`;
  return h; }
function sugHTML(q){ if(!SD||!q) return ""; const L=lexSuggest(q); if(!L.length) return `<p class="lead">찾는 낱말이 없습니다. 다른 말로 넣어 보세요.</p>`; return L.map(li=>lexRow(li)).join(""); }
function bindStudy(m){
  const S=view.st, rr=()=>{ S.more=1; render(); };
  const r=document.getElementById("sdRetry"); if(r) r.onclick=()=>{ studyLoad(); render(); };
  if(!SD) return;
  bindQuery(m); if(view.st.mode==="compare"&&window.bindCompare) bindCompare(m); m.querySelectorAll("[data-sqopen]").forEach(b=>b.onclick=()=>qOpen(b.dataset.sqopen));
  const sh=document.getElementById("sHome"); if(sh) sh.onclick=openAddr;
    m.querySelectorAll("[data-ar]").forEach(b=>b.onclick=()=>{ setRange(JSON.parse(b.dataset.ar)); S.mode="verse"; render(); scrollTo({top:0}); });
  const ha=document.getElementById("hostAcct"); if(ha&&window.bindHostMenu) bindHostMenu(ha);
  const pkS=()=>{ const y=scrollY; render(); scrollTo({top:y}); };
  const stdy=document.getElementById("sToday"); if(stdy) stdy.onclick=()=>{ setRange(todayOT()); render(); scrollTo({top:0}); };
  const sl=document.getElementById("sLast"); if(sl) sl.onclick=()=>{ setRange(lastRange()); render(); scrollTo({top:0}); };
  const so=document.getElementById("sOther"); if(so) so.onclick=()=>{ S.pick=true; S.pk=null; render(); scrollTo({top:0}); };
  const srg=document.getElementById("sRange"); if(srg) srg.onclick=()=>{ S.pick=true; S.pk={b:S.R.b,c1:S.R.c1,c2:S.R.c2}; render(); scrollTo({top:0}); };
  m.querySelectorAll("[data-pkb]").forEach(b=>b.onclick=()=>{ S.pk={b:+b.dataset.pkb,c1:null,c2:null}; render(); scrollTo({top:0}); });
  m.querySelectorAll("[data-pkc]").forEach(b=>b.onclick=()=>{ const c=+b.dataset.pkc, pk=S.pk; if(pk.c1==null||pk.c2!=null){ pk.c1=c; pk.c2=null; } else pk.c2=c; pkS(); });
  const pb=document.getElementById("pkBook"); if(pb) pb.onclick=()=>{ S.pk={b:null,c1:null,c2:null}; render(); };
  const pc=document.getElementById("pkCancel"); if(pc) pc.onclick=()=>{ S.pick=false; S.pk=null; render(); };
  const pkg=document.getElementById("pkGo"); if(pkg) pkg.onclick=()=>{ const pk=S.pk; if(pk.c1==null) return; const c2=pk.c2==null?pk.c1:pk.c2; setRange({b:pk.b,c1:Math.min(pk.c1,c2),c2:Math.max(pk.c1,c2)}); render(); scrollTo({top:0}); };
  m.querySelectorAll("[data-swide]").forEach(b=>b.onclick=()=>{ S.wide=!!b.dataset.swide; rr(); });
  m.querySelectorAll("[data-smode]").forEach(b=>b.onclick=()=>{ S.mode=b.dataset.smode; if(S.mode==="tool"&&S.range==="all") S.range="book"; rr(); });
  m.querySelectorAll("[data-srange]").forEach(b=>b.onclick=()=>{ S.range=b.dataset.srange; rr(); });
  m.querySelectorAll("[data-repsort]").forEach(b=>b.onclick=()=>{ S.repSort=b.dataset.repsort; try{ localStorage.setItem("milal-study-repsort",S.repSort); }catch(e){} const y=scrollY; render(); scrollTo({top:y}); });
  if(!S.repSort){ try{ S.repSort=localStorage.getItem("milal-study-repsort")||"count"; }catch(e){ S.repSort="count"; } }
  const rb=document.getElementById("sRb"); if(rb) rb.onchange=()=>{ S.rb=+rb.value; S.rbSet=1; S.rc1=1; S.rc2=0; if(S.range==="day") S.range="book"; rr(); };
  const c1=document.getElementById("sRc1"), c2=document.getElementById("sRc2"); if(c1) c1.onchange=()=>{ S.rc1=+c1.value; if(S.rc2&&S.rc2<S.rc1) S.rc2=S.rc1; if(S.range==="day") S.range="book"; rr(); }; if(c2) c2.onchange=()=>{ S.rc2=+c2.value; if(S.rc2<S.rc1) S.rc1=S.rc2; if(S.range==="day") S.range="book"; rr(); };
  m.querySelectorAll("[data-stool]").forEach(b=>b.onclick=()=>{ S.tool=S.tool===b.dataset.stool?"":b.dataset.stool; S.godv=null; S.sub=""; rr(); const r=document.getElementById("sToolRes"); if(r) r.scrollIntoView({behavior:"smooth",block:"start"}); });
  m.querySelectorAll("[data-ssub]").forEach(b=>b.onclick=()=>{ S.sub=b.dataset.ssub; rr(); });
  m.querySelectorAll("[data-sgod]").forEach(b=>b.onclick=()=>{ S.godv=+b.dataset.sgod; S.more=1; const y=scrollY; render(); scrollTo({top:y}); });
  const goWord=li=>{ S.mode="word"; S.lex=li; S.dom=""; S.vs=""; S.vt=""; S.q=""; S.more=1; render(); scrollTo({top:0}); };
  m.querySelectorAll("[data-slex]").forEach(b=>b.onclick=()=>goWord(+b.dataset.slex));
  m.querySelectorAll("[data-sfind]").forEach(b=>b.onclick=()=>{ S.range="all"; goWord(+b.dataset.sfind); });
  m.querySelectorAll("[data-svi]").forEach(b=>b.onclick=()=>gotoVerse(+b.dataset.svi,b.dataset.swj!=null?+b.dataset.swj:null));
  const mo=document.getElementById("sMore"); if(mo) mo.onclick=()=>{ S.more=(S.more||1)+1; const y=scrollY; render(); scrollTo({top:y}); };
  const q=document.getElementById("sQ"); if(q){ q.oninput=()=>{ S.q=q.value; if(S.lex!=null){ S.lex=null; const p=q.selectionStart; render(); const q2=document.getElementById("sQ"); q2.focus(); q2.setSelectionRange(p,p); return; } const sg=document.getElementById("sSug"); sg.innerHTML=sugHTML(S.q); sg.querySelectorAll("[data-slex]").forEach(b=>b.onclick=()=>goWord(+b.dataset.slex)); }; }
  const lx=document.getElementById("sLexX"); if(lx) lx.onclick=e=>{ e.stopPropagation(); S.lex=null; render(); document.getElementById("sQ")?.focus(); };
  [["sDom","dom"],["sVs","vs"],["sVt","vt"]].forEach(([id,k])=>{ const el=document.getElementById(id); if(el) el.onchange=()=>{ S[k]=el.value; rr(); }; });
  m.querySelectorAll("[data-swi]").forEach(b=>b.onclick=()=>{ const wi=+b.dataset.swi; S.sel=S.sel===wi?-1:wi; const y=scrollY; render(); scrollTo({top:y}); });
  m.querySelectorAll("[data-sw]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); openWordSheet(+b.dataset.sw); });
  m.querySelectorAll("[data-sfold]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const a=+b.dataset.sfold; S.fold ||= {}; S.fold[a]=b.dataset.open?false:true; const y=scrollY; render(); scrollTo({top:y}); });
  const ad=document.getElementById("sAddr"); if(ad) ad.onclick=()=>{ if(ux2()&&["start","tool","query"].includes(S.mode)) rScopeOpen(); else openAddr(); };
  const inf=document.getElementById("sInfo"); if(inf) inf.onclick=openStudyInfo;
  const cp=document.getElementById("sCPrev"), cn=document.getElementById("sCNext"); if(cp) cp.onclick=()=>{ chStep(-1); render(); scrollTo({top:0}); }; if(cn) cn.onclick=()=>{ chStep(1); render(); scrollTo({top:0}); };
  const chsR=S.R?[...SD.book[S.R.b].chs].filter(c=>c>=S.R.c1&&c<=S.R.c2).sort((x,y)=>x-y):[]; const vcGo=d=>{ const k=chsR.indexOf(S.vc)+d; if(k<0||k>=chsR.length) return; S.vc=chsR[k]; S.rv=-1; render(); scrollTo({top:0}); };
  ["sVcP","sVcN","sVcN2"].forEach(id=>{ const el=document.getElementById(id); if(el) el.onclick=()=>vcGo(id==="sVcP"?-1:1); });
  m.querySelectorAll("[data-sfz]").forEach(x=>x.onclick=()=>{ const v=Math.round(Math.min(1.5,Math.max(0.8,sFs()+(+x.dataset.sfz)*0.1))*10)/10; try{ localStorage.setItem("milal-study-fs",v); }catch(e){} applySfs(); const y=scrollY; render(); scrollTo({top:y}); });
  m.querySelectorAll("[data-svm]").forEach(b=>b.onclick=()=>{ S.rd=b.dataset.svm; try{ localStorage.setItem(RD_KEY,S.rd); }catch(e){} render(); });
  if(S.mode==="verse"&&rdMode()==="read") bindRead(m);
  if(S.mode==="notes"){ bindStudyNotes(); if(S.nseg!=="shared"&&window.bindRecordsPage) bindRecordsPage(m); }
  m.querySelectorAll("[data-ssv]").forEach(b=>b.onclick=()=>{ S.sv=b.dataset.ssv; render(); });
  m.querySelectorAll("[data-milal]").forEach(b=>b.onclick=()=>{ S.milalOn=b.dataset.milal==="1"; render(); });
  const ex1=m.querySelector("#stExpert"); if(ex1) ex1.onclick=()=>expertSet(true); const ex0=m.querySelector("#stExpertOff"); if(ex0) ex0.onclick=()=>expertSet(false);
  const rsc=m.querySelector("#rScope"); if(rsc) rsc.onclick=()=>rScopeOpen();
  m.querySelectorAll("[data-wbk]").forEach(b=>b.onclick=()=>{ const k=+b.dataset.wbk; S.wbook=S.wbook===k?null:k; S.more=1; const y=scrollY; render(); scrollTo({top:y}); });
  const rs=m.querySelector("#rStart"); if(rs) rs.onclick=()=>{ S.mode="start"; S.rmode="start"; render(); scrollTo({top:0}); };
  m.querySelectorAll("[data-rstart]").forEach(b=>b.onclick=()=>{ const k=b.dataset.rstart; if(k.startsWith("tool:")){ S.mode="tool"; S.tool=k.slice(5); S.sub=""; S.godv=null; } else if(k==="theory"){ S.mode="theory"; } else { const x=R_START.find(y=>y.k===k); S.mode=x.go.mode; if(x.go.tool){ S.tool=x.go.tool; S.sub=""; S.godv=null; } } if(S.mode==="tool"&&S.range==="all") S.range="book"; S.rmode=S.mode; render(); scrollTo({top:0}); });
  const rsv=m.querySelector("#rSaved"); if(rsv) rsv.onclick=()=>{ S.mode="query"; S.rmode="query"; render(); if(window.qOpenSaved) qOpenSaved(); };
  m.querySelectorAll("[data-sat]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); openAtomSheet(S.R.b,+b.dataset.sat); });
  m.querySelectorAll(".umap [data-mgo]").forEach(b=>b.onclick=()=>gotoAtom(S.R.b,+b.dataset.mgo));
  const sg=document.getElementById("stGloss"); if(sg) sg.onclick=()=>openStructGlossary(S.R.b);
  m.querySelectorAll("[data-mgh]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); if(window.openUnitSheet) openUnitSheet(S.R.b,b.dataset.mgh); });
  m.querySelectorAll("[data-mapcand]").forEach(b=>b.onclick=()=>{ S.mapCand=b.dataset.mapcand==="1"; render(); });
  const sbk=document.getElementById("sBack"); if(sbk) sbk.onclick=goBack;
  const fa=document.getElementById("sFoldAll"); if(fa) fa.onclick=()=>{ S.foldAll=!S.foldAll; S.fold={}; render(); toast(S.foldAll?"인물의 말을 모두 접었습니다. 이야기 뼈대만 보입니다.":"인물의 말을 모두 펼쳤습니다."); };
  const gt=document.getElementById("sGoToday"); if(gt) gt.onclick=()=>{ const m=S.mode; setRange(todayOT()); S.mode=m; render(); scrollTo({top:0}); };
  const ml=document.getElementById("sMulti"); if(ml) ml.onclick=()=>{ S.pick=true; S.pk={b:S.R.b,c1:null,c2:null}; render(); scrollTo({top:0}); };
  if(S.scrollV&&S.mode==="verse"){ const L=SD.ref.get(S.R.b+"-"+S.vc+"-"+S.scrollV); const el=L&&document.getElementById("stv-"+L[0]); S.scrollV=0; if(el){ setTimeout(()=>{ el.scrollIntoView({block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),2200); },50); } }
  m.querySelectorAll("[data-sfoldall]").forEach(b=>b.onclick=()=>{ S.foldAll=!!b.dataset.sfoldall; S.fold={}; const y=scrollY; render(); scrollTo({top:y}); });
  m.querySelectorAll("[data-svmode]").forEach(b=>b.onclick=()=>{ S.vMode=b.dataset.svmode; render(); });
  m.querySelectorAll("[data-sva]").forEach(b=>b.onclick=()=>{ S.vi=+b.dataset.sva; S.vMode="verse"; S.sel=-1; render(); scrollTo({top:0}); });
  const pv=document.getElementById("sPrev"), nx=document.getElementById("sNext"); const RVb=S.R?spanVerses([[S.R.b,S.R.c1,S.R.c2]]):[];
  const chStart=vi=>{ const [b,c]=SD.V[vi]; return SD.ch.get(b+"-"+c)[0]; };
  if(pv) pv.onclick=()=>{ const k=RVb.indexOf(S.vi); if(S.vMode==="struct"){ const f=RVb.indexOf(chStart(S.vi)); if(f>0) S.vi=chStart(RVb[f-1]); } else if(k>0) S.vi=RVb[k-1]; S.sel=-1; render(); };
  if(nx) nx.onclick=()=>{ const k=RVb.indexOf(S.vi); if(S.vMode==="struct"){ const [b,c]=SD.V[S.vi]; const L=SD.ch.get(b+"-"+c); const f=RVb.indexOf(L[L.length-1]); if(f>=0&&f<RVb.length-1) S.vi=RVb[f+1]; } else if(k>=0&&k<RVb.length-1) S.vi=RVb[k+1]; S.sel=-1; render(); };
  const sb=document.getElementById("sB"), sc=document.getElementById("sC"), sv=document.getElementById("sV");
  if(sb) sb.onchange=()=>{ const b=+sb.value; S.vi=SD.book[b].a; S.sel=-1; render(); };
  if(sc) sc.onchange=()=>{ const L=SD.ch.get(SD.V[S.vi][0]+"-"+sc.value); if(L) S.vi=L[0]; S.sel=-1; render(); };
  if(sv) sv.onchange=()=>{ S.vi=+sv.value; S.sel=-1; render(); };
}
/* 검색·도구 결과에서 절 번호(vi)로 읽기 화면 이동: 책·장이 다르면 범위를 그 장으로 바꾸고, 그 절을 펼쳐 둔다 */
function gotoVerse(vi,wi){ const S=view.st, [b,c,v]=SD.V[vi]; const m=S.mode;
  /* 돌아갈 자리: 검색·도구 화면의 범위·조건·스크롤을 그대로 기억한다(검색 결과 S.qres 는 지우지 않으므로 복원됨) */
  const back={mode:m,R:S.R&&{...S.R},range:S.range,wide:S.wide,y:scrollY,label:m==="query"?"검색 결과":m==="word"?"낱말 검색":m==="tool"?"도구 결과":m==="compare"?"본문 비교":"전 화면"};
  if(!S.R||S.R.b!==b||c<S.R.c1||c>S.R.c2) setRange({b,c1:c,c2:c});
  S.vc=c; S.mode="verse"; S.rd="read"; S.rv=vi; S.rw=wi!=null&&SD.vOf[wi]===vi?wi:null; S.scrollV=v; S.sel=-1; S.back=back; render(); }
/* 통독 본문 → 원문 보기 */
function studyOpenVerse(b,c,v){ const S=view.st; view.tab="study";
  const go=()=>{ setRange({b,c1:c,c2:c}); S.mode="verse"; S.scrollV=v; const L=SD.ref.get(b+"-"+c+"-"+v); if(L&&S.rd==="read"){ S.rv=L[0]; S.rw=null; } if(view.tab==="study") render(); };
  if(SD){ go(); scrollTo({top:0}); } else { render(); scrollTo({top:0}); const pr=studyLoad(); if(pr) pr.then(go); } }

/* 구조 화면 머리: 세 출처(BHSA 원자료 / 앱 관찰 후보 / MILAL 판정)와 MILAL 자료 상태 */
function structHead(b){ const S=view.st, f=milalFile(b), st=f&&(S.milalOn?milalLoad(b):ML[b]);
  if(ux2()){ const bk=S.back?`<button class="mtog back" id="sBack">← ${esc(S.back.label||"전 화면")}으로 돌아가기</button> `:""; const ex=expertOn();
    if(!ex){ if(S.milalOn) S.milalOn=false; return `<div class="srcnote">${bk?`<span>${bk}</span>`:""}<span>문장의 짜임(BHSA)을 줄과 들여쓰기로, 이야기의 흐름(앱의 관찰 후보 — 판정 아님)을 색으로 보입니다. <button class="mtog" id="stGloss">색과 표지 ⓘ</button></span><span class="lead"><button class="mtog" id="stExpert">전문 보기 — 분석 코드·MILAL 관계망 ▸</button></span></div>`; }
    let m=""; if(!f) m=`<span>MILAL 판정: 이 책의 자료 없음</span>`; else if(!S.milalOn) m=`<button class="mtog" data-milal="1">MILAL 판정 겹쳐 보기 ▸</button>`; else if(!st||st.state==="loading") m=`<span>MILAL 판정 불러오는 중…</span>`; else if(st.state==="err") m=`<span>MILAL 자료를 읽지 않음: ${esc(st.msg)}</span> <button class="mtog" data-milal="0">끄기</button>`; else m=`<span>MILAL 판정 ${milalBadgeFile(st)} · ${esc(st.data.source.milal.stage)}${st.unmatched.length?` · 대조 실패 ${st.unmatched.length}절`:""}</span> <button class="mtog" data-milal="0">끄기</button>`;
    return `<div class="srcnote expert">${bk?`<span>${bk}</span>`:""}<span><b>전문 보기</b> · <b>선·층·종류</b> BHSA 원자료 · <b>색·표지</b> 앱의 관찰 후보(판정 아님) · ${m}</span><span class="lead">줄 오른쪽 이름표를 누르면 세 출처를 따로 봅니다. <button class="mtog" id="stGloss">용어 풀이 ⓘ</button> <button class="mtog" id="stExpertOff">전문 보기 끄기</button></span></div>`; }
  let m=""; if(!f) m=`<span>MILAL 판정: 이 책의 자료 없음</span>`;
  else if(!S.milalOn) m=`<button class="mtog" data-milal="1">MILAL 판정 겹쳐 보기 ▸</button>`;
  else if(!st||st.state==="loading") m=`<span>MILAL 판정 불러오는 중…</span>`;
  else if(st.state==="err") m=`<span>MILAL 자료를 읽지 않음: ${esc(st.msg)}</span> <button class="mtog" data-milal="0">끄기</button>`;
  else m=`<span>MILAL 판정 ${milalBadgeFile(st)} · ${esc(st.data.source.milal.stage)}${st.unmatched.length?` · 대조 실패 ${st.unmatched.length}절`:""}</span> <button class="mtog" data-milal="0">끄기</button>`;
  const bk=S.back?`<button class="mtog back" id="sBack">← ${esc(S.back.label||"전 화면")}으로 돌아가기</button> `:"";
  return `<div class="srcnote">${bk?`<span>${bk}</span>`:""}<span><b>선·층·종류</b> BHSA 원자료 · <b>색·표지</b> 앱의 관찰 후보(판정 아님) · ${m}</span><span class="lead">줄 오른쪽 이름표를 누르면 세 출처를 따로 봅니다. <button class="mtog" id="stGloss">용어 풀이 ⓘ</button></span></div>`; }
/* 구조 화면 용어 풀이: 색(앱 관찰 후보)과 줄 종류 코드(BHSA) — 초급 신학생이 코드만 보고 막히지 않게 */
const TY_HELP={Way0:"봐이크톨(그리고 ~했다)로 시작하는 절 — 이야기의 주된 줄기",WayX:"봐이크톨 뒤에 주어 등이 오는 절",WXQt:"'와'+다른 말+완료형 — 흐름을 멈추고 배경·대조를 넣는 절",xQtX:"앞에 다른 말+완료형+뒤에 다른 말",xQt0:"앞에 다른 말+완료형",XQtl:"주어 등 다른 말+완료형",ZQt0:"완료형으로 시작",ZQtX:"완료형으로 시작, 뒤에 다른 말",WQt0:"'와'+완료형(베카탈) — 지시·습관·미래의 연쇄",WQtX:"'와'+완료형+다른 말",WYq0:"'와'+미완료형",WYqX:"'와'+미완료형+다른 말",xYq0:"앞에 다른 말+미완료형",xYqX:"앞에 다른 말+미완료형+뒤에 다른 말",ZYq0:"미완료형으로 시작",ZYqX:"미완료형으로 시작, 뒤에 다른 말",NmCl:"명사문(동사 없음) — 상태·설명",AjCl:"형용사문",Ptcp:"분사문 — 진행·상태",InfC:"부정사 연계형(~하기 위해 등)",InfA:"부정사 절대형",Voct:"부름말(호격)",Ellp:"생략된 절",CPen:"앞세운 말(casus pendens)",MSyn:"이야기 표지(봐예히 등)",Reop:"다시 받는 말",XPos:"뒤로 뺀 말",ZIm0:"명령형",ZImX:"명령형+다른 말",xIm0:"앞에 다른 말+명령형",WIm0:"'와'+명령형",Defc:"불완전한 절",Unkn:"분류 안 됨"};
function openStructGlossary(b){ const S=view.st, c=S.vc; const codes=new Map(); if(SD.loaded.has(b)){ const a0=SD.bookA[b-1], a1=b<39?SD.bookA[b]:SD.can.length; for(let a=a0;a<a1;a++){ const w=atomFirstWord(a); if(w==null) continue; const v=SD.V[SD.vOf[w]]; if(v[1]!==c) continue; const t=SD.TY[SD.ay[a]]; codes.set(t,(codes.get(t)||0)+1); } }
  const rows=[...codes.entries()].sort((x,y)=>y[1]-x[1]).map(([t,n])=>`<dt><code>${esc(t)}</code> <small>${n}줄</small></dt><dd>${esc(TY_HELP[t]||(typeof TY_FAM==="function"?TY_FAM(t):"")||"")}</dd>`).join("");
  sheet("구조 화면 용어 풀이",`<div class="sdetail"><span class="label">색·표지 — 앱의 관찰 후보(자동 분류, 판정 아님)</span><dl class="rdl"><dt><i class="k-main mkdot" style="background:var(--accent)"></i> 이야기 줄기</dt><dd>봐이크톨 절(Way0·WayX). 사건이 이어지는 주된 흐름</dd><dt><i class="mkdot" style="background:#C46A2B"></i> 배경·멈춤</dt><dd>명사문·분사문·'와+다른 말+완료형' 등. 흐름을 멈추고 상태·배경·대조를 넣는 자리</dd><dt><i class="mkdot" style="background:#7A6BB0"></i> 이야기 표지</dt><dd>'그리고 ~일이 있었다(봐예히)', 때를 앞세운 문장 등 장면이 열리는 표지</dd><dt><i class="mkdot" style="background:#9AA5A0"></i> 인물의 말</dt><dd>BHSA가 따옴표 안(Q)으로 표시한 절. 겹친 인용은 '2단'처럼 표시</dd></dl>
    <span class="label">줄 종류 코드 — BHSA 원자료 (이 장에 나온 것)</span><p class="lead" style="margin:0 0 4px">코드 읽는 법: 앞의 W='와(그리고)', x/X='앞·뒤에 다른 말', Z='동사로 시작'; 가운데 Qt=완료형, Yq=미완료형, Im=명령형, Way=봐이크톨.</p><dl class="rdl">${rows||"<dd>자료를 아직 받지 못했습니다.</dd>"}</dl>
    <span class="label">세 출처</span><p class="lead"><b>BHSA 원자료</b>는 네덜란드 ETCBC가 만든 문법 자료, <b>앱의 관찰 후보</b>는 이 앱이 코드만 보고 칠한 색(판정 아님), <b>MILAL 판정</b>은 연구 도구 MILAL의 규칙·연구자 판정입니다. 셋을 섞지 않고 따로 보여 드립니다.</p></div>`); }
/* 장 구조 보기: ETCBC 절 원자(clause atom)를 들여쓰기(tab)대로 */
const MAINLINE=new Set(["Way0","WayX"]), BACKGR=new Set(["NmCl","AjCl","Ptcp","XQtl","WXQt","xQtX","xQt0","WxQ0","WxQX","ZQt0","ZQtX"]);
/* 이야기 표지 판정 (ETCBC 자료로): 봐예히/웨하야 + 때·키·베/케+부정사·곳, MSyn의 보라·이제 */
const lxk=w=>SD.L[SD.wl[w]][1], fnk=w=>SD.FN[SD.wf[w]];
function markerKind(W,NW,typ){
  const lx=W.map(lxk), fns=new Set(W.map(fnk));
  if(typ==="MSyn"&&lx.includes("HNH")) return "보라";
  if(typ==="MSyn"&&lx.includes("<TH")) return "이제";
  const k=lx[0]==="W"?1:0; if(!(W.length>k&&lx[k]==="HJH[")) return typ==="MSyn"?"표지":null;
  const vt=SD.M[SD.wm[W[k]]][2]; const fut=vt==="perf";  /* 웨하야 */
  if(!(vt==="wayq"||fut)) return null;
  if(fns.has("Subj")||fns.has("PreC")||fns.has("Cmpl")||fns.has("Modi")||fns.has("Objc")) return null;
  const nl=NW&&NW.length?lxk(NW[0]):"", ntyp=NW&&NW.length?SD.TY[SD.ay[SD.wa[NW[0]]]]:"";
  if(lx.slice(k+1).includes("KJ")||nl==="KJ") return fut?"앞일 · 키":"키";
  if(fns.has("Time")) return fut?"앞일 · 때":"때";
  if(ntyp==="InfC"&&(nl==="B"||nl==="K")) return fut?"앞일 · 때":"때";
  if(fns.has("Loca")) return "곳";
  return fut?"앞일":(typ==="MSyn"?"표지":null); }
function atomKind(typ,txt,mk){ const q=(txt.match(/Q/g)||[]).length, last=txt.slice(-1);
  if(mk) return ["msyn","표지 · "+mk];
  if(last==="Q"||(q&&!/N$/.test(txt))) return ["q","인물의 말"+(q>1?` ${q}단`:"")];
  if(MAINLINE.has(typ)) return ["main","이야기 줄기"];
  if(BACKGR.has(typ)) return ["bg","배경·멈춤"];
  return ["etc",TY_FAM(typ)||typ]; }
function structView(b,c,mini){
  const vis=SD.ch.get(b+"-"+c)||[]; const atoms=[], seen=new Map();
  for(const vi of vis){ const [, , , , ,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ const a=SD.wa[j]; if(!seen.has(a)){ seen.set(a,atoms.length); atoms.push({a,vi,w:[]}); } atoms[seen.get(a)].w.push(j); } }
  let h=`<div class="stlines">`;
  let lastVi=-1; const S=view.st; S.fold ||= {}; const MK=window.marksForWords?marksForWords(vis):null;
  /* 1) 줄마다 표지·종류 판정(전체 줄 기준) */
  let carry=null;
  const info=atoms.map((at,ai)=>{ const typ=SD.TY[SD.ay[at.a]], txt=SD.TXT[SD.ax[at.a]]||"";
    let mk=markerKind(at.w,atoms[ai+1]&&atoms[ai+1].w,typ);
    if(!mk&&carry&&(typ==="InfC"||lxk(at.w[0])==="KJ")) mk="↳ "+carry; carry=mk&&!mk.startsWith("↳")?mk:null;
    return {typ,txt,q:(txt.match(/Q/g)||[]).length,kl:atomKind(typ,txt,mk)}; });
  /* 2) 말 묶음: 이 줄 다음에 이 줄보다 인용 층(Q)이 깊은 줄이 이어지면, 그 줄들이 이 줄이 이끄는 말 */
  const blk=atoms.map((_,ai)=>{ let e=ai; while(e+1<atoms.length&&info[e+1].q>info[ai].q) e++; return e; });
  const allFold=S.foldAll;
  const visible=[]; for(let ai=0;ai<atoms.length;ai++){ visible.push(ai); const f=blk[ai]>ai&&(allFold?S.fold[atoms[ai].a]!==false:S.fold[atoms[ai].a]===true); if(f){ visible.push(-ai-1); ai=blk[ai]; } }
  const rows=visible.filter(x=>x>=0);
  /* 3) 보이는 줄 기준 계층선 */
  const D=rows.map(ai=>SD.at[atoms[ai].a]);
  const hasNextSib=(i,d)=>{ for(let k=i+1;k<D.length;k++){ if(D[k]<d) return false; if(D[k]===d) return true; } return false; };
  let ri=-1;
  for(const x of visible){
    if(x<0){ const ai=-x-1, n=blk[ai]-ai; h+=`<button class="stfold" data-sfold="${atoms[ai].a}" data-open="1">⋯ 이 줄이 이끄는 말 ${n}줄 접힘 · 펼치기</button>`; continue; }
    ri++; const ai=x, at=atoms[ai], tab=D[ri], {typ,kl:[k,lab]}=info[ai];
    /* 열 c(1=맨 오른쪽): 아래에 깊이 c인 줄이 다시 나오고 그 사이에 c보다 얕은 줄이 없으면 세로줄. 바로 아래 줄이 더 깊으면 그 열에 시작선 */
    const nd=ri+1<D.length?D[ri+1]:0, sc=nd>tab?Math.min(nd,16):0;
    let cells=""; const dd=Math.max(Math.min(tab,16),sc);
    for(let L=1;L<=dd;L++){ let cls; if(L<tab) cls=hasNextSib(ri,L)?"v":"e"; else if(L===tab) cls=hasNextSib(ri,tab)?"b":"l"; else cls=L===sc?"s":"e"; cells=`<i class="tc ${cls}"></i>`+cells; }
    const vfirst=at.vi!==lastVi; const vnum=at.vi!==lastVi?`<b class="stv">${SD.V[at.vi][2]===0?"표제":SD.V[at.vi][2]}</b>`:""; lastVi=at.vi;
    const words=at.w.map(j=>{ const vj=SD.vOf[j], tx=sHeb(vj)[j-SD.V[vj][5]], p=MK&&MK.get(j); return `<span class="sww${p&&p.ul?" mk-ul":""}" data-sw="${j}"${p&&p.hl?` style="background:${p.hl}"`:""}>${esc(tx)}</span>`; }).join("");
    const canFold=blk[ai]>ai, folded=visible.includes(-ai-1);
    const mon=S.milalOn&&ML[b]&&ML[b].state==="ok"; if(mon) h+=milalGroupHead(b,at.a);
    h+=`<div class="stl k-${k}"${vfirst?` id="stv-${at.vi}"`:""}><span class="heb">${words}</span><span class="tree">${cells}</span><button class="stmeta" data-sat="${at.a}" aria-label="절 원자 상세">${ux2()&&!expertOn()?"":`<small>${esc(typ)}</small>`}<i>${esc(lab)}</i>${mon?milalBadge(b,at.a):""}${window.annotDot?annotDot(at.a):""}</button><span class="stvn">${vnum}${canFold&&!folded?`<button class="stfb" data-sfold="${at.a}" aria-label="말 접기">접기</button>`:""}</span></div>`; }
  return h+`</div>`; }

function wordDetail(wi){ const vi=SD.vOf[wi], s=SD.V[vi][5], j=wi-s, H=sHeb(vi), HN=sHan(vi), li=SD.wl[wi], x=SD.L[li];
  return `<div class="sdh"><span class="heb">${esc(x[0])}</span><span><b>${esc(lexGloss(li))}</b><small>${esc(x[6])}${x[3]?` · 스트롱 H${x[3]}`:""}</small></span></div>
   <dl><dt>이 자리의 꼴</dt><dd><span class="heb">${esc(H[j].trim())}</span> ${esc(HN[j])} · ${esc(morphFull(SD.wm[wi]))}${SD.wg[wi]&4?" · 읽기 전통(케레)을 따름":""}</dd>
   <dt>문장 속 역할</dt><dd>${esc(FN_K[SD.FN[SD.wf[wi]]]||SD.FN[SD.wf[wi]]||"-")} · ${esc(DOM_K[SD.DO[SD.domW[wi]]]||"")}</dd>
   ${lexKo(li)?`<dt>사전 풀이</dt><dd>${esc(lexKo(li))}</dd>`:SD.LK?"":`<dt>사전 풀이</dt><dd>받는 중…</dd>`}<dt>영어 뜻(BHSA)</dt><dd>${esc(x[5])}</dd><dt>구약에 나오는 횟수</dt><dd>${x[7].toLocaleString()}번${x[8]?" · 아람어":""}</dd></dl>
   <div class="row"><button class="btn small" data-sfind="${li}">이 낱말이 나오는 곳</button></div>`; }
function openWordSheet(wi){ if(!SD.LK) lexKoLoad(); const vi=SD.vOf[wi]; sheet(sRef(vi)+" · 낱말",`<div class="sdetail sheetd">${wordDetail(wi)}</div>`);
  const root=document.getElementById("sheetRoot"), close=()=>{ root.innerHTML=""; }, S=view.st;
  root.querySelectorAll("[data-sfind]").forEach(b=>b.onclick=()=>{ close(); S.wide=true; S.mode="word"; S.lex=+b.dataset.sfind; S.dom=""; S.vs=""; S.vt=""; S.q=""; S.more=1; render(); scrollTo({top:0}); });
  root.querySelectorAll("[data-sva]").forEach(b=>b.onclick=()=>{ close(); S.vi=+b.dataset.sva; S.vMode="verse"; S.sel=wi; render(); scrollTo({top:0}); }); }

/* 성경연구로 들어갈 때 잠깐 보이는 전환 화면 (최소 1.2초, 자료를 받는 동안은 더) */
function studyIntro(){
  const old=document.getElementById("sIntro"); if(old) old.remove();
  const quick=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el=document.createElement("div"); el.id="sIntro"; el.setAttribute("role","status");
  el.innerHTML=`<div class="si-in"><div class="si-heb" lang="he" dir="rtl">בְּרֵאשִׁית</div><div class="si-t">${esc(window.APP_NAME||"MILAL")}</div><div class="si-s">BIBLIA HEBRAICA · BHSA</div><div class="si-bar"><i></i></div><div class="si-m">원문을 펼치는 중</div></div>`;
  document.body.appendChild(el);
  const min=quick?350:1200, t0=Date.now();
  let done=false; const close=()=>{ if(done) return; done=true; el.classList.add("out"); setTimeout(()=>el.remove(),320); };
  const p=studyLoad()||Promise.resolve();
  const capped=Promise.race([p,new Promise(r=>setTimeout(r,6000))]);
  capped.then(()=>{ const m=el.querySelector(".si-m"); if(m) m.textContent=SD?"준비됐습니다":"자료를 받는 중입니다";
    setTimeout(close,Math.max(0,min-(Date.now()-t0))); }).catch(()=>setTimeout(close,min));
  el.onclick=()=>{ if(Date.now()-t0>400) close(); };
}

/* ===== 원문 읽기: 번역 절 + 히브리어 절, 절을 누르면 낱말 띠 ===== */
let STR=null, STRload=null;
function strongLoad(){ if(STR||STRload) return STRload; STRload=fetch("study/strong.json?v="+STUDY_V).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(j=>{ STR=j; }).catch(()=>{ STRload=null; STR={}; }); return STRload; }
const RD_KEY="milal-study-vm";
function rdMode(){ const S=view.st; if(!S.rd){ try{ S.rd=localStorage.getItem(RD_KEY)==="struct"?"struct":"read"; }catch(e){ S.rd="read"; } } return S.rd; }
const MAIN_SP=new Set(["verb","subs","nmpr","adjv","advb","prps","prde","prin","intj","nega","inrg"]);
function vGroups(vi){ const s=SD.V[vi][5], n=SD.V[vi][6], H=sHeb(vi), G=[]; let cur=[];
  for(let j=0;j<n;j++){ cur.push(s+j); if(/[\s־]$/.test(H[j])||j===n-1){ G.push(cur); cur=[]; } } return G; }
function gMain(g){ for(let k=g.length-1;k>=0;k--) if(MAIN_SP.has(SD.L[SD.wl[g[k]]][2])) return g[k]; return g[g.length-1]; }
const wHeb=wi=>{ const vi=SD.vOf[wi]; return sHeb(vi)[wi-SD.V[vi][5]]; }, wHan=wi=>{ const vi=SD.vOf[wi]; return sHan(vi)[wi-SD.V[vi][5]]||""; };
const stTrName=()=>{ try{ return (TR_INFO[window.BIBLE_SRC||TR]||TR_INFO.krv).name; }catch(e){ return ""; } };
function readView(b,c){ const S=view.st, vis=SD.ch.get(b+"-"+c)||[]; const hid=window.marksHidden&&marksHidden();
  let h=`${S.back&&S.back.mode?`<div class="srcnote"><span><button class="mtog back" id="sBack">← ${esc(S.back.label||"전 화면")}${/[가-힣]$/.test(S.back.label||"")&&((S.back.label.charCodeAt(S.back.label.length-1)-0xAC00)%28===0||(S.back.label.charCodeAt(S.back.label.length-1)-0xAC00)%28===8)?"로":"으로"} 돌아가기</button></span></div>`:""}<div class="rdtools"><span class="rdnote${ux2()?" full":""}" style="margin:0;flex:1;text-align:left">${S.rangeMode?(S.rangeStart!=null?`구간: <b>${esc(sRef(S.rangeStart))}</b>부터 — 끝 절을 누르세요`:"구간: <b>시작 절</b>을 누르세요"):(ux2()?"글자를 길게 눌러 끌어 고르세요 — 형광펜·밑줄·메모":"절을 누르면 낱말이 펼쳐집니다")}</span><button class="mtog${S.rangeMode?" on":""}" data-rangemode="${S.rangeMode?"0":"1"}">${S.rangeMode?"구간 취소":"구간 메모"}</button><button class="mtog" data-markshide="1">${hid?"표시 보이기":"표시 숨기기"}</button>${ux2()?sfzHTML():""}</div><div class="rdv">`, lastK="";
  for(const vi of vis){ const kv=SD.V[vi][2], k=SD.V[vi][1]+":"+kv, first=k!==lastK; lastK=k;
    let kt=""; if(first&&kv>0){ try{ kt=BIBLE[b-1][c-1][kv-1]||""; }catch(e){} }
    const open=S.rv===vi, num=kv===0?"표제":kv, per=window.marksForVerse?marksForVerse(vi):null, rs=S.rangeMode&&S.rangeStart===vi;
    h+=`<div class="rdvs${open?" on":""}${rs?" rsel":""}" data-rdv="${vi}" id="stv-${vi}">${window.rangeChips?rangeChips(vi):""}${kt?`<p class="rdk"><b>${num}</b><span class="kt" data-kv="${vi}">${window.korMarked?korMarked(vi,kt):esc(kt)}</span></p>`:""}<p class="rdh" lang="he" dir="rtl"><b>${num}</b>${ux2()?hebSelectable(vi,per):per?hebMarked(vi,per):esc(sHeb(vi).join("").trim())}</p>${ux2()?`<button class="vinfo${open?" on":""}" data-vinfo="${vi}" aria-label="원어·문법 보기">${open?"원어 닫기 ▴":"원어 ▾"}</button>`:""}</div>`;
    if(open&&!S.rangeMode) h+=stripHTML(vi); }
  return h+`</div>`; }
function stripHTML(vi){ const S=view.st, G=vGroups(vi); if(S.rw==null||SD.vOf[S.rw]!==vi) S.rw=gMain(G[0]);
  const gi=G.findIndex(g=>g.includes(S.rw)), sel=S.mkSel&&S.mkSel.vi===vi?S.mkSel.set:null;
  const bar=sel?`<div class="mkbar"><span>${S.mkSel.preset?({hl:"형광펜",ul:"밑줄",br:"괄호"})[S.mkSel.preset]+": ":""}고른 묶음 ${sel.size}개 — 띠에서 더 고르거나</span><button class="btn small" id="mkAll">절 전체</button><button class="btn small" id="mkGo"${sel.size?"":" disabled"}>표시하기</button><button class="btn small ghost" id="mkCancel">취소</button></div>`:"";
  return `<div class="rstripw">${bar}<div class="rstrip${sel?" mksel":""}" dir="rtl">${G.map((g,k)=>{ const m=gMain(g); return `<button class="rsw${!sel&&k===gi?" on":""}${sel&&sel.has(k)?" sel":""}" data-rsw="${m}" data-rg="${k}"><span class="heb">${esc(g.map(wHeb).join("").trim())}</span><b>${esc(lexGloss(SD.wl[m]))}</b><small>${esc(g.map(wHan).join(""))}</small></button>`; }).join("")}</div>${sel?"":`<div class="rdet" id="rDet">${readDetail(S.rw)}</div>`}${ux2()&&!sel?`<button class="vinfo vclose" data-vinfo="${vi}">원어 닫기 ▴</button>`:""}</div>`; }
function strongText(t){ return esc(t).replace(/H(\d+)/g,(m,n)=>`<button class="shl" data-sh="${n}">H${n}</button>`); }
function strongBlock(n){ if(!n) return ""; if(!STR){ strongLoad().then(()=>{ const d=document.getElementById("rDet"); if(d&&view.st.rw!=null){ d.innerHTML=readDetail(view.st.rw); bindReadDet(d); } }); return `<p class="lead">스트롱 사전을 불러오는 중입니다…</p>`; }
  const e=STR[n]; if(!e) return ""; const [,s,m,u]=e;
  return `${s?`<dt>유래</dt><dd>${strongText(s)}</dd>`:""}${m?`<dt>단어 정의</dt><dd>${strongText(m)}</dd>`:""}${u?`<dt>KJV에서 옮긴 말 <small class="rdx">× 는 다른 말과 묶여 그렇게 옮겨진 경우</small></dt><dd>${strongText(u)}</dd>`:""}`; }
function readDetail(wi){ const vi=SD.vOf[wi], li=SD.wl[wi], x=SD.L[li], G=vGroups(vi), g=G.find(g=>g.includes(wi))||[wi];
  const parts=g.length>1?`<div class="rparts">${g.map(j=>`<button class="rpt${j===wi?" on":""}" data-rpt="${j}"><span class="heb">${esc(wHeb(j).trim())}</span>${esc(lexGloss(SD.wl[j]))}</button>`).join("")}</div>`:"";
  return `${parts}<div class="rdh2"><span class="heb">${esc(x[0])}</span><span class="rdp">${esc(x[6])}${x[3]?`<i>(${x[3]})</i>`:""}</span><b>${esc(lexGloss(li))}</b></div>
   <dl class="rdl"><dt>문법 분해</dt><dd><span class="heb">${esc(wHeb(wi).trim())}</span> ${esc(wHan(wi))} · ${esc(morphFull(SD.wm[wi]))}${SD.wg[wi]&4?" · 읽기 전통(케레)을 따름":""}</dd>
   <dt>품사</dt><dd>${esc(SP_K[x[2]]||x[2])}${x[8]?" · 아람어":""}</dd>
   <dt>문장 속 역할</dt><dd>${esc(FN_K[SD.FN[SD.wf[wi]]]||SD.FN[SD.wf[wi]]||"-")} · ${esc(DOM_K[SD.DO[SD.domW[wi]]]||"")}</dd>
   ${strongBlock(x[3])}
   ${lexKo(li)?`<dt>한글 사전 풀이</dt><dd>${esc(lexKo(li))}</dd>`:SD.LK?"":`<dt>한글 사전 풀이</dt><dd>받는 중…</dd>`}<dt>구약에 나오는 횟수</dt><dd>${x[7].toLocaleString()}번</dd></dl>
   <div class="rbtns"><button class="btn small ghost" data-sfindw="${li}">이 원어로 검색</button>${ux2()?"":`<button class="btn small ghost" data-mkstart="${vi}">표시(형광펜·괄호)</button>`}<button class="btn small" data-rnote="${wi}">낱말 메모</button></div>
   ${window.annotListHTML?annotListHTML("verse","v:"+SD.V[vi][0]+"-"+SD.V[vi][1]+"-"+SD.V[vi][2],vi):""}`; }
function bindReadDet(d){ const S=view.st;
  d.querySelectorAll("[data-rpt]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); S.rw=+b.dataset.rpt; d.innerHTML=readDetail(S.rw); bindReadDet(d); });
  d.querySelectorAll("[data-sh]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); openStrongSheet(+b.dataset.sh); });
  d.querySelectorAll("[data-sfindw]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); S.wide=true; S.mode="word"; S.lex=+b.dataset.sfindw; S.dom=""; S.vs=""; S.vt=""; S.q=""; S.more=1; render(); scrollTo({top:0}); });
  d.querySelectorAll("[data-rnote]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); openNoteSheet(+b.dataset.rnote); });
  if(window.bindAnnots) bindAnnots(d);
  d.querySelectorAll("[data-mkstart]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const vi=+b.dataset.mkstart, G=vGroups(vi), gi=G.findIndex(g=>g.includes(S.rw)); S.mkSel={vi,set:new Set(gi>=0?[gi]:[])}; const y=scrollY; render(); scrollTo({top:y}); }); }
function bindRead(m){ const S=view.st;
  m.querySelectorAll("[data-rangemode]").forEach(b=>b.onclick=()=>{ S.rangeMode=b.dataset.rangemode==="1"; S.rangeStart=null; S.mkSel=null; render(); });
  m.querySelectorAll("[data-markshide]").forEach(b=>b.onclick=()=>marksToggle());
  m.querySelectorAll("[data-anedit]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const a=anList().find(x=>x.id===b.dataset.anedit); if(a) openAnnotEditor(a.kind,null,a); });
  m.querySelectorAll("[data-mkid]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); if(x.dataset.mkid) openMarkChoose(x.dataset.mkid.split(",").filter(Boolean)); });
  if(S.mkSel){ const vi=S.mkSel.vi, G=vGroups(vi); m.querySelectorAll(".rstrip.mksel .rsw").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const k=+b.dataset.rg; if(S.mkSel.set.has(k)) S.mkSel.set.delete(k); else S.mkSel.set.add(k); const y=scrollY; render(); scrollTo({top:y}); });
    const all=document.getElementById("mkAll"); if(all) all.onclick=e=>{ e.stopPropagation(); S.mkSel.set=new Set(G.map((_,k)=>k)); const y=scrollY; render(); scrollTo({top:y}); };
    const go=document.getElementById("mkGo"); if(go) go.onclick=e=>{ e.stopPropagation(); const words=[...S.mkSel.set].sort((a,b)=>a-b).flatMap(k=>G[k]); openMarkPicker(words,S.mkSel.preset?({hl:"형광펜",ul:"밑줄",br:"괄호"})[S.mkSel.preset]:`낱말 묶음 ${S.mkSel.set.size}개`,S.mkSel.preset); };
    const cn=document.getElementById("mkCancel"); if(cn) cn.onclick=e=>{ e.stopPropagation(); S.mkSel=null; const y=scrollY; render(); scrollTo({top:y}); }; }
  m.querySelectorAll("[data-vinfo]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const vi=+b.dataset.vinfo; const y=scrollY; const closing=S.rv===vi; S.rv=closing?-1:vi; S.rw=null; S.mkSel=null; render(); scrollTo({top:y});
    if(closing){ const el=document.getElementById("stv-"+vi); if(el){ const r=el.getBoundingClientRect(); if(r.top<0||r.top>innerHeight*0.6) el.scrollIntoView({block:"center"}); } } });   /* 아래 '원어 닫기'로 닫으면 그 절로 돌아온다 */
  if(ux2()) selPopBind(m);
  m.querySelectorAll("[data-rdv]").forEach(el=>el.onclick=()=>{ const vi=+el.dataset.rdv; if(S.rangeMode){ rangePick(vi); return; } if(ux2()) return;   /* 시안: 절 누름은 글자 고르기를 방해하지 않게 아무것도 안 함 */ if(S.mkSel&&S.mkSel.vi!==vi) S.mkSel=null; const top0=el.getBoundingClientRect().top; S.rv=S.rv===vi?-1:vi; S.rw=null; S.rinfo=false; const y=scrollY; render(); scrollTo({top:y});
    /* 누른 절이 화면에서 같은 자리에 머물게: 위쪽 띠가 닫히며 줄어든 만큼 되돌림 */
    const ne=document.getElementById("stv-"+vi); if(ne){ scrollBy(0,ne.getBoundingClientRect().top-top0);
      const hd=document.querySelector(".shead2"), hb=hd?hd.getBoundingClientRect().bottom:0, sw=document.querySelector(".rstripw");
      if(S.rv===vi&&sw&&sw.getBoundingClientRect().top>innerHeight*0.62) scrollBy(0,ne.getBoundingClientRect().top-hb-8); }
    const st=document.querySelector(".rstrip .rsw.on"); if(st){ const r=st.parentNode; r.scrollLeft=0; } if(S.rv>=0) strongLoad(); });
  if(!S.mkSel) m.querySelectorAll("[data-rsw]").forEach(b=>b.onclick=()=>{ S.rw=+b.dataset.rsw; b.parentNode.querySelectorAll(".rsw").forEach(x=>x.classList.toggle("on",x===b)); const d=document.getElementById("rDet"); if(!d) return; d.innerHTML=readDetail(S.rw); bindReadDet(d); });
  const d=document.getElementById("rDet"); if(d) bindReadDet(d); }
function openStrongSheet(n){ const go=()=>{ const e=STR&&STR[n]; const lis=(SD.L.map((x,i)=>[x,i]).filter(([x])=>x[3]===n).sort((a,b)=>b[0][7]-a[0][7])); const li=lis.length?lis[0][1]:-1;
    sheet(`스트롱 H${n}`,e?`<div class="sdetail sheetd"><div class="rdh2"><span class="heb">${esc(e[0])}</span>${li>=0?`<span class="rdp">${esc(SD.L[li][6])}</span><b>${esc(lexGloss(li))}</b>`:""}</div><dl class="rdl">${e[1]?`<dt>유래</dt><dd>${strongText(e[1])}</dd>`:""}${e[2]?`<dt>단어 정의</dt><dd>${strongText(e[2])}</dd>`:""}${e[3]?`<dt>KJV에서 옮긴 말 <small class="rdx">× 는 다른 말과 묶여 그렇게 옮겨진 경우</small></dt><dd>${strongText(e[3])}</dd>`:""}${li>=0?`<dt>구약에 나오는 횟수</dt><dd>${SD.L[li][7].toLocaleString()}번</dd>`:""}</dl>${li>=0?`<div class="rbtns"><button class="btn small ghost" data-sfindw="${li}">이 원어로 검색</button></div>`:""}</div>`:`<p class="lead">이 번호의 풀이가 없습니다.</p>`);
    const root=document.getElementById("sheetRoot"); root.querySelectorAll("[data-sh]").forEach(b=>b.onclick=()=>openStrongSheet(+b.dataset.sh));
    root.querySelectorAll("[data-sfindw]").forEach(b=>b.onclick=()=>{ root.innerHTML=""; const S=view.st; S.wide=true; S.mode="word"; S.lex=+b.dataset.sfindw; S.dom=""; S.vs=""; S.vt=""; S.q=""; S.more=1; render(); scrollTo({top:0}); }); };
  if(STR) go(); else strongLoad().then(go); }
/* 원어 메모: 이 기기에 저장 */
const SN_KEY="milal-study-notes";
function studyNotes(){ try{ return JSON.parse(localStorage.getItem(SN_KEY)||"[]")||[]; }catch(e){ return []; } }
function saveStudyNotes(L){ try{ localStorage.setItem(SN_KEY,JSON.stringify(L)); }catch(e){} if(window.onNotesSaved) try{ onNotesSaved(L); }catch(e){} }
function openNoteSheet(wi){ const vi=SD.vOf[wi], [b,c,v]=SD.V[vi], li=SD.wl[wi], x=SD.L[li];
  sheet("원어 메모",`<div class="rdh2"><span class="heb">${esc(wHeb(wi).trim())}</span><span class="rdp">${esc(wHan(wi))}</span><b>${esc(lexGloss(li))}</b></div><p class="lead" style="margin:4px 0 8px">${esc(sRef(vi))}${x[3]?` · H${x[3]}`:""}</p><textarea id="rnMemo" rows="4" placeholder="이 낱말에서 본 것을 짧게 적어 두세요 (비워 두어도 됩니다)" style="width:100%"></textarea><button class="sbtn" id="rnSave">메모 저장</button><p class="lead" style="margin-top:6px">${window.noteStoreHint?esc(noteStoreHint()):"원어 메모는 이 기기에만 저장됩니다."}</p>`);
  const root=document.getElementById("sheetRoot");
  root.querySelector("#rnSave").onclick=()=>{ const L=studyNotes(); L.unshift({t:Date.now(),b,c,v,heb:wHeb(wi).trim(),lex:x[0],han:wHan(wi),gl:lexGloss(li),st:x[3]||0,m:root.querySelector("#rnMemo").value.trim()}); saveStudyNotes(L.slice(0,500)); root.innerHTML=""; toast("원어 메모에 넣었습니다."); }; }
function notesPage(){ const S=view.st, L=studyNotes(); const show=view.snAll?L:L.slice(0,30); S.nseg ||= "mine";
  if(S.nseg==="annots") S.nseg="mine";
  let h=`<div class="seg smode rseg" role="tablist">${[["mine","내 기록"],["shared","나눔"]].map(([k,n])=>`<button role="tab" aria-checked="${S.nseg===k}" data-nseg="${k}">${n}</button>`).join("")}</div>`;
  if(S.nseg==="shared") return h+sharedPage();
  if(window.recordsPage) return h+recordsPage();
  h+=`<section class="sec"><span class="label">원어 메모 · ${L.length}</span>`;
  h+=L.length?`<div class="snlist">${show.map(n=>`<div class="snitem"><button class="snjump" data-snj="${n.b}-${n.c}-${n.v}"><span class="heb">${esc(n.heb)}</span><b>${esc(n.gl)}</b><small>${esc(PLAN.abbr[n.b-1])} ${n.c}:${n.v===0?"표제":n.v}${n.st?` · H${n.st}`:""}</small>${n.m?`<span class="snm">${esc(n.m)}</span>`:""}</button>${window.MILAL_SHARE?`<button class="snshare" data-snsh="${n.t}" aria-label="나누기" title="나눔에 올리기">↗</button>`:""}<button class="sndel" data-snd="${n.t}" aria-label="지우기">✕</button></div>`).join("")}</div>${L.length>30?`<button class="morebtn" id="snAll">${view.snAll?"접기 ▴":`${L.length-30}개 더 보기 ▾`}</button>`:""}`
    :`<p class="lead">아직 메모가 없습니다. 본문 화면에서 절을 누르고 낱말을 고른 뒤 '메모 남기기'를 누르세요.</p>`;
  h+=`<p class="lead" style="margin-top:8px">${esc(window.noteStoreHint?noteStoreHint():"")}</p></section>`;
  h+=`<section class="sec"><span class="label">다음에 들어올 것</span><p class="lead">절·절 원자·구간 메모, 본문 하이라이트와 괄호, 관찰과 해석을 나눈 연구 노트, PDF·Markdown 내보내기. 지금은 낱말 메모만 됩니다.</p></section>`;
  return h; }
/* 나눔: 다른 이들이 올린 원어 메모 */
let SHL=null, SHerr="", SHadmin=false;
function sharedPage(){ const A=window.MILAL_AUTH;
  if(!window.MILAL_SHARE){ if(window.loadFirebase) loadFirebase().then(()=>{ if(view.st.mode==="notes") render(); }); return `<section class="sec"><p class="lead">${window.FIREBASE_CONFIG?"서버에 연결하는 중…":"나눔은 서버 연결이 있어야 합니다."}</p></section>`; }
  if(!SHL&&!SHerr){ MILAL_SHARE.isAdmin().then(ad=>{ SHadmin=!!ad; return MILAL_SHARE.list(SHadmin); }).then(L=>{ SHL=L; if(view.st.mode==="notes") render(); }).catch(e=>{ SHerr=e.code||e.message||"불러오지 못했습니다"; if(view.st.mode==="notes") render(); }); return `<section class="sec"><p class="lead">나눔 목록을 불러오는 중…</p></section>`; }
  const vis=SHL?SHL.filter(n=>!n.hidden||SHadmin):[];
  let h=`<section class="sec"><span class="label">나눔 · ${vis.length}</span><p class="lead">다른 이들이 '내 기록'에서 ↗로 올린 원어 메모입니다. <b>로그인 없이 누구나 볼 수 있는 공개 글</b>입니다. 누르면 그 절로 갑니다.${A.user?"":" 올리려면 로그인하세요."}${SHadmin?" · 관리자로 보는 중(숨긴 글 포함)":""}</p>`;
  if(SHerr) h+=`<p class="lead">${/permission/i.test(SHerr)?"아직 서버 쪽 문이 열리지 않았습니다. 관리자가 Firestore 규칙에 나눔(shared)을 추가하면 보입니다.":esc(SHerr)}</p>`;
  else if(!vis.length) h+=`<p class="lead">아직 올라온 메모가 없습니다. 첫 번째가 되어 보세요.</p>`;
  else h+=`<div class="snlist">${vis.map(n=>`<div class="snitem${n.hidden?" hiddenpost":""}"><button class="snjump" data-snj="${n.b}-${n.c}-${n.v}"><span class="heb">${esc(n.heb)}</span><b>${esc(n.gl)}</b><small>${esc(PLAN.abbr[n.b-1]||"")} ${n.c}:${n.v===0?"표제":n.v}${n.st?` · H${n.st}`:""} · ${esc(n.name||"익명")} · ${new Date(n.t).toLocaleDateString("ko-KR")}${n.hidden?" · 숨김":""}</small>${n.m?`<span class="snm">${esc(n.m)}</span>`:""}</button>${A.user&&A.user.uid===n.uid?`<button class="sndel" data-shdel="${n.id}" aria-label="내리기">✕</button>`:A.user?`<button class="sndel" data-shrep="${n.id}" aria-label="신고" title="신고">⚑</button>`:""}${SHadmin?`<button class="sndel" data-shhide="${n.id}" data-h="${n.hidden?"0":"1"}" aria-label="숨기기">${n.hidden?"보이기":"숨기기"}</button>`:""}</div>`).join("")}</div>`;
  return h+`<button class="morebtn" id="shReload">다시 불러오기</button></section>`; }
function studyNotesSection(){ if(!STUDY_ON()) return ""; const L=studyNotes(); if(!L.length) return "";
  const show=view.snAll?L:L.slice(0,5);
  return `<section class="sec"><span class="label">원어 메모 · ${L.length}</span><div class="snlist">${show.map((n,i)=>`<div class="snitem"><button class="snjump" data-snj="${n.b}-${n.c}-${n.v}"><span class="heb">${esc(n.heb)}</span><b>${esc(n.gl)}</b><small>${esc(PLAN.abbr[n.b-1])} ${n.c}:${n.v===0?"표제":n.v}${n.st?` · H${n.st}`:""}</small>${n.m?`<span class="snm">${esc(n.m)}</span>`:""}</button><button class="sndel" data-snd="${n.t}" aria-label="지우기">✕</button></div>`).join("")}</div>${L.length>5?`<button class="morebtn" id="snAll">${view.snAll?"접기 ▴":`${L.length-5}개 더 보기 ▾`}</button>`:""}</section>`; }
function bindStudyNotes(){ document.querySelectorAll("[data-snj]").forEach(b=>b.onclick=()=>{ const [bb,c,v]=b.dataset.snj.split("-").map(Number); view.st.rd="read"; studyOpenVerse(bb,c,v); });
  document.querySelectorAll("[data-snd]").forEach(b=>b.onclick=()=>{ const t=+b.dataset.snd; saveStudyNotes(studyNotes().filter(n=>n.t!==t)); const y=scrollY; render(); scrollTo({top:y}); });
  const a=document.getElementById("snAll"); if(a) a.onclick=()=>{ view.snAll=!view.snAll; const y=scrollY; render(); scrollTo({top:y}); };
  document.querySelectorAll("[data-nseg]").forEach(b=>b.onclick=()=>{ view.st.nseg=b.dataset.nseg; render(); });
  document.querySelectorAll("[data-snsh]").forEach(b=>b.onclick=()=>{ const n=studyNotes().find(x=>x.t===+b.dataset.snsh); if(!n) return; const A=window.MILAL_AUTH; if(!A.user){ toast("나누려면 먼저 로그인하세요 (오른쪽 위 ☰)."); return; }
    sheet("나눔에 올리기",`<div class="rdh2"><span class="heb">${esc(n.heb)}</span><b>${esc(n.gl)}</b></div><p class="lead">${esc(PLAN.abbr[n.b-1])} ${n.c}:${n.v}${n.m?` · ${esc(n.m)}`:""}</p><p><b>공개 범위</b>: 이 메모는 로그인한 이름(${esc(A.user.displayName||"")})과 함께, <b>로그인하지 않은 사람을 포함해 누구나</b> 볼 수 있습니다. 사진은 올라가지 않습니다. 내린 뒤에는 보이지 않지만, 이미 본 사람의 화면에서 지울 수는 없습니다. 올릴까요?</p><button class="sbtn" id="shGo">올리기</button>`);
    document.getElementById("shGo").onclick=()=>{ MILAL_SHARE.add(n).then(()=>{ document.getElementById("sheetRoot").innerHTML=""; SHL=null; toast("나눔에 올렸습니다."); }).catch(e=>toast("올리지 못했습니다: "+(e.code||e.message))); }; });
  document.querySelectorAll("[data-shdel]").forEach(b=>b.onclick=()=>{ MILAL_SHARE.remove(b.dataset.shdel).then(()=>{ SHL=null; render(); toast("내렸습니다."); }).catch(e=>toast("내리지 못했습니다: "+(e.code||e.message))); });
  document.querySelectorAll("[data-shrep]").forEach(b=>b.onclick=()=>{ const id=b.dataset.shrep; sheet("이 글 신고",`<p class="lead">부적절한 글을 관리자에게 알립니다. 신고 내용은 관리자만 봅니다.</p><textarea id="repWhy" rows="3" placeholder="이유 (300자 이내)" style="width:100%"></textarea><button class="sbtn" id="repGo">신고하기</button>`); document.getElementById("repGo").onclick=()=>{ MILAL_SHARE.report(id,document.getElementById("repWhy").value.trim()).then(()=>{ document.getElementById("sheetRoot").innerHTML=""; toast("신고했습니다. 관리자가 확인합니다."); }).catch(e=>toast("신고하지 못했습니다: "+(e.code||e.message))); }; });
  document.querySelectorAll("[data-shhide]").forEach(b=>b.onclick=()=>{ MILAL_SHARE.hide(b.dataset.shhide,b.dataset.h==="1").then(()=>{ SHL=null; render(); }).catch(e=>toast("바꾸지 못했습니다: "+(e.code||e.message))); });
  const rl=document.getElementById("shReload"); if(rl) rl.onclick=()=>{ SHL=null; SHerr=""; render(); }; }

/* 성경연구 글씨 크기 (0.8~1.5배, 이 기기에 저장) */
function sFs(){ try{ const v=+localStorage.getItem("milal-study-fs"); return v>=0.8&&v<=1.5?v:1; }catch(e){ return 1; } }
function applySfs(){ document.documentElement.style.setProperty("--sfs",sFs()); }
applySfs();
