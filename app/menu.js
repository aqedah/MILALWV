/* ===== 우상단 메뉴: 계정 · 번역본 · 주야간 · 홈 화면에 추가 · 튜토리얼 · MILAL 소개 · 자료 출처 ===== */

/* --- 번역본 --- */
const TR_LIST=[{id:"krh",dir:"study/bible/krh",name:"개역한글"},{id:"none",name:"원문만 (번역 숨김)"}];
const TR_CACHE={}; /* id → {info, books:{b: [...]}} */
function trId(){ try{ const v=localStorage.getItem("milal-tr"); return TR_LIST.some(t=>t.id===v)?v:"krh"; }catch(e){ return "krh"; } }
function trApply(id){ const t=TR_LIST.find(x=>x.id===id)||TR_LIST[0]; try{ localStorage.setItem("milal-tr",t.id); }catch(e){}
  if(!t.dir){ window.BIBLE=null; TR_INFO.tr.name=""; TR_INFO.tr.src=""; if(typeof SD!=="undefined"&&SD) render(); return Promise.resolve(); }
  const C=TR_CACHE[t.id] ||= {info:null,books:new Array(39),pend:{}}; window.BIBLE=C.books;
  const info=C.info?Promise.resolve(C.info):fetch(t.dir+"/info.json?v="+(window.STUDY_V||"1")).then(r=>r.json()).then(j=>{ C.info=j; return j; }).catch(()=>({name:t.name}));
  return info.then(j=>{ TR_INFO.tr.name=j.name||t.name; TR_INFO.tr.src=j.src||""; const b=(typeof view!=="undefined"&&view.st.R)?view.st.R.b:(lastRange()||{b:1}).b; return bibleBook(b); }); }
/* 번역 본문 책 하나 (보고 있는 책만 받는다) */
function bibleBook(b){ const t=TR_LIST.find(x=>x.id===trId()); if(!t||!t.dir) return Promise.resolve(); const C=TR_CACHE[t.id] ||= {info:null,books:new Array(39),pend:{}}; window.BIBLE=C.books;
  if(C.books[b-1]) return Promise.resolve(); if(C.pend[b]) return C.pend[b];
  return C.pend[b]=fetch(`${t.dir}/${b}.json?v=`+(window.STUDY_V||"1")).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(j=>{ C.books[b-1]=j; delete C.pend[b]; if(typeof SD!=="undefined"&&SD) render(); }).catch(()=>{ delete C.pend[b]; }); }

/* --- 주야간 --- */
function themeGet(){ try{ return localStorage.getItem("milal-theme")||"auto"; }catch(e){ return "auto"; } }
function themeApply(v){ v=v||themeGet(); const h=document.documentElement; if(v==="auto") h.removeAttribute("data-theme"); else h.setAttribute("data-theme",v);
  const dark=v==="dark"||(v==="auto"&&matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute("content",dark?"#161B26":"#FBF8F1"); }
function themeSet(v){ try{ localStorage.setItem("milal-theme",v); }catch(e){} themeApply(v); }

/* --- 홈 화면에 추가 --- */
window.__bip=null; addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); window.__bip=e; });
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
function openInstallSheet(){
  if(isStandalone()){ sheet("홈 화면에 추가",`<p>이미 홈 화면에서 열고 있습니다.</p>`); return; }
  if(window.__bip){ window.__bip.prompt(); window.__bip.userChoice.then(r=>{ if(r.outcome==="accepted") toast("홈 화면에 추가했습니다."); window.__bip=null; }); return; }
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
  sheet("홈 화면에 추가",ios?`<ol class="tut"><li>Safari 아래쪽 가운데의 <b>공유</b> 단추(네모에서 화살표가 올라가는 모양)를 누릅니다.</li><li>아래로 내려 <b>홈 화면에 추가</b>를 누릅니다.</li><li>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 MILAL 아이콘이 생깁니다.</li></ol><p class="lead">홈 화면에서 열면 주소 막대 없이 앱처럼 씁니다.</p>`
    :`<ol class="tut"><li>브라우저 오른쪽 위 <b>⋮</b>(메뉴)를 누릅니다.</li><li><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누릅니다.</li></ol><p class="lead">Chrome에서는 주소 막대 오른쪽에 설치 아이콘이 나오기도 합니다. 홈 화면에서 열면 주소 막대 없이 앱처럼 씁니다.</p>`); }

/* --- 튜토리얼 --- */
function openTutorial(){
  sheet("처음 쓰는 법",`<ol class="tut">
    <li><b>본문</b> — 번역과 히브리어 원문을 같이 읽습니다. 절을 누르면 낱말 띠가 펼쳐지고, 낱말을 누르면 뜻·문법·사전 풀이가 나옵니다. 위의 <b>창 1장 ▾</b>를 누르면 다른 책·장으로 갑니다.</li>
    <li><b>구조</b> — 같은 장을 문장 단위(절 원자)로 늘어놓고, 어느 문장이 어느 문장에 기대어 있는지 선으로 보여 줍니다. 색은 이야기 줄기·배경·표지·인물의 말입니다. ⇕로 인물의 말을 모두 접으면 이야기 뼈대만 남습니다.</li>
    <li><b>연구</b> — 도구(반복·화자·장면·전환·인물)로 이 범위를 살피고, 낱말 검색과 검색식(Text-Fabric식)을 씁니다. 결과를 누르면 그 절로 갑니다. 이론은 내러티브 비평 입문입니다.</li>
    <li><b>기록</b> — 낱말에서 '메모 남기기'로 남긴 원어 메모를 모아 봅니다. 로그인하면 기기끼리 맞춰지고, 메모를 다른 이들과 나눌 수도 있습니다.</li>
    <li>오른쪽 위 <b>☰</b> — 로그인, 번역본, 밝기, 홈 화면에 추가가 있습니다.</li></ol>
    <p class="lead">자동으로 찾아 주는 것은 '관찰 후보'입니다. 판정은 읽는 이가 합니다.</p>`);
  try{ localStorage.setItem("milal-tut-seen","1"); }catch(e){} }
function tutorialMaybe(){ try{ if(localStorage.getItem("milal-tut-seen")) return; }catch(e){ return; } setTimeout(()=>{ if(!document.querySelector(".sheet-bg")&&!document.getElementById("sIntro")) openTutorial(); },1800); }

/* --- MILAL 소개 --- */
function openAbout(){
  sheet("MILAL이란",`<p><b>MILAL</b>은 <b>M</b>arker-<b>I</b>nformed <b>L</b>inguistic <b>A</b>nalysis of <b>L</b>ayers — '표지에 바탕을 둔 문장 층 분석'의 머리글자입니다. 히브리어 문장이 앞뒤 문장과 어떤 관계로 묶이는지를, 와예히·접속사·동사 형태 같은 <b>표지</b>를 근거로 판정하는 연구 방법이자, 욥기를 대상으로 그 규칙을 만들고 검증하는 분석 장치의 이름입니다.</p>
  <p>이 앱(MILALWV, MILAL Web View)은 그 결과를 누구나 휴대전화에서 볼 수 있게 만든 창입니다. 구약 히브리어 원문(BHSA)을 읽고, 문장 구조를 보고, 낱말과 문법 현상을 찾고, 본 것을 기록합니다.</p>
  <p>묻는 질문은 하나입니다. <b>"이 문장은 앞뒤 문장과 어떤 관계를 맺으며, 그 관계는 본문을 이해하는 데 무엇을 밝혀 주는가?"</b></p>
  <p class="lead">제작: 이츠학(이츠학아카데미) · 무료·비영리로 운영합니다(BHSA CC BY-NC 4.0). <a href="https://www.youtube.com/@이츠학아카데미" target="_blank" rel="noopener">유튜브</a> · <a href="https://github.com/aqedah/MILALWV" target="_blank" rel="noopener">GitHub</a></p>`); }

/* --- 오른쪽 서랍: 오른쪽에서 나오고, 오른쪽으로 밀면(스와이프) 닫힘 --- */
function drawer(title,body){
  const root=document.getElementById("sheetRoot"), was=!!root.querySelector(".drawer.in");
  root.innerHTML=`<div class="sheet-bg drawer-bg" id="sheetBg"><div class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h3>${esc(title)}</h3><button class="iconbtn sheet-x" id="sheetX" aria-label="닫기">✕</button></div>${body}</div></div>`;
  const bg=root.querySelector("#sheetBg"), d=root.querySelector(".drawer");
  const close=()=>{ d.classList.add("out"); bg.classList.add("out"); setTimeout(()=>{ if(root.contains(bg)) root.innerHTML=""; },220); };
  bg.onclick=e=>{ if(e.target===bg) close(); }; root.querySelector("#sheetX").onclick=close;
  if(was){ d.classList.add("in","noanim"); bg.classList.add("in","noanim"); } else requestAnimationFrame(()=>{ d.classList.add("in"); bg.classList.add("in"); });
  /* 스와이프 */
  let x0=null,y0=null,dx=0,drag=false;
  d.addEventListener("touchstart",e=>{ const t=e.touches[0]; x0=t.clientX; y0=t.clientY; dx=0; drag=false; },{passive:true});
  d.addEventListener("touchmove",e=>{ if(x0==null) return; const t=e.touches[0]; const mx=t.clientX-x0, my=t.clientY-y0;
    if(!drag&&Math.abs(mx)>12&&Math.abs(mx)>Math.abs(my)*1.3) drag=true;
    if(drag){ dx=Math.max(0,mx); d.style.transition="none"; d.style.transform=`translateX(${dx}px)`; } },{passive:true});
  d.addEventListener("touchend",()=>{ if(drag&&dx>d.offsetWidth*0.28){ d.style.transition=""; close(); } else { d.style.transition=""; d.style.transform=""; } x0=null; drag=false; });
  return close; }

/* --- 메뉴 --- */
function hostMenuHTML(){ const A=window.MILAL_AUTH, u=A.user;
  return `<button class="menubtn" id="menuBtn" aria-label="메뉴">${u&&u.photoURL?`<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">`:`<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`}</button>`; }
function openMenu(){ const A=window.MILAL_AUTH, u=A.user, th=themeGet(), tr=trId(); if(window.loadFirebase&&!window.__fb) loadFirebase().then(()=>{ if(document.querySelector(".drawer")) openMenu(); });
  const acct=!window.FIREBASE_CONFIG?"":u?`<div class="mrow"><span class="micon">${u.photoURL?`<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-replace">`:"👤"}</span><span class="mtxt"><b>${esc(u.displayName||"")}</b><small>로그인 중 · 메모가 기기끼리 맞춰집니다</small></span><button class="btn small ghost" id="mOut">로그아웃</button></div>`
    :`<div class="mrow"><span class="micon">👤</span><span class="mtxt"><b>로그인</b><small>Google · 원어 메모를 기기끼리 맞추고 나눌 때만 필요합니다</small></span><button class="btn small" id="mIn"${A.ready?"":" disabled"}>로그인</button></div>`;
  drawer("메뉴",`${acct}
   <div class="mgrp">번역본</div><div class="seg sseg mseg">${TR_LIST.map(t=>`<button aria-checked="${tr===t.id}" data-mtr="${t.id}">${esc(t.name.replace(/ \(.*\)/,""))}</button>`).join("")}</div><p class="lead" style="margin:2px 0 0">개역개정은 준비되는 대로 넣습니다.</p>
   <div class="mgrp">밝기</div><div class="seg sseg mseg">${[["auto","기기 설정대로"],["light","밝게"],["dark","어둡게"]].map(([k,n])=>`<button aria-checked="${th===k}" data-mth="${k}">${n}</button>`).join("")}</div>
   <div class="mlist">
     <button class="mitem" id="mInstall"><span>📲</span>홈 화면에 추가</button>
     <button class="mitem" id="mTut"><span>📖</span>처음 쓰는 법</button>
     <button class="mitem" id="mAbout"><span>✡</span>MILAL이란</button>
     <button class="mitem" id="mSrc"><span>©</span>자료 출처와 사용 조건</button>
   </div>`);
  const root=document.getElementById("sheetRoot"), close=()=>{ root.innerHTML=""; };
  const on=(id,fn)=>{ const el=root.querySelector("#"+id); if(el) el.onclick=fn; };
  on("mIn",()=>{ close(); A.signIn&&A.signIn(); }); on("mOut",()=>{ close(); A.signOut&&A.signOut(); });
  root.querySelectorAll("[data-mtr]").forEach(b=>b.onclick=()=>{ trApply(b.dataset.mtr); openMenu(); });
  root.querySelectorAll("[data-mth]").forEach(b=>b.onclick=()=>{ themeSet(b.dataset.mth); openMenu(); });
  on("mInstall",()=>{ close(); openInstallSheet(); }); on("mTut",()=>{ close(); openTutorial(); }); on("mAbout",()=>{ close(); openAbout(); });
  on("mSrc",()=>{ close(); const s=document.querySelector(".ssrc"); if(s) s.scrollIntoView({behavior:"smooth",block:"start"}); }); }
function bindHostMenu(el){ const b=el.querySelector("#menuBtn"); if(b) b.onclick=openMenu; }

themeApply();
if(matchMedia){ try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>themeApply()); }catch(e){} }
