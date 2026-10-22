const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>errs.push(m.type()+': '+m.text().slice(0,200)));
 await pg.route(/^https?:\/\/(?!localhost)/, r=>r.abort());
 await pg.goto('http://localhost:8766/index.html',{waitUntil:'load'}); await pg.waitForTimeout(2500);
 console.log(errs.slice(0,8)); console.log(await pg.evaluate(()=>typeof GAZ+' '+typeof TERRAIN+' '+typeof render));
 await br.close(); })();
