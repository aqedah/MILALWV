"""승인 기록 우선순위 시험 — Python(resolve)과 JS(app/approval.js)가 같은 답을 내는지.
실행: python3 pipeline/milal_approve_tests.py   (node 가 있으면 JS 도 같이 돈다)"""
import json, subprocess, sys, os, shutil
sys.path.insert(0, os.path.dirname(__file__))
from milal_approve import resolve

SHA = "a" * 64
REL = ["R1", "R2", "R3", "R4"]                  # R1·R2: 32장, R3: 33장, R4: 32–34장(걸침)
CH = {"R1": [32, 32], "R2": [32, 32], "R3": [33, 33], "R4": [32, 34]}
def rec(status, scope, date, sha=SHA, who="연구자"): return {"id": f"{status}-{date}", "if1_sha256": sha, "status": status, "scope": scope, "date": date, "approver": who}
ALL, R = {"type": "ALL"}, lambda *ids: {"type": "RELATIONS", "relation_ids": list(ids)}
C = lambda a, b: {"type": "CHAPTERS", "chapters": [a, b]}

CASES = [
 ("기록 없음", [], "REAL", "UNREVIEWED", []),
 ("전체 승인", [rec("APPROVED", ALL, "2026-10-01")], "REAL", "APPROVED", REL),
 ("해시 다른 기록은 무시(파일이 바뀌면 승인 무효)", [rec("APPROVED", ALL, "2026-10-01", sha="b" * 64)], "REAL", "UNREVIEWED", []),
 ("TEST_ONLY 는 어떤 기록도 적용 안 함", [rec("APPROVED", ALL, "2026-10-01"), rec("PARTIAL", R("R1"), "2026-10-02")], "TEST_ONLY", "TEST_ONLY", []),
 ("관계 일부 승인", [rec("PARTIAL", R("R1", "R3"), "2026-10-01")], "REAL", "PARTIAL", ["R1", "R3"]),
 ("장 범위 일부 승인(32장만: 걸친 R4 는 제외)", [rec("PARTIAL", C(32, 32), "2026-10-01")], "REAL", "PARTIAL", ["R1", "R2"]),
 ("장 범위 32–34 (걸친 R4 포함)", [rec("PARTIAL", C(32, 34), "2026-10-01")], "REAL", "APPROVED", REL),
 ("승인 뒤 전체 기각 → 기각", [rec("APPROVED", ALL, "2026-10-01"), rec("REJECTED", ALL, "2026-10-02")], "REAL", "REJECTED", []),
 ("기각 뒤 전체 승인 → 승인(뒤가 이김)", [rec("REJECTED", ALL, "2026-10-01"), rec("APPROVED", ALL, "2026-10-02")], "REAL", "APPROVED", REL),
 ("파일 순서가 날짜와 달라도 날짜 순", [rec("APPROVED", ALL, "2026-10-05"), rec("REJECTED", ALL, "2026-10-02")], "REAL", "APPROVED", REL),
 ("같은 날짜는 파일 순서", [rec("APPROVED", ALL, "2026-10-02"), rec("REJECTED", ALL, "2026-10-02")], "REAL", "REJECTED", []),
 ("전체 승인 뒤 관계 하나 기각 → 일부", [rec("APPROVED", ALL, "2026-10-01"), rec("REJECTED", R("R2"), "2026-10-02")], "REAL", "PARTIAL", ["R1", "R3", "R4"]),
 ("기각 예외 뒤 재승인(PARTIAL) → 전체", [rec("APPROVED", ALL, "2026-10-01"), rec("REJECTED", R("R2"), "2026-10-02"), rec("PARTIAL", R("R2"), "2026-10-03")], "REAL", "APPROVED", REL),
 ("일부 승인 뒤 전체 기각은 일부 승인을 지움", [rec("PARTIAL", R("R1"), "2026-10-01"), rec("REJECTED", ALL, "2026-10-02")], "REAL", "REJECTED", []),
 ("전체 기각 뒤 일부 승인 → 일부", [rec("REJECTED", ALL, "2026-10-01"), rec("PARTIAL", C(33, 33), "2026-10-02")], "REAL", "PARTIAL", ["R3"]),
 ("장 범위 기각이 장 범위 승인을 깎음", [rec("PARTIAL", C(32, 34), "2026-10-01"), rec("REJECTED", C(33, 33), "2026-10-02")], "REAL", "PARTIAL", ["R1", "R2", "R4"]),
 ("APPROVED 에 범위가 있으면 무시", [rec("APPROVED", R("R1"), "2026-10-01")], "REAL", "UNREVIEWED", []),
 ("PARTIAL 에 범위가 없으면 무시", [rec("PARTIAL", ALL, "2026-10-01")], "REAL", "UNREVIEWED", []),
 ("모르는 관계 id 는 무시(나머지는 적용)", [rec("PARTIAL", R("R9", "R1"), "2026-10-01")], "REAL", "PARTIAL", ["R1"]),
]

def run_py():
    bad = 0
    for name, recs, fs, st, ok in CASES:
        r = resolve(recs, SHA, fs, REL, lambda i: CH.get(i))
        good = r["status"] == st and r["approved"] == set(ok)
        print(("PASS" if good else "FAIL"), "py ·", name, "" if good else f"(기대 {st} {sorted(ok)}, 실제 {r['status']} {sorted(r['approved'])})"); bad += not good
    return bad

def run_js():
    if not shutil.which("node"): print("node 없음 — JS 시험 건너뜀"); return 0
    js = f"""const {{approvalResolve}}=require({json.dumps(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app', 'approval.js')))});
const CASES={json.dumps(CASES, ensure_ascii=False)}, CH={json.dumps(CH)}, REL={json.dumps(REL)}, SHA={json.dumps(SHA)}; let bad=0;
for(const [name,recs,fs,st,ok] of CASES){{ const r=approvalResolve(recs,{{fileSha:SHA,fileStatus:fs,relIds:REL,chaptersOf:i=>CH[i]||null}}); const got=[...r.approvedRel].sort(); const good=r.status===st&&JSON.stringify(got)===JSON.stringify([...ok].sort()); console.log((good?"PASS":"FAIL")+" js · "+name+(good?"":` (기대 ${{st}} ${{ok}}, 실제 ${{r.status}} ${{got}})`)); if(!good) bad++; }}
process.exit(bad?1:0);"""
    p = subprocess.run(["node", "-e", js], capture_output=True, text=True); print(p.stdout.strip()); print(p.stderr.strip())
    return p.returncode

if __name__ == "__main__":
    b = run_py() + run_js(); print("모두 통과" if not b else f"실패 {b}"); sys.exit(1 if b else 0)
