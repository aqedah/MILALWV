/* ===== 검색식 Web Worker — 주 스레드와 같은 엔진(study_qe.js)을 그대로 읽어 계산만 한다(엔진을 다시 구현하지 않음).
   메시지: {type:"data", key, SD, PLAN} 자료 넣기 · {type:"run", seq, text, sp, limit} 실행 → {type:"result", seq, …} 또는 {type:"error", seq, message}
   자료는 주 스레드가 책을 더 받을 때마다 key(받은 책 목록)가 바뀌면 다시 보낸다. ===== */
let SD=null, PLAN=null, DATA_KEY=null;
try{ importScripts("study_qe.js?v="+(self.name||"1")); }catch(e){ self.postMessage({type:"fatal",message:"엔진을 읽지 못했습니다: "+e.message}); }
self.onmessage=ev=>{ const m=ev.data; if(!m) return;
  if(m.type==="data"){ const D=m.SD; D.book={}; for(const b in m.book){ const x=m.book[b]; D.book[b]={a:x.a,z:x.z,chs:new Set(x.chs)}; } D.qi=null; SD=D; PLAN=m.PLAN; DATA_KEY=m.key; self.postMessage({type:"ready",key:m.key}); return; }
  if(m.type==="run"){ if(!SD){ self.postMessage({type:"error",seq:m.seq,message:"워커에 자료가 없습니다."}); return; } if(m.key&&m.key!==DATA_KEY){ self.postMessage({type:"error",seq:m.seq,stale:true,message:"워커 자료가 최신이 아닙니다."}); return; }
    try{ const P=qParse(m.text); if(P.err){ self.postMessage({type:"result",seq:m.seq,err:P.err}); return; }
      const r=qRun(P,m.sp,m.limit); const H=qHits(r), W=qWhyIndex(r), fp=qFingerprint(r);
      const nw=[]; r.order.forEach((n,k)=>{ if(n.t!=="word") return; const s=new Set(); for(const t of r.out) s.add(t[k][1]); nw.push([k,[...s]]); });
      /* 묶음([단위,번호] 배열)은 그대로 복제 가능. Map/Set 은 배열로 바꿔 보낸다 */
      self.postMessage({type:"result",seq:m.seq,nw,n:r.out.length,capped:r.capped,limitHit:r.limitHit,stepsHit:r.stepsHit,steps:r.steps,ms:r.ms,fp,
        hits:[...H].map(([vi,set])=>[vi,[...set]]),why:[...W].map(([vi,e])=>[vi,{n:e.n,t:e.t}])}); }
    catch(e){ self.postMessage({type:"error",seq:m.seq,message:e&&e.message||String(e)}); } } };
