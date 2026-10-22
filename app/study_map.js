/* ===== 지도에서 보기 (2026-10-22 목사님 승인) — CBSR 지도(같은 제작자)를 옮겨 와 히브리어 원문에 맞게 고침
   · 어떤 곳이 나오나: 범위 안의 원문 낱말 가운데 지명 낱말(BHSA)을 찾는다 — 한글 번역의 표기에 기대지 않는다.
     같은 낱말이 다른 곳을 가리키면(예: 아벡) OpenBible 구절 목록으로 그 절의 장소를 고른다.
   · 좌표·확실성: OpenBible.info Bible Geocoding Data(CC BY 4.0). 확실성이 낮은 곳은 '추정 위치'(점선 동그라미).
   · 지형 그림·물길·이동 경로: CBSR. 지도 프로그램 Leaflet(BSD-2)은 저장소에 넣어 인터넷 CDN 없이 뜬다.
   자료 만들기: pipeline/places.py → study/places.json ===== */
let PLD=null, PLload=null, LMAP=null;
function plLoad(){ if(PLD) return Promise.resolve(PLD); return PLload ||= fetch("study/places.json?v="+(window.STUDY_V||"")).then(r=>r.json()).then(j=>{ PLD=j; PLload=null; return j; }).catch(e=>{ PLload=null; throw e; }); }
function lfLoad(){ if(window.L&&L.map) return Promise.resolve(); return window.__lfP ||= new Promise((res,rej)=>{ const c=document.createElement("link"); c.rel="stylesheet"; c.href="vendor/leaflet/leaflet.css"; document.head.appendChild(c); const s=document.createElement("script"); s.src="vendor/leaflet/leaflet.js"; s.onload=()=>res(); s.onerror=()=>{ window.__lfP=null; rej(new Error("지도 프로그램을 읽지 못했습니다")); }; document.head.appendChild(s); }); }
const PL_KIND={c:"성읍",r:"지역",m:"산",w:"강·바다·호수"};
const PL_RC=["#7A2E8A","#1F5FA8","#B5562A","#0E7C6B","#B0263F","#5A6B12"];
/* 범위 안에 나오는 곳: [{pi, n, vis:[절], wis:[낱말]}] + 위치 자료가 없는 지명 낱말 */
function plInRange(sp){ const D=PLD, out=new Map(), none=new Map(); const V=sp?spanVerses(sp):[];
  for(const vi of V){ const [, , , , ,s,n]=SD.V[vi]; for(let j=s;j<s+n;j++){ const li=SD.wl[j], C=D.LX[li];
      if(!C){ const x=SD.L[li]; if(x[2]==="nmpr"&&/\((곳|산|강|나라|시내|골짜기|못)\)$/.test(x[9]||"")){ const k=x[9].replace(/\s*\([^)]*\)$/,""); none.set(k,(none.get(k)||0)+1); } continue; }
      const c=C.find(([pi,vs])=>vs.includes(vi))||C[0], pi=c[0]; let e=out.get(pi); if(!e){ e={pi,n:0,vis:[],wis:[],sure:!!C.find(([p,vs])=>p===pi&&vs.includes(vi))}; out.set(pi,e); } e.n++; if(!e.vis.includes(vi)) e.vis.push(vi); e.wis.push(j); } }
  /* 같은 이름·같은 좌표는 한 점으로(예: 바벨·바벨론) */
  const merged=new Map(); for(const e of out.values()){ const p=D.P[e.pi], k=p[0]+"@"+p[1]+","+p[2]; const m=merged.get(k); if(m){ m.n+=e.n; m.vis=[...new Set([...m.vis,...e.vis])].sort((a,b)=>a-b); m.wis.push(...e.wis); } else merged.set(k,e); }
  return {pts:[...merged.values()].sort((a,b)=>b.n-a.n),none:[...none.entries()].sort((a,b)=>b[1]-a[1])}; }
function plRoutes(R){ return R?PLD.R.filter(r=>r.b===R.b&&r.c[1]>=R.c1&&r.c[0]<=R.c2).slice(0,6):[]; }
const plConfKo=p=>p[5]?`추정 위치 · 확실성 ${Math.round(p[4]/10)}%`:`위치 확실 · ${Math.round(p[4]/10)}%`;
function renderMapTab(){ const S=view.st; if(!S.R) return "";
  if(!PLD){ plLoad().then(()=>{ if(view.st.mode==="start") render(); }).catch(()=>{ PLD={err:1}; render(); }); return `<p class="lead">지도 자료를 받는 중…</p>`; }
  if(PLD.err) return `<p class="lead">지도 자료를 받지 못했습니다. 인터넷 연결을 확인해 주세요.</p>`;
  if(!SD.loaded.has(S.R.b)) return `<p class="lead">본문 자료를 받는 중…</p>`;
  const sp=[rSpan(S.R)], A=plInRange(sp), RT=plRoutes(S.R), P=PLD.P;
  let h=`<p class="lead" style="margin:0 0 8px">${esc(rScopeLabel())}의 히브리어 원문에 나오는 지명을 지도에 찍었습니다. 다른 본문은 위의 주소 단추에서 고릅니다.</p>`;
  if(!A.pts.length&&!RT.length) return h+`<p class="lead">이 본문에는 지도에 표시할 곳이 나오지 않습니다.</p>${A.none.length?`<p class="lead">위치 자료가 없는 지명: ${esc(A.none.map(x=>x[0]).join(", "))}</p>`:""}`;
  h+=`<div class="mapbox"><div id="lmap" role="region" aria-label="이 본문에 나오는 곳 지도"></div><div class="cap"><span class="mleg"><i class="dot"></i>위치 확실 <i class="dot est"></i>추정 위치</span>${RT.length?`<span class="rleg">${RT.map((r,i)=>`<span><i style="border-color:${PL_RC[i%PL_RC.length]}"></i>${esc(r.n)}</span>`).join("")}</span>`:""}<span>점을 누르면 나오는 절을 봅니다 · 두 손가락으로 움직입니다</span></div></div>`;
  h+=`<span class="label" style="margin-top:12px">나오는 곳 ${A.pts.length}</span><div class="plist">${A.pts.map(e=>{ const p=P[e.pi]; return `<button class="plrow" data-pl="${e.pi}"><b>${esc(p[0])}</b><small>${PL_KIND[p[3]]||""} · ${e.n}번 · ${esc(plConfKo(p))}${plOff(p)?" · 지도 밖":""}</small></button>`; }).join("")}</div>`;
  if(A.none.length) h+=`<p class="lead" style="margin-top:6px">위치 자료가 없는 지명: ${esc(A.none.map(x=>x[0]).join(", "))}</p>`;
  h+=`<p class="lead mapsrc">${esc(PLD.src)}. 위치는 학자들의 판단을 모은 것이며, 확실성이 70%보다 낮은 곳은 추정 위치로 보입니다.</p>`;
  window.__plA=A; return h; }
/* 지도 바깥(지형 그림 밖) — 가장자리에 붙여 화살표로 알린다(예: 다시스 = 스페인 남부 추정) */
function plWB(){ const T=PLD.T; return [[Math.min(T.neareast.bounds[0][0],T.med.bounds[0][0]),Math.min(T.neareast.bounds[0][1],T.med.bounds[0][1])],[Math.max(T.neareast.bounds[1][0],T.med.bounds[1][0]),Math.max(T.neareast.bounds[1][1],T.med.bounds[1][1])]]; }
function plOff(p){ const B=plWB(); return p[1]<B[0][0]||p[1]>B[1][0]||p[2]<B[0][1]||p[2]>B[1][1]; }
function plDir(p){ const B=plWB(); return (p[1]>B[1][0]?"북":p[1]<B[0][0]?"남":"")+(p[2]<B[0][1]?"서":p[2]>B[1][1]?"동":""); }
function plOpen(pi){ const p=PLD.P[pi], A=window.__plA, e=A&&A.pts.find(x=>x.pi===pi); const heb=e?[...new Set(e.wis.map(w=>SD.L[SD.wl[w]][0]))]:[];
  sheet(p[0],`<p>${PL_KIND[p[3]]||""}${heb.length?` · <span class="heb">${esc(heb.join(", "))}</span>`:""} · ${esc(p[6])}</p><p class="lead"><b>${esc(plConfKo(p))}</b>${plOff(p)?` — 지도 그림 밖(${plDir(p)}쪽)이라 가장자리에 '(${plDir(p)}쪽 지도 밖)'으로 표시했습니다`:""}. 좌표 ${p[1]}, ${p[2]}.</p>
    ${e?`<span class="label">이 본문에서 나오는 절 ${e.vis.length}</span><div class="achips">${e.vis.map(vi=>`<button class="achip" data-plv="${vi}">${esc(sRef(vi))}</button>`).join("")}</div>`:""}
    <p class="lead" style="margin-top:8px">위치 판단의 근거와 다른 후보: <a href="https://www.openbible.info/geo/ancient/${esc(p[7])}" target="_blank" rel="noopener">OpenBible.info</a>${p[8]?" · 좌표는 CBSR 지도와 같게 맞춤":""}</p>`);
  document.querySelectorAll("#sheetRoot [data-plv]").forEach(b=>b.onclick=()=>{ document.getElementById("sheetRoot").innerHTML=""; gotoVerse(+b.dataset.plv); }); }
function plDestroy(){ if(LMAP){ try{ LMAP.off(); LMAP.remove(); }catch(e){} LMAP=null; } }
function initMapTab(){ plDestroy(); const el=document.getElementById("lmap"); if(!el||!PLD||PLD.err) return;
  lfLoad().then(()=>plDraw(el)).catch(()=>{ el.innerHTML=`<p class="lead" style="padding:16px">지도 프로그램을 읽지 못했습니다.</p>`; }); }
function plDraw(el){ if(!document.body.contains(el)) return; const S=view.st, A=window.__plA, P=PLD.P, T=PLD.T, RT=plRoutes(S.R);
  const TU=id=>"img/"+T[id].url, B=plWB();
  const clamp=p=>[Math.min(Math.max(p[1],B[0][0]+0.6),B[1][0]-0.6),Math.min(Math.max(p[2],B[0][1]+0.6),B[1][1]-0.6)];
  const pts=A.pts.map(e=>({e,p:P[e.pi],ll:plOff(P[e.pi])?clamp(P[e.pi]):[P[e.pi][1],P[e.pi][2]]}));
  const rpts=RT.flatMap(r=>r.p.map(q=>[q[1],q[2]]));
  const inF=(id,ll)=>{ const b=T[id].bounds; return ll[0]>=b[0][0]&&ll[0]<=b[1][0]&&ll[1]>=b[0][1]&&ll[1]<=b[1][1]; };
  const must=(rpts.length?rpts:pts.filter(x=>!plOff(x.p)).map(x=>x.ll)); const order=["israel","asia","med","neareast"];
  let fid=order.find(id=>must.length&&must.every(ll=>inF(id,ll))); if(!fid) fid=order.map(id=>[id,must.filter(ll=>inF(id,ll)).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const FB=L.latLngBounds(T[fid].bounds), WB=L.latLngBounds(B);
  const map=L.map(el,{zoomSnap:0.5,zoomDelta:0.5,scrollWheelZoom:false,maxBounds:WB.pad(0.05),maxBoundsViscosity:0.9}); LMAP=map;
  const TOUCH=("ontouchstart" in window)||navigator.maxTouchPoints>0;
  if(TOUCH){ map.dragging.disable(); if(map.tap) map.tap.disable(); el.classList.add("one-scroll"); let tip=null, tt=null;
    const show=()=>{ if(!tip){ tip=document.createElement("div"); tip.className="map-tip"; tip.textContent="지도는 두 손가락으로 움직이세요"; el.appendChild(tip); } tip.classList.add("on"); clearTimeout(tt); tt=setTimeout(()=>tip&&tip.classList.remove("on"),1200); };
    el.addEventListener("touchstart",e=>{ if(e.touches.length>=2){ map.dragging.enable(); tip&&tip.classList.remove("on"); } },{passive:true});
    el.addEventListener("touchmove",e=>{ if(e.touches.length===1&&!map.dragging.enabled()) show(); },{passive:true});
    el.addEventListener("touchend",e=>{ if(e.touches.length===0) map.dragging.disable(); },{passive:true}); }
  map.attributionControl.setPrefix(false);
  const under=["neareast","med"].filter(id=>id!==fid).map(id=>L.imageOverlay(TU(id),T[id].bounds));
  const terr=L.layerGroup([...under,L.imageOverlay(TU(fid),T[fid].bounds,{attribution:"지형: AWS Terrain Tiles(Mapzen) · 해안선: Natural Earth · 위치: OpenBible.info"})]); if(fid==="israel") terr.addLayer(L.imageOverlay(TU("israelhi"),T.israelhi.bounds));
  terr.addTo(map); L.layerGroup([...PLD.W.lakes.map(l=>L.polygon(l,{color:"#5f8fae",weight:1,fillColor:"#A8C6D6",fillOpacity:1,interactive:false})),...PLD.W.rivers.map(r=>L.polyline(r,{color:"#5f8fae",weight:2,interactive:false}))]).addTo(map);
  map.fitBounds(FB,{animate:false}); { const z0=map.getZoom(), zw=map.getBoundsZoom(WB); map.setMinZoom(Math.max(zw,z0-3)); }
  const labels=[], arrows=[];
  RT.forEach((r,ri)=>{ const col=PL_RC[ri%PL_RC.length], ll=r.p.map(q=>[q[1],q[2]]);
    L.polyline(ll,{color:"#fff",weight:6,opacity:.7,interactive:false}).addTo(map); L.polyline(ll,{color:col,weight:3,dashArray:"8 6",interactive:false}).addTo(map);
    for(let k=0;k<ll.length-1;k++){ const a=ll[k], b=ll[k+1]; if(a[0]===b[0]&&a[1]===b[1]) continue; const mk=L.marker([(a[0]+b[0])/2,(a[1]+b[1])/2],{icon:L.divIcon({className:"",html:`<span class="rarrow" style="border-left-color:${col}"></span>`,iconSize:null}),interactive:false,keyboard:false}).addTo(map); arrows.push({mk,a,b}); }
    r.p.forEach((q,qi)=>{ if(!q[0]||pts.some(x=>x.p[0]===q[0])) return; L.circleMarker([q[1],q[2]],{radius:4,color:col,weight:2,fillColor:"#fff",fillOpacity:1,interactive:false}).addTo(map);
      labels.push({mk:L.marker([q[1],q[2]],{icon:L.divIcon({className:"",html:`<span class="mlbl rte">${esc(q[0])}</span>`,iconSize:null}),interactive:false,keyboard:false}).addTo(map),pri:300+qi}); }); });
  const orient=()=>arrows.forEach(o=>{ const p1=map.latLngToLayerPoint(o.a), p2=map.latLngToLayerPoint(o.b), ang=Math.atan2(p2.y-p1.y,p2.x-p1.x)*180/Math.PI; const e=o.mk.getElement()&&o.mk.getElement().querySelector(".rarrow"); if(e) e.style.transform=`translate(-50%,-50%) rotate(${ang}deg)`; });
  pts.forEach((x,i)=>{ const p=x.p, k=p[3], est=!!p[5], off=plOff(p), col=k==="m"?"#9A6417":k==="w"?"#2f6582":"#B4432F", nm=esc(p[0])+(est?"<i>?</i>":"")+(off?` <i>(${plDir(p)}쪽 지도 밖)</i>`:"");
    if(k==="r"&&!off){ labels.push({mk:L.marker(x.ll,{icon:L.divIcon({className:"",html:`<span class="mlbl reg${est?" est":""}">${nm}</span>`,iconSize:null}),keyboard:false}).addTo(map).on("click",()=>plOpen(x.e.pi)),pri:200+i}); return; }
    L.circleMarker(x.ll,{radius:6,color:est?col:"#fff",weight:2,dashArray:est?"3 2":null,fillColor:est?"#fff":col,fillOpacity:1}).addTo(map).on("click",()=>plOpen(x.e.pi));
    labels.push({mk:L.marker(x.ll,{icon:L.divIcon({className:"",html:`<span class="mlbl${est?" est":""}">${nm}</span>`,iconSize:null}),keyboard:false}).addTo(map).on("click",()=>plOpen(x.e.pi)),pri:i}); });
  for(const [n,la,lo] of (PLD.C[fid]||[])){ if(pts.some(x=>x.p[0]===n.replace(/ 강$/,""))) continue; labels.push({mk:L.marker([la,lo],{icon:L.divIcon({className:"",html:`<span class="mlbl wat">${esc(n)}</span>`,iconSize:null}),interactive:false,keyboard:false}).addTo(map),pri:500}); }
  const declutter=()=>{ const kept=[]; labels.slice().sort((a,b)=>a.pri-b.pri).forEach(l=>{ const e=l.mk.getElement()&&l.mk.getElement().querySelector(".mlbl"); if(!e) return; e.style.visibility="visible"; const r=e.getBoundingClientRect(); if(kept.some(k=>!(r.right<k.left||r.left>k.right||r.bottom<k.top||r.top>k.bottom))) e.style.visibility="hidden"; else kept.push(r); }); };
  map.on("zoomend moveend",declutter); map.on("zoomend",orient);
  const inner=pts.filter(x=>!plOff(x.p)).map(x=>x.ll), PB=L.latLngBounds(rpts.length?rpts.filter(q=>FB.contains(q)):inner.length?inner:pts.map(x=>x.ll));
  if(PB.isValid()){ if(!RT.length&&inner.length<=1) map.setView(PB.getCenter(),Math.max(map.getZoom(),fid==="israel"?8.5:6.5),{animate:false}); else map.fitBounds(PB.pad(RT.length?0.12:0.25),{maxZoom:fid==="israel"?8.5:(RT.length?7.5:6.5),animate:false}); }
  setTimeout(()=>{ if(LMAP!==map) return; map.invalidateSize({animate:false}); orient(); declutter(); },60); window.__lmap=map; }
function bindMapTab(m){ m.querySelectorAll("[data-pl]").forEach(b=>b.onclick=()=>plOpen(+b.dataset.pl)); if(m.querySelector("#lmap")) initMapTab(); else plDestroy(); }
