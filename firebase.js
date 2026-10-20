/* ===== firebase.js: Google 로그인 + 원어 메모 동기화 (users/{uid}/study/notes) =====
   보는 것은 로그인 없이 됩니다. 로그인은 메모를 기기끼리 맞출 때만 씁니다. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, deleteDoc, getDocs, query, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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

  onAuthStateChanged(auth,async u=>{
    A.user=u; A.ready=true; if(unsub){ unsub(); unsub=null; }
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
