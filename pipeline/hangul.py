# BHSA phono(음운 전사) → 한글 음역 (참고용 단순 규칙)
import re
CHO="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"; JUNG="ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"; JONG=["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
def syl(c,v,f=""): return chr(0xAC00+(CHO.index(c)*21+JUNG.index(v))*28+JONG.index(f))
CON={'b':'ㅂ','ḇ':'ㅂ','v':'ㅂ','g':'ㄱ','ḡ':'ㄱ','d':'ㄷ','ḏ':'ㄷ','h':'ㅎ','z':'ㅈ','ḥ':'ㅎ','ṭ':'ㅌ','t':'ㅌ','ṯ':'ㅌ','k':'ㅋ','ḵ':'ㅋ','l':'ㄹ','m':'ㅁ','n':'ㄴ','s':'ㅅ','ś':'ㅅ','ŝ':'ㅅ','š':'ㅅ','ʕ':'ㅇ','ʔ':'ㅇ','p':'ㅍ','f':'ㅍ','ṣ':'ㅊ','q':'ㅋ','r':'ㄹ','w':'ㅇ','y':'ㅇ'}
FINAL={'n':'ㄴ','l':'ㄹ','m':'ㅁ','k':'ㄱ','ḵ':'ㄱ'}
SILENT={'ʔ','ʕ','h'}
VOW={'a':'ㅏ','ā':'ㅏ','ᵃ':'ㅏ','ₐ':'ㅏ','e':'ㅔ','ē':'ㅔ','ᵉ':'ㅔ','ê':'ㅔ','ᵊ':'ㅔ','i':'ㅣ','î':'ㅣ','o':'ㅗ','ō':'ㅗ','ô':'ㅗ','ᵒ':'ㅗ','u':'ㅜ','û':'ㅜ'}
YV={'ㅏ':'ㅑ','ㅔ':'ㅖ','ㅣ':'ㅣ','ㅗ':'ㅛ','ㅜ':'ㅠ'}
WV={'ㅏ':'ㅘ','ㅔ':'ㅞ','ㅣ':'ㅟ','ㅗ':'ㅝ','ㅜ':'ㅜ'}
SV={'ㅏ':'ㅑ','ㅔ':'ㅖ','ㅣ':'ㅟ','ㅗ':'ㅛ','ㅜ':'ㅠ'}   # 쉬 소리
def word(ph):
    s=re.sub(r"[ˈˌ*\[\]\-.\s]","",ph).replace('ʸ','y')
    toks=[]
    for ch in s:
        if ch in VOW: toks.append(('V',VOW[ch]))
        elif ch in CON: toks.append(('C',ch))
    out=[]  # list of [cho,jung,jong]
    i=0; n=len(toks)
    while i<n:
        k,x=toks[i]
        if k=='V':
            out.append(['ㅇ',x,'']); i+=1; continue
        nxt=toks[i+1] if i+1<n else None
        if nxt and nxt[0]=='V':
            v=nxt[1]; c=CON[x]
            if x=='y': v=YV[v]
            elif x=='w': v=WV[v]
            elif x=='š': v=SV[v]
            if x=='l' and out and out[-1][2]=='' and out[-1][1]!='ㅡ': out[-1][2]='ㄹ'
            out.append([c,v,'']); i+=2; continue
        # 모음이 따르지 않는 자음: 받침 또는 '으' 음절
        dbl=nxt and nxt[0]=='C' and nxt[1]==x
        if x in SILENT: i+=1; continue
        if out and out[-1][2]=='' and x in FINAL: out[-1][2]=FINAL[x]; i+=1; continue
        if dbl: i+=1; continue
        if x=='y':
            if out and out[-1][2]=='': out.append(['ㅇ','ㅣ',''])
            i+=1; continue
        if x=='w': out.append(['ㅇ','ㅜ','']); i+=1; continue
        if x=='š': out.append(['ㅅ','ㅟ','']); i+=1; continue
        out.append([CON[x],'ㅡ','']); i+=1
    return "".join(syl(*o) for o in out)
if __name__=="__main__":
    for p in ["bᵊ","rēšˌîṯ","bārˈā","ʔᵉlōhˈîm","ʔˌēṯ","ššāmˌayim","wˈa","yᵊhî-","wayyˌōmer","yiśrāʔˈēl","šālˈôm","šᵊmˈaʕ","ʔᵃḏōnˈāy","mˈeleḵ","hallᵊlû-yāh","yᵊhwˈā","dāwˈiḏ","mōšˈeh"]: print(p,word(p))
