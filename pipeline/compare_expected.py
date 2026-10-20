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
    is_fn = lambda i: lex[wl[i]][2] in FN
    keep = lambda i: fn or not is_fn(i)
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
    # 공통 연쇄: 양쪽에서 이어진 자리의 최대 확장(겹치는 짧은 것 제외)
    def runs_of(LA, LB, wa, wb):
        pos = {}
        for j in range(len(LB) - 1): pos.setdefault((LB[j], LB[j + 1]), []).append(j)
        R, seen = [], set()
        for i in range(len(LA) - 1):
            for j in pos.get((LA[i], LA[i + 1]), []):
                if (i, j) in seen: continue
                ln = 2
                while i + ln < len(LA) and j + ln < len(LB) and LA[i + ln] == LB[j + ln]: ln += 1
                for t in range(ln - 1): seen.add((i + t, j + t))
                R.append({"len": ln, "a_first": slot(wa[i]), "b_first": slot(wb[j]), "forms": [form(wa[i + t]) for t in range(ln)], "a": wa[i:i + ln], "b": wb[j:j + ln]})
        return R
    contig = lambda W: all(W[k] == W[k - 1] + 1 for k in range(1, len(W)))
    # ① 원문 연속 표현: 기능어를 빼지 않은 원래 순서에서 이어짐(기능어 제외 설정이므로 내용어 2개 이상인 것만)
    runs_text = [r for r in runs_of([wl[i] for i in A], [wl[i] for i in B], A, B) if sum(1 for w in r["a"] if not is_fn(w)) >= 2]
    for r in runs_text: r["cross"] = vOf[r["a"][0]] != vOf[r["a"][-1]] or vOf[r["b"][0]] != vOf[r["b"][-1]]
    # ② 기능어 제외 어순 대응: 기능어를 뺀 배열에서만 이어짐(원문에서 A 쪽이나 B 쪽에 끼어든 낱말이 있음)
    #   원문 구간(기능어 포함)의 어휘열이 양쪽에서 같으면 이미 ①에 든 것이므로 ②에서 뺀다
    span_lex = lambda W: [wl[i] for i in range(W[0], W[-1] + 1)]
    runs_filt = [r for r in runs_of(LA, LB, fa, fb) if not (contig(r["a"]) and contig(r["b"])) and span_lex(r["a"]) != span_lex(r["b"])]
    for r in runs_filt: r["skipA"] = r["a"][-1] - r["a"][0] + 1 - len(r["a"]); r["skipB"] = r["b"][-1] - r["b"][0] + 1 - len(r["b"])
    for r in runs_text + runs_filt: del r["a"]; del r["b"]
    runs = runs_text
    # LCS length
    n, m = len(LA), len(LB); T = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1): T[i][j] = T[i + 1][j + 1] + 1 if LA[i] == LB[j] else max(T[i + 1][j], T[i][j + 1])
    return {"nA": len(A), "nB": len(B), "fa": len(fa), "fb": len(fb), "shared": shared, "onlyA": sorted(lex[li][0] for li in ca if li not in cb), "onlyB": sorted(lex[li][0] for li in cb if li not in ca),
            "markA_same": sum(1 for v in markA.values() if v), "markA_diff": sum(1 for v in markA.values() if not v), "markB_same": sum(1 for v in markB.values() if v), "markB_diff": sum(1 for v in markB.values() if not v), "runs": runs, "runs_text": runs_text, "runs_filt": runs_filt, "lcs": T[0][0]}
CASES = {"gen22": [(1, 22, 1, 22, 10), (1, 22, 11, 22, 19)], "job1_5_34_5": [(18, 1, 5, 1, 5), (18, 34, 5, 34, 5)], "job32_6_34_1": [(18, 32, 6, 32, 6), (18, 34, 1, 34, 1)]}
out = {}
for k, (ra, rb) in CASES.items():
    A = words(verses(*ra)); B = words(verses(*rb)); out[k] = compute(A, B, False); out[k + "_fn"] = {"shared_n": len(compute(A, B, True)["shared"])}
json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k in CASES: print(k, "A", out[k]["nA"], "B", out[k]["nB"], "shared", len(out[k]["shared"]), "runs_text", [r["forms"] for r in out[k]["runs_text"]], "runs_filt", [(r["forms"], r["skipA"], r["skipB"]) for r in out[k]["runs_filt"]], "lcs", out[k]["lcs"], "markA same/diff", out[k]["markA_same"], out[k]["markA_diff"], "markB", out[k]["markB_same"], out[k]["markB_diff"])
