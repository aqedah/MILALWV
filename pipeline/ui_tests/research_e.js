// 후속 작업 E: 반복 정렬 전환(E-1)·검색식 보관함(E-2). 실행: node pipeline/ui_tests/research_e.js [스크린샷 폴더]
const { chromium, devices } = require('playwright'); const OUT = (process.argv[2] || '/tmp') + '/';
const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' — ' + info));
(async () => {
  const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/index.html?ux=0', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(800); const x = await pg.$('#sheetX'); if (x) await x.click();
  await pg.evaluate(() => { setRange({ b: 1, c1: 22, c2: 22 }); view.st.mode = 'tool'; view.st.range = 'chapter'; view.st.tool = '반복'; view.st.entered = true; render(); }); await pg.waitForTimeout(500);
  const cnt = await pg.evaluate(() => [...document.querySelectorAll('#sToolRes .scount b')].map(b => +b.textContent.replace('번', '')));
  ok('E-1a 기본은 많이 나온 순(내림차순)', cnt.length > 3 && cnt.every((v, i) => i === 0 || v <= cnt[i - 1]), JSON.stringify(cnt));
  await pg.screenshot({ path: OUT + 'r1_repeat_count.png' });
  await pg.click('[data-repsort="salient"]'); await pg.waitForTimeout(400);
  const sal = await pg.evaluate(() => ({ cnt: [...document.querySelectorAll('#sToolRes .scount b')].map(b => +b.textContent.replace('번', '')), expl: document.querySelector('#sToolRes .lead').textContent, hasExp: /기대/.test(document.querySelector('#sToolRes .scount small').textContent) }));
  ok('E-1b 두드러진 순으로 바꾸면 설명이 바뀌고 기대 횟수가 보임', /평균에 견주어/.test(sal.expl) && sal.hasExp && JSON.stringify(sal.cnt) !== JSON.stringify(cnt), JSON.stringify(sal));
  await pg.screenshot({ path: OUT + 'r2_repeat_salient.png' });
  await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv, .stools'), null, { timeout: 60000 }); await pg.waitForTimeout(500);
  ok('E-1c 정렬 선택이 기억됨', (await pg.evaluate(() => localStorage.getItem('milal-study-repsort'))) === 'salient');
  // E-2
  await pg.evaluate(() => { localStorage.removeItem('milal-study-queries'); setRange({ b: 1, c1: 22, c2: 22 }); view.st.mode = 'query'; view.st.range = 'chapter'; view.st.qMode = 'text'; view.st.qkey = '__custom'; view.st.qt = 'clause\n  word sp=verb vt=wayq'; view.st.entered = true; render(); }); await pg.waitForTimeout(400);
  await pg.click('#qSave'); await pg.waitForTimeout(300); await pg.fill('#qsName', '창 22 와이크톨'); await pg.click('#qsGo'); await pg.waitForTimeout(400);
  const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('milal-study-queries') || '[]'));
  ok('E-2a 이름·식·범위·작성일 저장', saved.length === 1 && saved[0].name === '창 22 와이크톨' && /wayq/.test(saved[0].text) && saved[0].range === 'chapter' && saved[0].R.b === 1 && saved[0].R.c1 === 22 && saved[0].t > 0, JSON.stringify(saved));
  ok('E-2b 보관함 단추에 개수', (await pg.evaluate(() => document.getElementById('qSaved').textContent)) === '보관함 1');
  // 다른 범위로 간 뒤 보관함에서 실행 → 범위 복귀 + 결과
  await pg.evaluate(() => { setRange({ b: 2, c1: 3, c2: 3 }); view.st.qt = ''; view.st.qres = null; render(); }); await pg.waitForTimeout(300);
  await pg.click('#qSaved'); await pg.waitForTimeout(300); await pg.screenshot({ path: OUT + 'r3_saved_list.png' }); await pg.click('[data-qsrun]'); await pg.waitForTimeout(1500);
  const run = await pg.evaluate(() => ({ b: view.st.R.b, c1: view.st.R.c1, mode: view.st.mode, n: view.st.qres && view.st.qres.n, err: view.st.qres && view.st.qres.err }));
  ok('E-2c 보관함에서 실행 → 저장된 범위(창 22)로 가서 결과', run.b === 1 && run.c1 === 22 && run.mode === 'query' && run.n > 0 && !run.err, JSON.stringify(run));
  await pg.screenshot({ path: OUT + 'r4_saved_run.png' });
  await pg.click('#qSaved'); await pg.waitForTimeout(300); await pg.click('[data-qscopy]'); await pg.waitForTimeout(200);
  const md = await pg.evaluate(() => window.__lastQsCopy || ''); ok('E-2d Markdown 복사(이름·범위·작성일·식)', /## 창 22 와이크톨/.test(md) && /범위: 창 22/.test(md) && /```\nclause/.test(md), md.slice(0, 200));
  const inAnn = await pg.evaluate(async () => (await anAllRaw()).length); ok('E-2e 본문 연구 기록(annots)과 분리 저장', inAnn === 0, String(inAnn));
  pg.once('dialog', d => d.accept()); await pg.click('[data-qsdel]'); await pg.waitForTimeout(300);
  ok('E-2f 지우기', (await pg.evaluate(() => JSON.parse(localStorage.getItem('milal-study-queries') || '[]').length)) === 0);
  await br.close(); console.log(R.join('\n')); console.log('errors:', errs); const bad = R.filter(x => x.startsWith('FAIL')).length; console.log(bad ? `실패 ${bad}` : '모두 통과'); process.exit(bad ? 1 : 0);
})();
