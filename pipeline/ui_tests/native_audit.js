// 작업 A-1 전수검사: 욥기 절 원자 2,977개의 'V1 보존 여부' 상태를 세고, 원자료 사본·IF-1 과 대조한다. 실행: node pipeline/ui_tests/native_audit.js
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(2500);
  await pg.evaluate(async () => { setRange({ b: 18, c1: 1, c2: 1 }); view.st.mode='verse'; view.st.rd='struct'; view.st.milalOn = true; render(); await loadBook(18); }); await pg.waitForFunction(() => ML[18] && ML[18].state === 'ok' && ML[18].bhsaNative, null, { timeout: 60000 });
  const R = await pg.evaluate(() => { const st = ML[18]; const a0 = SD.bookA[17], a1 = SD.bookA[18]; const cnt = {}, bad = [], byca = st.bhsaNative; let wrongPreserved = 0;
    for (let aid = a0; aid < a1; aid++) { const ca = SD.can[aid], cid = SD.wc[atomFirstWord(aid)], S = bhsaNativeStatus(st, ca, SD.ccn[cid]); cnt[S.code] = (cnt[S.code] || 0) + 1;
      const y = byca.get(ca); const v1HasAtom = [...st.natByAtom.keys()].includes(ca);
      // 잘못된 '보존됨': 원자료에 이 원자의 mother 가 있는데 V1 에 이 원자 번호가 없으면 DIRECT 가 아니어야 한다
      if (y && y.mother_clause_atom != null && !v1HasAtom && S.code === 'DIRECT_ATOM') { wrongPreserved++; bad.push(ca); }
      if (S.code === 'DIRECT_ATOM' && (!S.v1 || S.v1.bhsa_nodes.dependent !== ca)) bad.push('D' + ca);
      if (S.code === 'CLAUSE_LEVEL' && (!S.v1 || S.v1.bhsa_nodes.dependent !== Number(SD.ccn[cid]))) bad.push('C' + ca); }
    const bhsaOnly = [...byca.values()].filter(y => y.mother_clause_atom != null && !st.natByAtom.has(y.clause_atom)).length;
    return { total: a1 - a0, cnt, wrongPreserved, bad: bad.slice(0, 5), bhsaOnlyExpected: bhsaOnly }; });
  console.log(JSON.stringify(R)); const ok = R.wrongPreserved === 0 && R.bad.length === 0 && R.cnt.BHSA_ONLY === R.bhsaOnlyExpected && R.cnt.DIRECT_ATOM === 2895 && (R.cnt.BHSA_ONLY + R.cnt.DIRECT_ATOM + (R.cnt.CLAUSE_LEVEL || 0) + (R.cnt.NO_MOTHER || 0) + (R.cnt.UNKNOWN || 0)) === R.total;
  console.log(ok ? 'PASS 전수검사: 잘못된 보존 표시 0' : 'FAIL'); await br.close(); process.exit(ok ? 0 : 1); })();
