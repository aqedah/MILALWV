/* ===== 검색식 엔진(계산부) — 주 스레드와 Web Worker 가 같은 파일을 쓴다. UI 를 건드리지 않는 순수 계산만 둔다.
   전역 SD(자료)와 PLAN(책 이름)에만 의존한다. 워커에서는 메시지로 받은 자료를 self.SD/self.PLAN 에 놓고 importScripts 로 이 파일을 읽는다. ===== */
/* 워커에는 study_ui 의 spanVerses·annots 의 slotOf 가 없으므로 같은 계산을 여기서도 제공한다(주 스레드에서는 기존 함수가 있으면 그것을 쓴다) */
const qeSpanVerses=sp=>{ if(typeof spanVerses==="function") return spanVerses(sp); if(!sp) return null; const out=[]; for(const [B,a,z,v1,v2] of sp){ const bk=SD.book[B]; if(!bk) continue; for(let vi=bk.a;vi<=bk.z;vi++){ const c=SD.V[vi][1], v=SD.V[vi][2]; if(c>=a&&c<=z&&!(v1!=null&&c===a&&v<v1)&&!(v2!=null&&c===z&&v>v2)) out.push(vi); } } return out; };   /* [책, 시작 장, 끝 장, (시작 절), (끝 절)] */
const qeSlotOf=i=>{ if(typeof slotOf==="function") return slotOf(i); const b=SD.V[SD.vOf[i]][0], bf=SD.V[SD.book[b].a][5]; return SD.bs[b-1]+(i-bf); };
const qeNow=()=>(typeof performance!=="undefined"?performance.now():Date.now());
const QT_ORDER=["book","chapter","verse","sentence","clause","phrase","word"];
const QOPS=new Set(["=","#","<",">","<:",":>","=:",":=","::","==","&&","##","[[","]]"]);
const hebNorm=s=>(s||"").replace(/[֑-ׇ]/g,"").replace(/[12]/g,"").replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ");
const WFEAT={lex:1,lex_utf8:1,voc_lex_utf8:1,gloss:1,sp:1,vs:1,vt:1,ps:1,gn:1,nu:1,st:1,prs_ps:1,prs_gn:1,prs_nu:1,language:1};
const QFEAT={book:{book:1},chapter:{book:1,chapter:1},verse:{book:1,chapter:1,verse:1},sentence:{},clause:{typ:1,domain:1},phrase:{typ:1,function:1},word:WFEAT};
function qIndex(){ if(SD.qi) return SD.qi; const N=SD.wl.length, U={word:null,phrase:SD.wp,clause:SD.wc,sentence:SD.ws,verse:SD.vOf};
  const ch=new Uint32Array(N), bk=new Uint32Array(N); const chKey=new Map(), chInfo=[];
  SD.V.forEach(([b,,,c],vi)=>{ const k=b*1000+c; if(!chKey.has(k)){ chKey.set(k,chInfo.length); chInfo.push([b,c]); } const id=chKey.get(k), [, , , , , s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ ch[j]=id; bk[j]=b-1; } });
  U.chapter=ch; U.book=bk;
  const C={}; for(const T of ["phrase","clause","sentence","verse","chapter","book"]){ const A=U[T]; let mx=0; for(let i=0;i<N;i++) if(A[i]>mx) mx=A[i]; const cnt=new Uint32Array(mx+2); for(let i=0;i<N;i++) cnt[A[i]+1]++; for(let i=1;i<cnt.length;i++) cnt[i]+=cnt[i-1]; const off=cnt.slice(), W=new Uint32Array(N); for(let i=0;i<N;i++) W[off[A[i]]++]=i; C[T]={st:cnt,W,n:mx+1}; }
  return SD.qi={U,C,chInfo}; }
const qWords=(T,id)=>{ if(T==="word") return [id]; const c=(SD.qi||qIndex()).C[T]; return c.W.subarray(c.st[id],c.st[id+1]); };   /* 워커 결과만 받은 주 스레드도 색인을 늦게 만든다 */
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
function qRun(P,sp,limit){ qIndex(); const t0=qeNow(); const order=[]; (function walk(n){ order.push(n); n.ch.forEach(walk); })(P.root);
  order.forEach((n,i)=>n.k=i);
  /* 노드마다 확인할 관계: 줄 앞 관계(앞 형제 또는 부모)와 이름 관계 */
  const chk=order.map(()=>[]);
  order.forEach(n=>{ if(n.op){ const sib=n.parent?n.parent.ch[n.parent.ch.indexOf(n)-1]:null; const a=sib||n.parent; if(a) chk[Math.max(a.k,n.k)].push([a.k,n.op,n.k]); } });
  P.rels.forEach(r=>{ const a=P.names[r.a].k, b=P.names[r.b].k; chk[Math.max(a,b)].push([a,r.op,b]); });
  const U=SD.qi.U, out=[], asg=new Array(order.length); let capped=false, steps=0, stepsHit=false; const STEP_MAX=4e6;
  const okNode=(n,id)=>{ for(const c of n.conds) if(!qCond(n.t,id,c)) return false; asg[n.k]=[n.t,id]; for(const [a,op,b] of chk[n.k]) if(!qRel(op,asg[a],asg[b])) return false; return true; };
  const inside=(n,id,p)=>{ if(n.t==="word") return true; const PU=p[0]==="word"?null:U[p[0]]; if(!PU) return false; for(const w of qWords(n.t,id)) if(PU[w]!==p[1]) return false; return true; };
  function rec(i){ if(out.length>=limit){ capped=true; return; } if(i===order.length){ out.push(asg.slice()); return; }
    const n=order[i], p=asg[n.parent.k], seen=new Set(); const TU=U[n.t];
    for(const w of qWords(...p)){ const id=n.t==="word"?w:TU[w]; if(seen.has(id)) continue; seen.add(id); if(++steps>STEP_MAX){ capped=true; stepsHit=true; return; }
      if(!inside(n,id,p)) continue; if(!okNode(n,id)) continue; rec(i+1); if(capped&&out.length>=limit) return; } }
  const R=P.root, RU=U[R.t], seen=new Set(); const V=qeSpanVerses(sp);
  const starts=V?V.flatMap(vi=>{ const [, , , , ,s,n]=SD.V[vi]; return Array.from({length:n},(_,j)=>s+j); }):null;
  const iter=starts||{length:SD.wl.length,[Symbol.iterator]:function*(){ for(let i=0;i<SD.wl.length;i++) yield i; }};
  for(const w of iter){ const id=R.t==="word"?w:RU[w]; if(seen.has(id)) continue; seen.add(id);
    if(!okNode(R,id)) continue; rec(1); if(out.length>=limit||steps>STEP_MAX){ capped=true; if(steps>STEP_MAX) stepsHit=true; break; } }
  return {out,order,capped,limitHit:out.length>=limit,stepsHit,steps,ms:Math.round(qeNow()-t0)}; }
function qHits(res){ const H=new Map(); const leaf=res.order.map(n=>!n.ch.length);
  for(const tup of res.out){ tup.forEach((a,k)=>{ if(!leaf[k]) return; const ws=qWords(...a); const lim=a[0]==="word"||a[0]==="phrase"||a[0]==="clause"?ws:[ws[0]];
    for(const w of lim){ const vi=SD.vOf[w]; if(!H.has(vi)) H.set(vi,new Set()); if(a[0]!=="verse"&&a[0]!=="chapter"&&a[0]!=="book"&&a[0]!=="sentence") H.get(vi).add(w); } }); }
  return H; }
function qCanon(P){ const node=n=>({t:n.t,name:n.name||"",op:n.op||"",conds:n.conds.map(c=>c.f+c.o+(Array.isArray(c.v)?[...c.v].sort().join("|"):c.v)).sort(),ch:n.ch.map(node)}); return JSON.stringify({root:node(P.root),rels:P.rels.map(r=>`${r.a} ${r.op} ${r.b}`).sort()}); }
function qWhyIndex(r){ const W=new Map(); const leaf=r.order.map(n=>!n.ch.length);
  for(const tup of r.out){ const vs=new Set(); tup.forEach((a,k)=>{ if(!leaf[k]) return; for(const w of qWords(...a)) vs.add(SD.vOf[w]); });
    for(const vi of vs){ let e=W.get(vi); if(!e){ e={n:0,t:[]}; W.set(vi,e); } e.n++; if(e.t.length<3) e.t.push(tup); } }
  return W; }
function qFingerprint(r){ const L=[]; for(const tup of r.out){ L.push(tup.map((a,k)=>{ const ws=qWords(...a); return `${r.order[k].t}${ws.length?qeSlotOf(ws[0]):"-"}+${ws.length}`; }).join(" ")); } L.sort();
  let h1=0x811c9dc5, h2=0x01000193; for(const t of L){ for(let i=0;i<t.length;i++){ const c=t.charCodeAt(i); h1=Math.imul(h1^c,16777619)>>>0; h2=Math.imul(h2^c,2246822519)>>>0; } h1=Math.imul(h1^10,16777619)>>>0; h2=Math.imul(h2^10,2246822519)>>>0; }
  return `${L.length}:${h1.toString(16)}${h2.toString(16)}`; }
