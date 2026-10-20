"""V1 에 보존된 BHSA 원 관계(native_relations) ↔ BHSA 2021 원본(clause / clause_atom 의 mother·rela) 대조 — 판정 없음, 건수만.
쓰는 법: python3 pipeline/milal_native_compare.py <IF-1 json> <bhsa_native_job.json> [--report docs/…md]
분류(원 관계마다):
  atom_exact                   절 원자→절 원자 관계가 원본과 노드·rela 까지 같음
  clause_exact                 절→절 관계가 원본과 같음
  clause_mother_phrase_or_word 절의 원본 mother 가 구(phrase)·낱말(word) — V1 은 그 구가 든 절로 풀어 적음(절 수준 '다대일 해소'); 원본과 같음
  phrase_level                 dependent 자체가 구 — 절 수준 관계로 풀어 적힌 것
  diff                         원본과 다름(모절 또는 rela)  ← 0 이어야 한다
  no_nodes                     절 원자 번호를 복원하지 못함(P2_REVIEW.zip 없이 변환)
그리고 원본에는 있는데 V1 에 없는 절 원자 mother 수(bhsa_atom_mothers_not_in_v1: 절 하나에 원자가 여럿일 때 두 번째 원자의 mother 등).
"""
import sys, json, argparse, collections
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("if1"); ap.add_argument("native"); ap.add_argument("--report"); a = ap.parse_args()
    D = json.load(open(a.if1, encoding="utf-8")); B = json.load(open(a.native, encoding="utf-8"))
    if B.get("schema") != "MILALWV-BHSA-NATIVE-1": sys.exit("원자료 파일 규격이 다름")
    A = B["atoms"]; byca = {x["clause_atom"]: x for x in A}; bycl = {}
    for x in A: bycl.setdefault(x["clause"], x)
    C = collections.Counter(); ex = collections.defaultdict(list); seen_atom_pairs = set()
    for x in D["native_relations"]:
        bn = x.get("bhsa_nodes")
        if not bn: C["no_nodes"] += 1; continue
        dep, head, rela = bn["dependent"], bn["head"], bn["rela"]
        if dep in byca:
            y = byca[dep]; ok = y["mother_clause_atom"] == head and y["rela_atom"] == rela; C["atom_exact" if ok else "diff"] += 1; seen_atom_pairs.add((dep, head))
            if not ok: ex["diff"].append((x["id"], dep, head, y["mother_clause_atom"], rela, y["rela_atom"]))
        elif dep in bycl:
            y = bycl[dep]; ok = y["mother_clause"] == head and (y["rela_clause"] or "NA") == rela
            if ok: C["clause_mother_phrase_or_word" if y["mother_clause_type"] in ("phrase", "word") else "clause_exact"] += 1
            else: C["diff"] += 1; ex["diff"].append((x["id"], dep, head, y["mother_clause"], rela, y["rela_clause"]))
            if y["mother_clause_type"] in ("phrase", "word"): ex["phrase_mother"].append((x["id"], dep, head, y["mother_clause_type"], rela))
        else: C["phrase_level"] += 1; ex["phrase_level"].append((x["id"], dep, head, rela))
    bhsa_atom_pairs = {(x["clause_atom"], x["mother_clause_atom"]) for x in A if x["mother_clause_atom"] is not None}
    missing = sorted(bhsa_atom_pairs - seen_atom_pairs)
    out = {"if1_native_relations": len(D["native_relations"]), "bhsa_clause_atoms": len(A), "bhsa_clauses": len(bycl), "bhsa_atom_mothers": len(bhsa_atom_pairs), "bhsa_clause_mothers": sum(1 for y in bycl.values() if y["mother_clause"] is not None),
           **{k: C.get(k, 0) for k in ("atom_exact", "clause_exact", "clause_mother_phrase_or_word", "phrase_level", "diff", "no_nodes")},
           "bhsa_atom_mothers_not_in_v1": len(missing), "clauses_multi_atom": B["counts"].get("clauses_multi_atom"),
           "examples": {"diff": ex["diff"][:5], "phrase_mother": ex["phrase_mother"][:3], "phrase_level": ex["phrase_level"][:3], "bhsa_atom_mothers_not_in_v1": [(c, m, byca[c]["ch"], byca[c]["vs"]) for c, m in missing[:8]]}}
    print(json.dumps(out, ensure_ascii=False, indent=1))
    if a.report:
        md = ["# BHSA 원본 모절 관계 대조 — V1 native_relations ↔ BHSA 2021 clause / clause_atom", "", f"- IF-1 `{a.if1}` · 원자료 사본 `{a.native}` (BHSA 2021 mother/rela 그대로, 판정 없음)", "",
              "| 항목 | 건수 | 뜻 |", "|---|---|---|",
              f"| if1_native_relations | {out['if1_native_relations']} | V1 이 보존한 BHSA 원 관계 |", f"| bhsa_clause_atoms / bhsa_clauses | {out['bhsa_clause_atoms']} / {out['bhsa_clauses']} | 욥기 절 원자 / 절 |",
              f"| bhsa_atom_mothers / bhsa_clause_mothers | {out['bhsa_atom_mothers']} / {out['bhsa_clause_mothers']} | 원본에서 mother 가 있는 절 원자 / 절 |",
              f"| **atom_exact** | {out['atom_exact']} | 절 원자→절 원자, 노드·rela 까지 원본과 같음 |", f"| **clause_exact** | {out['clause_exact']} | 절→절, 원본과 같음 |",
              f"| clause_mother_phrase_or_word | {out['clause_mother_phrase_or_word']} | 원본 mother 가 구·낱말 — V1 은 그 구가 든 절로 풀어 적음(다대일 해소, 원본과 같음) |",
              f"| phrase_level | {out['phrase_level']} | dependent 가 구 — 절 수준으로 풀어 적힌 것 |", f"| **diff** | {out['diff']} | 원본과 다름(0 이어야 함) |", f"| no_nodes | {out['no_nodes']} | 절 원자 번호 미복원 |",
              f"| bhsa_atom_mothers_not_in_v1 | {out['bhsa_atom_mothers_not_in_v1']} | 원본에는 있으나 V1 에 없는 절 원자 mother(절 하나에 원자 여럿: {out['clauses_multi_atom']}절) |", "",
              "원칙: BHSA 관계는 원자료, MILAL 관계는 별도 판정. 여기서 모절 관계를 새로 만들지 않았다 — V1 에 없는 원본 mother 는 앱이 `bhsa_native_job.json`(원자료)에서 '원 자료' 칸으로만 보여 준다.", "",
              "## 예", "```", json.dumps(out["examples"], ensure_ascii=False, indent=1), "```"]
        open(a.report, "w", encoding="utf-8").write("\n".join(md) + "\n")
    sys.exit(0 if out["diff"] == 0 else 1)
if __name__ == "__main__": main()
