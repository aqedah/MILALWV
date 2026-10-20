"""실제 MILAL V1 관계망 검증 — 작업 D 의 10단계를 한 번에 (MILAL 원본은 읽기만)

쓰는 법:
  python3 pipeline/milal_real_v1_check.py <V1 real 폴더> --review-zip <P2_REVIEW.zip> --commit <MILAL 커밋 해시>
         [--out study/milal/job.json] [--report docs/REPORT_real_v1_<날짜>.md] [--words study/words.json]
         [--anchor 37:20=500062>500065] [--no-direct 37:24>38:1]

단계: 1 V1 자체 검증 결과(V1_VALIDATION.md 게이트) 2 SHA-256·생성 코드 버전 3 V1→IF-1 변환 4 구조 보존·round-trip
      5 P2 규칙 근거 보존 6 BHSA 낱말·절·절 원자 대조(V1~V16) 7 화면 표시(수동 — 안내만) 8 관계 상태·방향·근거 대조
      9 차이 보고서 10 연구자 판단 필요 항목 분리 (+ 욥 37:20 연구자 판정, 37:24→38:1 비직접 판정 확인)
결과: 보고서 Markdown 과 종료 코드(0 모두 통과 / 1 사람이 볼 것 있음 / 2 실패)
"""
import sys, os, json, hashlib, argparse, subprocess, datetime, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True); return p.returncode, (p.stdout + p.stderr)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("v1dir"); ap.add_argument("--review-zip"); ap.add_argument("--commit", required=True)
    ap.add_argument("--out", default="study/milal/job.json"); ap.add_argument("--report"); ap.add_argument("--words", default="study/words.json")
    ap.add_argument("--anchor", action="append", default=["37:20=500062>500065"], help="장:절=모절id>자절id — 연구자 판정 관계가 있어야 하는 곳")
    ap.add_argument("--no-direct", action="append", default=["37:24>38:1"], help="장:절>장:절 — 직접 관계가 없다고 판정된 쌍")
    a = ap.parse_args(); V = a.v1dir; R = []; status = 0
    def say(s): R.append(s); print(s)
    def flag(level, s):
        nonlocal status; say(("❌ " if level == 2 else "⚠ ") + s); status = max(status, level)
    today = datetime.date.today().isoformat(); rep = a.report or f"docs/REPORT_real_v1_{today}.md"
    say(f"# 실제 MILAL V1 관계망 검증 — {today}\n\n- V1 폴더: `{V}`\n- MILAL 커밋: `{a.commit}`\n")

    # 1. V1 자체 검증
    say("## 1. V1 자체 검증 결과")
    vmd = os.path.join(V, "V1_VALIDATION.md")
    if os.path.exists(vmd):
        t = open(vmd, encoding="utf-8").read(); fails = re.findall(r"^.*\b(FAIL|ERROR)\b.*$", t, re.M)
        say(f"- `V1_VALIDATION.md` 있음, PASS {len(re.findall(r'PASS', t))}회, FAIL/ERROR {len(fails)}회")
        for f in fails[:10]: flag(2, "V1 게이트 실패: " + f.strip())
        if "BHSA cross-check" in t: say("- BHSA cross-check 줄: " + (re.search(r"BHSA cross-check[^\n]*", t).group(0)))
    else: flag(1, "V1_VALIDATION.md 없음 — 게이트 결과를 확인할 수 없음")

    # 2. 해시·코드 버전
    say("\n## 2. SHA-256 과 생성 코드 버전")
    netp = os.path.join(V, "V1_RELATION_NETWORK.json")
    if not os.path.exists(netp): flag(2, "V1_RELATION_NETWORK.json 없음"); open(rep, "w", encoding="utf-8").write("\n".join(R)); sys.exit(2)
    net_sha = sha(netp); say(f"- V1_RELATION_NETWORK.json sha256 `{net_sha}`")
    mp = os.path.join(V, "99_manifest_sha256.csv")
    if os.path.exists(mp):
        import csv; man = {r["path"]: r["sha256"] for r in csv.DictReader(open(mp, encoding="utf-8-sig"))}
        for k, v in man.items():
            fp = os.path.join(V, k)
            if os.path.exists(fp): (say if sha(fp) == v else lambda s: flag(2, s))(f"- manifest {k}: {'일치' if sha(fp) == v else '불일치!'}")
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
    cmd = [sys.executable, os.path.join(HERE, "milal_export_v1.py"), V, a.out, "--commit", a.commit, "--compare", cmpp] + (["--review-zip", a.review_zip] if a.review_zip else [])
    rc, outp = run(cmd); say(f"- 변환기 종료 코드 {rc}")
    C = json.load(open(cmpp, encoding="utf-8")) if os.path.exists(cmpp) else {}
    verdict = C.get("verdict", "?"); say(f"- 판정: **{verdict}**")
    if "FAIL" in verdict: flag(2, "구조 보존 실패 — 변환기를 실제 자료에 맞춰 고쳐야 함(원본 MILAL 은 안 바꿈). 상세: " + json.dumps(C.get("lost", C), ensure_ascii=False)[:800])
    elif "EVIDENCE_INCOMPLETE" in verdict: flag(1, "근거(P2 규칙 검사) 일부를 펼치지 못함 — P2_RULE_TRACE 와 V1 record 의 연결을 확인")
    if not C.get("roundtrip", {}).get("exact"): flag(1, "round-trip 이 정확히 같지 않음(구조는 보존). 다른 경로: " + json.dumps(C.get("roundtrip", {}).get("differences", [])[:5], ensure_ascii=False))
    for k, v in C.items():
        if k not in ("roundtrip", "verdict"): say(f"- {k}: {json.dumps(v, ensure_ascii=False)[:300]}")
    if not a.review_zip: flag(1, "--review-zip 없이 돌려서 근거가 비어 있음")

    # 6. BHSA 대조
    say("\n## 6. BHSA 낱말·절·절 원자 대조 (V1~V16)")
    rc, outp = run([sys.executable, os.path.join(HERE, "milal_check.py"), a.out, "--words", a.words])
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
    for spec in a.anchor:
        m = re.match(r"(\d+):(\d+)=(\d+)>(\d+)", spec)
        if not m: continue
        ch, vs, s_id, t_id = int(m[1]), int(m[2]), m[3], m[4]
        say(f"\n### 기준점 A — 욥 {ch}:{vs} 연구자 판정 ({s_id} → {t_id})")
        for cid in (s_id, t_id):
            n = node.get(cid); say(f"- 절 {cid}: " + (f"{n['ch']}:{n['vs']} `{n.get('text', '')[:40]}` 낱말 {len(n.get('word_ids', []))}개" if n else "**IF-1 에 없음**"))
            if not n: flag(2, f"기준 절 {cid} 가 변환 결과에 없음")
        hits = [r for r in D["relations"] if r["source"].get("id") == s_id and r["target"].get("id") == t_id]
        rev = [r for r in D["relations"] if r["source"].get("id") == t_id and r["target"].get("id") == s_id]
        if hits:
            for r in hits:
                evs = [ev[i] for i in r.get("evidence_ids", []) if i in ev]
                say(f"- 관계 `{r['id']}` {r['kind']} **{r['status']}** 규칙 {r['rule']} 기록 {r['record']} 근거 {len(evs)}개 (HUMAN {sum(1 for e in evs if e.get('outcome') == 'HUMAN')})")
                if r["status"] != "CONFIRMED": flag(1, f"기준점 관계가 CONFIRMED 가 아님({r['status']}) — 연구자 판정이 반영됐는지 V1 human_notes/frozen_human 확인")
                if not any(e.get("outcome") == "HUMAN" for e in evs): flag(1, "기준점 관계에 HUMAN 근거가 붙지 않음 — 변환기의 사람 판정 근거 연결 확인")
        elif rev: flag(2, f"방향이 뒤집힘: {t_id} → {s_id} 로 들어 있음 ({[r['id'] for r in rev]})")
        else: flag(2, f"{s_id} → {t_id} 관계가 없음 — V1 edges 에서 직접 찾기: " + json.dumps([e["edge_id"] for e in N["edges"] if str(e["source"].get("id")) == s_id and str(e["target"].get("id")) == t_id], ensure_ascii=False))
    for spec in a.no_direct:
        m = re.match(r"(\d+):(\d+)>(\d+):(\d+)", spec)
        if not m: continue
        A, B = (int(m[1]), int(m[2])), (int(m[3]), int(m[4])); say(f"\n### 기준점 B — 욥 {A[0]}:{A[1]} → {B[0]}:{B[1]} 직접 관계 없음(판정)")
        ca, cb = byref.get(A, []), byref.get(B, []); say(f"- {A[0]}:{A[1]} 절 {ca} · {B[0]}:{B[1]} 절 {cb}")
        direct = [r for r in D["relations"] if r["source"].get("id") in ca and r["target"].get("id") in cb and r["kind"] != "MEMBERSHIP"]
        nd = [s for s in ndr if s["about"][0]["id"] in ca and s["about"][1]["id"] in cb]
        if direct: flag(2, f"두 절 사이에 직접 관계가 있음: {[(r['id'], r['status']) for r in direct]} — 비직접 판정과 어긋남")
        else: say("- 두 절을 직접 잇는 HIERARCHY 관계 없음 ✓")
        if nd:
            for s in nd: say(f"- NO_DIRECT_RELATION `{s['id']}` 근거 {s['basis']} 기록 {s['record']} ✓")
        else: flag(1, "NO_DIRECT_RELATION 판정 항목이 이 쌍에 없음 — '관계가 없음'(모름)과 '없다고 판정함'은 다르다. V1 human_notes 에 해당 기각이 있는지 확인")
        grp = [g for g in D["groups"] if any(c in g["members"] for c in ca) and any(c in g["members"] for c in cb)]
        if grp: say(f"- 두 절이 같은 묶음에 들어 있음: {[g['id'] for g in grp]} (묶음 소속은 직접 모절 관계와 별개)")

    say(f"\n## 결론\n- 종료 코드 {status}: " + {0: "모두 통과 — 명세 확정·첫 승인 기록으로 갈 수 있음", 1: "사람이 볼 항목 있음(⚠)", 2: "실패 항목 있음(❌) — 변환기 수정 또는 자료 확인"}[status])
    say("- 다음: 연구자가 ⚠·❌ 항목을 보고, 괜찮으면 `pipeline/milal_approve.py` 로 승인 범위를 기록한다(자동 승인 없음).")
    os.makedirs(os.path.dirname(rep) or ".", exist_ok=True); open(rep, "w", encoding="utf-8").write("\n".join(R) + "\n"); print("\n보고서:", rep); sys.exit(status)

if __name__ == "__main__":
    main()
