"""실제 MILAL V1 관계망 검증 — 작업 D 의 10단계를 한 번에 (MILAL 원본은 읽기만)

쓰는 법:
  python3 pipeline/milal_real_v1_check.py <V1 real 폴더> --review-zip <P2_REVIEW.zip> --commit <MILAL 커밋 해시>
         [--work build/real_v1_<날짜>] [--deploy study/milal/job.json] [--report docs/REPORT_real_v1_<날짜>.md] [--words study/words.json]
         [--positive 37:20=500064>500065] [--negative 37:20=500062>500065] [--not-in-v1 37:24>38:1]

단계: 1 V1 자체 검증 결과(V1_VALIDATION.md 게이트 — 실패하면 여기서 멈춤) 2 SHA-256·생성 코드 버전(manifest 불일치면 즉시 중단)
      3 V1→IF-1 변환(임시 작업 폴더에; 이전 compare.json 재사용 없음) 4 ROUNDTRIP_EXACT 필수 5 P2 근거 누락·미결 따로 보고
      6 BHSA 낱말·절·절 원자 대조(V1~V16) 7 화면 표시(수동 — 안내만) 8 관계 상태·방향·근거 대조 9 차이 보고서
      10 연구자 판단 필요 항목 + 기준점: 긍정(실제 확정된 모절·자절), 부정(직접 모절 후보를 명시적으로 기각한 기록), 기록 유무(V1 범위 밖 판정은 NOT_RECORDED)
배포: 모든 검사가 0(통과)일 때만, --deploy 를 준 경우에만 작업 폴더의 파일을 배포 자리로 복사한다. 실패한 파일은 배포하지 않는다.
결과: 보고서 Markdown 과 종료 코드(0 모두 통과 / 1 사람이 볼 것 있음 / 2 실패)

기준점의 출처(MILAL docs/HUMAN_STRUCTURAL_ADJUDICATION_MFR_H02.csv, 판정 MFR-H02-JOB-37-20, 2026-09-26):
  - 500064 → 500065 : ACCEPTED_AS_LOCAL_MOTHER, HYPOTACTIC → V1 에서 CONFIRMED SUBORDINATE 간선(rule "HUMAN MFR-H02-JOB-37-20")  = 긍정 기준점
  - 500062 → 500065 : REJECTED_AS_DIRECT_MOTHER, NO_DIRECT_STRICT_MOTHER_RELATION → V1 human_notes → IF-1 NO_DIRECT_RELATION = 부정 기준점
    (처음 판의 검증기는 이 쌍에 CONFIRMED 를 기대했다 — 잘못이었고 2026-10-20 에 고침)
  - 37:24 → 38:1 NO_DIRECT_PARENTAGE 는 HSA3 D/E 이음매 판정(src/milal_hsa3_de_seam_adjudication.py)에 있고, V1 의 frozen_human(2건)에는
    없다 → V1 에서는 NOT_RECORDED 가 정상. 가상의 NO_DIRECT_RELATION 을 만들지 않는다.
"""
import sys, os, json, hashlib, argparse, subprocess, datetime, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True); return p.returncode, (p.stdout + p.stderr)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("v1dir"); ap.add_argument("--review-zip"); ap.add_argument("--commit", required=True)
    ap.add_argument("--work"); ap.add_argument("--deploy"); ap.add_argument("--report"); ap.add_argument("--words", default="study/words.json")
    ap.add_argument("--positive", action="append", help="장:절=모절id>자절id — 연구자가 채택한 모절·자절 (기본 37:20=500064>500065)")
    ap.add_argument("--negative", action="append", help="장:절=모절후보id>자절id — 연구자가 직접 모절로 기각한 쌍 (기본 37:20=500062>500065)")
    ap.add_argument("--not-in-v1", action="append", help="장:절>장:절 — V1 범위 밖 판정(기록 유무만 확인; 기본 37:24>38:1)")
    a = ap.parse_args(); V = a.v1dir; R = []; status = 0
    a.positive = a.positive or ["37:20=500064>500065"]; a.negative = a.negative or ["37:20=500062>500065"]; a.not_in_v1 = a.not_in_v1 or ["37:24>38:1"]
    work = a.work or os.path.join("build", "real_v1_" + datetime.date.today().isoformat()); os.makedirs(work, exist_ok=True); a.out = os.path.join(work, "job.json")
    def say(s): R.append(s); print(s)
    def flag(level, s):
        nonlocal status; say(("❌ " if level == 2 else "⚠ ") + s); status = max(status, level)
    today = datetime.date.today().isoformat(); rep = a.report or f"docs/REPORT_real_v1_{today}.md"
    def finish(code):
        os.makedirs(os.path.dirname(rep) or ".", exist_ok=True); open(rep, "w", encoding="utf-8").write("\n".join(R) + "\n"); print("\n보고서:", rep); sys.exit(code)
    say(f"# 실제 MILAL V1 관계망 검증 — {today}\n\n- V1 폴더: `{V}`\n- MILAL 커밋: `{a.commit}`\n- 작업 폴더: `{work}` (검사를 모두 통과하고 --deploy 를 준 때만 배포 자리로 복사)\n")

    # 1. V1 자체 검증
    say("## 1. V1 자체 검증 결과")
    vmd = os.path.join(V, "V1_VALIDATION.md")
    if os.path.exists(vmd):
        t = open(vmd, encoding="utf-8").read(); fails = re.findall(r"^.*\b(FAIL|ERROR)\b.*$", t, re.M)
        say(f"- `V1_VALIDATION.md` 있음, PASS {len(re.findall(r'PASS', t))}회, FAIL/ERROR {len(fails)}회")
        for f in fails[:10]: flag(2, "V1 게이트 실패: " + f.strip())
        if fails: say("\n**V1 자체 검증이 실패했으므로 변환하지 않습니다(완료로 처리하지 않음).**"); finish(2)
        if "BHSA cross-check" in t: say("- BHSA cross-check 줄: " + (re.search(r"BHSA cross-check[^\n]*", t).group(0)))
    else: flag(1, "V1_VALIDATION.md 없음 — 게이트 결과를 확인할 수 없음")

    # 2. 해시·코드 버전
    say("\n## 2. SHA-256 과 생성 코드 버전")
    netp = os.path.join(V, "V1_RELATION_NETWORK.json")
    if not os.path.exists(netp): flag(2, "V1_RELATION_NETWORK.json 없음"); finish(2)
    net_sha = sha(netp); say(f"- V1_RELATION_NETWORK.json sha256 `{net_sha}`")
    mp = os.path.join(V, "99_manifest_sha256.csv")
    if os.path.exists(mp):
        import csv; man = {r["path"]: r["sha256"] for r in csv.DictReader(open(mp, encoding="utf-8-sig"))}
        for k, v in man.items():
            fp = os.path.join(V, k)
            if os.path.exists(fp):
                if sha(fp) == v: say(f"- manifest {k}: 일치")
                else: flag(2, f"manifest {k}: 불일치! — 손상되었거나 다른 실행의 파일. 즉시 중단"); finish(2)
    else: flag(1, "99_manifest_sha256.csv 없음")
    meta = json.load(open(os.path.join(V, "90_run_metadata.json"), encoding="utf-8")) if os.path.exists(os.path.join(V, "90_run_metadata.json")) else {}
    for k in ("git_commit", "commit", "code_version", "rules_version", "milal_version", "generated_at", "created_at", "input_sha256"):
        if k in meta: say(f"- metadata.{k}: `{meta[k]}`")
    mc = str(meta.get("git_commit") or meta.get("commit") or "")
    if mc and not (mc.startswith(a.commit) or a.commit.startswith(mc)): flag(1, f"--commit({a.commit}) 과 metadata 의 커밋({mc})이 다름 — 어느 쪽이 맞는지 확인")
    if a.review_zip: say(f"- P2_REVIEW.zip sha256 `{sha(a.review_zip)}`")

    # 3·4·5. 변환 + round-trip + 근거
    say("\n## 3–5. V1→IF-1 변환, 구조 보존·round-trip, P2 근거 보존")
    cmpp = a.out + ".compare.json"
    for f in (a.out, cmpp):
        if os.path.exists(f): os.remove(f)   # 이전 실행의 결과를 재사용하지 않음
    cmd = [sys.executable, os.path.join(HERE, "milal_export_v1.py"), V, a.out, "--commit", a.commit, "--compare", cmpp] + (["--review-zip", a.review_zip] if a.review_zip else [])
    rc, outp = run(cmd); say(f"- 변환기 종료 코드 {rc}")
    if not os.path.exists(a.out) or not os.path.exists(cmpp): flag(2, "변환기가 결과를 내지 못함: " + outp.strip()[-600:]); finish(2)
    C = json.load(open(cmpp, encoding="utf-8"))
    verdict = C.get("verdict", "?"); say(f"- 판정: **{verdict}**")
    if "FAIL" in verdict: flag(2, "구조 보존 실패 — 변환기를 실제 자료에 맞춰 고쳐야 함(원본 MILAL 은 안 바꿈). 상세: " + json.dumps(C.get("lost", C), ensure_ascii=False)[:800])
    elif "EVIDENCE_INCOMPLETE" in verdict: flag(1, "근거(P2 규칙 검사) 일부를 펼치지 못함 — P2_RULE_TRACE 와 V1 record 의 연결을 확인")
    if not C.get("roundtrip", {}).get("exact"): flag(2, "ROUNDTRIP_EXACT 아님 — 실제 관계망은 정확히 되살아나야 한다. 다른 경로: " + json.dumps(C.get("roundtrip", {}).get("differences", [])[:8], ensure_ascii=False))
    cov = C.get("evidence_coverage", {}); say(f"- P2 근거 보존: 규칙 기록 있는 관계 {cov.get('relations_with_trace_source', '?')}개 · 근거 없는 관계 {cov.get('relations_without_evidence', '?')}개")
    for k, v in C.items():
        if k not in ("roundtrip", "verdict"): say(f"- {k}: {json.dumps(v, ensure_ascii=False)[:300]}")
    if not a.review_zip: flag(1, "--review-zip 없이 돌려서 근거가 비어 있음")

    # 6. BHSA 대조
    Dtmp = json.load(open(a.out, encoding="utf-8"))
    if Dtmp.get("file_status") != "MILAL_OUTPUT": flag(2, f"file_status 가 {Dtmp.get('file_status')} — 실제 연구 파일은 MILAL_OUTPUT 이어야 함(시험 파일과 분리)")
    unres_ev = [e for e in Dtmp["evidence"] if e.get("outcome") == "UNRESOLVED"]; failed_ev = [e for e in Dtmp["evidence"] if e.get("outcome") == "FAILED"]
    say(f"- P2 근거 상태: 미결(UNRESOLVED) {len(unres_ev)}개 · 실패(FAILED, 반례·통과 못 한 검사) {len(failed_ev)}개 — 연구자 검토 목록에 포함")
    say("\n## 6. BHSA 낱말·절·절 원자 대조 (V1~V16)")
    rc, outp = run([sys.executable, os.path.join(HERE, "milal_check.py"), a.out] + ([] if a.words in ("", "none") else ["--words", a.words]))
    if a.words in ("", "none"): flag(1, "--words none: BHSA 낱말 대조(V5)를 건너뜀 — 합성 자료 시험에서만 허용")
    for line in outp.splitlines():
        if line.startswith(("PASS", "FAIL", "WARN")): say("- " + line)
    if rc != 0: flag(2 if rc == 1 else 1, f"검증기 종료 코드 {rc}" + (" (jsonschema 없음)" if rc == 2 else ""))

    # 7. 화면
    say("\n## 7. 화면 표시 (수동)\n- `app/milal.js` 의 MILAL_FILES url 을 이 파일로 바꾸고(test → study/milal/job.json) 욥 32–37 계층·발화·지도를 연다. `node pipeline/ui_tests/personas_e.js` 의 대학원 시나리오로 머리띠·상세·지도를 자동 캡처할 수 있다.")

    # 8. 관계 상태·방향·근거
    D = json.load(open(a.out, encoding="utf-8")); N = json.load(open(netp, encoding="utf-8"))
    say("\n## 8. 관계 상태·방향·근거 대조")
    st = Counter(r["status"] for r in D["relations"]); kd = Counter(r["kind"] for r in D["relations"])
    say(f"- 관계 {len(D['relations'])}개 — 상태 {dict(st)} · 종류 {dict(kd)} · 원 BHSA 관계(native) {len(D['native_relations'])}개")
    ev = {e["id"]: e for e in D["evidence"]}; oc = Counter(e.get("outcome") for e in D["evidence"]); say(f"- 근거 {len(ev)}개 — 결과 {dict(oc)}")
    noev = [r["id"] for r in D["relations"] if not r.get("evidence_ids")]
    if noev: flag(1, f"근거 없는 관계 {len(noev)}개 (예: {', '.join(noev[:3])}) — 규칙 기록이 P2_RULE_TRACE 에 없는 경우인지 확인")
    for r in D["relations"]:
        if r["source"]["type"] == "clause" and r["target"]["type"] == "clause" and r["source"]["id"] == r["target"]["id"]: flag(2, f"자기 자신을 가리키는 관계 {r['id']}")
    say("- 방향 규약: source=모절(mother), target=자절(daughter) — V1 기록 'A → B' 와 같음(H0.2 기록 500062 → 500065 로 확인)")

    # 10. 연구자 판단 필요 항목 + 기준점
    say("\n## 9–10. 연구자 판단이 필요한 항목과 기준점 확인")
    node = {n["id"]: n for n in D["nodes"]}; byref = {}
    for n in D["nodes"]: byref.setdefault((n["ch"], n["vs"]), []).append(n["id"])
    comp = [r for r in D["relations"] if r["status"] == "COMPETING"]; unres = [s for s in D["issues"] if s["kind"] == "UNRESOLVED"]
    alts = [s for s in D["issues"] if s["kind"] == "ALTERNATIVE_SET"]; unas = [s for s in D["issues"] if s["kind"] == "UNASSIGNED_CLAUSE"]; ndr = [s for s in D["issues"] if s["kind"] == "NO_DIRECT_RELATION"]
    say(f"- 경쟁 관계 {len(comp)}개 · 미결 {len(unres)}개 · 대안 묶음 {len(alts)}개 · 미배정 절 {len(unas)}개 · 직접 관계 없음(판정) {len(ndr)}개 · 사람 메모 {len(D['notes'])}건")
    hum = [e for e in D["evidence"] if e.get("outcome") == "HUMAN"]; say(f"- 연구자 판정 근거(HUMAN) {len(hum)}개")
    fake = [x for x in ndr if not (x.get("basis", {}).get("kind") == "HUMAN_DECISION" and x.get("record", {}).get("table") == "frozen_human")]
    if fake: flag(2, f"사람 판정(frozen_human)에서 오지 않은 NO_DIRECT_RELATION {len(fake)}개 — 실제 파일에 가상 판정이 들어 있음: {[x['id'] for x in fake][:5]}")
    else: say(f"- 직접 관계 없음(판정) {len(ndr)}개 모두 frozen_human 의 사람 판정에서 옴 ✓ (기계 추론·통제 자료로 만든 것 없음)")
    byref_all = byref
    def rel_between(s_id, t_id, hier=True): return [r for r in D["relations"] if r["source"].get("id") == s_id and r["target"].get("id") == t_id and (not hier or r["kind"] in ("SUBORDINATE", "FRAME_CONTENT", "CONTINUATION"))]
    def show_clause(cid):
        n = node.get(cid); say(f"- 절 {cid}: " + (f"{n['ch']}:{n['vs']} `{n.get('text', '')[:40]}` 낱말 {len(n.get('word_ids', []))}개" if n else "**IF-1 에 없음**"))
        if not n: flag(2, f"기준 절 {cid} 가 변환 결과에 없음")
    for spec in a.positive:
        m = re.match(r"(\d+):(\d+)=(\d+)>(\d+)", spec)
        if not m: continue
        ch, vs, s_id, t_id = int(m[1]), int(m[2]), m[3], m[4]
        say(f"\n### 긍정 기준점 — 욥 {ch}:{vs} 연구자가 채택한 모절·자절 ({s_id} → {t_id})"); show_clause(s_id); show_clause(t_id)
        hits = rel_between(s_id, t_id); rev = rel_between(t_id, s_id)
        if hits:
            for r in hits:
                evs = [ev[i] for i in r.get("evidence_ids", []) if i in ev]
                say(f"- 관계 `{r['id']}` {r['kind']} **{r['status']}** 규칙 {r['rule']} 기록 {r['record']} 근거 {len(evs)}개 (HUMAN {sum(1 for e in evs if e.get('outcome') == 'HUMAN')})")
                if r["status"] != "CONFIRMED": flag(2, f"긍정 기준점이 CONFIRMED 가 아님({r['status']}) — frozen_human 의 ACCEPTED 가 V1 에서 CONFIRMED 간선이 되어야 함")
                if not str(r["rule"]).startswith("HUMAN"): flag(1, f"긍정 기준점의 규칙이 HUMAN 판정이 아님({r['rule']}) — 사람 판정 간선과 기계 간선이 따로인지 확인")
                if not any(e.get("outcome") == "HUMAN" for e in evs): flag(1, "긍정 기준점에 HUMAN 근거가 붙지 않음 — 변환기의 사람 판정 근거 연결 확인")
        elif rev: flag(2, f"방향이 뒤집힘: {t_id} → {s_id} 로 들어 있음 ({[r['id'] for r in rev]})")
        else: flag(2, f"{s_id} → {t_id} 관계가 없음 — V1 edges 직접 조회: " + json.dumps([(e['edge_id'], e['status'], e['rule']) for e in N['edges'] if str(e['source'].get('id')) == s_id and str(e['target'].get('id')) == t_id], ensure_ascii=False))
    for spec in a.negative:
        m = re.match(r"(\d+):(\d+)=(\d+)>(\d+)", spec)
        if not m: continue
        ch, vs, s_id, t_id = int(m[1]), int(m[2]), m[3], m[4]
        say(f"\n### 부정 기준점 — 욥 {ch}:{vs} 직접 모절 후보를 명시적으로 기각한 기록 ({s_id} ↛ {t_id})"); show_clause(s_id); show_clause(t_id)
        conf = [r for r in rel_between(s_id, t_id) if r["status"] == "CONFIRMED"]; other = [r for r in rel_between(s_id, t_id, hier=False) if r["status"] != "CONFIRMED"]
        if conf: flag(2, f"기각된 쌍에 CONFIRMED 관계가 있음: {[r['id'] for r in conf]} — 연구자 판정과 어긋남")
        else: say("- 이 쌍에 CONFIRMED 계층 관계 없음 ✓")
        if other: say(f"- 같은 쌍의 기계·원자료 후보(확정 아님, 기각과 공존 가능 — '기계 증거는 보존'): {[(r['id'], r['kind'], r['status']) for r in other]}")
        nd = [x for x in ndr if x["about"][0]["id"] == s_id and x["about"][1]["id"] == t_id]
        hn = [h for h in N.get("human_notes", []) if str(h.get("source_clause_id")) == s_id and str(h.get("target_clause_id")) == t_id]
        say(f"- V1 human_notes 의 명시적 기각 기록: {len(hn)}건 " + (json.dumps([{k: h.get(k) for k in ('decision', 'effect', 'rationale_code')} for h in hn], ensure_ascii=False) if hn else ""))
        if nd:
            for x in nd: say(f"- IF-1 NO_DIRECT_RELATION `{x['id']}` 근거 {x['basis']} 기록 {x['record']} ✓")
            if not hn: flag(2, "IF-1 에 NO_DIRECT_RELATION 이 있는데 V1 human_notes 에 기록이 없음 — 가상 판정 생성 의심")
        elif hn: flag(2, "V1 에 명시적 기각 기록이 있는데 IF-1 NO_DIRECT_RELATION 이 없음 — 변환기 수정")
        else: flag(1, "이 쌍의 기각 기록이 V1 에 없음(NOT_RECORDED) — '관계가 없음'(모름)일 뿐 '기각됨'이 아니다. 기준점을 실제 연구자 판정에서 다시 고를 것")
    for spec in a.not_in_v1:
        m = re.match(r"(\d+):(\d+)>(\d+):(\d+)", spec)
        if not m: continue
        A, B = (int(m[1]), int(m[2])), (int(m[3]), int(m[4])); say(f"\n### 기록 유무 — 욥 {A[0]}:{A[1]} → {B[0]}:{B[1]} (V1 범위 밖일 수 있는 판정)")
        ca, cb = byref_all.get(A, []), byref_all.get(B, []); say(f"- {A[0]}:{A[1]} 절 {ca} · {B[0]}:{B[1]} 절 {cb}")
        if not ca or not cb: say("- 한쪽 절이 이 V1 범위에 없음 → **NOT_RECORDED(범위 밖)**"); continue
        direct = [r for r in D["relations"] if r["source"].get("id") in ca and r["target"].get("id") in cb and r["kind"] in ("SUBORDINATE", "FRAME_CONTENT", "CONTINUATION")]
        hn = [h for h in N.get("human_notes", []) if str(h.get("source_clause_id")) in ca and str(h.get("target_clause_id")) in cb]
        nd = [x for x in ndr if x["about"][0]["id"] in ca and x["about"][1]["id"] in cb]
        if [r for r in direct if r["status"] == "CONFIRMED"]: flag(2, f"두 절 사이에 CONFIRMED 직접 관계: {[r['id'] for r in direct if r['status'] == 'CONFIRMED']} — HSA3 의 NO_DIRECT_PARENTAGE 와 어긋남(연구자 확인)")
        if hn or nd: say(f"- **RECORDED**: human_notes {len(hn)}건 · NO_DIRECT_RELATION {len(nd)}건 ✓")
        else: say("- **NOT_RECORDED**: V1 human_notes·IF-1 issues 에 이 쌍의 명시적 판정이 없음. (HSA3 D/E 이음매 판정의 NO_DIRECT_PARENTAGE 는 V1 입력(frozen_human 2건)에 들어 있지 않음 — 정상. 가상 판정을 만들지 않음)")
        if direct and not [r for r in direct if r["status"] == "CONFIRMED"]: say(f"- 확정 아닌 후보 관계 {len(direct)}개 존재: {[(r['id'], r['status']) for r in direct]}")
    say(f"\n## 결론\n- 종료 코드 {status}: " + {0: "모두 통과 — 명세 확정·첫 승인 기록으로 갈 수 있음", 1: "사람이 볼 항목 있음(⚠)", 2: "실패 항목 있음(❌) — 변환기 수정 또는 자료 확인"}[status])
    say("- 다음: 연구자가 ⚠·❌ 항목을 보고, 괜찮으면 `pipeline/milal_approve.py` 로 승인 범위를 기록한다(자동 승인 없음).")
    if a.deploy:
        if status == 0:
            import shutil; os.makedirs(os.path.dirname(a.deploy) or ".", exist_ok=True); shutil.copyfile(a.out, a.deploy); say(f"- 배포: `{a.out}` → `{a.deploy}` (sha256 {sha(a.deploy)})")
        else: say(f"- 배포하지 않음: 검사 종료 코드 {status}. 작업 폴더의 파일만 남김(`{a.out}`)")
    finish(status)

if __name__ == "__main__":
    main()
