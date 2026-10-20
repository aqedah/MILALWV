# V1 관계망 → MILALWV-IF-1 필드 전수 대응표

기준: `test/v1_fixture/V1_RELATION_NETWORK.json`(MILAL V1 자체 시험 산출물)에서 나온 **122개 필드 경로** 전부. `pipeline/milal_roundtrip.py`가 IF-1에서 V1을 되살려 원본과 정준 JSON으로 비교하며, 결과는 **ROUNDTRIP_EXACT**(차이 0). 실제 파일에 여기 없는 칸이 더 있으면 `nodes.meta` / `relations.extra` / `native_relations.origin_extra` / `v1_passthrough`로 들어가며, round-trip 검사가 누락을 잡는다.

## 1. 머리 칸 (V1 최상위)

| V1 | IF-1 위치 | 화면에서 쓰나 |
|---|---|---|
| `schema`, `stage` | `source.milal.network_schema`, `source.milal.stage` + `v1_passthrough.schema/stage` | 예(표시) |
| `source.*` (zip_sha256, zip_bytes, manifest_verified[], member_sha256.*, p2_stage, p2_status, p2_scientific_status, p2_code_fingerprint) | `source.milal.input_receipt`(그대로) + `v1_passthrough.source` | 일부(해시) |
| `p2_contract.*` | `v1_passthrough.p2_contract` | 아니오 |
| `legend.kinds.*`, `legend.statuses.*` | `v1_passthrough.legend` | 아니오(앱이 한국어 표 가짐) |
| `counts.*` | `v1_passthrough.counts` | 아니오(재계산 가능) |
| `base_group_ids[]` | `v1_passthrough.base_group_ids` | 아니오(묶음 kind로 복원 가능) |
| `rule_notes_trace_ids[]` | `v1_passthrough.rule_notes_trace_ids` | 아니오 |

## 2. 절 `clauses[]` → `nodes[]`

| V1 | IF-1 |
|---|---|
| `id` | `id` (문자열) |
| `pos`, `ch`, `vs`, `type`, `text`, `domain` | 같은 이름 |
| `word_ids[]` | `word_ids[]` (정수) |
| `native_self_annotations[]` | 같은 이름 |
| `ref` | `ref` |
| (그 밖의 칸) | `meta.*` |
| — | `clause_atom_ids[]`: P2 raw_clauses `atoms[].node`가 있을 때만. 없으면 칸 없음 |

## 3. 묶음 `groups[]` → `groups[]`

모든 칸 그대로(`id, kind, members[], first, last, roles.*[], observed[], status, textual, frame_id, source_id, interpretation_dependencies[], disposition, mother_table_status, candidate_count, candidate_rule_summary.*, common_mothers[], possible_mothers[], peers[], rule_notes[].{trace_id, rule, status, other, failed[], unresolved[]}`). `roles`의 값은 숫자 문자열이면 절 id, 아니면 관찰 특징 이름(예: `observed_features: ["TIME_PHRASE"]`) — 검증기는 숫자만 절로 대조한다.

## 4. 관계 `edges[]`

### 4a. MILAL 판정 관계 (rule이 `BHSA clause_atom rela=`로 시작하지 않는 것) → `relations[]`

| V1 | IF-1 |
|---|---|
| `edge_id` | `id` |
| `kind`, `status`, `source{type,id|ids}`, `target{…}`, `rule`, `record{table,id}`, `evidence_clause_ids[]`, `note` | 같은 이름 |
| `proposal_ids[]` 등 그 밖의 칸 | `extra.*` |
| — | `family` (kind에서 결정), `evidence_ids[]` (6절) |

### 4b. BHSA 원 관계 → `native_relations[]`

| V1 | IF-1 |
|---|---|
| `edge_id` | `origin_edge_id` (새 `id`는 `NAT-<edge_id>`) |
| `source.id` (머리) / `target.id` (의존절) | `mother_clause_id` / `clause_id` |
| `rela` | `rela`, `rela_level: "clause"` |
| `annotation_indexes[]` | `annotation_indexes[]` |
| `kind`, `status` | `origin_kind`, `origin_status` (V1이 표시용으로 붙인 분류·'미배정') |
| `rule`, `record`, `evidence_clause_ids[]`, `note` | `origin_rule`, `record`, `origin_evidence_clause_ids[]`, `note` |
| 그 밖의 칸 | `origin_extra.*` |
| — | `clause_atom: null`, `mother_clause_atom: null`, `atom_resolution: "NOT_AVAILABLE_IN_V1"` — **복원한 것이 아니라 없다는 표시** |

## 5. 대안·미배정·사람 결정

| V1 | IF-1 |
|---|---|
| `alternatives[].{alternative_id, kind, options[], competing, note, clause_id?}` | `issues[]` kind=ALTERNATIVE_SET: `id, subkind, options, competing, note, about{clause}` |
| `unassigned_clause_ids[]` | `issues[]` kind=UNASSIGNED_CLAUSE (id `ISS-UNA-<절>`) |
| `human_notes[].{record, source_clause_id, target_clause_id, decision, effect, rationale_code}` | `notes[]` 그대로 **+** 직접 모절 기각(effect/decision에 NO_DIRECT 또는 REJECTED_AS_DIRECT_MOTHER)이면 `issues[]` kind=NO_DIRECT_RELATION (그 후보 쌍만, basis=HUMAN_DECISION) |
| `groups[].rule_notes[]`의 `unresolved` | (rule_notes는 그대로 두고) `issues[]` kind=UNRESOLVED 로 **덧붙임** |

## 6. 근거 `evidence[]` — V1에는 없음, `P2_REVIEW.zip`에서 펼침

| 출처 | 만드는 항목 |
|---|---|
| `graph.assertions` 관계 → `proposal_ids` → `P2_RULE_TRACE` | trace마다: `passed_checks[]` 각 1(PASSED) · `failed_checks[]` 각 1(FAILED) · `unresolved_checks[]` 각 1(UNRESOLVED). 검사 이름 목록이 전혀 없으면 trace `status` 그대로 1개 |
| `P2_RULE_TRACE`/`context_relations` 관계 | 위와 같이 그 trace |
| `frozen_typed_relations` | PASSED 1개 (`rule_id`·`relation_type`·`scope`·`status`를 text에) |
| `frozen_human` | HUMAN 1개 (`check`=rationale_code, text=note) |
| trace `origin_ids[]` | `observed.clause_ids`(P2 raw_clauses의 절 id 집합에 있을 때) / `observed.word_ids`(절의 word_ids 집합에 있을 때) / `observed.other_ids`(어느 쪽도 아님) — **숫자라는 이유로 절로 보지 않음** |

zip을 주지 않으면 trace 근거는 비고, 비교 보고서 `evidence_coverage.note`에 적힌다(동결 관계·사람 결정 근거만 남음).

## 7. 보존하지 않는 것

없음. 화면에서 쓰지 않는 칸은 `v1_passthrough`·`extra`·`origin_extra`·`meta`에 그대로 들어간다. (이전 보고에서 '버림'이라 한 legend·counts·base_group_ids·rule_notes_trace_ids도 2판 변환기에서는 보존.) 유일하게 **새로 만드는 것**: `family`, `evidence[]`, `issues.NO_DIRECT_RELATION/UNRESOLVED/UNASSIGNED_CLAUSE`, `native_relations.id`, `atom_resolution`. 이 중 학문적 판단은 하나도 없다(모두 원본 기록을 옮겨 적은 것).

## 8. 시험 (`pipeline/milal_export_tests.py`, 15건 모두 통과)

round-trip 정확 · 근거 완전 · 관계 수 보존 · 필드 손실 검출 6종(관계 note, 절 word_ids, 원 관계 annotation_indexes, 묶음 rule_notes, 사람 메모, 머리 칸) · V1이 읽은 것과 다른 zip 거부 · zip 없을 때 근거 비는 사실 보고 · NO_DIRECT_RELATION = 사람 기각 수 · 상태 분포 그대로 · 절 원자 '복원 아님' 표시 · origin_ids 판별 칸.
