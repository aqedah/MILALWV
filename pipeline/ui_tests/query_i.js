// 지시 9 작업 A·B: Web Worker 검색 — 주 스레드 엔진과 워커 엔진(같은 study_qe.js)의 결과 대조(건수·지문·절별 근거·상한·중단), 취소·늦은 결과 방지·대체 동작, 검색 중 화면 응답성, 메모리. 실행: node pipeline/ui_tests/query_i.js
const { chromium, devices } = require('playwright'); const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
const QS = [
  ['예시1', null], ['예시2', null], ['예시3', null], ['장면', null], ['인물', null],
  ['이름 관계', 'clause\n  w1:phrase function=Subj\n  w2:phrase function=Pred\nw1 < w2\n'],
  ['여러 조건 조합', 'clause typ=WayX|Way0 domain=N\n  phrase function=Subj\n    word sp=subs nu=sg\n  <: phrase function=Objc\n'],
  ['상한 20,000', 'clause\n  w1:phrase function=Subj\n  w2:word\nw1 < w2\n'],
  ['계산 400만 중단', 'clause\n  w1:word\n  w2:word\n  w3:word lex=NOPE_NOPE\nw1 < w2\nw2 < w3\n'] ];
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const cdp = await c.newCDPSession(pg); await cdp.send('Performance.enable');
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(2500); await pg.evaluate(() => { document.getElementById('sheetRoot').innerHTML = ''; });
  await pg.evaluate(async () => { await ensureAll(); view.st.wide = true; view.st.mode = 'query'; view.st.qMode = 'text'; view.st.qkey = null; render(); });
  const heap = async () => { const m = await cdp.send('Performance.getMetrics'); return Math.round(m.metrics.find(x => x.name === 'JSHeapUsedSize').value / 1048576); };
  const run = async (text, mode) => pg.evaluate(async ([text, mode]) => { try { localStorage.setItem('milal-q-worker', mode === 'main' ? 'off' : 'on'); } catch (e) { } const S = view.st; S.qt = text; S.qres = null; S.qkey = null; const t0 = performance.now(); qExec(); render();
    while (!(S.qres && (S.qres.hits || (S.qres.err && !S.qres.loading)))) await new Promise(r => setTimeout(r, 20)); const Rr = S.qres; if (Rr.err) return { err: Rr.err };
    const why = [...Rr.why].map(([vi, e]) => [vi, e.n, e.t.map(t => t.map(a => a.join(':')).join('|')).join(';')]).sort((a, b) => a[0] - b[0]);
    return { n: Rr.n, fp: Rr.fp, status: Rr.status, engine: Rr.engine, ms: Rr.ms, wall: Math.round(performance.now() - t0), verses: Rr.hits.size, hits: [...Rr.hits].map(([vi, s]) => vi + ':' + [...s].sort((a, b) => a - b).join(',')).sort().join(';').length, why, whyN: why.reduce((a, x) => a + x[1], 0) }; }, [text, mode]);
  // ---- B 정확성: 아홉 검색식을 두 엔진에서 실행해 대조
  const perf = [];
  for (const [name, t] of QS) { const text = t || await pg.evaluate(k => Q_RECIPES[k], name);
    const a = await run(text, 'main'); const b = await run(text, 'worker'); const same = a.n === b.n && a.fp === b.fp && a.status === b.status && a.verses === b.verses && a.hits === b.hits && JSON.stringify(a.why) === JSON.stringify(b.why);
    perf.push({ name, n: a.n, status: a.status, main: a.ms, worker: b.ms, wallW: b.wall, wallM: a.wall });
    ok(`B ${name}: 주 스레드(${a.engine}) = 워커(${b.engine}) — 건수 ${a.n}/${b.n} · 상태 ${a.status}/${b.status} · 지문 ${a.fp === b.fp ? '같음' : '다름'} · 절 ${a.verses}/${b.verses} · 절별 근거 ${a.whyN}/${b.whyN}`, same && b.engine === 'worker' && a.engine === 'main', JSON.stringify({ a: [a.n, a.fp, a.status], b: [b.n, b.fp, b.status] })); }
  const cnt = Object.fromEntries(perf.slice(0, 5).map(p => [p.name, p.n])); ok('B 대조 건수 227/369/2260/1015/3697 (두 엔진 모두)', cnt['예시1'] === 227 && cnt['예시2'] === 369 && cnt['예시3'] === 2260 && cnt['장면'] === 1015 && cnt['인물'] === 3697, JSON.stringify(cnt));
  ok('B 상한 20,000 과 계산 중단(400만)이 두 엔진에서 같은 상태로 보고됨', perf[7].status === 'limit' && perf[8].status === 'steps', perf.slice(7).map(p => p.name + ':' + p.status).join(' / '));
  console.log('성능(ms) ' + perf.map(p => `${p.name} 주 ${p.main}(벽 ${p.wallM}) / 워커 ${p.worker}(벽 ${p.wallW})`).join(' · '));
  // 보관함 재실행(워커): 저장 → 다른 범위 → 보관함 실행 → 지문 동일
  const sv = await pg.evaluate(async () => { localStorage.setItem('milal-q-worker', 'on'); localStorage.removeItem('milal-study-queries'); const S = view.st; S.qt = Q_RECIPES['예시2']; S.qres = null; qExec(); while (!(S.qres && S.qres.hits)) await new Promise(r => setTimeout(r, 20)); const fp0 = S.qres.fp; const rg = qRangeOf(); const L = [{ id: 's1', name: 't', text: S.qt, range: rg.range, R: rg.R, v: rg.v, t: Date.now() }]; localStorage.setItem('milal-study-queries', JSON.stringify(L));
    setRange({ b: 2, c1: 3, c2: 3 }); S.wide = false; S.qres = null; render(); return fp0; });
  await pg.evaluate(() => qOpenSaved()); await pg.waitForTimeout(200); await pg.click('[data-qsrun="s1"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); const sv2 = await pg.evaluate(() => ({ fp: view.st.qres.fp, n: view.st.qres.n, wide: view.st.wide, engine: view.st.qres.engine }));
  ok('B 보관함 검색식 재실행(워커): 구약 전체 복원·369건·지문 동일', sv2.wide && sv2.n === 369 && sv2.fp === sv && sv2.engine === 'worker', JSON.stringify(sv2));
  // ---- A 응답성: 긴 검색(계산 중단 사례) 중 프레임 간격·탭 이동·스크롤
  const resp = async mode => pg.evaluate(async mode => { localStorage.setItem('milal-q-worker', mode === 'main' ? 'off' : 'on'); const S = view.st; S.wide = true; S.mode = 'query'; S.qMode = 'text'; S.qt = 'clause\n  w1:word\n  w2:word\n  w3:word lex=NOPE_NOPE\nw1 < w2\nw2 < w3\n'; S.qres = null; render();
    let gaps = [], last = performance.now(), raf = true; const tick = () => { const t = performance.now(); gaps.push(t - last); last = t; if (raf) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    const t0 = performance.now(); qExec(); render(); const loadingShown = !!(S.qres && S.qres.loading);
    // 검색 도중 20ms 뒤 스크롤과 '본문' 탭 이동을 시도하고, 처리되기까지 걸린 시간을 잰다
    await new Promise(r => setTimeout(r, 20)); const tc = performance.now(); scrollTo({ top: 400 }); const nav = document.querySelector('.bnav [data-nav="text"]'); nav.click(); const tabMs = Math.round(performance.now() - tc); const tabNow = (document.querySelector('.bnav [aria-selected="true"]') || {}).dataset && document.querySelector('.bnav [aria-selected="true"]').dataset.nav;
    while (!(S.qres && (S.qres.hits || (S.qres.err && !S.qres.loading)))) await new Promise(r => setTimeout(r, 20)); raf = false; const total = Math.round(performance.now() - t0);
    return { mode, loadingShown, tabMs, tabNow, maxGap: Math.round(Math.max(...gaps)), frames: gaps.length, total, status: S.qres.status, n: S.qres.n }; }, mode);
  const rm = await resp('main'); const rw = await resp('worker');
  ok(`A 응답성: 주 스레드 실행은 ${rm.total}ms 동안 화면이 멈춤(최대 프레임 간격 ${rm.maxGap}ms) · 워커 실행은 최대 프레임 간격 ${rw.maxGap}ms, 검색 중 탭 이동 ${rw.tabMs}ms 에 처리, '찾는 중' 표시`, rw.loadingShown && rw.maxGap < rm.maxGap / 3 && rw.maxGap < 250 && rw.tabMs < 100 && rw.tabNow === 'text', JSON.stringify({ rm, rw }));
  // ---- A 취소: 긴 검색을 취소하면 결과가 오지 않고 이전 결과가 남음
  const cancel = await pg.evaluate(async () => { localStorage.setItem('milal-q-worker', 'on'); const S = view.st; S.mode = 'query'; S.qt = Q_RECIPES['예시1']; S.qres = null; qExec(); while (!(S.qres && S.qres.hits)) await new Promise(r => setTimeout(r, 20)); const n0 = S.qres.n;
    S.qt = 'clause\n  w1:word\n  w2:word\n  w3:word lex=NOPE_NOPE\nw1 < w2\nw2 < w3\n'; qExec(); render(); const hadCancel = !!document.querySelector('#qCancel'); await new Promise(r => setTimeout(r, 30)); document.querySelector('#qCancel').click(); const afterClick = { loading: !!(S.qres && S.qres.loading), n: S.qres && S.qres.n, worker: !!S.qw };
    await new Promise(r => setTimeout(r, 4000)); return { n0, hadCancel, afterClick, later: { loading: !!(S.qres && S.qres.loading), n: S.qres && S.qres.n, text: S.qres && S.qres.text } }; });
  ok('A 취소: "취소"를 누르면 워커를 끝내고 이전 결과(227건)로 돌아가며, 4초 뒤에도 긴 검색 결과가 덮어쓰지 않음', cancel.hadCancel && !cancel.afterClick.loading && cancel.afterClick.n === 227 && !cancel.afterClick.worker && !cancel.later.loading && cancel.later.n === 227 && /JHWH/.test(cancel.later.text), JSON.stringify(cancel));
  // ---- A 늦은 결과 방지: 긴 검색 중 조건을 바꿔 짧은 검색을 실행 → 짧은 검색 결과가 남고, 뒤늦게 온 긴 결과는 버려짐
  const stale = await pg.evaluate(async () => { const S = view.st; S.qt = 'clause\n  w1:word\n  w2:word\n  w3:word lex=NOPE_NOPE\nw1 < w2\nw2 < w3\n'; S.qres = null; qExec(); render(); await new Promise(r => setTimeout(r, 30)); const seqLong = S.qSeq;
    S.qt = Q_RECIPES['예시1']; qExec(); render(); const seqShort = S.qSeq; while (!(S.qres && S.qres.hits)) await new Promise(r => setTimeout(r, 20)); const first = { n: S.qres.n, text: S.qres.text }; await new Promise(r => setTimeout(r, 4000)); return { seqLong, seqShort, first, later: { n: S.qres.n, text: S.qres.text, loading: !!S.qres.loading } }; });
  ok('A 늦은 결과 방지: 긴 검색 중 조건을 바꿔 다시 찾으면 새 결과(227건)가 남고 옛 검색 결과는 도착해도 버려짐', stale.seqShort === stale.seqLong + 1 && stale.first.n === 227 && stale.later.n === 227 && /JHWH/.test(stale.later.text) && !stale.later.loading, JSON.stringify(stale));
  // ---- A 대체 동작: Worker 가 없거나 깨졌을 때 주 스레드에서 같은 엔진으로
  const fb = await pg.evaluate(async () => { const S = view.st; const W = window.Worker; window.Worker = undefined; S.qw = null; S.qt = Q_RECIPES['예시1']; S.qres = null; qExec(); const sync = { engine: S.qres && S.qres.engine, n: S.qres && S.qres.n }; window.Worker = W;
    window.__qWorkerBroken = true; S.qres = null; qExec(); const broken = { engine: S.qres && S.qres.engine, n: S.qres && S.qres.n }; window.__qWorkerBroken = false; return { sync, broken }; });
  ok('A 대체 동작: Worker 미지원 또는 오류 뒤에는 주 스레드 엔진으로 바로 같은 결과(227건)', fb.sync.engine === 'main' && fb.sync.n === 227 && fb.broken.engine === 'main' && fb.broken.n === 227, JSON.stringify(fb));
  // 워커 자체 오류(잘못된 메시지) → 명확한 오류 표시
  const werr = await pg.evaluate(async () => { const S = view.st; S.qres = null; qExec(); const w = S.qw; while (!(S.qres && S.qres.hits)) await new Promise(r => setTimeout(r, 20)); const seq = S.qSeq + 1; S.qSeq = seq; S.qres = { loading: true, seq, err: 'x', P: qParse(S.qt), text: S.qt, canon: '', range: '', rg: null }; qWorkerMsg({ type: 'error', seq, message: '시험용 오류' }); return (S.qres && S.qres.err) || ''; });
  ok('A 계산 오류는 "검색 중 문제가 생겼습니다(워커): …"로 표시', /워커/.test(werr) && /시험용 오류/.test(werr), werr);
  // ---- 메모리: 주 스레드 힙(워커 사용 전/후), 워커로 보내는 자료 크기
  const mem = await pg.evaluate(() => { const b = a => a.byteLength; const typed = b(SD.vOf) + b(SD.wl) + b(SD.wm) + b(SD.wf) + b(SD.wc) + b(SD.wp) + b(SD.ws) + b(SD.ct) + b(SD.cd) + b(SD.pt); const json = JSON.stringify({ L: SD.L, M: SD.M, V: SD.V }).length; return { typedMB: +(typed / 1048576).toFixed(1), jsonMB: +(json / 1048576).toFixed(1), sendMs: view.st.qw && view.st.qw.sendMs }; });
  const h1 = await heap(); ok(`메모리: 워커에 보내는 자료 ≈ 형식 배열 ${mem.typedMB}MB + 사전·형태·절 표 ${mem.jsonMB}MB(복사 ${mem.sendMs}ms, 워커 쪽에 한 벌 더 있음) · 주 스레드 힙 ${h1}MB`, true);
  console.log(R.join('\n')); console.log('errors:', errs); const bad = R.filter(r => r.startsWith('FAIL')).length; console.log(bad ? `실패 ${bad}` : '모두 통과'); await br.close(); process.exit(bad ? 1 : 0); })().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(2); });
