"""연구자 승인 기록 (분석 파일과 분리) — MILALWV-APPROVAL-1

- IF-1 파일은 건드리지 않는다. 승인은 별도 approvals.json 에 쌓인다.
- 자동으로 APPROVED 를 만들지 않는다: --approver, --status, --scope 를 사람이 직접 줘야 한다.
- 기록에는 승인 대상 IF-1 의 SHA-256, 원본 V1 관계망 SHA-256, MILAL 규칙 판·커밋, 승인자, 날짜, 범위, 상태, 비고.
- 파일이 바뀌면(해시 불일치) 기록은 그 파일에 적용되지 않는다 → 앱은 UNREVIEWED 로 본다.

쓰는 법:
  python3 milal_approve.py <IF-1 json> <approvals.json> --approver <이름> --status APPROVED|PARTIAL|REJECTED
        --scope ALL | RELATIONS:<id1,id2,…> | CHAPTERS:<from>-<to> [--note "…"] [--date YYYY-MM-DD]
  python3 milal_approve.py <IF-1 json> <approvals.json> --check     # 이 파일에 적용되는 기록 보기
"""
import sys, json, hashlib, argparse, datetime, os

def sha(path): return hashlib.sha256(open(path, "rb").read()).hexdigest()

def applicable(D_path, A):
    h = sha(D_path); return [r for r in A.get("records", []) if r.get("if1_sha256") == h]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("if1"); ap.add_argument("approvals")
    ap.add_argument("--approver"); ap.add_argument("--status", choices=["APPROVED", "PARTIAL", "REJECTED"]); ap.add_argument("--scope")
    ap.add_argument("--note", default=""); ap.add_argument("--date"); ap.add_argument("--check", action="store_true"); a = ap.parse_args()
    D = json.load(open(a.if1, encoding="utf-8"))
    A = json.load(open(a.approvals, encoding="utf-8")) if os.path.exists(a.approvals) else {"schema": "MILALWV-APPROVAL-1", "records": []}
    if A.get("schema") != "MILALWV-APPROVAL-1": sys.exit("approvals 파일 규격이 다름")
    if a.check:
        L = applicable(a.if1, A); print(f"IF-1 sha256 {sha(a.if1)}\n적용되는 기록 {len(L)}개"); [print(json.dumps(r, ensure_ascii=False)) for r in L]; return
    if not (a.approver and a.status and a.scope): sys.exit("--approver, --status, --scope 가 모두 필요합니다 (자동 승인 없음)")
    if D.get("file_status") == "TEST_ONLY" and a.status == "APPROVED": sys.exit("TEST_ONLY 파일은 승인 대상이 아닙니다")
    sc = a.scope.split(":", 1)
    if sc[0] == "ALL": scope = {"type": "ALL"}
    elif sc[0] == "RELATIONS":
        ids = [x.strip() for x in sc[1].split(",") if x.strip()]; known = {r["id"] for r in D["relations"]}
        bad = [x for x in ids if x not in known]
        if bad: sys.exit("파일에 없는 관계 id: " + ", ".join(bad[:5]))
        scope = {"type": "RELATIONS", "relation_ids": ids}
    elif sc[0] == "CHAPTERS":
        f, t = sc[1].split("-"); scope = {"type": "CHAPTERS", "chapters": [int(f), int(t)]}
    else: sys.exit("scope 는 ALL | RELATIONS:… | CHAPTERS:a-b")
    if a.status == "APPROVED" and scope["type"] != "ALL": sys.exit("일부만 확인했으면 --status PARTIAL 로 적습니다. 전체 APPROVED 는 scope ALL 일 때만")
    rec = {"id": "APR-" + hashlib.sha256((sha(a.if1) + a.approver + (a.date or datetime.date.today().isoformat()) + a.scope).encode()).hexdigest()[:12],
           "if1_file": os.path.basename(a.if1), "if1_sha256": sha(a.if1), "if1_file_status": D.get("file_status"),
           "v1_network_sha256": D["source"]["milal"].get("network_sha256", ""),
           "milal": {"stage": D["source"]["milal"].get("stage", ""), "rules_version": D["source"]["milal"].get("rules_version", ""), "commit": D["source"]["milal"].get("commit", "")},
           "approver": a.approver, "date": a.date or datetime.date.today().isoformat(), "scope": scope, "status": a.status, "note": a.note}
    A["records"].append(rec)
    json.dump(A, open(a.approvals, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("기록함:", json.dumps(rec, ensure_ascii=False))

if __name__ == "__main__":
    main()
