"""MILALWV-IF-1 파일 검증기 (docs/MILAL_INTERFACE_DRAFT.md 9절의 V1~V14).

쓰는 법: python3 milal_check.py <interface.json> [--words study/words.json]
  --words 를 주면 V5(낱말 번호 전체 대조)를 한다.
  종료 코드: 0 모두 통과 · 1 실패 있음 · 2 검사 불가(jsonschema 없음 등 — 통과가 아님)
"""
import os, sys, json, base64, argparse
from collections import defaultdict, Counter

HERE = __import__("os").path.dirname(__import__("os").path.abspath(__file__))
HIER = ("SUBORDINATE", "FRAME_CONTENT", "CONTINUATION")

def load_words(path):
    w = json.load(open(path, encoding="utf-8"))
    def u8(s): return base64.b64decode(s)
    def dec(o):
        s = u8(o["s"]); r = []; mx = -1; prev = -1; k = 0
        for c in s:
            if c == 1: mx += 1; prev = mx
            elif c == 2: prev = o["x"][k]; k += 1
            r.append(prev)
        return r
    def cum(d):
        out = []; a = 0
        for x in d: a += x; out.append(a)
        return out
    wc = dec(w["wc"]); ccn = cum(w["ccn"]); bs = w["bs"]
    # BHSA clause 노드 → 그 절의 BHSA 낱말 번호 목록
    first = {}; per_book = {}
    for b, v in enumerate(w["V"]):
        per_book.setdefault(v[0], v[5])  # 책의 첫 낱말 인덱스(앱)
    cl_words = defaultdict(list)
    for i, c in enumerate(wc):
        # 앱 낱말 i → BHSA 슬롯: 책 b의 첫 슬롯 + (i - 책 첫 인덱스)
        pass
    # 책 경계
    book_of = [0] * len(wc)
    for v in w["V"]:
        for j in range(v[5], v[5] + v[6]): book_of[j] = v[0]
    for i, c in enumerate(wc):
        b = book_of[i]; slot = bs[b - 1] + (i - per_book[b])
        cl_words[ccn[c]].append(slot)
    return cl_words

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("file"); ap.add_argument("--words"); ap.add_argument("--bhsa-native", help="bhsa_native_job.json (MILALWV-BHSA-NATIVE-1) — 있으면 V13b 원본 대조를 돈다"); a = ap.parse_args()
    D = json.load(open(a.file, encoding="utf-8"))
    R = []  # (id, ok, msg)
    def res(i, ok, msg=""): R.append((i, ok, msg))

    # V1 schema
    unable = False
    try:
        import jsonschema
        schema = json.load(open(HERE + "/../docs/milal_interface.schema.json", encoding="utf-8"))
        errs = sorted(jsonschema.Draft202012Validator(schema).iter_errors(D), key=lambda e: list(e.path))
        res("V1 스키마", not errs, "; ".join(f"{'/'.join(map(str, e.path))}: {e.message[:80]}" for e in errs[:5]))
    except ImportError:
        unable = True; res("V1 스키마", False, "검사 불가 — jsonschema 가 없음 (pip install jsonschema). 통과가 아님")
    # V2
    res("V2 BHSA 2021", D.get("source", {}).get("bhsa_version") == "2021")
    nodes = {n["id"]: n for n in D.get("nodes", [])}
    groups = {g["id"]: g for g in D.get("groups", [])}
    ev = {e["id"]: e for e in D.get("evidence", [])}
    def ends(e):
        if e["type"] == "clause": return [("clause", e["id"])]
        if e["type"] == "group": return [("group", e["id"])]
        return [("clause", i) for i in e["ids"]]
    def exists(t, i): return i in (nodes if t == "clause" else groups)
    # V3 endpoints
    bad = []
    for g in groups.values():
        bad += [f"group {g['id']} member {m}" for m in g["members"] if m not in nodes]
        for k, v in g.get("roles", {}).items(): bad += [f"group {g['id']} role {k} {m}" for m in v if str(m).isdigit() and m not in nodes]   # 숫자 = 절 id, 그 밖은 관찰 특징 이름
    for r in D.get("relations", []):
        for side in ("source", "target"):
            bad += [f"rel {r['id']} {side} {t} {i}" for t, i in ends(r[side]) if not exists(t, i)]
        bad += [f"rel {r['id']} evidence_clause {c}" for c in r.get("evidence_clause_ids", []) if c not in nodes]
    for s in D.get("issues", []):
        ab = s.get("about"); ab = ab if isinstance(ab, list) else ([ab] if ab else [])
        for e in ab: bad += [f"issue {s['id']} about {t} {i}" for t, i in ends(e) if not exists(t, i)]
        for o in s.get("options", []):
            if o not in nodes and o not in groups: bad.append(f"issue {s['id']} option {o}")
    res("V3 끝점 존재", not bad, "; ".join(bad[:5]))
    # V4 duplicates
    rels = D.get("relations", [])
    ids = Counter(r["id"] for r in rels); dup = [k for k, v in ids.items() if v > 1]
    key = Counter(json.dumps([r["kind"], r["source"], r["target"], r["rule"], r["record"]], sort_keys=True) for r in rels)
    dupk = [k for k, v in key.items() if v > 1]
    res("V4 관계 중복 없음", not dup and not dupk, f"id 중복 {len(dup)}, 내용 중복 {len(dupk)}")
    # V5 words
    if a.words:
        cw = load_words(a.words); mism = []
        for n in nodes.values():
            got = cw.get(int(n["id"]))
            if got is None: mism.append(f"{n['id']}: words.json에 없는 절")
            elif sorted(got) != sorted(n["word_ids"]):
                d1 = sorted(set(got) - set(n["word_ids"])); d2 = sorted(set(n["word_ids"]) - set(got))
                mism.append(f"{n['id']}: 앱에만 {d1[:2]} / 파일에만 {d2[:2]}" if (d1 or d2) else f"{n['id']}: 순서 다름")
        res("V5 낱말 대조(번호 전체)", not mism, f"{len(mism)}절 불일치: " + "; ".join(mism[:3]))
    else:
        res("V5 낱말 대조", True, "--words 없음 — 건너뜀")
    # V6/V7 confirmed hierarchy
    def graph(statuses):
        par = defaultdict(set); adj = defaultdict(set)
        for r in rels:
            if r["family"] != "HIERARCHY" or r["status"] not in statuses: continue
            for ts, s in ends(r["source"]):
                for tt, t in ends(r["target"]):
                    par[(tt, t)].add((ts, s)); adj[(ts, s)].add((tt, t))
        return par, adj
    def cyc(adj):
        color = {}
        def dfs(u):
            color[u] = 1
            for v in adj.get(u, ()):
                if color.get(v) == 1: return True
                if v not in color and dfs(v): return True
            color[u] = 2; return False
        return any(dfs(u) for u in list(adj) if u not in color)
    par, adj = graph({"CONFIRMED"})
    res("V6 확정 관계 순환 없음", not cyc(adj))
    multi = [k for k, v in par.items() if len(v) > 1]
    res("V7 확정 관계 중복 모절 없음", not multi, f"{len(multi)}개: " + "; ".join(f"{t} {i}" for t, i in multi[:3]))
    par2, adj2 = graph({"CONFIRMED", "PROVISIONAL", "COMPETING", "UNASSIGNED"})
    multi2 = [k for k, v in par2.items() if len(v) > 1]
    res("V8 전체 관계(경고)", True, f"순환 {'있음' if cyc(adj2) else '없음'}, 모절 둘 이상 {len(multi2)}곳 (경쟁·미배정은 정상)")
    # V9
    bad9 = [f"{r['id']}→{e}" for r in rels for e in r.get("evidence_ids", []) if e not in ev]
    res("V9 근거 존재", not bad9, "; ".join(bad9[:5]))
    # V10
    res("V10 파일 상태", True, D.get("file_status", "?") + (" — 시험 자료, 실제 판정 아님" if D.get("file_status") == "TEST_ONLY" else " — 실제 MILAL 출력"))
    # V12 NO_DIRECT_RELATION basis
    b12 = [s["id"] for s in D.get("issues", []) if s.get("kind") == "NO_DIRECT_RELATION" and not (s.get("basis", {}).get("kind") and s.get("record"))]
    res("V12 직접연결없음에 근거", not b12, "; ".join(b12[:5]))
    # V13 native_relations atoms exist
    atoms = {a for n in nodes.values() for a in n.get("clause_atom_ids", [])}
    nat = D.get("native_relations", [])
    b13 = [x["id"] for x in nat if (x.get("clause_atom") is not None and atoms and x["clause_atom"] not in atoms) or x.get("clause_id") not in nodes or x.get("mother_clause_id") not in nodes]
    withatom = sum(1 for x in nat if x.get("clause_atom") is not None)
    res("V13a 원 관계 끝점 존재(ID 검사)", not b13, f"{len(b13)}개 (절·절 원자 밖)" if b13 else f"{len(nat)}개 (절 원자 번호 복원된 것 {withatom})")
    # V13b 실제 원본 관계 대조: BHSA 2021 의 mother/rela 와 노드 수준에서 같은가 (bhsa_native_job.json 이 있을 때만)
    if getattr(a, "bhsa_native", None) and os.path.exists(a.bhsa_native):
        B = json.load(open(a.bhsa_native, encoding="utf-8")); byca = {x["clause_atom"]: x for x in B.get("atoms", [])}; bycl = {}
        for x in B.get("atoms", []): bycl.setdefault(x["clause"], x)
        c13 = Counter(); bad13b = []
        for x in nat:
            bn = x.get("bhsa_nodes")
            if not bn: c13["no_nodes"] += 1; continue
            dep, head, rela = bn.get("dependent"), bn.get("head"), bn.get("rela")
            if dep in byca: y = byca[dep]; ok = y["mother_clause_atom"] == head and y["rela_atom"] == rela; c13["atom_match" if ok else "atom_diff"] += 1
            elif dep in bycl: y = bycl[dep]; ok = y["mother_clause"] == head and (y["rela_clause"] or "NA") == rela; c13["clause_match" if ok else "clause_diff"] += 1
            else: c13["other_level(phrase)"] += 1; continue
            if not ok: bad13b.append(x["id"])
            if x.get("clause_id") != str((byca.get(dep) or bycl.get(dep))["clause"]): bad13b.append(x["id"] + "(절 불일치)")
        res("V13b 원 관계 실제 원본 대조(BHSA mother/rela)", not bad13b, f"{dict(c13)}" + (f" — 불일치 {len(bad13b)}: " + ", ".join(bad13b[:4]) if bad13b else ""))
    else:
        res("V13b 원 관계 실제 원본 대조", None, "--bhsa-native 를 주면 BHSA 2021 원본과 노드 수준으로 대조")   # None = NOT_RUN (통과가 아님)
    # V15 원 관계 origin_edge_id 중복 없음
    oe = Counter(x.get("origin_edge_id") for x in nat if x.get("origin_edge_id"))
    res("V15 원 관계 원본 edge id 중복 없음", not [k for k, v in oe.items() if v > 1])
    # V16 review 상태
    rv = D.get("review", {}).get("status", "UNREVIEWED")
    res("V16 연구자 검토 상태", True, rv + ("" if rv == "APPROVED" else " — 화면에 '승인 전' 표시"))
    # V14 MILAL_OUTPUT provenance
    if D.get("file_status") == "MILAL_OUTPUT":
        m = D.get("source", {}).get("milal", {})
        res("V14 실제 출력 출처", bool(m.get("commit") and m.get("network_sha256") and D["source"].get("generated_at")), "commit·network_sha256·generated_at 필요")
    else:
        res("V14 실제 출력 출처", True, "TEST_ONLY — 해당 없음")
    # 요약
    st = Counter(r["status"] for r in rels); kd = Counter(r["kind"] for r in rels)
    print(f"파일: {a.file}\n절 {len(nodes)} · 묶음 {len(groups)} · 관계 {len(rels)} · 근거 {len(ev)} · 이슈 {len(D.get('issues', []))} · 메모 {len(D.get('notes', []))} · BHSA 원 관계 {len(D.get('native_relations', []))}")
    print("관계 상태:", dict(st), "\n관계 종류:", dict(kd))
    okall = True; notrun = 0
    for i, ok, msg in R:
        if ok is None: notrun += 1; print("NOT_RUN " + i + (" — " + msg if msg else "")); continue   # 안 돌린 검사는 통과가 아니다
        okall &= ok; print(("PASS " if ok else "FAIL ") + i + (" — " + msg if msg else ""))
    print(f"요약: PASS {sum(1 for _, o, _ in R if o is True)} · FAIL {sum(1 for _, o, _ in R if o is False)} · NOT_RUN {notrun}")
    sys.exit(2 if unable else (0 if okall else 1))

if __name__ == "__main__":
    main()
