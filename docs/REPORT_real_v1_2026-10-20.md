# 실제 MILAL V1 관계망 검증 — 2026-10-20

- V1 폴더: `/tmp/claude-0/-home-claude/1d3f2531-8771-575f-ba04-5988af430670/scratchpad/v1run/real`
- MILAL 커밋: `d7c2eb3`
- 작업 폴더: `build/real_v1_2026-10-20c` (검사를 모두 통과하고 --deploy 를 준 때만 배포 자리로 복사)

## 1. V1 자체 검증 결과
- `V1_VALIDATION.md` 있음, PASS 46회, FAIL/ERROR 0회
- BHSA cross-check 줄: BHSA cross-check: PASS {"location": "/tmp/claude-0/-home-claude/1d3f2531-8771-575f-ba04-5988af430670/scratchpad/bhsa2021", "checked": 2938, "text_mismatch": 0, "word_mismatch": 0, "not_clause": 0}

## 2. SHA-256 과 생성 코드 버전
- V1_RELATION_NETWORK.json sha256 `c6df1724291cfb7c81d937af142961f3876d1e8019e746378706cd3539b37a20`
- manifest V1_RELATION_NETWORK.json: 일치
- manifest V1_DISPLAY_TREE.json: 일치
- manifest V1_HIERARCHY_VIEW.html: 일치
- manifest V1_REVIEW_SHEET.csv: 일치
- manifest V1_CONTROLS.json: 일치
- manifest V1_VALIDATION.md: 일치
- manifest 90_run_metadata.json: 일치
- P2_REVIEW.zip sha256 `0a96d235c6bc0bc326ad05786aa199ea2c711d826eaa23e9d96a0e4474502304`

## 3–5. V1→IF-1 변환, 구조 보존·round-trip, P2 근거 보존
- 변환기 종료 코드 0
- 판정: **ROUNDTRIP_EXACT**
- P2 근거 보존: 규칙 기록 있는 관계 419개 · 근거 없는 관계 0개
- input: {"file": "/tmp/claude-0/-home-claude/1d3f2531-8771-575f-ba04-5988af430670/scratchpad/v1run/real/V1_RELATION_NETWORK.json", "network_sha256": "c6df1724291cfb7c81d937af142961f3876d1e8019e746378706cd3539b37a20", "stage": "MFR.0.3-V1", "review_zip": "/mnt/user-data/uploads/MILAL/results/mfr03_p2_2026100
- counts: {"clauses": [2938, 2938], "groups": [317, 317], "edges_total": 3796, "relations": 446, "native_relations": 3350, "relations+native == edges": true, "alternatives": [4, 4], "unassigned": [119, 119], "human_notes": [1, 1], "no_direct_relation_issues": 1, "evidence": 851}
- ids: {"edge_ids_preserved": true, "missing": [], "extra": []}
- status_distribution_equal: true
- status_v1: {"COMPETING": 77, "PROVISIONAL": 334, "UNASSIGNED": 34, "CONFIRMED": 1}
- status_out: {"COMPETING": 77, "PROVISIONAL": 334, "UNASSIGNED": 34, "CONFIRMED": 1}
- direction_preserved: true
- evidence_refs_valid: true
- evidence_coverage: {"relations_with_trace_source": 419, "relations_without_evidence": 0, "note": ""}
- created_only: ["family", "evidence[] (trace 를 펼친 것)", "issues.NO_DIRECT_RELATION (human_notes 의 직접 모절 기각에서)", "issues.UNRESOLVED (groups.rule_notes 의 미결에서)", "native_relations[].id (원본 edge_id 는 origin_edge_id 에)"]
- dropped: ["legend", "counts", "base_group_ids(그룹 kind 로 복원 가능)", "V1_DISPLAY_TREE.json(화면 배치)"]
- structural_preservation: "STRUCTURAL_PRESERVATION_PASS"
- evidence_complete: true
- P2 근거 상태: 미결(UNRESOLVED) 34개 · 실패(FAILED, 반례·통과 못 한 검사) 0개 — 연구자 검토 목록에 포함

## 6. BHSA 낱말·절·절 원자 대조 (V1~V16)
- PASS V1 스키마
- PASS V2 BHSA 2021
- PASS V3 끝점 존재
- PASS V4 관계 중복 없음 — id 중복 0, 내용 중복 0
- PASS V5 낱말 대조(번호 전체) — 0절 불일치: 
- PASS V6 확정 관계 순환 없음
- PASS V7 확정 관계 중복 모절 없음 — 0개: 
- PASS V8 전체 관계(경고) — 순환 없음, 모절 둘 이상 0곳 (경쟁·미배정은 정상)
- PASS V9 근거 존재
- PASS V10 파일 상태 — MILAL_OUTPUT — 실제 MILAL 출력
- PASS V12 직접연결없음에 근거
- PASS V13a 원 관계 끝점 존재(ID 검사) — 3350개 (절 원자 번호 복원된 것 2895)
- PASS V13b 원 관계 실제 원본 대조(BHSA mother/rela) — {'atom_match': 2895, 'clause_match': 454, 'other_level(phrase)': 1}
- PASS V15 원 관계 원본 edge id 중복 없음
- PASS V16 연구자 검토 상태 — UNREVIEWED — 화면에 '승인 전' 표시
- PASS V14 실제 출력 출처 — commit·network_sha256·generated_at 필요

### 6b. BHSA 원본 mother/rela 대조 (native_relations ↔ bhsa_native_job.json)
- if1_native_relations: 3350
- bhsa_clause_atoms: 2977
- bhsa_clauses: 2938
- atom_exact: 2895
- clause_exact: 359
- clause_mother_phrase_or_word: 95
- phrase_level: 1
- diff: 0
- no_nodes: 0
- bhsa_atom_mothers_not_in_v1: 39

## 7. 화면 표시 (수동)
- `app/milal.js` 의 MILAL_FILES url 을 이 파일로 바꾸고(test → study/milal/job.json) 욥 32–37 계층·발화·지도를 연다. `node pipeline/ui_tests/personas_e.js` 의 대학원 시나리오로 머리띠·상세·지도를 자동 캡처할 수 있다.

## 8. 관계 상태·방향·근거 대조
- 관계 446개 — 상태 {'COMPETING': 77, 'PROVISIONAL': 334, 'UNASSIGNED': 34, 'CONFIRMED': 1} · 종류 {'MEMBERSHIP': 274, 'CLOSURE': 78, 'FRAME_CONTENT': 40, 'PARALLEL': 51, 'SUBORDINATE': 3} · 원 BHSA 관계(native) 3350개
- 근거 851개 — 결과 {'PASSED': 816, 'UNRESOLVED': 34, 'HUMAN': 1}
- 방향 규약: source=모절(mother), target=자절(daughter) — V1 기록 'A → B' 와 같음(H0.2 기록 500062 → 500065 로 확인)

## 9–10. 연구자 판단이 필요한 항목과 기준점 확인
- 경쟁 관계 77개 · 미결 2개 · 대안 묶음 4개 · 미배정 절 119개 · 직접 관계 없음(판정) 1개 · 사람 메모 1건
- 연구자 판정 근거(HUMAN) 1개
- 직접 관계 없음(판정) 1개 모두 frozen_human 의 사람 판정에서 옴 ✓ (기계 추론·통제 자료로 만든 것 없음)

### 긍정 기준점 — 욥 37:20 연구자가 채택한 모절·자절 (500064 → 500065)
- 절 500064: 37:20 `אִֽם־אָ֥מַר אִ֝֗ישׁ ` 낱말 3개
- 절 500065: 37:20 `כִּ֣י יְבֻלָּֽע׃ ` 낱말 2개
- 관계 `V1-EDGE-84ad95db339e93231ec2` SUBORDINATE **CONFIRMED** 규칙 HUMAN MFR-H02-JOB-37-20 기록 {'id': 'MFR-H02-JOB-37-20#HA-7bdd373de96c006d336330af5ee703f5959e92bc7779478826d934263e98027f', 'table': 'frozen_human'} 근거 1개 (HUMAN 1)

### 부정 기준점 — 욥 37:20 직접 모절 후보를 명시적으로 기각한 기록 (500062 ↛ 500065)
- 절 500062: 37:20 `הַֽיְסֻפַּר־לֹ֖ו ` 낱말 3개
- 절 500065: 37:20 `כִּ֣י יְבֻלָּֽע׃ ` 낱말 2개
- 이 쌍에 CONFIRMED 계층 관계 없음 ✓
- V1 human_notes 의 명시적 기각 기록: 1건 [{"decision": "REJECTED_AS_DIRECT_MOTHER", "effect": "NO_DIRECT_STRICT_MOTHER_RELATION", "rationale_code": "DISTINCT_LOCAL_COLON_CONSTRUCTION"}]
- IF-1 NO_DIRECT_RELATION `ISS-NDR-MFR-H02-JOB-37-20-HA-40ce77033c7906b6bfb4ced56e3f18bc3cfa0a0b5003c647439c829b1aa67fc9` 근거 {'kind': 'HUMAN_DECISION', 'decision': 'REJECTED_AS_DIRECT_MOTHER', 'judgment_id': 'MFR-H02-JOB-37-20', 'rationale_code': 'DISTINCT_LOCAL_COLON_CONSTRUCTION'} 기록 {'id': 'MFR-H02-JOB-37-20#HA-40ce77033c7906b6bfb4ced56e3f18bc3cfa0a0b5003c647439c829b1aa67fc9', 'table': 'frozen_human'} ✓

### 기록 유무 — 욥 37:24 → 38:1 (V1 범위 밖일 수 있는 판정)
- 37:24 절 ['500076', '500077'] · 38:1 절 ['500078', '500079']
- **NOT_RECORDED**: V1 human_notes·IF-1 issues 에 이 쌍의 명시적 판정이 없음. (HSA3 D/E 이음매 판정의 NO_DIRECT_PARENTAGE 는 V1 입력(frozen_human 2건)에 들어 있지 않음 — 정상. 가상 판정을 만들지 않음)

## 결론
- 종료 코드 0: 모두 통과 — 명세 확정·첫 승인 기록으로 갈 수 있음
- 다음: 연구자가 ⚠·❌ 항목을 보고, 괜찮으면 `pipeline/milal_approve.py` 로 승인 범위를 기록한다(자동 승인 없음).
- 배포: `build/real_v1_2026-10-20c/job.json` → `study/milal/job.json` (sha256 5aaee3616e8a0807e629a1e6d798f5af0f38ebfd2dec6371cc1c5131c88740b4)
