"""연구자 승인 기록 (분석 파일과 분리) — MILALWV-APPROVAL-1

- IF-1 파일은 건드리지 않는다. 승인은 별도 approvals.json 에 쌓인다.
- 자동으로 APPROVED 를 만들지 않는다: --approver, --status, --scope 를 사람이 직접 줘야 한다.
- 기록에는 승인 대상 IF-1 의 SHA-256, 원본 V1 관계망 SHA-256, MILAL 규칙 판·커밋, 승인자, 날짜, 범위, 상태, 비고.
- 파일이 바뀌면(해시 불일치) 기록은 그 파일에 적용되지 않는다 → 앱은 UNREVIEWED 로 본다.
- TEST_ONLY 파일에는 어떤 기록(APPROVED·PARTIAL·REJECTED)도 만들지 않는다 — 연구 승인 대상이 아니다.
- 기록이 여러 건이면 우선순위는 app/approval.js 와 같다(날짜 오름차순, 뒤가 앞을 덮음; 부분 기각은 예외로 남음). --check 가 효력을 보여 준다.
- 승인자 이름은 입력 문자열이다(신원 증명 아님).

쓰는 법:
  python3 milal_approve.py <IF-1 json> <approvals.json> --approver <이름> --status APPROVED|PARTIAL|REJECTED
        --scope ALL | RELATIONS:<id1,id2,…> | CHAPTERS:<from>-<to> | RULES:<G1,G2,…>[@<from>-<to>] | KINDS:<SUBORDINATE,…>[@<from>-<to>] [--note "…"] [--date YYYY-MM-DD]
  python3 milal_approve.py <IF-1 json> <approvals.json> --check     # 이 파일에 적용되는 기록 보기
"""
import sys, json, hashlib, argparse, datetime, os

def sha(path): return hashlib.sha256(open(path, "rb").read()).hexdigest()

def applicable(D_path, A):
    h = sha(D_path); return [r for r in A.get("records", []) if r.get("if1_sha256") == h]

def rel_chapters(D):
    """관계 id → [최소 장, 최대 장] (source·target 의 절, 묶음이면 묶음의 절 전부)"""
    node = {n["id"]: n for n in D.get("nodes", [])}; grp = {g["id"]: g for g in D.get("groups", [])}
    def chs(e):
        ids = grp.get(e["id"], {}).get("members", []) if e.get("type") == "group" else [e["id"]]
        return [node[c]["ch"] for c in ids if c in node and node[c].get("ch") is not None]
    out = {}
    for r in D.get("relations", []):
        cs = chs(r["source"]) + chs(r["target"])
        if cs: out[r["id"]] = [min(cs), max(cs)]
    return out

def resolve(records, file_sha, file_status, rel_ids, chapters_of, rule_of=lambda i: None, kind_of=lambda i: None):
    """app/approval.js 의 approvalResolve 와 같은 규칙. 반환 {status, approved:set, applied:[...], ignored:[(rec, why)]}"""
    out = {"status": "UNREVIEWED", "approved": set(), "applied": [], "ignored": []}
    if file_status == "TEST_ONLY":
        out["status"] = "TEST_ONLY"; out["ignored"] = [(r, "TEST_ONLY 파일에는 승인 기록을 적용하지 않음") for r in records]; return out
    recs = []
    for i, r in enumerate(records):
        if not isinstance(r, dict): out["ignored"].append((r, "형식 아님")); continue
        if r.get("if1_sha256") != file_sha: out["ignored"].append((r, "파일 해시가 다름")); continue
        sc = r.get("scope") or {}
        if r.get("status") not in ("APPROVED", "PARTIAL", "REJECTED") or not sc.get("type"): out["ignored"].append((r, "status/scope 없음")); continue
        if r["status"] == "APPROVED" and sc["type"] != "ALL": out["ignored"].append((r, "APPROVED 는 scope ALL 일 때만")); continue
        if r["status"] == "PARTIAL" and sc["type"] == "ALL": out["ignored"].append((r, "PARTIAL 은 범위가 있어야 함")); continue
        recs.append((str(r.get("date", "")), i, r))
    recs.sort(key=lambda t: (t[0], t[1]))
    def in_range(rid, ch):
        c = chapters_of(rid); return bool(c) and c[0] >= ch[0] and c[1] <= ch[1]
    def ids_of(sc):
        if sc["type"] == "RELATIONS": return [x for x in sc.get("relation_ids", []) if x in rel_ids]
        if sc["type"] == "CHAPTERS": return [x for x in rel_ids if in_range(x, sc.get("chapters", [0, -1]))]
        if sc["type"] == "RULES": return [x for x in rel_ids if rule_of(x) in sc.get("rule_ids", []) and (not sc.get("chapters") or in_range(x, sc["chapters"]))]
        if sc["type"] == "KINDS": return [x for x in rel_ids if kind_of(x) in sc.get("kinds", []) and (not sc.get("chapters") or in_range(x, sc["chapters"]))]
        return []
    all_, ok, rej = None, set(), set()
    for _, _, r in recs:
        sc = r["scope"]
        if r["status"] == "APPROVED": all_ = "APPROVED"; rej.clear()
        elif r["status"] == "REJECTED" and sc["type"] == "ALL": all_ = "REJECTED"; ok.clear(); rej.clear()
        elif r["status"] == "PARTIAL":
            for x in ids_of(sc): ok.add(x); rej.discard(x)
        else:
            for x in ids_of(sc): rej.add(x); ok.discard(x)
        out["applied"].append(r)
    out["approved"] = {x for x in rel_ids if (all_ == "APPROVED" or x in ok) and x not in rej}
    n = len(out["approved"])
    out["status"] = "APPROVED" if rel_ids and n == len(rel_ids) else "PARTIAL" if n else "REJECTED" if all_ == "REJECTED" else "UNREVIEWED"
    out["all"] = all_; return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("if1"); ap.add_argument("approvals")
    ap.add_argument("--approver"); ap.add_argument("--status", choices=["APPROVED", "PARTIAL", "REJECTED"]); ap.add_argument("--scope")
    ap.add_argument("--note", default=""); ap.add_argument("--date"); ap.add_argument("--check", action="store_true"); a = ap.parse_args()
    D = json.load(open(a.if1, encoding="utf-8"))
    A = json.load(open(a.approvals, encoding="utf-8")) if os.path.exists(a.approvals) else {"schema": "MILALWV-APPROVAL-1", "records": []}
    if A.get("schema") != "MILALWV-APPROVAL-1": sys.exit("approvals 파일 규격이 다름")
    if a.check:
        rc = rel_chapters(D); rel_ids = [r["id"] for r in D.get("relations", [])]; RU = {r["id"]: r["rule"] for r in D.get("relations", [])}; KI = {r["id"]: r["kind"] for r in D.get("relations", [])}
        R = resolve(A.get("records", []), sha(a.if1), D.get("file_status"), rel_ids, lambda i: rc.get(i), lambda i: RU.get(i), lambda i: KI.get(i))
        print(f"IF-1 sha256 {sha(a.if1)}  file_status {D.get('file_status')}\n효력: {R['status']}  승인된 관계 {len(R['approved'])}/{len(rel_ids)}\n적용된 기록 {len(R['applied'])}개 (날짜 순):")
        for r in R["applied"]: print("  ", r.get("date"), r.get("status"), json.dumps(r.get("scope"), ensure_ascii=False), "· 기록된 이름:", r.get("approver"))
        for r, why in R["ignored"]: print("   (적용 안 됨:", why, ")", r.get("id") if isinstance(r, dict) else r)
        # 규칙별 요약: 연구자가 관계 하나하나가 아니라 규칙·범위 단위로 판단하도록
        from collections import Counter, defaultdict
        byrule = defaultdict(lambda: {"n": 0, "ok": 0, "st": Counter()})
        for r in D.get("relations", []): b = byrule[r["rule"]]; b["n"] += 1; b["ok"] += r["id"] in R["approved"]; b["st"][r["status"]] += 1
        print("규칙별 (승인됨/전체 · 상태):")
        for k in sorted(byrule): b = byrule[k]; print(f"   {k:28s} {b['ok']}/{b['n']}  {dict(b['st'])}")
        rej = [x for x in rel_ids if x not in R["approved"]]; print(f"승인 안 된(기각·유보) 관계 {len(rej)}개" + (": " + ", ".join(rej[:8]) + (" …" if len(rej) > 8 else "") if rej else ""))
        return
    if not (a.approver and a.status and a.scope): sys.exit("--approver, --status, --scope 가 모두 필요합니다 (자동 승인 없음)")
    if D.get("file_status") == "TEST_ONLY": sys.exit("TEST_ONLY 파일에는 승인·일부 승인·기각 기록을 만들지 않습니다 (연구 승인 대상이 아님)")
    sc = a.scope.split(":", 1)
    if sc[0] == "ALL": scope = {"type": "ALL"}
    elif sc[0] == "RELATIONS":
        ids = [x.strip() for x in sc[1].split(",") if x.strip()]; known = {r["id"] for r in D["relations"]}
        bad = [x for x in ids if x not in known]
        if bad: sys.exit("파일에 없는 관계 id: " + ", ".join(bad[:5]))
        scope = {"type": "RELATIONS", "relation_ids": ids}
    elif sc[0] == "CHAPTERS":
        f, t = sc[1].split("-"); scope = {"type": "CHAPTERS", "chapters": [int(f), int(t)]}
    elif sc[0] in ("RULES", "KINDS"):
        body, _, ch = sc[1].partition("@"); items = [x.strip() for x in body.split(",") if x.strip()]
        have = {r["rule"] for r in D["relations"]} if sc[0] == "RULES" else {r["kind"] for r in D["relations"]}
        bad = [x for x in items if x not in have]
        if bad: sys.exit(f"파일에 없는 {'규칙' if sc[0] == 'RULES' else '종류'}: " + ", ".join(bad[:5]) + " (있는 것: " + ", ".join(sorted(have)) + ")")
        scope = {"type": sc[0], ("rule_ids" if sc[0] == "RULES" else "kinds"): items}
        if ch: f, t = ch.split("-"); scope["chapters"] = [int(f), int(t)]
    else: sys.exit("scope 는 ALL | RELATIONS:… | CHAPTERS:a-b | RULES:G1,G2[@a-b] | KINDS:SUBORDINATE[@a-b]")
    if a.status == "APPROVED" and scope["type"] != "ALL": sys.exit("일부만 확인했으면 --status PARTIAL 로 적습니다. 전체 APPROVED 는 scope ALL 일 때만")
    if a.status == "PARTIAL" and scope["type"] == "ALL": sys.exit("PARTIAL 은 범위(RELATIONS:… · CHAPTERS:a-b · RULES:… · KINDS:…)가 있어야 합니다")
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
