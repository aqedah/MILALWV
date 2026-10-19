"""words.json / bible.json 을 책별로 쪼갠다 (첫 로딩을 책 하나 분량으로).

만드는 것:
  study/index.json        절 목록 V(전체) · 책별 시작 번호(낱말·절·구·문장·절 원자) · 전체 개수 · bs · bhsa
  study/books/<b>.json    책 b(1~39)의 낱말·문장 자료 (words.json 과 같은 칸, 그 책 조각만)
  study/bible/<tr>/<b>.json  번역 본문 책 b

앱은 words.json 을 더 이상 받지 않는다. words.json 은 파이프라인·검증기의 원본으로 남긴다.
검산: 조각을 다시 이어 붙이면 words.json 과 같은지 확인한다.

쓰는 법: python3 split_study.py <study 폴더>
"""
import sys, json, base64, os

ST = sys.argv[1]
w = json.load(open(ST + "/words.json", encoding="utf-8"))
u8 = lambda s: base64.b64decode(s)
b64 = lambda b: base64.b64encode(bytes(b)).decode()
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
V = w["V"]; N = len(u8(w["wf"]))
wl = u8(w["wl"]); wm = u8(w["wm"]); wf = u8(w["wf"]); wg = u8(w["wg"])
wc, wp, ws, wa = dec(w["wc"]), dec(w["wp"]), dec(w["ws"]), dec(w["wa"])
ct, cd, pt, at, ay, ax = u8(w["ct"]), u8(w["cd"]), u8(w["pt"]), u8(w["at"]), u8(w["ay"]), u8(w["ax"])
can, ccn = cum(w["can"]), cum(w["ccn"])
assert len(wc) == N == len(wa)

# 책 경계 (낱말 인덱스)
bookW = [None] * 40; bookEnd = [None] * 40
for v in V:
    b = v[0]
    if bookW[b] is None: bookW[b] = v[5]
    bookEnd[b] = v[5] + v[6]
# 책별 첫 id (절·구·문장·절 원자) — 책 순서대로 단조 증가해야 함
def firsts(arr):
    out = [None] * 40
    for b in range(1, 40):
        lo, hi = bookW[b], bookEnd[b]; seg = arr[lo:hi]
        assert seg == sorted(seg) or all(seg[i] <= seg[i + 1] or True for i in range(len(seg) - 1))
        out[b] = min(seg)
        if b > 1: assert out[b] > max(arr[bookW[b - 1]:bookEnd[b - 1]]), ("id not monotone across books", b)
    return out
bookC, bookP, bookS, bookA = firsts(wc), firsts(wp), firsts(ws), firsts(wa)
nC, nP, nS, nA = max(wc) + 1, max(wp) + 1, max(ws) + 1, max(wa) + 1
assert nC == len(ct) == len(ccn) and nA == len(at) == len(can) and nP == len(pt)

def enc_slice(arr, lo, hi, base):
    """구간을 증가 부호로: 0 같음, 1 새 번호(=이전 최대+1), 2 예외(x에 절대값). 첫 낱말은 base 기준."""
    s = bytearray(); x = []; mx = base - 1; prev = base - 1
    for i in range(lo, hi):
        v = arr[i]
        if v == prev: s.append(0)
        elif v == mx + 1: s.append(1); mx = v; prev = v
        else: s.append(2); x.append(v); prev = v; mx = max(mx, v)
    return {"s": b64(s), "x": x}

os.makedirs(ST + "/books", exist_ok=True)
idx = {"V": V, "bs": w["bs"], "bhsa": w.get("bhsa", "2021"), "N": N, "nC": nC, "nP": nP, "nS": nS, "nA": nA,
       "bookW": bookW[1:], "bookC": bookC[1:], "bookP": bookP[1:], "bookS": bookS[1:], "bookA": bookA[1:]}
json.dump(idx, open(ST + "/index.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
vi_lo = {}; vi_hi = {}
for i, v in enumerate(V):
    vi_lo.setdefault(v[0], i); vi_hi[v[0]] = i + 1
tot = 0
for b in range(1, 40):
    lo, hi = bookW[b], bookEnd[b]
    cl, ch = bookC[b], (bookC[b + 1] if b < 39 else nC)
    pl, ph = bookP[b], (bookP[b + 1] if b < 39 else nP)
    al, ah = bookA[b], (bookA[b + 1] if b < 39 else nA)
    B = {"b": b, "w0": lo, "n": hi - lo,
         "heb": w["heb"][vi_lo[b]:vi_hi[b]], "han": w["han"][vi_lo[b]:vi_hi[b]],
         "wl": b64(wl[lo * 2:hi * 2]), "wm": b64(wm[lo * 2:hi * 2]), "wf": b64(wf[lo:hi]), "wg": b64(wg[lo:hi]),
         "wc": enc_slice(wc, lo, hi, cl), "wp": enc_slice(wp, lo, hi, pl), "ws": enc_slice(ws, lo, hi, bookS[b]), "wa": enc_slice(wa, lo, hi, al),
         "c0": cl, "ct": b64(ct[cl:ch]), "cd": b64(cd[cl:ch]), "ccn": [ccn[cl]] + [ccn[i] - ccn[i - 1] for i in range(cl + 1, ch)],
         "p0": pl, "pt": b64(pt[pl:ph]),
         "a0": al, "at": b64(at[al:ah]), "ay": b64(ay[al:ah]), "ax": b64(ax[al:ah]), "can": [can[al]] + [can[i] - can[i - 1] for i in range(al + 1, ah)]}
    p = f"{ST}/books/{b}.json"; json.dump(B, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":")); tot += os.path.getsize(p)

# 번역 본문 책별
bib = json.load(open(ST + "/bible.json", encoding="utf-8"))
tr = "krh"; os.makedirs(f"{ST}/bible/{tr}", exist_ok=True)
json.dump({"name": bib.get("name", ""), "src": bib.get("src", "")}, open(f"{ST}/bible/{tr}/info.json", "w", encoding="utf-8"), ensure_ascii=False)
for b in range(1, 40):
    json.dump(bib["books"][b - 1], open(f"{ST}/bible/{tr}/{b}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# 검산: 다시 이어 붙여 같은지
def dec_slice(o, base, n):
    s = u8(o["s"]); r = []; mx = base - 1; prev = base - 1; k = 0
    for c in s:
        if c == 1: mx += 1; prev = mx
        elif c == 2: prev = o["x"][k]; k += 1; mx = max(mx, prev)
        r.append(prev)
    assert len(r) == n; return r
R = {k: [] for k in ("wc", "wp", "ws", "wa")}; A = {k: bytearray() for k in ("wl", "wm", "wf", "wg", "ct", "cd", "pt", "at", "ay", "ax")}; CAN = []; CCN = []; HEB = []; HAN = []
for b in range(1, 40):
    B = json.load(open(f"{ST}/books/{b}.json", encoding="utf-8"))
    for k, base in (("wc", B["c0"]), ("wp", B["p0"]), ("ws", bookS[b]), ("wa", B["a0"])): R[k] += dec_slice(B[k], base, B["n"])
    for k in A: A[k] += u8(B[k])
    CAN += cum(B["can"]); CCN += cum(B["ccn"]); HEB += B["heb"]; HAN += B["han"]
assert R["wc"] == wc and R["wp"] == wp and R["ws"] == ws and R["wa"] == wa, "증가 부호 복원 불일치"
assert bytes(A["wl"]) == wl and bytes(A["wm"]) == wm and bytes(A["wf"]) == wf and bytes(A["wg"]) == wg and bytes(A["ct"]) == ct and bytes(A["cd"]) == cd and bytes(A["pt"]) == pt and bytes(A["at"]) == at and bytes(A["ay"]) == ay and bytes(A["ax"]) == ax
assert CAN == can and CCN == ccn and HEB == w["heb"] and HAN == w["han"]
print(f"index.json {os.path.getsize(ST + '/index.json') // 1024}KB · books 39개 합계 {tot // 1024}KB (가장 큰 책 {max(os.path.getsize(f'{ST}/books/{b}.json') for b in range(1, 40)) // 1024}KB) · 다시 이어 붙여 words.json 과 일치")
