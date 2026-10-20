# HSA3(이음매·구성 판정) 별도 시각화 설계안 — 2026-10-20 (설계만; 구현·판정 생성·MILAL 수정 없음)

## 0. 왜 따로인가 (실제 자료로 확인한 것)

MILAL 저장소 `config/hsa3_*_human_decisions.json`(연구자 공급, FROZEN)과 `docs/HSA3_*_SPEC.md`를 읽었다. HSA3 는 V1(절 단위 모절 관계망)과 **단위·범위·차원이 다르다**:

| | V1 관계망 (`MILALWV-IF-1`) | HSA3 판정 |
|---|---|---|
| 단위 | BHSA 절(clause) · P2 묶음 | **HSA 노드**(`H:HSA018`=32:1, `H:HSA019`=32:2–5, `H:HSA024`=37:24, `H:HSA025`=38:1 …), 구성 묶음(`ELIHU_SPEECH_SEQUENCE` 32:6–37:24, `YHWH_JOB_RESPONSE_COMPLEX_1` 38:1–40:5, `DIALOGUE_CYCLE_SEQUENCE` 4:1–26:14 …, `node_type: NON_TEXTUAL_COMPOSITION_GROUP`), 장:절 참조(`42:6`, `42:10`) |
| 관계 | 종속·틀–내용·병행·닫음·소속(절 모절 관계) | **차원(dimension)별** 긍정·부정 판정: `TEXTUAL_PARENTAGE`, `RESPONSE_RELATION`, `COMPOSITION_GROUPING`, `COMPOSITION_PEER`, `COMPOSITION_TRANSITION`, `HIGHER_ORDER_TERMINAL_EFFECT`, `CONTINUATION`, `BOUNDARY_EXISTENCE`, `PARENTAGE_CONTAINMENT` … |
| 부정 판정 | `NO_DIRECT_RELATION`(frozen_human, 절 쌍) 1건 | `NO_DIRECT_PARENTAGE`, `NO_DIRECT_RESPONSE_ANTECEDENT`, `NO_DIRECT_RELATION(excluded CONTINUES_WITHIN)`, `NO_BOUNDARY_PROMOTION(excluded_claims[])`, `NOT_MEMBER_OF_…`, `NOT_WITHIN_…` — **차원별이고, 다른 차원의 관계를 부정하지 않음**("NO DIRECT HIERARCHICAL EDGE ≠ NO RHETORICAL/DISCOURSE RELATION": ANA-Q4 32:1↔38:1 대조 틀, Q5 32:2–37:24 응답 역할은 그대로) |
| 근거 | P2 규칙 검사(통과/미결) | **기준 코드**(`E-EXPLICIT-ONSET`, `E-FORMULA-CORRESPONDENCE`, `N-ADJACENCY-ONLY`, `N-SPEAKER-ONLY` …: E=근거가 되는 것, N=근거가 되지 못하는 것) + 연구자 사유문(한국어 원문) |
| 출처 | P2_REVIEW.zip → V1 | `source_path`(RESEARCHER_SOURCE.txt) + `source_sha256`, `authority: RESEARCHER_SUPPLIED`, `status: FROZEN`, seam id(SEAM_A…G), request id(D1-N1, E1, E2 …) |

37:24→38:1 은 `hsa3_de_human_decisions.json` requests **E1**(`H:HSA024 → H:HSA025 NO_DIRECT_PARENTAGE`, 차원 TEXTUAL_PARENTAGE)·**E2**(`NO_DIRECT_RESPONSE_ANTECEDENT`, 차원 RESPONSE_RELATION)에 있다. V1 에 억지로 넣지 않는다(단위가 다르고, 절 쌍이 아니라 노드 쌍이며, 차원 정보가 사라진다).

## 1. 데이터 교환 규격 제안 — `MILALWV-HSA-1` (별도 파일, 별도 출처)

```jsonc
{ "schema": "MILALWV-HSA-1", "file_status": "MILAL_OUTPUT|TEST_ONLY", "bhsa_version": "2021",
  "source": { "milal": { "stage": "HSA3", "commit": "…", "layers": ["HSA3-ABC","HSA3-DE","HSA3-FG","HSA3-ANA-0.3"] },
              "files": [ { "path": "config/hsa3_de_human_decisions.json", "sha256": "…", "researcher_source": "docs/HSA3_DE_RESEARCHER_SOURCE.txt", "researcher_source_sha256": "…", "authority": "RESEARCHER_SUPPLIED" } ],
              "generated_at": "…" },
  "nodes": [ { "id": "H:HSA024", "label": "엘리후 발언 끝(37:24)", "kind": "HSA_NODE", "span": {"from": "37:24", "to": "37:24"},
               "anchor": { "word_ids": [...], "clause_ids": [...], "clause_atom_ids": [...] },      // BHSA 번호로 못 박음(열쇠는 IF-1 과 같다) — 없으면 null, 지어내지 않음
               "resolution": "FROM_HSA_REGISTRY|SPAN_ONLY" },
             { "id": "ELIHU_SPEECH_SEQUENCE", "kind": "NON_TEXTUAL_COMPOSITION_GROUP", "span": {"from":"32:6","to":"37:24"}, "members": ["H:HSA020","H:HSA021","H:HSA022","H:HSA023"], "seam_id": "SEAM_D" } ],
  "judgments": [ { "id": "HSA3-DE#E1", "seam_id": "SEAM_E", "polarity": "NEGATIVE", "relation_type": "NO_DIRECT_PARENTAGE", "dimension": "TEXTUAL_PARENTAGE",
                   "source": "H:HSA024", "target": "H:HSA025", "direction": "SOURCE_TO_TARGET", "status": "FROZEN", "authority": "RESEARCHER_SUPPLIED",
                   "criteria": ["E-EXPLICIT-CLOSURE","E-EXPLICIT-ONSET","N-ADJACENCY-ONLY","N-SPEAKER-ONLY"], "rationale_ref": {"file":"config/hsa3_de_human_decisions.json","path":"decisions[SEAM_E].rationale","lang":"ko"},
                   "scope_note": "이 차원(직접 본문 모절)만 부정. 다른 차원(RESPONSE_RELATION 은 E2 에서 따로, 수사적 대조 틀 ANA-Q4 는 유지)" },
                 { "id": "HSA3-FG#F-peer", "polarity": "POSITIVE", "relation_type": "SAME_LEVEL_COMPOSITION_PEERS", "dimension": "COMPOSITION_PEER", "source": "YHWH_JOB_RESPONSE_COMPLEX_1", "target": "YHWH_JOB_RESPONSE_COMPLEX_2", "symmetric": true, "criteria": [...] } ],
  "overlays": [ { "id": "ANA-Q4", "kind": "CONTRASTIVE_ANA_FRAME", "between": ["H:HSA018","H:HSA025"], "status": "ACCEPTED", "note": "수사적 대조 틀 — 계층 관계 아님" } ],
  "criteria_glossary": { "E-EXPLICIT-ONSET": "명시적 시작 표지", "N-ADJACENCY-ONLY": "인접만으로는 근거 안 됨", "…": "…" },   // MILAL 문서의 정의를 그대로 옮긴 것
  "unresolved": [ { "id": "ANA-Q3", "status": "UNRESOLVED/HUMAN_DEFERRED", "note": "원인·성취 주장 미승인" } ],
  "crosswalk": { "to_if1": [ { "hsa_node": "H:HSA024", "if1_clause_ids": ["500076","500077"], "if1_group_ids": ["…"], "match": "EXACT_SPAN|PARTIAL|NONE" } ] }   // V1 묶음과의 대응표(기계적 범위 비교, 판정 아님)
}
```
원칙: (1) HSA 파일은 IF-1 과 **다른 파일·다른 해시·다른 승인 기록**. (2) 판정마다 `dimension` 이 필수이고, 부정 판정은 `excluded_relation`/`excluded_claims` 까지 보존. (3) 변환기는 `config/hsa3_*.json` 과 `docs/*_SPEC.md` 의 노드 표만 읽어 만들고, 노드의 BHSA 번호는 등록된 범위에서만 채우며 없으면 null. (4) 사유문은 원문(한국어) 그대로 참조한다.

## 2. 시각화 제안 (구조 탭 '지도'의 **층(layer) 선택**)

- 지도 머리에 **층 전환**: `MILAL V1(절 모절 관계)` / `HSA3(이음매·구성 판정)` / `겹쳐 보기`. 기본은 V1(지금 화면). 층마다 출처 배지(파일·해시·승인 상태)가 따로 붙는다.
- **HSA3 층의 지도**: HSA 노드·구성 묶음을 본문 순서로 상자 배치(둘러싸는 묶음은 바깥 테두리). 상자 사이 연결은 **차원별로 다른 선**: 구성 묶음 소속=얇은 테두리 안에 들어감, 구성 동급(peer)=양쪽 화살표, 전환(transition)=⇢, 종결 효과=⟂. **부정 판정은 선이 아니라 "금지 표"**: 37:24 상자와 38:1 상자 사이에 `⊘ 직접 본문 모절 아님(연구자) · ⊘ 직접 응답 선행 아님(연구자)` 두 줄 — 차원별로 한 줄씩, 각 줄 누르면 기준 코드·사유문.
- **상세 창(HSA 노드)**: 쉬운 말 요약 먼저("37:24 는 엘리후 발언의 끝이고, 38:1 은 하나님 발언의 시작입니다. 연구자는 둘 사이에 직접 본문 모절 관계와 직접 응답 선행 관계를 두지 않았습니다. 이는 '아무 관계도 없다'는 뜻이 아닙니다 — 수사적 대조 틀(ANA-Q4)은 유지됩니다.") → 판정 목록(차원·극성·기준 코드) → 사유문(접힘) → 출처(파일·해시·seam·request id, 접힘).
- **겹쳐 보기**: V1 묶음 상자 위에 HSA 구성 묶음 테두리를 겹치고, `crosswalk.match` 가 EXACT_SPAN 이면 같은 색, PARTIAL 이면 빗금, NONE 이면 HSA 전용 색 — **상충을 숨기지 않고 보이게**: 예) V1 큰 발언 가설 32:6/34:1/35:1–37:24(경쟁 3개)와 HSA3 `ELIHU_SPEECH_SEQUENCE` 32:6–37:24(연구자 확정)를 나란히. 어느 쪽도 자동으로 고르지 않고, 메모의 MILAL 참조에 두 층의 id 를 함께 남길 수 있게 한다.
- **규칙·판정 버전 연결**: 각 판정에 `seam_id`·`request_id`·파일 sha·연구자 원문 sha 를 붙이고, 앱의 승인 기록(`approvals.json`)은 HSA 파일 해시로 따로 대응(HSA 층에 승인 배지).
- **상충 비교 창**: 같은 범위에 대한 V1 관계와 HSA3 판정을 표 두 줄로(단위·차원·상태·근거·출처). 비교는 보여 주기만 하고 결론을 내지 않는다.

## 3. 범위 밖·하지 않는 것
- HSA3 판정을 V1 관계망에 넣거나, V1 절 쌍으로 바꾸거나, 차원을 없애는 변환은 하지 않는다.
- 새 HSA 판정을 만들지 않는다. `ANA-Q3` 같은 미결은 미결로 보인다.
- 구현 전에 연구자가 (a) 이 규격의 차원 목록이 MILAL 의 정의와 맞는지, (b) 노드→BHSA 범위 등록표의 출처(`docs/HSA3_*_SPEC.md` 노드 표)를 써도 되는지 답해야 한다. 그 뒤 변환기 `pipeline/milal_export_hsa3.py` 와 지도 층 전환을 구현한다(예상: 변환기·검증기 1일, 지도 층·상세 창 1~2일, 사용성 시험 반나절).
