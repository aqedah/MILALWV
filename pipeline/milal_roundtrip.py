"""IF-1 → V1 관계망 되살리기(round-trip). 원본과 정준 JSON 으로 비교해 다른 경로를 보고한다.
쓰는 법: python3 milal_roundtrip.py <IF-1 json> <원본 V1_RELATION_NETWORK.json>
"""
import sys, json
NATIVE_PREFIX = "BHSA clause_atom rela="

def rebuild_v1(D):
    pt = D["source"]["milal"].get("v1_passthrough", {})
    clauses = []
    for n in D["nodes"]:
        c = {k: n[k] for k in ("id", "pos", "ch", "vs", "type", "text", "domain", "word_ids", "native_self_annotations", "ref") if k in n}
        c.update(n.get("meta", {})); clauses.append(c)
    groups = [{k: v for k, v in g.items()} for g in D["groups"]]
    edges = []
    for r in D["relations"]:
        e = {"edge_id": r["id"], "kind": r["kind"], "status": r["status"], "source": r["source"], "target": r["target"], "rule": r["rule"], "record": r["record"],
             "evidence_clause_ids": r.get("evidence_clause_ids", []), "note": r.get("note", "")}
        e.update(r.get("extra", {})); edges.append(e)
    for x in D["native_relations"]:
        e = {"edge_id": x["origin_edge_id"], "kind": x.get("origin_kind"), "status": x.get("origin_status"), "source": {"type": "clause", "id": x["mother_clause_id"]},
             "target": {"type": "clause", "id": x["clause_id"]}, "rule": x.get("origin_rule", NATIVE_PREFIX + x["rela"]), "record": x["record"],
             "evidence_clause_ids": x.get("origin_evidence_clause_ids", []), "note": x.get("note", ""), "rela": x["rela"], "annotation_indexes": x.get("annotation_indexes", [])}
        e.update(x.get("origin_extra", {})); edges.append(e)
    edges.sort(key=lambda e: e["edge_id"])
    alts = []
    for s in D["issues"]:
        if s["kind"] != "ALTERNATIVE_SET": continue
        a = {"alternative_id": s["id"], "kind": s.get("subkind"), "options": s.get("options", []), "competing": s.get("competing", False), "note": s.get("note", "")}
        if s.get("about") and not isinstance(s["about"], list) and s["about"].get("type") == "clause": a["clause_id"] = s["about"]["id"]
        alts.append(a)
    unassigned = [s["about"]["id"] for s in D["issues"] if s["kind"] == "UNASSIGNED_CLAUSE"]
    notes = [{k: v for k, v in h.items()} for h in D["notes"]]
    R = {"schema": pt.get("schema"), "stage": pt.get("stage"), "source": pt.get("source"), "p2_contract": pt.get("p2_contract"),
         "clauses": clauses, "groups": groups, "edges": edges, "alternatives": alts, "unassigned_clause_ids": unassigned,
         "base_group_ids": pt.get("base_group_ids"), "human_notes": notes, "rule_notes_trace_ids": pt.get("rule_notes_trace_ids"),
         "legend": pt.get("legend"), "counts": pt.get("counts")}
    return R

def diff_paths(a, b, p="", out=None):
    out = [] if out is None else out
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a: out.append(f"{p}.{k}: 복원본에만 있음")
            elif k not in b: out.append(f"{p}.{k}: 원본에만 있음(손실)")
            else: diff_paths(a[k], b[k], f"{p}.{k}", out)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): out.append(f"{p}: 길이 {len(a)} vs {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)): diff_paths(x, y, f"{p}[{i}]", out)
    else:
        if a != b: out.append(f"{p}: {json.dumps(a, ensure_ascii=False)[:40]} vs {json.dumps(b, ensure_ascii=False)[:40]}")
    return out

if __name__ == "__main__":
    D = json.load(open(sys.argv[1], encoding="utf-8")); N = json.load(open(sys.argv[2], encoding="utf-8"))
    dp = diff_paths(N, rebuild_v1(D))
    print("ROUNDTRIP_EXACT" if not dp else f"차이 {len(dp)}곳:\n" + "\n".join(dp[:30])); sys.exit(0 if not dp else 1)
