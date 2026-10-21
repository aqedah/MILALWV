// 작업 B: 기록 저장 안정성 시나리오 (Playwright, 에뮬레이션). 실행: node stability.js
const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const URL0 = 'http://localhost:8765/index.html?ux=0'; const R = []; const ok = (n, c, info = '') => { R.push((c ? 'PASS ' : 'FAIL ') + n + (info ? ' — ' + info : '')); if (!c) console.log('FAIL', n, info); };
const boot = async (pg) => { await pg.goto(URL0, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(800); const x = await pg.$('#sheetX'); if (x) await x.click(); await pg.waitForTimeout(200); };
const addNote = (pg, ref, obs) => pg.evaluate(async ([ref, obs]) => { const [b] = ref.split('-').map(Number); if (!SD.loaded.has(b)) await loadBook(b); const vi = SD.ref.get(ref)[0]; const a = await anSave({ kind: 'verse', key: 'v:' + ref, anchor: anchorVerse(vi), observation: obs, interpretation: '', tags: ['시험'] }); return a.id; }, [ref, obs]);
const addMark = (pg, ref) => pg.evaluate(async (ref) => { const vi = SD.ref.get(ref)[0]; const [b, c, v, , , s] = SD.V[vi]; const idx = [s, s + 1]; const a = await anSave({ kind: 'mark', key: 'm:' + anId(), anchor: { book: b, ch: c, vs: v, bhsa: '2021', word_ids: idx.map(slotOf), clause_atom_ids: [...new Set(idx.map(j => SD.can[SD.wa[j]]))], clause_ids: [], heb: 'x' }, style: 'hl', color: 'y', observation: '', interpretation: '', tags: [] }); return a.id; }, ref);
const snap = (pg) => pg.evaluate(async () => { const L = await anAllRaw(); const ids = L.map(a => a.id); return { n: L.length, live: L.filter(a => !a.deleted).length, uniq: new Set(ids).size === ids.length, ids }; });
const stateOf = (pg, id) => pg.evaluate(async (id) => { const L = await anAllRaw(); const a = L.find(x => x.id === id); return a ? { rev: a.rev, deleted: a.deleted, obs: a.observation } : null; }, id);

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'milal-prof-'));
  let ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 390, height: 800 } }); let pg = ctx.pages()[0] || await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await boot(pg);
  // 1. 메모 쓴 뒤 새로고침
  const id1 = await addNote(pg, '1-1-1', '첫 메모'); const idM = await addMark(pg, '1-1-2');
  await pg.reload({ waitUntil: 'domcontentloaded' }); await boot(pg);
  let s = await snap(pg); ok('1 새로고침 뒤 메모·표시 유지', s.n === 2 && s.ids.includes(id1) && s.ids.includes(idM) && s.uniq, JSON.stringify(s));
  // 2. 다른 책으로 갔다가 복귀 (욥 32 → 창 1), 기록 탭에서 보임
  await pg.evaluate(async () => { setRange({ b: 18, c1: 32, c2: 32 }); render(); await loadBook(18); setRange({ b: 1, c1: 1, c2: 1 }); render(); });
  await pg.waitForTimeout(500); const vis = await pg.evaluate(() => !!document.querySelector('.mk')); s = await snap(pg);
  ok('2 다른 책 다녀온 뒤 유지 + 본문에 표시 보임', s.n === 2 && vis, JSON.stringify({ n: s.n, vis }));
  // 3. 브라우저 종료·재시작 (같은 프로필)
  await ctx.close(); ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 390, height: 800 } }); pg = ctx.pages()[0] || await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); await boot(pg);
  s = await snap(pg); ok('3 브라우저 재시작 뒤 유지', s.n === 2 && s.uniq, JSON.stringify(s));
  // 8. 프로그램 자료판(STUDY_V) 바뀜 — index.html 의 STUDY_V 를 바꿔 끼워 넣음
  await pg.route(URL0, async route => { const r = await route.fetch(); let t = await r.text(); t = t.replace(/STUDY_V="[^"]+"/, 'STUDY_V="99999999z"'); route.fulfill({ response: r, body: t, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await pg.reload({ waitUntil: 'domcontentloaded' }); await boot(pg); const sv = await pg.evaluate(() => STUDY_V);
  await pg.evaluate(() => { view.st.mode = 'notes'; view.st.nseg = 'records'; render(); }); await pg.waitForTimeout(300);
  const recN = await pg.evaluate(() => allRecords().length); const jump = await pg.evaluate(() => { const b = document.querySelector('[data-rgo]'); if (!b) return false; b.click(); return !!document.querySelector('.rdv'); });
  ok('8 자료판 바뀐 뒤에도 기록 보이고 자리로 이동됨', sv === '99999999z' && recN === 2 && jump, JSON.stringify({ sv, recN, jump })); await pg.unroute(URL0);
  // 9. 낱말 메모(옛)와 주석(새) 함께
  await pg.evaluate(() => saveStudyNotes([{ t: Date.now(), b: 1, c: 1, v: 1, heb: 'בְּרֵאשִׁית', lex: 'ראשׁית', han: '', gl: '처음', st: 7225, m: '낱말 메모' }]));
  await pg.evaluate(() => { view.st.mode = 'notes'; view.st.nseg = 'records'; render(); }); await pg.waitForTimeout(200);
  const kinds = await pg.evaluate(() => allRecords().map(r => r.kind).sort()); ok('9 낱말 메모와 주석이 한 목록에, 저장은 따로', JSON.stringify(kinds) === JSON.stringify(['mark', 'verse', 'word']), JSON.stringify(kinds));
  // --- 백업·복원 ---
  await pg.evaluate(async () => { await anDelete((await anAllRaw()).find(a => a.kind === 'mark').id); }); // 표시 하나 지움(묘비)
  const B = await pg.evaluate(async () => backupObject()); ok('B1 백업에 묘비·rev·anchor·낱말 메모 포함', B.schema === 'MILALWV-BACKUP-1' && B.annots.length === 2 && B.annots.some(a => a.deleted) && B.annots.every(a => a.rev >= 1 && a.anchor && a.anchor.word_ids) && B.word_notes.length === 1, JSON.stringify(B.counts));
  // B2: 저장소를 지우고 복원 → 그대로
  await pg.evaluate(() => new Promise(r => { anDB && anDB.close(); anDB = null; const q = indexedDB.deleteDatabase('milal-annots'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await pg.evaluate(() => { try { localStorage.removeItem('milal-study-notes'); } catch (e) { } });
  await pg.reload({ waitUntil: 'domcontentloaded' }); await boot(pg); s = await snap(pg); ok('B2a 지운 뒤 비어 있음', s.n === 0, JSON.stringify(s));
  let plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); const r = await restoreApply(p); return { p: Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])), r }; }, B);
  s = await snap(pg); ok('B2b 복원 뒤 2건(묘비 포함)+낱말 메모', s.n === 2 && s.live === 1 && plan.p.add === 2 && plan.r.word_added === 1 && (await pg.evaluate(() => studyNotes().length)) === 1, JSON.stringify(plan));
  // B3: 같은 백업 다시 복원 → 모두 same, 아무것도 안 바뀜(멱등)
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); const r = await restoreApply(p); return { p: Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])), r }; }, B);
  s = await snap(pg); ok('B3 같은 백업 재복원은 멱등', s.n === 2 && plan.p.same === 2 && plan.r.written === 0 && plan.r.word_added === 0, JSON.stringify(plan));
  // B4: 기기에서 더 고친 뒤(rev 2) 옛 백업(rev 1) 복원 → 건너뜀
  await pg.evaluate(async (id) => { const L = await anAllRaw(); const a = L.find(x => x.id === id); a.observation = '고친 메모'; await anSave(a); }, id1);
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); await restoreApply(p); return Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])); }, B);
  let st1 = await stateOf(pg, id1); ok('B4 옛 판(rev 작음)은 건너뛰고 기기 것 유지', plan.skip_older === 1 && st1.rev === 2 && st1.obs === '고친 메모', JSON.stringify({ plan, st1 }));
  // B5: 백업 쪽이 더 새 판(rev 3) → 고쳐짐
  const B5 = JSON.parse(JSON.stringify(B)); const b5a = B5.annots.find(a => a.id === id1); b5a.rev = 3; b5a.observation = '백업이 더 새것';
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); await restoreApply(p); return Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])); }, B5);
  st1 = await stateOf(pg, id1); ok('B5 더 새 판은 고쳐짐', plan.update === 1 && st1.rev === 3 && st1.obs === '백업이 더 새것', JSON.stringify({ plan, st1 }));
  // B6: rev 같은데 내용 다름 → 충돌 사본 보존, 원본 그대로
  const B6 = JSON.parse(JSON.stringify(B5)); B6.annots.find(a => a.id === id1).observation = '다른 기기에서 같은 rev 로 다르게 적음';
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); await restoreApply(p); return Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])); }, B6);
  s = await snap(pg); st1 = await stateOf(pg, id1); const cp = await pg.evaluate(() => anList().find(a => (a.tags || []).includes('복원충돌')));
  ok('B6 rev 같고 내용 다르면 충돌 사본 보존 + 원본 유지', plan.conflict === 1 && s.n === 3 && st1.obs === '백업이 더 새것' && cp && /복원 충돌 사본/.test(cp.observation) && /다른 기기/.test(cp.observation), JSON.stringify({ plan, n: s.n }));
  // B7: 기기에서 지운 것을 백업이 되살리려 함 → 안 됨
  const B7 = JSON.parse(JSON.stringify(B)); const mk = B7.annots.find(a => a.kind === 'mark'); mk.deleted = false; mk.rev = 9;
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); await restoreApply(p); return Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])); }, B7);
  const stM = await stateOf(pg, mk.id); ok('B7 지운 기록은 백업으로 되살아나지 않음', plan.skip_deleted === 1 && stM.deleted === true, JSON.stringify({ plan, stM }));
  // B8: 깨진 항목·중복 id·다른 규격
  const B8 = JSON.parse(JSON.stringify(B)); B8.annots.push({ id: 'zz', kind: 'verse' }, { id: id1, kind: 'verse', anchor: B.annots[0].anchor, rev: 1, updated: 1 }, JSON.parse(JSON.stringify(B.annots[0])));
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); return Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])); }, B8);
  const bad = await pg.evaluate(async () => { try { await restorePlan({ schema: 'X', annots: [] }); return false; } catch (e) { return /백업 파일/.test(e.message); } });
  ok('B8 깨진 항목·중복 id 는 건너뛰고, 다른 규격은 거부', plan.invalid === 3 && bad, JSON.stringify(plan));
  s = await snap(pg); ok('B9 전 과정 뒤 id 중복 없음·건수 설명됨(3건: 원본2+충돌사본1)', s.uniq && s.n === 3, JSON.stringify(s));
  // D1: 같은 충돌 백업을 다시 복원해도 충돌 사본이 또 생기지 않음
  plan = await pg.evaluate(async (B) => { const p = await restorePlan(B); await restoreApply(p); return Object.fromEntries(Object.keys(p).map(k => [k, p[k].length])); }, B6);
  s = await snap(pg); ok('D1 충돌 백업 재복원 → 사본 중복 생성 없음', plan.conflict === 0 && plan.conflict_dup === 1 && s.n === 3, JSON.stringify({ plan, n: s.n }));
  // D2: 잘린·누락된 백업 검출 (counts 와 실제 수 불일치)
  const B10 = JSON.parse(JSON.stringify(B)); B10.annots.pop();
  const w10 = await pg.evaluate(async (B) => (await restorePlan(B)).warnings, B10); ok('D2 일부가 빠진 백업은 경고(파일 표기 수 ≠ 실제)', w10.length === 1 && /잘렸거나/.test(w10[0]), JSON.stringify(w10));
  const w10b = await pg.evaluate(async () => { try { await restorePlan(JSON.parse('{"schema":"MILALWV-BACKUP-1","annots":[{"id":"q"')); return 'parsed?'; } catch (e) { return 'reject'; } }); ok('D2b 잘린 JSON 은 거부', w10b === 'reject');
  // D3: 복원된 기록은 dirty(동기화 대상)로 표시 — 서버 동기화 뒤 복원해도 병합 절차를 거침
  const d3 = await pg.evaluate(async () => (await anAllRaw()).filter(a => a.dirty).length); ok('D3 복원된 기록은 동기화 대상(dirty)으로 표시', d3 >= 2, String(d3));
  // D4: 기록 5,000건 백업·복원 성능
  const perf = await pg.evaluate(async () => { const vi = SD.ref.get('1-1-1')[0]; const an = anchorVerse(vi); const L = []; for (let i = 0; i < 5000; i++) L.push({ id: 'perf' + i, kind: 'verse', key: 'v:1-1-1', anchor: an, observation: '관찰 ' + i, interpretation: '해석 ' + i, tags: ['성능'], created: 1, updated: 1 + i, deleted: i % 10 === 0, rev: 1, device: 'x' });
    let t0 = performance.now(); await anTx('readwrite', st => { for (const a of L) st.put(a); }); await anAll(); const tWrite = performance.now() - t0;
    t0 = performance.now(); const B = await backupObject(); const txt = JSON.stringify(B); const tBackup = performance.now() - t0;
    await new Promise(r => { anDB.close(); anDB = null; const q = indexedDB.deleteDatabase('milal-annots'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); await anOpen();
    t0 = performance.now(); const p = await restorePlan(JSON.parse(txt)); const r = await restoreApply(p); const tRestore = performance.now() - t0;
    const after = await anAllRaw(); return { n: B.annots.length, bytes: txt.length, tWrite: Math.round(tWrite), tBackup: Math.round(tBackup), tRestore: Math.round(tRestore), restored: after.length, tomb: after.filter(a => a.deleted).length, written: r.written }; });
  ok('D4 기록 5,000건: 백업·복원 각각 10초 안(에뮬레이션)', perf.n >= 5000 && perf.restored === perf.n && perf.tBackup < 10000 && perf.tRestore < 10000, JSON.stringify(perf));
  await ctx.close();
  // 10a. IndexedDB 없음 → 임시 저장소 + 경고 + 새로고침 뒤 유지(localStorage)
  const br = await chromium.launch(); const c2 = await br.newContext({ viewport: { width: 390, height: 800 } }); await c2.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
  const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push('10a ' + e.message)); await boot(p2);
  const idF = await addNote(p2, '1-1-1', '임시 저장소 메모'); await p2.evaluate(() => { view.st.mode = 'notes'; view.st.nseg = 'records'; render(); }); await p2.waitForTimeout(200);
  const warn = await p2.evaluate(() => { const w = document.querySelector('.lead.warn'); return w ? w.textContent : ''; });
  await p2.reload({ waitUntil: 'domcontentloaded' }); await boot(p2); const sF = await p2.evaluate(() => ({ fb: AN_FALLBACK, n: anList().length }));
  ok('10a IndexedDB 없어도 저장되고 경고 뜨고 새로고침 뒤 유지', /IndexedDB/.test(warn) && /백업/.test(warn) && sF.fb && sF.n === 1, JSON.stringify({ warn: warn.slice(0, 40), sF }));
  await c2.close();
  // 10b. 용량 부족(put 이 QuotaExceededError) → 조용히 사라지지 않고 분명한 오류
  const c3 = await br.newContext({ viewport: { width: 390, height: 800 } }); await c3.addInitScript(() => { const P = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('quota', 'QuotaExceededError'); }; });
  const p3 = await c3.newPage(); await boot(p3);
  const qres = await p3.evaluate(async () => { try { const vi = SD.ref.get('1-1-1')[0]; await anSave({ kind: 'verse', key: 'v:1-1-1', anchor: anchorVerse(vi), observation: 'x', interpretation: '', tags: [] }); return 'saved?!'; } catch (e) { return e.message; } });
  const nAfter = await p3.evaluate(() => anList().length); ok('10b 용량 부족은 분명한 안내로 실패(조용한 유실 없음)', /저장 공간이 부족/.test(qres) && nAfter === 0, qres);
  await br.close();
  console.log(R.join('\n')); console.log('errors:', errs); const bad2 = R.filter(x => x.startsWith('FAIL')).length; console.log(bad2 ? `실패 ${bad2}` : '모두 통과'); process.exit(bad2 ? 1 : 0);
})();
