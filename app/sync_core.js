/* ===== sync_core.js: 연구 기록 동기화의 알맹이 — 순수 함수(브라우저·node 공용). docs/NOTES_STORAGE_DESIGN.md §4·§6 =====
   서버 문서(users/{uid}/annots/{id})가 기준이다: rev 는 서버가 1씩 올린다(규칙이 강제).
   기기 기록에는 동기화용 칸이 더 있다(서버에 보내지 않음):
     srv_rev  — 이 기록이 마지막으로 서버와 같았을 때의 서버 rev (없으면 아직 서버에 없음)
     dirty    — 그 뒤 기기에서 고쳤는가
     base     — 마지막으로 서버와 같았을 때의 내용 스냅샷(세 갈래 병합의 기준)
   병합 원칙: 문장을 조각내지 않는다. 같은 칸을 양쪽이 고쳤으면 서버 글을 두고 기기 글 전체를 '충돌 사본'으로 덧붙인다(아무것도 잃지 않음).
   지움(deleted)은 어느 쪽이든 true 면 true — 되살리지 않는다. */
(function(){
const SERVER_KEYS=["id","kind","key","anchor","observation","interpretation","tags","style","color","milal_ref","created","updated","deleted","shared_id","rev","server_at","device"];
const TEXT=["observation","interpretation"], LIST=["tags"], SCALAR=["style","color","milal_ref"];
const J=v=>JSON.stringify(v===undefined?null:v);
function snap(a){ const o={}; for(const f of [...TEXT,...LIST,...SCALAR]) o[f]=a[f]===undefined?null:JSON.parse(J(a[f])); o.deleted=!!a.deleted; return o; }
function sameContent(a,b){ return J(snap(a))===J(snap(b)); }
/* 서버에 보낼 모양: 허용된 칸만, undefined 없이. anchor·created·kind 는 서버 것(있으면)을 그대로 — 규칙이 바꾸지 못하게 함 */
function toServer(a,rev,server,nowServerTs,device){ const o={}; for(const k of SERVER_KEYS){ if(a[k]!==undefined&&a[k]!==null) o[k]=a[k]; }
  if(server){ o.anchor=server.anchor; o.created=server.created; o.kind=server.kind; }
  o.tags=Array.isArray(o.tags)?o.tags:[]; o.observation=o.observation||""; o.interpretation=o.interpretation||""; o.deleted=!!a.deleted; o.rev=rev; o.server_at=nowServerTs; o.device=device||a.device||"?"; o.updated=Number.isInteger(a.updated)?a.updated:Date.now(); delete o.shared_id; if(a.shared_id) o.shared_id=a.shared_id;
  if(o.kind!=="mark"){ delete o.style; delete o.color; } else if(o.style!=="hl") delete o.color;
  return o; }
/* 세 갈래 병합. base 가 없으면(처음 만나는 서버 사본) 다른 칸은 모두 충돌로 본다(안전 쪽) */
function mergeAnnot(local,server,base,ctx){ const B=base||null, out=Object.assign({},local), conflicts=[], tag=`⟪충돌 사본 · 기기 ${(ctx&&ctx.device)||local.device||"?"} · ${(ctx&&ctx.when)||new Date().toISOString()}⟫`;
  const lc=f=>!B||J(local[f]===undefined?null:local[f])!==J(B[f]), sc=f=>!B||J(server[f]===undefined?null:server[f])!==J(B[f]), same=f=>J(local[f]===undefined?null:local[f])===J(server[f]===undefined?null:server[f]);
  for(const f of TEXT){ if(same(f)) { out[f]=server[f]||""; continue; } if(lc(f)&&sc(f)){ out[f]=(server[f]||"")+"\n"+tag+"\n"+(local[f]||""); conflicts.push(f); } else if(sc(f)) out[f]=server[f]||""; else out[f]=local[f]||""; }
  for(const f of LIST){ const L=Array.isArray(local[f])?local[f]:[], S=Array.isArray(server[f])?server[f]:[]; if(same(f)) { out[f]=S; continue; } if(lc(f)&&sc(f)){ out[f]=[...new Set([...S,...L])]; conflicts.push(f); } else out[f]=sc(f)?S:L; }
  for(const f of SCALAR){ if(same(f)) { out[f]=server[f]; continue; } if(lc(f)&&sc(f)){ out[f]=server[f]; conflicts.push(f); out.observation=(out.observation||"")+"\n"+tag+` ${f}: 기기값 ${J(local[f])}`; } else out[f]=sc(f)?server[f]:local[f]; }
  out.deleted=!!(local.deleted||server.deleted); out.anchor=server.anchor||local.anchor; out.created=server.created||local.created; out.kind=server.kind||local.kind; out.key=local.key||server.key;
  return {merged:out,conflicts}; }
/* 올리기 한 건. deps: { getServer(id)→doc|null, write(id,doc) } 를 트랜잭션 안에서 부른다(deps.transaction(fn)). 결과 {action, record, conflicts} */
async function syncPushOne(local,deps){ const dev=deps.device||local.device||"?";
  if(!local.dirty&&local.srv_rev!=null) return {action:"noop",record:local};
  return deps.transaction(async t=>{ const server=await t.get(local.id);
    if(!server){ if(local.deleted) return {action:"skipped_tombstone",record:local}; const doc=toServer(local,1,null,deps.serverTs(),dev); t.set(local.id,doc); return {action:"created",record:Object.assign({},local,{srv_rev:1,dirty:false,base:snap(doc)})}; }
    if(local.srv_rev!=null&&server.rev===local.srv_rev){ const doc=toServer(local,server.rev+1,server,deps.serverTs(),dev); doc.deleted=!!(local.deleted||server.deleted); t.set(local.id,doc); return {action:"updated",record:Object.assign({},local,{deleted:doc.deleted,srv_rev:doc.rev,dirty:false,base:snap(doc)})}; }
    /* 갈라짐: 서버가 먼저 바뀜(다른 기기) 또는 처음 만남(srv_rev 없음) */
    const m=mergeAnnot(local,server,local.base||null,{device:dev,when:deps.now?deps.now():new Date().toISOString()});
    if(sameContent(m.merged,server)) return {action:"adopted",record:Object.assign({},local,m.merged,{srv_rev:server.rev,dirty:false,base:snap(server)})};   /* 서버에 이미 다 있음(끊겼던 전송이 실은 성공) — 다시 쓰지 않음 */
    const doc=toServer(m.merged,server.rev+1,server,deps.serverTs(),dev); t.set(local.id,doc);
    return {action:m.conflicts.length?"merged_conflict":"merged",conflicts:m.conflicts,record:Object.assign({},local,m.merged,{srv_rev:doc.rev,dirty:false,base:snap(doc)})}; }); }
/* 내려받기: 서버 문서 하나를 기기 기록에 반영. 기기에서 고친 중(dirty)이면 건드리지 않는다(다음 올리기에서 병합) */
function syncPullOne(local,server){ if(!local) return {action:"added",record:Object.assign({},server,{srv_rev:server.rev,dirty:false,base:snap(server)})};
  if(server.rev<=(local.srv_rev??-1)) return {action:"noop",record:local};
  if(local.dirty) return {action:"deferred",record:local};
  return {action:"replaced",record:Object.assign({},local,server,{deleted:!!(server.deleted||local.deleted),srv_rev:server.rev,dirty:false,base:snap(server)})}; }
/* 여러 건 올리기: 한 건이 실패해도 나머지는 계속. 결과 {ok:[…], failed:[{id,error}]} */
async function syncPushAll(list,deps){ const ok=[], failed=[]; for(const a of list){ try{ ok.push(await syncPushOne(a,deps)); }catch(e){ failed.push({id:a.id,error:String(e&&e.message||e)}); } } return {ok,failed}; }
const API={snap,sameContent,toServer,mergeAnnot,syncPushOne,syncPullOne,syncPushAll,SERVER_KEYS};
if(typeof module!=="undefined"&&module.exports) module.exports=API; else window.SYNC_CORE=API;
})();
