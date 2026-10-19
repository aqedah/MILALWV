# MILALWV 2단계 보고 — 연결 규격·검증·구조 탭 시제품 (2026-10-19)

기준 커밋: aqedah/MILALWV main `3f90ae0`. 배포: https://aqedah.github.io/MILALWV/

## 1. MILAL JSON 인터페이스 규격 초안

- `docs/MILAL_INTERFACE_DRAFT.md` (설명) + `docs/milal_interface.schema.json` (JSON Schema 2020-12). **초안**이며 연구자 승인 전.
- 바탕은 MILAL 저장소의 **MFR.0.3-V1 관계망**(`src/milal_v1_network.py`, 스키마 `MILAL-V1-RELATION-NETWORK-1`)입니다. 지시문이 가정한 CONDITIONAL/UNRESOLVED 대신 MILAL에 이미 있는 이름을 그대로 씁니다.
  - 관계 유형 6: SUBORDINATE · PARALLEL · FRAME_CONTENT · CONTINUATION · CLOSURE · MEMBERSHIP
  - 판정 상태 4: CONFIRMED · PROVISIONAL · COMPETING · UNASSIGNED
  - 노드 단위: **절(clause, BHSA clause 노드)** + 묶음(group: LOCAL_SPEECH_UNIT 등 7종). 절 원자가 아닙니다.
- 여섯 구조: `source`(판·출처) · `nodes`(절) · `groups`(묶음 — 지시문의 다섯 구조에 추가) · `relations`(독립 목록, `evidence_ids`로 근거 참조) · `evidence`(관계마다 여럿, 지지/반례/미결) · `issues`(ALTERNATIVE_SET · UNRESOLVED · SCOPE_CONFLICT · UNASSIGNED_CLAUSE · NO_DIRECT_RELATION) + `notes`(채택되지 않은 사람 결정).
- 방향 고정: HIERARCHY 계열은 source = 모절·틀·머리, target = 자절·내용. 계층 깊이는 저장하지 않고 CONFIRMED 관계로 계산. BHSA `tab`은 MILALWV의 words.json에 원값으로 보존(재전송 안 함).
- "연결 없음"과 "모름" 구분: 관계도 이슈도 없으면 **모름**, MILAL이 판정한 "직접 연결 없음"은 `issues.NO_DIRECT_RELATION`.

## 2. 열쇠(ID) 준비 — words.json

- `can`(절 원자 → BHSA clause_atom 노드), `ccn`(절 → BHSA clause 노드), `bs`(책별 BHSA 첫 낱말 번호)를 넣었습니다. 검산: 낱말 426,590 · 절 원자 90,704 · 절 88,131 모두 불일치 0, tab 일치.
- MILAL의 `word_ids`로도 절을 되찾을 수 있어 절 번호가 어긋나도 낱말로 대조합니다.

## 3. 검증 기준과 검증기

`pipeline/milal_check.py` — V1 스키마 · V2 BHSA 2021 · V3 끝점 존재 · V4 관계 id/내용 중복 · V5 낱말 대조(words.json) · V6 확정 관계 순환 · V7 확정 관계 중복 모절 · V8 전체 관계 순환/중복(경고) · V9 근거 존재 · V10 파일 상태.
음성 변이 6종(끝점 없음 · 확정 순환 · 확정 중복 모절 · 낱말 불일치 · 모르는 상태값 · BHSA 판 다름) 모두 검출 확인. 앱(`app/milal.js`)도 읽을 때 V2·V3·V6·V7·V9를 다시 검사하고, 실패하면 자료를 읽지 않습니다.

## 4. 시험 자료 (TEST_ONLY)

`test/milal_test_only_job31-38.json` — 욥 31:40–38:1, 절 459 · 묶음 9 · 관계 488 · 근거 15 · 이슈 7 · 메모 1.
- **실제 값**: 절·낱말·절 원자 노드 번호, BHSA clause_atom mother + rela 관계(UNASSIGNED, 450개).
- **가상(TEST_ONLY)**: 묶음 경계, 틀–내용·병행·종속·종결 관계, 근거, 확정 1개, 경쟁 2개, 대안 묶음, 미결, '직접 연결 없음' 1개. 파일 맨 위 `file_status: TEST_ONLY`, 모든 가상 항목 note에 TEST_ONLY, 화면 어디서나 "시험 자료" 표시.
- 명세의 통계 수치로 실제 관계망을 복원하지 않았습니다.

## 5. 구조 탭 화면 구성

- 세그먼트 **계층 | 발화**. 발화는 별도 하단 메뉴가 아닙니다.
- 세 출처 구분: **선·층·종류 = BHSA 원자료**, **색·표지 = 앱의 관찰 후보(판정 아님)**, **MILAL 판정 = 겹쳐 보기(켜고 끔)**. 'ETCBC 판정'이라는 이름은 없앴습니다.
- 줄 오른쪽 이름표를 누르면 상세 창: BHSA 원자료(절 원자·절 노드 번호, typ·tab·txt·domain) / 앱 관찰 후보 / MILAL 판정(속한 묶음과 묶음 단위 관계, 절 단위 들어오는·나가는 관계, 규칙·출처 기록·근거 지지/반례/미결, 미해결·대안, BHSA 원 관계는 접힘). 툴팁에 의존하지 않습니다.
- 묶음 단위 관계는 묶음 머리띠에, 절 단위 관계만 줄 배지에 — 묶음 관계를 첫 절에 붙이면 뜻이 어긋나므로.
- 발화 보기: BHSA 영역(N/Q/D)·인용 깊이로 띠를 만들고(원자료), MILAL 발언 단위 머리띠를 얹음(판정). 발화자 이름은 넣지 않음(V1에 없음).
- 360 / 390 / 430px 가로 밀림 없음. 다른 책으로의 검색 결과 이동(창세기 → 신명기 5:27) 정상.

## 6. 성능 측정 (크로미엄 에뮬레이션, 실기기 아님)

| 조건 | 본문까지 | 전송 | 파싱 | 검색 색인 | 전체 검색식 | 구조 그리기 | 메모리 |
|---|---|---|---|---|---|---|---|
| CPU 4배 느림 · 12Mbps | 7.0초 | 5.3MB(gzip) | 0.20초 | 0.23초 | 0.27초 | 0.08초 | 81→115MB |
| CPU 6배 느림 · 4Mbps | 14.2초 | 5.3MB | 0.30초 | 0.36초 | 0.28초 | 0.10초 | 81→115MB |

GitHub Pages가 gzip으로 보내므로 words.json 16.4MB는 **3.9MB**로 옵니다. 병목은 **내려받기뿐**이고 CPU 작업은 모두 0.4초 아래입니다. 결정: 지금은 쪼개지 않고, 5단계에서 Service Worker 캐시(두 번째부터 0초) + 읽기 경로(책별 분할)와 검색 경로(전체 색인) 분리. 분할해도 Text-Fabric 대조 건수(227/369/2260/1015/3697)는 전체 색인을 쓰므로 바뀌지 않습니다.

## 7. 1단계 잔여 보완

- 검색 결과 → 다른 책·장 이동 확인(위). 360/390/430px 확인. 글씨 확대·RTL은 기존대로.
- `add_can.py` 안내문을 실제(otype·oslots·book 읽고 tab으로 검산)에 맞춤. HANDOFF 머리의 옛 여섯 탭·홈 설명 정리.
- 추가로 한 것: 우상단 ☰ 오른쪽 서랍(스와이프 닫기) — 로그인·번역본·밝기·홈 화면 추가·처음 쓰는 법·MILAL이란·자료 출처. 기록 탭 '나눔'(Firestore 규칙 추가 필요).

## 8. MILAL 쪽에 필요한 작업 (보고 — MILAL은 바꾸지 않음)

V1 관계망을 MILALWV-IF-1로 바꾸는 **읽기 전용 내보내기 스크립트 하나**:
1. clauses→nodes, groups, edges→relations, alternatives/unassigned/rule_notes→issues, human_notes→notes, source 채우기.
2. `P2_RULE_TRACE.csv`의 검사 항목(passed/failed/unresolved)을 `evidence` 항목으로 펼쳐 관계에 잇기 — V1 관계망에는 압축돼 있음.
3. "직접 연결 없음" 판정(통제 4:7/5:1 등)을 `issues.NO_DIRECT_RELATION`으로 — V1에 칸 없음.
4. 절마다 `clause_atom_ids`(P2 raw_clauses `atoms[].node`).

## 9. 연구자 판단이 필요한 항목

1. 관계 방향: V1의 `source`가 머리(모절)인지 확인 (규격은 그렇게 고정).
2. `issues.NO_DIRECT_RELATION` 추가에 동의하는지.
3. 근거 펼치기 깊이: 검사 항목별로 충분한지, 관찰값(낱말·표지)까지 필요한지.
4. 절 하나가 절 원자 여럿일 때 관계를 **첫 절 원자**에 그리는 것(MILALWV 쪽 결정).
5. 발화 보기에 발화자 이름을 넣지 않는 것(V1에 없으므로).
6. 실제 관계망 파일은 **호환성 검증 단계**에서 요청하겠습니다. 그때 생성 시점과 규칙 버전(`source.milal`)을 함께 확인합니다.
