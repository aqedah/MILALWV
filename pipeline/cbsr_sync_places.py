#!/usr/bin/env python3
"""MILALWV 지도에서 확정한 지명을 CBSR 지도(GAZ)에 반영 — 여러 번 돌려도 같은 결과(멱등).

쓰기: python3 pipeline/cbsr_sync_places.py <CBSR 저장소 폴더>
- CBSR 원래 지명(4칸: 이름·위도·경도·종류)은 그대로 둔다.
- MILALWV 에서 더한 지명은 6칸(…·추정 0/1·확실성 0–1000)으로 넣는다. 다시 돌리면 6칸 항목을 지우고 새 목록으로 바꾼다.
- 목록은 pipeline/places.py 가 만든 pipeline/places_cbsr_add.json(한글 본문에서 다른 뜻으로 걸리는 이름은 이미 뺌).
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cb = sys.argv[1]
add = json.load(open(os.path.join(ROOT, "pipeline/places_cbsr_add.json"), encoding="utf-8"))
p = os.path.join(cb, "index.html"); s = open(p, encoding="utf-8").read()
i = s.index("const GAZ="); j = s.index("\n", i); line = s[i:j]
G = json.loads(line[len("const GAZ="):].rstrip(";"))
orig = [x for x in G["places"] if len(x) == 4]
names = {x[0] for x in orig}
new = [[n, la, lo, k, est, conf] for n, la, lo, k, est, conf, en in add if n not in names]
G["places"] = orig + new
s = s[:i] + "const GAZ=" + json.dumps(G, ensure_ascii=False) + (";" if line.endswith(";") else "") + s[j:]
open(p, "w", encoding="utf-8").write(s)
print(f"CBSR 지명: 원래 {len(orig)} + MILALWV 에서 {len(new)} = {len(G['places'])} (추정 위치 {sum(x[4] for x in new)})")
