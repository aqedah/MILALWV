// 작업 E: 신학생 세 사람(초급·중급·대학원)의 과제를 화면 단추만 눌러 수행하며 터치 수·화면 이동·막히는 곳을 잰다 (Pixel 5 에뮬레이션, 실제 사용자 아님)
const { chromium, devices } = require('playwright'); const OUT = (process.argv[2] || '/tmp') + '/';
const URL0 = 'http://localhost:8765/index.html?ux=0'; const LOG = []; let taps = 0, screens = 0, shot = 0;
const log = (s) => { LOG.push(s); console.log(s); };
(async () => {
  const br = await chromium.launch(); const c = await br.newContext({ ...devices['Pixel 5'] }); const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tap = async (sel, what) => { taps++; if (typeof sel === 'string') await pg.click(sel); else await sel.click(); await pg.waitForTimeout(350); if (what) log(`  탭 ${taps}: ${what}`); };
  const snap = async (name) => { shot++; await pg.screenshot({ path: `${OUT}e${String(shot).padStart(2, '0')}_${name}.png` }); };
  const text = () => pg.evaluate(() => document.querySelector('#main').innerText.replace(/\s+/g, ' '));
  const closeSheet = async () => { const x = await pg.$('#sheetX'); if (x) { await tap(x, '시트 닫기'); } };
  const begin = (name) => { taps = 0; screens = 0; log(`\n===== ${name} =====`); };
  const end = (name) => log(`→ ${name}: 탭 ${taps}회`);
  await pg.goto(URL0, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof SD !== 'undefined' && SD && document.querySelector('.rdv'), null, { timeout: 60000 }); await pg.waitForTimeout(800);
  const tut = await pg.$('#sheetX'); log(`첫 화면: 창 1장 + ${tut ? '처음 쓰는 법 안내 시트' : '안내 없음'}`); if (tut) await tut.click(); await pg.waitForTimeout(200);

  // ---------- 초급: 창세기 22장 ----------
  begin('초급 신학생 · 창세기 22장');
  await tap('#sAddr', '장 이름(창 1장 ▾) 누름 → "어디로 갈까요" 시트'); await snap('beg_addr');
  const genBtn = await pg.$('#sheetRoot [data-ab="1"]'); await tap(genBtn, '창세기'); const ch22 = await pg.$('#sheetRoot [data-ac="22"]'); await tap(ch22, '22'); await snap('beg_gen22');
  end('① 창 22장 열기');
  taps = 0; await tap('.bnav [data-nav="research"]', '하단 "연구"'); await snap('beg_research');
  await tap('[data-stool="반복"]', '도구 "반복 — 되풀이되는 말"'); await pg.waitForTimeout(600); await snap('beg_repeat');
  const rep = await text(); log(`  반복 결과 범위 표시: ${(rep.match(/반복 · [^·]{0,20}/) || [''])[0]}`);
  end('② 반복되는 낱말 찾기');
  taps = 0; await tap('.bnav [data-nav="text"]', '하단 "본문"'); const v2 = await pg.$('[data-rdv]:nth-of-type(2)') || (await pg.$$('[data-rdv]'))[1]; await tap(v2, '22:2 절 누름(낱말 펼침)'); await snap('beg_verse_open');
  const rsws = await pg.$$('.rstrip .rsw'); log(`  펼친 낱말 묶음 ${rsws.length}개`); let verbBtn = null;
  for (const b of rsws) { const t = await b.getAttribute('title') || ''; const cls = await b.getAttribute('class'); if (/동사|verb/.test(t) || /vb/.test(cls || '')) { verbBtn = b; break; } }
  await tap(verbBtn || rsws[1], '낱말 하나 누름(동사 찾기)'); await snap('beg_word_detail');
  const det = await pg.evaluate(() => (document.getElementById('rDet') || {}).innerText || ''); log(`  낱말 상세 첫 줄: ${det.replace(/\s+/g, ' ').slice(0, 140)}`);
  const hasParse = /동사|명사|완료|미완료|분사|명령|칼|피엘|히필|니팔/.test(det); log(`  문법 용어 한글로 보임: ${hasParse}`);
  const noteBtn = await pg.$('[data-annew^="verse"]'); log(`  "이 절에 관찰·해석 쓰기" 단추 보임: ${!!noteBtn}`);
  if (noteBtn) { await noteBtn.scrollIntoViewIfNeeded(); await tap(noteBtn, '"이 절에 관찰·해석 쓰기"'); await snap('beg_editor'); await pg.fill('#anObs', '2절에서 "네 아들, 네 사랑하는 독자" 호칭이 세 겹으로 쌓인다'); await tap('#anSave', '저장'); await snap('beg_saved'); }
  end('③ 동사 형태 보고 관찰 메모');
  taps = 0; await tap('.bnav [data-nav="notes"]', '하단 "기록"'); await snap('beg_records'); const recTxt = await text(); log(`  기록 탭에 메모 보임: ${/세 겹/.test(recTxt)}`); end('④ 기록 확인');

  // ---------- 중급: 창세기 22장 구조·대화/서술 ----------
  begin('중급 신학생 · 창 22장 구조와 발화');
  await tap('.bnav [data-nav="struct"]', '하단 "구조"'); await snap('mid_struct'); const st = await text(); log(`  구조 머리말: ${st.slice(0, 200)}`);
  const legend = await pg.evaluate(() => { const e = document.querySelector('.rdnote,.srcnote,.structhead,.sthead'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 200) : '(범례 없음)'; }); log(`  범례: ${legend}`);
  await tap('[data-ssv="speech"]', '"발화" 보기'); await snap('mid_speech'); const sp = await text(); log(`  발화 화면(MILAL 없는 책): ${sp.slice(0, 220)}`);
  await tap('[data-ssv="tree"]', '"계층"으로'); const labels = await pg.$$('[data-sat]'); log(`  줄 이름표 ${labels.length}개`);
  await tap(labels[2], '줄 이름표 하나 누름 → 절 원자 상세'); await snap('mid_atom_sheet'); const sh = await pg.evaluate(() => document.querySelector('#sheetRoot .sheet')?.innerText.replace(/\s+/g, ' ').slice(0, 400)); log(`  상세 시트: ${sh}`);
  const srcCount = await pg.evaluate(() => document.querySelectorAll('#sheetRoot .src3 .label').length); log(`  출처 구분 블록 수: ${srcCount}`);
  const atomNote = await pg.$('#sheetRoot [data-annew^="atom"]'); if (atomNote) { await tap(atomNote, '"이 절 원자에 관찰·해석 쓰기"'); await pg.fill('#anObs', '와이크톨 사슬이 끊기고 화자 교체'); await pg.fill('#anInt', '여기서 장면이 바뀐다'); await pg.fill('#anTags', '경계'); await tap('#anSave', '저장'); } else log('  ! 절 원자 메모 단추 없음');
  end('① 경계 관찰 + 해석 기록');
  taps = 0; await tap('.bnav [data-nav="research"]', '연구'); await tap('[data-stool="화자"]', '도구 "화자 — 서술과 인물의 말"'); await pg.waitForTimeout(600); await snap('mid_speaker'); const spk = await text(); log(`  화자 결과: ${spk.slice(0, 200)}`); end('② 대화/서술 비교');

  // ---------- 대학원: 욥 32–37 ----------
  begin('대학원 연구자 · 욥 32–37');
  await tap('.bnav [data-nav="struct"]', '구조'); await tap('#sAddr', '장 이름'); await tap(await pg.$('#sheetRoot [data-ab="18"]'), '욥기'); await tap(await pg.$('#sheetRoot [data-ac="32"]'), '32'); await pg.waitForTimeout(800); await snap('grad_job32');
  const tog = await pg.$('[data-milal="1"]'); log(`  "MILAL 판정 겹쳐 보기" 단추 보임: ${!!tog}`); if (tog) { await tap(tog, 'MILAL 겹쳐 보기'); await pg.waitForFunction(() => ML[18] && ML[18].state === 'ok', null, { timeout: 20000 }); await pg.waitForTimeout(400); }
  await snap('grad_milal_on'); const badges = await pg.evaluate(() => [...document.querySelectorAll('.mb')].map(x => x.textContent).slice(0, 6)); log(`  배지: ${badges.join(' | ')}`);
  await tap('[data-ssv="speech"]', '발화'); await snap('grad_speech'); const units = await pg.evaluate(() => document.querySelectorAll('.mgh').length); log(`  발언 단위 머리띠 ${units}개`);
  const comp = await pg.$('.mb-q'); log(`  경쟁 가설 배지 보임: ${!!comp}`);
  const hdrs = await pg.$$('[data-mgh]'); await tap(hdrs[1] || hdrs[0], '발언 단위 머리띠 누름 → 묶음 상세'); await snap('grad_unit'); const us = await pg.evaluate(() => document.querySelector('#sheetRoot .sheet')?.innerText.replace(/\s+/g, ' '));
  log(`  묶음 상세: 경쟁 안내 ${/경쟁/.test(us)} · 근거 줄(통과/미결) ${/(통과|미결)/.test(us)} · 규칙 번호 ${/규칙 G/.test(us)} · 자료 상태 ${/(시험 자료|승인 전)/.test(us)}`);
  const firstBtn = await pg.$('#sheetRoot [data-mgo]'); await tap(firstBtn, '"첫 절 32:6 ›"(또는 모절 가기) → 그 줄로 이동'); await snap('grad_goto');
  const curSat = await pg.evaluate(() => view.st.curAid); await tap(`[data-sat="${curSat}"]`, '비춰진 줄 이름표 → 절 원자 상세'); await snap('grad_atom'); const gs = await pg.evaluate(() => document.querySelector('#sheetRoot .sheet')?.innerText.replace(/\s+/g, ' '));
  log(`  상세에 관계/근거/상태 보임: 관계 ${/관계/.test(gs)} 근거 ${/(통과|미결|실패)/.test(gs)} 상태 ${/(확정|잠정|경쟁|미배정)/.test(gs)} 자료 상태 ${/(시험 자료|승인 전)/.test(gs)}`);
  await pg.evaluate(() => { const s = document.querySelector('#sheetRoot .sheet'); if (s) s.scrollTop = 500; }); await snap('grad_atom2');
  const refNote = await pg.$('#sheetRoot [data-annew^="atom"]'); if (refNote) { await tap(refNote, '절 원자에 메모'); const ref = await pg.$('#anRef'); log(`  "MILAL 관계를 참조로 함께 저장" 선택 보임: ${!!ref}`); await pg.fill('#anObs', '엘리후 도입부 wayyiqtol 사슬'); await pg.fill('#anInt', '32:6 이 발언의 틀을 연다'); await tap('#anSave', '저장'); }
  await closeSheet();
  await tap('[data-ssv="map"]', '지도'); await snap('grad_map'); const mapT = await text(); log(`  지도 머리말: ${mapT.slice(0, 160)}`);
  const cand = await pg.$('[data-mapcand], #mapCand, input[type=checkbox]'); if (cand) { await tap(cand, '"후보 관계 보기"'); await snap('grad_map_cand'); }
  end('① 발언 단위·모절 관계·경쟁 가설 확인 + 메모');
  taps = 0; await tap('.bnav [data-nav="notes"]', '기록'); const md = await pg.evaluate(() => { exportRecords('md'); return window.__lastExport && window.__lastExport.txt; }); taps++;
  log(`  Markdown 내보내기: ${md ? md.length + '자' : '실패'} · MILAL 참조 포함 ${/MILAL 참조/.test(md || '')} · 관찰/해석 분리 ${/\*\*관찰\*\*/.test(md || '') && /\*\*해석\*\*/.test(md || '')} · 자료 상태 표기 ${/(시험 자료|MILAL 출력)/.test(md || '')}`);
  end('② 내 주석과 함께 출력');
  console.log('\n--- 요약 ---'); console.log(LOG.filter(l => l.startsWith('→')).join('\n')); console.log('errors:', errs);
  require('fs').writeFileSync(OUT + 'personas_log.txt', LOG.join('\n')); await br.close();
})();
