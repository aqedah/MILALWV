# MILALWV-IF-1 최종 승인안 (2026-10-20, 2판 — 기술 별첨) · **현재 상태: DRAFT**

> 연구자용 요약은 `docs/MILAL_IF1_APPROVAL_SUMMARY.md`(한 장). 이 문서는 그 별첨으로, 항목별 기술 근거를 담는다. 새 기능을 확정의 전제조건으로 추가하지 않는다.

**무엇을 확정하자는 것인가**: MILAL(분석 도구)의 V1 관계망을 MILALWV(보기 도구)로 넘기는 **데이터 구조와 변환 규칙**. 확정해도 MILAL의 어떤 관계도 학문적으로 승인되는 것이 아니다(승인은 `approvals.json`으로 따로, 자동 승인 없음).
**근거**: 실제 V1(커밋 d7c2eb3, P2_REVIEW.zip 0a96d235…)을 손실 없이 변환했다 — ROUNDTRIP_EXACT, V1~V16 통과, 낱말 번호 불일치 0, 원본 BHSA 관계 대조 불일치 0, 긍정·부정 기준점·NOT_RECORDED 기대대로. 상세: `docs/MILAL_INTERFACE_DRAFT.md`(규격 본문), `docs/REPORT_real_v1_2026-10-20.md`, `docs/REPORT_bhsa_native_compare_2026-10-20.md`.

## 1. 점검 항목별 결론

| 항목 | 규격의 처리 | 실제 자료 확인 | 결정 요청 |
|---|---|---|---|
| **source 와 원본 해시** | `source.milal{stage, rules_version, commit, network_schema, network_sha256, v1_fingerprint, input_receipt{P2 zip sha256, member_sha256}}` + `generated_at`. 파일 자체의 SHA-256 은 앱이 계산해 승인 기록과 맞춘다 | V1 네트워크 sha `c6df1724…`, P2 zip `0a96d235…`, V1 코드 지문 `0f3bacda…` 모두 기록됨 | 그대로 확정 |
| **nodes** (절) | BHSA clause 노드 id(문자열) · 장·절 · type · 본문 · domain · `word_ids`(BHSA 낱말 번호) · `clause_atom_ids`(P2 동결 자료에서) · `native_self_annotations` · `ref` | 2,938절, 낱말 번호 전체 대조 0 불일치, 절 원자 2,977개 = 앱 `can` 과 순서까지 동일 | 그대로 |
| **groups** (묶음) | V1 그대로(kind·members·first/last·roles·status·textual·rule_notes…) — 변환기는 칸을 해석하지 않고 보존 | 317개, 9종(발언 단위 40, 보고 도입/내용 41+41, 표면 사건 표지 65, 덮이지 않은 문맥 119 …) | 그대로. 한글 이름표는 앱 쪽 일 |
| **relations** (MILAL 판정 관계) | `id=V1 edge_id` · **`family`(HIERARCHY/GROUPING/CLOSURE) — MILAL 이 확정한 값이 아니라 변환기가 `kind` 를 보기용으로 분류한 값** · `kind` · `status` · `source`(모절)→`target`(자절) · `rule` · `record`(출처 표) · `evidence_clause_ids` · `evidence_ids` · `note` · `extra`(V1 추가 칸 보존) | 446개, 상태·종류 분포 V1 과 동일, 방향 보존(H0.2 기록 500064→500065 로 확인) | 그대로. **`family` 는 변환기가 만든 분류**임을 명시(4절) |
| **native_relations** (BHSA 원 자료) | MILAL 판정과 분리. `clause_id`·`mother_clause_id`·`rela`·`origin_edge_id` + **`bhsa_nodes`·`clause_atom`·`mother_clause_atom`·`atom_resolution`**(13절에서 추가) | 3,350개; 절 원자 복원 2,895, 원본 대조 불일치 0 | 그대로. 제한: V1 은 절당 1건이라 둘째 원자의 mother 39건은 사본 파일에만(4절) |
| **evidence** | P2_RULE_TRACE 를 검사 항목별로 펼침: `rule_id`·`check`·`outcome ∈ PASSED/FAILED/UNRESOLVED/HUMAN`·`observed`·`text`·`record`·(선택)`role`. 반례를 지어내지 않음 | 851개(통과 816·미결 34·HUMAN 1), 근거 없는 관계 0 | 그대로 |
| **issues** | `ALTERNATIVE_SET`(대안 묶음) · `UNRESOLVED`(규칙 검사 미결) · `UNASSIGNED_CLAUSE` · `NO_DIRECT_RELATION`(**사람 기각 기록이 있을 때만**, `basis` 필수) | 4종, NO_DIRECT 1건 = frozen_human 기각 | 그대로 |
| **판정 상태의 뜻** | V1 그대로: CONFIRMED=사람 채택 · PROVISIONAL=규칙 통과·사람 미확인 · COMPETING=후보 경쟁 · UNASSIGNED=미배정. 앱은 CONFIRMED 만 '확정 사슬'에 넣고, 나머지는 후보로 그린다. "관계 없음"(기록 없음=모름)과 "없다고 판정"(NO_DIRECT_RELATION)을 구별 | 확정 1·잠정 334·경쟁 77·미배정 34 | 그대로 |
| **clause 와 clause_atom 의 단위** | MILAL 관계의 단위는 **clause**(절). 앱의 표시 단위는 **clause_atom**(절 원자). 절 하나에 원자가 여럿(39절)이면 그 절의 MILAL 판정은 모든 원자에 같이 보이고, 원자 수준 차이는 BHSA 원 자료 칸에서만 보인다 | 다대일 39절, 원자 수준 mother 가 절 수준과 다른 경우 0 | 그대로. 명시(4절) |
| **누락값과 NOT_RECORDED** | 칸이 없거나 null = 모름(NOT_RECORDED). 변환기는 값을 지어 채우지 않는다(예: 37:24→38:1 의 HSA3 판정은 V1 에 없으므로 어떤 issue 도 만들지 않음) | 37:24→38:1 NOT_RECORDED 확인 | 그대로 |
| **버전 규칙** | ① 호환되는 **선택 칸 추가** → IF-1 안의 개정(`source.if1_revision` 에 날짜·개정 번호; 앱은 모르는 칸을 무시, 없는 칸은 모름) ② **필수 칸 추가 또는 기존 칸의 뜻 변경** → 새 판(`MILALWV-IF-2`) 검토 ③ **MILAL 규칙·판정 변경** → 그 판의 **새 결과 파일**, 출처(`source.milal.commit`·`rules_version`·`network_sha256`·P2 zip 해시)를 다시 기록 ④ **연구자 승인 기록은 해시가 달라진 결과에 자동 승계하지 않음**(`approvals.json` 은 `if1_sha256` 으로만 대응 — 재검토) | 2판→실제 자료까지 ①만 있었음(bhsa_nodes·clause_atom_ids 등 선택 칸) | 확정 시 규격 §0 에 올림 |
| **approvals.json** (연구자 검토 기록) | 분석 파일과 **별도** 파일·별도 규격(`MILALWV-APPROVAL-1`). 대상 파일 해시·범위(ALL/RELATIONS/CHAPTERS/RULES/KINDS)·상태(APPROVED/PARTIAL/REJECTED)·승인자(입력 문자열)·날짜·비고. 우선순위 규칙 §11.1. 자동 승인 없음. 기록이 PROVISIONAL 을 CONFIRMED 로 바꾸지 않음(상태는 MILAL 파일 그대로) | 기록 0건(연구자 판단 전) | 그대로 |

## 1b. 기본 구조 (지시대로 고정)
nodes = BHSA clause · groups = V1 의 실제 묶음 · relations = MILAL 판정 · native_relations = BHSA 원본 관계 · evidence = 근거·규칙 검사 · issues = 경쟁·미결·미배정·기각 · approvals.json = 분석 파일과 별도인 연구자 검토 기록.

## 2. 초안 2판 이후 바뀐 것 (변경점)

1. `review` 칸은 정보용으로만 남고 승인은 `approvals.json`(해시 대응, 우선순위 규칙, RULES/KINDS 범위) — §11·11.1.
2. 기준점 정정 — 500064→500065 긍정, 500062→500065 부정, 37:24→38:1 NOT_RECORDED — §12.
3. `native_relations` 에 `bhsa_nodes`·절 원자 번호 복원(P2 동결 자료에서) · V13a/V13b 분리 · 원자료 사본 파일(`MILALWV-BHSA-NATIVE-1`) — §13.
4. `nodes.clause_atom_ids` 가 실제 P2 구조(`CLAUSE.atoms`)에서도 채워지도록 변환기 수정(2026-10-20 오후).
5. (지시 4, 2026-10-20 저녁) 앱의 'V1 보존 여부'를 네 상태(절 원자 직접 수록 / 절 수준 수록 / 원자료에만 / 확인 불가)로 구별 — 전수검사 2,977개, 잘못된 표시 0. V13b 를 NOT_RUN 과 PASS 로 분리하고, 배포용 통합검증은 원자료 사본을 필수로(판·책·절 원자 집합 대조 뒤에만 결합).
6. 버전 규칙을 위 표의 ①~④ 로 정리. `family` 가 변환기 분류임을 표에 명시.

## 3. 확정하더라도 남는 제한 (잔여 제한 사항 — 유지)

- V1 의 원 관계는 절당 1건이라 둘째 절 원자의 BHSA mother(39건)는 IF-1 에 없고 사본 파일에만 있다 — 앱은 둘을 합쳐 보여 주지만 **관계로 만들지는 않는다**.
- `family` 는 변환기가 `kind` 로부터 붙인 보기용 분류이지 MILAL 의 판정이 아니다.
- `evidence.outcome=FAILED` 는 P2 검사 실패이지 반례가 아니다(반례는 `role=COUNTEREVIDENCE` 로만).
- HSA3 등 V1 밖의 판정은 이 규격의 범위 밖(별도 설계: `docs/HSA3_DISPLAY_DESIGN.md`).
- 규격 확정 ≠ 관계 승인. 실제 파일의 `file_status=MILAL_OUTPUT`, `review.status=UNREVIEWED` 는 승인 기록이 생겨야 바뀐 것처럼 보인다(파일은 안 바뀜).

## 4. 연구자가 답할 것 (예/아니오)

1. 위 표의 "그대로" 항목들을 MILALWV-IF-1 **정식 규격**으로 확정하는가?
2. 버전 규칙(칸 추가=같은 판, 뜻 변경=IF-2, 새 MILAL 결과=새 파일·재승인)에 동의하는가?
3. 잔여 제한 4가지를 규격 본문에 명시한 채 두는 데 동의하는가?
4. (선택) 첫 **학문적** 승인 기록을 어느 범위로 할지 — `docs/MILAL_REVIEW_TABLE_2026-10-20.md` 의 규칙별 검토표를 보고 정한다. **답이 오기 전에는 approvals.json 에 아무것도 쓰지 않는다.**

## 5. 상태
- 이 문서는 **연구자 최종 승인용**이다. 승인 답이 오기 전까지 IF-1 은 **DRAFT** 이며(`docs/MILAL_INTERFACE_DRAFT.md` 제목 그대로), 앱·검증기·변환기는 DRAFT 를 그대로 쓴다. 기술 검증 통과(ROUNDTRIP_EXACT·V1~V16·V13b)와 학문적 승인은 끝까지 별개다.

