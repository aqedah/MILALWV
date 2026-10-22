// 본문 연구 노트 + 도구 문구 정리 + 장르별 질문 + 옆 노트 검증 (2026-10-22). 쓰기: node study_nb.js <스크린샷 폴더>
const { chromium, devices } = require('playwright'); const OUT = (process.argv[2] || '.') + '/'; const R = []; const ok = (n, c, info = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : ''));
(async () => { const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); await c.addInitScript(() => { try { localStorage.setItem('milal-tut-seen', '1'); localStorage.setItem('milal-nb-on', '1'); localStorage.setItem('milal-rtab', 'flow'); } catch (e) {} });
  const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); const W = ms => pg.waitForTimeout(ms);
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && SD.L && typeof anList === 'function', null, { timeout: 60000 }); await W(800);
  await pg.evaluate(async () => { await loadBook(32); setRange({ b: 32, c1: 1, c2: 1 }); view.st.wide = false; render(); }); await pg.click('.bnav [data-nav="research"]'); await W(400);
  // 1. 문구
  const st = await pg.evaluate(() => ({ flow: [...document.querySelectorAll('.rtile[data-rstart^="tool:"] small')].map(x => x.textContent).slice(1), nb: (document.querySelector('.nbstart') || {}).textContent, guide: (document.querySelector('.nbguide .label') || {}).textContent, gq: document.querySelectorAll('.nbguide .nbq').length }));
  ok('흐름 도구 이름: 장면이 바뀌는 단서 · 서술 흐름이 바뀌는 단서 · 주어로 나온 이름', st.flow.join('|') === '서술과 인물의 말|장면이 바뀌는 단서|서술 흐름이 바뀌는 단서|주어로 나온 이름', st.flow.join('|'));
  ok('연구 첫 화면: 본문 연구 노트 입구 + "무엇을 관찰해 볼까요? · 요나 1장 = 이야기" 질문 3개', /본문 연구 노트/.test(st.nb) && /이야기/.test(st.guide) && st.gq === 3, JSON.stringify(st));
  const tool = async t => pg.evaluate(async t => { const S = view.st; S.mode = 'tool'; S.tool = t; S.sub = ''; S.rmode = 'tool'; render(); await new Promise(r => setTimeout(r, 200)); return (document.querySelector('#sToolRes') || {}).textContent || ''; }, t);
  await pg.evaluate(async () => { await loadBook(1); setRange({ b: 1, c1: 18, c2: 22 }); });
  const t1 = await tool('화자'); ok('화자: "서술 속의 \'보라\'" + 찾은 규칙/판단은 본문에서 + 모으지 않은 \'보라\'(인물의 말) 목록', /서술 속의 '보라/.test(t1) && /찾은 규칙/.test(t1) && /판단은 본문에서/.test(t1) && /모으지 않은 곳 \d+곳/.test(t1) && !/인물의 눈으로 보는 곳/.test(t1), t1.slice(0, 160));
  const t2 = await tool('전환'); ok('전환: 찾은 규칙/판단 + 서술이 아니라 모으지 않은 절 목록', /찾은 규칙/.test(t2) && /판단은 본문에서/.test(t2) && /서술이 아니라 모으지 않은 절 \d+곳/.test(t2), t2.slice(0, 120));
  const t3 = await tool('인물'); ok('인물: "주어로 나온 이름" + 대명사 주어는 세지 않음 명시', /주어로 나온 이름/.test(t3) && /대명사 주어\(이 범위 \d+번\)/.test(t3), t3.slice(0, 160));
  const t4 = await tool('장면'); ok('장면: 찾은 규칙 + 판단은 본문에서', /찾은 규칙/.test(t4) && /판단은 본문에서/.test(t4));
  const cm = await pg.evaluate(async () => { await loadBook(23); await loadBook(33); view.st.mode = 'compare'; render(); cmpGo('사 2:2-4', '미 4:1-3'); render(); await new Promise(r => setTimeout(r, 800)); return document.querySelector('.cmpsum').textContent; });
  ok('비교 요약: 사실("같은 표현이 많이 겹칩니다")과 판단("증거인지는 판단이 필요합니다")을 나눔', /같은 표현이 많이 겹칩니다/.test(cm) && /판단이 필요합니다/.test(cm) && !/뚜렷한 언어 신호/.test(cm), cm.slice(0, 200));
  // 2. 연구 만들기
  await pg.evaluate(() => { setRange({ b: 32, c1: 1, c2: 1 }); view.st.mode = 'start'; render(); }); await W(200);
  await pg.click('.nbstart [data-nbopen]'); await W(300);
  await pg.fill('#nbT', '요나의 두 부르심'); await pg.fill('#nbR', '욘 1:1-3, 3:1-3'); await pg.fill('#nbQ', '첫째·둘째 부르심은 어떻게 같고 요나의 반응은 어떻게 다른가?'); await pg.click('#nbMake'); await W(500);
  const s1 = await pg.evaluate(() => ({ act: nbActive(), title: (document.querySelector('#nbTitle') || {}).value, chips: [...document.querySelectorAll('[data-nbr]')].map(x => x.textContent), guide: (document.querySelector('.nbguide .label') || {}).textContent, fields: [...document.querySelectorAll('[data-nbf]')].map(x => x.dataset.nbf) }));
  ok('연구 시작: 켜짐, 제목·범위(욘 1:1-3, 3:1-3)·질문, 질문 안내(이야기), 칸 = 질문·중간 결론·남은 질문·적용', s1.act && s1.act.ranges.length === 1 && s1.act.ranges[0].parts && s1.title === '요나의 두 부르심' && /이야기/.test(s1.guide) && s1.fields.join() === 'q,concl,open,apply', JSON.stringify(s1).slice(0, 300));
  await pg.screenshot({ path: OUT + 'nb_page_empty.png', fullPage: true });
  // 3. 메모가 모임
  const vi11 = await pg.evaluate(() => SD.ref.get('32-1-1')[0]);
  await pg.evaluate(vi => openAnnotEditor('verse', vi), vi11); await W(200);
  const tg = await pg.evaluate(() => ({ v: document.querySelector('#anTags').value, hint: document.getElementById('sheetRoot').textContent }));
  ok('연구가 켜져 있으면 새 메모 표시에 "연구: 요나의 두 부르심"이 미리 들어가고 안내가 보임', /연구: 요나의 두 부르심/.test(tg.v) && /연구 중인 노트에 담깁니다/.test(tg.hint), tg.v);
  await pg.fill('#anObs', '1:1 과 3:1 이 같은 말씀 도입 공식으로 시작한다'); await pg.fill('#anInt', '두 번째 부르심은 첫 부르심을 되풀이해 새 출발을 보여 준다'); await pg.click('#anSave'); await W(500);
  const wi = await pg.evaluate(() => SD.ref.get('32-3-1') && SD.V[SD.ref.get('32-3-1')[0]][5] + 1); await pg.evaluate(async () => { await loadBook(32); }); await pg.evaluate(w => openNoteSheet(w), wi); await W(200); await pg.fill('#rnMemo', '둘째 부르심의 동사'); await pg.click('#rnSave'); await W(300);
  await pg.evaluate(() => nbOpen(nbActiveId())); await W(400);
  const s2 = await pg.evaluate(() => ({ obs: document.querySelectorAll('.nbpage .nbit').length, txt: document.querySelector('.nbpage').textContent }));
  ok('연구 화면: 절 메모가 관찰·해석에, 낱말 메모가 관찰에 모임', /같은 말씀 도입 공식/.test(s2.txt) && /새 출발을 보여 준다/.test(s2.txt) && /둘째 부르심의 동사/.test(s2.txt) && s2.obs >= 3, s2.obs);
  // 범위 안 다른 메모 담기
  await pg.evaluate(async () => { const id = nbActiveId(); nbSetActive(''); const vi = SD.ref.get('32-1-3')[0]; const A = anchorVerse(vi); await anSave({ kind: 'verse', key: anKey('verse', A), anchor: A, observation: '다시스로 도망', interpretation: '', tags: [] }); nbSetActive(id); render(); }); await W(300);
  const o1 = await pg.evaluate(() => document.querySelectorAll('[data-nbadd]').length); await pg.evaluate(() => document.querySelector('.nbpage details').open = true); await pg.click('[data-nbadd]'); await W(500);
  const o2 = await pg.evaluate(() => ({ left: document.querySelectorAll('[data-nbadd]').length, txt: document.querySelector('.nbpage').textContent }));
  ok('범위 안의 다른 메모(연구 전에 쓴 것)를 "담기"로 노트에 넣음', o1 === 1 && o2.left === 0 && /다시스로 도망/.test(o2.txt), JSON.stringify({ o1, left: o2.left }));
  // 칸 저장
  await pg.fill('[data-nbf="concl"]', '하나님은 같은 말씀으로 다시 부르신다'); await pg.fill('[data-nbf="apply"]', '실패한 자리에서 다시 부르시는 말씀 앞에 서기'); await W(700);
  const sv = await pg.evaluate(() => nbActive()); ok('중간 결론·적용이 쓰는 대로 저장됨', sv.concl === '하나님은 같은 말씀으로 다시 부르신다' && /다시 부르시는/.test(sv.apply));
  const md = await pg.evaluate(() => nbMarkdown(nbActive())); const md2 = await pg.evaluate(() => { const s = nbActive(); s.sermon = true; return nbMarkdown(s); });
  ok('Markdown: 관찰/해석/중간 결론/남은 질문/적용 + 근거와 판단 구분 문장; 설교 준비용은 "1. 본문 근거 … 5. 오늘의 적용"', /## 관찰한 것/.test(md) && /## 내 해석/.test(md) && /## 적용/.test(md) && /해석·결론·적용은 작성자의 판단/.test(md) && /## 1\. 본문 근거/.test(md2) && /## 5\. 오늘의 적용/.test(md2), md.slice(0, 120));
  await pg.screenshot({ path: OUT + 'nb_page.png', fullPage: true });
  // 띠 + 휴대전화 시트
  await pg.click('.bnav [data-nav="text"]'); await W(400); const bar = await pg.evaluate(() => (document.querySelector('.nbbar') || {}).textContent || '');
  ok('본문 탭 위에 "지금 연구 중 요나의 두 부르심 근거 N" 띠', /지금 연구 중/.test(bar) && /요나의 두 부르심/.test(bar) && /근거 3/.test(bar), bar);
  await pg.click('#nbBarOpen'); await W(300); const sh = await pg.evaluate(() => ({ t: document.getElementById('sheetRoot').textContent, f: document.querySelectorAll('#sheetRoot [data-nbf]').length }));
  ok('휴대전화: "노트" → 본문 위에 노트 창(근거·중간 결론·남은 질문·적용 바로 쓰기)', /근거 3/.test(sh.t) && sh.f === 3, JSON.stringify(sh).slice(0, 120)); await pg.screenshot({ path: OUT + 'nb_sheet_mobile.png' });
  await pg.evaluate(() => document.getElementById('sheetRoot').innerHTML = '');
  const qb = await pg.evaluate(async () => { view.st.mode = 'query'; view.st.qres = null; render(); view.st.qc = { tgt: 'word', cl: {}, ws: [{ c: { lex: 'QR>[' }, fn: '', op: '' }] }; qcSync(); qExecSync(); render(); return [...document.querySelectorAll('[data-qmemo]')].map(b => b.textContent)[0]; });
  ok('연구가 켜져 있으면 검색 결과의 "메모" 단추가 "노트에 담기"', qb === '노트에 담기', qb);
  // 제목 바꾸기 → 표시도 바뀜
  await pg.evaluate(() => nbOpen(nbActiveId())); await W(300); await pg.fill('#nbTitle', '요나: 두 번의 부르심'); await pg.dispatchEvent('#nbTitle', 'change'); await W(800);
  const rn = await pg.evaluate(() => ({ old: anList().filter(a => (a.tags || []).includes('연구: 요나의 두 부르심')).length, nw: anList().filter(a => (a.tags || []).includes('연구: 요나: 두 번의 부르심')).length }));
  ok('제목을 바꾸면 메모의 연구 표시도 함께 바뀜(기록 형식 그대로)', rn.old === 0 && rn.nw === 2, JSON.stringify(rn));
  // 질문 단추 → 도구
  const gq = await pg.evaluate(async () => { document.querySelector('.nbpage [data-nbq]').click(); await new Promise(r => setTimeout(r, 300)); return { mode: view.st.mode, tool: view.st.tool, R: view.st.R }; });
  ok('노트의 질문 단추 → 그 본문 범위(욘 1–3장)로 도구가 열림', gq.mode === 'tool' && gq.tool === '반복' && gq.R.b === 32 && gq.R.c1 === 1 && gq.R.c2 === 3, JSON.stringify(gq));
  const pq = await pg.evaluate(async () => { await ensureAll(); const out = {}; for (const g of ['시', '지혜', '예언', '율법']) NB_Q[g].forEach(([q, a], i) => { if (a.qc) { const t = qGen(qcBlock(a.qc)); const P = qParse(t); out[g + i] = P.err ? 'ERR ' + P.err : qRun(P, null, 20000).out.length; } }); return out; });
  ok('장르별 질문의 조건 카드가 모두 실제로 찾아짐(구약 전체 0건 없음)', Object.values(pq).every(v => typeof v === 'number' && v > 0), JSON.stringify(pq));
  const gen = await pg.evaluate(() => [[1, 1], [1, 49], [2, 20], [3, 1], [18, 1], [18, 10], [19, 23], [20, 1], [23, 1], [23, 37], [32, 2], [32, 3], [27, 7]].map(([b, c]) => nbGenre(b, c)).join(','));
  ok('장 단위 갈래 표(창1 이야기·창49 시·출20 율법·레 율법·욥1 이야기·욥10 지혜·시23 시·잠 지혜·사1 예언·사37 이야기·욘2 시·욘3 이야기·단7 예언)', gen === '이야기,시,율법,율법,이야기,지혜,시,지혜,예언,이야기,시,이야기,예언', gen);
  // 백업
  const bk = await pg.evaluate(async () => { const B = await backupObject(); const n0 = nbLoad().length; const copy = JSON.parse(JSON.stringify(B.studies)); copy[0].updated += 1000; copy[0].concl = '복원본'; const m = nbMerge(copy); return { has: B.studies.length, cnt: B.counts.studies, n0, m, concl: nbActive().concl }; });
  ok('백업 파일에 연구 노트가 들어가고, 복원 때 더 새 판으로 합쳐짐', bk.has === 1 && bk.cnt === 1 && bk.m === 1 && bk.concl === '복원본', JSON.stringify(bk));
  // 넓은 화면: 옆 노트
  const c2 = await br.newContext({ viewport: { width: 1360, height: 900 } }); await c2.addInitScript(() => { try { localStorage.setItem('milal-tut-seen', '1'); localStorage.setItem('milal-nb-on', '1'); } catch (e) {} }); const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push('wide: ' + e.message));
  const store = await pg.evaluate(() => ({ s: localStorage.getItem('milal-studies'), a: localStorage.getItem('milal-study-active') }));
  await p2.goto('http://localhost:8765/index.html'); await p2.evaluate(st => { localStorage.setItem('milal-studies', st.s); localStorage.setItem('milal-study-active', st.a); }, store); await p2.reload(); await p2.waitForFunction(() => typeof SD !== 'undefined' && SD && SD.L, null, { timeout: 60000 }); await p2.waitForTimeout(800);
  await p2.evaluate(async () => { await loadBook(32); setRange({ b: 32, c1: 1, c2: 1 }); view.st.mode = 'verse'; view.st.rd = 'read'; render(); }); await p2.click('.bnav [data-nav="text"]'); await p2.waitForTimeout(500);
  const ws = await p2.evaluate(() => { const a = document.getElementById('nbAside'), w = document.querySelector('.wrap').getBoundingClientRect(); return { aside: !!a && getComputedStyle(a).display !== 'none', ar: a && a.getBoundingClientRect().left, wr: w.right, body: document.body.classList.contains('nbside') }; });
  ok('넓은 화면(PC): 본문 오른쪽에 노트가 나란히(겹치지 않음)', ws.aside && ws.body && ws.ar >= ws.wr, JSON.stringify(ws)); await p2.screenshot({ path: OUT + 'nb_side_pc.png' });
  await p2.click('#nbSideX'); await p2.waitForTimeout(300); ok('옆 노트 닫기 → 본문만', await p2.evaluate(() => !document.getElementById('nbAside') && !document.body.classList.contains('nbside')));
  await p2.click('.bnav [data-nav="research"]'); await p2.waitForTimeout(300); ok('연구 탭으로 가면 옆 노트는 접힘(띠만)', await p2.evaluate(() => !document.getElementById('nbAside') && !!document.querySelector('.nbbar')));
  // 지우기
  pg.on('dialog', d => d.accept()); await pg.evaluate(() => nbOpen(nbActiveId())); await W(300); await pg.click('#nbDel'); await W(800);
  const del = await pg.evaluate(() => ({ n: nbLoad().length, act: nbActiveId(), tagged: anList().filter(a => (a.tags || []).some(t => /^연구: /.test(t))).length, memos: anList().filter(a => a.kind === 'verse').length }));
  ok('연구 지우기: 노트만 지우고 메모는 남기며 연구 표시만 뗌', del.n === 0 && !del.act && del.tagged === 0 && del.memos === 2, JSON.stringify(del));
  ok('페이지 오류 없음', errs.length === 0, errs.join(' | '));
  console.log(R.join('\n')); console.log(`\n${R.filter(x => x.startsWith('PASS')).length}/${R.length} PASS`); await br.close(); })();
