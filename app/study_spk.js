/* ===== 누가 말하나 — 말한 차례·말하는 이·듣는 이 (2026-10-22 목사님 승인) =====
   ① 말한 차례: BHSA 가 표시한 직접 인용(절 원자의 본문 갈래에 Q)을 한 덩어리씩 묶는다. 인용 안의 인용(QQ)은 한 단계 안쪽 차례.
   ② 말하는 이:
      가. 이야기 방식 — 인용 바로 앞의 '말하다·대답하다·부르다' 절. 주어가 있으면 그것(확실). 없으면 동사의 성·수와 맞는 이를 문맥에서 찾는다:
          그 사이 서술에 나온 주어 → 바로 앞 차례의 듣는 이(주고받음) → 앞에 나온 이름(사람·하나님·무리).
      나. 대화시 방식(아가처럼 말하기 동사가 없는 인용) — 절마다 단서를 모은다:
          '나'와 맞는 형용사·분사의 성(예: 검으나 아름다운 나 → 여자), '내 사랑하는 자(דּוֹדִי)'=여자가 하는 말, '내 사랑(רַעְיָתִי)'·'신부'=남자가 하는 말,
          2인칭의 성·수(너=여자에게 → 남자가 하는 말로 추정), 부르는 말(예루살렘 딸들아). 단서가 없으면 앞 절의 말하는 이가 이어진다고 본다.
   ③ 공용 자료(study/speakers.json cur): 목사님이 확인·고친 차례는 그대로 보이고 '확인됨'으로 표시한다. 앱이 정한 것은 '확실/추정'으로 구별한다.
   모든 판정은 원문 자료(BHSA)에서 나온 근거를 함께 보인다. ===== */
let SPK=null, SPKload=null;
function spkLoad(){ if(SPK) return Promise.resolve(SPK); return SPKload ||= fetch("study/speakers.json?v="+(window.STUDY_V||"")).then(r=>r.json()).then(j=>{ SPK=j; SPK.A=new Set(j.anim||[]); SPKload=null; return j; }).catch(e=>{ SPKload=null; SPK={A:new Set(),cur:{},err:1}; return SPK; }); }
const SPK_V=new Set([">MR[","DBR[","<NH[","QR>[","Y<Q[","Z<Q[","CB<[","NGD[","YWH[","BRK[","QLL[","CJR[","NB>[","NWM["]);
const SPK_NOT=new Set(["QWL/","DBR/","LB/","LBB/","JM/","NPC/","RWX/",">RY/","CMJM/","MJM/","JD/","PH/","LCWN/","GWRL/","JWM/","LJLH/","<JN/","XRB/",">C/","BJT/","<JR/","DM/","DRK/","MQWM/","KBWD/","CM/","XSD/",">MT/","CLWM/","DG/","SPJNH/",">NJH/","S<R/","ZRM/"]);
const SPK_LOVER_F=new Set(["DWD/"]), SPK_LOVER_M=new Set(["R<JH/","KLH/","JWNH/","TMH/"]);   /* 아가: 내 사랑하는 자(여자가 하는 말) / 내 사랑·신부·비둘기·완전한 자(남자가 하는 말) */
function spkLvl(j){ const t=SD.TXT[SD.ax[SD.wa[j]]]||""; return (t.match(/Q/g)||[]).length; }
const spkM=j=>SD.M[SD.wm[j]];
const spkNu=n=>n==="du"?"pl":n;
function spkAgree(e,g,n){ if(!n||n==="NA"||n==="unknown") return true; if(spkNu(e.nu)!==spkNu(n)) return false; return !g||g==="c"||g==="NA"||g==="unknown"||!e.gn||e.gn==="c"||e.gn==="NA"||e.gn==="unknown"||e.gn===g; }
function spkName(li,nu){ const x=SD.L[li]; if(x[1]==="DWD/") return "남자";   /* '내 사랑하는 자'(아가) = 남자 */ if(x[2]==="nmpr") return (x[9]||x[5]).replace(/\s*\([^)]*\)\s*$/,""); const g=lexGloss(li).split(/[,，]/)[0].trim(); return g+(spkNu(nu)==="pl"&&!/들$/.test(g)?"들":""); }
const SPK_GK={m:"남성",f:"여성",c:"공성"}, SPK_NK={sg:"단수",pl:"복수",du:"쌍수"};
const spkPngKo=(g,n)=>`${SPK_GK[g]||""} ${SPK_NK[n]||""}`.trim();
/* 낱말 → 장면에 나온 이(엔터티): 같은 낱말 이름이면 한 사람으로 본다 */
function spkEnt(E,li,gn,nu,heb,nxt){ if(SD.L[li][1]===">LHJM/"&&spkNu(nu)==="pl") nu="sg";   /* 엘로힘: 모양은 복수지만 하나님을 가리킬 때 단수 동사와 맞는다 */
  const key=SD.L[li][1]+"|"+spkNu(nu)+(nxt!=null?"|"+SD.L[nxt][1]:""); let e=E.get(key); if(!e){ e={key,li,name:spkName(li,nu)+(nxt!=null?`(${spkName(nxt,"sg")})`:""),gn:SD.L[li][2]==="nmpr"&&(!gn||gn==="NA"||gn==="unknown")?"m":gn,nu:spkNu(nu),heb}; E.set(key,e); } return e; }
/* 구(phrase) 하나의 사람 명사: 말할 수 있는 이름을 앞에, 없으면(주어일 때만) 다른 명사 */
function spkPhraseEnts(E,ws,subjOnly){ const out=[]; for(const j of ws){ const m=spkM(j), x=SD.L[SD.wl[j]]; if(m[0]!=="subs"&&m[0]!=="nmpr") continue; if(SPK_NOT.has(x[1])) continue; const an=SPK.A.has(x[1]); if(!an&&!subjOnly) continue; const st=m[6]; const nx=st==="c"?ws.find(w=>w>j&&(spkM(w)[0]==="subs"||spkM(w)[0]==="nmpr")):null;   /* 연계형(예: רַב הַחֹבֵל) → '우두머리(선장)' */
    out.push({e:spkEnt(E,SD.wl[j],m[4],m[5],wHeb(j).trim(),nx!=null?SD.wl[nx]:null),an,j}); if(st==="c"&&nx!=null) break; } out.sort((a,b)=>(b.an-a.an)); return out; }
/* 분석: 범위 앞 한 장부터 읽어 문맥을 잡고, 범위 안의 차례만 돌려준다 */
function spkAnalyze(sp){ const [b,c1,c2]=sp, ctxC=Math.max(1,c1-1); const V=spanVerses([[b,ctxC,c2]]), inR=new Set(spanVerses([sp]));
  const E=new Map(), words=[]; for(const vi of V){ const [, , , , ,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++) words.push(j); }
  /* 절 원자로 묶기 */
  const atoms=[]; for(const j of words){ const a=SD.wa[j]; let A=atoms[atoms.length-1]; if(!A||A.a!==a){ A={a,ws:[],lvl:spkLvl(j),vi:SD.vOf[j]}; atoms.push(A); } A.ws.push(j); }
  const turns=[]; const FN=k=>SD.FN.indexOf(k), SUBJ=new Set([FN("Subj"),FN("PreS")]), VOC=FN("Voct");
  const phrases=A=>{ const P=new Map(); for(const j of A.ws){ const k=SD.wp[j]; if(!P.has(k)) P.set(k,[]); P.get(k).push(j); } return [...P.values()]; };
  const isSubjPh=ws=>ws.some(j=>SUBJ.has(SD.wf[j]));
  /* 서술 속 주어(말할 수 있는 이 + 성·수가 맞는 동사) 기록 — 거꾸로 찾기용 */
  const subjAt=[]; atoms.forEach((A,k)=>{ for(const ph of phrases(A)) if(isSubjPh(ph)){ const es=spkPhraseEnts(E,ph,true); if(es.length) subjAt.push({k,lvl:A.lvl,es}); } });
  const ment=[]; atoms.forEach((A,k)=>{ for(const ph of phrases(A)){ for(const x of spkPhraseEnts(E,ph,false)) ment.push({k,lvl:A.lvl,e:x.e}); } });
  const speechVerb=A=>A.ws.find(j=>SPK_V.has(SD.L[SD.wl[j]][1])&&spkM(j)[0]==="verb");
  const finitePNG=(A)=>{ const v=A.ws.find(j=>spkM(j)[0]==="verb"&&spkM(j)[3]==="p3"); if(v==null) return null; const m=spkM(v); return {g:m[4],n:m[5],j:v}; };
  /* 듣는 이: 전치사(אֶל·לְ) + 사람 명사 또는 대명 접미어 */
  function addresseeIn(A){ const ws=A.ws; { const L0=ws.map(j=>SD.L[SD.wl[j]][1]); if(L0.includes(">JC/")&&(L0.includes("R<H/")||L0.includes("R<=/")||L0.includes(">X/"))) return {each:1};   /* 각 사람이 그 동무(형제)에게 */ } for(let i=0;i<ws.length;i++){ const j=ws[i], x=SD.L[SD.wl[j]]; if(x[1]!==">L"&&x[1]!=="L"&&x[1]!=="<L") continue; const m=spkM(j);
      const nxt=ws[i+1], ph=SD.wp[j];
      if(m[7]&&m[7]!=="NA"&&m[7]!=="absent"&&m[7]!=="unknown") return {suf:{p:m[7],g:m[8],n:m[9]},j};
      if(nxt!=null&&SD.wp[nxt]===ph){ const es=spkPhraseEnts(E,ws.filter(w=>SD.wp[w]===ph),false); if(es.length) return {e:es[0].e,j}; } }
    return null; }
  /* 차례 만들기(같은 깊이의 인용 덩어리) */
  let k=0; const prevTurnAt=new Map();
  const outerOf=T=>{ let o=null; for(const t of turns) if(t.lvl===T.lvl-1&&t.ws[0]<=T.ws[0]) o=t; return o; };
  function resolve1(T,iK,A,iStart){ /* 이야기 방식 */ const v=speechVerb(A); const png=v!=null&&spkM(v)[3]==="p3"?{g:spkM(v)[4],n:spkM(v)[5]}:finitePNG(A)||(iK>0?finitePNG(atoms[iK-1]):null); T.png=png; T.how="intro"; T.introV=v;
    const L=T.lvl-1; const prev=prevTurnAt.get(T.lvl);
    /* 1인칭 말하기('내가 말하기를') = 바깥 차례의 말하는 이 */
    if(!T.sp&&v!=null&&spkM(v)[3]==="p1"){ const outer=outerOf(T); if(outer&&outer.sp) T.sp={...outer.sp,conf:"확실",why:"'내가 말하기를' — 바깥 차례의 말하는 이"}; }
    /* 1) 말하기 절(또는 같은 절의 앞 원자)의 주어 */
    for(const kk of (T.sp?[]:[iK,iK-1,iK-2])){ if(kk<0||atoms[kk].lvl!==L||(kk<iK&&atoms[kk].vi!==A.vi&&kk!==iK-1)) continue; const s=subjAt.find(x=>x.k===kk); if(s){ const c=s.es.find(x=>!png||spkAgree(x.e,png.g,png.n))||(!png?s.es[0]:null); if(c){ T.sp={e:c.e,conf:"확실",why:kk===iK?"말하기 절의 주어":"같은 문장 앞 절의 주어"}; break; } } }
    /* 부정사(לֵאמֹר)로만 이어진 안쪽 인용(칙령·전갈) = 바깥 차례의 말하는 이 */
    if(!T.sp&&T.lvl>1&&(v==null||spkM(v)[3]!=="p3")){ const outer=outerOf(T); if(outer&&outer.sp) T.sp={...outer.sp,conf:"추정",why:"안쪽 인용 — 바깥 차례의 말하는 이가 전함"}; }
    const from=prev?prev.endK:-1, between=k2=>k2>from&&k2<iK&&atoms[k2].lvl===L;
    /* 듣는 이를 먼저 잡아 두고(말하는 이 후보에서 뺀다) */
    let ad=addresseeIn(A); for(let q=iK+1;!ad&&q<iStart;q++) if(atoms[q].lvl===L) ad=addresseeIn(atoms[q]); if(!ad&&iK>0&&atoms[iK-1].lvl===L) ad=addresseeIn(atoms[iK-1]); T._ad=ad;
    const notAd=e=>!(ad&&ad.e&&ad.e===e);
    /* 2) 앞 차례 이후 서술에서 가장 가까이 나온 사람(역할 상관없이, 성·수 일치) */
    if(!T.sp){ for(let i=ment.length-1;i>=0;i--){ const x=ment[i]; if(!between(x.k)) continue; if(png&&!spkAgree(x.e,png.g,png.n)) continue; if(!SPK.A.has(SD.L[x.e.li][1])||!notAd(x.e)) continue; T.sp={e:x.e,conf:"추정",why:`그 사이 서술에서 가장 가까이 나온 ${spkPngKo(png&&png.g,png&&png.n)} 사람(동사와 일치)`}; break; } }
    /* 3) 주고받음: 앞 차례의 듣는 이가 이번에 말한다 */
    if(!T.sp&&prev&&prev.to&&prev.to.e&&png&&spkAgree(prev.to.e,png.g,png.n)) T.sp={e:prev.to.e,conf:"추정",why:`앞 차례의 듣는 이가 대답함(${spkPngKo(png.g,png.n)} 동사와 일치)`};
    /* 4) 더 앞의 서술 주어(성·수 일치) */
    if(!T.sp){ for(let kk=iK-1;kk>=0;kk--){ if(atoms[kk].lvl!==L) continue; const s2=subjAt.find(x=>x.k===kk); const c=s2&&s2.es.find(x=>(!png||spkAgree(x.e,png.g,png.n))&&notAd(x.e)); if(c){ T.sp={e:c.e,conf:"추정",why:`앞 서술의 주어(${spkPngKo(png&&png.g,png&&png.n)} 동사와 일치)`}; break; } } }
    if(!T.sp) T.sp={name:png?`(${spkPngKo(png.g,png.n)})`:"(모름)",conf:"모름",why:"문맥에서 성·수가 맞는 이를 찾지 못함"};
    /* 듣는 이 */
    const ad2=T._ad; delete T._ad;
    if(ad2&&ad2.each) T.to={name:"서로",conf:"확실",why:"'각 사람이 그 동무에게'"};
    else if(ad2&&ad2.e) T.to={e:ad2.e,conf:"확실",why:"말하기 절의 '~에게'"};
    else if(ad2&&ad2.suf){ const s=ad2.suf, sp=T.sp.e;
      if(s.p==="p1"){ const outer=outerOf(T); T.to=outer&&outer.sp?{...outer.sp,conf:"추정",why:"'나에게' = 바깥 차례의 말하는 이"}:{name:"(나)",conf:"모름"}; }
      else if(prev&&prev.sp&&prev.sp.e===sp&&prev.to&&prev.to.e&&spkAgree(prev.to.e,s.g,s.n)) T.to={e:prev.to.e,conf:"추정",why:"같은 이가 같은 상대에게 이어 말함"};
      else if(prev&&prev.to&&prev.to.e===sp&&prev.sp&&prev.sp.e&&spkAgree(prev.sp.e,s.g,s.n)) T.to={e:prev.sp.e,conf:"추정",why:"앞 차례에 말한 이에게 대답함"};
      else { for(let i=ment.length-1;i>=0;i--){ const x=ment[i]; if(x.k>=iK||x.lvl!==L) continue; if(x.e===sp||!spkAgree(x.e,s.g,s.n)||!SPK.A.has(SD.L[x.e.li][1])) continue; T.to={e:x.e,conf:"추정",why:`앞에 가장 가까이 나온 ${spkPngKo(s.g,s.n)} 사람(접미어와 일치)`}; break; } }
      if(!T.to) T.to={name:`(${spkPngKo(s.g,s.n)})`,conf:"모름"}; }
    /* '~에게'가 없으면: 인용 안의 2인칭(너·너희)과 성·수가 맞는 앞 차례의 말하는 이·듣는 이 */
    if(!T.to){ const c={}; for(const j of T.ws){ const m=spkM(j); if(m[3]==="p2"||m[7]==="p2"){ const g=m[3]==="p2"?m[4]:m[8], n=spkNu(m[3]==="p2"?m[5]:m[9]); c[g+n]=(c[g+n]||0)+1; } }
      const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; if(top&&prev){ const g=top[0].slice(0,1), n=top[0].slice(1); for(const cand of [prev.sp,prev.to]) if(cand&&cand.e&&cand.e!==T.sp.e&&spkAgree(cand.e,g,n)){ T.to={e:cand.e,conf:"추정",why:`인용 안의 2인칭(${spkPngKo(g,n)})과 맞는 앞 차례의 사람`}; break; } } }
    if(T.to&&T.to.e&&T.sp&&T.to.e===T.sp.e) T.to=null; }
  /* 대화시 방식: 절마다 단서 → 같은 말하는 이끼리 묶기 */
  function cues(ws){ const C={sg:{m:0,f:0},ad:{m:0,f:0,pl:0},we:0,others:0,me:0,third:{m:0,f:0},voc:null,lover:false,why:[]}; const byCl=new Map(); for(const j of ws){ const c=SD.wc[j]; if(!byCl.has(c)) byCl.set(c,[]); byCl.get(c).push(j); }
    for(const j of ws){ const m=spkM(j), x=SD.L[SD.wl[j]];
      if(m[7]==="p2"&&SPK_LOVER_F.has(x[1])&&spkNu(m[5])==="sg"){ C.others+=3; C.why.push(`'너의 사랑하는 자'(${wHeb(j).trim()}) — 그 사람 자신은 이렇게 말하지 않음`); }
      if((m[3]==="p1"||m[7]==="p1")&&spkNu(m[3]==="p1"?m[5]:m[9])==="sg") C.me++;
      if(m[0]==="subs"&&m[7]==="p3"&&m[9]==="sg"&&(m[8]==="m"||m[8]==="f")&&!["NPC/","LB/","LBB/"].includes(x[1])) C.third[m[8]]+=0.5;   /* '그의 상'처럼 명사에 붙은 3인칭 단수 접미어만(동사는 사물·'내 영혼'이 주어일 때가 많아 셈하지 않음) */
      if(m[7]==="p1"&&m[9]==="sg"&&SPK_LOVER_F.has(x[1])){ C.sg.f+=2; C.why.push(`'내 ${lexGloss(SD.wl[j]).split(",")[0]}'(${wHeb(j).trim()})`); }
      if(SPK_LOVER_M.has(x[1])&&(m[7]==="p1"||SD.wf[j]===VOC)){ C.sg.m+=2; C.why.push(`'${wHeb(j).trim()}'`); }
      if(m[3]==="p2"||m[7]==="p2"){ const g=m[3]==="p2"?m[4]:m[8], n=m[3]==="p2"?m[5]:m[9]; if(spkNu(n)==="pl") C.ad.pl++; else if(g==="m"||g==="f") C.ad[g]++; }
      if(m[0]==="verb"&&m[3]==="p1"&&spkNu(m[5])==="pl") C.we++;   /* '우리가 ~하자' 같은 1인칭 복수 동사(‘우리 집’ 같은 접미어는 셈하지 않음) */
      if(SD.wf[j]===VOC&&(SPK_LOVER_F.has(x[1])||SPK_LOVER_M.has(x[1])||x[1]===">XWT/")) C.lover=SPK_LOVER_F.has(x[1])?"m":"f";
      else if(SD.wf[j]===VOC&&m[0]==="adjv"&&(m[4]==="m"||m[4]==="f")&&!C.voc) C.voc={name:m[4]==="f"?"여자":"남자",adj:wHeb(j).trim()};   /* '여자 가운데 가장 아름다운 자여' */
      else if(SD.wf[j]===VOC&&(m[0]==="subs"||m[0]==="nmpr")&&!SPK_NOT.has(x[1])&&!C.voc&&SPK.A.has(x[1])) C.voc={e:spkEnt(E,SD.wl[j],m[4],m[5],wHeb(j).trim())}; }
    for(const ws2 of byCl.values()){ const I=ws2.some(j=>spkM(j)[0]==="prps"&&spkM(j)[3]==="p1"&&spkM(j)[5]==="sg")||ws2.some(j=>spkM(j)[0]==="verb"&&spkM(j)[3]==="p1"&&spkM(j)[5]==="sg");
      if(!I) continue; for(const j of ws2){ const m=spkM(j); if((m[0]==="adjv"||(m[0]==="verb"&&/ptc/.test(m[2])))&&m[5]==="sg"&&(m[4]==="m"||m[4]==="f")&&m[3]!=="p2"&&m[3]!=="p3"){ C.sg[m[4]]++; C.why.push(`'나'와 맞는 ${m[4]==="f"?"여성":"남성"} ${m[0]==="adjv"?"형용사":"분사"}(${wHeb(j).trim()})`); } } }
    return C; }
  function resolve2(T){ /* T.ws 를 절별로 나눠 말하는 이를 정하고 바뀌는 곳에서 차례를 자른다 */
    const byV=new Map(); for(const j of T.ws){ const vi=SD.vOf[j]; if(!byV.has(vi)) byV.set(vi,[]); byV.get(vi).push(j); }
    const out=[]; let last=null; const outer=T.lvl>1?outerOf(T):null;
    for(const [vi,ws] of byV){ const C=cues(ws); let g=null, conf="추정", why="";
      if(C.others>=3){ g="we"; why=C.why.filter(w=>/너의 사랑하는/.test(w)).join(", "); }
      else if(C.sg.f>C.sg.m){ g="f"; why=C.why.join(", "); } else if(C.sg.m>C.sg.f){ g="m"; why=C.why.join(", "); }
      else if(C.we&&!C.me){ g="we"; why="'우리가 ~하자' — 1인칭 복수 동사"; }
      else if(C.ad.f>C.ad.m){ g="m"; why=`2인칭 여성 단수(너=여자)에게 하는 말 ${C.ad.f}곳`; } else if(C.ad.m>C.ad.f){ g="f"; why=`2인칭 남성 단수(너=남자)에게 하는 말 ${C.ad.m}곳`; }
      if(!g&&C.me&&!C.ad.m&&!C.ad.f&&C.third.m!==C.third.f){ g=C.third.m>C.third.f?"f":"m"; why=`'나'가 ${g==="f"?"그(남자)":"그녀"}를 3인칭으로 말함`; }
      if(!g&&last){ g=last.g; conf="이어짐"; why="단서 없음 — 앞 절의 말하는 이가 이어진다고 봄"; }
      if(!g&&outer&&outer.sp){ const o={...T,ws:[...ws],vis:[vi],g:"outer",sp:{...outer.sp,conf:"이어짐",why:"안쪽 인용인데 단서가 없음 — 바깥 차례의 말하는 이"},to:null,how:"cue"}; if(last&&last.g==="outer"){ last.ws.push(...ws); last.vis.push(vi); } else { last=o; out.push(o); } continue; }
      if(!g){ g="?"; conf="모름"; why="단서 없음"; }
      const to=C.voc?(C.voc.e?{e:C.voc.e,conf:"확실",why:"부르는 말"}:{name:C.voc.name,conf:"확실",why:`부르는 말(${C.voc.adj}…)`}):C.lover?{name:C.lover==="m"?"남자":"여자",conf:"확실",why:"부르는 말(사랑하는 이)"}:C.ad.pl&&!C.ad.m&&!C.ad.f?{name:"(너희)",conf:"추정",why:"2인칭 복수"}:g==="f"?{name:"남자",conf:"추정",why:"2인칭·문맥"}:g==="m"?{name:"여자",conf:"추정",why:"2인칭·문맥"}:null;
      const name={f:"여자",m:"남자",we:"여럿(합창·무리)","?":"(모름)"}[g];
      if(last&&last.g===g&&last.lvl===T.lvl&&(conf==="이어짐"||last.toName===(to&&(to.name||to.e&&to.e.name)))){ last.ws.push(...ws); last.vis.push(vi); continue; }
      last={...T,ws:[...ws],vis:[vi],g,sp:{name,conf,why},to,toName:to&&(to.name||to.e&&to.e.name),how:"cue"}; out.push(last); }
    return out; }
  /* 깊이별로 덩어리 찾기: 같은 깊이 L 의 이어진 원자 = 한 차례(그 안의 더 깊은 원자는 안쪽 차례) */
  function scan(L,from,to){ let i=from; while(i<to){ if(atoms[i].lvl<L){ i++; continue; } let e=i; while(e<to&&atoms[e].lvl>=L) e++;
      const ws=[]; for(let q=i;q<e;q++) if(atoms[q].lvl===L) ws.push(...atoms[q].ws);
      /* 말하기 절: 바로 앞(같은 문장의 2원자 안)에서 깊이 L-1 */
      let iK=-1; for(let q=i-1;q>=Math.max(0,i-3);q--){ if(atoms[q].lvl!==L-1) break; if(speechVerb(atoms[q])!=null){ iK=q; break; } }
      const T={lvl:L,ws,startK:i,endK:e-1,vis:[...new Set(ws.map(j=>SD.vOf[j]))]};
      if(iK>=0){ resolve1(T,iK,atoms[iK],i); /* 부르는 말이 있으면 듣는 이로 */ const vo=ws.find(j=>SD.wf[j]===VOC&&SPK.A.has(SD.L[SD.wl[j]][1])); if(vo!=null){ const m=spkM(vo); T.to={e:spkEnt(E,SD.wl[vo],m[4],m[5],wHeb(vo).trim()),conf:"확실",why:"부르는 말"}; } turns.push(T); prevTurnAt.set(L,T); }
      else { const R=resolve2(T); for(const t of R){ t.startK=i; t.endK=e-1; turns.push(t); prevTurnAt.set(L,t); } }
      scan(L+1,i,e); prevTurnAt.set(L,turns.filter(t=>t.lvl===L).slice(-1)[0]); i=e; } }
  scan(1,0,atoms.length);
  turns.sort((a,b)=>a.ws[0]-b.ws[0]);
  const narr=words.filter(j=>inR.has(SD.vOf[j])&&spkLvl(j)===0).length;
  const T2=turns.map(t=>({...t,ws:t.ws.filter(j=>inR.has(SD.vOf[j]))})).filter(t=>t.ws.length);
  return {turns:T2,narr,book:b}; }
/* 공용 자료(확인됨)·이 기기에서 고친 것 덮어쓰기: 차례 첫 낱말의 BHSA 번호로 찾는다 */
const SPK_LOCAL="milal-spk-edits";
function spkLocal(){ try{ return JSON.parse(localStorage.getItem(SPK_LOCAL)||"{}")||{}; }catch(e){ return {}; } }
function spkLocalSet(o){ try{ localStorage.setItem(SPK_LOCAL,JSON.stringify(o)); }catch(e){ toast("저장하지 못했습니다(저장 공간)."); } }
const spkKey=t=>String(qeSlotOf(t.ws[0]));
const spkNameOf=x=>x?(x.e?x.e.name:x.name):"";
function spkApply(R){ const cur=(SPK.cur&&SPK.cur[R.book])||{}, loc=(spkLocal()[R.book])||{};
  for(const t of R.turns){ const k=spkKey(t), c=loc[k]||cur[k]; t.key=k; t.autoSp=spkNameOf(t.sp); t.autoTo=spkNameOf(t.to); if(!c) continue;
    if(c.sp) t.sp={name:c.sp,conf:loc[k]?"내가 고침":"확인됨",why:loc[k]?"이 기기에서 고친 것(아직 공용 자료 아님)":"공용 자료 — 목사님 확인"};
    if(c.to) t.to={name:c.to,conf:loc[k]?"내가 고침":"확인됨"};
    if(!c.sp&&c.ok) t.sp={...t.sp,conf:loc[k]?"내가 확인":"확인됨"}; t.edited=!!loc[k]; t.cur=!!cur[k]; }
  return R; }
/* 화면 */
function spkStats(R){ const S=new Map(); const add=(n,w,t)=>{ let e=S.get(n); if(!e){ e={n,w:0,t:0}; S.set(n,e); } e.w+=w; if(t) e.t++; };
  add("서술(내레이터)",R.narr,0); for(const t of R.turns) add(spkNameOf(t.sp),t.ws.length,1);
  return [...S.values()].filter(x=>x.w).sort((a,b)=>b.w-a.w); }
const SPK_CONF={"확실":"sure","확인됨":"ok","내가 고침":"mine","내가 확인":"mine","추정":"est","이어짐":"cont","모름":"unk"};
function spkHTML(sp){ if(!SPK){ spkLoad().then(()=>{ if(view.st.mode==="tool") render(); }); return `<p class="lead">말하는 이 자료를 받는 중…</p>`; }
  const R=spkApply(spkAnalyze(sp)); window.__spkR=R; const st=spkStats(R), tot=st.reduce((a,x)=>a+x.w,0)||1, mx=Math.max(...st.map(x=>x.w),1);
  let h=`<span class="label" style="margin-top:6px">누가 말하나 — 말하는 이별 낱말 수</span><div class="spkbars">${st.map(x=>`<div class="spkbar"><span class="n">${esc(x.n)}</span><span class="bar"><i style="width:${x.w/mx*100}%"></i></span><b>${x.w}</b><small>${Math.round(x.w/tot*100)}%${x.t?` · ${x.t}번`:""}</small></div>`).join("")}</div>`;
  h+=toolRule(`BHSA가 표시한 직접 인용을 한 차례로 묶고, 인용 바로 앞의 '말하다·대답하다' 절의 주어를 말하는 이로 삼습니다. 주어가 없으면 동사의 <b>성·수</b>가 맞는 이를 문맥에서 찾고(그 사이 서술의 주어 → 앞 차례의 듣는 이 → 앞에 나온 이름), 말하기 동사가 없는 대화시(아가 등)는 '나'와 맞는 형용사의 성, 부르는 말, 2인칭의 성·수로 정합니다. 낱말 수는 BHSA 단위(접두어도 한 낱말)입니다.`,`<b>확실</b>은 원문에 주어·부르는 말이 직접 있는 것, <b>추정</b>은 성·수와 문맥으로 정한 것입니다. 이름을 누르면 고칠 수 있고, 목사님이 확인한 것은 공용 자료로 모두에게 '확인됨'으로 보입니다.`);
  h+=`<span class="label" style="margin-top:12px">말한 차례 ${R.turns.length}</span><div class="spkturns">${R.turns.map((t,i)=>`<div class="spkt lv${Math.min(t.lvl,3)}"><button class="spkref" data-svi="${t.vis[0]}" data-swj="${t.ws[0]}">${esc(sRef(t.vis[0]))}${t.vis.length>1?"–"+esc(sRef(t.vis[t.vis.length-1]).split(" ").pop()):""}</button><button class="spkwho" data-spke="${i}"><b class="c-${SPK_CONF[t.sp.conf]||"est"}">${esc(spkNameOf(t.sp))}</b>${t.to?` → <span class="c-${SPK_CONF[t.to.conf]||"est"}">${esc(spkNameOf(t.to))}</span>`:""}<i>${esc(t.sp.conf)}</i></button><small>${t.ws.length}낱말${t.lvl>1?" · 인용 안의 인용":""}</small><span class="heb spkfirst">${esc(t.ws.slice(0,7).map(wHeb).join("").trim())}${t.ws.length>7?" …":""}</span></div>`).join("")||`<p class="lead">이 범위에는 직접 인용이 없습니다 — 모두 서술입니다.</p>`}</div>`;
  const loc=spkLocal()[R.book]; if(loc&&Object.keys(loc).length) h+=`<div class="spksend"><p class="lead">이 기기에서 고치거나 확인한 차례 <b>${Object.keys(loc).length}</b>개 — 공용 자료로 보내면 모두에게 '확인됨'으로 보입니다.</p><div class="row"><button class="btn small" id="spkSend">공용 자료로 보내기(파일)</button><button class="btn small ghost" id="spkClear">이 기기에서 고친 것 지우기</button></div></div>`;
  return h; }
function spkEdit(i){ const R=window.__spkR, t=R&&R.turns[i]; if(!t) return; const names=[...new Set(R.turns.flatMap(x=>[spkNameOf(x.sp),spkNameOf(x.to),x.autoSp,x.autoTo]).filter(n=>n&&!/^\(/.test(n)))];
  const why=t.sp.why?`<p class="lead" style="margin:0 0 6px">근거: ${esc(t.sp.why)}${t.to&&t.to.why?` · 듣는 이: ${esc(t.to.why)}`:""}${t.png?` · 말하기 동사 ${esc(spkPngKo(t.png.g,t.png.n))}`:""}</p>`:"";
  sheet(`${sRef(t.vis[0])} 말한 차례`,`<p class="heb svheb" style="margin:0 0 6px">${esc(t.ws.slice(0,24).map(wHeb).join("").trim())}${t.ws.length>24?" …":""}</p>${why}
    <label class="anlab">말하는 이</label><input id="spkS" list="spkNames" value="${esc(spkNameOf(t.sp))}"><label class="anlab">듣는 이</label><input id="spkT" list="spkNames" value="${esc(spkNameOf(t.to))}"><datalist id="spkNames">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <div class="row" style="margin-top:8px"><button class="sbtn" id="spkOk" style="width:auto;margin:0;padding:10px 16px">이대로 확인</button><button class="btn small ghost" id="spkUndo">자동 판정으로</button></div><p class="lead" style="font-size:12px">고친 것은 이 기기에 먼저 저장되고, '공용 자료로 보내기'로 보내면 공용 자료에 들어갑니다.</p>`);
  const root=document.getElementById("sheetRoot"), L=spkLocal(), bk=String(R.book); L[bk] ||= {};
  root.querySelector("#spkOk").onclick=()=>{ const s=root.querySelector("#spkS").value.trim(), to=root.querySelector("#spkT").value.trim(); L[bk][t.key]={sp:s||spkNameOf(t.sp),to:to||spkNameOf(t.to),ok:1,ref:sRef(t.vis[0]),auto:t.autoSp,t:Date.now()}; spkLocalSet(L); root.innerHTML=""; render(); };
  root.querySelector("#spkUndo").onclick=()=>{ delete L[bk][t.key]; spkLocalSet(L); root.innerHTML=""; render(); }; }
function spkSendFile(){ const L=spkLocal(); const out={schema:"MILALWV-SPEAKERS-1",made:new Date().toISOString(),bhsa:SD.bhsa||"2021",books:L}; const txt=JSON.stringify(out,null,1), a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"})); a.download=`milalwv-speakers-${out.made.slice(0,10)}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); window.__lastSpkSend=txt;
  sheet("공용 자료로 보내기",`<p class="lead">확인한 차례를 파일(<b>${esc(a.download)}</b>)로 내려받았습니다. 이 파일을 Claude에게 주시면 공용 자료(study/speakers.json)에 넣어 올립니다. 그 뒤에는 모든 사람에게 '확인됨'으로 보입니다.</p>`); }
function bindSpk(m){ m.querySelectorAll("[data-spke]").forEach(b=>b.onclick=()=>spkEdit(+b.dataset.spke)); const s=m.querySelector("#spkSend"); if(s) s.onclick=spkSendFile;
  const c=m.querySelector("#spkClear"); if(c) c.onclick=()=>{ const R=window.__spkR; if(!R||!confirm("이 책에서 이 기기에 고친 것을 지울까요?")) return; const L=spkLocal(); delete L[R.book]; spkLocalSet(L); render(); }; }
