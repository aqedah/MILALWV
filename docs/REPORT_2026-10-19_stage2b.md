# MILALWV 보고 — 2단계 마무리·3단계 착수 (2026-10-19 밤)

기준 커밋: aqedah/MILALWV main `c8814b3` (지시 기준 `3f90ae0` 이후 7개 커밋). 배포: https://aqedah.github.io/MILALWV/
**인터페이스는 여전히 초안**입니다. 실제 V1 관계망과 대조한 뒤 확정합니다.

## 1. 수정된 MILALWV-IF-1 규격(2판)과 변경 이유

`docs/MILAL_INTERFACE_DRAFT.md` 끝의 '2판에서 바뀐 것' 표 그대로:

| 바뀐 것 | 이유 |
|---|---|
| BHSA 원 관계를 `relations`에서 빼고 **`native_relations`**(절 원자 번호·rela·rela_level 그대로)로 | 원 자료를 MILAL 판정 목록에 섞어 절 수준으로 올리면 판정처럼 보이고 절 원자 정보가 사라짐 |
| 관계 방향 **확정**: source = 모절(후보), target = 자절 | MILAL `HUMAN_STRUCTURAL_ADJUDICATION_MFR_H02.md`의 "500062 → 500065": `target_clause_id`가 모절을 찾는 절, `source_clause_id`가 모절 후보. P2 명세 "each target's mother table"도 같음 |
| CONTINUATION은 지금 `relations`에 나오지 않음(칸만 유지) | V1에서 CONTINUATION은 BHSA 원 관계에서만 생김 |
| 중복 모절·순환 검사는 HIERARCHY 계열만; PARALLEL·MEMBERSHIP·CLOSURE는 별도 | 나무가 아닌 것을 나무에 넣지 않음 |
| 깊이는 CONFIRMED 관계만으로 | 잠정·경쟁을 깊이에 넣으면 확정처럼 보임 |
| `evidence.stance` → **`outcome`**(PASSED/FAILED/UNRESOLVED/HUMAN) + 선택 `role`(REQUIRED/SUPPORTING/COUNTEREVIDENCE, MILAL 문법이 붙인 경우만) | 검사 실패 ≠ 반례. 기계적 변환 금지 |
| `observed`에 실제 기록된 것만 | 없는 관찰값을 만들어 넣지 않음 |
| `NO_DIRECT_RELATION`에 **`basis` 필수**(HUMAN_DECISION/RULE/CONTROL + record) | 관계가 없다는 이유로 생기지 않게. 실제 출처: H0.2의 `NO_DIRECT_STRICT_MOTHER_RELATION` REJECTED 결정, 통제 항목 |
| V12·V13·V14 추가; V1은 jsonschema 없으면 **검사 불가**(종료 2) | 통과로 잘못 읽히지 않게 |

## 2. 검증기와 테스트 결과

- `pipeline/milal_check.py` V1~V14 (낱말 대조는 번호 전체 비교·차이 표시; 10% 넘으면 읽지 않음).
- `pipeline/milal_check_mutations.py`: 변이 **14종 모두 검출** — 기존 6(끝점 없음·확정 순환·확정 중복 모절·낱말 개수·모르는 상태·BHSA 판) + 새 8(낱말 번호 바뀜(개수 같음)·잘못된 관계 유형·근거 참조 누락·직접연결없음 근거 없음·원 관계 절 원자 밖·실제 출력인데 출처 없음·계열–종류 불일치·jsonschema 없음→검사 불가). 원본은 통과.
- 앱(`app/milal.js`)도 읽을 때 V2·V3·V6·V7·V9·V12·V14 + 낱말 번호 전체 대조를 하고, 하나라도 치명이면 **"MILAL 자료를 읽지 않음"으로 멈추고 정상 화면으로 넘어가지 않습니다.** TEST_ONLY는 모든 화면에 "시험 자료", MILAL_OUTPUT은 단계·규칙 판·커밋을 표시.
- 시험 자료 `test/milal_test_only_job31-38.json`(2판): 절 459 · 묶음 9 · 관계 38(가상) · BHSA 원 관계 458(실제) · 근거 16 · 이슈 8 · 메모 1. 가상 '반례'는 없앴고, FAILED는 실패로만 표시.

## 3. 실제 V1 자료 연결용 exporter 설계 — `docs/MILAL_EXPORTER_SPEC.md`

- 읽기 전용, MILAL 코드 import 없이 파일만 읽음. 입력: `V1_RELATION_NETWORK.json` + `90_run_metadata.json` + `99_manifest_sha256.csv`, 근거 펼치기에 `P2_REVIEW.zip`의 `P2_RULE_TRACE.csv`·`P2_RELATIONS_AND_ALTERNATIVES.json`.
- 대응표(절·묶음·관계·원 관계·대안·미배정·사람 메모→이슈), 근거 펼치기 규칙(출처 표별), **손실·생성 검사 12항목**(개수·ID 집합·상태 분포·방향·근거 참조·허용되는 생성 3종만).
- **호환성 검증에 필요한 자료(목사님 컴퓨터)**: `MILAL\results\mfr03_v1_*\real\V1_RELATION_NETWORK.json`(+ 같은 폴더 metadata·manifest) — **V1을 아직 안 돌리셨으면 `scripts\run_milal_v1_windows.ps1` 실행이 먼저**(MILAL HANDOFF: "Windows execution is the researcher's next step"). 그리고 `MILAL\results\mfr03_p2_20261002\release_a_v2\P2_REVIEW.zip`. 둘 다 Git에 없음. 실제 파일이 없어 있는 것처럼 테스트하지 않았습니다.

## 4. 욥기 31:40–38:1 장 경계 초월 구조 지도 시제품

- 구조 탭 세그먼트 **계층 | 발화 | 지도**. 지도는 MILAL 묶음(판정)을 본문 순서로 늘어놓고, 단위 사이는 **확정 계층 관계가 있을 때만 선**, 아니면 "순서만 · 직접 관계 미검증" / "종속 경쟁 n" / "직접 연결 없음(판정)"(basis 있는 이슈가 두 단위에 각각 걸릴 때만). 도입 구문 병행(잠정)은 작은 글씨로 덧붙임. 단위를 누르면 그 장의 구조로 이동. 큰 발언 가설(겹침)은 적용하지 않고 아래 따로.
- 단위의 '모절' 표시는 **단위 밖에서 들어오는 계층 관계만** 셈(단위 안 도입→내용은 모절이 아님).
- 공통 원칙 적용: 세 출처 구분 / 관찰 후보 vs 판정 / 절 vs 절 원자(절 단위 관계는 첫 절 원자에 **표시**하되 상세 창에 "절 단위 관계"임을 적음) / 근거의 관찰 절·관계 끝점·BHSA mother를 누르면 **원문 위치로 이동(장을 넘어도)**.
- 시험 자료라 선은 하나(가상 확정 1)뿐이고 대부분 "순서만"으로 보입니다. 이것이 지금 MILAL 상태(확정 1개)에서 정직한 모습입니다.

## 5. 모바일 첫 로딩 개선 결과

| 조건 (크로미엄 에뮬레이션, gzip) | 전 | 후 |
|---|---|---|
| 첫 화면 전송량 | 5.3MB | **0.9MB** |
| CPU 4배 느림 · 12Mbps | 7.0초 | **1.3초** |
| CPU 6배 느림 · 4Mbps | 14.2초 | **2.8초** (목표 3초) |
| CPU 4배 · 1.6Mbps | — | 7.7초(분할 전 측정) → 글꼴·Firebase 지연 뒤 재측정 필요 |
| 전체 책 받기(배경) | — | 4~11초 |
| 메모리 | 81→115MB | 30(첫 화면)→75(전체)→113MB(검색 색인 뒤) |

방법: `index.json`(절 목록·책별 시작 번호) + 책별 `books/<b>.json`·`bible/krh/<b>.json`; 전체 배열을 처음부터 전체 크기로 잡고 책 조각을 제자리에 채워 **검색 코드는 그대로**. 구약 전체가 필요한 일(낱말 전체 검색·검색식)만 나머지 책을 받음(`ensureAll`, 중복 다운로드 없음, 받는 동안 "n/39권" 안내). 한글 사전 풀이(`lexko.json`, 109KB gz)는 낱말 상세 때, Firebase SDK(~180KB)는 첫 화면 뒤 또는 로그인·나눔 누를 때, 제목용 글꼴은 첫 화면 뒤. `split_study.py`가 조각을 다시 이어 붙여 `words.json`과 바이트 단위로 같은지 검산. **TF 대조 건수 227/369/2260/1015/3697 그대로.** 실기기(Android Chrome) 측정은 아직 없음.

## 6. 기록 저장 구조(작업 6) — `docs/NOTES_STORAGE_DESIGN.md`

- 주석 한 장 = 문서 하나(`users/{uid}/annots/{id}`, 기기는 IndexedDB). `kind` word/verse/atom/range, `anchor`는 BHSA 번호, **observation / interpretation 분리**, `mark`(원문 위 덧입힘), `milal_ref`(참조만). 낱말 메모는 `word`로 자연 수용, 원 목록은 지우지 않고 표시만.
- 나눔 점검표: 사진은 올리지 않도록 **지금 고침**, 필드 길이 제한(이름 60·본문 500·히브리어/뜻 200), 규칙에 `keys().hasOnly`·정수 범위 추가(HANDOFF 2절 갱신). **규칙은 아직 콘솔에 적용되지 않았으므로 안전성은 '설계됨'이지 '검증됨'이 아닙니다.** 적용 뒤 비로그인 올리기·남의 글 삭제가 거부되는지 실제로 확인해야 합니다.

## 7. 남은 연구자 판단 사항

1. `issues.NO_DIRECT_RELATION`을 `human_notes`의 REJECTED/NO_DIRECT_STRICT_MOTHER_RELATION과 통제 항목에서 내는 데 동의하는지.
2. 근거 펼치기 깊이(검사 항목별로 충분한지, 규칙 안 관찰값까지 필요한지) — P2 rule trace에 `origin_ids`가 있어 절까지는 가능; 낱말·표지는 trace에 있을 때만.
3. 절 단위 관계를 첫 절 원자에 표시하는 방식(표시일 뿐 적용이 아니라고 적음)에 동의하는지.
4. 발화 보기에 발화자 이름을 넣지 않는 것(V1에 없음).
5. exporter를 MILAL `tools/`에 둘지 MILALWV `pipeline/`에 둘지.
6. V1을 Windows에서 실행해 `V1_RELATION_NETWORK.json`을 만들어 주실 수 있는지(호환성 검증의 전제).

## 8. 다음 작업 제안 (3단계)

1. 실제 V1 파일 수령 → exporter 구현 → 손실·생성 12항목 비교 → 앱에서 읽기 → **그때 규격 확정**.
2. 계층 보기에 CONFIRMED 관계로 계산한 깊이를 BHSA tab 옆에 두 번째 선으로(확정이 1개뿐이라 당장은 거의 안 보임 — 그것이 맞음).
3. 발화 보기에 묶음 `roles.introduction/content` 경계와 인용 속 인용 깊이를 띠로.
4. 실기기 측정(목사님 Android) 후 1.6Mbps 조건 재점검, Service Worker 캐시.
5. 작업 6 구현(절·절 원자 메모), 나눔 규칙 적용·확인.
