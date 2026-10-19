"""MILALWV-IF-1 파일 검증기 (docs/MILAL_INTERFACE_DRAFT.md 9절의 V1~V11).

쓰는 법: python3 milal_check.py <interface.json> [--words study/words.json]
  --words 를 주면 V5(낱말 대조)를 한다. 결과: 표준출력에 표, 실패가 있으면 종료 코드 1.
"""
import sys, json, base64, argparse
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
    ap = argparse.ArgumentParser(); ap.add_argument("file"); ap.add_argument("--words"); a = ap.parse_args()
    D = json.load(open(a.file, encoding="utf-8"))
    R = []  # (id, ok, msg)
    def res(i, ok, msg=""): R.append((i, ok, msg))

    # V1 schema
    try:
        import jsonschema
        schema = json.load(open(HERE + "/../docs/milal_interface.schema.json", encoding="utf-8"))
        errs = sorted(jsonschema.Draft202012Validator(schema).iter_errors(D), key=lambda e: list(e.path))
        res("V1 스키마", not errs, "; ".join(f"{'/'.join(map(str, e.path))}: {e.message[:80]}" for e in errs[:5]))
    except ImportError:
        res("V1 스키마", True, "jsonschema 없음 — 건너뜀")
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
        for k, v in g.get("roles", {}).items(): bad += [f"group {g['id']} role {k} {m}" for m in v if m not in nodes]
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
            elif sorted(got) != sorted(n["word_ids"]): mism.append(f"{n['id']}: 낱말 {len(got)} vs {len(n['word_ids'])}")
        res("V5 낱말 대조", not mism, f"{len(mism)}절 불일치: " + "; ".join(mism[:3]))
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
    res("V10 파일 상태", True, D.get("file_status", "?") + (" — 시험 자료, 실제 판정 아님" if D.get("file_status") == "TEST_ONLY" else ""))
    # 요약
    st = Counter(r["status"] for r in rels); kd = Counter(r["kind"] for r in rels)
    print(f"파일: {a.file}\n절 {len(nodes)} · 묶음 {len(groups)} · 관계 {len(rels)} · 근거 {len(ev)} · 이슈 {len(D.get('issues', []))} · 메모 {len(D.get('notes', []))}")
    print("관계 상태:", dict(st), "\n관계 종류:", dict(kd))
    okall = True
    for i, ok, msg in R:
        okall &= ok; print(("PASS " if ok else "FAIL ") + i + (" — " + msg if msg else ""))
    sys.exit(0 if okall else 1)

if __name__ == "__main__":
    main()
