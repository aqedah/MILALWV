import json, re, glob, os
W = '/home/claude/tbesh_work'
E = json.load(open(f'{W}/entries.json'))
gl = {}
for f in sorted(glob.glob(f'{W}/gl_out/out*.json')):
    for x in json.load(open(f)): gl[x['k']] = x['ko']
BK = {'Gen':'창','Exo':'출','Lev':'레','Num':'민','Deu':'신','Jos':'수','Jdg':'삿','Rut':'룻','1Sa':'삼상','2Sa':'삼하','1Ki':'왕상','2Ki':'왕하','1Ch':'대상','2Ch':'대하','Ezr':'스','Neh':'느','Est':'에','Job':'욥','Psa':'시','Pro':'잠','Ecc':'전','Sng':'아','Isa':'사','Jer':'렘','Lam':'애','Ezk':'겔','Dan':'단','Hos':'호','Jol':'욜','Amo':'암','Oba':'옵','Jon':'욘','Mic':'미','Nam':'나','Hab':'합','Zep':'습','Hag':'학','Zec':'슥','Mal':'말','Mat':'마','Luk':'눅','Act':'행','Rom':'롬','Heb':'히'}
def refs(s):
    s = re.sub(r'\b(\d?[A-Z][a-z]{1,2})\.(\d+)\.(\d+)', lambda m: f"{BK.get(m.group(1), m.group(1))} {m.group(2)}:{m.group(3)}", s)
    s = re.sub(r'(?<=[; ])(\d+)\.(\d+)(?=[,;\s)]|$)', r'\1:\2', s)
    s = re.sub(r'\bin\s*(\S+ \d+:\d+)', r'in \1', s)
    return s
items = [x for x in E if x['name'] and x['desc']]
missing = [x['k'] for x in items if x['k'] not in gl]
print('name items', len(items), 'without gloss yet', len(missing))
B = 80
os.makedirs(f'{W}/nm_in', exist_ok=True)
for i in range(0, len(items), B):
    chunk = items[i:i+B]
    names = {}
    for x in chunk:
        for k in re.findall(r'\(H(\d{4}[A-Z]?)\)', x['desc']):
            kk = 'H' + k
            if kk in gl: names[kk] = gl[kk]
            else:
                base = 'H' + k[:4]
                for e in E:
                    if e['k'].startswith(base) and e['k'] in gl: names[kk] = gl[e['k']]; break
    json.dump({'names': names, 'items': [{'k': x['k'], 'name': gl.get(x['k'], x['gl']), 'en': refs(x['desc'])} for x in chunk]},
              open(f'{W}/nm_in/in{i//B:02d}.json', 'w'), ensure_ascii=False, indent=0)
print('batches', (len(items)+B-1)//B)
