"""BHSA 2021 원본의 clause / clause_atom 모절(mother)·관계(rela) 를 책 하나에 대해 그대로 뽑는다 — 판정 없음, 원자료 사본.
출력 규격 MILALWV-BHSA-NATIVE-1. 앱(절 원자 상세)과 검증기(V13b)가 쓴다.
쓰는 법: python3 pipeline/bhsa_native_job.py <BHSA tf/2021 폴더> <책 번호(개역 순, 욥기 18)> <출력 json> [--words study/words.json]
"""
import sys, json, argparse, hashlib, datetime, os
BOOKS_KO = ["Genesis","Exodus","Leviticus","Numeri","Deuteronomium","Josua","Judices","Ruth","Samuel_I","Samuel_II","Reges_I","Reges_II","Chronica_I","Chronica_II","Esra","Nehemia","Esther","Iob","Psalmi","Proverbia","Ecclesiastes","Canticum","Jesaia","Jeremia","Threni","Ezechiel","Daniel","Hosea","Joel","Amos","Obadia","Jona","Micha","Nahum","Habakuk","Zephania","Haggai","Sacharia","Maleachi"]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("tf"); ap.add_argument("book", type=int); ap.add_argument("out"); ap.add_argument("--words"); a = ap.parse_args()
    from tf.fabric import Fabric
    TF = Fabric(locations=a.tf, silent="deep"); api = TF.load("otype oslots book chapter verse mother rela", silent="deep")
    if not api: sys.exit("BHSA 를 열지 못함")
    F, E, L, T = api.F, api.E, api.L, api.T
    bname = BOOKS_KO[a.book - 1]; bnode = next(n for n in F.otype.s("book") if F.book.v(n) == bname)
    atoms = []; clauses = {}
    for ca in L.d(bnode, "clause_atom"):
        cl = L.u(ca, "clause")[0]; words = L.d(ca, "word"); vs = L.u(words[0], "verse")[0]
        m_ca = [m for m in E.mother.f(ca)]; m_cl = [m for m in E.mother.f(cl)]
        atoms.append({"clause_atom": ca, "clause": cl, "ch": F.chapter.v(vs), "vs": F.verse.v(vs), "first_word": words[0], "n_words": len(words),
                      "mother_clause_atom": m_ca[0] if m_ca else None, "mother_clause_atom_type": F.otype.v(m_ca[0]) if m_ca else None, "rela_atom": F.rela.v(ca) or "NA",
                      "mother_clause": m_cl[0] if m_cl else None, "mother_clause_type": F.otype.v(m_cl[0]) if m_cl else None, "rela_clause": F.rela.v(cl) or "NA",
                      "n_mothers_atom": len(m_ca), "n_mothers_clause": len(m_cl)})
        clauses.setdefault(cl, []).append(ca)
    def fsha(name):
        fp = os.path.join(a.tf, name + ".tf"); return hashlib.sha256(open(fp, "rb").read()).hexdigest() if os.path.exists(fp) else None
    out = {"schema": "MILALWV-BHSA-NATIVE-1", "status": "RAW_SOURCE_DATA — 판정 아님(BHSA 2021 원자료 그대로)", "bhsa": "2021", "features": ["mother", "rela"], "book": a.book, "book_bhsa": bname,
           "provenance": {"tf_dir": os.path.basename(os.path.normpath(a.tf)), "generator": "pipeline/bhsa_native_job.py", "feature_sha256": {k: fsha(k) for k in ("otype", "oslots", "mother", "rela", "book", "chapter", "verse")}},
           "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "counts": {"clause_atoms": len(atoms), "clauses": len(clauses), "clauses_multi_atom": sum(1 for v in clauses.values() if len(v) > 1)},
           "atoms": atoms}
    if a.words:  # 앱의 can(절 원자 번호)과 대조
        W = json.load(open(a.words, encoding="utf-8")); raw = W["can"]; can = []; acc = 0   # 앞 것과의 차이로 저장돼 있음 → 누적
        for d in raw: acc += d; can.append(acc)
        I = json.load(open(os.path.join(os.path.dirname(a.words), "index.json"), encoding="utf-8")); bookA = I["bookA"]
        a0 = bookA[a.book - 1]; a1 = bookA[a.book] if a.book < 39 else len(can); app = can[a0:a1]
        ids = [x["clause_atom"] for x in atoms]; same = app == ids
        out["app_can_check"] = {"app_atoms": len(app), "bhsa_atoms": len(ids), "identical_sequence": same, "first_app": app[:1], "first_bhsa": ids[:1]}
        if not same: out["app_can_check"]["first_diff_index"] = next((i for i, (x, y) in enumerate(zip(app, ids)) if x != y), min(len(app), len(ids)))
    json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(json.dumps({k: v for k, v in out.items() if k != "atoms"}, ensure_ascii=False, indent=1)); print("sha256", hashlib.sha256(open(a.out, "rb").read()).hexdigest())

if __name__ == "__main__":
    main()
