import json,sys,re
n=sys.argv[1]; I=json.load(open(f"in{n}.json")); O=json.load(open(f"out{n}.json"))
miss=[k for k in I if k not in O]; bad=[]
for k,v in O.items():
  for f in "smu":
    t=v.get(f,""); 
    if I.get(k,{}).get(f) and not t: bad.append((k,f,"빈칸"))
    if re.search(r"[A-Za-z]{4,}",re.sub(r"H\d+","",t)): bad.append((k,f,t[:60]))
  hs=set(re.findall(r"H\d+",I.get(k,{}).get("s",""))); ho=set(re.findall(r"H\d+",v.get("s","")))
  if hs-ho: bad.append((k,"s","H번호 빠짐"))
print("빠진 키",len(miss),miss[:10]); print("문제",len(bad)); [print(b) for b in bad[:40]]
