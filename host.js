/* ===== host.js: CBSR 앱이 주던 것을 MILALWV가 대신 줌 =====
   study_ui.js · study_q.js · study_theory.js 는 여기 있는 이름들에 기댑니다.
   view, render, sheet, toast, esc, PLAN, BIBLE/TR/TR_INFO, 원어 메모 저장 자리 */
window.APP_NAME="MILAL";

/* 화면 상태 */
const view={tab:"study",st:{},snAll:false};

/* 성경 책 이름 (구약 39권, 개역 표기) */
const PLAN={
  full:["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기"],
  abbr:["창","출","레","민","신","수","삿","룻","삼상","삼하","왕상","왕하","대상","대하","스","느","에","욥","시","잠","전","아","사","렘","애","겔","단","호","욜","암","옵","욘","미","나","합","습","학","슥","말"]
};

/* 번역 본문: study/bible.json (pipeline/make_bible.py로 만듦). BIBLE[책-1][장-1][절-1] */
window.BIBLE=null; const TR="tr", TR_INFO={tr:{name:""}};
function bibleLoad(){ return trApply(trId()); } /* app/menu.js: 고른 번역본을 불러옴 */

/* 도움 함수 */
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function render(){ const m=document.getElementById("main"); m.innerHTML=renderStudy(); bindStudy(m); navSync(); }

/* ===== 하단 탭 4개: 본문 · 구조 · 연구 · 기록 =====
   본문·구조 = mode "verse"(rd read/struct) · 연구 = mode tool/word/query/theory · 기록 = mode "notes"
   탭을 바꿔도 보고 있던 책·장(view.st.R, vc)은 그대로입니다. */
const RESEARCH_MODES=["tool","word","query","theory"];
function navOf(){ const S=view.st; if(S.pick||!S.entered||!S.R) return "";
  if(S.mode==="notes") return "notes"; if(RESEARCH_MODES.includes(S.mode)) return "research";
  return (typeof rdMode==="function"?rdMode():"read")==="struct"?"struct":"text"; }
function navSync(){ const cur=navOf(); document.querySelectorAll(".bnav [data-nav]").forEach(b=>b.setAttribute("aria-selected",b.dataset.nav===cur)); }
function bindNav(){ document.querySelectorAll(".bnav [data-nav]").forEach(b=>b.onclick=()=>{ const S=view.st, k=b.dataset.nav;
  if(typeof SD==="undefined"||!SD) return;
  if(!S.R) setRange(lastRange()||{b:1,c1:1,c2:1});
  S.home=false; S.entered=true; S.pick=false; S.more=1;
  if(k==="text"||k==="struct"){ S.mode="verse"; S.rd=k==="text"?"read":"struct"; try{ localStorage.setItem("milal-study-vm",S.rd); }catch(e){} }
  else if(k==="research"){ S.mode=RESEARCH_MODES.includes(S.rmode)?S.rmode:"tool"; if(S.mode==="tool"&&S.range==="all") S.range="book"; }
  else if(k==="notes") S.mode="notes";
  render(); scrollTo({top:0}); }); }
function sheet(title,body){
  const root=document.getElementById("sheetRoot");
  root.innerHTML=`<div class="sheet-bg" id="sheetBg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h3>${esc(title)}</h3><button class="iconbtn sheet-x" id="sheetX" aria-label="닫기">✕</button></div>${body}<div class="row sheet-foot"><button class="btn small" id="sheetClose">닫기</button></div></div></div>`;
  const close=()=>{ root.innerHTML=""; };
  document.getElementById("sheetClose").onclick=close;
  document.getElementById("sheetBg").onclick=e=>{ if(e.target.id==="sheetBg") close(); };
  document.getElementById("sheetX").onclick=close;
  const sh=root.querySelector(".sheet"); sh.scrollTop=0; try{ document.getElementById("sheetX").focus({preventScroll:true}); }catch(e){}
}
function toast(msg){ let t=document.getElementById("toast"); if(!t){ t=document.createElement("div"); t.id="toast"; t.className="toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2600); }

/* ===== 계정 (firebase.js가 채움) — SDK는 첫 화면이 뜬 뒤, 또는 로그인·나눔을 누를 때 받는다 ===== */
function loadFirebase(){ if(!window.FIREBASE_CONFIG) return Promise.resolve(); if(window.__fb) return window.__fb; return window.__fb=import("./firebase.js?v=5").catch(e=>{ console.warn(e); window.__fb=null; }); }
window.MILAL_AUTH={user:null,ready:false,signIn:null,signOut:null};
function hostAcctHTML(){ const A=window.MILAL_AUTH, u=A.user;
  if(!window.FIREBASE_CONFIG) return "";
  if(u) return `<button class="acct on" id="acctBtn" title="${esc(u.displayName||u.email||"")}">${u.photoURL?`<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">`:`<i>${esc((u.displayName||u.email||"?").slice(0,1))}</i>`}</button>`;
  return `<button class="acct" id="acctBtn">${A.ready?"로그인":"…"}</button>`; }
function bindHostAcct(el){ const b=el.querySelector("#acctBtn"); if(!b) return; b.onclick=()=>{ const A=window.MILAL_AUTH;
  if(A.user){ sheet("계정",`<p>${esc(A.user.displayName||"")}</p><p class="lead">${esc(A.user.email||"")}</p><p class="lead" style="margin-top:8px">로그인한 동안 원어 메모가 기기끼리 맞춰집니다.</p><button class="sbtn ghost" id="acctOut">로그아웃</button>`);
    document.getElementById("acctOut").onclick=()=>{ A.signOut&&A.signOut(); document.getElementById("sheetRoot").innerHTML=""; }; }
  else if(A.ready&&A.signIn) A.signIn(); }; }
function refreshAcct(){ const el=document.getElementById("hostAcct"); if(el){ el.innerHTML=hostMenuHTML(); bindHostMenu(el); } }
function noteStoreHint(){ const A=window.MILAL_AUTH; return A.user?"로그인 중이라 다른 기기에서도 같은 메모를 봅니다.":"원어 메모는 이 기기에만 저장됩니다. 로그인하면 기기끼리 맞춥니다."; }

/* ===== 원어 메모 목록 (아래에서 올라오는 창) ===== */
function openNotesSheet(){ const L=studyNotes(); const show=view.snAll?L:L.slice(0,30);
  sheet(`원어 메모 · ${L.length}`, L.length?`<div class="snlist">${show.map(n=>`<div class="snitem"><button class="snjump" data-snj="${n.b}-${n.c}-${n.v}"><span class="heb">${esc(n.heb)}</span><b>${esc(n.gl)}</b><small>${esc(PLAN.abbr[n.b-1])} ${n.c}:${n.v===0?"표제":n.v}${n.st?` · H${n.st}`:""}</small>${n.m?`<span class="snm">${esc(n.m)}</span>`:""}</button><button class="sndel" data-snd="${n.t}" aria-label="지우기">✕</button></div>`).join("")}</div>${L.length>30?`<button class="morebtn" id="snAll">${view.snAll?"접기 ▴":`${L.length-30}개 더 보기 ▾`}</button>`:""}<p class="lead" style="margin-top:8px">${esc(noteStoreHint())}</p>`
    :`<p class="lead">아직 메모가 없습니다. 읽기 화면에서 절을 누르고 낱말을 고른 뒤 '메모 남기기'를 누르세요.</p>`);
  const root=document.getElementById("sheetRoot");
  root.querySelectorAll("[data-snj]").forEach(b=>b.onclick=()=>{ const [bb,c,v]=b.dataset.snj.split("-").map(Number); root.innerHTML=""; view.st.rd="read"; studyOpenVerse(bb,c,v); });
  root.querySelectorAll("[data-snd]").forEach(b=>b.onclick=()=>{ const t=+b.dataset.snd; saveStudyNotes(studyNotes().filter(n=>n.t!==t)); openNotesSheet(); });
  const a=document.getElementById("snAll"); if(a) a.onclick=()=>{ view.snAll=!view.snAll; openNotesSheet(); }; }

/* 시작 */
document.addEventListener("DOMContentLoaded",()=>{ bindNav(); render(); if(!SD) studyIntro(); bibleLoad(); (studyLoad((lastRange()||{b:1}).b)||Promise.resolve()).then(()=>{ tutorialMaybe(); const go=()=>loadFirebase(); if(window.requestIdleCallback) requestIdleCallback(go,{timeout:4000}); else setTimeout(go,2500); }); });
