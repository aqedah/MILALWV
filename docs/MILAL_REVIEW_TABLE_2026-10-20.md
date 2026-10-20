# 연구자 검토표 — 실제 MILAL V1 관계망 (규칙별)

- 파일 `study/milal/job.json` · 관계 446개 · 대표 사례는 욥기 32–37장 안에서 기계적으로 골랐다(본문 순서 첫 것·경쟁 첫 것·미결 근거 첫 것·미배정 첫 것). 통계로 새 해석을 만들지 않았다.
- **검토 결과 칸은 비워 두었다.** 적는 법: 승인 / 유보 / 기각 + 근거 한 줄 + 날짜 + 이름. 기록은 `pipeline/milal_approve.py --scope RULES:<규칙>[@장-장]` 로 옮긴다(관계 하나씩 적지 않아도 됨). PROVISIONAL 을 검토했다고 CONFIRMED 가 되지 않고(상태는 MILAL 파일 그대로), 경쟁 후보 하나를 승인해도 관계망은 바뀌지 않는다.

## 규칙 HUMAN — 관계 1개 (욥 32–37장 1개)

- 세부 규칙: `HUMAN MFR-H02-JOB-37-20` 1
- 관계 유형: {'종속': 1} · 상태: {'확정': 1}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - 연구자 본인 판정(H0.2) — 기록된 사유 코드와 본문이 지금도 유효한가

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-84ad95db339e93231ec2` | 37:20 `אִֽם־אָ֥מַר אִ֝֗ישׁ` → **종속** → 37:20 `כִּ֣י יְבֻלָּֽע׃` | 확정 | frozen_human #MFR-H02-JOB-37-20#HA-7bd | HUMAN 1 | |

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 규칙 G1 — 관계 40개 (욥 32–37장 4개)

- 규칙 정의(P2 rule_registry 원문): *REPORT_CONTENT_DEPENDENCY: completed explicit report, native introduction chain, connected content, every floor member and endpoint revalidated under its recorded frame premise.*
- 세부 규칙: `G1` 40
- 관계 유형: {'틀–내용': 40} · 상태: {'잠정': 39, '미배정': 1}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - 보고(말하기 절)가 완결된 명시적 보고인가
  - 도입 사슬이 BHSA 원 자료의 사슬과 맞는가
  - 내용이 끊기지 않고 이어지는가
  - 내용의 모든 절과 끝 경계가 '기록된 틀 전제' 아래서 다시 확인되는가(미결 SCOPE_WARRANT 가 많음)

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-51fea6448c2c5f681595` | 보고 도입 32:6–32:6(2절) → **틀–내용** → 보고 내용 32:6–33:33(146절) | 잠정 | graph.assertions #MA-47f7de2477196d81ec8ea | PASSED 9 | |
| 대표(본문 순서 가운데) | `V1-EDGE-606744decb3f14f1848f` | 보고 도입 35:1–35:1(2절) → **틀–내용** → 보고 내용 35:2–35:16(41절) | 잠정 | graph.assertions #MA-24996f7f561a93f11010e | PASSED 9 | |

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 규칙 G2 — 관계 2개 (욥 32–37장 0개)

- 규칙 정의(P2 rule_registry 원문): *MACRO_HYPOTACTIC: Q1 clause grammar plus exact subordinate source binding, whole source governance, whole target dependence, directness and scope identity. NA/containment/identity are insufficient.*
- 세부 규칙: `G2 ANCHOR_RELATION` 2
- 관계 유형: {'종속': 2} · 상태: {'잠정': 2}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - Q1 절 문법 + 정확한 종속 출처 결합인가
  - 출처 전체가 다스리고 목표 전체가 의존하는가(직접성·범위 동일성)
  - NA·포함·동일성만으로는 부족하다는 규칙 자체 조건

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-2c404fd4a17e5d0732f3` | 보고 내용 29:2–31:40(237절) → **종속** → 표면 사건 표지 29:4–29:4(1절) | 잠정 | P2_RULE_TRACE #P2-TRACE-b6c58bb237e40b0 | PASSED 2 | |

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 규칙 G3 — 관계 25개 (욥 32–37장 0개)

- 규칙 정의(P2 rule_registry 원문): *MACRO_PARATACTIC: independent whole-unit formal role correspondence, pair-specific witness beyond a bare formula, whole-scope mapping and independently supported report level. Partial evidence remains construction correspondence.*
- 세부 규칙: `G3 CONSTRUCTION_PARALLELISM` 23, `G3 MACRO_PARATACTIC` 2
- 관계 유형: {'병행': 25} · 상태: {'잠정': 25}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - 독립된 단위 전체의 형식 역할 대응인가
  - 짝에 고유한 증거(단순 공식 이상)가 있는가
  - 전체 범위 대응과 독립적으로 뒷받침된 보고 수준인가
  - 부분 증거면 '구성 대응'(CONSTRUCTION_PARALLELISM)에 머무는가

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-126249b4eed0aae20b60` | 보고 도입 1:7–1:7(1절) → **병행** → 보고 도입 1:8–1:8(1절) | 잠정 | P2_RULE_TRACE #P2-TRACE-09b5a2a9f21057a | PASSED 4 | |
| 대표(본문 순서 가운데) | `V1-EDGE-f8dea2c5ccf715f3a433` | 보고 도입 1:8–1:8(1절) → **병행** → 보고 도입 2:6–2:6(1절) | 잠정 | P2_RULE_TRACE #P2-TRACE-a7059f4b2b0545c | PASSED 4 | |

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 규칙 G5 — 관계 352개 (욥 32–37장 64개)

- 규칙 정의(P2 rule_registry 원문): *BOUNDARY_AND_MEMBERSHIP: closure, next-report endpoint, and exact set inclusion are independently typed contextual relations, never mother.*
- 세부 규칙: `G5 EXACT_MEMBER_INCLUSION` 274, `G5 LOCAL_SCOPE_ENDPOINT` 46, `G5 DIRECT_LOCAL_CLOSURE` 30, `G5 TERMINATES_ENCLOSING_GROUP` 2
- 관계 유형: {'소속': 274, '닫음': 78} · 상태: {'경쟁': 77, '잠정': 242, '미배정': 33}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - 닫음·다음 보고 끝점·정확한 집합 포함은 '문맥 관계'이지 모절이 아니다 — 모절처럼 읽히는 자리가 없는가
  - 큰 발언 가설(32:6/34:1/35:1–37:24)의 겹침에서 어느 포함을 쓸지는 연구 판단
  - 경쟁(COMPETING) 소속은 어느 가설을 택해도 다른 관계망을 바꾸지 않음

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-0dfe96acf17b9c973bf0` | 큰 발언 가설 32:6–37:24(440절) → **소속** → 보고 내용 35:2–35:16(41절) | 경쟁 | context_relations #P2-CONTEXT-6810919625a22 | PASSED 1 | |
| 대표(본문 순서 가운데) | `V1-EDGE-85c9767e89bb6c430891` | 큰 발언 가설 34:1–37:24(292절) → **소속** → 발언 단위 36:1–37:24(147절) | 경쟁 | context_relations #P2-CONTEXT-3a7a6a6867265 | PASSED 1 | |

- 경쟁 소속 77건의 모절 후보(어느 큰 발언 가설에 속하는가): 큰 발언 가설 32:6–37:24(440절) ×19; 큰 발언 가설 26:1–31:40(399절) ×19; 큰 발언 가설 27:1–31:40(372절) ×15; 큰 발언 가설 34:1–37:24(292절) ×15; 큰 발언 가설 35:1–37:24(190절) ×9

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 규칙 P1-A1 — 관계 11개 (욥 32–37장 0개)

- 세부 규칙: `P1-A1 PARATACTIC` 11
- 관계 유형: {'병행': 11} · 상태: {'잠정': 11}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - P1 단계의 병행(PARATACTIC) 판정 — 규칙 정의는 P2 registry 에 없음(P1 산출물 참고)
  - 병행 두 절의 형식 대응이 문맥에서 성립하는가

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-aca6150053b9e271bd4e` | 1:5 `כִּ֚י אָמַ֣ר אִיֹּ֔וב` → **병행** → 34:5 `כִּֽי־אָ֭מַר אִיֹּ֣וב` | 잠정 | frozen_typed_relations #P1-REL-f3c87396a979d2539 | PASSED 1 | |
| 대표(본문 순서 가운데) | `V1-EDGE-24ee3437a7e0c2c530ab` | 1:8 `כִּ֣י אֵ֤ין כָּמֹ֨הוּ֙ בָּאָ` → **병행** → 2:3 `כִּי֩ אֵ֨ין כָּמֹ֜הוּ בָּאָ֗` | 잠정 | frozen_typed_relations #P1-REL-2562adf91b242c907 | PASSED 1 | |

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 규칙 P1-A2 — 관계 15개 (욥 32–37장 0개)

- 세부 규칙: `P1-A2 CONSTRUCTION_PARALLELISM_PROVISIONAL` 15
- 관계 유형: {'병행': 15} · 상태: {'잠정': 15}
- 검토해야 할 핵심 판단(규칙 정의의 조건을 질문으로):
  - P1 단계의 구성 대응(잠정) — 완전한 병행이 아니라 구성만 대응
  - 구성 대응을 병행으로 올릴 근거가 있는가(없으면 잠정 유지)

| 구분 | 관계 id | 관계 | 상태 | 출처 기록 | 근거 | 검토 결과 / 근거 / 날짜 / 이름 |
|---|---|---|---|---|---|---|
| 대표(본문 순서 첫 것) | `V1-EDGE-d9a5f52043919343f183` | 절 묶음 1:6–1:6(2절) → **병행** → 절 묶음 2:1–2:1(2절) | 잠정 | frozen_typed_relations #P1-REL-dfafce1d02928d37d | PASSED 1 | |
| 대표(본문 순서 가운데) | `V1-EDGE-dcfec7e9a220035354a6` | 절 묶음 1:15–1:15(2절) → **병행** → 절 묶음 1:19–1:19(2절) | 잠정 | frozen_typed_relations #P1-REL-db717a2c2d83546d8 | PASSED 1 | |

**규칙 전체 검토 결과**: ☐ 승인 ☐ 유보 ☐ 기각 — 근거: ______ · 날짜: ______ · 이름: ______

## 승인 대상이 아닌 것(상태 그대로 보존)

- 미해결·대안·미배정: {'ALTERNATIVE_SET': 4, 'UNASSIGNED_CLAUSE': 119, 'UNRESOLVED': 2, 'NO_DIRECT_RELATION': 1} — 승인·기각의 대상이 아니라 연구 과제. 승인하지 않은 관계도 원래 상태로 남는다.
- 사람 판정 메모(frozen_human): 1건 — 직접 모절 기각 등. 변환기는 이를 NO_DIRECT_RELATION 으로만 옮긴다.

