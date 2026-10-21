/* ===== 성경연구 · 검색식 (Text-Fabric 검색식의 핵심 부분을 앱 안에서 실행) ===== */
const QT_K={book:"책",chapter:"장",verse:"절",sentence:"문장",clause:"절(클로즈)",phrase:"구",word:"낱말"};
const QOP_K={"":"어디든","<":"뒤 어딘가","<:":"바로 뒤에 붙어서","=:":"맨 앞에서",":=":"맨 끝에서"};
const PTY_K={VP:"동사구",NP:"명사구",PP:"전치사구",CP:"접속사구",AdvP:"부사구",AdjP:"형용사구",InjP:"감탄사구",DPrP:"지시대명사구",PrNP:"고유명사구",NegP:"부정구",PPrP:"인칭대명사구",IPrP:"의문대명사구",InrP:"의문사구"};
const TY_FAM=c=>/Way/.test(c)?"와이크톨":/Q/.test(c)?"완료":/Y/.test(c)?"미완료":/I/.test(c)&&/m|0|X|I/.test(c)&&!/Inf/.test(c)?"명령":({NmCl:"명사문",AjCl:"형용사문",Ptcp:"분사문",InfC:"부정사 연계형",InfA:"부정사 절대형",Ellp:"생략",Voct:"부름",CPen:"앞세운 말",MSyn:"이야기 표지",Reop:"다시 받음",XPos:"뒤로 뺀 말"})[c]||"";
const TY_LEAD=c=>/^W/.test(c)?"와(그리고)+":/^[xX]/.test(c)?"앞에 다른 말+":/^Z/.test(c)?"":"";
const tyLabel=c=>`${c} · ${TY_LEAD(c)}${TY_FAM(c)}`;
/* 검색식 읽기 */
/* 블록 ↔ 검색식 */
const qNew=t=>({t,c:{},x:[],op:"",ch:[]});
function qGen(b,ind){ ind=ind||0; const cs=Object.entries(b.c).filter(([,v])=>v!==""&&v!=null).map(([k,v])=>` ${k}=${v}`).join("")+b.x.map(s=>" "+s).join("");
  const line="  ".repeat(ind)+(b.op?b.op+" ":"")+(b.name?b.name+":":"")+b.t+cs+"\n"+b.ch.map(c=>qGen(c,ind+1)).join("");
  /* 맨 위 상자에 붙은 이름 관계(w1 < w2 같은 줄)는 나무 뒤에 그대로 다시 쓴다 — 상자로 못 고치지만 잃지 않는다 */
  return ind===0&&b.rels&&b.rels.length?line+b.rels.map(r=>`${r.a} ${r.op} ${r.b}\n`).join(""):line; }
function qFromParse(n,P){ const b=qNew(n.t); b.op=n.op; b.name=n.name; n.conds.forEach(c=>{ if(c.o==="="&&!b.c[c.f]&&c.f!=="lex_utf8") b.c[c.f]=c.v.join("|"); else b.x.push(c.f+c.o+(c.o==="~"?c.v:c.v.join("|"))); }); b.ch=n.ch.map(c=>qFromParse(c)); if(P&&P.rels&&P.rels.length) b.rels=P.rels.map(r=>({a:r.a,op:r.op,b:r.b})); return b; }
/* 검색식의 '뜻'만 뽑아 비교(들여쓰기·빈 줄·조건 순서와 무관): 단위·이름·관계·조건·이름 관계 */
/* 텍스트 → 상자 → 텍스트 왕복이 뜻을 보존하는지. 보존되지 않으면 상자로 옮기지 않는다(원본 텍스트 유지) */
function qRoundTrip(text){ const P=qParse(text); if(P.err) return {ok:false,err:P.err}; const b=qFromParse(P.root,P); const back=qGen(b); const P2=qParse(back); if(P2.err) return {ok:false,err:"상자에서 다시 만든 검색식을 읽지 못했습니다: "+P2.err,block:b,back};
  const ok=qCanon(P)===qCanon(P2); const lost=[]; if(!ok){ const a=JSON.parse(qCanon(P)), c=JSON.parse(qCanon(P2)); const flat=(n,path,out)=>{ out.push(path+":"+n.t+(n.name?"("+n.name+")":"")+" "+n.op+" "+n.conds.join(" ")); n.ch.forEach((k,i)=>flat(k,path+"."+i,out)); return out; }; const A=flat(a.root,"r",[]).concat(a.rels), C=new Set(flat(c.root,"r",[]).concat(c.rels)); A.forEach(x=>{ if(!C.has(x)) lost.push(x); }); }
  /* 상자 화면으로 '고칠 수는 없고 보기만' 되는 것: 이름 관계, 상자 메뉴에 없는 관계 기호, =·~·값 있음 조건(칩) */
  const readonly=[]; (function walk(n){ if(n.op&&!["","<","<:","=:",":="].includes(n.op)) readonly.push(`관계 기호 ${n.op}(${n.t})`); n.conds.forEach(c=>{ if(c.o!=="="||c.f==="lex_utf8") readonly.push(`${n.t} 조건 ${c.f}${c.o}${Array.isArray(c.v)?c.v.join("|"):c.v}`); }); n.ch.forEach(walk); })(P.root); P.rels.forEach(r=>readonly.push(`이름 관계 ${r.a} ${r.op} ${r.b}`));
  return {ok,block:b,back,lost,readonly}; }
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
Q_RECIPES["서술명사문"]="clause typ=NmCl domain=N\n";
const Q_EX=[["예시1","명사문 안에서 '여호와'가 주어인 곳"],["예시2","'보라(힌네)' 뒤에 분사가 오는 문장"],["인물","하나님(여호와)이 주어이고 동사가 있는 문장"],["전환b","서술 속에서 다른 말이 앞에 나온 완료형 문장"]];
/* 첫 화면의 연구 질문 — 설명은 검색식이 실제로 하는 조건과 똑같이 적는다(문학적 기능을 미리 말하지 않음) */
const Q_QUESTIONS=[
  {key:"예시1",q:"여호와가 주어인 명사문 찾기",desc:"동사가 없는 문장(명사문, NmCl) 안에서 주어 구에 '여호와'(JHWH)가 들어 있는 절을 찾습니다.",
   hints:["찾은 문장이 서술자의 말에 있는지 인물의 말에 있는지 아래 분포에서 보세요.","주어 '여호와' 다음에 무엇이 오는지(명사인지, 전치사구인지) 몇 곳을 적어 보세요.","같은 장 안에서 같은 내용을 동사문으로 말한 곳이 있는지 견주어 보세요."]},
  {key:"예시2",q:"'보라' 뒤에 능동분사가 있는 절 찾기",desc:"같은 절 안에서 '보라(힌네, HNH)' 뒤 어딘가에 능동분사(ptca)가 오는 곳을 찾습니다. 바로 뒤일 필요는 없습니다.",
   hints:["이 문장들의 앞뒤 문맥을 살펴보세요. '보라'가 언제 쓰이는지, 늘 같은 역할을 하는지 관찰해 보세요.","분사의 주어가 누구인지, 말하는 이와 같은지 적어 보세요.","아래 '다음 단계'로 조건을 바꿔 가며 결과가 어떻게 달라지는지 보세요."]},
  {key:"서술명사문",q:"서술에 사용된 명사문 찾기",desc:"서술 영역(N — 인물의 말이 아닌 서술자의 말) 안의 명사문(NmCl)을 찾습니다. 이것이 장면 전환인지 배경 설명인지는 찾아 주지 않습니다 — 본문에서 보고 판단하세요.",
   hints:["명사문 바로 앞뒤의 문장 종류(와이크톨인지, 완료형인지)를 보세요.","명사문이 이야기 흐름을 멈추는 자리인지, 새 인물·장소를 소개하는 자리인지 사례별로 적어 보세요.","한 장에 몰려 있다면 그 장을 구조 화면에서 열어 보세요."]},
  {key:"__custom",q:"사용자가 직접 조건 만들기",desc:"'절 안에 낱말 하나'인 빈 틀에서 시작해 조건을 골라 넣습니다."}];
/* 단계별 학습('보라' 예시): 조건을 하나씩 바꿔 보며 결과 변화를 본다 */
const Q_STEPS={"예시2":[
  {n:"원래 조건",text:"clause\n  word lex=HNH\n  < word sp=verb vt=ptca\n",say:"'보라'가 있고, 같은 절 뒤쪽에 능동분사가 있는 절"},
  {n:"능동분사 조건 빼기",text:"clause\n  word lex=HNH\n",say:"능동분사 조건을 뺐습니다 — '보라'가 있는 절 전부. 결과가 얼마나 늘었는지 보세요"},
  {n:"서술(N)로 좁히기",text:"clause domain=N\n  word lex=HNH\n  < word sp=verb vt=ptca\n",say:"원래 조건에 '서술자의 말'을 더했습니다 — 인물의 말 속 '보라'가 빠집니다"},
  {n:"본문에서 살펴보기",act:"open",say:"결과 하나를 눌러 본문을 열고, 앞뒤 문장을 본 뒤 '관찰' 메모를 남기세요. '← 검색 결과로' 단추로 돌아옵니다"}]};
function qOpen(key){ const S=view.st; S.qPending=null; S.mode="query"; S.qMode="blocks"; S.qkey=key; S.qstep=0; S.qt=Q_RECIPES[key]||""; const P=qParse(S.qt); if(!P.err) S.qb=qFromParse(P.root,P); qExec(); render(); scrollTo({top:0}); }
function qOpenCustom(){ const S=view.st; S.qPending=null; S.mode="query"; S.qMode="blocks"; S.qkey="__custom"; S.qres=null; S.qb=(()=>{ const r=qNew("clause"); r.ch.push(qNew("word")); return r; })(); S.qt=qGen(S.qb); render(); const el=document.querySelector(".qblk"); if(el) el.scrollIntoView({block:"start"}); }
/* 조건에서 이끌어 낸 '이렇게 연구해 보세요' — 질문만 하고 문학적 기능은 정하지 않는다 */
function qResearchHints(P){ const Hs=[]; const Q=qExampleLive()?Q_QUESTIONS.find(x=>x.key===view.st.qkey):null; if(Q&&Q.hints) Hs.push(...Q.hints);
  const has=f=>{ let r=false; (function w(n){ if(n.conds.some(c=>c.f===f)) r=true; n.ch.forEach(w); })(P.root); return r; };
  if(!Q||!Q.hints){ if(has("lex")) Hs.push("이 낱말이 나올 때 바로 앞 절과 뒤 절을 함께 읽고, 늘 같은 역할을 하는지 적어 보세요."); if(has("typ")) Hs.push("문장 종류가 같아도 쓰임이 같은지 몇 곳을 골라 견주어 보세요."); if(has("domain")) Hs.push("서술자의 말과 인물의 말에서 같은 모양이 다르게 쓰이는지 보세요."); if(has("function")) Hs.push("그 구가 문장 앞에 오는지 뒤에 오는지(어순)를 적어 보세요."); }
  Hs.push("한 책이나 한 장에 몰려 있다면 그 장을 구조 화면에서 열어 흐름 속에서 보세요."); return Hs.slice(0,4); }
/* ===== 실행: 워커가 있으면 워커에서(화면이 멈추지 않음), 없거나 실패하면 주 스레드에서 같은 엔진으로 ===== */
const Q_WORKER_URL="app/study_qw.js", Q_ENGINE_V="1";
function qWorkerOn(){ try{ if(localStorage.getItem("milal-q-worker")==="off") return false; }catch(e){} return typeof Worker!=="undefined"&&!window.__qWorkerBroken; }
function qWorkerGet(){ const S=view.st; if(S.qw) return S.qw; try{ const w=new Worker(Q_WORKER_URL+"?v="+Q_ENGINE_V,{name:Q_ENGINE_V}); w.key=null; w.onmessage=ev=>qWorkerMsg(ev.data); w.onerror=e=>{ console.warn("검색 워커 오류",e.message); window.__qWorkerBroken=true; const seq=S.qSeq; qWorkerDrop(); if(S.qres&&S.qres.loading&&S.qres.seq===seq){ qExecSync(); render(); } }; S.qw=w; return w; }catch(e){ window.__qWorkerBroken=true; return null; } }
function qWorkerDrop(){ const S=view.st; if(S.qw){ try{ S.qw.terminate(); }catch(e){} S.qw=null; } }
function qDataKey(){ return (SD.bhsa||"2021")+":"+[...SD.loaded].sort((a,b)=>a-b).join(","); }
/* 엔진이 쓰는 자료만 복사해 보낸다(형식 배열은 구조 복제). 책을 더 받아 key 가 바뀌면 다시 보낸다 */
function qWorkerSend(w){ const key=qDataKey(); if(w.key===key) return; const t0=performance.now(); const book={}; for(const b in SD.book){ const x=SD.book[b]; book[b]={a:x.a,z:x.z,chs:[...x.chs]}; }
  w.postMessage({type:"data",key,book,PLAN:{full:PLAN.full,abbr:PLAN.abbr},SD:{L:SD.L,M:SD.M,FN:SD.FN,TY:SD.TY,DO:SD.DO,PTY:SD.PTY,BK:SD.BK,V:SD.V,bs:SD.bs,bhsa:SD.bhsa,vOf:SD.vOf,wl:SD.wl,wm:SD.wm,wf:SD.wf,wc:SD.wc,wp:SD.wp,ws:SD.ws,ct:SD.ct,cd:SD.cd,pt:SD.pt}}); w.key=key; w.sendMs=Math.round(performance.now()-t0); }
function qWorkerMsg(m){ const S=view.st; if(!m) return;
  if(m.type==="fatal"){ window.__qWorkerBroken=true; qWorkerDrop(); if(S.qres&&S.qres.loading){ qExecSync(); render(); } return; }
  if(m.type!=="result"&&m.type!=="error") return;
  if(m.seq!==S.qSeq){ return; }   /* 늦게 온 옛 결과(조건·범위를 바꿔 다시 찾았거나 취소함) — 덮어쓰지 않는다 */
  const Q=S.qres&&S.qres.loading&&S.qres.seq===m.seq?S.qres:null; if(!Q) return;
  if(m.type==="error"){ if(m.stale){ qWorkerDrop(); qExecSync(); render(); return; } S.qres={err:"검색 중 문제가 생겼습니다(워커): "+m.message}; render(); return; }
  if(m.err){ S.qres={err:m.err}; render(); return; }
  const P=Q.P; const order=[]; (function walk(n){ order.push(n); n.ch.forEach(walk); })(P.root); order.forEach((n,i)=>n.k=i);   /* 워커와 같은 순서(같은 walk) */
  const hits=new Map(m.hits.map(([vi,ws])=>[vi,new Set(ws)])), why=new Map(m.why);
  S.qres={hits,why,fp:m.fp,n:m.n,capped:m.capped,limitHit:m.limitHit,stepsHit:m.stepsHit,status:m.limitHit?"limit":m.stepsHit?"steps":"full",ms:m.ms,wall:Math.round(performance.now()-Q.t0),engine:"worker",text:Q.text,canon:Q.canon,P,order,outTotal:m.n,range:Q.range,rg:Q.rg,prev:Q.prev,fromNote:Q.fromNote}; S.more=1; render(); }
function qCancel(){ const S=view.st; if(!(S.qres&&S.qres.loading&&S.qres.seq!=null)) return; S.qSeq=(S.qSeq||0)+1; qWorkerDrop(); S.qres=S.qres.prevRes||null; render(); }
function qExec(){ const S=view.st; S.qPending=null; const text=S.qMode==="text"?S.qt:qGen(S.qb||qNew("clause")); const P=qParse(text); const sp=stSpans();
  /* 이 범위(책·장)만 찾을 때는 그 책 자료만 받고, 구약 전체일 때만 전체 자료를 받는다 */
  if(sp){ const need=[...new Set(sp.map(x=>x[0]))].filter(b=>!SD.loaded.has(b)); if(need.length){ S.qres={err:`${need.map(b=>PLAN.full[b-1]).join(", ")} 자료를 받는 중입니다. 다 받으면 자동으로 실행합니다.`,loading:true}; Promise.all(need.map(b=>loadBook(b))).then(()=>{ qExec(); render(); }).catch(()=>{}); return; } }
  else if(!SD.allLoaded){ S.qres={err:`구약 전체 자료를 받는 중입니다 (${loadedCount()}/39권). 다 받으면 자동으로 실행합니다.`,loading:true}; ensureAll().then(()=>{ qExec(); render(); }).catch(()=>{}); return; }
  if(P.err){ S.qres={err:P.err}; return; }
  if(!qWorkerOn()){ qExecSync(); return; }
  const w=qWorkerGet(); if(!w){ qExecSync(); return; }
  const seq=S.qSeq=(S.qSeq||0)+1; const prev=S.qres&&S.qres.hits?{n:S.qres.n,text:S.qres.text}:null; const prevRes=S.qres&&S.qres.hits?S.qres:null;
  S.qres={loading:true,seq,err:"찾는 중입니다… 화면은 그대로 쓸 수 있습니다.",t0:performance.now(),text,canon:qCanon(P),P,range:stRangeLabel(),rg:qRangeOf(),prev,prevRes,fromNote:S.qFromNote||null}; S.qFromNote=null;
  try{ qWorkerSend(w); w.postMessage({type:"run",seq,key:w.key,text,sp,limit:20000}); }catch(e){ qWorkerDrop(); window.__qWorkerBroken=true; qExecSync(); } }
/* 주 스레드 실행(워커 없을 때·시험용). 같은 엔진 함수(study_qe.js)를 그대로 쓴다 */
function qExecSync(){ const S=view.st; const text=S.qMode==="text"?S.qt:qGen(S.qb||qNew("clause")); const P=qParse(text); const sp=stSpans(); if(P.err){ S.qres={err:P.err}; return; }
  const fromNote=(S.qres&&S.qres.loading&&S.qres.fromNote)||S.qFromNote||null; const prev=S.qres&&S.qres.hits?{n:S.qres.n,text:S.qres.text}:(S.qres&&S.qres.loading?S.qres.prev:null);
  let r; try{ r=qRun(P,sp,20000); }catch(e){ S.qres={err:"검색 중 문제가 생겼습니다: "+e.message}; return; }
  const rg=qRangeOf(); S.qres={hits:qHits(r),why:qWhyIndex(r),fp:qFingerprint(r),n:r.out.length,capped:r.capped,limitHit:r.limitHit,stepsHit:r.stepsHit,status:r.limitHit?"limit":r.stepsHit?"steps":"full",ms:r.ms,wall:r.ms,engine:"main",text,canon:qCanon(P),P,order:r.order,outTotal:r.out.length,range:stRangeLabel(),rg,prev,fromNote}; S.qFromNote=null; S.more=1; }
/* 절마다 실제로 맞은 묶음 수와 대표 묶음(최대 3개)을 실행 때 보존한다 — 결과 전체(상한 20,000)를 훑으므로 뒤쪽 절도 근거를 잃지 않는다 */
/* 결과 지문: 묶음마다 (단위, 첫 낱말 BHSA 번호, 낱말 수)를 적어 정렬한 뒤 해시. 내부 색인이 아니라 BHSA 낱말 번호를 쓰므로 자료를 다시 만들어도 같은 판이면 같다 */
function qStatusKo(st){ return st==="limit"?"상한 20,000건까지만":st==="steps"?"계산 중단(전체 아님)":"전체 계산"; }
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
  const ops=idx>0?["","<","<:"]:(parentT?["","=:",":="]:[]); if(b.op&&!ops.includes(b.op)) ops.push(b.op);   /* 상자 메뉴에 없는 관계 기호도 지우지 않고 보인다 */
  return `<div class="qblk qt-${b.t}"><div class="qhd">${ops.length?`<select class="qop" data-qop="${path}">${ops.map(o=>`<option value="${esc(o)}"${b.op===o?" selected":""}>${idx>0?(o===""?"순서 상관없이":o==="<"?"위의 것보다 뒤에":o==="<:"?"위의 것 바로 뒤에":"관계 "+o+" (직접 쓰기에서 고침)"):(o===""?"안 어디든":o==="=:"?"맨 앞에":o===":="?"맨 끝에":"관계 "+o+" (직접 쓰기에서 고침)")}</option>`).join("")}</select>`:""}${b.name?`<span class="qchip qname" title="이름(직접 쓰기에서 관계식에 씀)">${esc(b.name)}:</span>`:""}<select class="qtype" data-qtype="${path}">${typeOpts}</select>${path!=="r"?`<button class="qx" data-qdel="${path}" aria-label="상자 지우기">✕</button>`:""}</div>
    <div class="qfs">${f}${b.x.map((s,i)=>`<span class="qchip">${esc(s)}<button class="qx" data-qxx="${path}" data-i="${i}">✕</button></span>`).join("")}</div>
    ${b.ch.map((c,i)=>qBlockHTML(c,path+"."+i,b.t,i)).join("")}
    ${path==="r"&&b.rels&&b.rels.length?`<div class="qfs"><span class="label" style="margin:0">이름 관계(상자로는 보기만, 고치려면 '직접 쓰기')</span>${b.rels.map(r=>`<span class="qchip">${esc(r.a+" "+r.op+" "+r.b)}</span>`).join("")}</div>`:""}
    <div class="qadd">${b.t!=="word"?`<button class="btn ghost small" data-qin="${path}">＋ 이 안에 조건 넣기</button>`:""}</div></div>`; }
/* 텍스트 → 상자: 왕복이 뜻을 보존할 때만 옮긴다. 아니면 원본 텍스트를 그대로 두고 무엇이 안 되는지 알린다 */
function qToBlocks(S){ const t=document.getElementById("qText"); if(t) S.qt=t.value; const R=qRoundTrip(S.qt); if(R.err&&!R.block){ toast("검색식을 상자로 옮기지 못했습니다: "+R.err); return false; }
  if(!R.ok){ S.qres=null; sheet("상자로 옮기지 못합니다",`<p class="lead">이 검색식에는 상자 화면이 그대로 담지 못하는 조건이 있어, 옮기면 뜻이 달라집니다. 원본 검색식은 그대로 두었습니다('직접 쓰기'에서 계속 고치세요).</p><p class="lead"><b>상자에서 사라지는 것</b></p><ul>${(R.lost||[]).map(x=>`<li><code>${esc(x)}</code></li>`).join("")||"<li>(알 수 없음)</li>"}</ul>`); return false; }
  S.qb=R.block; if(R.readonly.length) toast("옮겼습니다. 상자로는 보기만 되는 조건 "+R.readonly.length+"개: "+R.readonly.slice(0,2).join(", ")+(R.readonly.length>2?" …":"")); return true; }
function qAt(path){ let b=view.st.qb; if(path==="r") return b; for(const i of path.split(".").slice(1)) b=b.ch[+i]; return b; }
function renderQuery(){ const S=view.st; S.qb ||= (()=>{ const r=qNew("clause"); r.ch.push(qNew("word")); return r; })(); S.qMode ||= "blocks"; S.qkey ||= null;
  const text=qGen(S.qb); const R=S.qres; const hasRes=!!(R&&(R.hits||R.err));
  let h=`<section class="sec"><h2 class="qtitle">원문에서 문장 패턴 찾기</h2><p class="lead" style="margin:0 0 8px">단어뿐 아니라 낱말의 형태, 문장 속 역할, 앞뒤 관계를 결합해 같은 언어적 현상을 찾아봅니다.</p>${window.UX2?`<p class="lead qwhy0"><b>언제 쓰나요?</b> '낱말 찾기'는 <i>어떤 낱말</i>이 어디 나오는지 찾습니다. 여기서는 <i>어떤 모양의 문장</i>을 찾습니다 — "여호와가 주어인 문장", "'보라' 뒤에 분사가 오는 절"처럼 낱말 하나로는 찾을 수 없는 것. 아래 질문 하나를 눌러 보면 바로 압니다.</p>`:""}`;
  /* 연구 질문: 결과가 있으면 접어 두되 언제나 다시 고를 수 있다 */
  const qlist=`<div class="qqs">${Q_QUESTIONS.map(x=>`<button class="qq${S.qkey===x.key?" on":""}" data-qq="${esc(x.key)}"><b>${esc(x.q)}</b><small>${esc(x.desc)}</small></button>`).join("")}</div>`;
  const pending=!!(S.qPending&&!hasRes&&!S.qEdit); if(pending) h+=qPendingHTML();   /* 검색 메모에서 왔으면 그 카드를 맨 위에 */
  h+=hasRes||S.qkey==="__custom"||pending?`<details class="mdet qqd"${S.qOpenQs?" open":""}><summary>다른 연구 질문 보기</summary>${qlist}</details>`:qlist;
  h+=`</section>`;
  const editing=S.qEdit||S.qkey==="__custom";   /* 첫 화면은 질문만; 편집기는 '직접 만들기'나 '조건 고치기'를 눌렀을 때 */
  if(!hasRes&&!editing&&!pending) h=h.replace("</section>",`<div class="qrange"><span class="label">찾는 범위 — <b>${esc(stRangeLabel())}</b> <small>(책·장은 아래 단추나 위의 장 이름에서, 전체는 전환 단추로)</small></span>${rangeBox()}<div class="row" style="margin-top:4px"><button class="btn ghost small" id="qPickRange">책·장 범위 고르기</button></div></div><div class="row" style="margin-top:6px"><button class="btn ghost small" id="qSaved">보관함 ${qSavedList().length}</button></div></section>`);
  /* 지금 조건: 결과가 있을 때는 쉬운 말 한 줄 + '조건 고치기'. 고치기를 누르면 편집기가 펼쳐진다 */
  if(hasRes&&!S.qEdit&&S.qkey!=="__custom"){ const P=R.P||qParse(R.text||text); const QQ=Q_QUESTIONS.find(x=>x.key===S.qkey&&x.desc&&Q_RECIPES[x.key]===R.text); h+=`<section class="sec"><span class="label">지금 조건 <small>· 범위 ${esc(R.range||stRangeLabel())}</small></span>${QQ?`<p class="lead" style="margin:0 0 6px"><b>${esc(QQ.desc)}</b></p>`:""}${qFromNoteHTML()}<div class="qsay">${P&&!P.err?qSayAll(qFromParse(P.root,P)):esc(R.text||text)}</div><pre class="qsrc qmini" dir="ltr">${esc((R.text||text).trim())}</pre><div class="row"><button class="btn small" id="qEditBtn">조건 고치기</button><button class="btn small ghost" id="qRun">다시 찾기</button><button class="btn ghost small" id="qSave">보관</button><button class="btn ghost small" id="qSaved">보관함 ${qSavedList().length}</button></div>${rangeBox()}<div class="row" style="margin-top:4px"><button class="btn ghost small" id="qPickRange">책·장 범위 고르기</button></div>${qChangedNote()}</section>`; }
  if(editing){ h+=`<section class="sec">${rangeBox()}<div class="seg sseg" style="margin-top:4px">${[["blocks","골라서 만들기"],["text","검색식 직접 쓰기"]].map(([k,n])=>`<button aria-checked="${S.qMode===k}" data-qmode="${k}">${n}</button>`).join("")}</div>`;
    if(S.qMode==="blocks"){ h+=`${S.qkey==="__custom"&&!hasRes?qIntro():""}${qBlockHTML(S.qb,"r","",0)}
       <details class="qtxt"><summary>만든 검색식 보기 (Text-Fabric)</summary><pre>${esc(text)}</pre><div class="row"><button class="btn ghost small" id="qCopy">알파알렙·SHEBANQ용으로 복사</button><button class="btn ghost small" id="qToText">직접 고치기</button></div></details>`; }
    else h+=`<p class="lead">Text-Fabric 검색식을 씁니다. 두 칸씩 들여 써서 큰 단위 안에 작은 단위를 둡니다. 조건은 띄어쓰기 없이 <code>sp=verb</code>처럼 씁니다. 범위는 위에서 고른 것을 따릅니다.</p><textarea id="qText" class="qsrc" rows="7" spellcheck="false" dir="ltr">${esc(S.qt||text)}</textarea><div class="row"><button class="btn ghost small" id="qToBlocks">상자로 옮기기</button><button class="btn ghost small" id="qHelp">쓸 수 있는 것</button></div>${S.qHelp?qHelpHTML():""}`;
    if(S.qMode==="blocks") h+=`<div class="qsay"><b>읽어 보면</b> ${qSayAll(S.qb)}</div>`;
    h+=`${hasRes?qChangedNote():""}<div class="row"><button class="btn" id="qRun" style="flex:1">${hasRes?"다시 찾기":"찾기"}</button>${hasRes&&S.qEdit?`<button class="btn ghost small" id="qEditOff">고치기 닫기</button>`:""}<button class="btn ghost small" id="qSave" title="이 검색식을 이름 붙여 보관">보관</button><button class="btn ghost small" id="qSaved">보관함 ${qSavedList().length}</button></div></section>`; }
  if(R){ h+=`<section class="sec" id="qResults">`; if(R.err) h+=`<p class="${R.loading?"lead":"qerr"}">${esc(R.err)}${R.loading&&R.seq!=null?` <button class="btn small ghost" id="qCancel">취소</button>`:""}</p>`; else {
      const cnt=R.limitHit?`<b>${R.n.toLocaleString()}건 이상</b> (처음 20,000건까지만 세었습니다 — 전체 건수가 아닙니다)`:R.stepsHit?`<b>${R.n.toLocaleString()}건까지 찾고 중단</b> (계산이 너무 커서 끝까지 보지 못했습니다 — 범위를 좁히거나 조건을 더 넣으세요)`:`<b>${R.n.toLocaleString()}건</b>`;
      h+=`<p class="lead"><b>${esc(R.range||stRangeLabel())}</b>에서 ${cnt}, ${R.hits.size.toLocaleString()}절 · ${R.ms}ms${R.prev&&R.prev.n!=null&&R.prev.text!==R.text?` · <span class="qdelta">바로 전 조건은 ${R.prev.n.toLocaleString()}건</span>`:""}</p>${distBars(R.hits,stSpans())}`;
      h+=qStepsHTML();
      h+=qHitList(R,S.more);
      if(R.hits.size){ h+=`<div class="qhow"><span class="label">이렇게 연구해 보세요</span><ul>${qResearchHints(R.P||qParse(R.text)).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="row"><button class="btn small" id="qNote">이 검색에 관찰·해석 쓰기</button><button class="btn small ghost" id="qSave2">검색식 보관</button></div><p class="lead" style="margin:4px 0 0">결과를 누르면 본문이 열리고, 본문 위의 '← 검색 결과로' 단추로 돌아옵니다. 메모는 결과 줄의 '메모'로 그 절에 바로 남길 수도 있습니다.</p></div>`; } }
    h+=`</section>`; }
  return h; }
/* 조건이 바뀌었는데 옛 결과가 보일 때 */
function qChangedNote(){ const S=view.st, R=S.qres; if(!R||!R.hits||!R.canon) return ""; const cur=qCurrentText(); const P=qParse(cur); const condChg=!P.err&&qCanon(P)!==R.canon; const rangeChg=R.range&&R.range!==stRangeLabel();
  if(!condChg&&!rangeChg) return ""; return `<p class="lead warn qchg">⚠ ${condChg?"검색 조건":""}${condChg&&rangeChg?"과 ":""}${rangeChg?`검색 범위(${esc(R.range)} → ${esc(stRangeLabel())})`:""}가 변경되었습니다. 아래 결과는 이전 것입니다 — <button class="btn small" data-qrerun="1">다시 찾기</button></p>`; }
/* '보라' 예시의 단계별 학습 카드 */
function qExampleLive(){ const S=view.st, R=S.qres; if(!R||!R.canon||!S.qkey||!Q_RECIPES[S.qkey]) return false; const P=qParse(Q_RECIPES[S.qkey]); return !P.err&&qCanon(P)===R.canon; }
function qStepsHTML(){ const S=view.st, steps=Q_STEPS[S.qkey], R=S.qres; if(!steps||!R||!R.canon) return ""; const cur=S.qstep||0;
  /* 지금 실행된 식이 이 예시의 단계 가운데 하나와 같을 때만(조건을 크게 바꿨거나 다른 식을 실행했으면 안내를 내린다) */
  if(!steps.some(st=>{ if(!st.text) return false; const P=qParse(st.text); return !P.err&&qCanon(P)===R.canon; })) return "";
  return `<div class="qsteps"><span class="label">다음 단계 — 조건을 바꿔 보기 <small>(${cur+1}/${steps.length})</small></span><div class="qstepbar">${steps.map((st,i)=>`<button class="qstep${i===cur?" on":i<cur?" done":""}" data-qstep="${i}">${i+1}. ${esc(st.n)}</button>`).join("")}</div><p class="lead" style="margin:4px 0 0">${esc(steps[cur].say)}${steps[cur].text&&S.qres&&S.qres.prev&&S.qres.prev.n!=null&&S.qres.prev.text!==S.qres.text?` — 결과 ${S.qres.prev.n.toLocaleString()}건 → ${S.qres.n.toLocaleString()}건`:""}</p>${steps[cur].text?`<pre class="qsrc qmini" dir="ltr">${esc(steps[cur].text.trim())}</pre>`:""}</div>`; }
/* 결과 목록: 절마다 원문(일치 낱말 강조) + '맞은 자리' + '메모' */
function qHitList(R,more){ const hits=R.hits; const vs=[...hits.keys()].sort((a,b)=>a-b); if(!vs.length) return `<p class="lead">찾은 곳이 없습니다. 조건을 줄이거나 범위를 넓혀 보세요.</p>`;
  const lim=30*(more||1);
  let h=`<div class="shits">`+vs.slice(0,lim).map(vi=>{ const H=sHeb(vi), set=hits.get(vi);
    const heb=H.map((t,j)=>{ const wi=SD.V[vi][5]+j; return set.has(wi)?`<mark>${esc(t.trimEnd())}</mark>${t.endsWith(" ")?" ":""}`:esc(t); }).join("");
    const words=[...set].map(wi=>{ const j=wi-SD.V[vi][5]; return `${esc(sHan(vi)[j])}`; }).join(", ");
    return `<div class="qhit"><button class="shit" data-svi="${vi}" data-swj="${[...set][0]}"><small>${esc(sRef(vi))}${words?` · ${words}`:""}</small><span class="heb">${heb}</span><span class="kr">${esc(krvText(vi))}</span></button><div class="qhitb"><button class="btn small ghost" data-qwhy="${vi}">맞은 자리</button><button class="btn small ghost" data-qmemo="${vi}">메모</button></div><div class="qwhy" id="qwhy-${vi}" hidden></div></div>`; }).join("")+`</div>`;
  if(vs.length>lim) h+=`<button class="morebtn" data-smore="1">${vs.length-lim}절 더 보기 ▾</button>`; return h; }
/* 맞은 자리: 이 절에 걸린 묶음(튜플)마다 조건 → 실제로 맞은 본문 */
/* 조건 하나를 쉬운 말로: 자료가 판정한 범위만 말한다(조건 없는 단위는 '아무 절'처럼) */
function qNodeKo(nd){ const b=qFromParse(nd,null); b.ch=[]; const t=qSay(b).replace(/<[^>]+>/g,""); return t; }
const Q_OPK={"<":"앞의 표현보다 뒤에 나타남","<:":"앞의 표현 바로 뒤에 나타남","=:":"맨 앞에 나타남",":=":"맨 끝에 나타남","::":"같은 자리에서 시작과 끝","==":"같은 범위","&&":"겹침","##":"겹치지 않음","[[":"안에 품음","]]":"안에 있음",">":"앞의 표현보다 앞에 나타남",":>":"앞의 표현 바로 앞에 나타남","=":"같은 것","#":"다른 것"};
function qWhyHTML(R,vi){ const order=R.order; const e=R.why&&R.why.get(vi); if(!e) return `<p class="lead">이 절의 근거를 찾지 못했습니다.</p>`;
  const condTxt=nd=>nd.conds.length?nd.conds.map(c=>`${c.f}${c.o||"="}${Array.isArray(c.v)?c.v.join("|"):c.v}`).join(" "):"(조건 없음)";
  const txt=(T,id)=>{ const ws=[...qWords(T,id)]; const t=ws.slice(0,8).map(w=>wHeb(w)).join("").trim(); return (ws.length>8?t+" …":t)||"—"; };   /* 접두어 뒤 공백은 원문 trailer 를 따른다 */
  const rows=e.t.map((tup,i)=>`<div class="qwhyt"><b>묶음 ${i+1}</b>${order.map((nd,k)=>{ const a=tup[k]; const rel=nd.op?` <em>— ${esc(Q_OPK[nd.op]||nd.op)}</em>`:""; return `<div class="qwhyr" style="padding-left:${(nd.ind||0)*6+4}px"><span class="qwhyc">${esc(qNodeKo(nd))}${rel}</span> → <span class="heb">${esc(txt(...a))}</span></div>`; }).join("")}</div>`).join("");
  const rels=R.P&&R.P.rels.length?`<p class="lead">이름 붙인 관계: ${esc(R.P.rels.map(r=>`${r.a} 가 ${r.b} ${(Q_OPK[r.op]||r.op).replace("앞의 표현","")}`).join(", "))}</p>`:"";
  const cnt=`이 절에서 맞은 묶음 <b>${e.n}</b>개${e.t.length<e.n?` 가운데 ${e.t.length}개를 보입니다`:""}${R.status==="limit"?" (상한 20,000건 안에서 센 것 — 실제는 더 있을 수 있음)":R.status==="steps"?" (계산이 중단되어 실제는 더 있을 수 있음)":""}.`;
  const look=qResearchHints(R.P)[0]||"";
  return `<p class="lead" style="margin:0 0 4px">${cnt} 각 줄은 <b>조건 → 실제로 맞은 원문</b>입니다.</p>${rows}${rels}<p class="lead qlook"><b>본문에서 살펴볼 것</b> ${esc(look)}</p><details class="qcode"><summary>자료 코드로 보기</summary>${e.t.map((tup,i)=>`<div class="qwhyt"><b>묶음 ${i+1}</b>${order.map((nd,k)=>`<div class="qwhyr" style="padding-left:${(nd.ind||0)*6+4}px"><code>${esc(QT_K[nd.t])} ${esc(condTxt(nd))}${nd.op?" "+esc(nd.op):""}</code> → <code>${esc(tup[k][0])}#${esc(String(tup[k][1]))}</code></div>`).join("")}</div>`).join("")}<pre class="qsrc qmini" dir="ltr">${esc((R.text||"").trim())}</pre></details>`; }
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
  m.querySelectorAll("#qCancel").forEach(b=>b.onclick=()=>qCancel());
  m.querySelectorAll("#qPickRange").forEach(b=>b.onclick=()=>{ S.pick=true; S.pk={b:S.R?S.R.b:1,c1:null,c2:null}; render(); scrollTo({top:0}); });
  m.querySelectorAll("#qRerunNote").forEach(b=>b.onclick=()=>{ const Pn=S.qPending; if(!Pn) return; S.qPending=null; S.qFromNote=Pn.from; qExec(); render(); document.getElementById("qResults")?.scrollIntoView({block:"start"}); });
  m.querySelectorAll("[data-qq]").forEach(b=>b.onclick=()=>{ const k=b.dataset.qq; S.qEdit=false; S.qOpenQs=false; if(k==="__custom") qOpenCustom(); else qOpen(k); });
  m.querySelectorAll(".qqd").forEach(d=>d.ontoggle=()=>{ S.qOpenQs=d.open; });
  const eb=m.querySelector("#qEditBtn"); if(eb) eb.onclick=()=>{ S.qEdit=true; if(S.qres&&S.qres.text&&S.qMode==="text") S.qt=S.qres.text; rr(); setTimeout(()=>document.querySelector(".qblk, #qText")?.scrollIntoView({block:"start"}),30); };
  const eo=m.querySelector("#qEditOff"); if(eo) eo.onclick=()=>{ S.qEdit=false; rr(); };
  m.querySelectorAll("[data-qrerun]").forEach(b=>b.onclick=()=>{ const t=document.getElementById("qText"); if(t) S.qt=t.value; qExec(); S.qEdit=false; render(); document.getElementById("qResults")?.scrollIntoView({block:"start"}); });
  m.querySelectorAll("[data-qstep]").forEach(b=>b.onclick=()=>{ const steps=Q_STEPS[S.qkey]; const i=+b.dataset.qstep, st=steps[i]; S.qstep=i; if(st.text){ S.qt=st.text; const P=qParse(st.text); if(!P.err) S.qb=qFromParse(P.root,P); qExec(); render(); document.querySelector(".qsteps")?.scrollIntoView({block:"start"}); } else { rr(); document.querySelector(".shits")?.scrollIntoView({block:"start"}); } });
  m.querySelectorAll("[data-qwhy]").forEach(b=>b.onclick=()=>{ const vi=+b.dataset.qwhy, box=document.getElementById("qwhy-"+vi); if(!box) return; if(box.hidden){ box.innerHTML=qWhyHTML(S.qres,vi); box.hidden=false; b.textContent="닫기"; } else { box.hidden=true; b.textContent="맞은 자리"; } });
  m.querySelectorAll("[data-qmemo]").forEach(b=>b.onclick=()=>{ if(window.openAnnotEditor) openAnnotEditor("verse",+b.dataset.qmemo); });
  const qn=m.querySelector("#qNote"); if(qn) qn.onclick=qNoteForSearch; const qs2=m.querySelector("#qSave2"); if(qs2) qs2.onclick=()=>qSaveCurrent();
  m.querySelectorAll("[data-smore]").forEach(b=>b.onclick=()=>{ S.more=(S.more||1)+1; rr(); });
  const qs=m.querySelector("#qSave"); if(qs) qs.onclick=()=>{ if(S.qMode==="text"){ const ta=document.getElementById("qText"); if(ta) S.qt=ta.value; } qSaveCurrent(); };
  const ql=m.querySelector("#qSaved"); if(ql) ql.onclick=qOpenSaved;
  m.querySelectorAll("[data-qmode]").forEach(b=>b.onclick=()=>{ if(b.dataset.qmode==="text"&&S.qMode!=="text") S.qt=qGen(S.qb); if(b.dataset.qmode==="blocks"&&S.qMode==="text"){ if(!qToBlocks(S)) return; } S.qMode=b.dataset.qmode; rr(); });
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
  const run=document.getElementById("qRun"); if(run) run.onclick=()=>{ const t=document.getElementById("qText"); if(t) S.qt=t.value; if(S.qEdit!==undefined&&S.qkey!=="__custom"&&!S.qEdit&&S.qres&&S.qres.text&&S.qMode!=="text"){ /* 결과 화면의 '다시 찾기': 지금 상자 상태로 */ } run.textContent="찾는 중…"; setTimeout(()=>{ qExec(); S.qEdit=false; render(); document.getElementById("qResults")?.scrollIntoView({block:"start"}); },30); };
  const tx=document.getElementById("qText"); if(tx) tx.oninput=()=>{ S.qt=tx.value; };
  const cp=document.getElementById("qCopy"); if(cp) cp.onclick=async()=>{ const t=qWrapRange(qGen(S.qb)); try{ await navigator.clipboard.writeText(t); toast("검색식을 복사했습니다. 범위도 book 줄로 넣었습니다."); }catch(e){ toast("복사하지 못했습니다. 길게 눌러 직접 복사해 주세요."); } };
  m.querySelectorAll(".qintro").forEach(d=>d.ontoggle=()=>{ if(!d.open) S.qIntroSeen=1; });
  const tt=document.getElementById("qToText"); if(tt) tt.onclick=()=>{ S.qt=qGen(S.qb); S.qMode="text"; rr(); };
  const tb=document.getElementById("qToBlocks"); if(tb) tb.onclick=()=>{ if(!qToBlocks(S)) return; S.qMode="blocks"; rr(); };
  const hp=document.getElementById("qHelp"); if(hp) hp.onclick=()=>{ S.qHelp=!S.qHelp; rr(); };
}

/* 검색 결과에 관찰·해석 쓰기: 범위 안이면 그 범위의 구간 메모, 구약 전체면 첫 결과 절의 절 메모. 검색식과 건수를 참조로 담는다 */
function qNoteForSearch(){ const S=view.st, R=S.qres; if(!R||!R.hits||!window.openAnnotEditor) return; const vs=[...R.hits.keys()].sort((a,b)=>a-b); const sp=stSpans(); let anchor, kind;
  if(sp){ const V=spanVerses(sp); anchor=anchorRange(V[0],V[V.length-1]); kind="range"; } else { anchor=anchorVerse(vs[0]); kind="verse"; }
  anchor.query={text:R.text,range:R.range,rg:R.rg||qRangeOf(),n:R.n,capped:!!R.capped,status:R.status||"full",verses:R.hits.size,bhsa:SD.bhsa||"2021",canon:R.canon,fp:R.fp,fpv:1};
  openAnnotEditor(kind,kind==="verse"?vs[0]:null,{kind,key:"q:"+(R.canon||R.text).length+":"+anchor.span?.from_word,anchor,_new:true,tags:["검색식"],observation:`검색식(${R.range}, ${R.n}건${R.capped?"+":""}):\n${R.text.trim()}\n관찰: `}); }
/* 기록 탭의 검색 메모 → 검색 화면으로 돌아와 같은 식·범위로 다시 실행하고, 기록 당시 결과와 견준다(판정이 아니라 재현 확인) */
function qOpenFromAnnot(a){ const q=a&&a.anchor&&a.anchor.query; if(!q||!q.text) return false; const S=view.st;
  if(q.rg) qApplyRange(q.rg); else if(q.range==="구약 전체") S.wide=true; else { S.wide=false; if(a.anchor.book) setRange({b:a.anchor.book,c1:a.anchor.ch,c2:a.anchor.span?a.anchor.span.to_ch||a.anchor.ch:a.anchor.ch}); }   /* 옛 메모: 범위 이름과 메모의 닻으로 복원 */
  S.mode="query"; S.rmode="query"; S.qMode="text"; S.qt=q.text; S.qkey=null; S.qstep=0; S.qEdit=false; S.qres=null; S.qPending={from:{n:q.n,status:q.status||(q.capped?"limit":"full"),bhsa:q.bhsa,range:q.range,when:a.updated||a.created,id:a.id,fp:q.fp||null,canon:q.canon||null},obs:a.observation||"",text:q.text}; render(); scrollTo({top:0}); return true; }
/* 재실행 결과와 기록을 견준 판정(다섯 가지) — 건수가 같다는 것은 본문이 같다는 증거가 아니므로 지문으로 판단한다 */
function qSameVerdict(F,R){ const bhsaSame=(F.bhsa||"2021")===(SD.bhsa||"2021"), condSame=!F.canon||F.canon===R.canon, nSame=Number(F.n)===R.n;
  if(!F.fp) return {k:"nofp",ok:false,msg:`동일성 확인 불가 — 옛 기록이라 결과 지문이 없습니다(건수 ${nSame?"같음":"다름"}${bhsaSame?"":" · 자료 판 다름"}${condSame?"":" · 조건 다름"}). 이번 실행으로 메모를 다시 저장하면 다음부터 확인할 수 있습니다.`};
  const partial=(F.status||"full")!=="full"||(R.status||"full")!=="full";
  if(F.fp===R.fp) return partial?{k:"partial-same",ok:true,msg:`상한·중단이 있어 확인된 범위까지만 비교 — 그 안에서는 지문이 같습니다(${qStatusKo(F.status)} → ${qStatusKo(R.status)}).`}:{k:"same",ok:true,msg:"전체 검색을 마쳤고 결과 지문이 같습니다 — 동일한 검색 결과로 확인."};
  if(partial) return {k:"partial-diff",ok:false,msg:`상한·중단이 있어 확인된 범위까지만 비교 — 그 안에서 지문이 다릅니다(${qStatusKo(F.status)} → ${qStatusKo(R.status)})${bhsaSame?"":" · 자료 판 다름"}${condSame?"":" · 조건 다름"}.`};
  return {k:"diff",ok:false,msg:nSame?`건수는 같지만 결과 지문이 다릅니다 — 일치한 본문이 달라졌습니다${bhsaSame?"":"(자료 판 다름)"}${condSame?"":"(조건 다름)"}.`:`결과 지문이 다릅니다 — 검색 결과가 달라졌습니다${bhsaSame?"":"(자료 판 다름)"}${condSame?"":"(조건 다름)"}.`}; }
/* 검색 메모를 열었을 때: 기록 당시 정보와 '이 검색 다시 실행' 단추(누르기 전에는 실행하지 않는다) */
function qPendingHTML(){ const Pn=view.st.qPending; if(!Pn) return ""; const F=Pn.from;
  return `<div class="qpend"><span class="label">검색 메모에서 열었습니다</span><p class="lead" style="margin:0 0 6px">기록 당시(${F.when?new Date(F.when).toLocaleDateString("ko-KR"):"날짜 없음"}): ${F.range?esc(F.range)+" · ":""}${Number(F.n).toLocaleString()}건 · ${qStatusKo(F.status)} · BHSA ${esc(F.bhsa||"?")}. 지금 범위: <b>${esc(stRangeLabel())}</b></p>${Pn.obs?`<p class="lead" style="margin:0 0 6px"><b>관찰</b> ${esc(Pn.obs.split("\n").slice(-1)[0]).slice(0,160)}</p>`:""}<pre class="qsrc qmini" dir="ltr">${esc(Pn.text.trim())}</pre><div class="row"><button class="btn" id="qRerunNote" style="flex:1">이 검색 다시 실행</button><button class="btn ghost small" id="qEditBtn">조건 고치기</button></div></div>`; }
function qFromNoteHTML(){ const R=view.st.qres, F=R&&R.fromNote; if(!F) return ""; const V=qSameVerdict(F,R);
  return `<p class="lead ${V.ok?"":"warn"} qfrom" data-verdict="${V.k}">검색 메모에서 다시 실행했습니다 — 기록 당시(${F.when?new Date(F.when).toLocaleDateString("ko-KR"):"날짜 없음"}): ${F.range?esc(F.range)+" · ":""}${Number(F.n).toLocaleString()}건 · ${qStatusKo(F.status)} · BHSA ${esc(F.bhsa||"?")} → 지금: ${esc(R.range)} · ${R.n.toLocaleString()}건 · ${qStatusKo(R.status)} · BHSA ${esc(SD.bhsa||"2021")}. <b>${esc(V.msg)}</b></p>`; }
/* ===== 검색식 보관함 (E-2): 이름·식·범위·작성일. 기기 localStorage "milal-study-queries" — 본문 연구 기록(annots)과 따로 둔다 ===== */
const QS_KEY="milal-study-queries";
function qSavedList(){ try{ const L=JSON.parse(localStorage.getItem(QS_KEY)||"[]"); return Array.isArray(L)?L.filter(q=>q&&q.text):[]; }catch(e){ return []; } }
function qSavedSet(L){ try{ localStorage.setItem(QS_KEY,JSON.stringify(L.slice(0,200))); return true; }catch(e){ toast("보관하지 못했습니다(저장 공간)."); return false; } }
function qCurrentText(){ const S=view.st; return S.qMode==="text"?(S.qt||""):qGen(S.qb||qNew("clause")); }
/* 실행 범위를 그대로 기록한다: 구약 전체(all) / 현재 책 전체(book) / 장·장 범위(chapter). 전 판은 S.wide 를 빼먹어 '구약 전체'로 찾은 식을 보관하면 책 범위로 재실행됐다 */
function qBookChs(b){ const B=SD.book&&SD.book[b]; return B&&B.chs?Math.max(...B.chs):null; }
/* 저장값은 실제 검색 대상(stSpans)에서 만든다: wide → all(구약 전체) / R 이 그 책의 1장~끝장 → book(책 전체) / 그 밖 → chapter(장·장 범위). 옛 S.range 는 쓰지 않는다 */
function qRangeOf(){ const S=view.st; const sp=stSpans(); if(!sp) return {range:"all",R:S.R?{b:S.R.b,c1:S.R.c1,c2:S.R.c2}:null,v:3};
  const [b,c1,c2]=sp[0]; const last=qBookChs(b); return {range:c1===1&&last&&c2===last?"book":"chapter",R:{b,c1,c2},v:3}; }
/* 보관된 범위를 그대로 되살린다. 옛 기록(v 없음)은 all 이 없으므로 책·장 범위로 복원(그때 S.wide 가 켜져 있었는지는 알 수 없음 — 목록에 '옛 기록' 표시) */
function qApplyRange(q){ const S=view.st; if(q.range==="book"&&q.R&&q.v>=3){ const last=qBookChs(q.R.b); setRange({b:q.R.b,c1:1,c2:last||q.R.c2}); } else if(q.R) setRange(q.R); S.wide=q.range==="all"; }
function qRangeLabel(q){ if(q.range==="all") return "구약 전체"; if(!q.R) return "범위 없음"; const R=q.R; if(!q.v||q.v<3) return `${PLAN.abbr[R.b-1]} ${R.c1===R.c2?R.c1:R.c1+"–"+R.c2}`;   /* 옛 기록: 실제 장 범위만 적고 '책 전체'라 하지 않는다 */
  return q.range==="book"?`${PLAN.full[R.b-1]} 전체 (1–${R.c2}장)`:`${PLAN.abbr[R.b-1]} ${R.c1===R.c2?R.c1:R.c1+"–"+R.c2}장`; }
function qSaveCurrent(){ const text=qCurrentText().trim(); if(!text){ toast("먼저 검색식을 만드세요."); return; } const P=qParse(text); if(P.err){ toast("검색식에 문제가 있어 보관하지 않았습니다: "+P.err); return; }
  const rg=qRangeOf(); sheet("검색식 보관",`<p class="lead">이름을 붙여 두면 보관함에서 다시 실행할 수 있습니다. 범위(${esc(qRangeLabel(rg))})도 함께 저장됩니다.</p><input id="qsName" type="text" placeholder="예: 창 22장 와이크톨+주어" style="width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);box-sizing:border-box"><pre class="qsrc" style="margin:8px 0;white-space:pre-wrap">${esc(text)}</pre><button class="sbtn" id="qsGo">보관하기</button>`);
  const go=()=>{ const name=(document.getElementById("qsName").value.trim()||text.split("\n")[0].slice(0,40)); const L=qSavedList(); L.unshift({id:Date.now().toString(36),name,text,range:rg.range,R:rg.R,v:rg.v,t:Date.now()}); if(qSavedSet(L)){ document.getElementById("sheetRoot").innerHTML=""; toast("보관했습니다."); render(); } };
  document.getElementById("qsGo").onclick=go; document.getElementById("qsName").onkeydown=e=>{ if(e.key==="Enter") go(); }; setTimeout(()=>document.getElementById("qsName").focus(),50); }
function qSavedMarkdown(L){ const d=t=>new Date(t).toLocaleDateString("ko-KR"); return ["# 검색식 보관함 (Text-Fabric)","",...L.flatMap(q=>[`## ${q.name}`,`- 범위: ${qRangeLabel(q)} · 작성일: ${d(q.t)}`,"","```",q.text,"```",""])].join("\n"); }
function qOpenSaved(){ const L=qSavedList(); const d=t=>new Date(t).toLocaleDateString("ko-KR");
  sheet(`검색식 보관함 · ${L.length}`,L.length?`<p class="lead">누르면 그 범위로 가서 바로 찾습니다. 본문 연구 기록(기록 탭)과는 따로 보관됩니다.</p><div class="snlist">${L.map(q=>`<div class="snitem"><button class="snjump" data-qsrun="${q.id}"><b>${esc(q.name)}</b><small>${esc(qRangeLabel(q))}${q.v>=2?"":" · 옛 기록(범위 표기 전)"} · ${d(q.t)}</small><span class="snm" style="direction:ltr;font-family:var(--f-mono,monospace);white-space:pre-wrap;font-size:12px">${esc(q.text.split("\n").slice(0,3).join("\n"))}${q.text.split("\n").length>3?"\n…":""}</span></button><button class="sndel" data-qscopy="${q.id}" aria-label="복사" title="Markdown 복사">⧉</button><button class="sndel" data-qsdel="${q.id}" aria-label="지우기">✕</button></div>`).join("")}</div><div class="row" style="margin-top:8px"><button class="btn small ghost" id="qsAllMd">전부 Markdown 으로 복사</button></div>`:`<p class="lead">아직 보관한 검색식이 없습니다. 검색식을 만들고 '보관'을 누르세요.</p>`);
  const root=document.getElementById("sheetRoot"), S=view.st;
  root.querySelectorAll("[data-qsrun]").forEach(b=>b.onclick=()=>{ const q=L.find(x=>x.id===b.dataset.qsrun); if(!q) return; root.innerHTML=""; qApplyRange(q); S.mode="query"; S.qMode="text"; S.qt=q.text; S.qres=null; S.qkey=null; S.qstep=0; S.qEdit=false; render(); qExec(); render(); scrollTo({top:0}); });
  root.querySelectorAll("[data-qsdel]").forEach(b=>b.onclick=()=>{ if(!confirm("이 검색식을 보관함에서 지울까요?")) return; qSavedSet(L.filter(x=>x.id!==b.dataset.qsdel)); qOpenSaved(); render(); });
  const copy=(txt,msg)=>{ if(navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast(msg),()=>toast("복사하지 못했습니다.")); else toast("이 브라우저는 복사를 지원하지 않습니다."); window.__lastQsCopy=txt; };
  root.querySelectorAll("[data-qscopy]").forEach(b=>b.onclick=()=>{ const q=L.find(x=>x.id===b.dataset.qscopy); if(q) copy(qSavedMarkdown([q]),"Markdown 으로 복사했습니다."); });
  const all=root.querySelector("#qsAllMd"); if(all) all.onclick=()=>copy(qSavedMarkdown(L),`검색식 ${L.length}개를 Markdown 으로 복사했습니다.`); }

