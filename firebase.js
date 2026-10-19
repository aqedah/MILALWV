/* ===== firebase.js: Google 로그인 + 원어 메모 동기화 (users/{uid}/study/notes) =====
   보는 것은 로그인 없이 됩니다. 로그인은 메모를 기기끼리 맞출 때만 씁니다. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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
  window.onNotesSaved=L=>{ if(applying||!A.user) return; setDoc(noteRef(A.user),{list:L,at:Date.now()}).catch(e=>{ console.warn(e); toast("메모를 올리지 못했습니다: "+(e.code||"")); }); };
}
