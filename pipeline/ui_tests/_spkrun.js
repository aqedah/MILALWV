const { chromium } = require('playwright');
(async()=>{ const [b,c1,c2]=process.argv.slice(2).map(Number); const br=await chromium.launch(); const pg=await br.newPage(); await pg.addInitScript(()=>{try{localStorage.setItem('milal-tut-seen','1')}catch(e){}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8765/index.html'); await pg.waitForFunction(()=>typeof SD!=='undefined'&&SD&&SD.L,null,{timeout:60000});
 const out=await pg.evaluate(async([b,c1,c2])=>{ await loadBook(b); await spkLoad(); const R=spkApply(spkAnalyze([b,c1,c2]));
   const L=R.turns.map(t=>`${sRef(t.vis[0])}${t.vis.length>1?"–"+sRef(t.vis[t.vis.length-1]).split(" ").pop():""} ${"  ".repeat(t.lvl-1)}${spkNameOf(t.sp)} → ${spkNameOf(t.to)||"-"} [${t.sp.conf}: ${t.sp.why||""}] ${t.ws.length}w | ${t.ws.slice(0,5).map(wHeb).join("").trim()}`);
   return L.join("\n")+"\n서술 "+R.narr+"\n"+spkStats(R).map(x=>x.n+" "+x.w+"("+x.t+")").join(" · "); },[b,c1,c2]);
 console.log(out); if(errs.length) console.log('ERR',errs); await br.close(); })();
