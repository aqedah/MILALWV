// 쉬운 검색(조건 카드) 검증 — 2026-10-21 목사님 승인(GPT 검색 화면 제안 평가 후). 카드는 검색식 상자의 앞면이므로
// (1) 카드가 만든 식과 같은 TF 식을 엔진에 직접 넣은 건수가 같고 (2) 예시 식은 카드↔식 왕복에서 뜻(qCanon)이 그대로이며
// (3) '같은 절의 다른 낱말'은 # 관계로 같은 낱말 중복을 막는지 본다. 쓰기: node query_cards.js <출력폴더>
const { chromium, devices } = require('playwright'); const OUT = (process.argv[2] || '.') + '/'; const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); const W = ms => pg.waitForTimeout(ms); await c.addInitScript(() => { try { localStorage.setItem('milal-tut-seen', '1'); } catch (e) {} });
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && SD.L, null, { timeout: 60000 }); await W(800);
  await pg.evaluate(async () => { await loadBook(32); setRange({ b: 32, c1: 1, c2: 1 }); view.st.wide = false; render(); }); await pg.click('.bnav [data-nav="research"]'); await W(400);
  const s0 = await pg.evaluate(() => ({ lead: document.querySelector('.qtitle + .lead, h2.qtitle ~ p.lead') && document.querySelector('.sec .lead').textContent }));
  ok('연구 첫 화면 안내: "살펴볼 곳은 현재 요나 1장입니다"', /살펴볼 곳은 현재 요나 1장입니다/.test(s0.lead || ''), s0.lead);
  await pg.evaluate(() => { view.st.rtab = 'find'; render(); }); await pg.click('[data-rstart="query"]'); await W(500);
  const c0 = await pg.evaluate(() => ({ mode: view.st.mode, tgt: document.querySelectorAll('[data-qctgt]').length, card: document.querySelectorAll('.qcard').length, say: (document.querySelector('.qsay') || {}).textContent, adv: (document.querySelector('.qadv') || {}).textContent, opt0: (document.querySelector('[data-qcs] option') || {}).textContent, anywhere: /안 어디든|아무거나/.test(document.querySelector('#sMain, main, body').textContent) }));
  ok('검색 첫 화면 = 조건 카드: "무엇을 찾으시나요? 낱말/절", 카드 1, 읽어 보면, 고급 검색 상자, 기본값 "조건 없음"("아무거나·안 어디든" 없음)', c0.mode === 'query' && c0.tgt === 2 && c0.card === 1 && /읽어 보면/.test(c0.say) && /고급 검색/.test(c0.adv) && /Text-Fabric/.test(c0.adv) && c0.opt0 === '조건 없음' && !c0.anywhere, JSON.stringify(c0));
  await pg.screenshot({ path: OUT + 'qc_start.png', fullPage: true });
  // (1) 낱말: 사전형 '보라' → 식은 word lex=HNH
  const w1 = await pg.evaluate(() => { const S = view.st; S.qc = { tgt: 'word', cl: {}, ws: [{ c: { lex: 'HNH' }, fn: '', op: '' }] }; qcSync(); render(); return { t: qGen(S.qb).trim(), say: document.querySelector('.qsay').textContent }; });
  ok('낱말 카드(사전형 보라) → 식 "word lex=HNH", 읽어 보면 "요나 1장에서 사전형 \'보라\'인 낱말을 찾습니다"', w1.t === 'word lex=HNH' && /요나 1장에서 사전형 '보라.*낱말을 찾습니다/.test(w1.say), JSON.stringify(w1));
  // 구약 전체에서 엔진 직접 실행과 같은 건수
  const cmp = async (qc, label) => pg.evaluate(async qc => { const S = view.st; S.wide = true; await ensureAll(); S.qc = qc; qcSync(); const t = qGen(S.qb); qExecSync(); const a = S.qres.n; const r = qRun(qParse(t), null, 20000); return { t, a, b: r.out.length }; }, qc);
  const k1 = await cmp({ tgt: 'word', cl: {}, ws: [{ c: { lex: 'HNH' }, fn: '', op: '' }] }); ok('구약 전체 "보라" — 카드 실행 건수 = 같은 식 엔진 직접 실행', k1.a === k1.b && k1.a > 1000, JSON.stringify(k1));
  const k2 = await cmp({ tgt: 'word', cl: { domain: 'Q' }, ws: [{ c: { sp: 'verb', vt: 'impv' }, fn: '', op: '' }] }); ok('인물의 말 속 명령형 동사(절 조건 포함) — 카드 = 엔진', k2.a === k2.b && k2.a > 1000 && /clause domain=Q\n  word sp=verb vt=impv/.test(k2.t), JSON.stringify(k2));
  // (3) 같은 낱말 vs 다른 낱말
  const d = await pg.evaluate(async () => { const S = view.st; S.wide = false; setRange({ b: 32, c1: 1, c2: 4 });
    S.qc = { tgt: 'clause', cl: {}, ws: [{ c: { sp: 'subs' }, fn: '', op: '' }, { c: { sp: 'subs' }, fn: '', op: '' }] }; qcSync(); const tDiff = qGen(S.qb); qExecSync(); const nDiff = S.qres.n, vDiff = S.qres.hits.size;
    const loose = 'clause\n  word sp=subs\n  word sp=subs\n'; const rl = qRun(qParse(loose), stSpans(), 20000); const sameOnly = rl.out.filter(t => t[1][1] === t[2][1]).length;
    const one = qRun(qParse('clause\n  word sp=subs\n'), stSpans(), 20000).out.length;
    render(); return { tDiff, nDiff, vDiff, loose: rl.out.length, sameOnly, one, note: document.querySelector('.qsay').textContent }; });
  ok('절 카드 2개(명사, 명사) → 식에 "w1 # w2"가 붙어 같은 낱말 중복 묶음이 빠짐', /w1:word sp=subs/.test(d.tDiff) && /w1 # w2/.test(d.tDiff) && d.nDiff === d.loose - d.sameOnly && d.sameOnly === d.one && d.nDiff > 0 && d.vDiff < (d.one ? 9999 : 0), JSON.stringify(d));
  ok('읽어 보면: "①·②는 서로 다른 낱말입니다"', /서로 다른 낱말입니다/.test(d.note), d.note);
  const o = await pg.evaluate(() => { const S = view.st; S.qc = { tgt: 'clause', cl: {}, ws: [{ c: { lex: 'HNH' }, fn: '', op: '' }, { c: { sp: 'verb', vt: 'ptca' }, fn: '', op: '<' }] }; qcSync(); return qGen(S.qb); });
  ok('순서 조건(앞 낱말보다 뒤에)이면 이미 다른 낱말이라 # 없이 "보라" 예시와 같은 식', !/#/.test(o) && /< word sp=verb vt=ptca/.test(o), o);
  // (2) 예시 왕복
  const rt = await pg.evaluate(() => Object.fromEntries(['예시1', '예시2', '서술명사문', '인물', '장면', '전환b'].map(k => { const Q = qcFromText(Q_RECIPES[k]); return [k, Q ? qCanon(qParse(qGen(qcBlock(Q)))) === qCanon(qParse(Q_RECIPES[k])) : 'adv']; })));
  ok('예시 식 → 카드 → 식 왕복에서 뜻이 같음(예시1·예시2·서술명사문·인물), 카드로 못 담는 식(장면: 맨 앞에)은 고급 검색으로', rt['예시1'] === true && rt['예시2'] === true && rt['서술명사문'] === true && rt['인물'] === true && rt['장면'] === 'adv', JSON.stringify(rt));
  // 예시 단추 → 결과 + 낱말 모아 보기
  await pg.evaluate(() => { const S = view.st; S.wide = true; S.qres = null; render(); }); await pg.evaluate(() => document.querySelector('.qqd').open = true); await pg.click('[data-qcq="예시2"]'); await pg.waitForFunction(() => view.st.qres && view.st.qres.hits, null, { timeout: 60000 }); await W(500);
  const e2 = await pg.evaluate(() => ({ ui: view.st.qui || 'card', cards: document.querySelectorAll('.qcard').length, n: view.st.qres.n, nw: (view.st.qres.nw || []).length, eng: view.st.qres.engine, view: document.querySelectorAll('[data-qview]').length }));
  ok('예시 "보라 뒤 분사"는 카드 2개로 열리고 결과(워커) + "절 목록 / 맞은 낱말 모아 보기"', e2.ui === 'card' && e2.cards === 2 && e2.n > 0 && e2.nw === 2 && e2.view === 2, JSON.stringify(e2));
  await pg.click('[data-qview="tally"]'); await W(400); const ty = await pg.evaluate(() => ({ rows: document.querySelectorAll('.qtrow').length, first: (document.querySelector('.qtrow') || {}).textContent, labels: [...document.querySelectorAll('.qtally .label')].map(x => x.textContent) }));
  ok('맞은 낱말 모아 보기: 낱말 ①(보라)·② 분사별로 사전형과 형태별 개수', ty.rows > 3 && ty.labels.length === 2 && /보라|힌네/.test(ty.labels[0] + ty.first), JSON.stringify(ty).slice(0, 300));
  await pg.screenshot({ path: OUT + 'qc_tally.png', fullPage: true }); await pg.click('[data-qview="list"]'); await W(200);
  // 고급 검색 오가기
  await pg.click('#qcToAdv'); await W(400); const a1 = await pg.evaluate(() => ({ ui: view.st.qui, badge: (document.querySelector('.qadvhd .qadvb') || {}).textContent, ta: (document.querySelector('#qText') || {}).value }));
  ok('"고급 검색식으로 열기" → "고급 검색" 표지와 TF 식(카드 조건 그대로)', a1.ui === 'adv' && a1.badge === '고급 검색' && /word lex=HNH/.test(a1.ta || ''), JSON.stringify(a1));
  await pg.screenshot({ path: OUT + 'qc_adv.png', fullPage: false });
  await pg.click('#qcBack'); await W(300); ok('"← 쉬운 검색으로" 카드로 돌아옴', await pg.evaluate(() => view.st.qui === 'card' && document.querySelectorAll('.qcard').length === 2));
  await pg.evaluate(() => { const S = view.st; S.qui = 'adv'; S.qMode = 'text'; S.qt = Q_RECIPES['장면']; render(); }); await pg.click('#qcBack'); await W(300);
  const a2 = await pg.evaluate(() => ({ ui: view.st.qui, sheet: (document.querySelector('#sheetRoot') || {}).textContent })); ok('카드로 못 담는 식은 옮기지 않고 이유를 알림(식은 그대로)', a2.ui === 'adv' && /카드로 옮기지 못합니다/.test(a2.sheet), JSON.stringify(a2).slice(0, 200));
  await pg.evaluate(() => { document.getElementById('sheetRoot').innerHTML = ''; view.st.qui = 'card'; view.st.qc = qcNew('word'); qcSync(); view.st.qres = null; render(); });
  // 욥기 발화 구간
  await pg.click('[data-rjob="32-37"]'); await pg.waitForFunction(() => view.st.R && view.st.R.b === 18, null, { timeout: 30000 }); await W(300);
  const j = await pg.evaluate(() => ({ R: view.st.R, wide: view.st.wide, lead: document.querySelector('.qtitle + .lead').textContent }));
  ok('예시 "엘리후 · 욥 32–37장" → 찾는 곳이 욥기 32–37장', j.R.c1 === 32 && j.R.c2 === 37 && !j.wide && /욥기 32–37장/.test(j.lead), JSON.stringify(j));
  // 본문에서 검색 시작 → 돌아오기
  await pg.evaluate(async () => { await loadBook(32); setRange({ b: 32, c1: 1, c2: 1 }); view.st.mode = 'verse'; view.st.rd = 'read'; render(); }); await pg.click('.bnav [data-nav="text"]'); await W(400);
  await pg.evaluate(() => { const S = view.st; const vi = SD.book[32].a + 1; S.rv = vi; S.rw = SD.V[vi][5]; render(); }); await W(200);
  await pg.click('.vinfo[data-vinfo]'); await W(300); const hasQ = await pg.evaluate(() => !!document.querySelector('[data-sfindq]'));
  if (!hasQ) { await pg.evaluate(() => { document.querySelector('.rsw') && document.querySelector('.rsw').click(); }); await W(300); }
  await pg.click('[data-sfindq]'); await W(500);
  const t = await pg.evaluate(() => ({ mode: view.st.mode, qc: view.st.qc, back: !!document.querySelector('#qcBackText'), say: document.querySelector('.qsay').textContent }));
  ok('원어 분석 "이 낱말 모양으로 찾기" → 사전형(동사면 줄기·형태)이 채워진 낱말 카드 + "← 본문으로"', t.mode === 'query' && t.qc.tgt === 'word' && !!t.qc.ws[0].c.lex && t.back, JSON.stringify(t).slice(0, 300));
  await pg.click('#qcBackText'); await W(500); ok('"← 본문으로" → 본문 탭의 같은 장', await pg.evaluate(() => view.st.mode === 'verse' && view.st.R.b === 32));
  // 장면 도구: 세지 않은 봐예히와 이유
  await pg.evaluate(() => { const S = view.st; S.mode = 'tool'; S.tool = '장면'; S.rmode = 'tool'; render(); }); await pg.click('.bnav [data-nav="research"]'); await W(500);
  const sc = await pg.evaluate(() => ({ txt: document.querySelector('#sToolRes').textContent, ex: document.querySelectorAll('.sexl li').length }));
  ok('장면 도구(요나 1장): 0곳이어도 "봐예히가 있지만 세지 않은 곳 3곳 — 주어가 붙어…"와 규칙 설명, 검색식 단추는 "비슷하게"', sc.ex === 3 && /세지 않은 곳 3곳/.test(sc.txt) && /주어·보어가 붙어/.test(sc.txt) && /비슷하게 찾아보기/.test(sc.txt), JSON.stringify(sc).slice(0, 200));
  await pg.screenshot({ path: OUT + 'scene_jonah1.png', fullPage: true });
  ok('페이지 오류 없음', errs.length === 0, errs.join(' | '));
  console.log(R.join('\n')); console.log(`\n${R.filter(x => x.startsWith('PASS')).length}/${R.length} PASS`); await br.close(); })();
