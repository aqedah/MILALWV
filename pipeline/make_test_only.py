"""TEST_ONLY 시험 자료 만들기 — 욥기 31:40–38:1 (MILALWV-IF-1)

* 절·낱말·절 원자 번호와 BHSA 원 관계(clause_atom mother + rela)는 **실제 BHSA 2021 값**이다.
* 묶음·MILAL 관계·근거·판정 상태는 **가상**이다. MILAL이 이렇게 판정했다는 뜻이 아니다.
  파일 맨 위 file_status = "TEST_ONLY", 모든 가상 항목 note 에 "TEST_ONLY".
* 용도: 스키마·검증기·화면 시제품 시험. 실제 MILAL 관계망이 오면 이 파일은 쓰지 않는다.

쓰는 법: python3 make_test_only.py <tf/2021 폴더> <study 폴더> <출력 json>
"""
import sys, json, base64, hashlib
from collections import defaultdict

TF, ST, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
JOB = 18; LO = (31, 40); HI = (38, 1)

def body(path):
    L = open(path, encoding="utf-8").read().split("\n"); i = 0
    while i < len(L) and (L[i].startswith("@") or L[i] == ""): i += 1
    return L[i:]
def nodefeat(path, lo, hi, conv=str):
    out = {}; node = None
    for ln in body(path):
        if not ln.strip(): continue
        if "\t" in ln: n, v = ln.split("\t"); node = int(n)
        else: node += 1; v = ln
        if lo <= node <= hi: out[node] = conv(v)
    return out
rng = {}
for ln in body(TF + "/otype.tf"):
    if ln.strip(): a, t = ln.split("\t"); lo, hi = a.split("-"); rng[t] = (int(lo), int(hi))
CA_LO, CA_HI = rng["clause_atom"]
mother = {}; node = None
for ln in body(TF + "/mother.tf"):
    if not ln.strip(): continue
    if "\t" in ln: n, v = ln.split("\t"); node = int(n)
    else: node += 1; v = ln
    if CA_LO <= node <= CA_HI and v: mother[node] = int(v)
rela = nodefeat(TF + "/rela.tf", CA_LO, CA_HI)
CL_LO, CL_HI = rng["clause"]
rela_cl = nodefeat(TF + "/rela.tf", CL_LO, CL_HI)   # BHSA는 rela 를 절(clause) 노드에 둔다; 절 원자는 대부분 NA

w = json.load(open(ST + "/words.json", encoding="utf-8"))
u8 = lambda s: base64.b64decode(s)
def dec(o):
    s = u8(o["s"]); r = []; mx = -1; prev = -1; k = 0
    for c in s:
        if c == 1: mx += 1; prev = mx
        elif c == 2: prev = o["x"][k]; k += 1
        r.append(prev)
    return r
def cum(d):
    out = []; a = 0
    for x in d: a += x; out.append(a)
    return out
wc, wa = dec(w["wc"]), dec(w["wa"]); ccn, can = cum(w["ccn"]), cum(w["can"]); bs = w["bs"]
TY = json.load(open(ST + "/meta.json", encoding="utf-8"))
ct, cd = u8(w["ct"]), u8(w["cd"])
V = w["V"]; book_first = min(v[5] for v in V if v[0] == JOB)
slot = lambda i: bs[JOB - 1] + (i - book_first)

# 범위 안의 절(clause)들
clauses = {}  # ccn → dict
order = []
for v in V:
    if v[0] != JOB: continue
    c, vs = v[3], v[4]  # BHSA 장·절
    if (c, vs) < LO or (c, vs) > HI: continue
    for i in range(v[5], v[5] + v[6]):
        cid = ccn[wc[i]]
        if cid not in clauses:
            clauses[cid] = dict(id=str(cid), pos=len(order), ch=c, vs=vs, type=TY["typ"][ct[wc[i]]], domain=TY["dom"][cd[wc[i]]],
                                text="", word_ids=[], clause_atom_ids=[], native_self_annotations=[])
            order.append(cid)
        cl = clauses[cid]; cl["word_ids"].append(slot(i))
        if can[wa[i]] not in cl["clause_atom_ids"]: cl["clause_atom_ids"].append(can[wa[i]])
        cl["text"] += w["heb"][V.index(v)].split("\t")[i - v[5]] if False else ""
# 본문 글자(참고용)
for v in V:
    if v[0] != JOB or (v[3], v[4]) < LO or (v[3], v[4]) > HI: continue
    H = w["heb"][V.index(v)].split("\t")
    for j in range(v[6]):
        clauses[ccn[wc[v[5] + j]]]["text"] += H[j]
for cl in clauses.values(): cl["text"] = cl["text"].strip()
nodes = [clauses[c] for c in order]
byref = defaultdict(list)
for n in nodes: byref[(n["ch"], n["vs"])].append(n["id"])
def ids(c1, v1, c2, v2):
    return [n["id"] for n in nodes if (c1, v1) <= (n["ch"], n["vs"]) <= (c2, v2)]
sid = lambda *parts: hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:12]

# --- 묶음 (가상; 경계는 전통적 발언 구분을 따랐지만 MILAL 판정이 아님) ---
G = []
def grp(gid, kind, c1, v1, c2, v2, intro=None, **kw):
    m = ids(c1, v1, c2, v2); roles = {}
    if intro: roles["introduction"] = m[:intro]; roles["content"] = m[intro:]
    G.append(dict(id=gid, kind=kind, members=m, first=f"{c1}:{v1}", last=f"{c2}:{v2}", roles=roles, observed=[],
                  status="TEST_ONLY", textual="TEST_ONLY", frame_id=None, source_id=None, interpretation_dependencies=[],
                  disposition="TEST_ONLY", mother_table_status="TEST_ONLY", candidate_count=0, candidate_rule_summary={},
                  common_mothers=[], possible_mothers=[], peers=[], rule_notes=[], **kw))
grp("T-NRS-3140", "NARRATIVE_REPORT_SEGMENT_HYPOTHESIS", 31, 40, 31, 40)
grp("T-NRS-3201", "NARRATIVE_REPORT_SEGMENT_HYPOTHESIS", 32, 1, 32, 5)
grp("T-LSU-3206", "LOCAL_SPEECH_UNIT", 32, 6, 33, 33, intro=1)
grp("T-LSU-3401", "LOCAL_SPEECH_UNIT", 34, 1, 34, 37, intro=1)
grp("T-LSU-3501", "LOCAL_SPEECH_UNIT", 35, 1, 35, 16, intro=1)
grp("T-LSU-3601", "LOCAL_SPEECH_UNIT", 36, 1, 37, 24, intro=1)
grp("T-LSU-3801", "LOCAL_SPEECH_UNIT", 38, 1, 38, 1, intro=1)
grp("T-ESH-A", "ENCLOSING_SPEECH_HYPOTHESIS", 32, 6, 37, 24)   # 엘리후 전체를 한 발언으로
grp("T-ESH-B", "ENCLOSING_SPEECH_HYPOTHESIS", 34, 1, 37, 24)   # 둘째 발언부터 묶는 대안
gm = {g["id"]: g for g in G}

R, E, I, N = [], [], [], []
def rel(kind, status, src, tgt, rule, table, rec, evc=(), note="", evid=(), extra=None):
    fam = "HIERARCHY" if kind in ("SUBORDINATE", "FRAME_CONTENT", "CONTINUATION") else "CLOSURE" if kind == "CLOSURE" else "GROUPING"
    r = dict(id="T-REL-" + sid(kind, src, tgt, rule, rec), family=fam, kind=kind, status=status, source=src, target=tgt,
             rule=rule, record=dict(table=table, id=rec), evidence_clause_ids=list(evc), evidence_ids=list(evid), note=note)
    if extra: r["extra"] = extra
    R.append(r); return r["id"]
def evd(rule, check, outcome, text, cl=(), feats=None, role=None):
    """근거: outcome 은 검사 결과 그대로(PASSED/FAILED/UNRESOLVED/HUMAN). role 은 MILAL 문법이 붙인 경우에만.
    observed 에는 실제로 가리킬 수 있는 절 id만 넣는다(낱말·표지 관찰값은 시험 자료라 만들어 넣지 않음)."""
    e = dict(id="T-EV-" + sid(rule, check, outcome, text, tuple(cl)), rule_id=rule, check=check, outcome=outcome,
             observed=dict(clause_ids=list(cl), features=feats or {}), text="TEST_ONLY: " + text,
             record=dict(table="TEST_ONLY.P2_RULE_TRACE", id="TR-" + sid(rule, check, tuple(cl))))
    if role: e["role"] = role
    E.append(e); return e["id"]
Gp = lambda i: dict(type="group", id=i); Cp = lambda i: dict(type="clause", id=str(i))

# 1) 틀–내용: 각 발언 단위의 도입 절(묶음) → 내용 (가상 PROVISIONAL)
for gid in ("T-LSU-3206", "T-LSU-3401", "T-LSU-3501", "T-LSU-3601", "T-LSU-3801"):
    g = gm[gid]; intro = g["roles"]["introduction"][0]
    e1 = evd("G1", "REPORT_CONTENT_DEPENDENCY", "PASSED", "도입 절 검사 통과(가상)", [intro], feats={"typ": clauses[int(intro)]["type"]})
    e2 = evd("G1", "SCOPE_WARRANT", "UNRESOLVED", "내용의 끝 경계 보증은 미결(가상)", [g["members"][-1]])
    rel("FRAME_CONTENT", "PROVISIONAL", Cp(intro), Gp(gid), "G1", "TEST_ONLY.graph.assertions", "A-" + gid,
        [intro], "TEST_ONLY: 가상 기계 판정. 사람 승인 아님", [e1, e2])
# 2) 병행: 엘리후 네 발언의 도입 구문 (가상)
units = ["T-LSU-3206", "T-LSU-3401", "T-LSU-3501", "T-LSU-3601"]
for a, b in zip(units, units[1:]):
    ia, ib = gm[a]["roles"]["introduction"][0], gm[b]["roles"]["introduction"][0]
    e = evd("G3", "CONSTRUCTION_PARALLELISM", "PASSED", "도입 구문 대응 검사 통과(가상)", [ia, ib])
    rel("PARALLEL", "PROVISIONAL", Cp(ia), Cp(ib), "G3 CONSTRUCTION_PARALLELISM", "TEST_ONLY.P2_RULE_TRACE", "TR-" + a + "-" + b, [ia, ib],
        "TEST_ONLY: 도입 구문만 대응(단위 전체 병행 아님)", [e])
# 3) 포함: 묶음 → 구성 절 (가상, 겹치는 가설은 COMPETING)
for g in G:
    st = "COMPETING" if g["kind"] == "ENCLOSING_SPEECH_HYPOTHESIS" else "PROVISIONAL"
    for m in g["members"][:3]:   # 시험 자료라 앞 셋만
        rel("MEMBERSHIP", st, Gp(g["id"]), Cp(m), "G5 EXACT_MEMBER_INCLUSION", "TEST_ONLY.context_relations", "CX-" + g["id"] + "-" + m, [m], "TEST_ONLY: 정확한 구성원 포함. 모절 주장 아님")
# 4) 종속(단위 사이): 엘리후 단위 → 서술 전환 — 가상 COMPETING 둘 (같은 자리 경쟁)
e3 = evd("G2", "WHOLE_UNIT_DIRECTNESS", "UNRESOLVED", "단위 전체의 직접성 미결(가상)", gm["T-LSU-3206"]["members"][:1])
e4 = evd("G2", "ANCHOR_RELATION", "FAILED", "앵커 관계 검사 실패(가상) — 실패이지 반례 판정이 아님", [gm["T-NRS-3140"]["members"][0]])
rel("SUBORDINATE", "COMPETING", Gp("T-NRS-3201"), Gp("T-LSU-3206"), "G2", "TEST_ONLY.graph.assertions", "A-X1", [], "TEST_ONLY: 가상 경쟁 후보 ①", [e3, e4])
rel("SUBORDINATE", "COMPETING", Gp("T-NRS-3140"), Gp("T-LSU-3206"), "G2", "TEST_ONLY.graph.assertions", "A-X2", [], "TEST_ONLY: 가상 경쟁 후보 ②", [e4])
# 5) 확정 하나 (가상 사람 결정) — 32:1 서술의 두 절
m3201 = byref[(32, 1)]
if len(m3201) >= 2:
    eh = evd("HUMAN", "TEST_RATIONALE", "HUMAN", "가상 연구자 판정 근거문", m3201[:2], feats={"rationale_observations": ["TEST_ONLY"]})
    rel("SUBORDINATE", "CONFIRMED", Cp(m3201[0]), Cp(m3201[1]), "HUMAN TEST-H1", "TEST_ONLY.frozen_human", "TEST-H1#ALT-1", m3201[:2], "TEST_ONLY: 가상 사람 판정 채택", [eh])
    N.append(dict(record=dict(table="TEST_ONLY.frozen_human", id="TEST-H2#ALT-1"), source_clause_id=m3201[1], target_clause_id=m3201[0], decision="REJECTED", effect="NO_DIRECT_STRICT_MOTHER_RELATION", rationale_code="TEST_ONLY"))
# 6) 종결: 37:24 → 엘리후 전체 가설 (가상 UNASSIGNED)
rel("CLOSURE", "UNASSIGNED", Cp(gm["T-LSU-3601"]["members"][-1]), Gp("T-ESH-A"), "G5 TERMINATES_ENCLOSING_GROUP", "TEST_ONLY.context_relations", "CX-END", [], "TEST_ONLY: 종결 규칙 미결; 모절 주장 아님")
# 7) BHSA 원 자료 (실제 값): 절 원자 mother/rela 를 절 원자 번호 그대로 native_relations 에. MILAL 판정이 아니므로 relations 에 넣지 않는다
caset = {a for n in nodes for a in n["clause_atom_ids"]}
ca2cl = {a: n["id"] for n in nodes for a in n["clause_atom_ids"]}
NAT = []
for a in sorted(caset):
    m = mother.get(a)
    if m is None: continue
    rl = rela.get(a, "NA"); lvl = "clause_atom"
    if rl in ("", "NA"): rl = rela_cl.get(int(ca2cl[a]), "NA"); lvl = "clause"   # 절 원자에 없으면 절의 rela
    x = dict(id="NAT-" + str(a), clause_atom=a, mother_clause_atom=m, rela=rl, rela_level=lvl, clause_id=ca2cl[a],
             source=dict(dataset="BHSA", version="2021", features=["mother", "rela"]))
    if m in ca2cl: x["mother_clause_id"] = ca2cl[m]
    NAT.append(x)
nat = len(NAT)
# 8) 이슈 (가상)
I.append(dict(id="T-ALT-ESH", kind="ALTERNATIVE_SET", subkind="OVERLAPPING_GROUPING_HYPOTHESES", options=["T-ESH-A", "T-ESH-B"], competing=True, note="TEST_ONLY: 겹치는 묶음 가설. 기본 화면에 적용하지 않음"))
I.append(dict(id="T-ALT-X", kind="ALTERNATIVE_SET", subkind="COMPETING_MOTHERS", about=Gp("T-LSU-3206"), options=["T-NRS-3201", "T-NRS-3140"], competing=True, note="TEST_ONLY: 32:6 단위의 모절 후보 둘"))
for gid in units:
    I.append(dict(id="T-UNR-" + gid, kind="UNRESOLVED", about=Gp(gid), rule_id="G2", unresolved_checks=["WHOLE_UNIT_DIRECTNESS", "SCOPE_WARRANT"], record=dict(table="TEST_ONLY.P2_RULE_TRACE", id="TR-" + gid), note="TEST_ONLY: 단위 사이 모절은 미결"))
I.append(dict(id="T-NDR-3724-3801", kind="NO_DIRECT_RELATION", about=[Cp(gm["T-LSU-3601"]["members"][-1]), Cp(gm["T-LSU-3801"]["members"][0])],
              basis=dict(kind="CONTROL", control_id="TEST-CTRL-3724-3801"), record=dict(table="TEST_ONLY.controls", id="37:24/38:1"),
              note="TEST_ONLY: 37:24→38:1 직접 모절 관계 없음(가상 통제 판정)과 '모름'을 구분하는 예"))
if len(m3201) >= 2:
    I.append(dict(id="T-NDR-3201", kind="NO_DIRECT_RELATION", about=[Cp(m3201[1]), Cp(m3201[0])],
                  basis=dict(kind="HUMAN_DECISION", decision="NO_DIRECT_STRICT_MOTHER_RELATION", judgment_id="TEST-H2", rationale_code="TEST_ONLY"),
                  record=dict(table="TEST_ONLY.frozen_human", id="TEST-H2#ALT-1"), note="TEST_ONLY: 가상 연구자 REJECTED 결정에서 나온 '직접 모절 아님'"))
inbase = {m for g in G if g["kind"] != "ENCLOSING_SPEECH_HYPOTHESIS" for m in g["members"]}
for n in nodes:
    if n["id"] not in inbase: I.append(dict(id="T-UNA-" + n["id"], kind="UNASSIGNED_CLAUSE", about=Cp(n["id"])))

D = dict(schema="MILALWV-IF-1", file_status="TEST_ONLY",
         source=dict(schema_version="MILALWV-IF-1", bhsa_version="2021",
                     milal=dict(stage="TEST_ONLY", rules_version="TEST_ONLY", commit="", network_schema="(없음 — 시험 자료)"),
                     generated_at="2026-10-19T00:00:00Z", scope=dict(book="Job", bhsa_book="Iob", chapters=[31, 38]),
                     scientific_status="TEST_ONLY",
                     test_note="절·낱말·절 원자 번호와 native_relations(BHSA mother/rela)는 실제 BHSA 2021 값. 묶음·relations·evidence·issues·notes 는 모두 가상(TEST_ONLY). MILAL 판정이 아님."),
         nodes=nodes, groups=G, relations=R, evidence=E, issues=I, notes=N, native_relations=NAT)
json.dump(D, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"절 {len(nodes)} · 묶음 {len(G)} · 관계 {len(R)} · BHSA 원 관계(native) {nat} · 근거 {len(E)} · 이슈 {len(I)} · 메모 {len(N)} → {OUT}")
