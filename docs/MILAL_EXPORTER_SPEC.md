# MILAL V1 관계망 → MILALWV-IF-1 변환기(exporter) 명세 (초안)

- 성격: **읽기 전용**. MILAL 원본·규칙·판정·동결 파일을 바꾸지 않는다. 입력 파일을 읽어 새 파일 하나를 쓴다.
- 둘 곳: MILAL 저장소 `tools/` 또는 MILALWV `pipeline/` — 연구자 결정. 어느 쪽이든 MILAL 코드를 import 하지 않고 **파일만** 읽는다(MILAL 규칙 코드와 결합되지 않도록).
- 상태: 실제 V1 출력 파일이 아직 없어 **설계만**. 파일이 오면 이 명세대로 구현하고 아래 비교표를 채운다.

## 1. 입력 — 실제 파일 이름과 위치

V1을 돌리면(`scripts/run_milal_v1_windows.ps1`) `results\mfr03_v1_<날짜시각>\real\` 아래에 다음이 생긴다(`src/milal_v1_runner.py` OUTPUTS):

| 파일 | 쓰는가 | 왜 |
|---|---|---|
| `V1_RELATION_NETWORK.json` | **주 입력** | 절·묶음·관계·대안·미배정·사람 메모·출처 receipt |
| `90_run_metadata.json` | 입력 | 단계·코드 지문·생성 시점 → `source` |
| `99_manifest_sha256.csv` | 입력 | 입력 파일 무결성 확인, `network_sha256` |
| `V1_DISPLAY_TREE.json` | 쓰지 않음 | 화면 배치 결과. MILALWV는 스스로 배치한다 |
| `V1_HIERARCHY_VIEW.html` | 쓰지 않음 | 관계망을 내장한 뷰어(HTML_EMBEDS_NETWORK). 대조용 |
| `V1_REVIEW_SHEET.csv`, `V1_CONTROLS.json`, `V1_VALIDATION.md` | 참고 | 통제 항목(4:7/5:1 등)은 `issues.NO_DIRECT_RELATION`의 CONTROL 근거로 쓸 수 있음 |

근거를 펼치려면 V1의 입력이었던 **`P2_REVIEW.zip`**(`results\mfr03_p2_20261002\release_a_v2\P2_REVIEW.zip`, SHA256 `0a96d235…`) 안의 `P2_RULE_TRACE.csv`(payload JSON에 `trace_id, rule_id, relation, status, source, target, passed_checks, failed_checks, unresolved_checks, origin_ids, scope`)와 `P2_RELATIONS_AND_ALTERNATIVES.json`(graph.assertions의 `proposal_ids`, raw_clauses의 `atoms[].node`)도 읽는다.

**호환성 검증 때 필요한 자료(목사님 컴퓨터):**
1. `MILAL\results\mfr03_v1_*\real\V1_RELATION_NETWORK.json` (+ 같은 폴더의 `90_run_metadata.json`, `99_manifest_sha256.csv`) — V1을 아직 안 돌리셨으면 `scripts\run_milal_v1_windows.ps1` 실행이 먼저.
2. `MILAL\results\mfr03_p2_20261002\release_a_v2\P2_REVIEW.zip`.
둘 다 Git에는 없다(`results/`는 추적 제외).

## 2. 변환 대응표

| V1 (`V1_RELATION_NETWORK.json`) | → MILALWV-IF-1 | 비고 |
|---|---|---|
| `schema`, `stage`, `source`(receipt), `p2_contract`, `counts` | `source.milal.{network_schema, stage, input_receipt}`; `source.scientific_status` ← 90_run_metadata | `rules_version` = stage의 규칙 판(MFR.0.3); `commit` ← metadata의 저장소 커밋; `network_sha256` ← manifest의 V1_RELATION_NETWORK.json 해시; `generated_at` ← metadata |
| `clauses[]` {id,pos,ch,vs,type,text,domain,word_ids,native_self_annotations,ref} | `nodes[]` 같은 칸 + `clause_atom_ids` | `clause_atom_ids`는 P2 raw_clauses `atoms[].node`에서 (없으면 비움) |
| `groups[]` (모든 칸) | `groups[]` 그대로 | 칸 이름 바꾸지 않음 |
| `edges[]` 중 `rule`이 `BHSA clause_atom rela=`로 시작하지 **않는** 것 | `relations[]` | `id←edge_id`, `family`←kind로 결정(HIERARCHY/GROUPING/CLOSURE), `source/target/rule/record/evidence_clause_ids/note` 그대로, `extra`←나머지 칸(proposal_ids 등), `evidence_ids`←3절 |
| `edges[]` 중 BHSA 원 관계 | `native_relations[]` | `clause_atom`·`mother_clause_atom`은 P2 raw_clauses `native_annotations`(annotation_indexes로 되찾음)의 절 원자 노드; `rela`←extra.rela; `clause_id/mother_clause_id`←edge target/source; `rela_level` = clause_atom(원본 주석이 절 원자 것이면) |
| `alternatives[]` | `issues[]` kind=ALTERNATIVE_SET, `subkind`←kind, `options`, `competing`, `about`←clause_id(MULTIPLE_NATIVE_HEADS) | id 그대로 |
| `unassigned_clause_ids[]` | `issues[]` kind=UNASSIGNED_CLAUSE | id = `ISS-UNA-<clause>` |
| `groups[].rule_notes[]` (G1 FAILED) | `issues[]` kind=UNRESOLVED **아님** — FAILED는 `evidence[]` outcome=FAILED로, 관계 없이 보존; `groups[].rule_notes`에도 그대로 둠 | 실패 평가를 관계나 이슈로 승격하지 않음 |
| rule trace의 UNRESOLVED (관계 없는 것) | `issues[]` kind=UNRESOLVED, `rule_id`, `unresolved_checks`, `record` | V1에서 edge가 된 UNRESOLVED(G1 UNASSIGNED edge)는 relations에 남고, 그 unresolved_checks는 evidence outcome=UNRESOLVED |
| `human_notes[]` | `notes[]` 그대로; **추가로** `human_relation_type`/`effect`가 `NO_DIRECT_STRICT_MOTHER_RELATION`이면 `issues[]` kind=NO_DIRECT_RELATION, `basis.kind=HUMAN_DECISION` | 근거 있는 '직접 연결 없음'의 유일한 자동 출처 |
| `V1_CONTROLS.json`의 "no recorded direct relation" 통제 | `issues[]` kind=NO_DIRECT_RELATION, `basis.kind=CONTROL` | 통제 파일 형식 확인 뒤 |
| `legend` | 쓰지 않음 | MILALWV가 한국어 표를 가짐 |

## 3. 근거(evidence) 펼치기

관계의 `record`가 가리키는 출처별로:

| record.table | 근거 만들기 |
|---|---|
| `graph.assertions` | assertion의 `proposal_ids` → P2 rule trace에서 같은 proposal의 trace → `passed_checks`마다 outcome=PASSED, `failed_checks`마다 FAILED, `unresolved_checks`마다 UNRESOLVED 한 항목씩. `observed.clause_ids`←trace `origin_ids` 중 절 id인 것. `record`={P2_RULE_TRACE, trace_id} |
| `P2_RULE_TRACE` | 그 trace 하나를 위와 같이 |
| `context_relations` | 검사 항목이 없으면 근거 0개(관계 자체가 기록). 있으면 위와 같이 |
| `frozen_typed_relations` | P1 관계의 `rule_id`·`relation_type`·`scope`·`status`를 outcome=PASSED 한 항목으로(P1 결과는 통과한 것만 동결됨) |
| `frozen_human` | outcome=HUMAN 한 항목: `check`←human_rationale_code, `text`←human_rationale_text, `observed.features.rationale_observations`←rationale_observations, `observed.clause_ids`←[source,target] |

- `role`(REQUIRED/SUPPORTING/COUNTEREVIDENCE)은 P2 proposal의 `required_checks`에 든 검사면 REQUIRED, 아니면 비움. COUNTEREVIDENCE는 MILAL 문법(`config/clause_relation_grammar_v1.json`의 counterevidence 칸)이 그 검사를 그렇게 이름 붙인 경우에만. **FAILED를 COUNTEREVIDENCE로 바꾸지 않는다.**
- `observed.word_ids`·`atom_ids`는 trace에 실제로 있을 때만. 없으면 비움.

## 4. 손실·생성 검사 (변환 뒤 자동 비교)

| 검사 | 기준 |
|---|---|
| 절 수 | `len(nodes) == len(V1.clauses)` (욥기 2938) |
| 묶음 수 | `len(groups) == len(V1.groups)` (317) |
| 관계 수 | `len(relations) + len(native_relations) == len(V1.edges)` (3796); native 수 = rule이 BHSA로 시작하는 edge 수 |
| 관계 id | relations.id ∪ native 원본 edge_id 집합 == V1 edge_id 집합 (하나도 빠지거나 생기지 않음) |
| 상태 분포 | relations의 status 수 == V1 edges(비BHSA)의 status 수 (CONFIRMED 1 / PROVISIONAL / COMPETING / UNASSIGNED 각각) |
| 방향 | 모든 relation의 source/target == 원본 edge의 source/target (뒤집지 않음) |
| 근거 참조 | 모든 `evidence_ids`가 evidence에 있음; evidence의 record가 가리키는 trace가 P2_RULE_TRACE에 있음; 관계가 가리키던 trace의 검사 항목 수 == 그 관계의 evidence 수 |
| 대안·미배정 | issues(ALTERNATIVE_SET) 수 == V1.alternatives 수; issues(UNASSIGNED_CLAUSE) 수 == len(unassigned_clause_ids) |
| 사람 메모 | notes 수 == human_notes 수 |
| 새로 만든 것 | 허용되는 '생성'은 세 가지뿐: (a) `family` 칸, (b) `evidence[]` 항목(trace를 펼친 것 — 내용은 새것이 아님), (c) `issues.NO_DIRECT_RELATION`(human_notes·통제에서 파생). 그 밖에 V1에 없는 값이 생기면 실패 |
| 잃는 것 | `legend`, `counts`, `V1_DISPLAY_TREE.json` — 화면 배치·표시용이라 잃어도 됨. `edges[].note`는 그대로 옮기므로 잃지 않음 |
| 끝으로 | 결과 파일을 `pipeline/milal_check.py --words study/words.json`에 통과시킴(V1~V14) |

## 5. 출력

- `MILALWV/study/milal/job.json` (gzip 전 ~3MB 예상, 전송 ~0.3MB) — `file_status: "MILAL_OUTPUT"`.
- 함께 `study/milal/job.compare.json`: 4절 비교표의 실제 숫자(원본 vs 변환).
- MILALWV `app/milal.js`의 `MILAL_FILES`에 책 18 → 이 파일을 적으면 끝. 앱은 읽을 때 V2·V3·V6·V7·V9·V12·V14를 다시 검사하고, 실패하면 "MILAL 자료를 읽지 않음"으로 멈춘다(정상 화면으로 넘어가지 않음).

## 6. 명세가 가정한 것 (파일을 보고 확인할 것)

1. `90_run_metadata.json`에 저장소 커밋과 생성 시점이 있다(V1 runner가 code fingerprint를 넣는 것은 확인; 커밋 해시 칸 이름은 미확인).
2. BHSA 원 관계 edge의 `annotation_indexes`로 P2 raw_clauses의 절 원자 노드를 되찾을 수 있다.
3. `V1_CONTROLS.json`에 "직접 관계 없음" 통제가 식별 가능한 형태로 있다.
4. rule trace의 `origin_ids`에 절 id가 들어 있다(낱말 id일 수도 있음 — 그러면 `observed.word_ids`로).
