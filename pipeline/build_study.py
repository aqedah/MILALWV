import json,re,sys,collections,unicodedata,base64,array,gzip
import xml.etree.ElementTree as ET
sys.path.insert(0,'/home/claude/lex'); from hangul import word as hword
from tf.fabric import Fabric
TF=Fabric(locations='/home/claude/etcbc/bhsa/tf/2021',silent='deep')
api=TF.load('book chapter verse g_word_utf8 trailer_utf8 qere_utf8 qere_trailer_utf8 lex voc_lex_utf8 gloss sp vs vt ps gn nu st prs prs_ps prs_gn prs_nu function typ domain phono language lex_utf8 tab txt',silent='deep')
F,L=api.F,api.L
BH=["Genesis","Exodus","Leviticus","Numeri","Deuteronomium","Josua","Judices","Ruth","Samuel_I","Samuel_II","Reges_I","Reges_II","Chronica_I","Chronica_II","Esra","Nehemia","Esther","Iob","Psalmi","Proverbia","Ecclesiastes","Canticum","Jesaia","Jeremia","Threni","Ezechiel","Daniel","Hosea","Joel","Amos","Obadia","Jona","Micha","Nahum","Habakuk","Zephania","Haggai","Sacharia","Maleachi"]
OS=["Gen","Exod","Lev","Num","Deut","Josh","Judg","Ruth","1Sam","2Sam","1Kgs","2Kgs","1Chr","2Chr","Ezra","Neh","Esth","Job","Ps","Prov","Eccl","Song","Isa","Jer","Lam","Ezek","Dan","Hos","Joel","Amos","Obad","Jonah","Mic","Nah","Hab","Zeph","Hag","Zech","Mal"]
bnodes={F.book.v(b):b for b in F.otype.s('book')}
missing=[x for x in BH if x not in bnodes]
if missing: print("book names:",list(bnodes)); sys.exit()
# 절 번호: WLC → KJV(개역개정과 같은 체계)
VM={}; root=ET.parse('/home/claude/lex/morphhb/wlc/VerseMap.xml').getroot()
for v in root.iter():
    if v.tag.endswith('verse'): VM[v.get('wlc')]=v.get('kjv')
mappedCh=set(".".join(k.split('.')[:2]) for k in VM)
def krv(bi,c,v):
    k=f"{OS[bi]}.{c}.{v}"
    if k in VM: _,c2,v2=VM[k].split('.'); return int(c2),int(re.sub(r'\D.*','',v2))
    if OS[bi]=="Ps" and f"Ps.{c}" in mappedCh: return c,0   # 시편 표제
    return c,v
# OSHB 스트롱 번호
def oshb_verses(bi):
    t=ET.parse(f'/home/claude/lex/morphhb/wlc/{OS[bi]}.xml').getroot(); out={}
    for v in t.iter():
        if v.tag.endswith('}verse'):
            ws=[w for w in v if w.tag.endswith('}w')]
            out[v.get('osisID')]=[(w.get('lemma') or '',w.text or '') for w in ws]
    return out
STRIP=re.compile('[֑-ֽֿ֯׀ׅׄ]')
def clean(s): return STRIP.sub('',unicodedata.normalize('NFC',s or ''))
def ctrail(s):
    s=s or ''; o=''
    for ch in s:
        if ch in ' ־׃': o+=ch
    o=o.replace('׃','׃ ') if '׃' in o and not o.endswith(' ') else o
    return re.sub(' +',' ',o)
lexid={}; LEX=[]; vote=collections.defaultdict(collections.Counter)
MORPH={}; MLIST=[]; FUN={}; FLIST=[]; TYP={}; TLIST=[]; DOM={}; DLIST=[]
WL=array.array('H'); WM=array.array('H'); WF=array.array('B'); WG=array.array('B')
CT=array.array('B'); CD=array.array('B'); WC=array.array('I'); cid={}; WP=array.array('I'); pid={}; PT=array.array('B'); PTY={}; PTL=[]; WS=array.array('I'); sid={}; WA=array.array('I'); aid={}; AT=array.array('B'); AY=array.array('B'); AX=array.array('B'); TXL=[]; TXD={}
VERSES=[]; HEB=[]; HAN=[]
def idx(d,l,k):
    if k not in d: d[k]=len(l); l.append(k)
    return d[k]
wn=0; aligned=0; tried=0
for bi,bn in enumerate(BH):
    ob=oshb_verses(bi); b=bnodes[bn]
    for vnode in L.d(b,'verse'):
        c=F.chapter.v(vnode); v=F.verse.v(vnode); kc,kv=krv(bi,c,v)
        words=L.d(vnode,'word'); start=wn; texts=[]; hans=[]
        groups=[[]]
        for w in words:
            q=F.qere_utf8.v(w)
            t=clean(q if q else F.g_word_utf8.v(w)); tr=ctrail(F.qere_trailer_utf8.v(w) if q else F.trailer_utf8.v(w))
            lx=L.u(w,'lex')[0]
            if lx not in lexid: lexid[lx]=len(LEX); LEX.append(lx)
            WL.append(lexid[lx])
            mk="|".join(F.__getattribute__(f).v(w) or '' for f in ['sp','vs','vt','ps','gn','nu','st','prs_ps','prs_gn','prs_nu'])
            WM.append(idx(MORPH,MLIST,mk))
            ph=L.u(w,'phrase')[0]; cl=L.u(w,'clause')[0]
            WF.append(idx(FUN,FLIST,F.function.v(ph) or ''))
            flag=(1 if L.d(cl,'word')[0]==w else 0)|(2 if L.d(ph,'word')[0]==w else 0)|(4 if q else 0)|(8 if F.language.v(w)=='Aramaic' else 0)
            WG.append(flag)
            if cl not in cid: cid[cl]=len(cid); CT.append(idx(TYP,TLIST,F.typ.v(cl) or '')); CD.append(idx(DOM,DLIST,F.domain.v(cl) or ''))
            WC.append(cid[cl])
            if ph not in pid: pid[ph]=len(pid); PT.append(idx(PTY,PTL,F.typ.v(ph) or ''))
            WP.append(pid[ph])
            se=L.u(w,'sentence')[0]
            if se not in sid: sid[se]=len(sid)
            WS.append(sid[se])
            ca=L.u(w,'clause_atom')[0]
            if ca not in aid: aid[ca]=len(aid); AT.append(min(255,F.tab.v(ca) or 0)); AY.append(idx(TYP,TLIST,F.typ.v(ca) or '')); AX.append(idx(TXD,TXL,F.txt.v(cl) or ''))
            WA.append(aid[ca])
            texts.append(t+tr)
            hans.append("여호와" if F.lex.v(w)=="JHWH/" else hword(F.phono.v(w) or ''))
            groups[-1].append(w)
            if (F.qere_trailer_utf8.v(w) if q else F.trailer_utf8.v(w)): groups.append([])
            wn+=1
        if not groups[-1]: groups.pop()
        VERSES.append([bi+1,kc,kv,c,v,start,wn-start])
        HEB.append("\t".join(texts)); HAN.append("\t".join(hans))
        # 스트롱 맞추기: 띄어 쓴 낱말 단위로 1:1, 그 안에서 마지막 BHSA 낱말 ↔ 마지막 숫자 lemma
        ow=ob.get(f"{OS[bi]}.{c}.{v}",[]); tried+=1
        if len(ow)==len(groups):
            aligned+=1
            for g,(lem,_) in zip(groups,ow):
                nums=[re.sub(r'\D','',p) for p in lem.split('/') if re.search(r'\d',p)]
                if nums and g: vote[lexid[L.u(g[-1],'lex')[0]]][int(nums[-1])]+=1
                # 앞붙이(전치사·접속사·관사)도 lemma가 숫자이면(앞 낱말이 독립 낱말일 때) 함께
                if len(nums)>=2 and len(g)>=2: vote[lexid[L.u(g[-2],'lex')[0]]][int(nums[-2])]+=1
# 시편 표제: 여러 WLC 절이 개역 1절로 모이면 마지막 것만 1절, 앞은 표제(0)
from collections import defaultdict as _dd
g=_dd(list)
for x in VERSES:
    if x[0]==19 and x[2]==1: g[(x[1])].append(x)
for k,L2 in g.items():
    for x in L2[:-1]: x[2]=0
print("verses",len(VERSES),"aligned",aligned,"/",tried,"lex",len(LEX),"morph",len(MLIST))
# 사전
KO={}; 
for line in open('/home/claude/lex/dl/strongs_ko.tsv',encoding='utf8'):
    p=line.rstrip('\n').split('\t')
    if len(p)>=5 and p[0].startswith('H'): KO[int(p[0][1:])]=(p[4],p[3],p[2])
PREF={"B":"~안에, ~으로","L":"~에게, ~을 위하여","K":"~처럼, ~같이","W":"그리고, 그러나","H":"그 (정관사)","M":"~에서, ~보다","C":"~하는 (관계사)"}
freq=collections.Counter(WL)
# 낱말 소리: 사전형과 같은 꼴로 나온 곳의 음역 → 없으면 가장 흔한 꼴
formhan=collections.defaultdict(collections.Counter)
i=0
for vi,(b,kc,kv,c,v,s,n) in enumerate(VERSES):
    T=HEB[vi].split("\t"); H=HAN[vi].split("\t")
    for j in range(n): formhan[WL[s+j]][(re.sub('[־׃ ]','',T[j]),H[j])]+=1
LOUT=[]
for li,lx in enumerate(LEX):
    voc=clean(F.voc_lex_utf8.v(lx)); sp=F.sp.v(lx) or ''; st=None
    if vote[li]: st,cnt=vote[li].most_common(1)[0]
    lexkey=F.lex.v(lx)
    ko=""
    if lexkey in PREF and sp in ("prep","conj","art"): ko=PREF[lexkey]
    elif st and st in KO and not (lexkey in PREF and sp in ("prep","conj","art")): ko=KO[st][0]
    fh=formhan[li]; same=[(k,c) for k,c in fh.items() if k[0]==re.sub('[־׃ ]','',voc)]
    han=(max(same,key=lambda x:x[1])[0][1] if same else (fh.most_common(1)[0][0][1] if fh else ""))
    if st and st in KO:
        tl=KO[st][1].lower().replace('.','')
        for a,b2 in [('kh','ḵ'),('sh','š'),('ts','ṣ'),('tz','ṣ'),('ph','f'),('th','t'),('ch','ḥ'),("'",'ʔ'),('’','ʔ')]: tl=tl.replace(a,b2)
        if sp=="verb" or not same: han=hword(tl) or han
        if sp=="verb": voc=clean(KO[st][2]) or voc
    if lexkey in PREF and sp in ("prep","conj","art"): st=0
    if lexkey=="JHWH/": han="여호와"
    LOUT.append([voc,lexkey,sp,st or 0,ko,F.gloss.v(lx) or "",han,freq[li],1 if F.language.v(lx)=="Aramaic" else 0,"",F.lex_utf8.v(L.d(lx,"word")[0]) or ""])
import glob,os
G={}
for f in sorted(glob.glob('/home/claude/lex/gl/out[0-9]*.json')): G.update(json.load(open(f)))
G.update(json.load(open('/home/claude/lex/gl/out_fix.json')))
for i,x in enumerate(LOUT):
    if str(i) in G: x[9]=G[str(i)].strip()
json.dump({"lex":LOUT,"morph":MLIST,"fun":FLIST,"typ":TLIST,"dom":DLIST,"ptyp":PTL,"books":BH,"txt":TXL},open("/home/claude/rj/study/meta.json","w"),ensure_ascii=False,separators=(",",":"))
b64=lambda a:base64.b64encode(a.tobytes()).decode()
def enc(A):
    # 0: 앞 낱말과 같은 단위, 1: 새 단위(번호+1), 2: 예외(이전 단위로 돌아감) → x 목록
    st=array.array('B'); ex=[]; mx=-1; prev=-1
    for i,v in enumerate(A):
        if v==prev: st.append(0)
        elif v==mx+1: st.append(1); mx=v
        else: st.append(2); ex.append(v)
        prev=v
    return {"s":b64(st),"x":ex}
json.dump({"V":VERSES,"heb":HEB,"han":HAN,"wl":b64(WL),"wm":b64(WM),"wf":b64(WF),"wg":b64(WG),"ct":b64(CT),"cd":b64(CD),"wc":enc(WC),"wp":enc(WP),"pt":b64(PT),"ws":enc(WS),"wa":enc(WA),"at":b64(AT),"ay":b64(AY),"ax":b64(AX)},open('/home/claude/rj/study/words.json','w'),ensure_ascii=False,separators=(',',':'))
print("nostrong",sum(1 for x in LOUT if not x[3]),"noko",sum(1 for x in LOUT if not x[4]))
