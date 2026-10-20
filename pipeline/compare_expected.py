"""본문 비교기 기대값 — 브라우저와 독립적으로 study/words.json 에서 계산한다(작업 C 대조용).
쓰는 법: python3 pipeline/compare_expected.py <출력 json>
계산: 범위의 낱말 번호(앱 내부 번호와 BHSA slot), 어휘(wl)·형태(heb 에서 악센트 제거), 공통 어휘별 A/B 횟수·형태 집합·양쪽에 다 있는 형태,
      낱말별 실선/점선(상대편 같은 어휘의 형태 집합에 있는가), 공통 연쇄(어순 같은 공통 어휘 ≥2, 최대 확장), 정확 LCS 길이.
"""
import sys, json, re
W = json.load(open("study/words.json", encoding="utf-8")); M = json.load(open("study/meta.json", encoding="utf-8"))
V = W["V"]; heb = W["heb"]; wl = W["wl"]; lex = M["lex"]; bs = W["bs"]
FN = {"art", "prep", "conj", "prps", "prde", "prin", "nega", "inrg", "intj"}
ACC = re.compile("[\u0591-\u05af\u05bd-\u05c0\u05c3-\u05c6]")   # 앱 cmpForm 과 같은 규칙: 악센트·메테그·마케프·라페·파세크·소프파수크 제거, 모음·다게쉬·쉰 점 유지
# words.json 의 wl 은 base64 Uint16 일 수 있다 → 앱과 같은 방식으로 푼다
import base64
def arr16(x):
    if isinstance(x, list): return x
    b = base64.b64decode(x); return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]
wl = arr16(wl)
def book_first_word(b): return next(v[5] for v in V if v[0] == b)
def slot(i):
    vi = vOf[i]; b = V[vi][0]; return bs[b - 1] + (i - book_first_word(b))
vOf = {}
for vi, v in enumerate(V):
    for j in range(v[5], v[5] + v[6]): vOf[j] = vi
def verses(b, c1, v1, c2, v2):
    out = []
    for vi, v in enumerate(V):
        if v[0] != b: continue
        c, vs = v[1], v[2]
        if (c, vs) < (c1, v1) or (c, vs) > (c2, v2): continue
        out.append(vi)
    return out
def words(vis):
    out = []
    for vi in vis: out += list(range(V[vi][5], V[vi][5] + V[vi][6]))
    return out
def form(i):
    vi = vOf[i]; parts = heb[vi].split("\t"); return ACC.sub("", parts[i - V[vi][5]]).strip()
def compute(A, B, fn=False):
    keep = lambda i: fn or lex[wl[i]][2] not in FN
    fa = [i for i in A if keep(i)]; fb = [i for i in B if keep(i)]
    ca, cb = {}, {}
    for i in fa: ca.setdefault(wl[i], []).append(i)
    for i in fb: cb.setdefault(wl[i], []).append(i)
    shared = {}
    for li in ca:
        if li in cb:
            FA = {form(i) for i in ca[li]}; FB = {form(i) for i in cb[li]}
            shared[lex[li][0]] = {"li": li, "a": len(ca[li]), "b": len(cb[li]), "formsA": sorted(FA), "formsB": sorted(FB), "same": sorted(FA & FB), "a_words": [slot(i) for i in ca[li]], "b_words": [slot(i) for i in cb[li]]}
    byli = {v["li"]: v for v in shared.values()}
    markA = {slot(i): (form(i) in set(byli[wl[i]]["formsB"])) for i in fa if wl[i] in byli}
    markB = {slot(i): (form(i) in set(byli[wl[i]]["formsA"])) for i in fb if wl[i] in byli}
    LA = [wl[i] for i in fa]; LB = [wl[i] for i in fb]
    # runs
    pos = {}
    for j in range(len(LB) - 1): pos.setdefault((LB[j], LB[j + 1]), []).append(j)
    runs, seen = [], set()
    for i in range(len(LA) - 1):
        for j in pos.get((LA[i], LA[i + 1]), []):
            if (i, j) in seen: continue
            ln = 2
            while i + ln < len(LA) and j + ln < len(LB) and LA[i + ln] == LB[j + ln]: ln += 1
            for t in range(ln - 1): seen.add((i + t, j + t))
            runs.append({"len": ln, "a_first": slot(fa[i]), "b_first": slot(fb[j]), "forms": [form(fa[i + t]) for t in range(ln)]})
    # LCS length
    n, m = len(LA), len(LB); T = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1): T[i][j] = T[i + 1][j + 1] + 1 if LA[i] == LB[j] else max(T[i + 1][j], T[i][j + 1])
    return {"nA": len(A), "nB": len(B), "fa": len(fa), "fb": len(fb), "shared": shared, "onlyA": sorted(lex[li][0] for li in ca if li not in cb), "onlyB": sorted(lex[li][0] for li in cb if li not in ca),
            "markA_same": sum(1 for v in markA.values() if v), "markA_diff": sum(1 for v in markA.values() if not v), "markB_same": sum(1 for v in markB.values() if v), "markB_diff": sum(1 for v in markB.values() if not v), "runs": runs, "lcs": T[0][0]}
CASES = {"gen22": [(1, 22, 1, 22, 10), (1, 22, 11, 22, 19)], "job1_5_34_5": [(18, 1, 5, 1, 5), (18, 34, 5, 34, 5)], "job32_6_34_1": [(18, 32, 6, 32, 6), (18, 34, 1, 34, 1)]}
out = {}
for k, (ra, rb) in CASES.items():
    A = words(verses(*ra)); B = words(verses(*rb)); out[k] = compute(A, B, False); out[k + "_fn"] = {"shared_n": len(compute(A, B, True)["shared"])}
json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k in CASES: print(k, "A", out[k]["nA"], "B", out[k]["nB"], "shared", len(out[k]["shared"]), "runs", [r["forms"] for r in out[k]["runs"]], "lcs", out[k]["lcs"], "markA same/diff", out[k]["markA_same"], out[k]["markA_diff"], "markB", out[k]["markB_same"], out[k]["markB_diff"])
