// 누가 말하나(화자) 검증 — 요나서(이야기 방식)·아가서(대화시 방식)·고치기·공용 자료 (2026-10-22). 쓰기: node speakers.js <스크린샷 폴더>
const { chromium, devices } = require('playwright'); const OUT = (process.argv[2] || '.') + '/'; const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'], acceptDownloads: true }); await c.addInitScript(() => { try { localStorage.setItem('milal-tut-seen', '1'); } catch (e) {} });
  const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); const W = ms => pg.waitForTimeout(ms);
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && SD.L, null, { timeout: 60000 }); await W(500);
  const run = (b, c1, c2) => pg.evaluate(async ([b, c1, c2]) => { await loadBook(b); await spkLoad(); const R = spkApply(spkAnalyze([b, c1, c2])); return { T: R.turns.map(t => [sRef(t.vis[0]).split(' ')[1], t.lvl, spkNameOf(t.sp), spkNameOf(t.to), t.sp.conf, t.ws.length]), narr: R.narr }; }, [b, c1, c2]);
  const J = await run(32, 1, 4); const get = r => J.T.filter(t => t[0] === r).map(t => t[2] + '→' + (t[3] || '-'));
  const exp = { '1:2': '여호와→요나', '1:6': '우두머리(선장)→요나', '1:7': '사공들→서로', '1:8': '사공들→요나', '1:9': '요나→사공들', '1:10': '남자들→요나', '1:11': '남자들→요나', '1:12': '요나→남자들', '1:14': '남자들→여호와', '2:2': '요나→여호와', '3:2': '여호와→요나', '4:4': '여호와→요나', '4:10': '여호와→요나' };
  const bad = Object.entries(exp).filter(([r, e]) => !get(r).includes(e)); ok('요나 1–4장: 말하는 이 → 듣는 이 13곳이 본문과 같음(선장·선원·요나·여호와)', !bad.length, JSON.stringify(bad.map(([r, e]) => r + ' ' + e + ' ≠ ' + get(r).join('/'))));
  ok('요나: 3:4 요나, 3:7 니느웨 왕(칙령은 안쪽 인용), 4:2 요나 → 여호와, 4:8 요나, 4:9 하나님 → 요나 / 요나', get('3:4')[0].startsWith('요나') && get('3:7').every(x => x.startsWith('왕')) && get('4:2')[0] === '요나→여호와' && get('4:8')[0].startsWith('요나') && get('4:9')[0] === '하나님→요나' && get('4:9')[1].startsWith('요나'), JSON.stringify([get('3:4'), get('3:7'), get('4:2'), get('4:8'), get('4:9')]));
  ok('요나 2장: 기도 안의 "내가 말하기를"(2:4)은 요나 자신', J.T.some(t => t[0] === '2:4' && t[1] === 2 && t[2] === '요나'), JSON.stringify(J.T.filter(t => t[0].startsWith('2:'))));
  const S = await run(22, 1, 8); const sp = r => (S.T.find(t => t[0] === r && t[1] === 1) || [])[2];
  const sx = { '1:5': '여자', '1:7': '여자', '1:15': '남자', '2:2': '남자', '2:3': '여자', '4:1': '남자', '4:16': '여자', '5:1': '남자', '5:8': '여자', '5:9': '여럿(합창·무리)', '5:10': '여자', '6:1': '여럿(합창·무리)', '6:4': '남자', '8:8': '여럿(합창·무리)', '8:13': '남자', '8:14': '여자' };
  const bad2 = Object.entries(sx).filter(([r, e]) => sp(r) !== e); ok('아가: 말하는 이 16곳(여자·남자·예루살렘 딸들/형제들)이 일반적 읽기와 같음', !bad2.length, JSON.stringify(bad2.map(([r, e]) => r + ' ' + e + ' ≠ ' + sp(r))));
  ok('아가 2:10–14: 여자의 말 안에서 인용된 남자의 말(안쪽 차례)', S.T.some(t => t[0] === '2:10' && t[1] === 2 && t[2] === '남자'), JSON.stringify(S.T.filter(t => t[1] === 2)));
  ok('아가 5:9 "너의 사랑하는 자가 무엇이…" — 그 사람 자신이 아니라 합창, 듣는 이 여자', S.T.some(t => t[0] === '5:9' && t[2] === '여럿(합창·무리)' && t[3] === '여자'));
  // 화면
  await pg.evaluate(async () => { await loadBook(32); setRange({ b: 32, c1: 1, c2: 1 }); const S = view.st; S.mode = 'tool'; S.tool = '화자'; S.rmode = 'tool'; render(); }); await pg.click('.bnav [data-nav="research"]'); await pg.waitForFunction(() => document.querySelector('.spkturns'), null, { timeout: 20000 });
  const sc = await pg.evaluate(() => ({ bars: [...document.querySelectorAll('.spkbar')].map(b => b.querySelector('.n').textContent + ':' + b.querySelector('b').textContent), turns: document.querySelectorAll('.spkt').length, rule: /성·수/.test(document.querySelector('#sToolRes').textContent) }));
  ok('화자 화면(요나 1장): 말하는 이별 막대(서술 240·요나 45·사공들 41·남자들 36·여호와 16·선장 15) + 말한 차례 9 + 찾은 규칙', sc.bars.join('|') === '서술(내레이터):240|요나:45|사공들:41|남자들:36|여호와:16|우두머리(선장):15' && sc.turns === 9 && sc.rule, JSON.stringify(sc));
  // 고치기 → 이 기기 → 보내기 파일
  await pg.click('.spkt:nth-child(3) .spkwho'); await W(200); await pg.fill('#spkS', '선원들'); await pg.click('#spkOk'); await W(300);
  const e1 = await pg.evaluate(() => ({ who: document.querySelector('.spkt:nth-child(3) .spkwho b').textContent, conf: document.querySelector('.spkt:nth-child(3) .spkwho i').textContent, send: !!document.querySelector('#spkSend'), loc: localStorage.getItem('milal-spk-edits') }));
  ok('이름 고치기 → "선원들 · 내가 고침", 이 기기에 저장, "공용 자료로 보내기" 단추', e1.who === '선원들' && e1.conf === '내가 고침' && e1.send && /선원들/.test(e1.loc), JSON.stringify(e1).slice(0, 200));
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#spkSend')]); const txt = await pg.evaluate(() => window.__lastSpkSend);
  ok('보내기 파일(milalwv-speakers-날짜.json, schema MILALWV-SPEAKERS-1)', /^milalwv-speakers-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()) && /MILALWV-SPEAKERS-1/.test(txt) && /"32"/.test(txt), dl.suggestedFilename());
  await pg.evaluate(() => document.getElementById('sheetRoot').innerHTML = '');
  // 공용 자료(cur)가 있으면 모두에게 '확인됨'
  const cu = await pg.evaluate(async () => { localStorage.removeItem('milal-spk-edits'); const L = JSON.parse(window.__lastSpkSend).books['32']; SPK.cur = { 32: L }; render(); await new Promise(r => setTimeout(r, 200)); return { who: document.querySelector('.spkt:nth-child(3) .spkwho b').textContent, conf: document.querySelector('.spkt:nth-child(3) .spkwho i').textContent }; });
  ok('공용 자료에 들어간 차례는 누구에게나 "확인됨"', cu.who === '선원들' && cu.conf === '확인됨', JSON.stringify(cu));
  await pg.screenshot({ path: OUT + 'spk_test.png', fullPage: true });
  ok('페이지 오류 없음', errs.length === 0, errs.join(' | '));
  console.log(R.join('\n')); console.log(`\n${R.filter(x => x.startsWith('PASS')).length}/${R.length} PASS`); await br.close(); })();
