// 작업 D 본문 비교기 시험 + 초급·대학원 비교 시나리오(탭 수). 실행: node pipeline/ui_tests/compare_d.js  (에뮬레이션)
const { chromium, devices } = require('playwright'); const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); let taps = 0; const tap = async (sel) => { taps++; await pg.click(sel); await pg.waitForTimeout(350); };
  await pg.goto('http://localhost:8765/index.html?ux=0', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(2500); const x = await pg.$('#sheetX'); if (x) await x.click();
  // ---- 초급: 창 22장 반복 (단추만)
  taps = 0; await tap('.bnav [data-nav="research"]'); await tap('[data-smode="compare"]'); await pg.evaluate(() => cmpGo('창 22:1-10','창 22:11-19','repeat')); taps++; await pg.waitForTimeout(350); await pg.waitForFunction(() => document.querySelector('.cmpcols'), null, { timeout: 30000 }); await pg.waitForTimeout(300);
  let I = await pg.evaluate(() => { const R = view.st.cmpR; return { A: R.A.length, B: R.B.length, shared: R.shared.length, top: SD.L[R.shared[0].li][0], sameCnt: R.shared.filter(s => s.same).length, scrollW: document.documentElement.scrollWidth, cols: getComputedStyle(document.querySelector('.cmpcols')).gridTemplateColumns.split(' ').length }; });
  ok('D1 창 22:1-10 ↔ 11-19: 공통 어휘 있음, 아브라함이 맨 위, 두 단', I.shared > 10 && I.top === 'אַבְרָהָם' && I.cols === 2 && I.scrollW <= 393, JSON.stringify(I));
  await tap('.cw'); const ws = await pg.evaluate(() => ({ h: document.querySelector('#sheetRoot h3')?.textContent, parse: /동사|명사|고유명사/.test(document.querySelector('#sheetRoot .sheet').innerText) })); ok('D2 낱말 누르면 형태·품사·뜻', /낱말/.test(ws.h || '') && ws.parse, JSON.stringify(ws)); await tap('#sheetX');
  await tap('#cmpNote'); await pg.fill('#anObs', '아브라함·말하다·아들이 되풀이'); await tap('#anSave'); const beginnerTaps = taps; ok('D3 초급: 비교 → 낱말 확인 → 관찰 메모 저장 (탭 ' + beginnerTaps + ')', beginnerTaps <= 9, String(beginnerTaps));
  // 같은 형태/다른 형태 구별: 창 22 아브라함은 같은 형태, 걷다(ילך)는 형태 다름 포함
  I = await pg.evaluate(() => { const R = view.st.cmpR; const f = li => R.shared.find(s => SD.L[s.li][0] === li); const abr = f('אַבְרָהָם'), hlk = f('הָלַךְ') || R.shared.find(s => s.formsA.length > 1 && s.formsB.length > 1); const markSame = [...R.markA.values()].filter(m => m.same).length, markDiff = [...R.markA.values()].filter(m => !m.same).length; return { abrSame: abr && abr.same, multiForms: hlk && hlk.formsA.length, markSame, markDiff }; });
  ok('D4 같은 형태(실선)와 다른 형태(점선) 둘 다 있음', I.abrSame === true && I.markSame > 0 && I.markDiff > 0, JSON.stringify(I));
  // 기능어 포함 토글
  await pg.click('#cmpFn'); await pg.waitForTimeout(400); const withFn = await pg.evaluate(() => view.st.cmpR.shared.length); await pg.click('#cmpFn'); await pg.waitForTimeout(400); const without = await pg.evaluate(() => view.st.cmpR.shared.length); ok('D5 기능어 포함하면 공통 어휘가 늘어남', withFn > without, withFn + ' > ' + without);
  // ---- 대학원: 욥 32:6 ↔ 34:1 인용 후보 → 공통 연쇄 → 해석 메모 → Markdown
  taps = 0; await pg.evaluate(() => cmpGo('욥 32:6','욥 34:1','quote')); taps++; await pg.waitForTimeout(350); await pg.waitForFunction(() => /공통 연쇄/.test(document.querySelector('#main').innerText), null, { timeout: 30000 }); await pg.waitForTimeout(300);
  I = await pg.evaluate(() => { const R = view.st.cmpR; return { runs: R.runs.map(r => r.a.map(w => wHeb(w).trim()).join(' ')), t: view.st.cmp.t, txt: document.querySelector('#main').innerText.includes('앱은 인용이라 단정하지 않습니다') }; });
  ok('D6 욥 32:6 ↔ 34:1: 공통 연쇄 "וַיַּעַן אֱלִיהוּא" 관찰, 인용 단정 안 함 문구', I.runs.some(r => /יַּעַן אֱלִיהוּא/.test(r)) && I.t === 'quote' && I.txt, JSON.stringify(I));
  await pg.click('[data-cmpt="restate"]'); await pg.waitForTimeout(300); const diff = await pg.evaluate(() => ({ s: document.querySelectorAll('.cd-s').length, A: document.querySelectorAll('.cd-A').length, B: document.querySelectorAll('.cd-B').length })); taps++;
  ok('D7 재진술 후보: 차이 보기(공통/A에만/B에만) 표시', diff.s > 0 && diff.A > 0, JSON.stringify(diff));
  await tap('#cmpNote'); await pg.fill('#anInt', '도입 공식이 동사+이름으로 되풀이됨(관찰); 인용 여부는 미정'); await tap('#anSave');
  const md = await pg.evaluate(() => { exportCompare(); return window.__lastExport.txt; }); taps++;
  ok('D8 Markdown 에 동일 어휘 표·공통 연쇄·정렬·사용자 관찰/해석·판정 안 함 문구', /동일 어휘/.test(md) && /공통 연쇄/.test(md) && /정렬\(LCS\)/.test(md) && /사용자 관찰·해석/.test(md) && /판정하지 않습니다/.test(md), String(md.length));
  const gradTaps = taps; ok('D9 대학원: 비교 → 연쇄 확인 → 차이 보기 → 해석 메모 → Markdown (탭 ' + gradTaps + ')', gradTaps <= 8, String(gradTaps));
  await tap('.bnav [data-nav="notes"]'); const rec = await pg.evaluate(() => allRecords().filter(r => r.tags.includes('비교')).map(r => ({ kind: r.kind, title: r.title, cmp: r.a.anchor.compare && r.a.anchor.compare.label, obs: r.observation.slice(0, 20), int: r.interpretation.slice(0, 20) })));
  ok('D10 기록 탭에 비교 메모 2건(구간 메모, B 범위 기록, 태그 #비교)', rec.length === 2 && rec.every(r => r.kind === 'range' && r.cmp), JSON.stringify(rec));
  // 욥 1:5 ↔ 34:5
  await tap('.bnav [data-nav="research"]'); await pg.evaluate(() => cmpGo('욥 1:5','욥 34:5','restate')); taps++; await pg.waitForTimeout(350); await pg.waitForFunction(() => document.querySelector('.cmpcols'), null, { timeout: 30000 }); await pg.waitForTimeout(300);
  I = await pg.evaluate(() => { const R = view.st.cmpR; return { shared: R.shared.map(s => SD.L[s.li][0]), onlyB: R.onlyB.length }; }); ok('D11 욥 1:5 ↔ 34:5: 공통 어휘(욥·말하다) 와 B에만 있는 것', I.shared.includes('אָמַר') && I.onlyB > 0, JSON.stringify(I));
  // 한 범위만(B 비움) → 안의 반복
  await pg.fill('#cmpA', '창 22:1-19'); await pg.fill('#cmpB', ''); await tap('#cmpGo'); await pg.waitForFunction(() => document.querySelector('.cmpcols'), null, { timeout: 30000 }); I = await pg.evaluate(() => { const R = view.st.cmpR; return { single: R.single, shared: R.shared.length, top: SD.L[R.shared[0].li][0], n: R.shared[0].wa.length }; });
  ok('D12 B 를 비우면 한 구간 안의 반복(창 22장: 아브라함 18회)', I.single && I.top === 'אַבְרָהָם' && I.n === 18, JSON.stringify(I));
  const bad = await pg.evaluate(() => { const r = cmpParse('없는책 3:1'); return r && r.err; }); ok('D13 잘못된 범위는 안내', !!bad, bad);
  console.log(R.join('\n')); console.log('errors:', errs); const b = R.filter(r => r.startsWith('FAIL')).length; console.log(b ? `실패 ${b}` : '모두 통과'); await br.close(); process.exit(b ? 1 : 0); })();
