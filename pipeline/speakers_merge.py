#!/usr/bin/env python3
"""목사님이 앱에서 '공용 자료로 보내기'로 내려받은 화자 확인 파일을 공용 자료(study/speakers.json 의 cur)에 넣는다.
쓰기: python3 pipeline/speakers_merge.py <milalwv-speakers-YYYY-MM-DD.json> [확인한 이 이름]
- 차례는 첫 낱말의 BHSA 낱말 번호(slot)로 찾으므로 자료를 다시 만들어도 같은 자리를 가리킨다.
- 같은 차례가 이미 있으면 새 파일 것으로 바꾼다(고친 날짜를 남김).
"""
import json, os, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = json.load(open(sys.argv[1], encoding="utf-8")); who = sys.argv[2] if len(sys.argv) > 2 else "이삭 목사"
if src.get("schema") != "MILALWV-SPEAKERS-1": raise SystemExit("화자 확인 파일이 아닙니다")
f = os.path.join(ROOT, "study/speakers.json"); D = json.load(open(f, encoding="utf-8")); D.setdefault("cur", {})
n = 0
for b, turns in src.get("books", {}).items():
    cur = D["cur"].setdefault(str(b), {})
    for k, t in turns.items():
        cur[k] = {"sp": t.get("sp", ""), "to": t.get("to", ""), "ref": t.get("ref", ""), "auto": t.get("auto", ""), "by": who, "d": datetime.date.today().isoformat()}; n += 1
json.dump(D, open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"공용 자료에 {n}개 차례를 넣었습니다(책 {', '.join(src.get('books', {}).keys())}).")
