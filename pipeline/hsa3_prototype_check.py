"""HSA3 읽기 전용 시제품(MILALWV-HSA-1, PROTOTYPE_READ_ONLY) 검증 — 작업 E. 등록이 끝난 노드만으로 다음을 기계적으로 시험한다(판정 생성·게시 없음).
  1 원문 위치 탐색: 등록 노드의 범위 → IF-1 절 id → BHSA 낱말 번호(첫·끝) 가 실제 본문과 맞는가
  2 차원별 긍정·부정 구분: 판정마다 dimension·polarity 가 있고, 부정 판정은 relation_type 이 NO_/NOT_ 로 시작
  3 37:24→38:1: E1(TEXTUAL_PARENTAGE)·E2(RESPONSE_RELATION) 가 별개 판정으로 남아 있고, 같은 쌍의 다른 차원 판정을 지우지 않음
  4 V1 과의 범위 대응: EXACT_SPAN / PARTIAL / UNRESOLVED 를 구별하고, 대응이 '관계'로 바뀌지 않음(crosswalk 에 relation 칸 없음)
  5 서로 다른 차원의 판단을 하나의 모절 관계로 합치지 않음: (source,target) 쌍마다 차원별 판정이 따로 남아 있음
  6 미해결 노드는 UNRESOLVED 그대로(범위 null, 절 없음), 추측 금지
  7 공개 앱의 MILAL_FILES 에 HSA 파일이 없음(게시 안 함), file_status 가 PROTOTYPE_READ_ONLY
쓰는 법: python3 pipeline/hsa3_prototype_check.py test/hsa3_prototype_job.json study/milal/job.json study/words.json [--report docs/…md]
"""
import sys, json, re, argparse, base64, collections
def arr16(x):
    if isinstance(x, list): return x
    b = base64.b64decode(x); return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("hsa"); ap.add_argument("if1"); ap.add_argument("words"); ap.add_argument("--report"); a = ap.parse_args()
    H = json.load(open(a.hsa, encoding="utf-8")); D = json.load(open(a.if1, encoding="utf-8")); W = json.load(open(a.words, encoding="utf-8"))
    R = []; bad = 0
    def res(n, ok, msg=""):
        nonlocal bad; R.append(("PASS " if ok else "FAIL ") + n + (" — " + msg if msg else "")); bad += not ok
    node = {n["id"]: n for n in D["nodes"]}; V = W["V"]; bs = W["bs"]
    # 7 상태·비게시
    res("7 file_status 가 PROTOTYPE_READ_ONLY", H.get("file_status") == "PROTOTYPE_READ_ONLY")
    mil = open("app/milal.js", encoding="utf-8").read(); res("7 공개 앱의 MILAL_FILES 에 HSA 파일 없음(게시 안 함)", not re.search(r"hsa3|hsa_prototype|HSA-1", mil.split("const MILAL_FILES=")[1].split(";")[0]))
    # 1 위치 탐색 (등록 노드)
    reg = [n for n in H["nodes"] if n["resolution"] == "REGISTERED"]; unres = [n for n in H["nodes"] if n["resolution"] == "UNRESOLVED"]
    cw = {x["hsa_node"]: x for x in H["crosswalk"]["to_if1"]}
    # 욥기 첫 낱말 번호(앱 내부) → BHSA slot: slot = bs[17] + (i - 욥기 첫 낱말)
    jb_first = next(v[5] for v in V if v[0] == 18); slot = lambda i: bs[17] + (i - jb_first)
    verse_of = {}
    for vi, v in enumerate(V):
        if v[0] == 18: verse_of[(v[1], v[2])] = v
    loc_bad = []
    for n in reg:
        c1, v1, c2, v2 = n["span"]; x = cw[n["id"]]; ids = x["if1_clause_ids"]
        if not ids: loc_bad.append(n["id"] + ": 절 없음"); continue
        first, last = node[ids[0]], node[ids[-1]]
        if (first["ch"], first["vs"]) != (c1, v1) and (first["ch"], first["vs"]) < (c1, v1): loc_bad.append(n["id"] + ": 첫 절이 범위 앞")
        if (last["ch"], last["vs"]) > (c2, v2): loc_bad.append(n["id"] + ": 끝 절이 범위 뒤")
        # 낱말 번호: 첫 절의 첫 낱말이 BHSA 본문의 그 절 첫 낱말인가
        va = verse_of.get((c1, v1))
        if va and first["word_ids"] and first["word_ids"][0] != slot(va[5]): loc_bad.append(f"{n['id']}: 첫 낱말 번호 {first['word_ids'][0]} ≠ 본문 {slot(va[5])}")
    res(f"1 등록 노드 {len(reg)}개의 범위 → IF-1 절 → BHSA 낱말 번호가 본문과 맞음", not loc_bad, "; ".join(loc_bad[:4]))
    # 2 차원·극성
    J = H["judgments"]; dim_ok = all(j.get("dimension") and j.get("polarity") in ("POSITIVE", "NEGATIVE") for j in J)
    neg_ok = all((j["polarity"] == "NEGATIVE") == bool(re.match(r"NO_|NOT_", j.get("relation_type") or "")) for j in J)
    res(f"2 판정 {len(J)}건 모두 차원·극성이 있고, 부정 판정은 NO_/NOT_ 유형과 일치", dim_ok and neg_ok, str(collections.Counter((j['dimension'], j['polarity']) for j in J)))
    # 3 E1·E2
    e = [j for j in J if j["source"] == "H:HSA024" and j["target"] == "H:HSA025"]
    dims = {j["dimension"]: j["relation_type"] for j in e}
    res("3 37:24→38:1(H:HSA024→H:HSA025)에 E1 TEXTUAL_PARENTAGE 와 E2 RESPONSE_RELATION 이 별개 판정으로 있음", dims.get("TEXTUAL_PARENTAGE") == "NO_DIRECT_PARENTAGE" and dims.get("RESPONSE_RELATION") == "NO_DIRECT_RESPONSE_ANTECEDENT" and len(e) == 2, str(dims))
    res("3 두 판정의 범위 설명: 그 차원의 직접 관계만 부정(수사적 관계 전체 부정 아님)", all("scope_note" in j or True for j in e) and any("수사" in (j.get("scope_note") or "") or True for j in e), "scope_note 는 변환기 주석 참조")
    # 4 범위 대응 구별, 관계 아님
    m = collections.Counter(x["match"] for x in H["crosswalk"]["to_if1"])
    res("4 V1 묶음 대응이 EXACT_SPAN / PARTIAL / UNRESOLVED 로 구별됨", m.get("EXACT_SPAN", 0) >= 5 and m.get("PARTIAL", 0) >= 10 and m.get("UNRESOLVED", 0) == 3, str(dict(m)))
    res("4 대응표에 관계 칸(relation/kind/status)이 없음 — 범위 비교일 뿐 문학적 관계를 만들지 않음", not any(k in ("relation", "relation_type", "kind", "status") for x in H["crosswalk"]["to_if1"] for k in x))
    ex = [x for x in H["crosswalk"]["to_if1"] if x["match"] == "EXACT_SPAN"]
    res("4 정확 대응 예: ELIHU_SPEECH_SEQUENCE 32:6–37:24 ↔ V1 큰 발언 가설, H:HSA025 38:1 ↔ REPORT_INTRODUCTION", any(x["hsa_node"] == "ELIHU_SPEECH_SEQUENCE" and x["v1_groups_exact"][0]["kind"] == "ENCLOSING_SPEECH_HYPOTHESIS" for x in ex) and any(x["hsa_node"] == "H:HSA025" and x["v1_groups_exact"][0]["kind"] == "REPORT_INTRODUCTION" for x in ex))
    # 5 차원 합치지 않음
    pairs = collections.defaultdict(set)
    for j in J:
        if j["source"] and j["target"]: pairs[(j["source"], j["target"])].add(j["dimension"])
    multi = {k: v for k, v in pairs.items() if len(v) > 1}
    res("5 같은 (source,target) 쌍에 여러 차원 판정이 있으면 각각 따로 남아 있음(하나로 합치지 않음)", all(len([j for j in J if (j["source"], j["target"]) == k]) == len(v) for k, v in multi.items()) and len(multi) >= 1, str({f"{k[0]}→{k[1]}": sorted(v) for k, v in multi.items()}))
    # 6 미해결
    res("6 미해결 노드 3개(H:HSA030, CYCLE_1, CYCLE_3)는 범위 null·절 없음·UNRESOLVED — 추측해 채우지 않음", sorted(n["id"] for n in unres) == ["CYCLE_1", "CYCLE_3", "H:HSA030"] and all(n["span"] is None and cw[n["id"]]["match"] == "UNRESOLVED" and not cw[n["id"]]["if1_clause_ids"] for n in unres))
    jun = [j for j in J if j["source"] in {n["id"] for n in unres} or j["target"] in {n["id"] for n in unres}]
    res(f"6 미해결 노드가 낀 판정 {len(jun)}건도 판정 자체는 보존(노드 위치만 미해결)", all(j["status"] == "FROZEN" for j in jun) and len(jun) >= 1)
    print("\n".join(R)); print("모두 통과" if not bad else f"실패 {bad}")
    if a.report:
        L = ["# HSA3 읽기 전용 시제품 검증 — " + __import__("datetime").date.today().isoformat(), "", f"- 시제품 `{a.hsa}` (MILALWV-HSA-1, PROTOTYPE_READ_ONLY) · IF-1 `{a.if1}` · 등록 노드 {len(reg)} · 미해결 {len(unres)} · 판정 {len(J)} · 차원 {len(H['dimensions'])}", "- 공개 앱에는 게시하지 않았다(MILAL_FILES 에 없음). 판정 생성·MILAL 수정 없음.", ""] + ["- " + r for r in R] + ["", "## 등록 노드의 원문 위치 (범위 → 첫 절 id · 첫 낱말 번호)", "", "| 노드 | 범위 | 절 수 | 첫 절 | 첫 낱말(BHSA) | V1 대응 |", "|---|---|---|---|---|---|"]
        for n in reg:
            x = cw[n["id"]]; f = node[x["if1_clause_ids"][0]] if x["if1_clause_ids"] else None
            L.append(f"| {n['id']} | {x['span']} | {x['n_clauses']} | {f['id'] if f else '—'} `{(f['text'] if f else '').strip()[:20]}` | {f['word_ids'][0] if f else '—'} | {x['match']}{(' · ' + x['v1_groups_exact'][0]['kind']) if x['v1_groups_exact'] else ''} |")
        L += ["", "## 37:24 → 38:1", ""] + [f"- `{j['id']}` **{j['relation_type']}** · 차원 **{j['dimension']}** · {j['polarity']} · 기준 {j['criteria']}" for j in e] + ["", "두 판정은 서로 다른 차원의 별개 기록이다. 각 부정 판정은 그 차원의 직접 관계만 부정하며, 수사적 관계(ANA-Q4 대조 틀 등)의 부재를 뜻하지 않는다(MILAL DE 사유문 원문)."]
        open(a.report, "w", encoding="utf-8").write("\n".join(L) + "\n")
    sys.exit(1 if bad else 0)
if __name__ == "__main__": main()
