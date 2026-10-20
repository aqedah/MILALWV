/* ===== firebase.js: Google 로그인 + 원어 메모 동기화 (users/{uid}/study/notes) =====
   보는 것은 로그인 없이 됩니다. 로그인은 메모를 기기끼리 맞출 때만 씁니다. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, deleteDoc, getDocs, query, orderBy, limit, where, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const A=window.MILAL_AUTH;
if(!window.FIREBASE_CONFIG){ A.ready=false; }
else {
  const app=initializeApp(window.FIREBASE_CONFIG), auth=getAuth(app), db=getFirestore(app), prov=new GoogleAuthProvider();
  let unsub=null, applying=false;
  const noteRef=u=>doc(db,"users",u.uid,"study","notes");
  const merge=(a,b)=>{ const M=new Map(); [...a,...b].forEach(n=>{ if(n&&n.t&&!M.has(n.t)) M.set(n.t,n); }); return [...M.values()].sort((x,y)=>y.t-x.t).slice(0,500); };
  const localSet=L=>{ applying=true; try{ localStorage.setItem("milal-study-notes",JSON.stringify(L)); }catch(e){} applying=false; };

  A.signIn=async()=>{ try{ await signInWithPopup(auth,prov); }catch(e){ if(e&&/popup|cancel/i.test(e.code||"")) { try{ await signInWithRedirect(auth,prov); }catch(e2){ toast("로그인하지 못했습니다."); } } else { console.warn(e); toast("로그인하지 못했습니다: "+(e.code||e.message||"")); } } };
  A.signOut=async()=>{ try{ await signOut(auth); toast("로그아웃했습니다."); }catch(e){} };
  getRedirectResult(auth).catch(()=>{});

  /* ===== 연구 기록(annots) 동기화 — app/sync_core.js 의 규칙으로. 스위치(ANNOT_SYNC_ENABLED)가 꺼져 있으면 아무것도 안 함 =====
     올리기: 저장할 때마다(1.5초 모아서) dirty 기록을 트랜잭션으로. 내려받기: 모음 onSnapshot. 충돌은 메모 안에 ⟪충돌 사본⟫으로 남기고 알린다. */
  let anUnsub=null, pushTimer=null, pushing=false;
  const anRef=(u,id)=>doc(db,"users",u.uid,"annots",id);
  const deps=u=>({device:(typeof AN_DEVICE!=="undefined"?AN_DEVICE:"?"),serverTs:()=>serverTimestamp(),now:()=>new Date().toLocaleString("ko-KR"),
    transaction:fn=>runTransaction(db,async tx=>{ const t={ get:async id=>{ const s=await tx.get(anRef(u,id)); return s.exists()?s.data():null; }, set:(id,d)=>tx.set(anRef(u,id),d) }; return fn(t); })});
  const syncState=(text,extra)=>{ window.ANNOT_SYNC_STATE=Object.assign({text,pending:0,conflicts:0},window.ANNOT_SYNC_STATE||{},{text},extra||{}); };
  async function pushDirty(){ const u=A.user; if(!u||!window.ANNOT_SYNC_ENABLED||!window.SYNC_CORE||pushing) return; pushing=true;
    try{ const L=(await anAllRaw()).filter(a=>a.dirty||(a.srv_rev==null&&!a.deleted)); if(!L.length){ syncState("맞춤",{pending:0}); return; }
      const r=await SYNC_CORE.syncPushAll(L,deps(u)); const changed=r.ok.filter(x=>x.action!=="noop").map(x=>x.record); const conf=r.ok.filter(x=>x.action==="merged_conflict").length;
      if(changed.length) await anPutMany(changed);
      syncState(r.failed.length?`일부 실패(${r.failed.length}건, 다시 시도함)`:"맞춤",{pending:r.failed.length,conflicts:(window.ANNOT_SYNC_STATE?.conflicts||0)+conf});
      if(conf) toast(`다른 기기와 겹친 수정 ${conf}건 — 양쪽 글을 모두 남겼습니다(메모 안 ⟪충돌 사본⟫).`);
      if(r.failed.length) setTimeout(pushDirty,15000);
      if(changed.length&&view.st.mode==="notes") render();
    }catch(e){ console.warn(e); syncState("올리지 못함: "+(e.code||e.message)); }
    finally{ pushing=false; } }
  function schedulePush(){ clearTimeout(pushTimer); pushTimer=setTimeout(pushDirty,1500); }
  function startAnnotSync(u){ if(!window.ANNOT_SYNC_ENABLED||!window.SYNC_CORE) return; syncState("연결 중");
    anUnsub=onSnapshot(collection(db,"users",u.uid,"annots"),async snap=>{ try{ const L=await anAllRaw(); const M=new Map(L.map(a=>[a.id,a])); const put=[];
        snap.docChanges().forEach(ch=>{ if(ch.type==="removed") return; const r=SYNC_CORE.syncPullOne(M.get(ch.doc.id),ch.doc.data()); if(r.action==="added"||r.action==="replaced") put.push(r.record); });
        if(put.length){ await anPutMany(put); render(); } syncState("맞춤"); schedulePush(); }catch(e){ console.warn(e); syncState("내려받지 못함: "+(e.code||e.message)); } },
      e=>{ console.warn(e); syncState(/permission/i.test(e.code||"")?"서버 규칙이 아직 열리지 않음(기기 저장만)":"연결 실패: "+(e.code||e.message)); });
    window.onAnnotSaved=()=>schedulePush(); window.onAnnotDeleted=()=>schedulePush(); window.addEventListener("online",schedulePush); }
  function stopAnnotSync(){ if(anUnsub){ anUnsub(); anUnsub=null; } window.onAnnotSaved=null; window.onAnnotDeleted=null; window.ANNOT_SYNC_STATE=null; }
  window.MILAL_ANNOT_SYNC={pushNow:pushDirty};

  onAuthStateChanged(auth,async u=>{
    A.user=u; A.ready=true; if(unsub){ unsub(); unsub=null; } stopAnnotSync(); if(u) startAnnotSync(u);
    if(u){
      try{
        const snap=await getDoc(noteRef(u)); const remote=snap.exists()?(snap.data().list||[]):[];
        const local=studyNotes(); const L=merge(local,remote); localSet(L);
        if(L.length!==remote.length) await setDoc(noteRef(u),{list:L,at:Date.now()});
        unsub=onSnapshot(noteRef(u),s=>{ if(!s.exists()) return; const R=s.data().list||[]; localSet(R); });
      }catch(e){ console.warn(e); toast("메모를 맞추지 못했습니다: "+(e.code||"")); }
    }
    refreshAcct();
  });
  /* 나눔: shared 모음. 읽기는 누구나, 쓰기는 로그인한 사람이 자기 이름으로만 (Firestore 규칙은 HANDOFF 2절) */
  window.MILAL_SHARE={
    /* 공개 조회는 hidden==false 조건을 꼭 붙인다(규칙이 그 조건 없는 조회를 거부). 관리자(all=true)만 숨긴 글까지 전부 */
    list:async(all)=>{ const q=all?query(collection(db,"shared"),orderBy("t","desc"),limit(60)):query(collection(db,"shared"),where("hidden","==",false),orderBy("t","desc"),limit(60)); const s=await getDocs(q); return s.docs.map(d=>({id:d.id,...d.data()})); },
    add:async n=>{ const u=A.user; if(!u) throw new Error("로그인이 필요합니다"); const {b,c,v,heb,gl,st,m,lex,han}=n; return addDoc(collection(db,"shared"),{uid:u.uid,name:(u.displayName||"").slice(0,60),b,c,v,heb:(heb||"").slice(0,200),gl:(gl||"").slice(0,200),st:st||0,m:(m||"").slice(0,500),lex:(lex||"").slice(0,200),han:(han||"").slice(0,200),t:Date.now(),hidden:false}); },  /* 사진은 올리지 않음. hidden=false 로 시작 */
    remove:async id=>deleteDoc(doc(db,"shared",id)),
    /* 관리자 여부: admins/{uid} 문서가 있으면(콘솔에서만 만듦). 규칙이 본인 것만 읽게 하므로 남의 것은 알 수 없다 */
    isAdmin:async()=>{ const u=A.user; if(!u) return false; try{ const s=await getDoc(doc(db,"admins",u.uid)); return s.exists(); }catch(e){ return false; } },
    /* 관리자 숨김·보이기: hidden 칸만 고친다(내용은 못 고침 — 규칙) */
    hide:async(id,flag)=>updateDoc(doc(db,"shared",id),{hidden:!!flag}),
    /* 신고: 로그인한 사람이 reports/ 에 만들기만. 읽기는 관리자만 */
    report:async(id,reason)=>{ const u=A.user; if(!u) throw new Error("로그인이 필요합니다"); return addDoc(collection(db,"reports"),{shared_id:String(id).slice(0,64),reason:(reason||"").slice(0,300),uid:u.uid,t:serverTimestamp()}); }
  };
  window.onNotesSaved=L=>{ if(applying||!A.user) return; setDoc(noteRef(A.user),{list:L,at:Date.now()}).catch(e=>{ console.warn(e); toast("메모를 올리지 못했습니다: "+(e.code||"")); }); };
}
