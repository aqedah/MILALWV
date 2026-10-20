# MILALWV 보고 — 3단계 검증·4단계 연구 기능 확장 (2026-10-20 오전)

기준 커밋: aqedah/MILALWV main `454dfb1` 이후(이 보고 커밋 포함). 배포: https://aqedah.github.io/MILALWV/
MILALWV-IF-1은 **여전히 초안**(실제 V1 파일 대조 전). MILAL 저장소의 규칙·판정·동결 자료는 손대지 않았습니다.

## 1. Exporter 보존 검사 개선과 새 테스트 (작업 A)

- **round-trip 추가**: `pipeline/milal_roundtrip.py`가 IF-1에서 V1 관계망을 되살려 원본과 정준 JSON으로 비교. fixture(MILAL 자체 시험 산출물, 122개 필드 경로)에서 **ROUNDTRIP_EXACT(차이 0)**. V1의 머리 칸(schema·stage·source·p2_contract·legend·counts·base_group_ids·rule_notes_trace_ids)은 `source.milal.v1_passthrough`에 통째로, 절의 `ref`와 그 밖 칸은 `meta`, 관계의 나머지 칸은 `extra`, 원 관계의 모든 원본 칸은 `origin_*`로 보존. **보존하지 않는 필드: 없음** — `docs/MILAL_EXPORTER_FIELD_MAP.md`(전수 대응표).
- 판정명 수정: `LOSSLESS` → `STRUCTURAL_PRESERVATION_PASS`(구조 검사만 통과) / `ROUNDTRIP_EXACT`(되살려 비교해 동일) / `…; EVIDENCE_INCOMPLETE`(zip은 줬는데 근거가 비는 관계가 있음 → 실패 종료).
- 근거: `passed_checks`·`failed_checks`·`unresolved_checks`를 **검사 항목별로 각각** 보존(이름 목록이 없으면 trace status 그대로 1건). `origin_ids`는 P2 raw_clauses의 절 id 집합·낱말 id 집합과 대조해 `observed.clause_ids / word_ids / other_ids`로 나눔 — 숫자라는 이유로 절로 보지 않음(합성 자료에는 origin_ids가 비어 있어 실제 파일에서 재확인 필요).
- 절 원자 번호: P2 원 주석에 없으면 `clause_atom: null` + `atom_resolution: "NOT_AVAILABLE_IN_V1"` — 복원했다고 표시하지 않음.
- 새 테스트 `pipeline/milal_export_tests.py` **15건 통과**: round-trip 정확 · 근거 완전 · 관계 수 보존 · 필드 손실 검출 6종(관계 note, 절 word_ids, 원 관계 annotation_indexes, 묶음 rule_notes, 사람 메모, 머리 칸) · V1이 읽은 것과 다른 zip 거부(sha256) · zip 없을 때 근거 비는 사실 보고 · NO_DIRECT_RELATION = 사람 기각 수 · 상태 분포 그대로(새 CONFIRMED 없음) · 절 원자 '복원 아님' 표시 · origin_ids 판별 칸. 기존 fixture·변이 14종 유지.
- 실제 연구 결과 없이 새 관계 판정을 만들지 않았습니다(관계 = 원본 edge, 상태 = 원본 상태).

## 2. 실제 V1 자료 연결 준비 (작업 B)

`docs/MILAL_V1_RUN_PROCEDURE.md` 유지. 실제 파일이 오면 할 일(자체 검증 통과 확인 → SHA-256·커밋 확인 → 변환·round-trip·비교 보고 → clause·clause_atom·word 전체 대조(V5 불일치 0) → 실제 관계 유형·상태 분포 → 확정/경쟁/미배정 시각화 → 의미적 차이 보고)은 변환기와 검증기가 모두 자동으로 낸다. 앱의 TEST_ONLY 관계망은 `file_status`로 묶여 있어 실제 결과로 승격되지 않는다(승인 도구도 TEST_ONLY는 거부).

## 3. 연구자 승인 기록 분리 (작업 C)

- `study/milal/approvals.json`(`MILALWV-APPROVAL-1`) — 분석 파일은 승인 때 수정하지 않음. 기록: IF-1 SHA-256, V1 관계망 SHA-256, MILAL 규칙 판·커밋·단계, 승인자, 날짜, 범위(ALL / RELATIONS:[id…] / CHAPTERS:[a,b]), 상태(APPROVED / PARTIAL / REJECTED), 비고.
- `pipeline/milal_approve.py`: `--approver --status --scope`를 사람이 줘야 기록. **자동 APPROVED 없음**, TEST_ONLY 파일은 승인 불가, 범위가 전체가 아니면 APPROVED 불가(PARTIAL만). `--check`로 어떤 기록이 이 파일에 적용되는지 확인.
- 앱: 받은 파일의 바이트 SHA-256을 계산해 **같은 해시의 기록만** 적용. 없거나 다르면 "승인 전 — 검증 대기". PARTIAL이면 범위 안 관계에만 "승인" 배지. 파일 안 `review.status=APPROVED`는 무시(비고에 남김). 시험으로 확인: 해시 일치 PARTIAL 기록 적용(관계 1개), 해시 다른 APPROVED 기록 무시.
- 전환: 변환기는 `review.status`를 늘 UNREVIEWED로 쓰고 정보용으로만 남김(V16 유지). 승인의 유일한 출처는 approvals.json.

## 4. 본문 표시·구간 메모·기록 탭·내보내기 (작업 D) — 실제 동작 확인

- **표시**: 절을 펼친 뒤 '표시(형광펜·괄호)' → 낱말 띠에서 묶음을 여러 개 탭(또는 '절 전체') → 형광펜 4색/직접 색/밑줄/괄호 ⟦ ⟧. 구조 화면 상세 창에서 '이 절 원자 표시'. 원문은 바꾸지 않고 `kind:"mark"` 주석(BHSA 낱말 번호)을 덧입힘. 읽기·구조 화면 둘 다에 보이고, '표시 숨기기/보이기'. 표시를 누르면 지우기·메모 쓰기.
- **구간 메모**: '구간 메모' → 시작 절, 끝 절 탭(장을 넘어도 됨, 같은 책) → 관찰·해석. 시작·끝은 BHSA 낱말 번호(`span.from_word/to_word`)·절 원자·절 id로 보존, 사람 주소(창 22:1–4)는 함께 표시. 시작 절에 칩이 붙고 누르면 다시 연다.
- **기록 탭 '내 기록'**: 낱말 메모(옛 저장)와 새 주석을 한 목록에서 — 종류 필터(낱말/절/절 원자/구간/표시), 태그, 검색(관찰·해석·원문·태그), 최근 순/본문 순(책·장별), 누르면 본문(절 원자는 구조 그 줄, 절·구간은 읽기 그 절). 저장 방식은 통합하지 않음.
- **내보내기**: Markdown(머리에 자료판·건수·**"관찰=본 것, 해석=내 결론, MILAL 참조=판정 기록 가리킴이지 내 해석이 판정이라는 뜻 아님"** 안내; 책·장별 절; 원문 인용; 관찰/해석/태그/MILAL 참조(stage·시험/출력·sha·관계 id)/기록일)와 CSV(위치·종류·표시·원문·관찰·해석·태그·MILAL 참조·기록일·BHSA 낱말 번호). 파일 내려받기 + Markdown은 클립보드에도. 시험에서 실제 파일 생성 확인(샘플 801자).

## 5. Firestore 규칙·동기화 (작업 E) — 에뮬레이터 48건 모두 기대대로

- 진짜 삭제 **금지**(묘비 영구), `deleted` true→false **금지**, `rev` 만들 때 1·고칠 때 정확히 +1(낡은 기기 덮어쓰기·건너뛰기 거부), `server_at == request.time`(기기 시계 불신), anchor·created·kind 고정. 두 기기 동시 수정(A가 rev2로 고친 뒤 B가 rev1 기준으로 쓰면 거부 → 다시 읽어 합쳐 rev3), 오프라인 낡은 기기의 되살리기 거부, 본인도 진짜 삭제 거부 — 모두 시험으로 확인.
- 나눔: 올리기 전 공개 범위 안내 강화, 신고(`reports`, 로그인 필요, 300자, 관리자만 읽음), 관리자(`admins/{uid}`, 콘솔에서만)는 `hidden`만 고치고 삭제 가능, 앱은 숨긴 글을 거름. 사진 칸은 규칙에서 거부.
- 클라이언트 합치기 절차(칸별 병합, 충돌 사본 덧붙임, 묘비 유지)는 `docs/NOTES_STORAGE_DESIGN.md` 4절. 기기 저장에는 이미 `rev`·`device`가 들어간다. **신규 주석의 실제 동기화는 운영 규칙 승인·배포 뒤 켭니다. 운영 규칙은 바꾸지 않았습니다.** 낱말 메모 동기화는 그대로.

## 6. 모바일 연구 흐름 (작업 F)

8단계(창 22장 읽기 → 절 원자/구간 선택 → BHSA·MILAL 확인 → 형광펜·괄호 → 관찰·해석 → 기록 탭 → 다른 장 → Markdown 내보내기) 자동 시나리오 **360/390/430px 모두 통과**, 가로 밀림 없음, 콘솔 오류 없음. 흐름은 본문 읽기에서 시작(절 펼침 → 표시/메모 단추, 구간 모드)하고 탭 전환 없이 이어지며, 기록에서 돌아올 때 위치가 복원된다. **터치**: Pixel 5 프로필의 실제 터치 이벤트로 절 열기·RTL 띠 탭·다중 선택·띠 가로 스크롤 확인. 검색식 건수 227·369·2260·1015·3697 유지. 변이 14종·변환기 15건·규칙 48건 통과. **모두 에뮬레이션/에뮬레이터 결과이며 Android 실기기 측정은 아직 없습니다.**

## 7. 용어 정리 (작업 G)

- `M깊이 n` → **`확정 사슬 n`**(툴팁: 확정된 모절 사슬의 길이, 그 위가 미확정이면 전체 깊이가 아님, BHSA tab과 다른 값). 상세 창: "확정 사슬 n — 그 위는 미확정이므로 전체 깊이가 아님 / 0 — 확정된 모절이 없음(미결이지 '최상위'가 아님) · BHSA tab = 원자료 들여쓰기".
- 지도 범례: **상자 = 발언 경계(MILAL 묶음, 문학적) · 점선 = 본문 순서(관계 아님) · 실선 = 확정된 구조적 모절 관계 · 후보는 켜야 보임**. 미확정 관계는 선으로 긋지 않는다.

## 8. 실제 V1 파일을 받아야 완료되는 것

1. 변환기 호환성(실제 metadata 칸, `V1_CONTROLS.json`의 직접 관계 없음 통제 형식, rule trace `origin_ids`의 실제 종류, raw_clauses 절 원자 번호).
2. V5 낱말 불일치 0건·`can`/`ccn` 대응·round-trip 정확.
3. 실제 관계 유형·상태 분포와 확정/경쟁/미배정 시각화, 의미적 차이 보고.
4. 승인 기록 첫 건(연구자).

## 9. 로드맵 3단계·4단계 평가

| 단계 | 평가 | 근거 | 남은 것 |
|---|---|---|---|
| **3. 핵심 시각화** | **구현은 끝, 검증은 미완** | ETCBC/MILAL 구분, 확정 사슬, 모절 이동·돌아가기, 발화(도입/내용), 지도(순서/확정/후보), 승인 분리 — 시험 자료와 MILAL 자체 시험 fixture로 동작 확인 | 실제 V1 파일 대조·연구자 승인(8절). 그 전까지 "완료"라 하지 않음 |
| **4. 연구 생산성** | **1차 완료(기기 저장 기준)** | 표시·구간 메모·관찰/해석·기록 탭(필터·검색·정렬)·Markdown/CSV 내보내기가 실제로 동작, 과제·설교 준비용 기록 생성 가능 | Firestore 동기화(규칙 승인 뒤), PDF, 손가락 드래그 구간 선택, 낱말 메모 '옮기기' |

## 10. 연구자 판단 사항·다음

- 규칙(`firestore.rules`) 승인·게시 → 주석 동기화 켜기(합치기 절차 구현).
- V1 Windows 실행 → 파일 공유 → 1~4 검증 → 규격 확정 → 첫 승인 기록.
- 실기기(Android) 측정.
