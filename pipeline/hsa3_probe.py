"""HSA3 차원·노드 대응 검증 + 읽기 전용 규격 시제품(MILALWV-HSA-1, PROTOTYPE) — 판정을 만들지 않고 MILAL 파일을 읽기만 한다.
쓰는 법: python3 pipeline/hsa3_probe.py <MILAL 저장소> <IF-1 json> <출력 json> [--report docs/…md]
1) 차원(dimension): config/hsa3_*_human_decisions.json 의 모든 판정에서 차원·관계 유형·극성을 모아 설계안(docs/HSA3_DISPLAY_DESIGN.md)의 목록과 대조
2) 노드→범위: 저장소 안에서 **명시적으로 적힌** 등록만 쓴다 — config/hsa3_layer_0_1_job.json matrix_display_spans, hsa3_abc groups[].member_spans, hsa3_fg groups/annotations span_start/end,
   docs/HSA3_*.md 의 "H:HSAnnn (ch:vs[–ch:vs])" 표기. 추론·보간은 하지 않는다(없으면 UNRESOLVED).
3) 범위→BHSA: 장:절 범위를 IF-1 nodes(절)로 풀고, V1 묶음(first/last)과 EXACT_SPAN / PARTIAL / NONE 으로 대조 — 문학적 관계를 만드는 것이 아니라 범위 비교.
"""
import sys, os, re, json, glob, argparse, hashlib, datetime, collections
DESIGN_DIMS = {"TEXTUAL_PARENTAGE", "RESPONSE_RELATION", "COMPOSITION_GROUPING", "COMPOSITION_PEER", "COMPOSITION_TRANSITION", "HIGHER_ORDER_TERMINAL_EFFECT", "CONTINUATION", "BOUNDARY_EXISTENCE", "PARENTAGE_CONTAINMENT"}
REF = re.compile(r"(\d{1,2}):(\d{1,2})(?:[–-](?:(\d{1,2}):)?(\d{1,2}))?")
def parse_span(s):
    m = REF.search(str(s) or "");
    if not m: return None
    c1, v1 = int(m[1]), int(m[2]); c2 = int(m[3]) if m[3] else c1; v2 = int(m[4]) if m[4] else v1
    return [c1, v1, c2, v2]
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("milal"); ap.add_argument("if1"); ap.add_argument("out"); ap.add_argument("--report"); a = ap.parse_args()
    M = a.milal; files = sorted(glob.glob(os.path.join(M, "config", "hsa3_*_human_decisions.json")))
    D = json.load(open(a.if1, encoding="utf-8")); nodes = D["nodes"]; grp = D["groups"]
    # ---- 1) 차원
    judg = []; dims = collections.Counter(); crit = collections.Counter()
    for f in files:
        J = json.load(open(f, encoding="utf-8")); fn = os.path.basename(f); layer = J.get("version", fn)
        def add(o, kind, seam=None):
            if not isinstance(o, dict) or "dimension" not in o: return
            pol = o.get("polarity") or ("NEGATIVE" if str(o.get("relation_type", "")).startswith(("NO_", "NOT_")) else "POSITIVE")
            judg.append({"id": f"{layer}#{o.get('request_id') or o.get('seam_id') or seam or kind}#{len(judg)}", "layer": layer, "file": fn, "seam_id": o.get("seam_id", seam), "kind": kind, "polarity": pol,
                         "relation_type": o.get("relation_type"), "dimension": o["dimension"], "source": o.get("source_node"), "target": o.get("target_node") or o.get("reference"),
                         "direction": o.get("direction"), "symmetric": o.get("symmetric"), "excluded": o.get("excluded_relation") or o.get("excluded_claims"), "criteria": o.get("criteria_codes"), "authority": o.get("authority", J.get("authority")), "status": "FROZEN"})
            dims[o["dimension"]] += 1
            for c in o.get("criteria_codes") or []: crit[c] += 1
        for k in ("requests", "positive_relations", "negative_rules", "negative_constraints"):
            for o in J.get(k, []) or []: add(o, k)
        for s_id, codes in (J.get("criteria") or {}).items():
            for c in codes: crit[c] += 0
    dim_missing_in_design = sorted(set(dims) - DESIGN_DIMS); dim_unused = sorted(DESIGN_DIMS - set(dims))
    # ---- 2) 노드 등록(명시된 것만)
    reg = {}
    def put(nid, span, src):
        sp = parse_span(span)
        if nid and sp: reg.setdefault(nid, []).append({"span": sp, "text": str(span), "source": src})
    L01 = os.path.join(M, "config", "hsa3_layer_0_1_job.json")
    if os.path.exists(L01):
        for nid, sp in (json.load(open(L01)).get("matrix_display_spans") or {}).items(): put(nid, sp, "config/hsa3_layer_0_1_job.json:matrix_display_spans")
    for f in files:
        J = json.load(open(f, encoding="utf-8")); fn = os.path.basename(f)
        for g in J.get("groups", []) or []:
            if g.get("span_start"): put(g["group_id"], f"{g['span_start']}–{g['span_end']}", fn + ":groups")
            for mid, msp in zip(g.get("members", []), g.get("member_spans", []) or []): put(mid, msp, fn + ":groups.member_spans")
        for an in J.get("annotations", []) or []:
            if an.get("span_start"): put(an["node_id"], f"{an['span_start']}–{an['span_end']}", fn + ":annotations")
    for md in sorted(glob.glob(os.path.join(M, "docs", "HSA3_*.md"))):
        t = open(md, encoding="utf-8", errors="replace").read()
        for m in re.finditer(r"(H:HSA\d{3})\s*\((\d{1,2}:\d{1,2}(?:[–-]\d{1,2}(?::\d{1,2})?)?)\)", t): put(m[1], m[2], "docs/" + os.path.basename(md))
        for m in re.finditer(r"(H:HSA\d{3})\s+(?:is|—)\s+[A-Z_]+,\s*(\d{1,2}:\d{1,2}[–-]\d{1,2}:\d{1,2})", t): put(m[1], m[2], "docs/" + os.path.basename(md))
    # 같은 노드에 서로 다른 범위가 적혀 있으면 CONFLICT
    registry = {}
    for nid, L in reg.items():
        spans = {tuple(x["span"]) for x in L}
        registry[nid] = {"span": L[0]["span"], "sources": sorted({x["source"] for x in L}), "status": "REGISTERED" if len(spans) == 1 else "CONFLICT", "variants": [x["text"] for x in L] if len(spans) > 1 else None}
    mentioned = {j[k] for j in judg for k in ("source", "target") if j.get(k)}
    for nid in mentioned:
        if nid not in registry: registry[nid] = {"span": None, "sources": [], "status": "UNRESOLVED"}
    # ---- 3) 범위 → BHSA 절, V1 묶음 대조
    def clauses_in(sp):
        c1, v1, c2, v2 = sp; return [n["id"] for n in nodes if (n["ch"], n["vs"]) >= (c1, v1) and (n["ch"], n["vs"]) <= (c2, v2)]
    gspan = {}
    for g in grp:
        a1, b1 = parse_span(g["first"]), parse_span(g["last"])
        if a1 and b1: gspan[g["id"]] = (a1[0], a1[1], b1[0], b1[1], g["kind"], len(g["members"]))
    cross = []
    for nid, r in registry.items():
        if not r["span"]: cross.append({"hsa_node": nid, "match": "UNRESOLVED", "if1_clause_ids": [], "v1_groups": []}); continue
        c1, v1, c2, v2 = r["span"]; ids = clauses_in(r["span"]); exact, partial = [], []
        for gid, (gc1, gv1, gc2, gv2, kind, n) in gspan.items():
            if (gc1, gv1) == (c1, v1) and (gc2, gv2) == (c2, v2): exact.append({"id": gid, "kind": kind, "members": n})
            elif not ((gc2, gv2) < (c1, v1) or (gc1, gv1) > (c2, v2)): partial.append({"id": gid, "kind": kind, "members": n, "span": f"{gc1}:{gv1}–{gc2}:{gv2}"})
        cross.append({"hsa_node": nid, "span": f"{c1}:{v1}–{c2}:{v2}", "if1_clause_ids": ids, "n_clauses": len(ids), "match": "EXACT_SPAN" if exact else ("PARTIAL" if partial else "NONE"), "v1_groups_exact": exact, "v1_groups_partial": partial[:12], "n_partial": len(partial)})
    summary = collections.Counter(x["match"] for x in cross)
    # ---- 시제품 파일(읽기 전용, PROTOTYPE — 정식 분석 계층 아님)
    out = {"schema": "MILALWV-HSA-1", "file_status": "PROTOTYPE_READ_ONLY", "note": "연구자 승인 전 시제품. V1 자료에 합치지 않으며 정식 분석 계층으로 게시하지 않음. 판정은 MILAL config/hsa3_*_human_decisions.json 을 그대로 옮긴 것",
           "bhsa_version": D["source"]["bhsa_version"], "source": {"milal": {"stage": "HSA3", "commit": D["source"]["milal"].get("commit"), "layers": [os.path.basename(f) for f in files]},
           "files": [{"path": "config/" + os.path.basename(f), "sha256": sha(f), "researcher_source": json.load(open(f)).get("source_path"), "researcher_source_sha256": json.load(open(f)).get("source_sha256"), "authority": json.load(open(f)).get("authority")} for f in files],
           "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")},
           "nodes": [{"id": nid, "kind": "NON_TEXTUAL_COMPOSITION_GROUP" if not nid.startswith("H:") else "HSA_NODE", "span": r["span"], "resolution": r["status"], "span_sources": r["sources"]} for nid, r in sorted(registry.items())],
           "judgments": judg, "dimensions": sorted(dims), "criteria_codes": sorted(crit), "crosswalk": {"to_if1": cross, "summary": dict(summary)},
           "checks": {"dimensions_not_in_design": dim_missing_in_design, "design_dimensions_unused": dim_unused, "nodes_unresolved": sorted(n for n, r in registry.items() if r["status"] == "UNRESOLVED"), "nodes_conflict": sorted(n for n, r in registry.items() if r["status"] == "CONFLICT")}}
    json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    e1 = [j for j in judg if j["source"] == "H:HSA024" and j["target"] == "H:HSA025"]
    print(json.dumps({"files": [os.path.basename(f) for f in files], "judgments": len(judg), "dimensions": dict(dims), "dim_check": out["checks"], "nodes": len(registry), "crosswalk": dict(summary), "E1_E2": [(j["relation_type"], j["dimension"]) for j in e1]}, ensure_ascii=False, indent=1))
    if a.report:
        L = ["# HSA3 차원·노드 대응 검증 (읽기 전용 시제품) — " + datetime.date.today().isoformat(), "", f"- 읽은 파일: {', '.join('`config/' + os.path.basename(f) + '`' for f in files)} (연구자 공급, FROZEN) · IF-1 `{a.if1}`", f"- 시제품: `{a.out}` (`MILALWV-HSA-1`, PROTOTYPE_READ_ONLY — V1 과 합치지 않음, 게시 안 함)", "",
             "## 1. 판정 차원(dimension) 대조", "", "| 차원 | 판정 수 | 설계안에 있음 |", "|---|---|---|"] + [f"| {d} | {n} | {'예' if d in DESIGN_DIMS else '**아니오**'} |" for d, n in sorted(dims.items())]
        L += ["", f"- 설계안에 없는 차원: {dim_missing_in_design or '없음'} · 설계안에 있으나 실제 판정에 없는 차원: {dim_unused or '없음'}", "- 차원의 뜻은 MILAL 쪽 정의(`src/milal_hsa3_*_adjudication.py`, `docs/HSA3_*_SPEC.md`)를 따르며, 시제품은 이름을 바꾸거나 합치지 않는다.", "",
              "### 37:24 → 38:1 (H:HSA024 → H:HSA025)", ""] + [f"- `{j['id']}` **{j['relation_type']}** · 차원 **{j['dimension']}** · 극성 {j['polarity']} · 기준 {j['criteria']}" for j in e1] + ["- 두 판정은 서로 다른 차원의 별개 기록으로 보존된다. 부정 판정은 그 차원의 직접 관계만 부정한다(수사적 관계 전체를 부정하지 않음 — DE 사유문 원문: \"NO DIRECT HIERARCHICAL EDGE does not mean NO RHETORICAL/DISCOURSE RELATION\").", "",
              "## 2. 노드 → BHSA 범위 등록 (저장소에 명시된 것만; 추론 없음)", "", "| 노드 | 범위 | 상태 | 출처 |", "|---|---|---|---|"] + [f"| {nid} | {('%d:%d–%d:%d' % tuple(r['span'])) if r['span'] else '—'} | {r['status']}{(' ' + str(r['variants'])) if r.get('variants') else ''} | {', '.join(r['sources']) or '—'} |" for nid, r in sorted(registry.items())]
        L += ["", "## 3. 범위 ↔ V1 묶음 대조 (문학적 관계 생성 아님)", "", f"- 요약: {dict(summary)}", "", "| 노드 | 범위 | 절 수 | 대응 | V1 묶음(정확) | V1 묶음(일부 겹침) |", "|---|---|---|---|---|---|"]
        for x in cross: L.append(f"| {x['hsa_node']} | {x.get('span', '—')} | {x.get('n_clauses', '—')} | **{x['match']}** | {', '.join(g['kind'] + ' ' + g['id'][:14] for g in x.get('v1_groups_exact', [])) or '—'} | {x.get('n_partial', 0)}개 |")
        L += ["", "## 4. 결론", f"- 설계안 차원 목록은 실제 판정과 {'일치' if not dim_missing_in_design else '불일치(추가 필요: ' + str(dim_missing_in_design) + ')'}.", f"- 노드 등록표: 등록 {sum(1 for r in registry.values() if r['status'] == 'REGISTERED')} · 미해결 {len(out['checks']['nodes_unresolved'])} · 충돌 {len(out['checks']['nodes_conflict'])}. 미해결 노드(예: {', '.join(out['checks']['nodes_unresolved'][:6])})는 저장소 문서에 범위가 명시돼 있지 않아 **연구자 등록표가 필요**하다 — 추측해 채우지 않았다.", "- 다음 단계(연구자 답 뒤): 미해결 노드 범위 공급 → 변환기 정식화 → 지도 층 전환 구현."]
        open(a.report, "w", encoding="utf-8").write("\n".join(L) + "\n")

if __name__ == "__main__": main()
