// 장:절 범위 검증 (2026-10-22). 쓰기: node verse_range.js <스크린샷 폴더>
const { chromium, devices } = require('playwright'); const OUT = (process.argv[2] || '.') + '/'; const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); await c.addInitScript(() => { try { localStorage.setItem('milal-tut-seen', '1'); localStorage.setItem('milal-rtab', 'flow'); } catch (e) {} });
  const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); const W = ms => pg.waitForTimeout(ms);
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && SD.L, null, { timeout: 60000 }); await W(800);
  await pg.evaluate(async () => { await loadBook(18); setRange({ b: 18, c1: 32, c2: 32 }); render(); }); await pg.click('.bnav [data-nav="research"]'); await W(300);
  // 주소 단추 → 절까지 정하기
  await pg.click('#sAddr'); await W(300); const opt = await pg.evaluate(() => [...document.querySelectorAll('#sheetRoot [data-rsc]')].map(b => b.dataset.rsc + ':' + b.textContent));
  ok('주소 단추의 찾는 곳 창에 "절까지 정하기…"', opt.some(x => /^verse:절까지 정하기/.test(x)), JSON.stringify(opt));
  await pg.click('#sheetRoot [data-rsc="verse"]'); await W(400);
  const p0 = await pg.evaluate(() => ({ v1: document.querySelectorAll('#pkV1 option').length, v2: (document.querySelector('#pkV2') || {}).value }));
  ok('장 고르기 화면에 "절까지 좁히기" — 욥 32장 1~22절 고르기', p0.v1 === 22 && p0.v2 === '22', JSON.stringify(p0));
  await pg.click('[data-pkc="38"]'); await W(300);
  const p1 = await pg.evaluate(() => ({ n: document.querySelectorAll('#pkV1 option').length, note: (document.querySelector('.pkverse') || {}).textContent }));
  ok('38장을 한 번 누르면 바로 절 고르기(41절) + "단락 하나만 보려면 절을 좁혀 보세요"', p1.n === 41 && /41절이나 됩니다/.test(p1.note), JSON.stringify(p1).slice(0, 160));
  await pg.selectOption('#pkV2', '18'); await pg.click('#pkGo'); await W(500);
  const r1 = await pg.evaluate(() => ({ R: view.st.R, addr: document.querySelector('#sAddr').textContent.trim(), sp: stSpans(), nv: spanVerses(stSpans()).length }));
  ok('범위 = 욥기 38:1–18 (주소 단추·검색 범위 18절)', r1.R.c1 === 38 && r1.R.v2 === 18 && r1.R.v1 == null && /욥기 38:1–18/.test(r1.addr) && r1.nv === 18, JSON.stringify(r1));
  const rep = await pg.evaluate(async () => { const S = view.st; S.mode = 'tool'; S.tool = '반복'; render(); await new Promise(r => setTimeout(r, 200)); return document.querySelector('#sToolRes .label').textContent; });
  ok('반복 도구가 "욥기 38:1–18" 범위로', /욥기 38:1–18/.test(rep), rep);
  const q = await pg.evaluate(async () => { const S = view.st; S.mode = 'query'; S.qui = 'card'; S.qc = { tgt: 'word', cl: {}, ws: [{ c: { sp: 'verb' }, fn: '', op: '' }] }; qcSync(); S.qres = null; qExec(); for (let i = 0; i < 100 && (!S.qres || S.qres.loading); i++) await new Promise(r => setTimeout(r, 100)); const direct = qRun(qParse('word sp=verb\n'), [[18, 38, 38, 1, 18]], 20000).out.length; const vs = [...S.qres.hits.keys()].map(vi => SD.V[vi][1] + ':' + SD.V[vi][2]); return { n: S.qres.n, eng: S.qres.engine, direct, maxv: Math.max(...[...S.qres.hits.keys()].map(vi => SD.V[vi][2])), range: S.qres.range, all38: vs.every(x => x.startsWith('38:')) }; });
  ok('검색(워커)도 38:1–18 안에서만 — 엔진 직접 실행과 같은 건수', q.eng === 'worker' && q.n === q.direct && q.maxv <= 18 && q.all38 && /38:1–18/.test(q.range), JSON.stringify(q));
  const sv = await pg.evaluate(() => { const rg = qRangeOf(); return { rg, lbl: qRangeLabel(rg) }; });
  ok('보관하는 검색식 범위에도 절이 담김(욥 38:1–18)', sv.rg.R.v2 === 18 && /욥 38:1–18/.test(sv.lbl), JSON.stringify(sv));
  // 여러 장에 걸친 절 범위
  await pg.evaluate(() => { setRange({ b: 18, c1: 32, c2: 33, v1: 6, v2: 12 }); view.st.mode = 'start'; render(); }); await W(200);
  const mr = await pg.evaluate(() => ({ lead: document.querySelector('.rlead').textContent, n: spanVerses(stSpans()).length, first: sRef(spanVerses(stSpans())[0]), last: sRef(spanVerses(stSpans()).slice(-1)[0]) }));
  ok('장을 넘는 절 범위(욥 32:6–33:12): 안내·첫 절·끝 절', /욥기 32:6–33:12/.test(mr.lead) && /32:6/.test(mr.first) && /33:12/.test(mr.last) && mr.n === 17 + 12, JSON.stringify(mr));
  await pg.evaluate(() => { const b = document.querySelector('#sAddr'); b.click(); }); await W(200); await pg.click('#sheetRoot [data-rsc="ch"]'); await W(200);
  ok('"이 장만"을 고르면 절 범위가 풀림', await pg.evaluate(() => !rHasV(view.st.R)));
  await pg.screenshot({ path: OUT + 'vr.png' });
  ok('페이지 오류 없음', errs.length === 0, errs.join(' | '));
  console.log(R.join('\n')); console.log(`\n${R.filter(x => x.startsWith('PASS')).length}/${R.length} PASS`); await br.close(); })();
