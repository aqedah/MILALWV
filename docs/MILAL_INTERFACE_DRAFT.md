# MILAL → MILALWV 연결 규격 초안 (MILALWV-IF-1)

- 상태: **초안 2판** (2026-10-19 밤, 1판의 뜻 오류를 고침 — 맨 끝 '2판에서 바뀐 것' 참조). 최종 확정은 실제 MILAL 관계망과 대조한 뒤 연구자 승인으로.
- 바탕: MILAL 저장소 `src/milal_v1_network.py`(MFR.0.3-V1, 스키마 `MILAL-V1-RELATION-NETWORK-1`)와 `docs/MFR_0_3_V1_SPEC.md`. MILAL의 관계 유형·판정 상태·규칙 이름을 **그대로** 쓰고, 새 이름을 짓지 않는다.
- 원칙: MILAL은 판정하고 MILALWV는 보여 준다. 이 규격은 MILAL이 낸 것을 **하나도 잃지 않고** 옮기는 그릇이다. MILALWV가 받은 뒤 계산한 것(계층 깊이, 화면 배치)은 이 파일에 되쓰지 않는다.
- 스키마 파일: `docs/milal_interface.schema.json` (JSON Schema 2020-12). 검증기: `pipeline/milal_check.py`. 시험 자료: `test/milal_test_only_job31-38.json` (**TEST_ONLY**, 실제 판정 아님).

---

## 0. 한눈에

```
{
  "schema": "MILALWV-IF-1",
  "file_status": "TEST_ONLY" | "MILAL_OUTPUT",
  "source":    { … 출처·판 … },
  "nodes":     [ … 절(clause) … ],
  "groups":    [ … 묶음(발언 단위 등) … ],
  "relations": [ … 관계 … ],
  "evidence":  [ … 근거 … ],
  "issues":    [ … 미해결·대안·직접 연결 없음(판정) … ],
  "notes":     [ … 사람 결정 메모(채택되지 않은 것 포함) … ],
  "native_relations": [ … BHSA 원 자료의 절 원자 mother/rela — MILAL 판정이 아님 … ]
}
```

MILAL V1 관계망의 `clauses → nodes`, `groups → groups`, `edges(BHSA 원 관계 제외) → relations`, `edges(BHSA 원 관계) → native_relations`, `alternatives + unassigned_clause_ids + rule_notes → issues`, `human_notes → notes`로 옮겨진다. V1에 없는 것은 `evidence`(근거를 관계에서 떼어 독립 목록으로)뿐이며, V1의 `edge.record`(출처 표·ID)와 `evidence_clause_ids`는 그대로 보존된다.

**세 층을 섞지 않는다**: `native_relations`(BHSA 원 자료) / `relations`(MILAL 판정) / MILALWV 화면의 색·표지(앱 관찰 후보). 한 파일 안에 있어도 칸이 다르고, 화면에서도 따로 표시한다.

---

## 1. 열쇠: BHSA 2021 노드 번호

| 단위 | MILAL이 주는 것 | MILALWV가 가진 것 (words.json) |
|---|---|---|
| 절(clause) | `id` = BHSA clause 노드 번호(문자열) | `ccn[cid]` |
| 절 원자(clause_atom) | (V1에는 직접 없음; 원 자료 `atoms[].node`) | `can[aid]` |
| 낱말 | `word_ids` = BHSA 낱말 번호 | `bs[책-1]` + 책 안 순번 |

- 노드 ID는 **BHSA 2021 노드 번호**만 쓴다. MILAL 내부 연속 번호나 MILALWV 내부 번호는 교환 열쇠가 아니다.
- 절마다 `word_ids`를 반드시 둔다. MILALWV는 `word_ids`로 절·절 원자를 되찾으므로, 절 번호가 어긋나도 낱말로 검산할 수 있다.
- `source.bhsa_version`이 `"2021"`이 아니면 MILALWV는 읽지 않는다(자료판이 다르면 노드 번호가 다르다).
- BHSA 원값(`tab`, `rela`, `typ`, `domain`)은 MILALWV가 자기 words.json에 이미 가지고 있다. 이 규격은 **원값을 다시 싣지 않고**, MILAL이 원값을 어떻게 읽었는지(`rela`가 관계에 붙어 있는 것 등)만 싣는다. 단, 원값과 MILAL 판정은 화면에서 반드시 따로 표시한다.

---

## 2. source — 출처와 판

```jsonc
"source": {
  "schema_version": "MILALWV-IF-1",      // 이 파일 구조의 판. 규칙이 바뀌어도 이건 안 바뀔 수 있다
  "bhsa_version": "2021",
  "milal": {
    "stage": "MFR.0.3-V1",                // MILAL 단계 이름 (HANDOFF의 이름 그대로)
    "rules_version": "MFR.0.3",           // 규칙 판
    "commit": "91012f03ee2d…",            // MILAL 저장소 커밋
    "network_schema": "MILAL-V1-RELATION-NETWORK-1",
    "network_sha256": "e1b3c495…",        // 관계망 JSON의 해시 (있으면)
    "input_receipt": { "zip_sha256": "0a96d235…", "p2_stage": "MFR.0.3-P2" }  // V1의 source 그대로
  },
  "generated_at": "2026-10-02T00:00:00Z",
  "scope": { "book": "Job", "bhsa_book": "Iob", "chapters": [1, 42] },
  "scientific_status": "MACHINE_PROVISIONAL"   // MILAL 메타데이터의 scientific_status 그대로
}
```

- `schema_version`과 `milal.rules_version`은 따로 관리한다.
- `file_status`(맨 위)가 `TEST_ONLY`이면 화면 어디에나 "시험 자료"를 표시하고, `source.milal`에 값이 있어도 실제 판정으로 다루지 않는다.

---

## 3. nodes — 절

V1 `clauses` 항목 그대로. 절 원자 번호는 MILALWV가 `word_ids`로 되찾으므로 선택 항목.

```jsonc
{ "id": "441823",                  // BHSA clause 노드 (문자열; V1이 문자열을 쓴다)
  "pos": 2612, "ch": 31, "vs": 40, // V1: 본문 순서, 장, 절
  "type": "WayX", "domain": "N",   // BHSA 원값 (MILAL이 읽은 그대로)
  "text": "…",                     // surface_hebrew (선택)
  "word_ids": [339100, 339101],    // BHSA 낱말 번호 (필수)
  "clause_atom_ids": [529855],     // 선택. 있으면 MILALWV가 대조한다
  "native_self_annotations": [],   // V1 그대로
  "meta": { }                      // MILAL이 절에 붙인 그 밖의 것 (표지, 역할 등). 자유 형식, 잃지 않기 위해 둠
}
```

"필요한 경우 표지 또는 문학적 역할"은 V1에 없다. 들어오면 `meta`에 그대로 둔다. MILALWV는 `meta`를 해석하지 않고 상세 창에 원문 그대로 보여 준다.

---

## 4. groups — 묶음

V1 `groups` 그대로. 발언 단위(LOCAL_SPEECH_UNIT 등)가 여기 있으므로 **발화 보기의 뼈대**다.

```jsonc
{ "id": "P124-LSU-0032", "kind": "LOCAL_SPEECH_UNIT",
  "members": ["441901", "441902", …],       // 절 id. 모두 nodes에 있어야 함
  "first": "32:6", "last": "33:33",
  "roles": { "introduction": ["441901"], "content": [ … ] },   // V1 roles 그대로 (키는 MILAL이 정함)
  "observed": [ … ], "status": "…", "textual": "…",
  "frame_id": null, "source_id": null, "interpretation_dependencies": [],
  "disposition": "…", "mother_table_status": "…",
  "candidate_count": 3, "candidate_rule_summary": { "G1:REPORT_CONTENT_DEPENDENCY:UNRESOLVED": 2 },
  "common_mothers": [], "possible_mothers": [], "peers": [],
  "rule_notes": [ { "trace_id": "…", "rule": "G1", "status": "FAILED", "other": "…", "failed": [], "unresolved": [] } ]
}
```

- 묶음 종류(`kind`)는 MILAL 이름: `LOCAL_SPEECH_UNIT`, `CONDITIONAL_RESPONSE_UNIT`, `UNRESOLVED_SCOPE_FRAGMENT`, `NARRATIVE_REPORT_SEGMENT_HYPOTHESIS`(이 넷이 서로 겹치지 않는 '바탕 단위'), `ENCLOSING_SPEECH_HYPOTHESIS`(겹칠 수 있는 가설), `SURFACE_EVENT_ANCHOR`, `UNCOVERED_SOURCE_CONTEXT`(표지류).
- `rule_notes`의 FAILED 평가는 관계가 아니다(V1 원칙). MILALWV는 "관계 없음"이 아니라 "규칙 G1 실패(검사 항목 …)"로 보여 준다.

---

## 5. relations — 관계

V1 `edges`를 그대로 옮기되 근거는 `evidence_ids`로 뗀다. **노드 안의 `rel` 한 칸이 아니라 독립 목록**이다.

```jsonc
{ "id": "V1-EDGE-3f2a…",                       // V1 edge_id 그대로
  "family": "HIERARCHY",                        // HIERARCHY | GROUPING | CLOSURE | LITERARY(자리만)
  "kind": "FRAME_CONTENT",                      // SUBORDINATE | PARALLEL | FRAME_CONTENT | CONTINUATION | CLOSURE | MEMBERSHIP
  "status": "PROVISIONAL",                      // CONFIRMED | PROVISIONAL | COMPETING | UNASSIGNED
  "source": { "type": "group", "id": "P124-LSU-0031" },     // type: clause | group | clause_set(ids)
  "target": { "type": "group", "id": "P124-LSU-0032" },
  "rule": "G1",                                 // MILAL 규칙 이름 그대로 (G1, G2 ANCHOR_RELATION, G3 …, G5 …, BHSA clause_atom rela=Objc, HUMAN H0.2-…)
  "record": { "table": "graph.assertions", "id": "…" },     // MILAL 출처 표·ID — 되짚는 열쇠
  "evidence_clause_ids": ["441901", "441902"],  // V1 그대로
  "evidence_ids": ["EV-…"],                     // 6절 evidence 목록의 id (0개 이상)
  "note": "P2 기계 판정 모절(INTRA_REPORT); 사람 승인 아님",
  "extra": { "proposal_ids": [], "rela": "Objc", "annotation_indexes": [0] }   // V1의 추가 칸 그대로
}
```

### 방향 (확정 근거 있음)

| kind | source | target | 계층인가 |
|---|---|---|---|
| SUBORDINATE | **모절·머리** | **자절·의존절** | 예 |
| FRAME_CONTENT | **틀(도입 절·묶음)** | **내용(묶음)** | 예 — 틀이 내용을 거느린다 |
| CONTINUATION | **앞선 머리** | **이어지는 절** | 예(BHSA `rela` 없음/NA/Resu/ReVo를 V1이 이렇게 분류) — 단, **이 종류는 V1에서 BHSA 원 관계에서만 나온다**. 그래서 2판에서는 `native_relations`로 간다. MILAL이 스스로 CONTINUATION을 판정하는 날이 오면 그때 `relations`에 쓴다 |
| PARALLEL | 앞 것 | 뒤 것 | 아니오 (대칭) |
| MEMBERSHIP | 묶음(담는 쪽) | 절(담기는 쪽) | 아니오 |
| CLOSURE | 닫는 절·묶음 | 닫히는 묶음 | 아니오 |

근거: MILAL `docs/HUMAN_STRUCTURAL_ADJUDICATION_MFR_H02.md`의 기록 "500062 → 500065"에서 `target_clause_id=500065`(כִּי יְבֻלָּע, **모절을 찾는 절**), `source_clause_id=500062`(**모절 후보**). P2 명세도 "each target's mother table"(target마다 모절 표)라고 쓴다. V1 코드는 BHSA 원 관계를 `C(head), C(dependent)`로, 사람 결정을 `C(source), C(target)`로 넣어 같은 방향이다. → **source = 모절, target = 자절**로 확정. (연구자 확인 ①은 '확인됨'으로 내림)

**중복 모절·순환 검사는 계층(HIERARCHY) 계열에만** 건다. PARALLEL·MEMBERSHIP·CLOSURE를 같은 나무에 억지로 넣지 않는다.

### 계열(family)

- `HIERARCHY`: SUBORDINATE, FRAME_CONTENT, CONTINUATION — 모절·자절 계층. **깊이는 CONFIRMED 관계만으로** 계산한다. PROVISIONAL·COMPETING은 깊이에 넣지 않고 점선·경쟁 표시로만 보인다.
- `GROUPING`: MEMBERSHIP, PARALLEL — 계층이 아니다. MEMBERSHIP은 "모절 주장 아님"(V1).
- `CLOSURE`: CLOSURE.
- `LITERARY`: 인용·재진술·논박 등. **MILAL에 아직 없다.** 자리만 둔다. kind 값은 MILAL이 정할 때까지 비워 둔다.

### 상태의 뜻 (V1 그대로)

- CONFIRMED 확정 = 사람이 ACCEPTED한 결정이 있음. **MILAL의 현재 검증 절차에서 확정**이라는 뜻이지, 학문적 해석이 끝났다는 뜻이 아니다.
- PROVISIONAL 잠정 = 기계 규칙 통과, 사람 검토 전.
- COMPETING 경쟁 = 같은 자리에 서로 배타적인 대안이 둘 이상.
- UNASSIGNED 미배정 = 기록된 관계이지만 본문 계층 지위가 배정되지 않음(BHSA 원 관계가 여기 든다). **"관계 없음"이 아니다.**

### "연결 없음"과 "모름"의 구분

- 어떤 절에 HIERARCHY 관계가 하나도 없고, `issues`에도 없음 → MILALWV는 **"자료 없음(모름)"** 으로 표시한다.
- MILAL이 "직접 연결이 없다"고 **명시적으로 판정한** 것만 `issues`에 `kind: "NO_DIRECT_RELATION"`으로 적는다. 관계가 출력되지 않았다는 이유로 만들지 않는다. 반드시 `basis`(무엇에 근거했나)를 둔다. 실제 예: H0.2 기록 `human_edge_decision=REJECTED`, `human_relation_type=NO_DIRECT_STRICT_MOTHER_RELATION`(욥 37:20, 500062→500065) — 이것은 V1에서 `human_notes`로 가므로, 변환기가 `notes`와 함께 `issues.NO_DIRECT_RELATION`(basis.kind=HUMAN_DECISION)으로도 낸다. 통제 항목(4:7/5:1)은 basis.kind=CONTROL.

---

## 6. evidence — 근거

한 관계에 근거 여럿. 여러 근거를 하나의 설명문으로 합치지 않는다. **검사 결과(outcome)와 역할(role)을 구별한다**: 검사가 실패했다(FAILED)는 것과 그것이 반례다(COUNTEREVIDENCE)는 것은 다른 말이다. 실패를 기계적으로 반례로 바꾸지 않는다.

```jsonc
{ "id": "EV-…",
  "rule_id": "G1",                          // MILAL 규칙 이름 그대로
  "check": "REPORT_CONTENT_DEPENDENCY",     // 규칙 안의 검사 항목 (P2_RULE_TRACE의 passed/failed/unresolved_checks 항목명)
  "outcome": "PASSED",                      // PASSED | FAILED | UNRESOLVED | HUMAN  — 자료에 있는 그대로
  "role": "REQUIRED",                       // 선택. REQUIRED | SUPPORTING | COUNTEREVIDENCE — MILAL 규칙 문법(CLAUSE_RELATION_GRAMMAR의 required/supporting/counterevidence 칸)이 그렇게 이름 붙인 경우에만. 없으면 비움
  "observed": { "clause_ids": ["441901"], "atom_ids": [529855], "word_ids": [339210], "features": { "typ": "WayX" } },  // 실제로 기록된 것만. 없으면 비움. 만들어 넣지 않는다
  "text": "…",                              // MILAL 기록의 설명문 그대로 (사람 결정이면 human_rationale_text)
  "record": { "table": "P2_RULE_TRACE", "id": "…" }   // 되짚는 열쇠
}
```

- 사람 결정의 근거는 `outcome: "HUMAN"`, `check: human_rationale_code`, `text: human_rationale_text`, `observed.features.rationale_observations: [...]`(H0.2 기록의 칸 그대로).
- V1 관계망에는 근거가 `rule` + `record` + `evidence_clause_ids` + `note`로 압축돼 있고, 검사 항목별 결과는 `P2_RULE_TRACE.csv`에 있다. 손실 없는 변환은 **trace의 `passed_checks / failed_checks / unresolved_checks`를 evidence 항목 하나씩(outcome 그대로)**으로 펼치는 것이다. → 변환기 명세 `docs/MILAL_EXPORTER_SPEC.md`.
- `observed.features`는 자유 형식. MILALWV는 키·값을 그대로 보여 주고, `observed`의 절·낱말을 누르면 원문 자리로 간다.

---

## 7. issues — 미해결·대안

UNRESOLVED를 관계 하나에 억지로 붙이지 않는다. 세 경우를 따로 둔다.

```jsonc
{ "id": "V1-ALT-…", "kind": "ALTERNATIVE_SET",         // 서로 배타적인 선택지 묶음
  "subkind": "OVERLAPPING_GROUPING_HYPOTHESES",        // V1: OVERLAPPING_GROUPING_HYPOTHESES | MULTIPLE_NATIVE_HEADS
  "about": { "type": "clause", "id": "…" },            // 무엇에 대한 것인지 (선택)
  "options": ["P124-ESH-…", "P124-ESH-…"],             // 묶음 id 또는 절 id
  "competing": true, "note": "…" }

{ "id": "ISS-…", "kind": "UNRESOLVED",                 // 아직 정할 수 없음
  "about": { "type": "group", "id": "…" },
  "rule_id": "G2", "unresolved_checks": ["WHOLE_UNIT_DIRECTNESS", "SCOPE_WARRANT"],
  "record": { "table": "P2_RULE_TRACE", "id": "…" }, "note": "…" }

{ "id": "ISS-…", "kind": "SCOPE_CONFLICT",             // 적용 범위 충돌
  "about": [ { "type": "group", "id": "…" }, { "type": "group", "id": "…" } ], "note": "…" }

{ "id": "ISS-…", "kind": "UNASSIGNED_CLAUSE",          // 어느 바탕 단위에도 들지 않은 절 (V1 unassigned_clause_ids)
  "about": { "type": "clause", "id": "…" } }

{ "id": "ISS-…", "kind": "NO_DIRECT_RELATION",         // "직접 연결 없음"이라고 명시적으로 판정됨 (모름과 구분)
  "about": [ { "type": "clause", "id": "500062" }, { "type": "clause", "id": "500065" } ],   // [모절 후보, 자절] 순
  "basis": { "kind": "HUMAN_DECISION",                   // HUMAN_DECISION | RULE | CONTROL — 반드시 있어야 함
             "decision": "NO_DIRECT_STRICT_MOTHER_RELATION", "judgment_id": "MFR-H02-JOB-37-20", "rationale_code": "DISTINCT_LOCAL_COLON_CONSTRUCTION" },
  "record": { "table": "frozen_human", "id": "MFR-H02-JOB-37-20#HA-…" }, "note": "…" }
```

---

## 8. notes — 사람 결정 메모

V1 `human_notes` 그대로. 채택되지 않은(REJECTED) 결정도 잃지 않는다.

```jsonc
{ "record": { "table": "frozen_human", "id": "H0.2-…#ALT-…" },
  "source_clause_id": "…", "target_clause_id": "…",
  "decision": "REJECTED", "effect": "…", "rationale_code": "…" }
```

---

## 8b. native_relations — BHSA 원 자료 (MILAL 판정이 아님)

BHSA의 절 원자 `mother`와 `rela`를 **절 원자 번호 그대로** 담는다. 절 수준으로 올려 적지 않는다(절 수준 대응은 보기 좋으라고 덧붙이는 참고 칸일 뿐). 판정 상태(status)가 없다 — 원 자료에는 판정이 없기 때문이다.

```jsonc
{ "id": "NAT-589766",
  "clause_atom": 589766, "mother_clause_atom": 589760,   // BHSA 2021 clause_atom 노드 (원값)
  "rela": "Objc",                                        // BHSA rela (절 원자에 없으면 그 절의 rela; 어느 쪽인지 rela_level에 적음)
  "rela_level": "clause",                                // clause_atom | clause
  "clause_id": "499638", "mother_clause_id": "499637",   // 참고용 절 대응 (있으면)
  "source": { "dataset": "BHSA", "version": "2021", "features": ["mother", "rela"] } }
```

V1은 이것을 `edges`에 `rule="BHSA clause_atom rela=…"`, `status=UNASSIGNED`로 넣었다. 2판에서는 `relations`에서 빼고 여기로 옮긴다. 이유: 같은 목록에 있으면 화면에서 MILAL 판정과 섞여 보이고, 절 수준으로 올리면서 절 원자 정보가 사라지기 때문이다. V1의 `MULTIPLE_NATIVE_HEADS` 대안은 그대로 `issues.ALTERNATIVE_SET`에 남긴다(그것은 "원 자료에 머리가 둘"이라는 관찰이며, about에 절을 적는다).

## 9. 검증 규칙 (pipeline/milal_check.py)

| 번호 | 검사 | 실패 시 |
|---|---|---|
| V1 | JSON Schema 적합 (jsonschema 없으면 **검사 불가** — 통과가 아님) | 읽지 않음 |
| V2 | `source.bhsa_version == "2021"` | 읽지 않음 |
| V3 | 관계·묶음·이슈가 가리키는 절·묶음 id가 모두 존재 | 읽지 않음 |
| V4 | 관계 id 중복 없음, (kind, source, target, rule, record) 중복 없음 | 읽지 않음 |
| V5 | 절 `word_ids`가 MILALWV words.json의 같은 절(`ccn`)의 **낱말 번호 전체**와 일치(개수가 아니라 번호) | 그 절을 '대조 실패'로 표시; 실패 절이 10% 넘으면 읽지 않음 |
| V6 | HIERARCHY 계열 **CONFIRMED** 관계만으로 만든 그래프에 **순환 없음** | 읽지 않음 (MILAL에 보고) |
| V7 | HIERARCHY 계열 CONFIRMED 관계에서 한 target(자절)에 source(모절)가 둘 이상 → **중복 모절** | 읽지 않음 (MILAL에 보고) |
| V8 | PROVISIONAL·COMPETING·UNASSIGNED까지 넣었을 때의 순환·중복 모절 | 경고만 (경쟁·미배정은 중복이 정상) |
| V9 | `evidence_ids`가 모두 evidence에 존재 | 읽지 않음 |
| V12 | `issues.NO_DIRECT_RELATION`에 `basis`와 `record`가 있음 | 읽지 않음 |
| V13 | `native_relations`의 절 원자가 nodes의 `clause_atom_ids`에 있음 | 읽지 않음 |
| V14 | `file_status == MILAL_OUTPUT`이면 `source.milal.commit`·`network_sha256`·`generated_at`이 비어 있지 않음 | 읽지 않음 |
| V10 | `file_status == TEST_ONLY`면 모든 화면에 '시험 자료' 표시 | — |
| V11 | 장을 넘는 관계 허용 (검사하지 않음; 단 `scope` 밖 절이면 V3 실패) | — |

계층 **깊이**는 저장하지 않는다. V6·V7을 통과한 CONFIRMED 관계로 MILALWV가 계산한다. PROVISIONAL은 점선으로, 같은 자리의 COMPETING은 어느 쪽에도 넣지 않고 '경쟁' 표시(V1 화면 원칙과 같음).

---

## 10. MILAL 쪽에 필요한 작업 (보고용 — MILAL은 손대지 않음)

MILALWV가 요구하는 인터페이스는 위와 같다. V1 관계망을 이 규격으로 바꾸는 **내보내기 스크립트 하나**가 MILAL 쪽에 필요하다. 하는 일:

1. `clauses → nodes`, `groups`, `edges → relations`(`evidence_ids` 빈 목록), `alternatives/unassigned/rule_notes → issues`, `human_notes → notes`로 옮기고 `source`를 채운다(V1 `source` receipt + `stage` + 커밋 + 생성 시점).
2. **근거 펼치기**: `P2_RULE_TRACE.csv`의 각 trace를 검사 항목별 `evidence` 항목으로 펼치고, 관계의 `record`가 가리키는 trace와 잇는다. 이것이 유일하게 V1 관계망 밖의 자료를 읽는 부분이다.
3. "직접 연결 없음" 판정(통제 항목 4:7/5:1 등)을 `issues.NO_DIRECT_RELATION`으로 낸다 — V1 관계망에 이 칸이 없다.
4. 절마다 `clause_atom_ids`(선택)를 붙인다. P2 raw_clauses의 `atoms[].node`에 있다.

MILAL의 규칙·판정·동결 파일은 바꾸지 않는다. 내보내기는 읽기만 한다.

### 연구자 확인 사항

1. ~~관계 방향~~ → H0.2 기록으로 확인됨(source=모절 후보, target=자절). 이의가 있으면 알려 주십시오.
2. **"직접 연결 없음"**: V1 관계망에 칸이 없다. `human_notes`의 REJECTED/NO_DIRECT_STRICT_MOTHER_RELATION과 통제 항목을 `issues.NO_DIRECT_RELATION`(basis 필수)으로 내는 데 동의하는지.
3. **근거 펼치기 깊이**: 검사 항목별(passed/failed/unresolved)로 펼치는 것으로 충분한지, 규칙 안의 관찰값(어떤 낱말·표지)까지 필요한지. 후자는 rule trace에 있는지 확인 필요.
4. **단위**: MILAL은 절(clause) 단위다. MILALWV 구조 화면은 절 원자 단위다. 절 하나가 절 원자 여럿일 때 관계를 **절의 첫 절 원자**에 그리는 것으로 한다(MILALWV 쪽 결정, MILAL 자료는 그대로).
5. **발화**: V1에는 발화자·수신자가 없다(P124는 "named identity를 추론하지 않음"). 발화 보기는 묶음(`LOCAL_SPEECH_UNIT`의 `roles.introduction/content`)과 BHSA `domain`만으로 그린다. 발화자 이름은 넣지 않는다.

---

## 2판에서 바뀐 것과 이유 (2026-10-19)

| 바뀐 것 | 이유 |
|---|---|
| BHSA 원 관계를 `relations`에서 빼고 `native_relations`(절 원자 번호 그대로)로 | 원 자료를 MILAL 판정 목록에 섞어 절 수준으로 올리면, 화면에서 판정처럼 보이고 절 원자 정보가 사라진다 |
| 관계 방향을 '확인 필요'에서 '확정'으로 | MILAL H0.2 기록(500062 → 500065)과 P2 명세("each target's mother table")가 source=모절 후보, target=자절임을 보여 준다 |
| CONTINUATION은 지금 `relations`에 나오지 않음 | V1에서 CONTINUATION은 BHSA 원 관계에서만 생긴다. 칸은 남겨 둔다 |
| 중복 모절·순환 검사를 HIERARCHY 계열에만 | 병행·포함·종결은 나무가 아니다 |
| 깊이 계산을 CONFIRMED 관계로만 | PROVISIONAL·COMPETING을 깊이에 넣으면 잠정 판정이 확정처럼 보인다 |
| `evidence.stance` → `outcome`(PASSED/FAILED/UNRESOLVED/HUMAN) + 선택 `role` | 검사 실패는 반례가 아니다. 반례라는 이름은 MILAL 규칙 문법이 붙인 경우에만 |
| `observed`에 실제 기록된 것만 | 없는 관찰값을 만들어 넣지 않기 위해 |
| `NO_DIRECT_RELATION`에 `basis` 필수 | 관계가 없다는 이유로 만들어지지 않게, 판정의 출처를 되짚을 수 있게 |
| V12·V13·V14 추가, V1은 jsonschema 없으면 '검사 불가' | 통과로 잘못 읽히지 않게 |

---

## 11. 연구자 승인 기록의 분리 (2026-10-20)

- **분석 파일(IF-1)은 승인 과정에서 수정하지 않는다.** 승인은 별도 `study/milal/approvals.json`(규격 `MILALWV-APPROVAL-1`)에 기록한다. `pipeline/milal_approve.py`가 쓰며, `--approver`·`--status`·`--scope`를 사람이 직접 줘야 한다(자동 APPROVED 없음, TEST_ONLY 파일은 승인 불가, 일부 범위에 APPROVED 불가 → PARTIAL).
- 기록 한 건: `if1_sha256`(승인 대상 IF-1 파일 해시) · `v1_network_sha256` · `milal{stage, rules_version, commit}` · `approver` · `date` · `scope`(ALL / RELATIONS:[id…] / CHAPTERS:[a,b]) · `status`(APPROVED / PARTIAL / REJECTED) · `note`.
- 앱은 받은 IF-1 파일의 바이트 SHA-256을 계산해 **같은 해시의 기록만** 적용한다. 기록이 없거나 해시가 다르면 UNREVIEWED("승인 전 — 검증 대기"). PARTIAL이면 범위에 든 관계에만 "승인" 배지. 파일 안의 `review.status`는 **읽되 믿지 않는다**(파일이 자기를 승인할 수 없음; APPROVED라 적혀 있어도 기록이 없으면 무시하고 비고에 남김).
- 전환: 기존 `review` 칸은 변환기가 늘 `{"status":"UNREVIEWED"}`로 쓰며 정보용으로만 남긴다(V16은 그대로). 승인은 approvals.json 쪽이 유일한 출처다. 나중에 `review` 칸을 없애도 앱은 영향 없다.

### 11.1 기록이 여러 건일 때의 우선순위 (2026-10-20, 작업 A-2) — `app/approval.js` = `pipeline/milal_approve.py resolve()`

1. **TEST_ONLY 파일에는 어떤 기록도 적용하지 않는다**(만들지도 않는다). 상태는 `TEST_ONLY`.
2. `if1_sha256`이 지금 파일의 해시와 다른 기록은 적용하지 않는다(파일이 한 바이트라도 바뀌면 승인은 무효 → 다시 승인).
3. 적용되는 기록을 **날짜 오름차순**(같은 날짜는 파일에 적힌 순서)으로 차례로 적용한다 — 뒤의 기록이 앞을 덮는다.
   | 기록 | 효과 |
   |---|---|
   | APPROVED (scope ALL만 허용) | 전체 승인. 앞선 부분 기각 예외를 지움 |
   | REJECTED (ALL) | 전체 기각. 앞선 부분 승인을 지움 |
   | PARTIAL (RELATIONS / CHAPTERS / RULES / KINDS) | 범위의 관계를 승인 집합에 넣고, 그 관계의 기각 예외를 지움(재승인) |
   | REJECTED (RELATIONS / CHAPTERS / RULES / KINDS) | 범위의 관계를 기각 예외에 넣고 승인 집합에서 뺌(전체 승인 뒤의 부분 기각도 됨) |
   **RULES**(규칙 번호별: `G1,G5 …`, `HUMAN MFR-H02-JOB-37-20` 등)·**KINDS**(관계 종류별: `SUBORDINATE …`)는 후속 지시 작업 F(2026-10-20)에서 추가 — 연구자가 관계 하나하나가 아니라 **규칙 또는 검증 범위 단위**로 판단하도록. 선택적으로 `@a-b` 로 장 범위와 교차. `--check` 가 규칙별 승인/전체·상태 요약과 승인 안 된 관계 목록을 보여 준다.
   CHAPTERS 범위는 관계의 source·target 절(묶음이면 묶음의 절 전부)이 **모두** 그 장 범위 안에 있을 때만 든다(장을 걸친 관계는 제외).
4. 관계 하나의 효력 = (전체 승인 상태 또는 승인 집합에 있음) 그리고 기각 예외에 없음. 파일 상태 = 모든 관계 승인 → APPROVED · 일부 → PARTIAL · 없고 마지막 전체 판정이 기각 → REJECTED · 그 밖 → UNREVIEWED. 앱의 관계별 '승인' 배지는 이 집합으로만 켠다(CHAPTERS 부분 승인도 배지에 반영 — 이전엔 RELATIONS만 반영되던 결함 고침).
5. **승인자 이름은 입력 문자열**이다. 앱은 "기록된 이름(입력값, 신원 확인 아님)"으로만 표시하고, 암호학적 서명·계정 확인으로 표현하지 않는다.
6. 자동 승인은 없다. 시험: `python3 pipeline/milal_approve_tests.py`(Python·JS 19건 동일 답).

## 12. 실제 V1 검증 기준점 정정 (2026-10-20, 후속 지시 작업 A)

MILAL `docs/HUMAN_STRUCTURAL_ADJUDICATION_MFR_H02.csv`(판정 `MFR-H02-JOB-37-20`, 2026-09-26)를 다시 읽은 결과:

| 쌍 | 연구자 판정 | V1 에서의 모습 | MILALWV 기준점 |
|---|---|---|---|
| **500064 → 500065** (אִם־אָמַר אִישׁ → כִּי יְבֻלָּע) | `ACCEPTED_AS_LOCAL_MOTHER`, HYPOTACTIC, STRICTLY_BELOW | `CONFIRMED SUBORDINATE` 간선, rule `HUMAN MFR-H02-JOB-37-20`, record `frozen_human` | **긍정 기준점** — 실제로 확정된 모절·자절 |
| **500062 → 500065** (הַיְסֻפַּר־לֹו → כִּי יְבֻלָּע) | `REJECTED_AS_DIRECT_MOTHER`, `NO_DIRECT_STRICT_MOTHER_RELATION`(첫째 콜론 vs 둘째 콜론; SB03 큰 단위 매개는 기계 증거로 보존) | `human_notes` 항목 → IF-1 `issues.NO_DIRECT_RELATION`(basis HUMAN_DECISION) | **부정 기준점** — 직접 모절 후보를 명시적으로 기각한 기록 |
| 37:24 → 38:1 | HSA3 D/E 이음매 판정의 `NO_DIRECT_PARENTAGE`·`NO_DIRECT_RESPONSE_ANTECEDENT`(`src/milal_hsa3_de_seam_adjudication.py`) | V1 입력 `frozen_human` 은 위 2건뿐이라 **V1 에 없음** | 기록 유무만 확인 → **NOT_RECORDED** 가 정상. 가상 판정을 만들지 않음 |

- 처음 판의 `milal_real_v1_check.py`(커밋 24fe694)는 500062→500065 에 CONFIRMED 를 기대했다. **잘못**이었다(이 쌍은 기각 기록). 본 절 §5 의 방향 근거(source=모절 후보, target=자절)는 그대로 맞다 — 기록의 source 가 '후보'라는 뜻이지 '채택'이라는 뜻이 아니다.
- 고친 검증기: `--positive 37:20=500064>500065`(CONFIRMED·HUMAN 규칙·HUMAN 근거), `--negative 37:20=500062>500065`(CONFIRMED 없음 + human_notes 기각 기록 + NO_DIRECT_RELATION 일치; 기록이 없으면 '기각됨'이 아니라 NOT_RECORDED), `--not-in-v1 37:24>38:1`(기록 유무만). 실제 파일의 NO_DIRECT_RELATION 은 모두 `frozen_human` 에서 와야 하고, 아니면 ❌.
- 안전장치: V1 게이트 FAIL → 변환 안 함 · manifest 불일치 → 즉시 중단 · 이전 compare.json 재사용 없음 · ROUNDTRIP_EXACT 필수 · 근거 미결/실패 수 따로 보고 · `file_status == MILAL_OUTPUT` 확인 · 작업 폴더(`build/real_v1_<날짜>/`)에 만들고 **모든 검사가 0일 때만** `--deploy` 자리로 복사.
- 회귀 시험: `pipeline/milal_real_v1_check_tests.py` 11건(MILAL 자체 시험 fixture 가 H0.2 와 같은 모양 — 114→115 채택, 112→115 기각 — 이라 실제 자료 없이 논리를 검사).
- TEST_ONLY 시험 파일(`test/milal_test_only_job31-38.json`)의 37:24/38:1 `NO_DIRECT_RELATION`(basis CONTROL)은 '모름'과 '판정됨'의 화면 구분을 보이기 위한 **가상 통제 자료**이며, 실제 파일에는 그런 basis 가 올 수 없다(검증기 ❌).

