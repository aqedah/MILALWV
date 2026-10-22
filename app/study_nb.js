/* ===== 본문 연구 노트 (2026-10-22 목사님 승인) =====
   한 본문(범위 하나 이상)을 한 질문으로 연구한다. 연구를 켜 두면 그동안 쓰는 메모·비교 판단·검색 메모·낱말 메모가 이 노트에 모인다.
   · 저장: 연구의 제목·질문·범위·중간 결론·남은 질문·적용은 이 기기(localStorage "milal-studies"). 백업 파일에 함께 들어간다.
   · 메모와의 연결: 이미 있는 '표시(태그)' 칸에 "연구: 제목"을 단다 → 기록 형식·Firestore 규칙을 바꾸지 않는다. 낱말 메모(이 기기 전용)는 노트가 번호를 기억한다.
   · 앱은 근거를 모아 줄 뿐, 해석·결론·적용은 사용자가 쓴다(자동 생성 없음). ===== */
const NB_KEY="milal-studies", NB_ACT="milal-study-active", NB_SIDE="milal-nb-side";
/* 2026-10-22 목사님: UI·UX 를 마칠 때까지 숨겨 둔다(코드·저장된 노트는 그대로). 다시 켜기: localStorage "milal-nb-on" = "1" 또는 이 값을 true 로 */
const NB_ON=(()=>{ try{ return localStorage.getItem("milal-nb-on")==="1"; }catch(e){ return false; } })();
function nbLoad(){ try{ const L=JSON.parse(localStorage.getItem(NB_KEY)||"[]"); return Array.isArray(L)?L.filter(s=>s&&s.id):[]; }catch(e){ return []; } }
function nbSave(L){ try{ localStorage.setItem(NB_KEY,JSON.stringify(L)); return true; }catch(e){ toast("연구 노트를 저장하지 못했습니다(저장 공간)."); return false; } }
function nbActiveId(){ try{ return localStorage.getItem(NB_ACT)||""; }catch(e){ return ""; } }
function nbSetActive(id){ try{ if(id) localStorage.setItem(NB_ACT,id); else localStorage.removeItem(NB_ACT); }catch(e){} }
function nbGet(id){ return nbLoad().find(s=>s.id===id)||null; }
function nbActive(){ if(!NB_ON) return null; const id=nbActiveId(); return id?nbGet(id):null; }
function nbPut(s){ const L=nbLoad(); s.updated=Date.now(); const i=L.findIndex(x=>x.id===s.id); if(i>=0) L[i]=s; else L.unshift(s); return nbSave(L); }
const nbTagOf=s=>"연구: "+s.title;
function nbActiveTag(){ const s=nbActive(); return s?nbTagOf(s):""; }
function nbSideOn(){ try{ return localStorage.getItem(NB_SIDE)!=="0"; }catch(e){ return true; } }
/* 범위: "욘 1:1-3, 3:1-3" 처럼 쓰고, 다른 책은 ; 로 잇는다 */
function nbParseRanges(text){ const out=[]; for(const seg of String(text||"").split(/\s*;\s*/).filter(Boolean)){ const r=cmpParse(seg); if(!r) continue; if(r.err) return {err:r.err}; out.push({q:seg.trim(),b:r.b,c1:r.c1,v1:r.v1,c2:r.c2,v2:r.v2,parts:r.parts||null}); }
  return out.length?out:{err:"본문 범위를 적어 주세요. 예: 욘 1:1-3, 3:1-3 (다른 책은 ; 로 이어 씁니다)"}; }
const nbRangeText=s=>(s.ranges||[]).map(r=>r.q).join("; ");
function nbEnsure(s){ return Promise.all([...new Set((s.ranges||[]).map(r=>r.b))].filter(b=>!SD.loaded.has(b)).map(b=>loadBook(b))); }
function nbVerses(s){ const set=new Set(); for(const r of s.ranges||[]) if(SD.loaded.has(r.b)) for(const vi of cmpVerses(r)) set.add(vi); return set; }
/* 노트에 모인 근거: 태그 단 기록 + 기억한 낱말 메모 */
function nbItems(s){ const tag=nbTagOf(s), wn=new Set(s.wn||[]);
  const A=anList().filter(a=>a.kind!=="mark"&&(a.tags||[]).includes(tag)).map(a=>({id:a.id,a,b:a.anchor.book,c:a.anchor.ch,v:a.anchor.vs,ref:a.kind==="range"?rangeLabel(a):`${PLAN.abbr[a.anchor.book-1]} ${a.anchor.ch}:${a.anchor.vs}`,kind:(typeof KIND_KO!=="undefined"&&KIND_KO[a.kind])||a.kind,obs:a.observation||"",int:a.interpretation||"",extra:(a.tags||[]).includes("검색식")?"검색 메모":(a.tags||[]).some(t=>/비교/.test(t))||(a.anchor&&a.anchor.cmp)?"비교 메모":"",t:a.updated}));
  const W=studyNotes().filter(n=>wn.has(n.t)).map(n=>({wt:n.t,b:n.b,c:n.c,v:n.v,ref:`${PLAN.abbr[n.b-1]} ${n.c}:${n.v}`,kind:"낱말 메모",heb:n.heb,gl:n.gl,obs:n.m||`${n.heb} '${n.gl}'`,int:"",t:n.t}));
  return A.concat(W).sort((x,y)=>x.b-y.b||x.c-y.c||x.v-y.v); }
/* 범위 안에 있지만 아직 노트에 없는 메모 — 담기 */
function nbOthers(s){ const tag=nbTagOf(s), V=nbVerses(s), keys=new Set([...V].map(vi=>SD.V[vi].slice(0,3).join("-"))), wn=new Set(s.wn||[]);
  const A=anList().filter(a=>a.kind!=="mark"&&!(a.tags||[]).includes(tag)&&keys.has([a.anchor.book,a.anchor.ch,a.anchor.vs].join("-")));
  const W=studyNotes().filter(n=>!wn.has(n.t)&&keys.has([n.b,n.c,n.v].join("-"))); return {A,W}; }
function nbCount(s){ return nbItems(s).length; }
/* 연결 지점(다른 파일에서 부름) */
function nbAddWord(t){ const s=nbActive(); if(!s) return; s.wn=[...new Set([...(s.wn||[]),t])]; nbPut(s); }
function nbTagAnnot(a,s){ const tag=nbTagOf(s); if((a.tags||[]).includes(tag)) return Promise.resolve(); return anSave(Object.assign({},a,{tags:[...(a.tags||[]),tag].slice(0,20)})); }
/* ===== 본문 갈래(장 단위로 나눈 대략의 구분)와 '무엇을 관찰해 볼까요?' — 판정이 아니라 질문 안내 ===== */
function nbGenre(b,c){ const inr=(a,z)=>c>=a&&c<=z;
  if(b===1) return c===49?"시":"이야기";
  if(b===2) return c===15?"시":inr(20,23)||inr(25,31)||inr(35,40)?"율법":"이야기";
  if(b===3) return "율법";
  if(b===4) return [5,6,15,18,19,28,29,30,35,36].includes(c)?"율법":"이야기";
  if(b===5) return inr(32,33)?"시":c===34?"이야기":"율법";
  if(b===7&&c===5) return "시"; if(b===10&&c===22) return "시";
  if(b>=6&&b<=17) return "이야기";
  if(b===18) return c<=2||c===42?"이야기":"지혜";
  if(b===19||b===22||b===25) return "시";
  if(b===20||b===21) return "지혜";
  if(b===23) return inr(36,39)?"이야기":"예언";
  if(b===24) return inr(26,29)||inr(32,45)||c===52?"이야기":"예언";
  if(b===27) return c<=6?"이야기":"예언";
  if(b===32) return c===2?"시":"이야기";
  if(b===35&&c===3) return "시";
  return "예언"; }
const NB_W=(c,fn,op)=>({c,fn:fn||"",op:op||""});
const NB_Q={
  "이야기":[["이 본문에서 되풀이되는 말은 무엇인가?",{tool:"반복"}],["장면(때·곳·인물)은 어디서 바뀌는가?",{tool:"장면"}],["누가 말하고, 서술자는 어디서 직접 말하는가?",{tool:"화자"}],["이야기 줄(봐이크톨)이 끊기는 곳에서 서술자는 무엇을 알려 주는가?",{tool:"전환"}],["누가 주어로 나와 이야기를 이끄는가?",{tool:"인물"}]],
  "시":[["되풀이되는 말과 핵심 낱말은 무엇인가?",{tool:"반복"}],["앞 줄과 뒤 줄이 같은 뜻을 되받는가, 맞서는가, 이어 가는가(평행법)?",{text:1}],["누구에게 말하는가 — 2인칭으로 부르는 동사",{qc:{tgt:"word",cl:{},ws:[NB_W({sp:"verb",ps:"p2"})]}}],["간구·명령(명령형)은 어디에 있는가?",{qc:{tgt:"word",cl:{},ws:[NB_W({sp:"verb",vt:"impv"})]}}],["핵심 낱말은 다른 곳에서 어떻게 쓰이는가?",{mode:"word"}]],
  "지혜":[["되풀이되는 말과 핵심 낱말은 무엇인가?",{tool:"반복"}],["명령 뒤에 이유('키')가 어떻게 따라오는가?",{qc:{tgt:"clause",cl:{},ws:[NB_W({sp:"verb",vt:"impv"})]}}],["말하는 이는 어디서 바뀌는가? (욥기는 말하는 이별 구간을 함께 보세요)",{tool:"화자"}],["핵심 낱말은 다른 곳에서 어떻게 쓰이는가?",{mode:"word"}]],
  "예언":[["'여호와께서 이같이 말씀하시되(코 아마르)'로 말씀이 어디서 시작되는가?",{qc:{tgt:"clause",cl:{},ws:[NB_W({lex:"KH"}),NB_W({lex:">MR["},"","<:")]}}],["되풀이되는 말은 무엇인가?",{tool:"반복"}],["명령형은 누구에게 하는 말인가?",{qc:{tgt:"word",cl:{},ws:[NB_W({sp:"verb",vt:"impv"})]}}],["다른 예언서와 같은 표현이 있는가?",{mode:"compare"}]],
  "율법":[["금지('로' + 미완료)는 어디에 있는가?",{qc:{tgt:"clause",cl:{},ws:[NB_W({lex:"L>"}),NB_W({sp:"verb",vt:"impf"},"","<:")]}}],["명령형과 그 이유('키')는 어떻게 이어지는가?",{qc:{tgt:"clause",cl:{},ws:[NB_W({lex:"KJ"})]}}],["되풀이되는 말은 무엇인가?",{tool:"반복"}],["같은 규정이 다른 곳에도 있는가?",{mode:"compare"}]]};
function nbGuideHTML(b,c,lim,label){ const g=nbGenre(b,c), Q=NB_Q[g]||[]; return `<div class="nbguide"><span class="label">무엇을 관찰해 볼까요? <small>· ${esc(label||(PLAN.full[b-1]+" "+c+"장"))}은 장 단위로 보면 <b>${g}</b> 본문</small></span><div class="nbqs">${Q.slice(0,lim||9).map(([q],i)=>`<button class="nbq" data-nbq="${g}|${i}"><span>${esc(q)}</span><i>${nbActLabel(Q[i][1])}</i></button>`).join("")}</div><p class="lead" style="margin:4px 0 0;font-size:12px">갈래는 장 단위로 나눈 대략의 구분이고, 질문은 관찰을 돕는 안내입니다. 답(뜻)은 본문에서 찾으세요.</p></div>`; }
function nbActLabel(a){ return a.tool?(R_FLOW.find(x=>x[0]===a.tool)||ST_TOOLS.find(x=>x[0]===a.tool)||[,a.tool])[1]:a.qc?"조건 카드로 찾기":a.mode==="word"?"낱말의 다른 용례":a.mode==="compare"?"두 본문 비교":"본문 읽기"; }
/* 질문 단추 → 도구를 그 범위로 연다(노트가 있으면 노트의 첫 범위, 없으면 지금 범위) */
function nbGo(key){ const [g,i]=key.split("|"), a=(NB_Q[g]||[])[+i]; if(!a) return; const act=a[1], S=view.st, s=S.mode==="study"&&S.nbView?nbGet(S.nbView):null, r=s&&s.ranges&&s.ranges[0];
  const go=()=>{ if(r){ S.wide=false; setRange({b:r.b,c1:r.c1,c2:r.c2}); }
    if(act.tool){ S.mode="tool"; S.tool=act.tool; S.sub=""; S.godv=null; }
    else if(act.qc){ S.qc=JSON.parse(JSON.stringify(act.qc)); qcSync(); S.qui="card"; S.qres=null; S.qkey=null; S.mode="query"; qExec(); }
    else if(act.mode==="word"){ S.mode="word"; S.lex=null; S.q=""; }
    else if(act.mode==="compare"){ S.mode="compare"; if(r&&window.cmpGo) cmpGo(r.q,""); }
    else { if(r){ studyOpenVerse(r.b,r.c1,r.v1||1); return; } S.mode="verse"; }
    S.rmode=S.mode; render(); scrollTo({top:0}); };
  if(r&&!SD.loaded.has(r.b)) loadBook(r.b).then(go); else go(); }
/* ===== 화면 ===== */
function nbItemHTML(it,part){ const txt=part==="int"?it.int:it.obs; return `<div class="nbit"><div class="nbith"><button class="qlink" data-nbgo="${it.b}-${it.c}-${it.v}">${esc(it.ref)}</button><small>${esc(it.kind)}${it.extra?" · "+esc(it.extra):""}${it.heb?` · <span class="heb">${esc(it.heb)}</span> ${esc(it.gl)}`:""}</small>${it.id?`<button class="btn small ghost" data-anedit="${it.id}">고치기</button>`:""}</div><p>${esc(txt).replace(/\n/g,"<br>")}</p></div>`; }
function nbField(k,label,hint,val,rows){ return `<label class="anlab nbl">${label} <small>${hint}</small></label><textarea class="nbta" data-nbf="${k}" rows="${rows||3}">${esc(val||"")}</textarea>`; }
function nbStartHTML(){ if(!NB_ON) return ""; const s=nbActive(), n=nbLoad().length;
  return s?`<div class="nbstart on"><span><small>지금 연구 중</small><b>${esc(s.title)}</b><small>${esc(nbRangeText(s))} · 근거 ${nbCount(s)}</small></span><button class="btn small" data-nbopen="${s.id}">노트 이어서</button></div>`
    :`<div class="nbstart"><span><b>본문 연구 노트</b><small>한 본문을 한 질문으로 — 관찰·해석·중간 결론·적용을 한곳에 모읍니다</small></span><button class="btn small ghost" data-nbopen="">${n?`내 연구 ${n} · 새 연구`:"새 연구 시작"}</button></div>`; }
function nbPage(){ const S=view.st; const s=S.nbView?nbGet(S.nbView):null; if(s&&s.ranges.some(r=>!SD.loaded.has(r.b))){ nbEnsure(s).then(()=>render()); return `<section class="sec"><p class="lead">본문 자료를 받는 중…</p></section>`; }
  if(!s){ const L=nbLoad(), act=nbActiveId(), defR=S.R?`${PLAN.abbr[S.R.b-1]} ${S.R.c1===S.R.c2?S.R.c1:S.R.c1+"-"+S.R.c2}`:"";
    return `<section class="sec"><h2 class="qtitle">본문 연구 노트</h2><p class="lead" style="margin:0 0 8px">한 본문을 한 질문으로 연구합니다. 연구를 켜 두면 그동안 남기는 <b>메모·비교 판단·검색 메모·낱말 메모</b>가 이 노트에 모이고, 본문과 연구 화면 위에 '지금 연구 중' 띠가 보입니다.</p>
      <div class="nbnew"><span class="label">새 연구</span><label class="anlab">제목</label><input id="nbT" type="text" placeholder="예: 요나의 두 부르심"><label class="anlab">본문 범위 <small>쉼표로 같은 책 안의 절을, ; 로 다른 책을 잇습니다</small></label><input id="nbR" type="text" value="${esc(defR)}" placeholder="예: 욘 1:1-3, 3:1-3"><label class="anlab">연구 질문 <small>이 본문에 묻고 싶은 것</small></label><textarea id="nbQ" rows="2" placeholder="예: 하나님의 첫째·둘째 부르심은 어떻게 같고, 요나의 반응은 어떻게 다른가?"></textarea><button class="sbtn" id="nbMake">연구 시작</button></div>
      ${L.length?`<span class="label" style="margin-top:14px">내 연구 ${L.length}</span><div class="snlist">${L.map(x=>`<div class="snitem"><button class="snjump" data-nbopen="${x.id}"><b>${esc(x.title)}${x.id===act?" · 지금 연구 중":""}</b><small>${esc(nbRangeText(x))} · 근거 ${nbCount(x)} · ${new Date(x.updated).toLocaleDateString("ko-KR")}</small>${x.q?`<span class="snm">${esc(x.q)}</span>`:""}</button></div>`).join("")}</div>`:""}
      <p class="lead" style="margin-top:8px">연구 노트는 이 기기에 저장되고, 기록 탭의 'JSON 백업'에 함께 들어갑니다. 노트에 모인 메모는 기록 탭에서 '연구: 제목' 표시로도 찾을 수 있습니다.</p></section>`; }
  const items=nbItems(s), obs=items.filter(x=>x.obs), ints=items.filter(x=>x.int), O=nbOthers(s), on=nbActiveId()===s.id, r0=s.ranges[0];
  return `<section class="sec nbpage"><div class="row" style="margin:0 0 6px"><button class="mtog back" id="nbList">← 내 연구 목록</button></div>
    <input class="nbtitle" id="nbTitle" value="${esc(s.title)}" aria-label="연구 제목">
    <div class="nbon ${on?"on":""}">${on?`<b>지금 연구 중</b> — 메모를 쓰면 이 노트에 모입니다 <button class="btn small ghost" id="nbOff">연구 끄기</button>`:`<span>꺼져 있음 — 메모가 자동으로 모이지 않습니다</span> <button class="btn small" id="nbOn">이 연구 켜기</button>`}</div>
    <span class="label">본문</span><div class="achips">${s.ranges.map((r,i)=>`<button class="achip" data-nbr="${i}">${esc(r.q)} ›</button>`).join("")}<button class="achip off" id="nbREdit">범위 고치기</button></div>
    ${nbField("q","연구 질문","이 본문에 묻는 것",s.q,2)}
    ${nbGuideHTML(r0.b,r0.c1,9,r0.q)}
    <span class="label" style="margin-top:14px">관찰한 것 ${obs.length} <small>— 본문·문법·비교에서 확인한 사실</small></span>${obs.length?obs.map(x=>nbItemHTML(x,"obs")).join(""):`<p class="lead">아직 없습니다. 연구를 켜 둔 채 본문에서 글자를 골라 '노트에 추가', 절·검색 결과의 '메모', 비교의 '내 판단'을 쓰면 여기 모입니다.</p>`}
    <span class="label" style="margin-top:14px">내 해석 ${ints.length} <small>— 관찰에서 이끌어 낸 뜻</small></span>${ints.length?ints.map(x=>nbItemHTML(x,"int")).join(""):`<p class="lead">메모의 '해석' 칸에 쓴 것이 여기 모입니다.</p>`}
    ${O.A.length+O.W.length?`<details class="mdet"><summary>이 본문 범위에 있는 다른 메모 ${O.A.length+O.W.length}개 — 노트에 담기</summary><div class="snlist">${O.A.map(a=>`<div class="snitem"><span class="snjump"><b>${esc(a.kind==="range"?rangeLabel(a):PLAN.abbr[a.anchor.book-1]+" "+a.anchor.ch+":"+a.anchor.vs)}</b><span class="snm">${esc((a.observation||a.interpretation||"").slice(0,120))}</span></span><button class="btn small ghost" data-nbadd="${a.id}">담기</button></div>`).join("")}${O.W.map(n=>`<div class="snitem"><span class="snjump"><b>${esc(PLAN.abbr[n.b-1])} ${n.c}:${n.v} · <span class="heb">${esc(n.heb)}</span> ${esc(n.gl)}</b><span class="snm">${esc(n.m||"")}</span></span><button class="btn small ghost" data-nbaddw="${n.t}">담기</button></div>`).join("")}</div></details>`:""}
    ${nbField("concl","중간 결론","관찰과 해석에서 지금까지 이른 결론 — 고쳐 가며 씁니다",s.concl,4)}
    ${nbField("open","남은 질문","아직 확인하지 못한 것, 더 살필 본문",s.open,3)}
    ${nbField("apply","적용","본문의 뜻에서 오늘 청중·나에게 이어지는 것. 본문 근거와 구별해 적으세요",s.apply,4)}
    <p class="lead nbsaved" id="nbSaved">쓰는 대로 이 기기에 저장됩니다.</p>
    <div class="nbexp"><label class="anchk"><input type="checkbox" id="nbSermon"${s.sermon?" checked":""}> 설교 준비용 머리말로 내보내기 (본문 근거 → 본문의 뜻 → 중심 주장 → 더 살필 것 → 적용)</label>
      <div class="row"><button class="btn small" id="nbMdCopy">Markdown 복사</button><button class="btn small ghost" id="nbMdSave">Markdown 내려받기</button><button class="btn small ghost" id="nbPrint">인쇄·PDF</button></div></div>
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn small ghost" id="nbDel">이 연구 지우기</button></div></section>`; }
/* 내보내기: 본문 근거(앱이 모은 메모)와 사용자의 해석·결론·적용을 나눠 적는다 */
function nbMarkdown(s){ const items=nbItems(s), H=s.sermon?["1. 본문 근거 (관찰)","2. 본문의 뜻 (해석)","3. 중심 주장 (중간 결론)","4. 더 살필 것 (남은 질문)","5. 오늘의 적용"]:["관찰한 것","내 해석","중간 결론","남은 질문","적용"];
  const L=[`# ${s.title}`,``,`- 본문: ${nbRangeText(s)}`,`- 연구 질문: ${s.q||"(없음)"}`,`- 작성: ${new Date(s.created).toLocaleDateString("ko-KR")} · 고침: ${new Date(s.updated).toLocaleDateString("ko-KR")} · BHSA ${SD.bhsa||"2021"} · MILALWV`,``];
  L.push(`## ${H[0]}`,``); items.filter(x=>x.obs).forEach(x=>L.push(`- **${x.ref}** (${x.kind}${x.extra?" · "+x.extra:""}): ${x.obs.replace(/\n/g," ")}`)); if(!items.some(x=>x.obs)) L.push("- (없음)");
  L.push(``,`## ${H[1]}`,``); items.filter(x=>x.int).forEach(x=>L.push(`- **${x.ref}**: ${x.int.replace(/\n/g," ")}`)); if(!items.some(x=>x.int)) L.push("- (없음)");
  L.push(``,`## ${H[2]}`,``,s.concl||"(없음)",``,`## ${H[3]}`,``,s.open||"(없음)",``,`## ${H[4]}`,``,s.apply||"(없음)",``,`---`,`본문 근거는 BHSA(ETCBC, CC BY-NC 4.0) 원문에서 확인한 관찰이고, 해석·결론·적용은 작성자의 판단입니다.`);
  return L.join("\n"); }
function nbPrint(s){ const items=nbItems(s), vis=[...new Set(items.map(x=>{ const l=SD.ref.get(x.b+"-"+x.c+"-"+x.v); return l?l[0]:null; }).filter(x=>x!=null))].sort((a,b)=>a-b);
  const md=nbMarkdown(s).split("\n"); const body=`<div class="prnb">${md.slice(2).map(l=>l.startsWith("## ")?`<h2>${esc(l.slice(3))}</h2>`:l.startsWith("- ")?`<p>• ${esc(l.slice(2)).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")}</p>`:l==="---"?"<hr>":l?`<p>${esc(l)}</p>`:"").join("")}${vis.length?`<h2>근거 본문</h2>${vis.map(vi=>prVerse(vi,true)).join("")}`:""}</div>`;
  openPrint(s.title,body); }
function nbCompactHTML(s,aside){ const items=nbItems(s);
  return `<div class="nbcomp">${aside?`<div class="nbch"><b>${esc(s.title)}</b><button class="qx" id="nbSideX" aria-label="옆 노트 닫기">✕</button></div>`:""}<p class="lead" style="margin:0 0 4px">${esc(nbRangeText(s))}${s.q?` — ${esc(s.q)}`:""}</p>
    <span class="label">근거 ${items.length}</span>${items.slice(-5).reverse().map(x=>`<div class="nbit sm"><button class="qlink" data-nbgo="${x.b}-${x.c}-${x.v}">${esc(x.ref)}</button> <small>${esc(x.kind)}</small><p>${esc((x.obs||x.int).slice(0,140))}</p></div>`).join("")||`<p class="lead">아직 없습니다. 본문에서 글자를 골라 '노트에 추가'를 눌러 보세요.</p>`}
    ${nbField("concl","중간 결론","",s.concl,3)}${nbField("open","남은 질문","",s.open,2)}${nbField("apply","적용","",s.apply,3)}
    <div class="row" style="margin-top:6px"><button class="btn small" data-nbopen="${s.id}">노트 전체 열기</button></div></div>`; }
/* 쓰는 대로 저장(다시 그리지 않음) */
function nbBindFields(root,id){ root.querySelectorAll("[data-nbf]").forEach(t=>t.oninput=()=>{ clearTimeout(t._tm); t._tm=setTimeout(()=>{ const s=nbGet(id); if(!s) return; s[t.dataset.nbf]=t.value; nbPut(s); const el=document.getElementById("nbSaved"); if(el) el.textContent="저장했습니다 · "+new Date().toLocaleTimeString("ko-KR"); },400); }); }
function nbOpen(id){ const S=view.st; S.nbView=id||null; S.mode="study"; S.rmode="study"; view.tab="study"; document.getElementById("sheetRoot").innerHTML=""; render(); scrollTo({top:0}); }
function nbOpenSheet(){ const s=nbActive(); if(!s) return; sheet("연구 노트",nbCompactHTML(s,false)); const root=document.getElementById("sheetRoot"); nbBindFields(root,s.id); nbBindCommon(root); }
function nbBindCommon(root){ root.querySelectorAll("[data-nbopen]").forEach(b=>b.onclick=()=>nbOpen(b.dataset.nbopen));
  root.querySelectorAll("[data-nbgo]").forEach(b=>b.onclick=()=>{ const [bb,c,v]=b.dataset.nbgo.split("-").map(Number); const sr=document.getElementById("sheetRoot"); if(sr&&sr.contains(b)) sr.innerHTML=""; view.st.rd="read"; studyOpenVerse(bb,c,v); });
  root.querySelectorAll("[data-nbq]").forEach(b=>b.onclick=()=>nbGo(b.dataset.nbq)); }
/* 띠: 본문·연구 화면 위 */
function nbBarHTML(){ const s=nbActive(), S=view.st; if(!s||!window.UX2||S.mode==="study") return ""; const side=nbSideOn();
  return `<div class="nbbar"><span class="nbt"><small>지금 연구 중</small> <b>${esc(s.title)}</b> <small>근거 ${nbCount(s)}</small></span><button class="btn small ghost" id="nbBarOpen">노트</button>${S.mode==="verse"?`<button class="btn small ghost nbsidebtn" id="nbBarSide">${side?"옆 노트 닫기":"노트 옆에 보기"}</button>`:""}<button class="qx" id="nbBarOff" aria-label="연구 끄기" title="연구 끄기(노트는 남습니다)">✕</button></div>`; }
const nbWide=()=>window.matchMedia&&matchMedia("(min-width:1180px)").matches;
function nbAside(){ const s=nbActive(), S=view.st; const on=!!s&&!!window.UX2&&S.mode==="verse"&&view.tab==="study"&&nbSideOn()&&nbWide(); document.body.classList.toggle("nbside",on);
  let as=document.getElementById("nbAside"); if(!on){ if(as) as.remove(); return; }
  if(!as){ as=document.createElement("aside"); as.id="nbAside"; document.body.appendChild(as); } as.innerHTML=nbCompactHTML(s,true); nbBindFields(as,s.id); nbBindCommon(as);
  const x=as.querySelector("#nbSideX"); if(x) x.onclick=()=>{ try{ localStorage.setItem(NB_SIDE,"0"); }catch(e){} render(); }; }
if(!window.__nbResize){ window.__nbResize=true; addEventListener("resize",()=>{ clearTimeout(window.__nbRT); window.__nbRT=setTimeout(nbAside,200); }); }
function nbBind(m){ const S=view.st; nbBindCommon(m); nbAside();
  const bo=m.querySelector("#nbBarOpen"); if(bo) bo.onclick=()=>{ if(nbWide()&&S.mode==="verse"){ try{ localStorage.setItem(NB_SIDE,"1"); }catch(e){} render(); return; } nbOpenSheet(); };
  const bs=m.querySelector("#nbBarSide"); if(bs) bs.onclick=()=>{ try{ localStorage.setItem(NB_SIDE,nbSideOn()?"0":"1"); }catch(e){} render(); };
  const bx=m.querySelector("#nbBarOff"); if(bx) bx.onclick=()=>{ nbSetActive(""); toast("연구를 껐습니다. 노트는 연구 탭에 남아 있습니다."); render(); };
  if(S.mode!=="study") return;
  const mk=m.querySelector("#nbMake"); if(mk) mk.onclick=()=>{ const t=m.querySelector("#nbT").value.trim(); if(!t){ toast("제목을 적어 주세요."); return; } if(nbLoad().some(x=>x.title===t)){ toast("같은 제목의 연구가 있습니다."); return; }
    const R=nbParseRanges(m.querySelector("#nbR").value); if(R.err){ toast(R.err); return; } const now=Date.now(); const s={id:"s"+now.toString(36),title:t,q:m.querySelector("#nbQ").value.trim(),ranges:R,concl:"",open:"",apply:"",wn:[],created:now,updated:now};
    if(nbPut(s)){ nbSetActive(s.id); toast("연구를 시작했습니다. 이제 쓰는 메모가 이 노트에 모입니다."); nbOpen(s.id); } };
  const s=S.nbView?nbGet(S.nbView):null; if(!s) return; nbBindFields(m,s.id);
  const bl=m.querySelector("#nbList"); if(bl) bl.onclick=()=>nbOpen("");
  const on=m.querySelector("#nbOn"); if(on) on.onclick=()=>{ nbSetActive(s.id); render(); }; const off=m.querySelector("#nbOff"); if(off) off.onclick=()=>{ nbSetActive(""); render(); };
  const ti=m.querySelector("#nbTitle"); if(ti) ti.onchange=()=>{ const t=ti.value.trim(); if(!t||t===s.title){ ti.value=s.title; return; } if(nbLoad().some(x=>x.title===t&&x.id!==s.id)){ toast("같은 제목의 연구가 있습니다."); ti.value=s.title; return; }
    const old=nbTagOf(s); s.title=t; nbPut(s); const nw=nbTagOf(s); const L=anList().filter(a=>(a.tags||[]).includes(old)); Promise.all(L.map(a=>anSave(Object.assign({},a,{tags:a.tags.map(x=>x===old?nw:x)})))).then(()=>{ toast(`제목을 바꾸고 메모 ${L.length}개의 표시도 고쳤습니다.`); render(); }); };
  m.querySelectorAll("[data-nbr]").forEach(b=>b.onclick=()=>{ const r=s.ranges[+b.dataset.nbr]; view.st.rd="read"; studyOpenVerse(r.b,r.c1,r.v1||1); });
  const re=m.querySelector("#nbREdit"); if(re) re.onclick=()=>{ sheet("본문 범위 고치기",`<input id="nbR2" type="text" value="${esc(nbRangeText(s))}" style="width:100%;font:inherit;padding:8px;box-sizing:border-box"><p class="lead">쉼표로 같은 책 안의 절을, ; 로 다른 책을 잇습니다. 예: 욘 1:1-3, 3:1-3; 미 4:1-3</p><button class="sbtn" id="nbR2Go">고치기</button>`);
    document.getElementById("nbR2Go").onclick=()=>{ const R=nbParseRanges(document.getElementById("nbR2").value); if(R.err){ toast(R.err); return; } s.ranges=R; nbPut(s); document.getElementById("sheetRoot").innerHTML=""; render(); }; };
  m.querySelectorAll("[data-nbadd]").forEach(b=>b.onclick=()=>{ const a=anList().find(x=>x.id===b.dataset.nbadd); if(a) nbTagAnnot(a,s).then(()=>{ toast("노트에 담았습니다."); render(); }).catch(e=>toast("담지 못했습니다: "+e.message)); });
  m.querySelectorAll("[data-nbaddw]").forEach(b=>b.onclick=()=>{ s.wn=[...new Set([...(s.wn||[]),+b.dataset.nbaddw])]; nbPut(s); render(); });
  if(window.bindAnnots) bindAnnots(m);
  const sm=m.querySelector("#nbSermon"); if(sm) sm.onchange=()=>{ s.sermon=sm.checked; nbPut(s); };
  const mc=m.querySelector("#nbMdCopy"); if(mc) mc.onclick=()=>{ const t=nbMarkdown(nbGet(s.id)); window.__lastNbMd=t; if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast("Markdown 으로 복사했습니다."),()=>toast("복사하지 못했습니다.")); };
  const ms=m.querySelector("#nbMdSave"); if(ms) ms.onclick=()=>{ const t=nbMarkdown(nbGet(s.id)), a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([t],{type:"text/markdown"})); a.download=`연구노트-${s.title}.md`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
  const pr=m.querySelector("#nbPrint"); if(pr) pr.onclick=()=>nbPrint(nbGet(s.id));
  const dl=m.querySelector("#nbDel"); if(dl) dl.onclick=()=>{ if(!confirm(`'${s.title}' 연구를 지울까요? 메모는 지우지 않고, 메모에 단 '${nbTagOf(s)}' 표시만 뗍니다.`)) return; const tag=nbTagOf(s); const L=anList().filter(a=>(a.tags||[]).includes(tag));
    Promise.all(L.map(a=>anSave(Object.assign({},a,{tags:a.tags.filter(x=>x!==tag)})))).then(()=>{ nbSave(nbLoad().filter(x=>x.id!==s.id)); if(nbActiveId()===s.id) nbSetActive(""); toast("연구를 지웠습니다(메모는 남아 있습니다)."); nbOpen(""); }); }; }
/* 백업: 연구 노트는 id 별로 더 새것을 남긴다 */
function nbMerge(list){ if(!Array.isArray(list)) return 0; const L=nbLoad(), by=new Map(L.map(s=>[s.id,s])); let n=0; for(const s of list){ if(!s||!s.id||!s.title||!Array.isArray(s.ranges)) continue; const c=by.get(s.id); if(!c||(s.updated||0)>(c.updated||0)){ by.set(s.id,s); n++; } } nbSave([...by.values()].sort((a,b)=>b.updated-a.updated)); return n; }
