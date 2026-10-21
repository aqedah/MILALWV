#!/usr/bin/env python3
"""words.json 의 한글 음역(han)만 다시 만든다 — hangul.py 규칙을 바꿨을 때. BHSA 원자료(낱말·형태·구조)는 건드리지 않는다.
입력: BHSA 2021 phono.tf (https://github.com/ETCBC/phono/tree/master/tf/2021). 낱말 i 의 BHSA 번호 = bs[책-1] + (i - 그 책 첫 낱말).
쓰는 법: python3 pipeline/rehan.py <phono.tf> study/words.json   (그 다음 python3 pipeline/split_study.py study)"""
import sys, json, base64
sys.path.insert(0, __file__.rsplit('/', 1)[0]); from hangul import word as hword
PH, WJ = sys.argv[1], sys.argv[2]
phono = {}; n = 0; body = False
for line in open(PH, encoding='utf-8'):
    line = line.rstrip('\n')
    if not body:
        if line == '': body = True
        continue
    if '\t' in line: k, v = line.split('\t', 1); n = int(k)
    else: n += 1; v = line
    if n > 426590: break
    phono[n] = v
D = json.load(open(WJ, encoding='utf-8'))
meta = json.load(open(WJ.rsplit('/', 1)[0] + '/meta.json', encoding='utf-8'))
def arr16(x):
    if isinstance(x, list): return x
    b = base64.b64decode(x); return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]
wl = arr16(D['wl']); lex = meta['lex']; V = D['V']; bs = D['bs']
first = {}
for v in V:
    first.setdefault(v[0], v[5])
changed = 0; out = []
for vi, (b, kc, kv, c, vv, s, cnt) in enumerate(V):
    old = D['han'][vi].split('\t'); new = []
    for j in range(cnt):
        i = s + j; slot = bs[b - 1] + (i - first[b])
        new.append('여호와' if lex[wl[i]][1] == 'JHWH/' else hword(phono.get(slot, '') or ''))
    if len(old) == cnt and old != new: changed += sum(1 for a, b2 in zip(old, new) if a != b2)
    D['han'][vi] = '\t'.join(new)
json.dump(D, open(WJ, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('바뀐 낱말 음역', changed, '/ 낱말', len(wl))
