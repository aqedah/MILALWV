/* ===== 성경연구 · 검색식 (Text-Fabric 검색식의 핵심 부분을 앱 안에서 실행) ===== */
const QT_ORDER=["book","chapter","verse","sentence","clause","phrase","word"];
const QT_K={book:"책",chapter:"장",verse:"절",sentence:"문장",clause:"절(클로즈)",phrase:"구",word:"낱말"};
const QOPS=new Set(["=","#","<",">","<:",":>","=:",":=","::","==","&&","##","[[","]]"]);
const QOP_K={"":"어디든","<":"뒤 어딘가","<:":"바로 뒤에 붙어서","=:":"맨 앞에서",":=":"맨 끝에서"};
const PTY_K={VP:"동사구",NP:"명사구",PP:"전치사구",CP:"접속사구",AdvP:"부사구",AdjP:"형용사구",InjP:"감탄사구",DPrP:"지시대명사구",PrNP:"고유명사구",NegP:"부정구",PPrP:"인칭대명사구",IPrP:"의문대명사구",InrP:"의문사구"};
const TY_FAM=c=>/Way/.test(c)?"와이크톨":/Q/.test(c)?"완료":/Y/.test(c)?"미완료":/I/.test(c)&&/m|0|X|I/.test(c)&&!/Inf/.test(c)?"명령":({NmCl:"명사문",AjCl:"형용사문",Ptcp:"분사문",InfC:"부정사 연계형",InfA:"부정사 절대형",Ellp:"생략",Voct:"부름",CPen:"앞세운 말",MSyn:"이야기 표지",Reop:"다시 받음",XPos:"뒤로 뺀 말"})[c]||"";
const TY_LEAD=c=>/^W/.test(c)?"와(그리고)+":/^[xX]/.test(c)?"앞에 다른 말+":/^Z/.test(c)?"":"";
const tyLabel=c=>`${c} · ${TY_LEAD(c)}${TY_FAM(c)}`;
const hebNorm=s=>(s||"").replace(/[֑-ׇ]/g,"").replace(/[12]/g,"").replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ");
const WFEAT={lex:1,lex_utf8:1,voc_lex_utf8:1,gloss:1,sp:1,vs:1,vt:1,ps:1,gn:1,nu:1,st:1,prs_ps:1,prs_gn:1,prs_nu:1,language:1};
const QFEAT={book:{book:1},chapter:{book:1,chapter:1},verse:{book:1,chapter:1,verse:1},sentence:{},clause:{typ:1,domain:1},phrase:{typ:1,function:1},word:WFEAT};
/* 단위 색인: 단위마다 낱말 목록(CSR) */
function qIndex(){ if(SD.qi) return SD.qi; const N=SD.wl.length, U={word:null,phrase:SD.wp,clause:SD.wc,sentence:SD.ws,verse:SD.vOf};
  const ch=new Uint32Array(N), bk=new Uint32Array(N); const chKey=new Map(), chInfo=[];
  SD.V.forEach(([b,,,c],vi)=>{ const k=b*1000+c; if(!chKey.has(k)){ chKey.set(k,chInfo.length); chInfo.push([b,c]); } const id=chKey.get(k), [, , , , , s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ ch[j]=id; bk[j]=b-1; } });
  U.chapter=ch; U.book=bk;
  const C={}; for(const T of ["phrase","clause","sentence","verse","chapter","book"]){ const A=U[T]; let mx=0; for(let i=0;i<N;i++) if(A[i]>mx) mx=A[i]; const cnt=new Uint32Array(mx+2); for(let i=0;i<N;i++) cnt[A[i]+1]++; for(let i=1;i<cnt.length;i++) cnt[i]+=cnt[i-1]; const off=cnt.slice(), W=new Uint32Array(N); for(let i=0;i<N;i++) W[off[A[i]]++]=i; C[T]={st:cnt,W,n:mx+1}; }
  return SD.qi={U,C,chInfo}; }
const qWords=(T,id)=>{ if(T==="word") return [id]; const c=SD.qi.C[T]; return c.W.subarray(c.st[id],c.st[id+1]); };
const qFirst=(T,id)=>T==="word"?id:SD.qi.C[T].W[SD.qi.C[T].st[id]];
const qLast=(T,id)=>T==="word"?id:SD.qi.C[T].W[SD.qi.C[T].st[id+1]-1];
function qFv(T,id,f){ const w0=qFirst(T,id);
  if(T==="word"){ const x=SD.L[SD.wl[id]], m=SD.M[SD.wm[id]];
    switch(f){ case "lex": return x[1]; case "lex_utf8": return hebNorm(x[10]); case "voc_lex_utf8": return x[0]; case "gloss": return x[5]; case "language": return x[8]?"Aramaic":"Hebrew";
      case "sp": return m[0]; case "vs": return m[1]; case "vt": return m[2]; case "ps": return m[3]; case "gn": return m[4]; case "nu": return m[5]; case "st": return m[6]; case "prs_ps": return m[7]; case "prs_gn": return m[8]; case "prs_nu": return m[9]; } }
  if(T==="clause") return f==="typ"?SD.TY[SD.ct[id]]:f==="domain"?SD.DO[SD.cd[id]]:undefined;
  if(T==="phrase") return f==="typ"?SD.PTY[SD.pt[id]]:f==="function"?SD.FN[SD.wf[w0]]:undefined;
  const vi=SD.vOf[w0], [b,,,c,v]=SD.V[vi];
  if(f==="book") return SD.BK[b-1]; if(f==="chapter") return String(c); if(f==="verse") return String(v); }
/* 검색식 읽기 */
function qParse(text){
  const lines=(text||"").split(/\n/), root=[], stack=[], rels=[], names={}; let err=null, nodes=[];
  lines.forEach((raw,li)=>{ if(err) return; const line=raw.replace(/\t/g,"  ").replace(/\s+$/,""); if(!line.trim()||/^\s*%/.test(line)) return;
    const ind=line.match(/^ */)[0].length; let toks=line.trim().split(/\s+/);
    if(toks.length===3&&QOPS.has(toks[1])&&!QT_ORDER.includes(toks[0].split(":").pop())&&!/[=#~]/.test(toks[0])){ rels.push({a:toks[0],op:toks[1],b:toks[2],li}); return; }
    if(toks.length===3&&/^:\d|^\d|:\d+:|=\d+:|:\d+=/.test(toks[1])){ err=`${li+1}째 줄: 거리 조건(${toks[1]})은 아직 앱에서 안 됩니다.`; return; }
    let op=""; if(QOPS.has(toks[0])){ op=toks.shift(); } else if(/^[:=<>#&\[\]\d]+$/.test(toks[0])){ err=`${li+1}째 줄: '${toks[0]}' 관계는 아직 앱에서 안 됩니다.`; return; }
    let head=toks.shift()||"", name=""; if(head.includes(":")){ [name,head]=head.split(":"); }
    if(!QT_ORDER.includes(head)){ err=`${li+1}째 줄: '${head}'는 알 수 없는 단위입니다. book, chapter, verse, sentence, clause, phrase, word 가운데 하나를 쓰세요.`; return; }
    const conds=[]; for(const t of toks){ const m=t.match(/^([a-z_0-9]+)(?:([=#~])(.*))?$/); if(!m){ err=`${li+1}째 줄: '${t}'를 읽을 수 없습니다. 조건은 띄어쓰기 없이 이름=값 으로 씁니다.`; return; }
      const [,f,o,v]=m; if(!QFEAT[head][f]){ err=`${li+1}째 줄: ${head}의 '${f}' 조건은 아직 앱에서 안 됩니다.`; return; }
      if(o==="~"){ try{ new RegExp(v); }catch(e){ err=`${li+1}째 줄: 정규식이 잘못되었습니다.`; return; } }
      conds.push({f,o:o||"",v:o==="~"?v:(v||"").split("|").map(x=>f==="lex_utf8"?hebNorm(x):f==="book"?qBookName(x):x)}); }
    if(err) return;
    const nd={t:head,name,op,conds,ch:[],ind,li}; nodes.push(nd); if(name) names[name]=nd;
    while(stack.length&&stack[stack.length-1].ind>=ind) stack.pop();
    if(stack.length){ const p=stack[stack.length-1]; if(QT_ORDER.indexOf(head)<=QT_ORDER.indexOf(p.t)&&!(head==="sentence"&&p.t==="verse")&&!(head==="clause"&&p.t==="verse")){ err=`${li+1}째 줄: ${head}는 ${p.t} 안에 들어갈 수 없습니다.`; return; } nd.parent=p; p.ch.push(nd); }
    else { if(root.length){ err="맨 위(들여쓰지 않은) 줄은 하나만 쓸 수 있습니다. 나머지는 그 아래로 들여 써 주세요."; return; } root.push(nd); }
    stack.push(nd); });
  if(!err&&!root.length) err="검색식이 비어 있습니다.";
  if(!err) for(const r of rels){ if(!names[r.a]||!names[r.b]){ err=`${r.li+1}째 줄: 이름 '${!names[r.a]?r.a:r.b}'가 위에 없습니다.`; break; } }
  return {err,root:root[0],rels,names,nodes}; }
function qBookName(x){ const i=SD.BK.indexOf(x); if(i>=0) return x; const k=PLAN.full.findIndex((n,j)=>j<39&&(n===x||PLAN.abbr[j]===x)); return k>=0?SD.BK[k]:x; }
function qCond(T,id,c){ const val=qFv(T,id,c.f); if(c.o==="") return val!=null&&val!==""&&val!=="NA"&&val!=="absent"&&val!=="n/a"; if(c.o==="~") return new RegExp(c.v).test(val||""); const hit=c.v.includes(val); return c.o==="="?hit:!hit; }
function qRel(op,A,B){ // A, B: [T,id]
  const af=qFirst(...A), al=qLast(...A), bf=qFirst(...B), bl=qLast(...B);
  switch(op){ case "<": return af<bf; case ">": return af>bf; case "<:": return al+1===bf; case ":>": return bl+1===af; case "=:": return af===bf; case ":=": return al===bl; case "::": return af===bf&&al===bl;
    case "=": return A[0]===B[0]&&A[1]===B[1]; case "#": return !(A[0]===B[0]&&A[1]===B[1]); case "==": return af===bf&&al===bl&&qWords(...A).length===qWords(...B).length;
    case "&&": return af<=bl&&bf<=al; case "##": return al<bf||bl<af; case "[[": return af<=bf&&bl<=al; case "]]": return bf<=af&&al<=bl; }
  return true; }
function qRun(P,sp,limit){ qIndex(); const t0=performance.now(); const order=[]; (function walk(n){ order.push(n); n.ch.forEach(walk); })(P.root);
  order.forEach((n,i)=>n.k=i);
  /* 노드마다 확인할 관계: 줄 앞 관계(앞 형제 또는 부모)와 이름 관계 */
  const chk=order.map(()=>[]);
  order.forEach(n=>{ if(n.op){ const sib=n.parent?n.parent.ch[n.parent.ch.indexOf(n)-1]:null; const a=sib||n.parent; if(a) chk[Math.max(a.k,n.k)].push([a.k,n.op,n.k]); } });
  P.rels.forEach(r=>{ const a=P.names[r.a].k, b=P.names[r.b].k; chk[Math.max(a,b)].push([a,r.op,b]); });
  const U=SD.qi.U, out=[], asg=new Array(order.length); let capped=false, steps=0;
  const okNode=(n,id)=>{ for(const c of n.conds) if(!qCond(n.t,id,c)) return false; asg[n.k]=[n.t,id]; for(const [a,op,b] of chk[n.k]) if(!qRel(op,asg[a],asg[b])) return false; return true; };
  const inside=(n,id,p)=>{ if(n.t==="word") return true; const PU=p[0]==="word"?null:U[p[0]]; if(!PU) return false; for(const w of qWords(n.t,id)) if(PU[w]!==p[1]) return false; return true; };
  function rec(i){ if(out.length>=limit){ capped=true; return; } if(i===order.length){ out.push(asg.slice()); return; }
    const n=order[i], p=asg[n.parent.k], seen=new Set(); const TU=U[n.t];
    for(const w of qWords(...p)){ const id=n.t==="word"?w:TU[w]; if(seen.has(id)) continue; seen.add(id); if(++steps>4e6){ capped=true; return; }
      if(!inside(n,id,p)) continue; if(!okNode(n,id)) continue; rec(i+1); if(capped&&out.length>=limit) return; } }
  const R=P.root, RU=U[R.t], seen=new Set(); const V=spanVerses(sp);
  const starts=V?V.flatMap(vi=>{ const [, , , , ,s,n]=SD.V[vi]; return Array.from({length:n},(_,j)=>s+j); }):null;
  const iter=starts||{length:SD.wl.length,[Symbol.iterator]:function*(){ for(let i=0;i<SD.wl.length;i++) yield i; }};
  for(const w of iter){ const id=R.t==="word"?w:RU[w]; if(seen.has(id)) continue; seen.add(id);
    if(!okNode(R,id)) continue; rec(1); if(out.length>=limit||steps>4e6){ capped=true; break; } }
  return {out,order,capped,ms:Math.round(performance.now()-t0)}; }
function qHits(res){ const H=new Map(); const leaf=res.order.map(n=>!n.ch.length);
  for(const tup of res.out){ tup.forEach((a,k)=>{ if(!leaf[k]) return; const ws=qWords(...a); const lim=a[0]==="word"||a[0]==="phrase"||a[0]==="clause"?ws:[ws[0]];
    for(const w of lim){ const vi=SD.vOf[w]; if(!H.has(vi)) H.set(vi,new Set()); if(a[0]!=="verse"&&a[0]!=="chapter"&&a[0]!=="book"&&a[0]!=="sentence") H.get(vi).add(w); } }); }
  return H; }
/* 블록 ↔ 검색식 */
const qNew=t=>({t,c:{},x:[],op:"",ch:[]});
function qGen(b,ind){ ind=ind||0; const cs=Object.entries(b.c).filter(([,v])=>v!==""&&v!=null).map(([k,v])=>` ${k}=${v}`).join("")+b.x.map(s=>" "+s).join("");
  return "  ".repeat(ind)+(b.op?b.op+" ":"")+(b.name?b.name+":":"")+b.t+cs+"\n"+b.ch.map(c=>qGen(c,ind+1)).join(""); }
function qFromParse(n){ const b=qNew(n.t); b.op=n.op; b.name=n.name; n.conds.forEach(c=>{ if(c.o==="="&&!b.c[c.f]&&c.f!=="lex_utf8") b.c[c.f]=c.v.join("|"); else b.x.push(c.f+c.o+(c.o==="~"?c.v:c.v.join("|"))); }); b.ch=n.ch.map(qFromParse); return b; }
function qWrapRange(text){ const sp=stSpans(); if(!sp) return text; const books=[...new Set(sp.map(x=>x[0]))]; if(books.length!==1) return text;
  const b=books[0], chs=[...new Set(sp.flatMap(([B,a,z])=>{ const all=[...SD.book[B].chs].sort((x,y)=>x-y); return all.filter(c=>c>=a&&c<=z); }))];
  const full=chs.length===SD.book[b].chs.size; const ind=s=>s.split("\n").filter(Boolean).map(l=>"  "+l).join("\n");
  /* 개역개정 장 번호를 히브리어 장 번호로(대부분 같음) */
  const hc=[...new Set(SD.V.filter((x,vi)=>x[0]===b&&chs.includes(x[1])).map(x=>x[3]))];
  return `book book=${SD.BK[b-1]}\n`+(full?ind(text):`  chapter chapter=${hc.join("|")}\n`+ind(ind(text))); }
/* 준비된 검색식 */
const Q_RECIPES={
  "전환a":"clause typ=NmCl|AjCl domain=N\n",
  "전환b":"clause typ=XQtl|WXQt|xQtX|xQt0|WxQ0|WxQX|ZQt0|ZQtX domain=N\n",
  "전환c":"clause typ=Ptcp domain=N\n",
  "장면":"clause domain#Q\n  =: word lex=W\n  <: word lex=HJH[ vt=wayq\n",
  "화자":"clause domain=N\n  word lex=HNH\n",
  "인물":"clause\n  phrase function=Subj\n    word lex=JHWH/|>LHJM/\n  phrase function=Pred|PreO|PreS|PreC\n    word sp=verb\n",
  "예시1":"clause typ=NmCl\n  phrase function=Subj\n    word lex=JHWH/\n",
  "예시2":"clause\n  word lex=HNH\n  < word sp=verb vt=ptca\n",
  "예시3":"phrase function=Objc\n  word lex=>T\n  <: word lex=H\n"};
const Q_EX=[["예시1","명사문 안에서 '여호와'가 주어인 곳"],["예시2","'보라(힌네)' 뒤에 분사가 오는 문장"],["인물","하나님(여호와)이 주어이고 동사가 있는 문장"],["전환b","서술 속에서 다른 말이 앞에 나온 완료형 문장"]];
function qOpen(key){ const S=view.st; S.mode="query"; S.qMode="blocks"; S.qt=Q_RECIPES[key]||""; const P=qParse(S.qt); if(!P.err) S.qb=qFromParse(P.root); qExec(); render(); scrollTo({top:0}); }
function qExec(){ const S=view.st; const text=S.qMode==="text"?S.qt:qGen(S.qb||qNew("clause")); const P=qParse(text);
  if(P.err){ S.qres={err:P.err}; return; } let r; try{ r=qRun(P,stSpans(),20000); }catch(e){ S.qres={err:"검색 중 문제가 생겼습니다: "+e.message}; return; }
  S.qres={hits:qHits(r),n:r.out.length,capped:r.capped,ms:r.ms}; S.more=1; }
/* 블록 화면 */
function qSel(path,f,opts,cur,label){ return `<label class="qf">${label}<select data-qf="${path}" data-f="${f}"><option value="">아무거나</option>${opts.map(([v,n])=>`<option value="${esc(v)}"${cur===v?" selected":""}>${esc(n)}</option>`).join("")}${cur&&!opts.some(o=>o[0]===cur)?`<option value="${esc(cur)}" selected>${esc(cur.split("|").map(v=>((opts.find(o=>o[0]===v)||[])[1]||v).replace(/ \(.*\)$/,"")).join(" 또는 "))}</option>`:""}</select></label>`; }
function qBlockHTML(b,path,parentT,idx){ const childTypes=QT_ORDER.filter(t=>QT_ORDER.indexOf(t)>QT_ORDER.indexOf(parentT||"")||!parentT);
  const typeOpts=(parentT?QT_ORDER.slice(QT_ORDER.indexOf(parentT)+1):QT_ORDER).map(t=>`<option value="${t}"${t===b.t?" selected":""}>${QT_K[t]} (${t})</option>`).join("");
  let f="";
  if(b.t==="word"){ const lk=b.c.lex, li=lk&&SD.lexByKey[lk]?SD.lexByKey[lk][0]:null;
    f+=`<label class="qf qlex">사전형${li!=null?`<span class="qlexv"><span class="heb">${esc(SD.L[li][0])}</span> ${esc(lexGloss(li))}<button class="qx" data-qlexx="${path}" aria-label="지우기">✕</button></span>`:lk?`<span class="qlexv">${lk.split("|").map(k=>{ const i2=SD.lexByKey[k]; return i2?`<span class="heb">${esc(SD.L[i2[0]][0])}</span> ${esc(lexGloss(i2[0]))}`:esc(k); }).join(" 또는 ")}<button class="qx" data-qlexx="${path}">✕</button></span>`:`<input data-qlexq="${path}" placeholder="뜻·히브리어·H번호" autocomplete="off"><span class="qsug" id="qsug-${path}"></span>`}</label>`;
    f+=qSel(path,"sp",Object.entries(SP_K),b.c.sp,"품사");
    if(!b.c.sp||b.c.sp==="verb"){ f+=qSel(path,"vs",Object.entries(VS_K),b.c.vs,"줄기")+qSel(path,"vt",Object.entries(VT_K),b.c.vt,"형태"); }
    if(b.more||b.c.ps||b.c.gn||b.c.nu) f+=qSel(path,"ps",[["p1","1인칭"],["p2","2인칭"],["p3","3인칭"]],b.c.ps,"인칭")+qSel(path,"gn",[["m","남성"],["f","여성"],["c","공성"]],b.c.gn,"성")+qSel(path,"nu",[["sg","단수"],["pl","복수"],["du","쌍수"]],b.c.nu,"수");
    else f+=`<button class="qmore" data-qmore="${path}">인칭·성·수 ›</button>`; }
  else if(b.t==="phrase") f+=qSel(path,"function",SD.FN.map(x=>[x,`${FN_K[x]||x} (${x})`]),b.c.function,"역할")+qSel(path,"typ",SD.PTY.map(x=>[x,`${PTY_K[x]||x} (${x})`]),b.c.typ,"구 종류");
  else if(b.t==="clause") f+=qSel(path,"typ",SD.TY.map(x=>[x,tyLabel(x)]),b.c.typ,"종류")+qSel(path,"domain",[["N","서술"],["Q","인물의 말"],["D","담화(율법·시 등)"]],b.c.domain,"누구의 말");
  else if(b.t==="book"||b.t==="chapter"||b.t==="verse"){ f+=qSel(path,"book",SD.BK.map((x,i)=>[x,PLAN.full[i]]),b.c.book,"책"); if(b.t!=="book") f+=`<label class="qf">장<input data-qfi="${path}" data-f="chapter" value="${esc(b.c.chapter||"")}" inputmode="numeric" placeholder="예: 3 또는 3|4"></label>`; if(b.t==="verse") f+=`<label class="qf">절<input data-qfi="${path}" data-f="verse" value="${esc(b.c.verse||"")}" inputmode="numeric"></label>`; }
  const ops=idx>0?["","<","<:"]:(parentT?["","=:",":="]:[]);
  return `<div class="qblk qt-${b.t}"><div class="qhd">${ops.length?`<select class="qop" data-qop="${path}">${ops.map(o=>`<option value="${esc(o)}"${b.op===o?" selected":""}>${idx>0?(o===""?"순서 상관없이":o==="<"?"위의 것보다 뒤에":"위의 것 바로 뒤에"):(o===""?"안 어디든":o==="=:"?"맨 앞에":"맨 끝에")}</option>`).join("")}</select>`:""}<select class="qtype" data-qtype="${path}">${typeOpts}</select>${path!=="r"?`<button class="qx" data-qdel="${path}" aria-label="상자 지우기">✕</button>`:""}</div>
    <div class="qfs">${f}${b.x.map((s,i)=>`<span class="qchip">${esc(s)}<button class="qx" data-qxx="${path}" data-i="${i}">✕</button></span>`).join("")}</div>
    ${b.ch.map((c,i)=>qBlockHTML(c,path+"."+i,b.t,i)).join("")}
    <div class="qadd">${b.t!=="word"?`<button class="btn ghost small" data-qin="${path}">＋ 이 안에 조건 넣기</button>`:""}</div></div>`; }
function qAt(path){ let b=view.st.qb; if(path==="r") return b; for(const i of path.split(".").slice(1)) b=b.ch[+i]; return b; }
function renderQuery(){ const S=view.st; S.qb ||= (()=>{ const r=qNew("clause"); r.ch.push(qNew("word")); return r; })(); S.qMode ||= "blocks";
  const text=qGen(S.qb);
  let h=`<section class="sec">${rangeBox()}<div class="seg sseg" style="margin-top:4px">${[["blocks","골라서 만들기"],["text","검색식 직접 쓰기"]].map(([k,n])=>`<button aria-checked="${S.qMode===k}" data-qmode="${k}">${n}</button>`).join("")}</div>`;
  if(S.qMode==="blocks"){ h+=`${qIntro()}${qBlockHTML(S.qb,"r","",0)}
     <details class="qtxt"><summary>만든 검색식 보기 (Text-Fabric)</summary><pre>${esc(text)}</pre><div class="row"><button class="btn ghost small" id="qCopy">알파알렙·SHEBANQ용으로 복사</button><button class="btn ghost small" id="qToText">직접 고치기</button></div></details>`; }
  else h+=`<p class="lead">Text-Fabric 검색식을 씁니다. 두 칸씩 들여 써서 큰 단위 안에 작은 단위를 둡니다. 조건은 띄어쓰기 없이 <code>sp=verb</code>처럼 씁니다. 범위는 위에서 고른 것을 따릅니다.</p><textarea id="qText" class="qsrc" rows="7" spellcheck="false" dir="ltr">${esc(S.qt||text)}</textarea><div class="row"><button class="btn ghost small" id="qToBlocks">상자로 옮기기</button><button class="btn ghost small" id="qHelp">쓸 수 있는 것</button></div>${S.qHelp?qHelpHTML():""}`;
  if(S.qMode==="blocks") h+=`<div class="qsay"><b>읽어 보면</b> ${qSayAll(S.qb)}</div>`;
  h+=`<div class="row"><button class="btn" id="qRun" style="width:100%">찾기</button></div></section>`;
  const R=S.qres; if(R){ h+=`<section class="sec">`; if(R.err) h+=`<p class="qerr">${esc(R.err)}</p>`; else { let wc=0; R.hits.forEach(s=>wc+=s.size);
      h+=`<p class="lead"><b>${esc(stRangeLabel())}</b>에서 ${R.n.toLocaleString()}건${R.capped?"(처음 20,000건까지만)":""}, ${R.hits.size.toLocaleString()}절 · ${R.ms}ms</p>${distBars(R.hits,stSpans())}${hitList(R.hits,S.more,"찾은 곳이 없습니다. 조건을 줄이거나 범위를 넓혀 보세요.")}`; } h+=`</section>`; }
  else h+=`<section class="sec"><span class="label">예시로 시작하기</span>${Q_EX.map(([k,n])=>`<button class="hlitem" data-sqopen="${k}"><small>${esc(Q_RECIPES[k].split("\n")[0])} …</small>${esc(n)}</button>`).join("")}</section>`;
  return h; }
function qIntro(){ return `<details class="qintro"${view.st.qIntroSeen?"":" open"}><summary>이 기능은 무엇인가요?</summary>
  <p>낱말 하나가 아니라 <b>문장의 모양</b>으로 원문을 찾는 기능입니다. 예를 들어 '여호와가 주어인 문장', '보라(힌네) 뒤에 분사가 오는 문장', '이야기 중간에 끼어든 설명 문장'처럼 찾습니다.</p>
  <p>히브리어 성경(BHSA)은 모든 낱말이 <b>구</b>(낱말 묶음: 주어, 목적어, 서술어…) 안에 있고, 구는 <b>절(클로즈)</b>(동사 하나를 중심으로 한 작은 문장) 안에 있습니다. 그래서 '이 절 안에 이런 구가 있고, 그 안에 이런 낱말이 있다'는 식으로 조건을 겹쳐 넣습니다.</p>
  <p>처음 화면의 <b>절 안에 낱말 하나</b>는 시작 틀입니다. 낱말의 사전형이나 품사만 골라도 바로 찾을 수 있고, 필요 없으면 ✕로 지우면 됩니다. 아래 '읽어 보면'에 지금 조건이 우리말로 나옵니다.</p>
  <p>처음이라면 아래 <b>예시로 시작하기</b>나, '도구' 결과의 <b>이 결과의 검색식 보기</b>에서 출발해 조건을 하나씩 바꿔 보세요. 낱말 하나만 찾을 때는 '낱말'이 더 쉽습니다.</p></details>`; }
const QF_K={sp:SP_K,vs:VS_K,vt:VT_K,ps:{p1:"1인칭",p2:"2인칭",p3:"3인칭"},gn:{m:"남성",f:"여성",c:"공성"},nu:{sg:"단수",pl:"복수",du:"쌍수"},domain:{N:"서술",Q:"인물의 말",D:"율법·시 등"},function:FN_K};
function qSay(b){ const part=(f,v)=>v.split("|").map(x=>{ if(f==="lex"){ const i=SD.lexByKey[x]; return i?`'${lexGloss(i[0])}'`:x; } if(f==="typ"&&b.t==="clause") return TY_FAM(x)||x; if(f==="typ") return PTY_K[x]||x; if(f==="book"){ const k=SD.BK.indexOf(x); return k>=0?PLAN.full[k]:x; } return (QF_K[f]&&QF_K[f][x])||x; }).join(" 또는 ");
  const conds=Object.entries(b.c).filter(([,v])=>v).map(([f,v])=>f==="lex"?`사전형 ${part(f,v)}`:f==="chapter"?`${v}장`:f==="verse"?`${v}절`:part(f,v)).concat(b.x);
  const me=conds.length?`${esc(conds.join("·"))}인 <b>${QT_K[b.t]}</b>`:`<b>${QT_K[b.t]}</b>`;
  if(!b.ch.length) return me;
  const kids=b.ch.map((c,i)=>{ const pre=c.op==="<"?"그보다 뒤에 ":c.op==="<:"?"바로 뒤에 ":c.op==="=:"?"맨 앞에 ":c.op===":="?"맨 끝에 ":i>0?"그리고 ":""; return pre+qSay(c,1); });
  return `${me} 안에 ${kids.join(", ")}`; }
function qSayAll(b){ const s=qSay(b), last=s.replace(/<[^>]+>/g,"").trim().slice(-1), c=last.charCodeAt(0); const jong=c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28>0; return s+(jong?"을":"를")+" 찾습니다."; }
function qHelpHTML(){ return `<div class="qhelp"><p><b>단위</b> book · chapter · verse · sentence · clause · phrase · word (이름을 붙이려면 <code>w1:word</code>)</p>
  <p><b>낱말 조건</b> lex · lex_utf8 · voc_lex_utf8 · gloss · sp · vs · vt · ps · gn · nu · st · prs_ps · prs_gn · prs_nu · language<br><b>구</b> function · typ <b>절(클로즈)</b> typ · domain <b>책·장·절</b> book · chapter · verse</p>
  <p><b>조건 쓰는 법</b> <code>sp=verb</code> 같음 · <code>vt=wayq|perf</code> 여럿 중 하나 · <code>sp#verb</code> 아님 · <code>lex~^B</code> 정규식 · <code>prs_ps</code> 값이 있음</p>
  <p><b>관계</b> 줄 앞에 <code>&lt;</code> 위의 것보다 뒤 · <code>&lt;:</code> 바로 뒤 · <code>=:</code> 맨 앞 · <code>:=</code> 맨 끝 / 이름끼리 <code>w1 &lt; w2</code>, <code>=</code> <code>#</code> <code>&gt;</code> <code>:&gt;</code> <code>::</code> <code>==</code> <code>&amp;&amp;</code> <code>##</code> <code>[[</code> <code>]]</code></p>
  <p><b>아직 안 되는 것</b> 거리 조건(<code>:3:</code> 등), 맨 위 줄 여러 개, 그 밖의 BHSA 조건. 결과는 20,000건까지 셉니다. 히브리어는 끝글자·모음 없이 써도 됩니다.</p></div>`; }
function bindQuery(m){ const S=view.st; const rr=()=>{ const y=scrollY; render(); scrollTo({top:y}); };
  m.querySelectorAll("[data-qmode]").forEach(b=>b.onclick=()=>{ if(b.dataset.qmode==="text"&&S.qMode!=="text") S.qt=qGen(S.qb); if(b.dataset.qmode==="blocks"&&S.qMode==="text"){ const P=qParse(S.qt); if(P.err){ toast("검색식을 상자로 옮기지 못했습니다: "+P.err); return; } S.qb=qFromParse(P.root); } S.qMode=b.dataset.qmode; rr(); });
  m.querySelectorAll("[data-qf]").forEach(s=>s.onchange=()=>{ const b=qAt(s.dataset.qf); if(s.value) b.c[s.dataset.f]=s.value; else delete b.c[s.dataset.f]; if(s.dataset.f==="sp"&&s.value!=="verb"){ delete b.c.vs; delete b.c.vt; } rr(); });
  m.querySelectorAll("[data-qfi]").forEach(s=>s.onchange=()=>{ const b=qAt(s.dataset.qfi); const v=s.value.trim().replace(/[,\s]+/g,"|"); if(v) b.c[s.dataset.f]=v; else delete b.c[s.dataset.f]; rr(); });
  m.querySelectorAll("[data-qtype]").forEach(s=>s.onchange=()=>{ const b=qAt(s.dataset.qtype); b.t=s.value; b.c={}; b.x=[]; b.ch=b.ch.filter(c=>QT_ORDER.indexOf(c.t)>QT_ORDER.indexOf(b.t)); rr(); });
  m.querySelectorAll("[data-qop]").forEach(s=>s.onchange=()=>{ qAt(s.dataset.qop).op=s.value; rr(); });
  m.querySelectorAll("[data-qdel]").forEach(x=>x.onclick=()=>{ const p=x.dataset.qdel.split("."), i=+p.pop(); const par=qAt(p.join(".")); par.ch.splice(i,1); if(par.ch[0]&&["<","<:"].includes(par.ch[0].op)) par.ch[0].op=""; rr(); });
  m.querySelectorAll("[data-qmore]").forEach(x=>x.onclick=()=>{ qAt(x.dataset.qmore).more=1; rr(); });
  m.querySelectorAll("[data-qxx]").forEach(x=>x.onclick=()=>{ qAt(x.dataset.qxx).x.splice(+x.dataset.i,1); rr(); });
  m.querySelectorAll("[data-qin]").forEach(x=>x.onclick=()=>{ const b=qAt(x.dataset.qin); const nt=b.t==="clause"||b.t==="phrase"?(b.ch.length&&b.ch[b.ch.length-1].t==="phrase"?"phrase":"word"):b.t==="sentence"?"clause":b.t==="verse"?"clause":QT_ORDER[QT_ORDER.indexOf(b.t)+1]; const n=qNew(b.t==="phrase"?"word":nt); b.ch.push(n); rr(); });
  m.querySelectorAll("[data-qlexx]").forEach(x=>x.onclick=e=>{ e.preventDefault(); delete qAt(x.dataset.qlexx).c.lex; rr(); });
  m.querySelectorAll("[data-qlexq]").forEach(inp=>inp.oninput=()=>{ const path=inp.dataset.qlexq, box=document.getElementById("qsug-"+path); const L=lexSuggest(inp.value).slice(0,8);
    box.innerHTML=L.map(li=>`<button data-qpick="${li}"><span class="heb">${esc(SD.L[li][0])}</span> ${esc(lexGloss(li))} <small>${SD.L[li][7]}</small></button>`).join("");
    box.querySelectorAll("[data-qpick]").forEach(b=>b.onclick=e=>{ e.preventDefault(); qAt(path).c.lex=SD.L[+b.dataset.qpick][1]; rr(); }); });
  const run=document.getElementById("qRun"); if(run) run.onclick=()=>{ const t=document.getElementById("qText"); if(t) S.qt=t.value; run.textContent="찾는 중…"; setTimeout(()=>{ qExec(); render(); document.querySelector(".qerr, .shits, .sdist")?.scrollIntoView({block:"center"}); },30); };
  const tx=document.getElementById("qText"); if(tx) tx.oninput=()=>{ S.qt=tx.value; };
  const cp=document.getElementById("qCopy"); if(cp) cp.onclick=async()=>{ const t=qWrapRange(qGen(S.qb)); try{ await navigator.clipboard.writeText(t); toast("검색식을 복사했습니다. 범위도 book 줄로 넣었습니다."); }catch(e){ toast("복사하지 못했습니다. 길게 눌러 직접 복사해 주세요."); } };
  m.querySelectorAll(".qintro").forEach(d=>d.ontoggle=()=>{ if(!d.open) S.qIntroSeen=1; });
  const tt=document.getElementById("qToText"); if(tt) tt.onclick=()=>{ S.qt=qGen(S.qb); S.qMode="text"; rr(); };
  const tb=document.getElementById("qToBlocks"); if(tb) tb.onclick=()=>{ const P=qParse(S.qt); if(P.err){ toast(P.err); return; } S.qb=qFromParse(P.root); S.qMode="blocks"; rr(); };
  const hp=document.getElementById("qHelp"); if(hp) hp.onclick=()=>{ S.qHelp=!S.qHelp; rr(); };
}
