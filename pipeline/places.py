#!/usr/bin/env python3
"""지도 자료 만들기 — study/places.json

쓰기: python3 pipeline/places.py <OpenBible ancient.jsonl> <CBSR index.html>

자료와 방법
- 어떤 낱말이 지명인가: 앱 사전(study/meta.json lex)에서 고유명사(nmpr) 가운데 우리말 풀이에 '(곳)'이 붙은 것.
- 좌표·확실성: OpenBible.info Bible Geocoding Data (CC BY 4.0) ancient.jsonl.
  장소마다 성경 구절 목록과, 학자들의 판단을 모은 위치 후보(identification)와 확실성 점수(time_total, 1000 = 매우 확실)가 있다.
  가장 점수가 높은 후보의 좌표를 쓰고, 점수가 EST_BELOW 미만이면 '추정 위치'로 표시한다.
- 히브리어 연결: OpenBible 장소의 구절마다 BHSA 원문에 나오는 지명 낱말을 세어, 그 구절들에 가장 고르게 나오는 낱말(들)을 그 장소의 히브리어로 삼는다.
  같은 낱말이 서로 다른 곳을 가리키면(예: 아벡 1·2) 구절 목록으로 가린다(앱에서 그 절이 어느 장소의 목록에 있는지 본다).
- CBSR 지도와 맞추기: CBSR의 지명 150곳(GAZ)과 이름이 같으면 CBSR 좌표를 그대로 쓴다(두 앱이 같은 점을 찍도록).
  새로 생긴 지명은 pipeline/places_cbsr_add.json 으로 따로 내어 CBSR 에 넣는다.
- 이동 경로·지형 그림 범위·물길·바다 이름: CBSR 의 ROUTES_B·TERRAIN·WATER·CTXL 를 그대로 옮긴다(같은 제작자의 앱).
"""
import json, re, sys, collections, os

EST_BELOW = 700
# BHSA 영어 풀이와 OpenBible 이름이 다르게 적힌 것(norm 한 소문자 → OpenBible 쪽)
ALIAS = {"tyre": "tyrus", "judea": "judaea"}      # 이 점수(1000 만점) 미만이면 '추정 위치'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OSIS = "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal".split()
KIND = {"settlement": "c", "campsite": "c", "district in settlement": "c", "structure": "c", "gate": "c", "fortification": "c",
        "region": "r", "people group": "r", "island": "r", "natural area": "r", "valley": "r", "field": "r", "forest": "r", "garden": "r",
        "mountain": "m", "hill": "m", "mountain range": "m", "mountain ridge": "m", "mountain pass": "m", "cliff": "m", "rock": "m", "promontory": "m",
        "river": "w", "spring": "w", "body of water": "w", "wadi": "w", "pool": "w", "well": "w", "canal": "w", "ford": "w"}


def js_const(src, name):
    i = src.find("const " + name + "=")
    if i < 0:
        raise SystemExit(f"CBSR 에 {name} 가 없습니다")
    j = i + len("const " + name + "=")
    # 괄호 짝을 세어 값 끝을 찾는다
    depth, k, instr, q = 0, j, False, ""
    while k < len(src):
        ch = src[k]
        if instr:
            if ch == "\\": k += 2; continue
            if ch == q: instr = False
        elif ch in "\"'": instr, q = True, ch
        elif ch in "[{": depth += 1
        elif ch in "]}":
            depth -= 1
            if depth == 0: k += 1; break
        k += 1
    txt = src[j:k]
    txt = re.sub(r"([{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:", r'\1"\2":', txt)   # 따옴표 없는 키
    return json.loads(txt)


def main(ob_path, cbsr_path):
    meta = json.load(open(os.path.join(ROOT, "study/meta.json"), encoding="utf-8"))
    W = json.load(open(os.path.join(ROOT, "study/words.json"), encoding="utf-8"))
    LEX = meta["lex"]
    PLACE_TAG = re.compile(r"\((곳|산|강|나라|시내|골짜기|못|민족·땅|사람·땅|민족·나라|사람·지파·곳|사람·지파·나라)\)\s*$")
    placeLex = {i for i, x in enumerate(LEX) if x[2] == "nmpr" and PLACE_TAG.search(x[9] or "")}
    nmpr = {i for i, x in enumerate(LEX) if x[2] == "nmpr"}
    ko = lambda i: re.sub(r"\s*\([^)]*\)\s*$", "", LEX[i][9] or "").strip()
    norm = lambda t: re.sub(r"[^a-z]", "", (t or "").lower())
    V = W["V"]
    import base64, array, gzip
    wl = array.array("H", base64.b64decode(W["wl"]))   # 앱과 같은 방식: base64 로 담은 uint16(리틀 엔디언)
    if sys.byteorder != "little": wl.byteswap()
    vi_of = {(v[0], v[1], v[2]): i for i, v in enumerate(V)}
    verse_np = [[wl[j] for j in range(v[5], v[5] + v[6]) if wl[j] in nmpr] for v in V]
    byGloss = collections.defaultdict(list)
    for i in nmpr: byGloss[norm(LEX[i][5])].append(i)
    lexfreq = collections.Counter(wl[j] for j in range(len(wl)) if wl[j] in nmpr)

    src = open(cbsr_path, encoding="utf-8").read()
    GAZ = js_const(src, "GAZ")
    cb = {p[0]: p for p in GAZ["places"]}
    cbsr_people = set(GAZ.get("people", []))
    bj = open(os.path.join(os.path.dirname(cbsr_path), "bible.js"), encoding="utf-8").read()
    BIB = json.loads(gzip.decompress(base64.b64decode(re.search(r'BIBLE_B64="([^"]+)"', bj).group(1))).decode("utf-8"))
    def ktext(vi):
        b, c, v = V[vi][0], V[vi][1], V[vi][2]
        try: return BIB[b - 1][c - 1][v - 1]
        except Exception: return ""
    P, LX, stats = [], collections.defaultdict(list), collections.Counter()
    for line in open(ob_path, encoding="utf-8"):
        a = json.loads(line)
        vis = []
        for v in a.get("verses", []):
            m = re.match(r"(\w+)\.(\d+)\.(\d+)$", v["osis"])
            if not m or m.group(1) not in OSIS: continue
            k = (OSIS.index(m.group(1)) + 1, int(m.group(2)), int(m.group(3)))
            if k in vi_of: vis.append(vi_of[k])
        if not vis: continue
        stats["ob_ot"] += 1
        vs = set(vis); cnt = collections.Counter()
        for vi in vs:
            for li in set(verse_np[vi]): cnt[li] += 1
        if not cnt: stats["no_heb"] += 1; continue
        en = re.sub(r"\s+\d+$", "", a["friendly_id"])
        tn = a.get("translation_name_counts") or {en: 1}; mx = max(tn.values())
        names = {norm(en)} | {norm(k) for k, n in tn.items() if n >= 0.1 * mx}
        names |= {norm(ALIAS[x]) for x in list(names) if x in ALIAS}
        # ① 영어 이름이 같은 고유명사  ② 이름이 달라도(<town> 같은 풀이) 그 구절들 대부분에 나오고, 낱말 자체가 거의 이 장소에만 쓰이는 지명 낱말
        lexes = [li for li in cnt if norm(LEX[li][5]) in names]
        # BHSA 가 지명을 '<town>' 같은 자리표로만 풀이한 낱말: 이름이 맞은 낱말과 우리말 이름이 같으면 같은 지명으로 본다(예: 이스르엘·아나돗·하란)
        kset = {ko(li) for li in lexes} | {ko(j) for n in names for j in byGloss.get(n, [])}
        lexes += [li for li in cnt if li not in lexes and LEX[li][5].startswith("<") and li in placeLex and ko(li) in kset]
        if not lexes:
            lexes = [li for li, n in cnt.items() if li in placeLex and LEX[li][5].startswith("<") and len(vs) >= 2 and n >= 0.8 * len(vs) and lexfreq[li] <= 2 * len(vs) + 2]
        if not lexes: stats["weak"] += 1; continue
        I = [i for i in a.get("identifications", []) if any(r.get("lonlat") for r in i.get("resolutions", []))]
        if not I: stats["no_coord"] += 1; continue
        best = max(I, key=lambda i: (i.get("score", {}).get("time_total", 0), i.get("score", {}).get("vote_total", 0)))
        res = next(r for r in best["resolutions"] if r.get("lonlat"))
        lon, lat = map(float, res["lonlat"].split(","))
        conf = int(best.get("score", {}).get("time_total", 0))
        types = a.get("types", [])
        kind = next((KIND[t] for t in types if t in KIND), "r")
        # 우리말 이름: 후보(이 장소에 이어진 낱말들의 우리말 이름) 가운데 그 구절들의 개역 본문에 실제로 가장 많이 나오는 것
        cands = list(dict.fromkeys([ko(li) for li in sorted(lexes, key=lambda li: -cnt[li]) if ko(li)] + [ko(li) for li in byGloss.get(norm(LEX[lexes[0]][5]), []) if ko(li)]))
        tx = " ".join(ktext(vi) for vi in vs)
        name = max(cands, key=lambda n: (tx.count(n), -cands.index(n))) if cands else en
        cbp = cb.get(name) or cb.get(name + " 산")
        if cbp:
            lat, lon, kind, name = cbp[1], cbp[2], cbp[3], cbp[0]
        pi = len(P)
        P.append([name, round(lat, 4), round(lon, 4), kind, conf, 1 if conf < EST_BELOW else 0, en, a["id"], 1 if cbp else 0])
        for li in lexes:
            LX[li].append([pi, sorted(set(vis))])
        stats["linked"] += 1
    # 연결되지 못한 지명 낱말이라도 같은 영어 이름의 다른 낱말이 연결됐으면 그 장소 후보를 함께 쓴다(철자 갈래가 다른 같은 지명)
    for i in placeLex:
        if i in LX: continue
        for j in byGloss.get(norm(LEX[i][5]), []):
            if j in LX and not LEX[i][5].startswith("<"):
                LX[i] = [list(c) for c in LX[j]]; stats["by_gloss"] += 1; break
    # 같은 낱말에 장소가 여럿이면 구절이 많은 쪽을 앞에(기본값)
    for li in LX: LX[li].sort(key=lambda c: -len(c[1]))
    unlinked = sorted((LEX[i][7], ko(i)) for i in placeLex if i not in LX)
    out = {"v": 1, "est_below": EST_BELOW,
           "src": "좌표·확실성: OpenBible.info Bible Geocoding Data (CC BY 4.0) · 지명 이름·이동 경로·지형: CBSR(이츠학) · 지형 그림: AWS Terrain Tiles(Mapzen) · 해안선: Natural Earth",
           "P": P, "LX": {str(k): v for k, v in LX.items()},
           "R": js_const(src, "ROUTES_B"), "T": js_const(src, "TERRAIN"), "W": js_const(src, "WATER"), "C": js_const(src, "CTXL")}
    json.dump(out, open(os.path.join(ROOT, "study/places.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    # CBSR 에 더할 지명: CBSR 에 없고, 구약에 2번 이상, 두 글자 이상, CBSR 인명과 겹치지 않는 것(한글 본문에서 이름으로 찾기 때문)
    freq = collections.Counter()
    for li, cands in LX.items():
        for pi, vs in cands: freq[pi] += len(vs)
    # CBSR 는 한글 본문에서 이름을 찾으므로, 그 본문(개역개정, CBSR bible.js)에서 이 이름이 실제로 몇 번 걸리는지 센다.
    # 히브리어 횟수보다 훨씬 많이 걸리면 보통 낱말과 겹치는 이름(예: 아이=어린이, 바라=바라다)이라 넣지 않는다.
    PART = re.search(r'const PARTICLE="([^"]+)"', src).group(1)
    # 절마다: 그 절 히브리어에 나오는 고유명사들의 우리말 이름 — 한글 본문에서 이름이 걸렸는데 히브리어에 그 이름의 고유명사가 없으면 '다른 뜻으로 걸린 것'
    names_in = [{ko(li) for li in verse_np[vi]} | {P[pi][0] for li in verse_np[vi] for pi, _ in LX.get(li, [])} for vi in range(len(V))]
    def kcount(n):
        rx = re.compile("(?<![가-힣])" + re.escape(n) + "(?=" + PART + "?(?![가-힣]))"); tot = out = 0
        for vi in range(len(V)):
            if V[vi][0] > 39: break
            k = len(rx.findall(ktext(vi)))
            if k: tot += k; out += 0 if n in names_in[vi] else k
        return tot, out
    order = sorted(range(len(P)), key=lambda pi: -freq[pi])      # 같은 이름이 여럿이면 많이 나오는 곳을
    seen, add, skipped = set(cb), [], []
    for pi in order:
        p = P[pi]
        if p[8] or p[0] in seen or len(p[0]) < 2 or p[0] in cbsr_people or freq[pi] < 2: continue
        seen.add(p[0]); kc, kout = kcount(p[0])
        if kc == 0 or kout > max(2, 0.2 * kc): skipped.append(f"{p[0]}(한글 {kc}번 중 {kout}번은 다른 뜻)"); continue
        add.append([p[0], p[1], p[2], p[3], p[5], p[4], p[6]])
    print("CBSR 에 넣지 않은 이름(한글 본문에서 다른 뜻으로 많이 걸리거나 없음):", ", ".join(skipped[:60]), f"… 모두 {len(skipped)}")
    json.dump(add, open(os.path.join(ROOT, "pipeline/places_cbsr_add.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(json.dumps({**stats, "places": len(P), "lexemes": len(LX), "place_lexemes": len(placeLex), "unlinked": len(unlinked),
                      "est": sum(p[5] for p in P), "from_cbsr": sum(p[8] for p in P), "cbsr_add": len(add)}, ensure_ascii=False))
    print("연결 못 한 지명(많이 나오는 순):", ", ".join(f"{n}({c})" for c, n in sorted(unlinked, reverse=True)[:25]))


if __name__ == "__main__":
    main(*sys.argv[1:3])
