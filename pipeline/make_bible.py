#!/usr/bin/env python3
"""번역 본문 → study/bible.json

쓰는 법
  python3 pipeline/make_bible.py jsonl  <krv.jsonl>   --name 개역한글 --src "성경전서 개역한글판 (대한성서공회)"
  python3 pipeline/make_bible.py sqlite <개역개정.bdb> --name 개역개정 --src "..."   (표·열 이름은 자동으로 찾아봄)
  python3 pipeline/make_bible.py txt    <bible.txt>    --name 개역개정 --src "..."   ('창1:1 본문' 꼴 한 줄 한 절)

결과: study/bible.json = {"name":..., "src":..., "books":[[["절",...],...],...]}  (구약 39권만, books[책-1][장-1][절-1])
절 번호는 개역(KJV식)이며 words.json의 한글 장·절과 같은 체계입니다.
"""
import sys, json, re, os, argparse, sqlite3

OT=39
ABBR=["창","출","레","민","신","수","삿","룻","삼상","삼하","왕상","왕하","대상","대하","스","느","에","욥","시","잠","전","아","사","렘","애","겔","단","호","욜","암","옵","욘","미","나","합","습","학","슥","말"]

def put(B,b,c,v,t):
    if not (1<=b<=OT) or c<1 or v<1: return
    while len(B[b-1])<c: B[b-1].append([])
    ch=B[b-1][c-1]
    while len(ch)<v: ch.append("")
    ch[v-1]=t.strip()

def from_jsonl(path,B):
    for ln in open(path,encoding="utf-8"):
        ln=ln.strip()
        if not ln: continue
        r=json.loads(ln); put(B,int(r["book"]),int(r["chapter"]),int(r["verse"]),r["text"])

def from_txt(path,B):
    pat=re.compile(r"^(\S+?)\s*(\d+)\s*[:：]\s*(\d+)\s+(.*)$")
    for ln in open(path,encoding="utf-8",errors="replace"):
        m=pat.match(ln.strip())
        if not m: continue
        nm,c,v,t=m.groups()
        if nm in ABBR: b=ABBR.index(nm)+1
        elif nm.isdigit(): b=int(nm)
        else: continue
        put(B,b,int(c),int(v),t)

def from_sqlite(path,B):
    con=sqlite3.connect(path); cur=con.cursor()
    tables=[r[0] for r in cur.execute("select name from sqlite_master where type='table'")]
    print("표:",tables)
    for t in tables:
        cols=[r[1] for r in cur.execute(f"pragma table_info('{t}')")]
        lc=[c.lower() for c in cols]
        def pick(*names):
            for n in names:
                if n in lc: return cols[lc.index(n)]
            return None
        cb=pick("book","book_id","bid","bno","b"); cc=pick("chapter","chap","cno","c"); cv=pick("verse","vno","v"); ct=pick("text","content","scripture","body","t")
        if not (cb and cc and cv and ct): continue
        print(f"표 {t}: 책={cb} 장={cc} 절={cv} 본문={ct}")
        for b,c,v,tx in cur.execute(f'select "{cb}","{cc}","{cv}","{ct}" from "{t}"'):
            try: put(B,int(b),int(c),int(v),str(tx))
            except Exception: pass
        return
    raise SystemExit("책·장·절·본문 열을 찾지 못했습니다. 표와 열 이름을 알려 주세요.")

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("kind",choices=["jsonl","txt","sqlite"]); ap.add_argument("path"); ap.add_argument("--name",required=True); ap.add_argument("--src",required=True); ap.add_argument("--out",default=os.path.join(os.path.dirname(__file__),"..","study","bible.json"))
    a=ap.parse_args(); B=[[] for _ in range(OT)]
    {"jsonl":from_jsonl,"txt":from_txt,"sqlite":from_sqlite}[a.kind](a.path,B)
    n=sum(1 for bk in B for ch in bk for v in ch if v)
    json.dump({"name":a.name,"src":a.src,"books":B},open(a.out,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    print(f"{a.name}: 구약 {n:,}절 → {a.out}")
