# MILALWV 보고 — 3단계 정식 시각화·4단계 연구 기록 착수 (2026-10-20)

기준 커밋: aqedah/MILALWV main `e799f0a` (지시 기준 `db74da9` 이후 5개). 배포: https://aqedah.github.io/MILALWV/
**MILALWV-IF-1은 여전히 초안**입니다. 실제 V1 파일과 대조하기 전까지 확정하지 않습니다.

## 1. V1 → MILALWV 변환기와 테스트 결과 (작업 A)

- `pipeline/milal_export_v1.py` — 읽기 전용. MILAL 코드를 import 하지 않고 파일만 읽습니다. 입력: `V1_RELATION_NETWORK.json` + `90_run_metadata.json` + `99_manifest_sha256.csv`(해시 대조), 선택 `--review-zip P2_REVIEW.zip`(근거 펼치기; V1이 읽은 zip과 sha256 일치 확인).
- **fixture는 지어내지 않았습니다.** MILAL 저장소의 자체 시험(`python src/milal_v1_runner.py --self-test`, 게이트 20개 + 실패해야 하는 변이 20개 모두 통과)이 낸 **V1 형식 그대로의 합성 관계망**(절 19 · 묶음 18 · 관계 39)과 `synthetic_P2_REVIEW.zip`을 `test/v1_fixture/`에 두었습니다. MILAL 저장소는 바뀌지 않았습니다(`git status` 깨끗).
- 변환 결과 `test/v1_fixture_export.json`(TEST_ONLY): **LOSSLESS** — 절 19=19, 묶음 18=18, 관계 24 + 원 관계 15 = edge 39, **edge id 집합 동일**(빠짐 0 · 생김 0), 상태 분포 동일(CONFIRMED 1 / PROVISIONAL 16 / COMPETING 4 / UNASSIGNED 3), 방향 보존, 근거 참조 유효(근거 없는 관계 0), 사람 메모 1=1. 비교표: `test/v1_fixture_compare.json`.
- 원 관계(`native_relations`)에 **`origin_edge_id`로 원본 V1 edge id 보존**. 절 원자 번호는 P2 원 주석에 없어 `null`(실제 파일에 있으면 채움).
- `NO_DIRECT_RELATION`은 사람 결정 기록 중 **직접 모절 기각(REJECTED_AS_DIRECT_MOTHER / NO_DIRECT…)인 그 후보 쌍**에 대해서만, basis(HUMAN_DECISION·judgment_id·rationale_code)와 함께 냅니다. "다른 연결의 유무는 말하지 않음"을 note에 적습니다.
- 실제 형식 덕분에 제 스키마의 틀린 가정 셋을 고쳤습니다: `groups.textual`은 참/거짓, `roles`에 절 번호 외에 관찰 특징 이름(TIME_PHRASE 등), 묶음 `kind`에 REPORT_INTRODUCTION·REPORT_CONTENT 등이 더 있음(→ 자유 문자열).
- **실제 자료와의 호환성 검증은 하지 않았습니다**(파일 없음). 재현 절차·경로·명령: `docs/MILAL_V1_RUN_PROCEDURE.md` — `MILAL\scripts\run_milal_v1_windows.ps1 -Bhsa 'C:\Users\yisaa\text-fabric-data\github\ETCBC\bhsa\tf\2021' -NoOpen` → `results\mfr03_v1_<날짜>\real\` → `python pipeline\milal_export_v1.py … --commit <해시>` → `milal_check.py --words`.

## 2. 손실·생성 비교 보고서 (작업 A)

변환기가 매번 `*.compare.json`을 씁니다. 항목: 절·묶음 수, `relations+native == edges`, edge id 집합(빠짐/생김), 상태 분포, 방향, 근거 참조 유효성, 대안·미배정·사람 메모 수, 근거 없는 관계 수. **허용되는 생성 5가지만** 명시(family 칸, trace를 펼친 evidence, 사람 기각에서 나온 NO_DIRECT_RELATION, rule_notes 미결에서 나온 UNRESOLVED 이슈, native id — 원본 id는 origin_edge_id에). 버리는 것: legend, counts, base_group_ids(복원 가능), 화면 배치 파일.

## 3. 검증 기준 최종 보완 (작업 B)

- 검증기 V1~V16: V13(원 관계 끝점·절 원자) · V15(원 관계 원본 edge id 중복 없음) · V16(연구자 검토 상태) 추가. 변이 14종 보존, 모두 검출.
- **실제 출력(MILAL_OUTPUT)은 낱말 불일치 0건이 완료 기준**: 앱이 1건이라도 있으면 "읽지 않음"으로 멈추고 어느 절인지 보여 줍니다(시험 자료만 10%까지 허용). 앱 자료에 없는 절 id가 있어도 멈춥니다.
- `review.status`(UNREVIEWED/APPROVED)로 **연구자 승인 전에는 "승인 전 — 검증 대기"** 배지. "연구자 승인" 배지는 APPROVED일 때만.

## 4. 계층·발화·지도 개선 (작업 C)

- **계층**: BHSA `tab`(원자료 들여쓰기)과 MILAL 모절 관계를 구분. **확정(CONFIRMED) 관계만으로 깊이를 계산**해 "M깊이 n" 배지(잠정·경쟁은 깊이에 넣지 않음). 상세 창에 "MILAL 깊이 / BHSA tab"을 나란히. 모절·끝점·근거로 이동하면 **"← 욥 32장(계층)으로 돌아가기"** 단추.
- **발화**: BHSA N/Q/D·인용 깊이(원자료) 띠 위에 MILAL 묶음의 `roles.introduction/content`로 **도입/내용** 표시. 발화자 이름 없음.
- **지도**: 본문 순서(점선 연결, "본문 순서 · 직접 관계 미검증") / 확정 관계(실선) / 후보(잠정·경쟁)는 **'후보 관계 보기'를 켜야** 점선으로. 기본 화면은 확정만. 단위 상자에 도입·내용 절 수. '직접 연결 없음(판정)'은 basis 있는 이슈가 두 단위에 각각 걸릴 때만. 단위 → 장 구조 → 절 원자 상세 → 돌아가기 흐름.

## 5. 절·절 원자 메모 (작업 D) — `app/annots.js`

- 본문(절 펼침)과 구조(줄 이름표 → 상세 창)에서 **관찰 / 해석**을 따로 적고 표시(태그)를 붙입니다. IndexedDB `milal-annots`(기기 저장). 자리는 BHSA 번호(`clause_atom_ids`·`clause_ids`·`word_ids`·bhsa 2021). MILAL 관계를 보며 적으면 **참조만**(stage·file_status·network_sha256·relation_ids) 저장 — 판정은 바꾸지 않음.
- 쓰기·고치기·지우기(**묘비 유지**: deleted=true, 동기화에서 되살아나지 않게)·기록 탭 "절·절 원자 메모" 목록(책·장별)·원문 이동(절 원자 → 구조 그 줄, 절 → 읽기 그 절). 줄에 "메모" 표시.
- 낱말 메모(옛 방식)는 **그대로** 두고 옮기지 않았습니다. 시나리오에서 보존 확인.

## 6. 기존 메모 보존·Firestore 규칙 (작업 E)

- `firestore.rules`(제안본): `/users/{uid}/{doc=**}` 와일드카드 **제거**, `users/{uid}/study/notes`(낱말 메모, 칸 고정·500개) / `users/{uid}/annots/{id}`(만들기·고치기·지우기 분리: id 일치, 칸 고정, 2000자, BHSA 2021, 책 1~39, 고칠 때 anchor·created·kind 불변, updated 단조, 처음부터 deleted 금지) / `shared`(사진 칸 거부, 길이 제한, 고치기 금지, 본인만 삭제).
- **에뮬레이터 시험 32건 모두 기대대로**(허용 17 · 거부 15): `pipeline/firestore_rules_test/`(Java + firebase-tools). 낱말 메모 동기화 정상, 나눔 익명 열람·본인 게시·본인 삭제·타인 삭제 거부 확인.
- **운영 규칙은 바꾸지 않았습니다.** 승인되면 `firestore.rules` 전문을 콘솔에 붙여 넣으시면 됩니다. 기존 게시물의 사진 칸: 지금까지 규칙이 게시되지 않아 올라간 글이 없으므로 없을 것입니다. 있다면 콘솔에서 `shared` 문서의 `photo` 필드를 지우는 1회 정리(앱은 `photo`를 읽지 않음).

## 7. 모바일 회귀검사 (작업 F)

시나리오 8단계(+보존 확인) **360 / 390 / 430px 모두 통과**, 가로 밀림 없음, 콘솔 오류 없음: 창 22장 → 낱말·사전 풀이 → 구조·절 원자 상세 → 절·절 원자 메모 쓰기/고치기 → 기록 탭 → 원문 이동 → 다른 장 뒤 메모 열기·지우기 → 욥 지도 장 넘기·돌아가기. 검색식 건수 227·369·2260·1015·3697 유지. 변이 14종 모두 검출. 2.8초는 에뮬레이션 수치이며 실기기 측정은 아직 없습니다. Service Worker는 넣지 않았습니다.

## 8. 실제 V1 데이터가 있어야 확인되는 것

1. 변환기 호환성: 실제 `90_run_metadata.json`의 칸, `V1_CONTROLS.json`의 "직접 관계 없음" 통제 형식(CONTROL 근거 추가 여부), rule trace `origin_ids`의 절 id, P2 `raw_clauses`의 절 원자 번호.
2. 낱말 불일치 0건 검증(V5)과 `can`/`ccn` 대응.
3. 확정 관계 1개(욥 37:20)의 깊이·돌아가기가 실제 자료에서 그대로 보이는지.
4. `review.status` 승인 흐름(연구자가 파일의 `review`를 APPROVED로 바꾸는 방식 — 선택지: 파일 안 칸 / 별도 승인 파일).

## 9. 연구자 판단이 필요한 선택지

| 항목 | 선택지 | 제안 |
|---|---|---|
| exporter 둘 곳 | MILALWV `pipeline/`(지금) / MILAL `tools/` | 지금대로(MILAL 불변) |
| NO_DIRECT_RELATION의 CONTROL 근거 | 실제 `V1_CONTROLS.json`을 본 뒤 추가 / 사람 결정만 | 실제 파일 본 뒤 |
| 승인 표시 | 파일 안 `review.status` / 별도 `approvals.json` | 파일 안(한 파일이 자기 상태를 가짐) |
| 메모 동기화 시점 | 규칙 승인 즉시 / 메모 UI를 더 쓴 뒤 | 규칙 승인 뒤 바로(규칙 시험은 끝남) |
| 낱말 메모 이전 | 그대로 둠(지금) / `kind:"word"`로 옮기고 원본 보존 | 그대로 두다가 동기화 켤 때 함께 |

## 10. 다음 작업 제안

1. 목사님: V1 Windows 실행 → 파일 공유 → 호환성 검증 → 규격 확정.
2. 규칙 승인 → `firestore.rules` 게시 → 주석 Firestore 동기화(문서 단위, updated 큰 쪽 우선, 묘비 존중) 연결.
3. 실기기(Android Chrome) 측정; 필요하면 Service Worker(캐시 버전 = STUDY_V).
4. 메모 내보내기(Markdown/CSV: 관찰·해석·자리·MILAL 참조 열).
