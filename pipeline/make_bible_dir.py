#!/usr/bin/env python3
"""번역 본문(.bdb SQLite: Bible 표의 book·chapter·verse·btext) → study/bible/<id>/{1..39}.json + info.json (+ notes/<책>.json)

쓰기: python3 pipeline/make_bible_dir.py <파일.bdb> <id> --name 개역개정 --src "..." [--out study/bible]
- 구약 39권만. books[장-1][절-1] = 본문(개역 절 체계 — 앱의 한글 장·절과 같다).
- 새번역처럼 본문 끝에 ' / ①각주…' 가 붙은 경우: 본문에는 각주 번호(①)만 남기고, 각주는 notes/<책>.json {"장:절": "①… ②…"} 로 따로 둔다.
"""
import sys, json, os, re, sqlite3, argparse
ap = argparse.ArgumentParser(); ap.add_argument("path"); ap.add_argument("id"); ap.add_argument("--name", required=True); ap.add_argument("--src", required=True); ap.add_argument("--out", default="study/bible")
a = ap.parse_args()
con = sqlite3.connect(a.path); B = [[] for _ in range(39)]; N = [dict() for _ in range(39)]; nn = 0
for b, c, v, t in con.execute('select book, chapter, verse, btext from Bible order by book, chapter, verse'):
    try: b, c, v = int(b), int(c), int(v)
    except (TypeError, ValueError): continue
    if not (1 <= b <= 39) or c < 1 or v < 1: continue
    t = (t or "").strip(); note = ""
    if " / " in t and re.search(r" / [①-⑳]", t):
        t, note = t.split(" / ", 1); t = t.strip(); note = note.strip()
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
json.dump({"name": a.name, "src": a.src, "notes": bool(nn)}, open(os.path.join(d, "info.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"{a.name}: 구약 {sum(1 for bk in B for ch in bk for x in ch if x):,}절 · 각주 {nn:,}개 → {d}")
