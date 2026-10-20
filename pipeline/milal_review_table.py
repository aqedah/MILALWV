"""연구자 검토표 — 실제 IF-1 파일의 관계를 생성 규칙별로 정리한다(통계·대표 사례·경계 사례·근거·기록 칸). 새 해석을 만들지 않는다.
쓰는 법: python3 pipeline/milal_review_table.py study/milal/job.json docs/MILAL_REVIEW_TABLE_<날짜>.md [--chapters 32-37] [--review-zip P2_REVIEW.zip]
대표 사례 고르는 법(기계적): 그 규칙의 관계 가운데 지정 장 범위 안에서 본문 순서가 가장 앞선 것 · 경쟁(COMPETING) 첫 것 · 근거에 미결(UNRESOLVED)이 있는 첫 것 · 미배정 첫 것.
"""
import sys, json, argparse, collections, zipfile
KIND_KO = {"SUBORDINATE": "종속", "FRAME_CONTENT": "틀–내용", "CONTINUATION": "이어짐", "PARALLEL": "병행", "CLOSURE": "닫음", "MEMBERSHIP": "소속"}
ST_KO = {"CONFIRMED": "확정", "PROVISIONAL": "잠정", "COMPETING": "경쟁", "UNASSIGNED": "미배정"}
MG_KO = {"LOCAL_SPEECH_UNIT": "발언 단위", "CONDITIONAL_RESPONSE_UNIT": "조건부 응답 단위", "UNRESOLVED_SCOPE_FRAGMENT": "범위 미결 조각", "NARRATIVE_REPORT_SEGMENT_HYPOTHESIS": "서술 보고 구간(가설)", "ENCLOSING_SPEECH_HYPOTHESIS": "큰 발언 가설", "SURFACE_EVENT_ANCHOR": "표면 사건 표지", "UNCOVERED_SOURCE_CONTEXT": "덮이지 않은 출처 문맥", "REPORT_INTRODUCTION": "보고 도입", "REPORT_CONTENT": "보고 내용"}
# 규칙 정의(P2 rule_registry 원문)에서 그대로 끌어낸 '검토해야 할 핵심 판단' — 정의에 적힌 조건을 질문 꼴로 옮긴 것, 새 기준 아님
KEY = {
 "G1": ["보고(말하기 절)가 완결된 명시적 보고인가", "도입 사슬이 BHSA 원 자료의 사슬과 맞는가", "내용이 끊기지 않고 이어지는가", "내용의 모든 절과 끝 경계가 '기록된 틀 전제' 아래서 다시 확인되는가(미결 SCOPE_WARRANT 가 많음)"],
 "G2": ["Q1 절 문법 + 정확한 종속 출처 결합인가", "출처 전체가 다스리고 목표 전체가 의존하는가(직접성·범위 동일성)", "NA·포함·동일성만으로는 부족하다는 규칙 자체 조건"],
 "G3": ["독립된 단위 전체의 형식 역할 대응인가", "짝에 고유한 증거(단순 공식 이상)가 있는가", "전체 범위 대응과 독립적으로 뒷받침된 보고 수준인가", "부분 증거면 '구성 대응'(CONSTRUCTION_PARALLELISM)에 머무는가"],
 "G5": ["닫음·다음 보고 끝점·정확한 집합 포함은 '문맥 관계'이지 모절이 아니다 — 모절처럼 읽히는 자리가 없는가", "큰 발언 가설(32:6/34:1/35:1–37:24)의 겹침에서 어느 포함을 쓸지는 연구 판단", "경쟁(COMPETING) 소속은 어느 가설을 택해도 다른 관계망을 바꾸지 않음"],
 "P1-A1": ["P1 단계의 병행(PARATACTIC) 판정 — 규칙 정의는 P2 registry 에 없음(P1 산출물 참고)", "병행 두 절의 형식 대응이 문맥에서 성립하는가"],
 "P1-A2": ["P1 단계의 구성 대응(잠정) — 완전한 병행이 아니라 구성만 대응", "구성 대응을 병행으로 올릴 근거가 있는가(없으면 잠정 유지)"],
 "HUMAN": ["연구자 본인 판정(H0.2) — 기록된 사유 코드와 본문이 지금도 유효한가"],
}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("if1"); ap.add_argument("out"); ap.add_argument("--chapters", default="32-37"); ap.add_argument("--review-zip"); a = ap.parse_args()
    D = json.load(open(a.if1, encoding="utf-8")); c1, c2 = map(int, a.chapters.split("-"))
    node = {n["id"]: n for n in D["nodes"]}; grp = {g["id"]: g for g in D["groups"]}; ev = {e["id"]: e for e in D["evidence"]}
    defs = {}
    if a.review_zip:
        R = json.loads(zipfile.ZipFile(a.review_zip).read("P2_RELATIONS_AND_ALTERNATIVES.json")); defs = {k: v.get("definition", "") for k, v in R.get("rule_registry", {}).items()}
    def clauses_of(e): return grp[e["id"]]["members"] if e["type"] == "group" else list(e.get("ids", [])) if e["type"] == "clause_set" else [e["id"]]
    def pos(r): cs = [node[c]["pos"] for c in clauses_of(r["source"]) + clauses_of(r["target"]) if c in node]; return min(cs) if cs else 10**9
    def chs(r): return [node[c]["ch"] for c in clauses_of(r["source"]) + clauses_of(r["target"]) if c in node]
    def in_range(r): c = chs(r); return bool(c) and min(c) >= c1 and max(c) <= c2
    def lab(e):
        if e["type"] == "group": g = grp[e["id"]]; return f"{MG_KO.get(g['kind'], g['kind'])} {g['first']}–{g['last']}({len(g['members'])}절)"
        if e["type"] == "clause_set": ns = [node[c] for c in e.get("ids", []) if c in node]; return f"절 묶음 {ns[0]['ref']}–{ns[-1]['ref']}({len(ns)}절)" if ns else "절 묶음"
        n = node.get(e["id"]); return f"{n['ref']} `{n['text'].strip()[:28]}`" if n else e["id"]
    def evs(r): return [ev[i] for i in r.get("evidence_ids", []) if i in ev]
    def ev_line(r): L = evs(r); c = collections.Counter(e["outcome"] for e in L); return ", ".join(f"{k} {v}" for k, v in c.items()) + (" — 미결: " + "; ".join(sorted({e['check'] for e in L if e['outcome'] == 'UNRESOLVED'})) if c.get("UNRESOLVED") else "")
    fam = collections.defaultdict(list)
    for r in D["relations"]: fam[r["rule"].split(" ")[0]].append(r)
    L = ["# 연구자 검토표 — 실제 MILAL V1 관계망 (규칙별)", "", f"- 파일 `{a.if1}` · 관계 {len(D['relations'])}개 · 대표 사례는 **그 규칙이 실제로 나타나는 본문**에서 기계적으로 골랐다 — 욥기 {c1}–{c2}장에 있으면 그 안에서, 없으면 다른 장에서(본문 순서 첫 것·가운데 것·경쟁 첫 것·미결 근거 첫 것·미배정 첫 것). 통계로 새 해석을 만들지 않았다.", "",
         "## 두 가지 검토를 나눈다", "", "| | 기술 검토 | 학문적 검토 |", "|---|---|---|", "| 묻는 것 | 원자료(P2·BHSA)와 MILAL V1 출력이 **정확하게 대응**하는가 | 규칙이 **실제 본문에서 정당하게** 적용되었는가 |",
         "| 누가·무엇으로 | 검증기(ROUNDTRIP_EXACT·V1~V16·V13b·기준점) — 이미 통과 | 연구자가 본문·근거·규칙 정의를 보고 판단 |", "| 결과 | 배포 가능 여부 | approvals.json 의 승인/유보/기각 기록 |",
         "| 하지 않는 것 | 관계의 학문적 타당성을 말하지 않음 | PROVISIONAL 을 검토했다고 **CONFIRMED 로 올리지 않음**(상태는 MILAL 파일 그대로) · 경쟁 후보 하나를 승인해도 관계망은 바뀌지 않음 |", "",
         "아래 규칙별 표는 **학문적 검토**용이다. 기술 검토 결과는 `docs/REPORT_real_v1_2026-10-20.md` 와 `docs/REPORT_bhsa_native_compare_2026-10-20.md` 에 있다.", "",
         "- **검토 결과 칸은 비워 두었다.** 적는 법: 승인 / 유보 / 기각 + 근거 한 줄 + 날짜 + 이름. 기록은 `pipeline/milal_approve.py --scope RULES:<규칙>[@장-장]` 로 옮긴다(관계 하나씩 적지 않아도 됨). PROVISIONAL 을 검토했다고 CONFIRMED 가 되지 않고(상태는 MILAL 파일 그대로), 경쟁 후보 하나를 승인해도 관계망은 바뀌지 않는다.", ""]
    order = ["HUMAN", "G1", "G2", "G3", "G5", "P1-A1", "P1-A2"] + sorted(k for k in fam if k not in ("HUMAN", "G1", "G2", "G3", "G5", "P1-A1", "P1-A2"))
    for k in order:
        rs = fam.get(k, []);
        if not rs: continue
        ks = collections.Counter(KIND_KO.get(r["kind"], r["kind"]) for r in rs); ss = collections.Counter(ST_KO.get(r["status"], r["status"]) for r in rs); sub = collections.Counter(r["rule"] for r in rs)
        inr = [r for r in rs if in_range(r)]
        L += [f"## 규칙 {k} — 관계 {len(rs)}개 (욥 {c1}–{c2}장 {len(inr)}개)", ""]
        if defs.get(k): L.append(f"- 규칙 정의(P2 rule_registry 원문): *{defs[k]}*")
        L += [f"- 세부 규칙: " + ", ".join(f"`{s}` {n}" for s, n in sub.most_common()), f"- 관계 유형: {dict(ks)} · 상태: {dict(ss)}", "- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):"] + [f"  - {q}" for q in KEY.get(k, ["(정의 없음)"])]
        picks = []; seen = set()
        def add(tag, r):
            if r and r["id"] not in seen: seen.add(r["id"]); picks.append((tag, r))
        srt = sorted(inr or rs, key=pos)
        if not inr: L.append(f"- 욥기 {c1}–{c2}장에는 이 규칙의 관계가 없어 **다른 장의 사례**로 검토한다.")
        add("대표(본문 순서 첫 것)", srt[0] if srt else None)
        add("경계 사례 — 경쟁 후보", next((r for r in srt if r["status"] == "COMPETING"), None))
        add("경계 사례 — 근거에 미결 있음", next((r for r in srt if any(e["outcome"] == "UNRESOLVED" for e in evs(r))), None))
        add("경계 사례 — 미배정", next((r for r in srt if r["status"] == "UNASSIGNED"), None))
        if len(srt) > 2: add("대표(본문 순서 가운데)", srt[len(srt) // 2])
        L += ["", "| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |", "|---|---|---|---|---|---|---|"]
        for tag, r in picks:
            L.append(f"| {tag} | `{r['id']}` | {lab(r['source'])} → **{KIND_KO.get(r['kind'], r['kind'])}** → {lab(r['target'])} | {ST_KO.get(r['status'], r['status'])} | {r['record']['table']} #{str(r['record']['id'])[:24]} | {ev_line(r) or '—'} | |")
        if k == "G5":
            comp = [r for r in rs if r["status"] == "COMPETING"]; opts = collections.Counter(lab(r["source"]) for r in comp)
            L += ["", "- **G5 의 소속(MEMBERSHIP)·닫음(CLOSURE)은 모절·자절 계층이 아니다** — 규칙 정의 원문대로 'independently typed contextual relations, never mother'. 검토 질문은 '이 묶음에 드는가 / 이 절이 묶음을 닫는가'이지 '이 절의 모절인가'가 아니다. 앱도 이 관계를 확정 사슬 깊이에 넣지 않는다.",
                  f"- 경쟁 소속 {len(comp)}건의 후보 묶음(어느 큰 발언 가설에 드는가): " + "; ".join(f"{o} ×{n}" for o, n in opts.most_common(6))]
        L += ["", "**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______", ""]
    # 미해결·대안·미배정 요약
    iss = collections.Counter(s["kind"] for s in D["issues"])
    comp_all = [r for r in D["relations"] if r["status"] == "COMPETING"]; unas = [s for s in D["issues"] if s["kind"] == "UNASSIGNED_CLAUSE"]
    unas_ch = collections.Counter(node[s["about"]["id"]]["ch"] for s in unas if isinstance(s.get("about"), dict) and s["about"].get("id") in node)
    L += ["## 지금 승인 대상은 아니지만 **연구 대상으로 유지**하는 것 (상태 그대로 보존)", "",
          f"- **경쟁 관계 {len(comp_all)}건**: 모두 G5 소속 후보(큰 발언 가설 32:6/34:1/35:1–37:24 의 겹침). '판단 불필요'가 아니라 **엘리후 발언의 큰 단위를 어디서 나눌지**라는 연구 질문이다. 연구자가 어느 가설을 택하더라도 approvals.json 에는 RELATIONS 또는 RULES 범위로 기록할 뿐 MILAL 관계망은 바뀌지 않는다.",
          f"- **미배정 절 {len(unas)}건**: 어느 기본 묶음에도 들지 않은 절(장별: {dict(sorted(unas_ch.items()))}). 자료 상태이지 판정이 아니며, 앞으로 P2 규칙 확장이나 연구자 판정으로 채워질 수 있는 자리다. 앱은 '모절 자료 없음'으로 표시한다.",
          f"- 미해결(UNRESOLVED) {iss.get('UNRESOLVED', 0)}건 · 대안 묶음 {iss.get('ALTERNATIVE_SET', 0)}건 · 직접 관계 없음(판정) {iss.get('NO_DIRECT_RELATION', 0)}건 — 승인·기각의 대상이 아니라 연구 과제. 승인하지 않은 관계도 원래 상태로 남는다.",
          f"- 사람 판정 메모(frozen_human): {len(D['notes'])}건 — 직접 모절 기각 등. 변환기는 이를 NO_DIRECT_RELATION 으로만 옮긴다.", "", "첫 **학문적** 승인 기록은 연구자 판단 뒤에만 작성한다(지금 0건).", ""]
    open(a.out, "w", encoding="utf-8").write("\n".join(L) + "\n"); print("wrote", a.out, "rules", [(k, len(fam[k])) for k in order if k in fam])

if __name__ == "__main__": main()
