const { chromium, devices } = require('playwright');
(async()=>{ const br=await chromium.launch(); const c=await br.newContext({...devices['Pixel 5']}); await c.addInitScript(()=>{try{localStorage.setItem('milal-tut-seen','1')}catch(e){}}); const pg=await c.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:8765/index.html'); await pg.waitForFunction(()=>typeof SD!=='undefined'&&SD&&SD.L,null,{timeout:60000});
 for(const [b,c1,c2,f] of [[32,1,1,'spk_jonah1'],[22,1,2,'spk_song12']]){ await pg.evaluate(async([b,c1,c2])=>{ await loadBook(b); setRange({b,c1,c2}); const S=view.st; S.mode='tool'; S.tool='화자'; S.rmode='tool'; render(); },[b,c1,c2]); await pg.click('.bnav [data-nav="research"]'); await pg.waitForTimeout(1200); await pg.screenshot({path:process.argv[2]+'/'+f+'.png',fullPage:true}); }
 console.log('errs',errs); await br.close(); })();
