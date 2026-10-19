# out0~9.json(우리말 스트롱) + HebrewStrong.xml(히브리어 표제어) → strong.json {번호:[히브리어, 유래, 단어 정의, KJV에서 옮긴 말]}
# HebrewStrong.xml: https://github.com/openscriptures/HebrewLexicon (CC BY 4.0, 스트롱 사전 본문은 공개 저작물)
import json,re,sys
xml=sys.argv[1] if len(sys.argv)>1 else "HebrewLexicon/HebrewStrong.xml"
s=open(xml,encoding="utf-8").read()
heb={m.group(1):m.group(2) for m in re.finditer(r'<entry id="H(\d+)">\s*<w [^>]*>([^<]*)</w>',s)}
O={}
for i in range(10): O.update(json.load(open(f"out{i}.json",encoding="utf-8")))
out={str(int(k)):[heb.get(k,""),v.get("s",""),v.get("m",""),v.get("u","")] for k,v in O.items()}
json.dump(out,open("strong.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print(len(out))
