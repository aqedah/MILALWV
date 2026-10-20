"""MILAL V1 관계망(V1_RELATION_NETWORK.json) → MILALWV-IF-1 변환기 (읽기 전용)

- MILAL 코드·규칙·파일을 바꾸지 않는다. MILAL 코드를 import 하지 않고 파일만 읽는다.
- V1의 절·묶음·관계·대안·미배정·사람 결정 기록을 하나도 버리지 않는다.
- BHSA 원 관계(rule 이 "BHSA clause_atom rela=" 로 시작하는 edge)는 relations 가 아니라 native_relations 로 보내되,
  원본 edge_id 를 origin_edge_id 에 남긴다.
- 새 학문적 판단을 만들지 않는다. NO_DIRECT_RELATION 은 사람 결정 기록(frozen_human)의 REJECTED 가
  '직접 모절 관계 없음'을 뜻하는 **그 후보 쌍**에 대해서만 낸다.
- 근거(evidence)는 P2_REVIEW.zip 의 P2_RULE_TRACE.csv 를 주었을 때만 검사 항목별로 펼친다. 없으면 비워 두고 보고한다.

쓰는 법:
  python3 milal_export_v1.py <V1 real 폴더> <출력 json> [--review-zip P2_REVIEW.zip] [--commit <MILAL 커밋>]
                             [--generated-at ISO8601] [--test-only] [--compare <비교 보고 json>]
  --test-only 를 주면 file_status=TEST_ONLY (합성·시험 입력). 실제 출력은 --commit 이 반드시 있어야 한다.
"""
import sys, json, csv, io, os, argparse, hashlib, zipfile, datetime
from collections import Counter, defaultdict

KINDS = {"SUBORDINATE": "HIERARCHY", "FRAME_CONTENT": "HIERARCHY", "CONTINUATION": "HIERARCHY",
         "PARALLEL": "GROUPING", "MEMBERSHIP": "GROUPING", "CLOSURE": "CLOSURE"}
NATIVE_PREFIX = "BHSA clause_atom rela="

def read_csv(text):
    csv.field_size_limit(2 ** 31 - 1); return list(csv.DictReader(io.StringIO(text)))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("v1dir"); ap.add_argument("out")
    ap.add_argument("--review-zip"); ap.add_argument("--commit"); ap.add_argument("--generated-at")
    ap.add_argument("--test-only", action="store_true"); ap.add_argument("--compare")
    a = ap.parse_args()
    netp = os.path.join(a.v1dir, "V1_RELATION_NETWORK.json")
    N = json.load(open(netp, encoding="utf-8"))
    M = json.load(open(os.path.join(a.v1dir, "90_run_metadata.json"), encoding="utf-8")) if os.path.exists(os.path.join(a.v1dir, "90_run_metadata.json")) else {}
    manifest = {}
    mp = os.path.join(a.v1dir, "99_manifest_sha256.csv")
    if os.path.exists(mp): manifest = {r["path"]: r["sha256"] for r in read_csv(open(mp, encoding="utf-8-sig").read())}
    net_sha = hashlib.sha256(open(netp, "rb").read()).hexdigest()
    if manifest.get("V1_RELATION_NETWORK.json") and manifest["V1_RELATION_NETWORK.json"] != net_sha:
        sys.exit("manifest 의 V1_RELATION_NETWORK.json 해시가 파일과 다름 — 손상되었거나 다른 실행의 파일")
    if N.get("schema") != "MILAL-V1-RELATION-NETWORK-1": sys.exit("입력이 MILAL-V1-RELATION-NETWORK-1 이 아님: " + str(N.get("schema")))
    if not a.test_only and not a.commit: sys.exit("실제 출력에는 --commit <MILAL 저장소 커밋> 이 필요합니다 (출처 추적). 합성·시험 입력이면 --test-only")

    # ---- 근거 원천: rule trace (선택) ----
    traces = {}; raw_clauses = {}; zip_sha = None
    if a.review_zip:
        raw = open(a.review_zip, "rb").read(); zip_sha = hashlib.sha256(raw).hexdigest()
        z = zipfile.ZipFile(io.BytesIO(raw))
        for r in read_csv(z.read("P2_RULE_TRACE.csv").decode("utf-8")):
            p = json.loads(r["payload"]); tid = p.get("trace_id") or p.get("context_id")
            if tid: traces[tid] = p
        rel = json.loads(z.read("P2_RELATIONS_AND_ALTERNATIVES.json"))
        for rc in rel.get("raw_clauses", []): raw_clauses[str(rc["clause_id"])] = rc
        for c in rel.get("context_relations", []): traces.setdefault(c["context_id"], dict(c, trace_id=c["context_id"], rule_id="G5", status=c["status"]))
        if N.get("source", {}).get("zip_sha256") and N["source"]["zip_sha256"] != zip_sha:
            sys.exit("--review-zip 이 V1 이 읽은 P2_REVIEW.zip 과 다름 (sha256 불일치)")

    gen_at = a.generated_at or datetime.datetime.fromtimestamp(os.path.getmtime(netp), datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    clauses = N["clauses"]; books = sorted({c.get("book") for c in (raw_clauses.values() or []) if c.get("book")}) or ["Iob"]
    chs = [c["ch"] for c in clauses]
    out = {"schema": "MILALWV-IF-1", "file_status": "TEST_ONLY" if a.test_only else "MILAL_OUTPUT",
           "review": {"status": "UNREVIEWED", "note": "연구자 승인 전 — 화면에 '승인 전'으로 표시"},
           "source": {"schema_version": "MILALWV-IF-1", "bhsa_version": "2021",
                      "milal": {"stage": N.get("stage", M.get("stage", "")), "rules_version": "MFR.0.3", "commit": a.commit or "",
                                "network_schema": N.get("schema"), "network_sha256": net_sha, "v1_fingerprint": M.get("v1_fingerprint", ""),
                                "input_receipt": N.get("source", {}), "review_zip_sha256": zip_sha},
                      "generated_at": gen_at, "scope": {"book": "Job", "bhsa_book": books[0], "chapters": [min(chs), max(chs)] if chs else [0, 0]},
                      "scientific_status": M.get("scientific_status", ""), "exporter": "pipeline/milal_export_v1.py 1.0"},
           "nodes": [], "groups": [], "relations": [], "evidence": [], "issues": [], "notes": [], "native_relations": []}
    if a.test_only: out["source"]["test_note"] = "MILAL V1 자체 시험(--self-test)의 합성 관계망을 변환한 것. 실제 욥기 판정이 아님."
    # V1 의 머리 칸들은 그대로 보존 (round-trip 복원용). 화면은 쓰지 않는다
    out["source"]["milal"]["v1_passthrough"] = {k: N[k] for k in ("schema", "stage", "source", "p2_contract", "legend", "counts", "base_group_ids", "rule_notes_trace_ids") if k in N}
    # origin_ids 가 절 id 인지 낱말 id 인지: P2 raw_clauses 로 판별 (숫자라는 이유로 절이라 하지 않음)
    clause_ids_set = {str(c["id"]) for c in clauses}; word_ids_set = {int(w) for c in clauses for w in c["word_ids"]}

    # ---- nodes ----
    for c in clauses:
        n = {k: c[k] for k in ("id", "pos", "ch", "vs", "type", "text", "domain", "word_ids", "native_self_annotations", "ref") if k in c}
        n["id"] = str(n["id"]); n["word_ids"] = [int(x) for x in n["word_ids"]]
        rc = raw_clauses.get(n["id"])
        if rc and rc.get("atoms"): n["clause_atom_ids"] = [int(x["node"]) for x in rc["atoms"] if "node" in x]
        extra = {k: v for k, v in c.items() if k not in n}
        if extra: n["meta"] = extra
        out["nodes"].append(n)
    # ---- groups (칸 그대로) ----
    for g in N["groups"]:
        gg = dict(g); gg["members"] = [str(m) for m in gg["members"]]; out["groups"].append(gg)
    # ---- evidence 펼치기 ----
    ev_index = {}
    def evidence_for(edge):
        rec = edge["record"]; ids = []
        def classify(origin):
            obs = {"clause_ids": [], "word_ids": [], "other_ids": []}
            for x in origin or []:
                s = str(x)
                if s in clause_ids_set: obs["clause_ids"].append(s)
                elif s.isdigit() and int(s) in word_ids_set: obs["word_ids"].append(int(s))
                else: obs["other_ids"].append(s)
            return {k: v for k, v in obs.items() if v}
        def add(rule, check, outcome, text, origin, trace_rec):
            eid = "EV-" + hashlib.sha256(("|".join([rule, check, outcome, trace_rec["table"], trace_rec["id"]])).encode()).hexdigest()[:16]
            if eid not in ev_index:
                ev_index[eid] = {"id": eid, "rule_id": rule, "check": check, "outcome": outcome,
                                 "observed": classify(origin), "text": text, "record": trace_rec}
                out["evidence"].append(ev_index[eid])
            ids.append(eid)
        tids = []
        if rec["table"] == "graph.assertions": tids = list(edge.get("proposal_ids", []))
        elif rec["table"] in ("P2_RULE_TRACE", "context_relations"): tids = [rec["id"]]
        for tid in tids:
            t = traces.get(tid)
            if not t: continue
            trec = {"table": "P2_RULE_TRACE" if rec["table"] != "context_relations" else "context_relations", "id": tid}
            cl = t.get("origin_ids", [])
            name = t.get("relation", t.get("rule_id", ""))
            lists = [t.get("passed_checks", []), t.get("failed_checks", []), t.get("unresolved_checks", [])]
            if not any(lists):   # 검사 항목 이름이 없으면 trace 의 status 그대로 한 항목
                st_ = t.get("status", "UNRESOLVED"); oc = st_ if st_ in ("PASSED", "FAILED", "UNRESOLVED") else "UNRESOLVED"
                add(t.get("rule_id", ""), name, oc, f"{name} {dict(PASSED='통과', FAILED='실패', UNRESOLVED='미결')[oc]} (검사 항목 이름 없음)", cl, trec)
            for ch in t.get("passed_checks", []): add(t.get("rule_id", ""), ch, "PASSED", f"{name}: {ch} 통과", cl, trec)
            for ch in t.get("failed_checks", []): add(t.get("rule_id", ""), ch, "FAILED", f"{name}: {ch} 실패", cl, trec)
            for ch in t.get("unresolved_checks", []): add(t.get("rule_id", ""), ch, "UNRESOLVED", f"{name}: {ch} 미결", cl, trec)
        if rec["table"] == "frozen_typed_relations":
            add(edge["rule"].split(" ")[0], edge["rule"].split(" ", 1)[1] if " " in edge["rule"] else "", "PASSED", edge.get("note", ""), edge.get("evidence_clause_ids", []), rec)
        if rec["table"] == "frozen_human":
            add("HUMAN", edge["rule"].replace("HUMAN ", ""), "HUMAN", edge.get("note", ""), edge.get("evidence_clause_ids", []), rec)
        return ids
    # ---- edges → relations / native_relations ----
    for e in N["edges"]:
        base_keys = ("edge_id", "kind", "status", "source", "target", "rule", "record", "evidence_clause_ids", "note")
        extra = {k: v for k, v in e.items() if k not in base_keys}
        if e["rule"].startswith(NATIVE_PREFIX):
            nr = {"id": "NAT-" + e["edge_id"], "origin_edge_id": e["edge_id"], "rela": extra.get("rela", e["rule"][len(NATIVE_PREFIX):]),
                  "rela_level": "clause", "clause_id": str(e["target"]["id"]), "mother_clause_id": str(e["source"]["id"]),
                  "clause_atom": None, "mother_clause_atom": None, "atom_resolution": "NOT_AVAILABLE_IN_V1",   # 절 원자 번호는 복원한 것이 아님
                  "annotation_indexes": extra.get("annotation_indexes", []),
                  "origin_status": e["status"], "origin_kind": e["kind"], "note": e.get("note", ""), "origin_rule": e["rule"],
                  "origin_evidence_clause_ids": [str(x) for x in e.get("evidence_clause_ids", [])],
                  "origin_extra": {k: v for k, v in extra.items() if k not in ("rela", "annotation_indexes")},
                  "source": {"dataset": "BHSA", "version": "2021", "features": ["mother", "rela"]}, "record": e["record"]}
            # 절 원자 번호 복원: V1 에는 없지만 V1 이 읽은 P2_REVIEW.zip 의 raw_clauses.native_annotations(동결 자료)에는
            # dependent_node/head_node(BHSA 노드 번호)가 그대로 있다. 기록 id "절id#색인" 으로 되찾는다. 새 판정 아님 — 같은 원자료의 노드 번호.
            rc = raw_clauses.get(nr["clause_id"]); anns = ((rc or {}).get("CLAUSE") or {}).get("native_annotations") or []
            picked = [anns[i] for i in nr["annotation_indexes"] if isinstance(i, int) and 0 <= i < len(anns) and isinstance(anns[i], dict)]
            if picked and "dependent_node" in picked[0]:
                an = picked[0]; dep, head = an.get("dependent_node"), an.get("head_node")
                nr["bhsa_nodes"] = {"dependent": dep, "head": head, "rela": an.get("rela"), "resolution": an.get("resolution"), "all": [{"dependent": x.get("dependent_node"), "head": x.get("head_node"), "rela": x.get("rela")} for x in picked]}
                ca_set = {at["node"] for c in raw_clauses.values() for at in ((c.get("CLAUSE") or {}).get("atoms") or []) if isinstance(at, dict) and "node" in at}
                if dep in ca_set and head in ca_set: nr["clause_atom"], nr["mother_clause_atom"], nr["atom_resolution"] = dep, head, "FROM_P2_REVIEW_NATIVE_ANNOTATIONS"
                elif dep in ca_set: nr["clause_atom"], nr["atom_resolution"] = dep, "DEPENDENT_ATOM_ONLY(head is not clause_atom)"
                else: nr["atom_resolution"] = "CLAUSE_OR_PHRASE_LEVEL(no clause_atom nodes)"
            out["native_relations"].append(nr); continue
        r = {"id": e["edge_id"], "family": KINDS[e["kind"]], "kind": e["kind"], "status": e["status"], "source": e["source"], "target": e["target"],
             "rule": e["rule"], "record": e["record"], "evidence_clause_ids": [str(x) for x in e.get("evidence_clause_ids", [])],
             "evidence_ids": evidence_for(e), "note": e.get("note", "")}
        if extra: r["extra"] = extra
        out["relations"].append(r)
    # ---- issues ----
    for alt in N.get("alternatives", []):
        s = {"id": alt["alternative_id"], "kind": "ALTERNATIVE_SET", "subkind": alt["kind"], "options": [str(o) for o in alt["options"]],
             "competing": bool(alt.get("competing")), "note": alt.get("note", "")}
        if alt.get("clause_id"): s["about"] = {"type": "clause", "id": str(alt["clause_id"])}
        out["issues"].append(s)
    for cid in N.get("unassigned_clause_ids", []):
        out["issues"].append({"id": "ISS-UNA-" + str(cid), "kind": "UNASSIGNED_CLAUSE", "about": {"type": "clause", "id": str(cid)}})
    for g in N["groups"]:
        for rn in g.get("rule_notes", []):
            if rn.get("unresolved"):
                out["issues"].append({"id": "ISS-UNR-" + str(rn.get("trace_id", g["id"])) + "-" + g["id"], "kind": "UNRESOLVED", "about": {"type": "group", "id": g["id"]},
                                      "rule_id": rn["rule"], "unresolved_checks": list(rn["unresolved"]), "record": {"table": "P2_RULE_TRACE", "id": str(rn.get("trace_id", ""))},
                                      "note": "규칙 평가 미결 (FAILED 항목은 groups.rule_notes 에 그대로)"})
    # 사람 결정 메모 → notes; '직접 모절 아님' 기각은 그 후보 쌍에 한해 NO_DIRECT_RELATION
    for h in N.get("human_notes", []):
        out["notes"].append(dict(h))
        eff = str(h.get("effect", "")) + " " + str(h.get("decision", ""))
        if "NO_DIRECT" in eff or "REJECTED_AS_DIRECT_MOTHER" in eff:
            out["issues"].append({"id": "ISS-NDR-" + h["record"]["id"].replace("#", "-"), "kind": "NO_DIRECT_RELATION",
                                  "about": [{"type": "clause", "id": str(h["source_clause_id"])}, {"type": "clause", "id": str(h["target_clause_id"])}],
                                  "basis": {"kind": "HUMAN_DECISION", "decision": str(h.get("decision", "")), "judgment_id": h["record"]["id"].split("#")[0], "rationale_code": str(h.get("rationale_code", ""))},
                                  "record": h["record"], "note": "연구자가 이 후보(source)를 target 의 직접 모절로 기각함. 다른 연결의 유무는 말하지 않음"})
    json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # ---- 비교 보고: 손실·생성 ----
    v1_ids = {e["edge_id"] for e in N["edges"]}
    out_ids = {r["id"] for r in out["relations"]} | {x["origin_edge_id"] for x in out["native_relations"]}
    by_status_v1 = Counter(e["status"] for e in N["edges"] if not e["rule"].startswith(NATIVE_PREFIX)); by_status_out = Counter(r["status"] for r in out["relations"])
    dir_ok = all(any(r["id"] == e["edge_id"] and r["source"] == e["source"] and r["target"] == e["target"] for r in out["relations"]) for e in N["edges"] if not e["rule"].startswith(NATIVE_PREFIX))
    ev_ok = all(x in ev_index for r in out["relations"] for x in r["evidence_ids"])
    edges_with_trace = [e for e in N["edges"] if not e["rule"].startswith(NATIVE_PREFIX) and e["record"]["table"] in ("graph.assertions", "P2_RULE_TRACE", "context_relations")]
    rel_no_ev = [r["id"] for r in out["relations"] if not r["evidence_ids"]]
    cmp = {"input": {"file": netp, "network_sha256": net_sha, "stage": N.get("stage"), "review_zip": a.review_zip, "review_zip_sha256": zip_sha},
           "counts": {"clauses": [len(N["clauses"]), len(out["nodes"])], "groups": [len(N["groups"]), len(out["groups"])],
                      "edges_total": len(N["edges"]), "relations": len(out["relations"]), "native_relations": len(out["native_relations"]),
                      "relations+native == edges": len(out["relations"]) + len(out["native_relations"]) == len(N["edges"]),
                      "alternatives": [len(N.get("alternatives", [])), sum(1 for s in out["issues"] if s["kind"] == "ALTERNATIVE_SET")],
                      "unassigned": [len(N.get("unassigned_clause_ids", [])), sum(1 for s in out["issues"] if s["kind"] == "UNASSIGNED_CLAUSE")],
                      "human_notes": [len(N.get("human_notes", [])), len(out["notes"])],
                      "no_direct_relation_issues": sum(1 for s in out["issues"] if s["kind"] == "NO_DIRECT_RELATION"),
                      "evidence": len(out["evidence"])},
           "ids": {"edge_ids_preserved": v1_ids == out_ids, "missing": sorted(v1_ids - out_ids), "extra": sorted(out_ids - v1_ids)},
           "status_distribution_equal": by_status_v1 == by_status_out, "status_v1": dict(by_status_v1), "status_out": dict(by_status_out),
           "direction_preserved": dir_ok, "evidence_refs_valid": ev_ok,
           "evidence_coverage": {"relations_with_trace_source": len(edges_with_trace), "relations_without_evidence": len(rel_no_ev), "note": "" if a.review_zip else "--review-zip 없음: 근거를 펼치지 못함(관계의 rule·record 는 보존됨)"},
           "created_only": ["family", "evidence[] (trace 를 펼친 것)", "issues.NO_DIRECT_RELATION (human_notes 의 직접 모절 기각에서)", "issues.UNRESOLVED (groups.rule_notes 의 미결에서)", "native_relations[].id (원본 edge_id 는 origin_edge_id 에)"],
           "dropped": ["legend", "counts", "base_group_ids(그룹 kind 로 복원 가능)", "V1_DISPLAY_TREE.json(화면 배치)"]}
    ok = cmp["counts"]["relations+native == edges"] and cmp["ids"]["edge_ids_preserved"] and cmp["status_distribution_equal"] and dir_ok and ev_ok and cmp["counts"]["clauses"][0] == cmp["counts"]["clauses"][1] and cmp["counts"]["groups"][0] == cmp["counts"]["groups"][1] and cmp["counts"]["human_notes"][0] == cmp["counts"]["human_notes"][1]
    cmp["structural_preservation"] = "STRUCTURAL_PRESERVATION_PASS" if ok else "STRUCTURAL_PRESERVATION_FAIL"
    ev_complete = (not a.review_zip) or not rel_no_ev
    cmp["evidence_complete"] = ev_complete
    # round-trip: IF-1 에서 V1 을 되살려 원본과 정준 JSON 으로 비교
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from milal_roundtrip import rebuild_v1, diff_paths
        R = rebuild_v1(out); dp = diff_paths(N, R)
        cmp["roundtrip"] = {"exact": not dp, "differences": dp[:20]}
    except Exception as ex:
        cmp["roundtrip"] = {"exact": False, "error": str(ex)}
    cmp["verdict"] = ("ROUNDTRIP_EXACT" if cmp["roundtrip"]["exact"] else "STRUCTURAL_PRESERVATION_PASS") if ok else "STRUCTURAL_PRESERVATION_FAIL"
    if a.review_zip and not ev_complete: cmp["verdict"] += "; EVIDENCE_INCOMPLETE"
    if a.compare: json.dump(cmp, open(a.compare, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(cmp, ensure_ascii=False, indent=1)); print(cmp["verdict"]); sys.exit(0 if (ok and ev_complete) else 1)

if __name__ == "__main__":
    main()
