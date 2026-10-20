// 지시 7(검색식 2차 안정화) 검증: 보관 범위 재현(A) · 결과 근거 보존(B) · 쉬운 말 근거(C) · 예시 안내 불일치 방지(D) · 검색 메모 복원(E) + 초급 재방문·대학원 시나리오. 실행: node pipeline/ui_tests/query_h.js <스크린샷 폴더>
const { chromium, devices } = require('playwright'); const fs = require('fs'); const OUT = (process.argv[2] || '.') + '/'; const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(2500); const x = await pg.$('#sheetX'); if (x) await x.click();
  await pg.evaluate(async () => { localStorage.removeItem('milal-study-queries'); await ensureAll(); });
  const W = ms => pg.waitForTimeout(ms); let taps = 0; const tap = async sel => { await pg.click(sel); taps++; await W(350); };
  const st = () => pg.evaluate(() => { const S = view.st, R = S.qres; return { mode: S.mode, wide: !!S.wide, range: S.range, R: S.R && { b: S.R.b, c1: S.R.c1, c2: S.R.c2 }, label: stRangeLabel(), n: R && R.n, status: R && R.status, verses: R && R.hits && R.hits.size, text: R && R.text, qkey: S.qkey, rangeTxt: R && R.range, firstVs: R && R.hits ? [...R.hits.keys()].sort((a, b) => a - b).slice(0, 5) : null }; });
  // ---- A 첫 화면에 범위 표시·변경
  await tap('.bnav [data-nav="research"]'); await tap('[data-smode="query"]');
  const f0 = await pg.evaluate(() => ({ box: !!document.querySelector('.qrange .swide'), label: (document.querySelector('.qrange .label') || {}).textContent || '', editor: !!document.querySelector('#qText, .qblock'), wideBtn: !!document.querySelector('.qrange [data-swide="1"]') }));
  ok('A1 첫 화면에 찾는 범위와 전환 단추(구약 전체/이 범위)가 보이고 편집기는 아직 없음', f0.box && /찾는 범위/.test(f0.label) && f0.wideBtn && !f0.editor, JSON.stringify(f0));
  await pg.screenshot({ path: OUT + 'after_first_range.png' });
  // 구약 전체로 바꾸고 예시 실행(초급 재방문 시나리오 시작)
  taps = 0; await tap('.qrange [data-swide="1"]'); const f1 = await pg.evaluate(() => (document.querySelector('.qrange .label') || {}).textContent || '');
  ok('A2 "구약 전체"를 누르면 첫 화면 범위 표시가 바뀜', /구약 전체/.test(f1), f1);
  await tap('[data-qq="예시1"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(300); const s1 = await st();
  ok('A3 구약 전체로 예시1 실행 → 227건, 결과에 범위 "구약 전체"', s1.wide && s1.n === 227 && s1.rangeTxt === '구약 전체' && s1.status === 'full', JSON.stringify({ n: s1.n, r: s1.rangeTxt, st: s1.status }));
  // 보관
  await tap('#qSave'); await pg.fill('#qsName', '전체 여호와 주어'); await tap('#qsGo');
  const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('milal-study-queries') || '[]'));
  ok('A4 보관 기록에 실제 실행 범위 "all"(구약 전체)과 판 표시(v:2)가 들어감', saved.length === 1 && saved[0].range === 'all' && saved[0].v === 2 && saved[0].R && saved[0].R.b === 1, JSON.stringify(saved[0]));
  // 다른 본문 연구(출 3장, 이 범위) 후 보관함에서 실행
  await pg.evaluate(() => { setRange({ b: 2, c1: 3, c2: 3 }); view.st.wide = false; view.st.mode = 'query'; view.st.qres = null; view.st.qkey = null; view.st.qt = ''; render(); }); await W(300);
  await tap('#qSaved'); await pg.screenshot({ path: OUT + 'h_saved_list.png' }); await tap('[data-qsrun]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(300); const s2 = await st();
  ok('A5 보관함에서 실행 → 구약 전체 범위로 복원되고 같은 227건·같은 첫 절들(재현)', s2.wide && s2.rangeTxt === '구약 전체' && s2.n === 227 && JSON.stringify(s2.firstVs) === JSON.stringify(s1.firstVs) && s2.qkey === null, JSON.stringify({ wide: s2.wide, n: s2.n, r: s2.rangeTxt, key: s2.qkey }));
  await tap('#qRun'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(200); const s2b = await st();
  ok('A6 같은 식·같은 범위·같은 자료판에서 두 번 실행해도 결과 동일', s2b.n === s2.n && s2b.verses === s2.verses && JSON.stringify(s2b.firstVs) === JSON.stringify(s2.firstVs));
  // 하위 호환: 옛 기록(범위 표기 전)
  await pg.evaluate(() => { const L = JSON.parse(localStorage.getItem('milal-study-queries') || '[]'); L.push({ id: 'old1', name: '옛 창22 와이크톨', text: 'clause\n  word sp=verb vt=wayq\n', range: 'chapter', R: { b: 1, c1: 22, c2: 22 }, t: Date.now() - 86400000 }); localStorage.setItem('milal-study-queries', JSON.stringify(L)); });
  await tap('#qSaved'); const oldTag = await pg.evaluate(() => [...document.querySelectorAll('[data-qsrun="old1"] small')].map(e => e.textContent).join(' ')); await tap('[data-qsrun="old1"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(200); const s3 = await st();
  ok('A7 옛 보관 기록(범위 판 없음)은 "옛 기록" 표시와 함께 책·장 범위(창 22)로 실행됨', /옛 기록/.test(oldTag) && !s3.wide && s3.R.b === 1 && s3.R.c1 === 22 && s3.rangeTxt !== '구약 전체' && s3.n > 0, JSON.stringify({ tag: oldTag, r: s3.rangeTxt, n: s3.n }));
  // ---- D 예시 안내 불일치 방지: 예시2 → 단계 카드 있음; 보관함의 다른 식 실행 → 단계 카드·예시 힌트 없음
  await pg.evaluate(() => { view.st.wide = true; }); await tap('.qqd summary'); await tap('[data-qq="예시2"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.n === 369, null, { timeout: 60000 }); await W(300);
  const d1 = await pg.evaluate(() => ({ steps: !!document.querySelector('.qsteps'), desc: /'보라'/.test((document.querySelector('.qsay') || {}).textContent || '') || /보라/.test(document.querySelector('#main').innerText), hint: /보라/.test((document.querySelector('.qhow') || {}).textContent || '') }));
  ok('D1 예시2 그대로: 단계 카드와 예시 안내가 보임', d1.steps && d1.hint, JSON.stringify(d1));
  await tap('[data-qstep="1"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.n > 369, null, { timeout: 60000 }); await W(200);
  const d2 = await pg.evaluate(() => ({ steps: !!document.querySelector('.qsteps'), on: (document.querySelector('.qstep.on') || {}).textContent }));
  ok('D2 예시의 단계로 조건을 바꾼 경우: 단계 카드 유지(2단계 표시)', d2.steps && /2\./.test(d2.on || ''), JSON.stringify(d2));
  await tap('#qEditBtn'); await tap('[data-qmode="text"]'); await pg.fill('#qText', 'clause typ=NmCl\n  phrase function=PreC\n'); await tap('#qRun'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits && /PreC/.test(view.st.qres.text), null, { timeout: 60000 }); await W(300);
  const d3 = await pg.evaluate(() => ({ steps: !!document.querySelector('.qsteps'), hintHNH: /보라/.test((document.querySelector('.qhow') || {}).textContent || ''), hintGeneric: /문장 종류가 같아도/.test((document.querySelector('.qhow') || {}).textContent || ''), descEx: /'보라' 뒤에/.test((document.querySelector('#main').innerText)) }));
  ok('D3 예시 조건을 크게 바꾸면: 단계 카드·예시 설명·예시 안내가 내려가고 실제 조건(문장 종류)에 맞는 일반 안내', !d3.steps && !d3.hintHNH && d3.hintGeneric && !d3.descEx, JSON.stringify(d3));
  await tap('#qSaved'); await tap('[data-qsrun="old1"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits && /wayq/.test(view.st.qres.text), null, { timeout: 60000 }); await W(200);
  const d4 = await pg.evaluate(() => ({ steps: !!document.querySelector('.qsteps'), key: view.st.qkey, hintHNH: /보라/.test((document.querySelector('.qhow') || {}).textContent || '') }));
  ok('D4 보관함의 다른 검색식 실행: 이전 예시 안내 제거(qkey 없음, 단계 카드 없음)', !d4.steps && d4.key === null && !d4.hintHNH, JSON.stringify(d4));
  // D5 범위만 바꿔도 '다시 찾기' 안내
  await tap('[data-swide="1"]'); const d5 = await pg.evaluate(() => (document.querySelector('.qchg') || {}).textContent || '');
  ok('D5 범위를 바꾸면(창 22 → 구약 전체) "검색 범위가 변경되었습니다 … 다시 찾기" 안내', /검색 범위/.test(d5) && /다시 찾기/.test(d5) && /구약 전체/.test(d5), d5.slice(0, 120));
  await pg.screenshot({ path: OUT + 'h_range_changed.png' });
  // ---- B·C 근거: 5,000 묶음을 넘는 검색에서도 뒤쪽 절의 근거가 있고, 쉬운 말로 보임 (대학원 시나리오)
  taps = 0; await tap('#qEditBtn'); await tap('[data-qmode="text"]'); await pg.fill('#qText', 'clause\n  w1:phrase function=Subj\n  w2:word\nw1 < w2\n'); await tap('#qRun'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits && /w1 < w2/.test(view.st.qres.text), null, { timeout: 120000 }); await W(300);
  const b1 = await pg.evaluate(() => { const R = view.st.qres; const vs = [...R.hits.keys()].sort((a, b) => a - b); const last = vs[vs.length - 1]; const e = R.why.get(last); return { n: R.n, status: R.status, total: R.outTotal, verses: R.hits.size, whySize: R.why.size, lastRef: sRef(last), lastE: e && { n: e.n, t: e.t.length }, allHave: vs.every(v => R.why.has(v)) }; });
  ok(`B1 관계식(w1<w2) 구약 전체: ${b1.n}건(${b1.status}) — 결과 절 ${b1.verses}개 모두 근거가 있고 마지막 절(${b1.lastRef})도 근거 ${b1.lastE && b1.lastE.n}개·대표 ${b1.lastE && b1.lastE.t}개`, b1.total >= 20000 && b1.status === 'limit' && b1.allHave && b1.whySize === b1.verses && b1.lastE && b1.lastE.n >= 1 && b1.lastE.t >= 1 && b1.lastE.t <= 3, JSON.stringify(b1));
  // 독립 재계산: 세 절의 묶음 수가 qRun 결과를 직접 세어 본 것과 같다
  const b2 = await pg.evaluate(() => { const R = view.st.qres; const r = qRun(qParse(R.text), null, 20000); const leaf = r.order.map(n => !n.ch.length); const cnt = new Map(); for (const tup of r.out) { const vs = new Set(); tup.forEach((a, k) => { if (!leaf[k]) return; for (const w of qWords(...a)) vs.add(SD.vOf[w]); }); for (const v of vs) cnt.set(v, (cnt.get(v) || 0) + 1); }
    const vs = [...R.hits.keys()].sort((a, b) => a - b); const pick = [vs[0], vs[Math.floor(vs.length / 2)], vs[vs.length - 1]]; return pick.map(v => [sRef(v), R.why.get(v).n, cnt.get(v)]); });
  ok('B2 절별 "맞은 묶음 수"가 독립 재계산(상한 20,000 안)과 일치(첫·중간·마지막 절)', b2.every(([, a, b]) => a === b), JSON.stringify(b2));
  // 화면: 마지막 절 '왜 맞았나' (더 보기로 끝까지 펼치지 않고 R.why 직접 렌더)
  const b3 = await pg.evaluate(() => { const R = view.st.qres; const vs = [...R.hits.keys()].sort((a, b) => a - b); const h = qWhyHTML(R, vs[vs.length - 1]); const d = document.createElement('div'); d.innerHTML = h; const det = d.querySelector('details.qcode'); const detTxt = det ? det.textContent : ''; det && det.remove(); const main = d.textContent; return { main, detTxt, hasLimit: /상한 20,000건 안에서/.test(main), codesOutside: /(lex=|typ=|function=|sp=)/.test(main), codesInside: /function=Subj/.test(detTxt), ko: /주어/.test(main) && /낱말/.test(main), rel: /앞에|뒤에/.test(main), look: /본문에서 살펴볼 것/.test(main) }; });
  ok('B3·C1 상한에 걸린 검색의 마지막 절 근거: "상한 20,000건 안에서" 표시, 쉬운 말(주어·서술·앞/뒤), 코드는 "자료 코드로 보기" 안에만', b3.hasLimit && !b3.codesOutside && b3.codesInside && b3.ko && b3.rel && b3.look, JSON.stringify({ limit: b3.hasLimit, out: b3.codesOutside, in: b3.codesInside, ko: b3.ko, rel: b3.rel, look: b3.look, main: b3.main.slice(0, 160) }));
  // 범위 변경 → 경고 → 재실행(대학원 시나리오 계속)
  await tap('[data-swide=""]'); const b4 = await pg.evaluate(() => (document.querySelector('.qchg') || {}).textContent || ''); ok('B4 범위 변경 경고', /검색 범위/.test(b4));
  await tap('[data-qrerun]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits && view.st.qres.range !== '구약 전체', null, { timeout: 60000 }); await W(200);
  // 검색 메모 저장 → 기록 탭에서 열기 → 복원·재실행·비교
  await tap('#qNote'); await pg.fill('#anObs', '주어구가 서술어구보다 앞에 오는 절(창 22)'); await tap('#anSave');
  const e1 = await pg.evaluate(() => { const a = anList().find(x => x.tags.includes('검색식')); return a && { q: a.anchor.query, kind: a.kind }; });
  ok('E1 검색 메모에 검색식·실행 범위(rg)·상태·BHSA 판·정규형이 보존됨', e1 && e1.q && /w1 < w2/.test(e1.q.text) && e1.q.rg && e1.q.rg.range === 'chapter' && e1.q.rg.R.b === 1 && e1.q.status === 'full' && e1.q.bhsa && e1.q.canon, JSON.stringify(e1 && e1.q));
  const gradTaps = taps;
  // 다른 데로 갔다가 기록 탭에서 검색 메모 열기
  await pg.evaluate(() => { setRange({ b: 18, c1: 1, c2: 1 }); view.st.wide = true; view.st.qres = null; view.st.qt = ''; }); await tap('.bnav [data-nav="notes"]');
  const rec = await pg.$('[data-rgo]'); await rec.click(); taps++; await pg.waitForFunction(() => view.st.mode === 'query' && view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(300); const e2 = await st();
  const e2n = await pg.evaluate(() => (document.querySelector('.qfrom') || {}).textContent || '');
  ok('E2 기록 탭에서 검색 메모를 열면 검색 화면·같은 식·같은 범위(창 22)로 다시 실행되고 "같은 결과입니다" 안내', e2.mode === 'query' && /w1 < w2/.test(e2.text) && !e2.wide && e2.R.b === 1 && e2.R.c1 === 22 && /검색 메모에서 다시 실행/.test(e2n) && /같은 결과입니다/.test(e2n), JSON.stringify({ mode: e2.mode, r: e2.rangeTxt, n: e2.n, note: e2n.slice(0, 140) }));
  await pg.screenshot({ path: OUT + 'h_from_note.png' });
  // 기록 당시 값이 다르면 경고
  await pg.evaluate(async () => { const a = anList().find(x => x.tags.includes('검색식')); a.anchor.query.n = a.anchor.query.n + 5; a.anchor.query.bhsa = '2017'; await anSave(a); }); await tap('.bnav [data-nav="notes"]'); const rec2 = await pg.$('[data-rgo]'); await rec2.click(); await pg.waitForFunction(() => view.st.mode === 'query' && view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(300);
  const e3 = await pg.evaluate(() => { const el = document.querySelector('.qfrom'); return { txt: el ? el.textContent : '', warn: !!(el && el.classList.contains('warn')) }; });
  ok('E3 기록 당시 건수·자료판이 지금과 다르면 두 값을 나란히 보이고 "결과가 다릅니다" 경고', e3.warn && /결과가 다릅니다/.test(e3.txt) && /BHSA 2017/.test(e3.txt) && /BHSA 2021/.test(e3.txt), e3.txt.slice(0, 160));
  ok(`시나리오 대학원: 관계식 실행→뒤쪽 절 근거→범위 변경 경고→재실행→검색 메모 저장·복원 (탭 ${gradTaps + 1})`, true, String(gradTaps + 1));
  // ---- 초급 재방문: 구약 전체 예시 → 보관 → 다른 본문 → 보관함 실행 → 범위·결과 확인 → 본문 왕복 → 관찰 메모 다시 열기
  taps = 0; await pg.evaluate(() => { localStorage.removeItem('milal-study-queries'); view.st.qres = null; view.st.qkey = null; view.st.qt = ''; view.st.qEdit = false; view.st.mode = 'query'; view.st.wide = false; setRange({ b: 1, c1: 1, c2: 1 }); render(); });
  await tap('.qrange [data-swide="1"]'); await tap('[data-qq="예시2"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.n === 369, null, { timeout: 60000 }); await W(200);
  await tap('#qSave'); await pg.fill('#qsName', '보라+분사 전체'); await tap('#qsGo');
  await tap('.bnav [data-nav="text"]'); await pg.evaluate(() => { setRange({ b: 18, c1: 3, c2: 3 }); view.st.wide = false; render(); }); await tap('.bnav [data-nav="research"]'); await tap('[data-smode="query"]');
  await tap('#qSaved'); await tap('[data-qsrun]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.n === 369, null, { timeout: 60000 }); await W(200); const r1 = await st();
  ok('재방문 1 보관함에서 실행 → 구약 전체·369건 그대로', r1.wide && r1.n === 369 && r1.rangeTxt === '구약 전체');
  await tap('.shit'); await pg.waitForFunction(() => document.querySelector('#sBack'), null, { timeout: 20000 }); await tap('#sBack'); await pg.waitForFunction(() => view.st.mode === 'query' && view.st.qres && view.st.qres.n === 369, null, { timeout: 20000 }); await W(200);
  await tap('#qNote'); await pg.fill('#anObs', '보라 뒤 분사 — 서술자 설명에 많음(관찰)'); await tap('#anSave');
  await tap('.bnav [data-nav="notes"]'); const rr = await pg.$$('[data-rgo]'); await rr[0].click(); taps++; await pg.waitForFunction(() => view.st.mode === 'query' && view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(300); const r2 = await st(); const r2n = await pg.evaluate(() => (document.querySelector('.qfrom') || {}).textContent || '');
  ok(`재방문 2 관찰 메모를 다시 열면 구약 전체·369건 복원, 같은 결과 (초급 탭 ${taps})`, r2.mode === 'query' && r2.wide && r2.n === 369 && /같은 결과/.test(r2n), JSON.stringify({ wide: r2.wide, n: r2.n }));
  // 대조 건수
  const cnts = await pg.evaluate(() => Object.fromEntries(Object.keys(Q_RECIPES).map(k => [k, qRun(qParse(Q_RECIPES[k]), null, 100000).out.length])));
  ok('대조 건수 227/369/2260/1015/3697 유지', cnts['예시1'] === 227 && cnts['예시2'] === 369 && cnts['예시3'] === 2260 && cnts['장면'] === 1015 && cnts['인물'] === 3697, JSON.stringify(cnts));
  console.log(R.join('\n')); console.log('errors:', errs); const bad = R.filter(r => r.startsWith('FAIL')).length; console.log(bad ? `실패 ${bad}` : '모두 통과'); await br.close(); process.exit(bad ? 1 : 0); })().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(2); });
