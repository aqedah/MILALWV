/* ===== approval.js: 연구자 승인 기록(MILALWV-APPROVAL-1) 해석기 — 순수 함수, 브라우저·node 공용 =====
   입력: records(approvals.json 의 records), ctx { fileSha, fileStatus, relIds:[…], chaptersOf(relId)→[minCh,maxCh]|null }
   출력: { status: TEST_ONLY|APPROVED|PARTIAL|REJECTED|UNREVIEWED, approvedRel:Set, applied:[기록…], ignored:[{record,why}], note }

   우선순위 규칙 (docs/MILAL_INTERFACE_DRAFT.md §11.1 과 같음):
   1. 파일이 TEST_ONLY 이면 어떤 기록도 적용하지 않는다(승인 대상이 아님).
   2. 기록의 if1_sha256 이 지금 파일의 해시와 다르면 적용하지 않는다(파일이 바뀌면 승인은 무효).
   3. 적용되는 기록을 날짜 오름차순(같은 날짜는 파일에 적힌 순서)으로 차례로 적용한다 — 뒤의 기록이 앞의 기록을 덮는다.
      - APPROVED(범위 ALL):      전체 승인. 앞선 기각 예외를 모두 지운다.
      - REJECTED(범위 ALL):      전체 기각. 앞선 부분 승인을 모두 지운다.
      - PARTIAL(RELATIONS/CHAPTERS): 그 범위의 관계를 승인 집합에 넣고, 그 관계에 걸린 기각 예외를 지운다(재승인).
      - REJECTED(RELATIONS/CHAPTERS): 그 범위의 관계를 기각 예외에 넣고 승인 집합에서 뺀다(전체 승인 뒤의 부분 기각도 됨).
   4. 효력: 관계 하나가 승인된 것은 (전체 승인 상태이거나 승인 집합에 있음) 그리고 기각 예외에 없음.
      파일 상태 = 모든 관계가 승인 → APPROVED · 일부만 → PARTIAL · 하나도 없고 마지막 전체 판정이 기각 → REJECTED · 그 밖 → UNREVIEWED.
   5. 승인자 이름은 기록에 적힌 문자열일 뿐이다(신원 증명 아님). 화면은 '기록된 이름'으로만 표시한다. */
(function(){
function approvalResolve(records,ctx){
  const relIds=ctx.relIds||[], chOf=ctx.chaptersOf||(()=>null);
  const out={status:"UNREVIEWED",approvedRel:new Set(),applied:[],ignored:[],note:""};
  if(ctx.fileStatus==="TEST_ONLY"){ out.status="TEST_ONLY"; (records||[]).forEach(r=>out.ignored.push({record:r,why:"TEST_ONLY 파일에는 승인 기록을 적용하지 않음"})); return out; }
  const recs=[]; (records||[]).forEach((r,i)=>{ if(!r||typeof r!=="object"){ out.ignored.push({record:r,why:"형식 아님"}); return; }
    if(r.if1_sha256!==ctx.fileSha){ out.ignored.push({record:r,why:"파일 해시가 다름(이 파일에 대한 기록이 아님)"}); return; }
    if(!["APPROVED","PARTIAL","REJECTED"].includes(r.status)||!r.scope||!r.scope.type){ out.ignored.push({record:r,why:"status/scope 없음"}); return; }
    if(r.status==="APPROVED"&&r.scope.type!=="ALL"){ out.ignored.push({record:r,why:"APPROVED 는 scope ALL 일 때만"}); return; }
    if(r.status==="PARTIAL"&&r.scope.type==="ALL"){ out.ignored.push({record:r,why:"PARTIAL 은 범위가 있어야 함"}); return; }
    recs.push({r,i}); });
  recs.sort((a,b)=>String(a.r.date||"").localeCompare(String(b.r.date||""))||a.i-b.i);
  const inRange=(id,ch)=>{ const c=chOf(id); return !!c&&c[0]>=ch[0]&&c[1]<=ch[1]; };
  const idsOf=sc=>sc.type==="RELATIONS"?(sc.relation_ids||[]).filter(x=>relIds.includes(x)):sc.type==="CHAPTERS"?relIds.filter(id=>inRange(id,sc.chapters||[0,-1])):[];
  let all=null; const okSet=new Set(), rej=new Set();
  for(const {r} of recs){ const sc=r.scope;
    if(r.status==="APPROVED"){ all="APPROVED"; rej.clear(); }
    else if(r.status==="REJECTED"&&sc.type==="ALL"){ all="REJECTED"; okSet.clear(); rej.clear(); }
    else if(r.status==="PARTIAL"){ for(const id of idsOf(sc)){ okSet.add(id); rej.delete(id); } }
    else if(r.status==="REJECTED"){ for(const id of idsOf(sc)){ rej.add(id); okSet.delete(id); } }
    out.applied.push(r); }
  for(const id of relIds){ if((all==="APPROVED"||okSet.has(id))&&!rej.has(id)) out.approvedRel.add(id); }
  const n=out.approvedRel.size;
  out.status=relIds.length&&n===relIds.length?"APPROVED":n>0?"PARTIAL":all==="REJECTED"?"REJECTED":"UNREVIEWED";
  out.all=all; out.total=relIds.length;
  const last=out.applied[out.applied.length-1]; if(last) out.last={approver:String(last.approver||""),date:String(last.date||"")};
  return out; }
if(typeof module!=="undefined"&&module.exports) module.exports={approvalResolve}; else window.approvalResolve=approvalResolve;
})();
