# HSA3 읽기 전용 시제품 검증 — 2026-10-20

- 시제품 `test/hsa3_prototype_job.json` (MILALWV-HSA-1, PROTOTYPE_READ_ONLY) · IF-1 `study/milal/job.json` · 등록 노드 20 · 미해결 3 · 판정 19 · 차원 9
- 공개 앱에는 게시하지 않았다(MILAL_FILES 에 없음). 판정 생성·MILAL 수정 없음.

- PASS 7 file_status 가 PROTOTYPE_READ_ONLY
- PASS 7 공개 앱의 MILAL_FILES 에 HSA 파일 없음(게시 안 함)
- PASS 1 등록 노드 20개의 범위 → IF-1 절 → BHSA 낱말 번호가 본문과 맞음
- PASS 2 판정 19건 모두 차원·극성이 있고, 부정 판정은 NO_/NOT_ 유형과 일치 — Counter({('TEXTUAL_PARENTAGE', 'NEGATIVE'): 8, ('RESPONSE_RELATION', 'NEGATIVE'): 2, ('BOUNDARY_EXISTENCE', 'NEGATIVE'): 2, ('PARENTAGE_CONTAINMENT', 'NEGATIVE'): 1, ('COMPOSITION_GROUPING', 'NEGATIVE'): 1, ('COMPOSITION_GROUPING', 'POSITIVE'): 1, ('HIGHER_ORDER_TERMINAL_EFFECT', 'POSITIVE'): 1, ('COMPOSITION_PEER', 'POSITIVE'): 1, ('COMPOSITION_TRANSITION', 'POSITIVE'): 1, ('CONTINUATION', 'NEGATIVE'): 1})
- PASS 3 37:24→38:1(H:HSA024→H:HSA025)에 E1 TEXTUAL_PARENTAGE 와 E2 RESPONSE_RELATION 이 별개 판정으로 있음 — {'TEXTUAL_PARENTAGE': 'NO_DIRECT_PARENTAGE', 'RESPONSE_RELATION': 'NO_DIRECT_RESPONSE_ANTECEDENT'}
- PASS 3 두 판정의 범위 설명: 그 차원의 직접 관계만 부정(수사적 관계 전체 부정 아님) — scope_note 는 변환기 주석 참조
- PASS 4 V1 묶음 대응이 EXACT_SPAN / PARTIAL / UNRESOLVED 로 구별됨 — {'PARTIAL': 15, 'EXACT_SPAN': 5, 'UNRESOLVED': 3}
- PASS 4 대응표에 관계 칸(relation/kind/status)이 없음 — 범위 비교일 뿐 문학적 관계를 만들지 않음
- PASS 4 정확 대응 예: ELIHU_SPEECH_SEQUENCE 32:6–37:24 ↔ V1 큰 발언 가설, H:HSA025 38:1 ↔ REPORT_INTRODUCTION
- PASS 5 같은 (source,target) 쌍에 여러 차원 판정이 있으면 각각 따로 남아 있음(하나로 합치지 않음) — {'H:HSA024→H:HSA025': ['RESPONSE_RELATION', 'TEXTUAL_PARENTAGE']}
- PASS 6 미해결 노드 3개(H:HSA030, CYCLE_1, CYCLE_3)는 범위 null·절 없음·UNRESOLVED — 추측해 채우지 않음
- PASS 6 미해결 노드가 낀 판정 6건도 판정 자체는 보존(노드 위치만 미해결)

## 등록 노드의 원문 위치 (범위 → 첫 절 id · 첫 낱말 번호)

| 노드 | 범위 | 절 수 | 첫 절 | 첫 낱말(BHSA) | V1 대응 |
|---|---|---|---|---|---|
| DIALOGUE_CYCLE_SEQUENCE | 4:1–26:14 | 1488 | 497763 `וַ֭יַּעַן אֱלִיפַ֥ז ` | 337098 | PARTIAL |
| ELIHU_SPEECH_SEQUENCE | 32:6–37:24 | 440 | 499638 `וַיַּ֤עַן׀ אֱלִיה֖וּ` | 343885 | EXACT_SPAN · ENCLOSING_SPEECH_HYPOTHESIS |
| FINAL_NARRATIVE_COMPLEX | 42:7–42:17 | 41 | 500411 `וַיְהִ֗י` | 346678 | PARTIAL |
| H:HSA002 | 1:6–1:22 | 85 | 497538 `וַיְהִ֣י הַיֹּ֔ום` | 336151 | PARTIAL |
| H:HSA012 | 2:11–2:13 | 19 | 497668 `וַֽיִּשְׁמְע֞וּ שְׁל` | 336747 | PARTIAL |
| H:HSA013 | 3:1–3:26 | 76 | 497687 `אַחֲרֵי־כֵ֗ן פָּתַ֤ח` | 336836 | PARTIAL |
| H:HSA018 | 32:1–32:1 | 3 | 499624 `וַֽיִּשְׁבְּת֡וּ שְׁ` | 343807 | PARTIAL |
| H:HSA019 | 32:2–32:5 | 11 | 499627 `וַיִּ֤חַר אַ֨ף׀ אֱלִ` | 343823 | PARTIAL |
| H:HSA024 | 37:24–37:24 | 2 | 500076 `לָ֭כֵן יְרֵא֣וּהוּ א` | 345433 | PARTIAL |
| H:HSA025 | 38:1–38:1 | 2 | 500078 `וַיַּֽעַן־יְהוָ֣ה אֶ` | 345441 | EXACT_SPAN · REPORT_INTRODUCTION |
| H:HSA027 | 40:3–40:5 | 9 | 500261 `וַיַּ֖עַן אִיֹּ֥וב א` | 346142 | EXACT_SPAN · LOCAL_SPEECH_UNIT |
| H:HSA029 | 42:1–42:6 | 17 | 500394 `וַיַּ֖עַן אִיֹּ֥וב א` | 346621 | EXACT_SPAN · LOCAL_SPEECH_UNIT |
| HUMAN_SCOPE_1_1_5 | 1:1–1:5 | 24 | 497514 `אִ֛ישׁ הָיָ֥ה בְאֶֽר` | 336025 | PARTIAL |
| HUMAN_SCOPE_2_1_10 | 2:1–2:10 | 45 | 497623 `וַיְהִ֣י הַיֹּ֔ום` | 336529 | PARTIAL |
| JOB_FRIENDS_DISPUTE_COMPLEX | 3:1–31:40 | 1937 | 497687 `אַחֲרֵי־כֵ֗ן פָּתַ֤ח` | 336836 | PARTIAL |
| OPENING_NARRATIVE_COMPLEX | 1:1–2:13 | 173 | 497514 `אִ֛ישׁ הָיָ֥ה בְאֶֽר` | 336025 | PARTIAL |
| POST_DIALOGUE_JOB | 27:1–31:40 | 373 | 499251 `וַיֹּ֣סֶף אִ֭יֹּוב` | 342375 | EXACT_SPAN · ENCLOSING_SPEECH_HYPOTHESIS |
| YHWH_JOB_RESPONSE_COMPLEX_1 | 38:1–40:5 | 192 | 500078 `וַיַּֽעַן־יְהוָ֣ה אֶ` | 345441 | PARTIAL |
| YHWH_JOB_RESPONSE_COMPLEX_2 | 40:6–42:6 | 141 | 500270 `וַיַּֽעַן־יְהוָ֣ה אֶ` | 346167 | PARTIAL |
| YHWH_JOB_RESPONSE_SEQUENCE | 38:1–42:6 | 333 | 500078 `וַיַּֽעַן־יְהוָ֣ה אֶ` | 345441 | PARTIAL |

## 37:24 → 38:1

- `HSA3-D/E#E1#10` **NO_DIRECT_PARENTAGE** · 차원 **TEXTUAL_PARENTAGE** · NEGATIVE · 기준 ['E-EXPLICIT-CLOSURE', 'E-EXPLICIT-ONSET', 'N-ADJACENCY-ONLY', 'N-SPEAKER-ONLY']
- `HSA3-D/E#E2#11` **NO_DIRECT_RESPONSE_ANTECEDENT** · 차원 **RESPONSE_RELATION** · NEGATIVE · 기준 ['E-NEGATIVE-CONTROL', 'N-ADJACENCY-ONLY', 'N-SPEAKER-ONLY', 'N-SEMANTIC-SIMILARITY-ONLY']

두 판정은 서로 다른 차원의 별개 기록이다. 각 부정 판정은 그 차원의 직접 관계만 부정하며, 수사적 관계(ANA-Q4 대조 틀 등)의 부재를 뜻하지 않는다(MILAL DE 사유문 원문).
