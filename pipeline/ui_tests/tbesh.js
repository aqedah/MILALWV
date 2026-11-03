// TBESH 핵심 뜻·이름 설명 칸 점검 (Playwright 에뮬레이션). 실행: python3 -m http.server 8765 띄운 뒤 node pipeline/ui_tests/tbesh.js [스크린샷 폴더]
const { chromium, devices } = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || ''; const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
const boot = async (pg, url) => { await pg.goto(url, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdvs,.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(600); const x = await pg.$('#sheetX'); if (x) await x.click(); };
(async () => {
  const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await boot(p, 'http://localhost:8765/index.html');
  // 1. 창 1:1 원어 열기 → 첫 낱말 상세에 핵심 뜻(Tyndale)
  await p.click('[data-vinfo]'); await p.waitForTimeout(300); await p.waitForFunction(() => /핵심 뜻\(Tyndale\)/.test(document.getElementById('rDet')?.textContent || '') && !/받는 중/.test(document.getElementById('rDet')?.textContent || ''), null, { timeout: 20000 });
  const t1 = await p.evaluate(() => { const d = document.getElementById('rDet'); const dts = [...d.querySelectorAll('dt')].map(x => x.textContent.trim()); const i = dts.findIndex(x => x.startsWith('핵심 뜻')); return { dts, ko: d.querySelectorAll('dd')[i]?.textContent.trim() }; });
  ok('1 창 1:1 첫 낱말(בְּרֵאשִׁית→레쉬트 H7225) 상세에 핵심 뜻(Tyndale) 칸이 스트롱 유래 앞에 있음', t1.dts.indexOf('핵심 뜻(Tyndale)') >= 0 && t1.dts.indexOf('핵심 뜻(Tyndale)') < t1.dts.indexOf('유래') && /[가-힣]/.test(t1.ko), JSON.stringify(t1));
  if (OUT) await p.screenshot({ path: OUT + '/tbesh_1_word.png', fullPage: false });
  // 2. 이름 낱말: 창 2:8 '에덴'(H5731) → 이름 설명 칸·품사 표시
  const vi = await p.evaluate(() => SD.ref.get('1-2-8')[0]);
  await p.evaluate(vi => { gotoVerse(vi); view.st.rv = vi; view.st.rw = null; render(); }, vi); await p.waitForTimeout(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.rsw')].find(b => /עֵ֫דֶן|עֵדֶן/.test(b.textContent)); b && b.click(); }); await p.waitForTimeout(500);
  const t2 = await p.evaluate(() => { const d = document.getElementById('rDet'); return { txt: d.textContent, hasName: !!d.querySelector('.tbnames'), shl: d.querySelectorAll('.tbnames .shl').length }; });
  ok('2 창 2:8 에덴 상세에 이름 설명 칸(땅 이름)이 있음', t2.hasName && /이름 설명/.test(t2.txt) && /땅 이름|사람 이름/.test(t2.txt), t2.txt.slice(0, 200));
  if (OUT) await p.screenshot({ path: OUT + '/tbesh_2_name.png' });
  // 3. 스트롱 시트(H1)에서도 핵심 뜻·이름 설명·H번호 단추 → 다른 스트롱 시트
  await p.evaluate(() => openStrongSheet(1)); await p.waitForTimeout(600);
  const t3 = await p.evaluate(() => { const r = document.getElementById('sheetRoot'); return { txt: r.textContent, n: r.querySelectorAll('.tbnames .shl').length, title: r.querySelector('h3')?.textContent }; });
  ok('3 스트롱 H1 시트: 핵심 뜻(아버지)·같은 번호 3가지·이름 설명에 H번호 단추', /핵심 뜻\(Tyndale\)/.test(t3.txt) && /아버지/.test(t3.txt) && /같은 번호 3가지/.test(t3.txt) && t3.n > 5, JSON.stringify({ n: t3.n, title: t3.title }));
  await p.evaluate(() => { document.querySelector('#sheetRoot .tbnames .shl').click(); }); await p.waitForTimeout(500);
  const t3b = await p.evaluate(() => document.querySelector('#sheetRoot h3')?.textContent);
  ok('3b 이름 설명의 H번호를 누르면 그 번호의 스트롱 시트로', /스트롱 H\d+/.test(t3b || '') && t3b !== '스트롱 H1', t3b || '');
  if (OUT) await p.screenshot({ path: OUT + '/tbesh_3_strong.png' }); await p.click('#sheetX').catch(() => {});
  // 4. 아람어 항목(H2 → 'H1G의 아람어' 관련 번호), 낱말 시트(openWordSheet)에서도 칸이 채워짐
  await p.evaluate(() => openStrongSheet(2)); await p.waitForTimeout(500);
  const t4 = await p.evaluate(() => document.getElementById('sheetRoot').textContent);
  ok('4 H2(아람어 아브) 시트에 관련 번호 "H1G의 아람어"', /관련 번호/.test(t4) && /H1G의 아람어/.test(t4), t4.slice(0, 160)); await p.click('#sheetX').catch(() => {});
  await p.evaluate(vi => { openWordSheet(SD.V[vi][5]+1); }, vi); await p.waitForTimeout(500);
  const t5 = await p.evaluate(() => document.getElementById('sheetRoot').textContent);
  ok('5 낱말 시트(구조 탭 낱말 상세)에도 핵심 뜻 칸', /핵심 뜻\(Tyndale\)/.test(t5) && !/받는 중/.test(t5), t5.slice(0, 160)); await p.click('#sheetX').catch(() => {});
  // 6. 자료 출처에 TBESH 표기, 390px 가로 밀림 없음, 페이지 오류 없음
  const src = await p.evaluate(() => (document.querySelector('.ssrc')?.textContent || ''));
  const t6 = await p.evaluate(() => { view.st.mode = 'verse'; render(); return document.documentElement.scrollWidth <= innerWidth + 1; });
  ok('6 자료 출처에 TBESH·CC BY 4.0 표기', /TBESH/.test(src) && /CC BY 4\.0/.test(src), src.slice(0, 80));
  ok('7 가로 밀림 없음·페이지 오류 없음', t6 && errs.length === 0, JSON.stringify(errs).slice(0, 300));
  await br.close(); console.log(R.join('\n')); console.log(R.filter(x => x.startsWith('FAIL')).length ? 'SOME FAIL' : 'ALL PASS');
})();
