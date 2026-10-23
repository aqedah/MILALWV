#!/usr/bin/env python3
"""번역 본문(.bdb SQLite: Bible 표의 book·chapter·verse·btext) → study/bible/<id>/{1..39}.json + info.json (+ notes/<책>.json)

쓰기: python3 pipeline/make_bible_dir.py <파일.bdb> <id> --name 개역개정 --src "..." [--out study/bible]
- 구약 39권만. books[장-1][절-1] = 본문(개역 절 체계 — 앱의 한글 장·절과 같다).
- 새번역처럼 본문 끝에 ' / ①각주…' 가 붙은 경우: 본문에는 각주 번호(①)만 남기고, 각주는 notes/<책>.json {"장:절": "①… ②…"} 로 따로 둔다.
"""
import sys, json, os, re, sqlite3, argparse
ap = argparse.ArgumentParser(); ap.add_argument("path"); ap.add_argument("id"); ap.add_argument("--name", required=True); ap.add_argument("--src", required=True); ap.add_argument("--out", default="study/bible")
a = ap.parse_args()
SMALL = {"a", "an", "the", "of", "and", "or", "to", "in", "on", "for", "with", "at", "by", "from", "against", "about", "over", "into", "upon", "is", "his", "her", "my"}
def title_case(x):
    w = re.findall(r"[A-Za-z’']+", x)
    return 0 < len(w) <= 9 and w[0][0].isupper() and all(t[0].isupper() or t.lower() in SMALL for t in w)
def clean_html(t):
    """영어 성경(.bdb HTML): '<br>→ ' 뒤는 각주, <e>…</e>·<b>…</b>·첫 줄의 제목꼴(NIV)은 소제목, <br>은 띄어쓰기, 나머지 태그는 지움(각주 번호 ①은 남김)"""
    parts = t.split("<br>→"); body, notes = parts[0], [p.strip() for p in parts[1:]]
    heads = re.findall(r"<e>(.*?)</e>", body) + re.findall(r"<b>(.*?)</b>", body)
    body = re.sub(r"<e>.*?</e>|<b>.*?</b>(<sup>[^<]*</sup>)?(<br>)?", " ", body)
    segs = body.split("<br>")
    if len(segs) > 1:
        first = re.sub(r"<[^>]+>", "", segs[0]).strip()
        nxt = re.sub(r"<[^>]+>", "", segs[1]).strip()
        if first and title_case(first) and not re.match(r"[a-z]", nxt) and not re.search(r"[.,;:!?”’\"]$", first): heads.append(first); segs = segs[1:]
    body = " ".join(segs)
    strip = lambda x: re.sub(r"\s+", " ", re.sub(r"<sup>([^<]*)</sup>", r"\1", re.sub(r"</?(?:a|i|f|pb|e|b)\b[^>]*>|</?(?:a|i|f|pb|e|b)>", "", x))).strip()
    body = re.sub(r"<[^>]+>", "", strip(body)).strip(); note = " ".join(re.sub(r"<[^>]+>", "", strip(n)) for n in notes).strip()
    head = " · ".join(re.sub(r"<[^>]+>", "", strip(h)) for h in heads if strip(h))
    return body, note, head
con = sqlite3.connect(a.path); B = [[] for _ in range(39)]; N = [dict() for _ in range(39)]; H = [dict() for _ in range(39)]; nn = nh = 0
for b, c, v, t in con.execute('select book, chapter, verse, btext from Bible order by book, chapter, verse'):
    try: b, c, v = int(b), int(c), int(v)
    except (TypeError, ValueError): continue
    if not (1 <= b <= 39) or c < 1 or v < 1: continue
    t = (t or "").strip(); note = ""; head = ""
    if "<" in t: t, note, head = clean_html(t)
    elif " / " in t and re.search(r" / [①-⑳]", t):
        t, note = t.split(" / ", 1); t = t.strip(); note = note.strip()
    if head: H[b-1][f"{c}:{v}"] = head; nh += 1
    if not t: t = "—"  # 그 번역이 이 절을 앞뒤 절에 합쳐 옮긴 경우(예: NRSV 출 22:4)
    while len(B[b-1]) < c: B[b-1].append([])
    ch = B[b-1][c-1]
    while len(ch) < v: ch.append("")
    ch[v-1] = t
    if note: N[b-1][f"{c}:{v}"] = note; nn += 1
d = os.path.join(a.out, a.id); os.makedirs(d, exist_ok=True)
for i in range(39): json.dump(B[i], open(os.path.join(d, f"{i+1}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
if nn:
    os.makedirs(os.path.join(d, "notes"), exist_ok=True)
    for i in range(39): json.dump(N[i], open(os.path.join(d, "notes", f"{i+1}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
if nh:
    os.makedirs(os.path.join(d, "heads"), exist_ok=True)
    for i in range(39): json.dump(H[i], open(os.path.join(d, "heads", f"{i+1}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump({"name": a.name, "src": a.src, "notes": bool(nn), "heads": bool(nh), "lang": "en" if re.search(r"[A-Za-z]", (B[0][0][0] if B[0] and B[0][0] else "")) and not re.search(r"[가-힣]", B[0][0][0]) else "ko"}, open(os.path.join(d, "info.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"{a.name}: 구약 {sum(1 for bk in B for ch in bk for x in ch if x):,}절 · 각주 {nn:,}개 · 소제목 {nh:,}개 → {d}")
