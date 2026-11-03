#!/usr/bin/env python3
"""TBESH(STEPBible, CC BY 4.0) → study/tbesh.json

쓰는 법:
  python3 pipeline/tbesh_ko/make_tbesh.py <TBESH.txt> <작업폴더> [study/tbesh.json]

<작업폴더> 안에 gl_out/outNN.json(핵심 뜻 번역), nm_out/outNN.json(이름 설명 번역)이 있어야 한다.
빠진 번역은 영어를 그대로 둔다(check 결과에 적힌다).

TBESH.txt 원본은 저장소에 넣지 않는다(STEPBible이 사본 게시를 원치 않음). 받는 곳:
  https://github.com/STEPBible/STEPBible-Data/blob/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt
번역 결과(gl_out/·nm_out/)와 지침(GL_GUIDE.md·NM_GUIDE.md), 이름 묶음 준비(prep_names.py)는 이 폴더에 둔다.

출력 구조: {"<스트롱 번호>": [[sfx, heb, tr, morph, ko, desc, rel], ...]}
  sfx   dStrong 뒤에 붙는 글자(G, H, …; 없으면 "")
  heb   히브리어 표제어
  tr    STEP 음역
  morph TBESH 품사 코드(H:N-M, N:N-M-P …)
  ko    핵심 뜻(우리말)
  desc  이름 설명(우리말; 사람·땅 이름일 때만, § 앞의 Tyndale 부분만)
  rel   관계: "" | "aram:1" | "name:22G" | "spell:…" | "mean:…" | "group:…" | "part:…" | "form:…" | "comb:…" | "heb:…"
"""
import json, re, sys, glob, os

REL = {'= in Aramaic of': 'aram', '= a Meaning of': 'mean', '= a Name of': 'name', '= a Spelling of': 'spell',
       '= a group of': 'group', '= a Part of': 'part', '= a form of': 'form', '= combination of': 'comb', '= in Hebrew of': 'heb'}

def load_rows(path):
    rows = [l.rstrip('\n').split('\t') for l in open(path, encoding='utf-8-sig')]
    rows = [r for r in rows if len(r) >= 8 and re.match(r'^H\d{4}', r[0])]
    return rows

def pre_desc(mn):
    pre = re.split(r'<br\s*/?>\s*§|§', mn, flags=re.I)[0]
    pre = re.sub(r'<br\s*/?>', ' ', pre, flags=re.I).replace('<i>', '').replace('</i>', '')
    return re.sub(r'\s+', ' ', pre).strip(' ;')

def main():
    src, work = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else 'study/tbesh.json'
    gl = {}
    for f in sorted(glob.glob(os.path.join(work, 'gl_out', 'out*.json'))):
        for x in json.load(open(f)): gl[x['k']] = x['ko']
    nm = {}
    for f in sorted(glob.glob(os.path.join(work, 'nm_out', 'out*.json'))):
        for x in json.load(open(f)): nm[x['k']] = x['ko']
    D, miss_gl, miss_nm = {}, [], []
    for r in load_rows(src):
        e, d, u, heb, tr, mo, g, mn = r[:8]
        num = int(e[1:5])
        if num >= 9000: continue
        dkey = d.split()[0]; sfx = dkey[5:]
        reltxt = d[len(dkey):].strip()
        rel = ''
        for k, v in REL.items():
            if reltxt.startswith(k):
                tg = re.findall(r'H0*(\d+[A-Z]?)', u)
                rel = v + ':' + ','.join(tg); break
        isname = mo.startswith('N:')
        ko = gl.get(dkey)
        if ko is None: ko = g.strip(); miss_gl.append(dkey)
        ko = ko.replace('`', '').strip()
        desc = ''
        if isname:
            en = pre_desc(mn)
            if en:
                desc = nm.get(dkey)
                if desc is None: desc = en; miss_nm.append(dkey)
        D.setdefault(str(num), []).append([sfx, heb.strip(), tr.strip(), mo.strip(), ko, desc, rel])
    json.dump(D, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    n = sum(len(v) for v in D.values())
    print(f'wrote {out}: {len(D)} numbers, {n} entries, {os.path.getsize(out)//1024}KB; missing gloss {len(miss_gl)}, missing name desc {len(miss_nm)}')
    if miss_gl: print('  gloss:', miss_gl[:10])
    if miss_nm: print('  name:', miss_nm[:10])

if __name__ == '__main__':
    main()
