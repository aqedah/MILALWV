# HSA3 차원·노드 대응 검증 (읽기 전용 시제품) — 2026-10-20

- 읽은 파일: `config/hsa3_abc_human_decisions.json`, `config/hsa3_ana_0_3_human_decisions.json`, `config/hsa3_de_human_decisions.json`, `config/hsa3_fg_human_decisions.json`, `config/hsa3_layer_0_2_human_decisions.json` (연구자 공급, FROZEN) · IF-1 `study/milal/job.json`
- 시제품: `test/hsa3_prototype_job.json` (`MILALWV-HSA-1`, PROTOTYPE_READ_ONLY — V1 과 합치지 않음, 게시 안 함)

## 1. 판정 차원(dimension) 대조

| 차원 | 판정 수 | 설계안에 있음 |
|---|---|---|
| BOUNDARY_EXISTENCE | 2 | 예 |
| COMPOSITION_GROUPING | 2 | 예 |
| COMPOSITION_PEER | 1 | 예 |
| COMPOSITION_TRANSITION | 1 | 예 |
| CONTINUATION | 1 | 예 |
| HIGHER_ORDER_TERMINAL_EFFECT | 1 | 예 |
| PARENTAGE_CONTAINMENT | 1 | 예 |
| RESPONSE_RELATION | 2 | 예 |
| TEXTUAL_PARENTAGE | 8 | 예 |

- 설계안에 없는 차원: 없음 · 설계안에 있으나 실제 판정에 없는 차원: 없음
- 차원의 뜻은 MILAL 쪽 정의(`src/milal_hsa3_*_adjudication.py`, `docs/HSA3_*_SPEC.md`)를 따르며, 시제품은 이름을 바꾸거나 합치지 않는다.

### 37:24 → 38:1 (H:HSA024 → H:HSA025)

- `HSA3-D/E#E1#10` **NO_DIRECT_PARENTAGE** · 차원 **TEXTUAL_PARENTAGE** · 극성 NEGATIVE · 기준 ['E-EXPLICIT-CLOSURE', 'E-EXPLICIT-ONSET', 'N-ADJACENCY-ONLY', 'N-SPEAKER-ONLY']
- `HSA3-D/E#E2#11` **NO_DIRECT_RESPONSE_ANTECEDENT** · 차원 **RESPONSE_RELATION** · 극성 NEGATIVE · 기준 ['E-NEGATIVE-CONTROL', 'N-ADJACENCY-ONLY', 'N-SPEAKER-ONLY', 'N-SEMANTIC-SIMILARITY-ONLY']
- 두 판정은 서로 다른 차원의 별개 기록으로 보존된다. 부정 판정은 그 차원의 직접 관계만 부정한다(수사적 관계 전체를 부정하지 않음 — DE 사유문 원문: "NO DIRECT HIERARCHICAL EDGE does not mean NO RHETORICAL/DISCOURSE RELATION").

## 2. 노드 → BHSA 범위 등록 (저장소에 명시된 것만; 추론 없음)

| 노드 | 범위 | 상태 | 출처 |
|---|---|---|---|
| CYCLE_1 | — | UNRESOLVED | — |
| CYCLE_3 | — | UNRESOLVED | — |
| DIALOGUE_CYCLE_SEQUENCE | 4:1–26:14 | REGISTERED | hsa3_abc_human_decisions.json:groups.member_spans |
| ELIHU_SPEECH_SEQUENCE | 32:6–37:24 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans |
| FINAL_NARRATIVE_COMPLEX | 42:7–42:17 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans, hsa3_fg_human_decisions.json:groups |
| H:HSA002 | 1:6–1:22 | REGISTERED | hsa3_abc_human_decisions.json:groups.member_spans |
| H:HSA012 | 2:11–2:13 | REGISTERED | hsa3_abc_human_decisions.json:annotations, hsa3_abc_human_decisions.json:groups.member_spans |
| H:HSA013 | 3:1–3:26 | REGISTERED | docs/HSA3_ABC_SPEC.md, hsa3_abc_human_decisions.json:annotations, hsa3_abc_human_decisions.json:groups.member_spans |
| H:HSA018 | 32:1–32:1 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans, docs/HSA3_DE_SPEC.md |
| H:HSA019 | 32:2–32:5 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans, docs/HSA3_DE_SPEC.md |
| H:HSA024 | 37:24–37:24 | REGISTERED | docs/HSA3_DE_SPEC.md |
| H:HSA025 | 38:1–38:1 | REGISTERED | docs/HSA3_DE_SPEC.md |
| H:HSA027 | 40:3–40:5 | REGISTERED | hsa3_fg_human_decisions.json:annotations |
| H:HSA029 | 42:1–42:6 | REGISTERED | hsa3_fg_human_decisions.json:annotations |
| H:HSA030 | — | UNRESOLVED | — |
| HUMAN_SCOPE_1_1_5 | 1:1–1:5 | REGISTERED | hsa3_abc_human_decisions.json:groups.member_spans |
| HUMAN_SCOPE_2_1_10 | 2:1–2:10 | REGISTERED | hsa3_abc_human_decisions.json:groups.member_spans |
| JOB_FRIENDS_DISPUTE_COMPLEX | 3:1–31:40 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans, hsa3_abc_human_decisions.json:groups |
| OPENING_NARRATIVE_COMPLEX | 1:1–2:13 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans, hsa3_abc_human_decisions.json:groups |
| POST_DIALOGUE_JOB | 27:1–31:40 | REGISTERED | hsa3_abc_human_decisions.json:groups.member_spans |
| YHWH_JOB_RESPONSE_COMPLEX_1 | 38:1–40:5 | REGISTERED | hsa3_fg_human_decisions.json:groups |
| YHWH_JOB_RESPONSE_COMPLEX_2 | 40:6–42:6 | REGISTERED | hsa3_fg_human_decisions.json:groups |
| YHWH_JOB_RESPONSE_SEQUENCE | 38:1–42:6 | REGISTERED | config/hsa3_layer_0_1_job.json:matrix_display_spans, hsa3_fg_human_decisions.json:groups |

## 3. 범위 ↔ V1 묶음 대조 (문학적 관계 생성 아님)

- 요약: {'PARTIAL': 15, 'EXACT_SPAN': 5, 'UNRESOLVED': 3}

| 노드 | 범위 | 절 수 | 대응 | V1 묶음(정확) | V1 묶음(일부 겹침) |
|---|---|---|---|---|---|
| OPENING_NARRATIVE_COMPLEX | 1:1–2:13 | 173 | **PARTIAL** | — | 136개 |
| JOB_FRIENDS_DISPUTE_COMPLEX | 3:1–31:40 | 1937 | **PARTIAL** | — | 112개 |
| H:HSA018 | 32:1–32:1 | 3 | **PARTIAL** | — | 1개 |
| H:HSA019 | 32:2–32:5 | 11 | **PARTIAL** | — | 1개 |
| ELIHU_SPEECH_SEQUENCE | 32:6–37:24 | 440 | **EXACT_SPAN** | ENCLOSING_SPEECH_HYPOTHESIS P2-OBJECT-180c | 19개 |
| YHWH_JOB_RESPONSE_SEQUENCE | 38:1–42:6 | 333 | **PARTIAL** | — | 16개 |
| FINAL_NARRATIVE_COMPLEX | 42:7–42:17 | 41 | **PARTIAL** | — | 33개 |
| HUMAN_SCOPE_1_1_5 | 1:1–1:5 | 24 | **PARTIAL** | — | 26개 |
| H:HSA002 | 1:6–1:22 | 85 | **PARTIAL** | — | 76개 |
| HUMAN_SCOPE_2_1_10 | 2:1–2:10 | 45 | **PARTIAL** | — | 33개 |
| H:HSA012 | 2:11–2:13 | 19 | **PARTIAL** | — | 2개 |
| H:HSA013 | 3:1–3:26 | 76 | **PARTIAL** | — | 8개 |
| DIALOGUE_CYCLE_SEQUENCE | 4:1–26:14 | 1488 | **PARTIAL** | — | 86개 |
| POST_DIALOGUE_JOB | 27:1–31:40 | 373 | **EXACT_SPAN** | ENCLOSING_SPEECH_HYPOTHESIS P2-OBJECT-5535 | 18개 |
| YHWH_JOB_RESPONSE_COMPLEX_1 | 38:1–40:5 | 192 | **PARTIAL** | — | 10개 |
| YHWH_JOB_RESPONSE_COMPLEX_2 | 40:6–42:6 | 141 | **PARTIAL** | — | 6개 |
| H:HSA027 | 40:3–40:5 | 9 | **EXACT_SPAN** | LOCAL_SPEECH_UNIT P2-OBJECT-ddeb | 2개 |
| H:HSA029 | 42:1–42:6 | 17 | **EXACT_SPAN** | LOCAL_SPEECH_UNIT P2-OBJECT-6b45 | 2개 |
| H:HSA024 | 37:24–37:24 | 2 | **PARTIAL** | — | 5개 |
| H:HSA025 | 38:1–38:1 | 2 | **EXACT_SPAN** | REPORT_INTRODUCTION P2-OBJECT-d256 | 2개 |
| CYCLE_3 | — | — | **UNRESOLVED** | — | 0개 |
| H:HSA030 | — | — | **UNRESOLVED** | — | 0개 |
| CYCLE_1 | — | — | **UNRESOLVED** | — | 0개 |

## 4. 결론
- 설계안 차원 목록은 실제 판정과 일치.
- 노드 등록표: 등록 20 · 미해결 3 · 충돌 0. 미해결 노드(예: CYCLE_1, CYCLE_3, H:HSA030)는 저장소 문서에 범위가 명시돼 있지 않아 **연구자 등록표가 필요**하다 — 추측해 채우지 않았다.
- 다음 단계(연구자 답 뒤): 미해결 노드 범위 공급 → 변환기 정식화 → 지도 층 전환 구현.
