"""words.json에 BHSA 2021 clause_atom 실제 노드 번호(can)를 넣는다.

BHSA 전체를 다시 돌리지 않고 otype.tf + oslots.tf + book.tf 세 파일만 읽는다.
- aid(절 원자 번호, 0부터)는 build_study.py가 책을 개역 순서로 돌며 매긴 것이라
  BHSA 노드 번호와 차례가 다르다(BHSA는 타나크 순서). 그래서 실제 번호를 따로 넣는다.
- 검산: 한 절 원자(aid)에 속한 모든 낱말이 BHSA에서도 같은 clause_atom 노드여야 하고,
  tab(층)도 tab.tf와 같아야 한다.

쓰는 법: python3 add_can.py <tf/2021 폴더> <study 폴더>
"""
import sys, json, base64, re, array

TF, ST = sys.argv[1], sys.argv[2]
BH = ["Genesis","Exodus","Leviticus","Numeri","Deuteronomium","Josua","Judices","Ruth","Samuel_I","Samuel_II","Reges_I","Reges_II","Chronica_I","Chronica_II","Esra","Nehemia","Esther","Iob","Psalmi","Proverbia","Ecclesiastes","Canticum","Jesaia","Jeremia","Threni","Ezechiel","Daniel","Hosea","Joel","Amos","Obadia","Jona","Micha","Nahum","Habakuk","Zephania","Haggai","Sacharia","Maleachi"]

def body(path):
    with open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    i = 0
    while i < len(lines) and (lines[i].startswith("@") or lines[i] == ""):
        i += 1
    return lines[i:]

# otype: 노드 구간 → 종류
rng = {}
for ln in body(TF + "/otype.tf"):
    if not ln.strip(): continue
    a, t = ln.split("\t"); lo, hi = a.split("-"); rng[t] = (int(lo), int(hi))
W_HI = rng["word"][1]
CA_LO, CA_HI = rng["clause_atom"]
BK_LO, BK_HI = rng["book"]

# oslots: 노드마다 슬롯(낱말) 목록. 첫 줄 "노드\t구간", 그 뒤로는 노드 번호가 1씩 는다
def slots_of(s):
    out = []
    for p in s.split(","):
        if "-" in p: a, b = p.split("-"); out.append((int(a), int(b)))
        else: out.append((int(p), int(p)))
    return out
node = None
w2ca = array.array("i", [0]) * (W_HI + 2)   # 낱말 슬롯 → clause_atom 노드
book_slots = {}
for ln in body(TF + "/oslots.tf"):
    if not ln.strip(): continue
    if "\t" in ln:
        n, s = ln.split("\t"); node = int(n)
    else:
        node += 1; s = ln
    if CA_LO <= node <= CA_HI:
        for a, b in slots_of(s):
            for w in range(a, b + 1): w2ca[w] = node
    elif BK_LO <= node <= BK_HI:
        book_slots[node] = slots_of(s)

# book.tf: 노드 → 책 이름
bname = {}
node = None
for ln in body(TF + "/book.tf"):
    if not ln.strip(): continue
    if "\t" in ln:
        n, v = ln.split("\t"); node = int(n)
    else:
        node += 1; v = ln
    if BK_LO <= node <= BK_HI: bname[node] = v   # 장·절 노드에도 책 이름이 있어 책 노드만
bnode = {v: k for k, v in bname.items()}

# tab.tf (검산용): clause_atom 노드 → tab
tab = {}
node = None
for ln in body(TF + "/tab.tf"):
    if not ln.strip(): continue
    if "\t" in ln:
        n, v = ln.split("\t"); node = int(n)
    else:
        node += 1; v = ln
    if CA_LO <= node <= CA_HI: tab[node] = int(v)

# words.json의 낱말 순서(개역 책 순서) → BHSA 슬롯
slot_seq = []
for b in BH:
    for a, z in book_slots[bnode[b]]:
        slot_seq.extend(range(a, z + 1))

w = json.load(open(ST + "/words.json", encoding="utf-8"))
def u8(s): return base64.b64decode(s)
def dec(o):
    s = u8(o["s"]); r = []; mx = -1; prev = -1; k = 0
    for c in s:
        if c == 0: pass
        elif c == 1: mx += 1; prev = mx
        else: prev = o["x"][k]; k += 1
        r.append(prev)
    return r
wa = dec(w["wa"]); at = u8(w["at"])
N = len(wa)
assert N == len(slot_seq), (N, len(slot_seq))
nA = max(wa) + 1
can = [0] * nA; bad = 0; badtab = 0
for i in range(N):
    n = w2ca[slot_seq[i]]
    a = wa[i]
    if can[a] == 0: can[a] = n
    elif can[a] != n: bad += 1
for a in range(nA):
    if min(255, tab[can[a]]) != at[a]: badtab += 1
print("words", N, "atoms", nA, "mismatch", bad, "tab mismatch", badtab)
print("first atoms (aid → BHSA node):", [(a, can[a]) for a in range(5)], "… Job first:", can[wa[slot_seq.index(book_slots[bnode['Iob']][0][0])]])
assert bad == 0 and badtab == 0 and all(can)
# 저장: 차이 부호화(앞 노드와의 차이, 대부분 1)로 작게. 앱에서는 누적해서 쓴다.
d = [can[0]] + [can[a] - can[a - 1] for a in range(1, nA)]
w["can"] = d
w["bhsa"] = "2021"
json.dump(w, open(ST + "/words.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("wrote can (", nA, ") to", ST + "/words.json")
