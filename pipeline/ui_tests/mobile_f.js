// 작업 F: 모바일 표시·구간·상태 점검 (Playwright 에뮬레이션 — 실기기 아님). 실행: node pipeline/ui_tests/mobile_f.js
const { chromium, devices } = require('playwright');
const URL0 = 'http://localhost:8765/index.html'; const R = []; const ok = (n, c, info = '') => { R.push((c ? 'PASS ' : 'FAIL ') + n + (c || info ? ' — ' + info : '')); };
const boot = async (pg) => { await pg.goto(URL0, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(800); const x = await pg.$('#sheetX'); if (x) await x.click(); await pg.waitForTimeout(200); };
(async () => {
  const br = await chromium.launch();
  // 1. 키보드: visualViewport 흉내 (iOS 처럼 layout 은 그대로, visual 만 줄어듦)
  const c1 = await br.newContext({ ...devices['Pixel 5'] }); await c1.addInitScript(() => { const L = {}; window.visualViewport = { height: innerHeight, offsetTop: 0, addEventListener: (t, f) => { (L[t] ||= []).push(f); }, _fire: (t) => (L[t] || []).forEach(f => f()) }; });
  const p1 = await c1.newPage(); const errs = []; p1.on('pageerror', e => errs.push(e.message)); await boot(p1);
  await p1.evaluate(() => { const vi = SD.ref.get('1-1-1')[0]; openAnnotEditor('verse', vi); }); await p1.waitForTimeout(200);
  const before = await p1.evaluate(() => document.querySelector('#sheetRoot .sheet').getBoundingClientRect().height);
  await p1.evaluate(() => { visualViewport.height = 380; visualViewport._fire('resize'); }); await p1.waitForTimeout(100);
  const kb = await p1.evaluate(() => { const sh = document.querySelector('#sheetRoot .sheet'), bg = document.querySelector('#sheetRoot .sheet-bg'); const r = sh.getBoundingClientRect(); return { h: r.height, bottom: r.bottom, bgH: bg.getBoundingClientRect().height, canScroll: sh.scrollHeight > sh.clientHeight }; });
  await p1.evaluate(() => { document.getElementById('anInt').focus(); }); await p1.waitForTimeout(500);
  const vis = await p1.evaluate(() => { const t = document.getElementById('anInt'), sh = document.querySelector('#sheetRoot .sheet'); const r = t.getBoundingClientRect(), s = sh.getBoundingClientRect(); return r.top >= s.top - 1 && r.bottom <= s.bottom + 1; });
  ok('1 키보드가 올라오면(visualViewport 380px) 시트가 그 높이 안에 들고 초점 칸이 보임', before > 380 && kb.h <= 380 && kb.bottom <= 381 && kb.canScroll && vis, JSON.stringify({ before, kb, vis }));
  await p1.evaluate(() => { visualViewport.height = innerHeight; visualViewport._fire('resize'); }); const restored = await p1.evaluate(() => document.querySelector('#sheetRoot .sheet').style.maxHeight === '');
  ok('1b 키보드 내려가면 원래대로', restored); await p1.click('#sheetX');
  // 2. RTL 괄호: 여는 괄호가 낱말 오른쪽, 닫는 괄호가 왼쪽. 3. 고른 순서 ≠ 본문 순서여도 저장은 본문 순서
  const id = await p1.evaluate(async () => { const vi = SD.ref.get('1-1-1')[0]; const s = SD.V[vi][5]; const idx = [s + 3, s + 1, s + 2]; /* 거꾸로·섞어서 */ let saved; window.__sv = a => saved = a; const a = await anSave({ kind: 'mark', key: 'm:t', anchor: { book: 1, ch: 1, vs: 1, bhsa: '2021', word_ids: [...new Set(idx)].sort((a, b) => a - b).map(slotOf), clause_atom_ids: [], clause_ids: [], heb: 'x' }, style: 'br', color: '', observation: '', interpretation: '', tags: [] }); render(); return a.id; });
  await p1.waitForTimeout(300);
  const br2 = await p1.evaluate(() => { const o = document.querySelector('.mkbr-o'), c = document.querySelector('.mkbr-c'); if (!o || !c) return null; const w = o.nextElementSibling; return { oX: o.getBoundingClientRect().x, cX: c.getBoundingClientRect().x, wX: w.getBoundingClientRect().x, oTxt: o.textContent, cTxt: c.textContent }; });
  ok('2 RTL 괄호: 여는 ⟦ 가 낱말 오른쪽, 닫는 ⟧ 가 왼쪽', br2 && br2.oX > br2.cX && br2.oX >= br2.wX, JSON.stringify(br2));
  const ordered = await p1.evaluate(() => { const vi = SD.ref.get('1-1-1')[0], s = SD.V[vi][5]; const sel = [s + 3, s + 1, s + 2]; let got = null; const orig = window.anSave; window.anSave = (a) => { got = a.anchor.word_ids; return Promise.resolve(a); }; try { openMarkPicker(sel, 't'); document.querySelector('[data-mk="ul:"]').click(); } catch (e) { got = 'err ' + e.message; } window.anSave = orig; document.getElementById('sheetRoot').innerHTML = ''; return got; });
  ok('3 낱말을 뒤섞어 골라도 저장은 본문 순서', ordered && ordered.every((v, i) => i === 0 || v > ordered[i - 1]), JSON.stringify(ordered));
  await p1.reload({ waitUntil: 'domcontentloaded' }); await boot(p1);
  // 4. 글씨 크기 바꿔도 표시 유지
  const n0 = await p1.evaluate(() => document.querySelectorAll('.mk.usr').length); await p1.evaluate(() => { localStorage.setItem('milal-study-fs', '1.4'); render(); }); await p1.waitForTimeout(200);
  const n1 = await p1.evaluate(() => ({ n: document.querySelectorAll('.mk.usr').length, fs: getComputedStyle(document.querySelector('.rdv')).fontSize }));
  await p1.evaluate(() => { localStorage.setItem('milal-study-fs', '1'); render(); }); ok('4 글씨 크기 1.4배에서도 표시(괄호 낱말) 그대로', n0 > 0 && n1.n === n0, JSON.stringify({ n0, n1 }));
  // 5. 긴 구간(창 1:1–50:26) 선택 → 멈추지 않고 열림, 번호 목록은 상한 안
  const t5 = await p1.evaluate(async () => { const a = SD.ref.get('1-1-1')[0], b = SD.ref.get('1-50-26')[0]; const t0 = performance.now(); const an = anchorRange(a, b); const dt = performance.now() - t0; return { dt, atoms: an.clause_atom_ids.length, cnt: an.clause_atom_count, words: an.span.words, json: JSON.stringify(an).length }; });
  ok('5 긴 구간(창세기 전체) 자리 만들기 빠르고 작음', t5.dt < 1500 && t5.atoms === 2 && t5.cnt > 1000 && t5.json < 2000, JSON.stringify(t5));
  const t5b = await p1.evaluate(async () => { const a = SD.ref.get('1-1-1')[0], b = SD.ref.get('1-50-26')[0]; const an = anchorRange(a, b); const t0 = performance.now(); openAnnotEditor('range', null, { kind: 'range', key: 'r:x', anchor: an, _new: true }); const dt = performance.now() - t0; const ok = !!document.getElementById('anObs'); document.getElementById('sheetX').click(); return { dt, ok }; });
  ok('5b 긴 구간 메모 창이 바로 열림', t5b.ok && t5b.dt < 500, JSON.stringify(t5b));
  // 6. 겹친 표시: 같은 낱말에 형광펜 둘 → 누르면 고르는 창
  await p1.evaluate(async () => { const vi = SD.ref.get('1-1-2')[0], s = SD.V[vi][5]; for (const c of ['y', 'g']) await anSave({ kind: 'mark', key: 'm:' + c, anchor: { book: 1, ch: 1, vs: 2, bhsa: '2021', word_ids: [slotOf(s), slotOf(s + 1)], clause_atom_ids: [], clause_ids: [], heb: 'x' }, style: 'hl', color: c, observation: '', interpretation: '', tags: [c] }); render(); });
  await p1.waitForTimeout(200); await p1.click('.mk-multi'); await p1.waitForTimeout(200);
  const multi = await p1.evaluate(() => ({ title: document.querySelector('#sheetRoot h3')?.textContent, n: document.querySelectorAll('[data-mkpick]').length }));
  ok('6 겹친 표시를 누르면 어느 것인지 고르는 창(2개)', /겹친 표시 2개/.test(multi.title || '') && multi.n === 2, JSON.stringify(multi)); await p1.click('#sheetX');
  // 7. 사용자 표시(노란 칠) vs 앱 표지(검색 결과 굵게·밑줄) 구별
  const hitStyle = await p1.evaluate(() => { const m = document.createElement('div'); m.className = 'shit'; m.innerHTML = '<mark>x</mark>'; document.body.appendChild(m); const cs = getComputedStyle(m.querySelector('mark')); const r = { bg: cs.backgroundColor, bb: cs.borderBottomWidth, fw: cs.fontWeight }; m.remove(); return r; });
  const usr = await p1.evaluate(() => { const e = document.querySelector('.mk.usr'); return e ? getComputedStyle(e).boxShadow : ''; });
  ok('7 검색 표지는 칠 없이 밑줄·굵게, 사용자 형광펜은 칠', /rgba\(0, 0, 0, 0\)|transparent/.test(hitStyle.bg) && hitStyle.bb === '2px' && (+hitStyle.fw >= 600 || hitStyle.fw === 'bold') && usr && usr !== 'none', JSON.stringify({ hitStyle, usr }));
  // 8. 빈 화면·오류·자료 없음 안내
  const emptyRec = await (async () => { const c = await br.newContext({ ...devices['Pixel 5'] }); const p = await c.newPage(); await boot(p); await p.evaluate(() => { view.st.mode = 'notes'; view.st.nseg = 'records'; render(); }); const t = await p.evaluate(() => document.querySelector('#main').innerText); await c.close(); return t; })();
  ok('8a 기록 없을 때 안내', /기록이 없습니다/.test(emptyRec), emptyRec.slice(0, 60));
  await p1.route('**/study/books/2.json*', r => r.abort()); await p1.evaluate(() => { setRange({ b: 2, c1: 1, c2: 1 }); render(); }); await p1.waitForTimeout(800);
  const bookErr = await p1.evaluate(() => document.querySelector('#main').innerText); ok('8b 책 자료 못 받을 때 안내', /내려받지 못했습니다/.test(bookErr), bookErr.slice(0, 80)); await p1.unroute('**/study/books/2.json*');
  await p1.route('**/study/milal/job.json*', r => r.fulfill({ status: 404, body: 'no' }));
  await p1.evaluate(() => { delete ML[18]; setRange({ b: 18, c1: 32, c2: 32 }); view.st.mode = 'verse'; view.st.rd = 'struct'; render(); }); await p1.waitForTimeout(600); await p1.evaluate(() => { document.getElementById('sheetRoot').innerHTML = ''; view.st.milalOn = true; render(); }); await p1.waitForTimeout(1500);
  const milalErr = await p1.evaluate(() => document.querySelector('#main').innerText); ok('8c MILAL 파일이 없을 때 안내(자료 미존재)', /MILAL/.test(milalErr) && /(없습니다|못했습니다)/.test(milalErr), milalErr.replace(/\s+/g, ' ').slice(0, 160)); await p1.unroute('**/study/milal/job.json*');
  await p1.evaluate(() => { setRange({ b: 1, c1: 1, c2: 1 }); view.st.rd = 'struct'; render(); }); await p1.waitForTimeout(400);
  const noMilal = await p1.evaluate(() => document.querySelector('#main').innerText); ok('8d MILAL 자료가 없는 책(창세기)의 구조 화면 안내', /MILAL/.test(noMilal), noMilal.replace(/\s+/g, ' ').slice(0, 120));
  await c1.close(); await br.close(); console.log(R.join('\n')); console.log('errors:', errs); const bad = R.filter(x => x.startsWith('FAIL')).length; console.log(bad ? `실패 ${bad}` : '모두 통과'); process.exit(bad ? 1 : 0);
})();
