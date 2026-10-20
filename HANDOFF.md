# MILALWV 시작 문서

MILALWV는 MILAL의 웹 보기 앱입니다. CBSR(이야기 통독 노트)의 '성경연구' 탭을 떼어 내어 새 프로젝트로 시작합니다.

- 만든 사람: 이츠학(이츠학아카데미) · 이삭 목사(중앙성서교회)
- 작성: 2026-10-19
- 이 문서는 새 저장소의 `HANDOFF.md`로 둡니다. 새 대화(Claude/Codex)를 열 때 가장 먼저 읽게 합니다.

---

## 현재 상태 (2026-10-19, 첫 판 올림)

- 독립 앱이 돌아갑니다: `index.html` + `host.js` + `study.css` + `app/`(study_ui · study_q · study_theory · menu · milal) + `study/` 자료 4개(meta · words · strong · bible).
- 머리띠의 MILAL 글자와 주소 단추가 '어디로 갈까요'(책 → 장 + 최근 본 곳) 창을 엽니다.
- 하단 탭: 본문 · 구조 · 연구 · 기록 (`index.html`의 `.bnav`, `host.js`의 `bindNav/navSync`). 첫 화면은 최근 본 곳, 없으면 창세기 1장.
- 우상단 ☰ 메뉴(`app/menu.js`): 로그인 · 번역본(개역한글/원문만, 개역개정 자리) · 밝기(기기/밝게/어둡게) · 홈 화면에 추가 · 처음 쓰는 법(첫 방문에 한 번 자동) · MILAL이란(Marker-Informed Linguistic Analysis of Layers) · 자료 출처.
- 기록 탭 '내 기록'(`app/annots.js`): 낱말 메모(옛 저장 그대로) + 절·절 원자·구간 메모(관찰/해석) + 표시(형광펜·밑줄·괄호)를 한 목록에서 필터·태그·검색·정렬. Markdown/CSV 내보내기. 저장은 IndexedDB `milal-annots`(rev·device 포함), 동기화는 규칙 승인 뒤. 나눔: 신고(`reports`)·관리자 숨김(`admins/{uid}`).
- MILAL 승인 기록: `study/milal/approvals.json`(분석 파일과 분리, 해시 대응) — `pipeline/milal_approve.py`. 변환기 `pipeline/milal_export_v1.py`(round-trip 정확, `milal_export_tests.py` 15건), fixture `test/v1_fixture/`(MILAL 자체 시험 산출물).
- 번역 본문: `study/bible.json` (`pipeline/make_bible.py`로 만듦) → `split_study.py`가 `study/bible/krh/<b>.json`으로 쪼갬. 지금은 **개역한글**(대한성서공회, 저작재산권 만료, 출처 crizin/bible-db holybible 정본, 구약 23,144절). 개역개정.bdb를 받으면 `make_bible.py sqlite` 로 바꿔 넣고 `STUDY_V`를 올립니다. 개역한글에는 시편 표제가 따로 없습니다.
- 링크 공유 썸네일 `img/og.jpg`(1200×630), 아이콘 `img/`, `manifest.webmanifest`. 썸네일 원본은 대화에서 만든 HTML(글꼴: Noto Serif Hebrew/KR, IBM Plex Mono).
- 로그인은 **보기에는 필요 없고**, 원어 메모를 기기끼리 맞출 때만 씁니다(Google 로그인, `firebase.js`, 저장 자리 `users/{uid}/study/notes` 문서 하나에 목록으로).
- 검색식 대조 건수 227 / 369 / 2260 / 1015 / 3697 모두 Text-Fabric과 같음(2026-10-19 확인). 390px 너비에서 가로 밀림 없음.
- localStorage 키는 `milal-study-…`로 바꿨습니다.
- `study/*.json`을 바꾸면 `pipeline/split_study.py study`를 다시 돌리고 `index.html`의 `STUDY_V` 값을 올립니다(브라우저 캐시 때문).
- 2단계 연결 규격: `docs/MILAL_INTERFACE_DRAFT.md` + `docs/milal_interface.schema.json` (초안, 연구자 승인 전) · 검증기 `pipeline/milal_check.py` · 시험 자료 `test/milal_test_only_job31-38.json`(**TEST_ONLY**) · 앱 읽기 `app/milal.js`(구조 탭 '계층'에서 'MILAL 판정 겹쳐 보기'; 지금은 욥기 시험 자료만).
- 자료 읽기(2026-10-19 밤 바꿈): `study/meta.json` + `study/index.json`(절 목록·책별 시작 번호) → **보는 책만** `study/books/<b>.json` + `study/bible/krh/<b>.json`. 구약 전체가 필요한 일(낱말 전체 검색·검색식)은 그때 나머지 책을 받는다(`ensureAll()`; 중복 다운로드 없음). 한글 사전 풀이는 `study/lexko.json`으로 따로(낱말 상세 때), Firebase SDK는 첫 화면 뒤 또는 로그인·나눔 누를 때. `words.json`은 파이프라인·검증기 원본으로만 남김. 만들기: `pipeline/split_study.py study`(이어 붙여 words.json과 같은지 검산함).
- 성능(에뮬레이션, gzip): 첫 화면 전송 ≈ 0.9MB → **4Mbps·CPU 6배 느림에서 2.8초**, 12Mbps·4배에서 1.3초 (전에는 5.3MB → 14초/7초). 전체 책 받기 5~11초(배경), 메모리 30→75→113MB. TF 대조 건수 227/369/2260/1015/3697 그대로.
- 4단계 안정화(2026-10-20 낮, `docs/REPORT_2026-10-20_stage4.md`): 규칙에 표시(mark)·나눔 숨김 읽기 제한(공개 조회는 `where hidden==false`) · 승인 우선순위 해석기 `app/approval.js`(TEST_ONLY 기록 금지, CHAPTERS 배지 반영) · **JSON 백업·복원**(기록 탭, `MILALWV-BACKUP-1`) · IndexedDB 불가 시 임시 저장소+경고 · **동기화 구현**(`app/sync_core.js` + `firebase.js`, 스위치 `ANNOT_SYNC_ENABLED` 기본 꺼짐, 에뮬레이터 19건) · 운영 전환 점검표 `docs/SYNC_ROLLOUT_CHECKLIST.md` · 모바일(키보드·RTL 괄호·겹친 표시·긴 구간) · 묶음 상세(머리띠 누름)·용어 풀이 · 실제 V1 검증 스크립트 `pipeline/milal_real_v1_check.py`. 시험: `pipeline/firestore_rules_test/run.sh`(규칙 74+동기화 19), `pipeline/ui_tests/`(저장 18·모바일 12·사용성 걸음).
- **실제 V1 연결(2026-10-20 오후)**: 실제 MILAL V1 을 작업 환경에서 실행(커밋 d7c2eb3, P2_REVIEW.zip 0a96d235…, V1 네트워크 sha c6df1724…) → `pipeline/milal_real_v1_check.py` 10단계 모두 통과(ROUNDTRIP_EXACT, V1~V16, 긍정 기준점 500064→500065 CONFIRMED·HUMAN 근거, 부정 기준점 500062↛500065 NO_DIRECT_RELATION, 37:24→38:1 NOT_RECORDED) → `study/milal/job.json`(sha c3541750…, 욥기 1–42장, 절 2,938·관계 446·원 관계 3,350, **UNREVIEWED**)으로 배포, 앱이 이 파일을 읽음. 시험 자료는 `test/`에만. 보고서 `docs/REPORT_real_v1_2026-10-20.md`. 명세 확정·첫 승인 기록은 연구자 확인 뒤.
- **5단계 준비(2026-10-20 저녁, `docs/REPORT_2026-10-20_stage5prep.md`)**: BHSA 원본 관계 대조(절 원자 복원 2,895·불일치 0, 사본 `study/milal/bhsa_native_job.json`, V13a/b) · IF-1 최종 승인안(`docs/MILAL_IF1_APPROVAL_PROPOSAL.md`, 미확정) · 규칙별 검토표(`docs/MILAL_REVIEW_TABLE_2026-10-20.md`, 승인 기록 없음) · 운영 전환 연구자 체크리스트(`docs/OPS_CHECKLIST_RESEARCHER.md`) + 옛 나눔 글 hidden 이전 스크립트 · 상세 창 쉬운 말 재구성 · HSA3 별도 시각화 설계(`docs/HSA3_DISPLAY_DESIGN.md`) · Android 실기기 점검표·5단계 우선순위(`docs/ANDROID_DEVICE_CHECK.md`).
- **5단계 착수(2026-10-20 밤, `docs/REPORT_2026-10-20_stage5a.md`)**: V1 보존 상태 네 가지 구별(전수검사 2,977·오류 0), V13b NOT_RUN 분리·사본 필수화, IF-1 승인안 2판(DRAFT), HSA3 차원 일치·노드 등록 20/미해결 3·시제품(읽기 전용), **본문 비교기**(연구 탭 '비교', `app/compare.js`, 시험 13건), 검토표 기술/학문 분리.
- **5단계 비교기 완성(2026-10-20 저녁, `docs/REPORT_2026-10-20_stage5b.md`)**: 형태 판정을 상대편 본문과 대조(대칭)·모음 유지 정규화, 어휘 선택 강조, LCS 상한(9M)·생략 표시, 범위 검증, 비교 메모 A/B 낱말 번호·설정 보존과 기록에서 복원, 독립 계산 대조 24건(`compare_expected.py`+`compare_c.js`), IF-1 승인 요약(`docs/MILAL_IF1_APPROVAL_SUMMARY.md`, DRAFT), HSA3 시제품 검증 12항목, 인쇄·PDF 시제품(`app/print.js`, `docs/PRINT_PDF_DESIGN.md`).
- **검색식 사용성 개편·비교기 최종 보완(2026-10-20 밤, `docs/REPORT_2026-10-20_stage5c.md`)**: 첫 화면 '원문에서 문장 패턴 찾기'(연구 질문 4개), 결과 뒤 연구 흐름(쉬운 말 조건·조건 고치기·다시 찾기·본문 왕복 복원·보관·기록 연결·'이렇게 연구해 보세요'), 단계 학습, 상자 모델의 관계 보존과 왕복 검사(`qRoundTrip`), 왜 맞았나, 조건 변경 안내, 20,000건 상한/계산 중단 구별, 책 범위는 그 책만 로딩; 비교기 공통 연쇄를 '원문 연속 표현'/'기능어 제외 어순 대응'으로 분리; IF-1 요약 ROUNDTRIP_EXACT 표현 정정.
- **검색식 2차 안정화(2026-10-20 밤, `docs/REPORT_2026-10-20_stage5d.md`)**: 보관 검색식에 실행 범위(구약 전체/책/장) 기록·복원, 첫 화면 범위 표시·전환, 절별 근거를 실행 때 보존(상한 20,000 전체·묶음 수/대표 수/상한 구별), '맞은 자리'(옛 '왜 맞았나') 쉬운 말(코드는 펼침), 예시 안내 불일치 방지·범위 변경 안내, 검색 메모 범위·상태·판 보존과 기록 탭에서 재실행·비교, 비교기 절 경계 표시·건너뛴 낱말 흐리게. 시험 `query_h.js`.
- 남은 일: 연구자 답(IF-1 요약본 §6, 규칙별 검토, 운영 전환 착수, HSA3 노드 등록·설계 답, 실기기 점검일) · 목사님 PC 재실행 해시 대조 · Firestore 규칙 승인·게시 뒤 동기화 켜기 · 실기기 측정 · PDF 내보내기 · '정할 것' 2·4·5번 · 개역개정 본문.

---

## 로드맵 (2026-10-19 정함)

바탕이 되는 생각: MILALWV는 '낱말 뜻을 알려 주는 성경'이 아니라 **'문장이 앞뒤 문장과 어떤 관계인지 눈으로 보고 해석하는 성경'**으로 키웁니다. 기본 화면은 쉽게 읽고, 검색은 입문하기 쉽게, 계층·발화 시각화에서 MILAL의 분석력을 보입니다.

### 화면 뼈대: 하단 메뉴 4개 (지금부터 이 틀로 간다)

| 메뉴 | 하는 일 | 지금 들어간 것 | 앞으로 채울 것 |
|---|---|---|---|
| **본문** | 번역·히브리어 읽기, 낱말 띠, 글씨 크기 | 읽기 화면(개역한글 + 원문 + 낱말 띠) | 하이라이트·괄호·구간 선택, 사용자 표시와 자동 표시 구분 |
| **구조** | 절 원자 계층, 서술·발화, ETCBC/MILAL 판정 | ETCBC 층(tab) 들여쓰기·표지·말 접기 | MILAL 모절·자절 관계(상태·근거·버전), 발화 구조 지도, BHSA/MILAL 비교 |
| **연구** | 도구(반복·서술·장면·전환·인물) · 낱말 · 검색식 · 이론 | 셋 다 있음, 이론 글 | 반복·인용·재진술 비교, 서술 분석용/발언 분석용 필터 분리, 검색식 보관 |
| **기록** | 원어 메모, 하이라이트, 연구 노트, 내보내기 | 낱말 메모(기기 저장·로그인 동기화) | 절·절 원자·구간 메모, 관찰/해석 구분, PDF·Markdown 내보내기 |

- 홈 화면은 없앰. 앱을 열면 **최근 본 곳, 없으면 창세기 1장 본문**이 바로 뜬다. 책·장 이동은 머리띠의 주소 단추.
- 탭을 바꿔도 **보고 있던 책·장은 그대로**. 창 22장을 읽다 '구조'를 누르면 창 22장 구조, '연구'를 누르면 같은 범위의 분석.
- 이론은 연구 탭 안의 세그먼트와 ⓘ 도움말로 둔다.

### 단계

| 단계 | 할 일 | 끝났다는 기준 |
|---|---|---|
| **1. 틀 잡기** (끝) | 하단 메뉴 4개 재편 · 첫 화면 창 1장 · 검색 결과 → 해당 절 이동 고치기 · 이론 글 정리 | 휴대폰에서 읽기→구조→연구→기록이 한 범위로 이어짐 |
| **2. MILAL 연결 기반** (구현 끝, 실제 V1 파일 대조 대기 — `docs/MILAL_V1_RUN_PROCEDURE.md`) | ~~words.json에 BHSA clause_atom 실제 노드 번호(`can`) 저장~~(끝) · MILAL JSON 규격 확정(노드·관계 유형·판정 상태 확정/조건부/미해결·근거·버전) · 책별 분할 로딩 검토 | MILAL이 내보낸 JSON을 손실 없이 받을 수 있음 |
| **3. 핵심 시각화** (시험 자료로 구현 끝, 실제 자료 검증 대기) | 구조 탭에 'ETCBC 판정 / MILAL 판정' 전환 · 절 원자를 누르면 모절·근거·상태 · 가까운 2~3단계만 기본 표시, 먼 관계는 이동 단추 · 발화 구조(서술자·발화자·수신자·인용 속 인용) | 다른 원어 성경 앱에 없는 화면 |
| **4. 연구 생산성** (기기 저장 기준 1차 끝: 표시·구간·기록 탭·내보내기; 동기화·PDF 남음) | 본문 하이라이트·괄호·구간 선택 · 절·절 원자·구간 메모 · 관찰/해석 구분 저장 · 반복·인용 비교 · 검색식 보관 · 내보내기 | 과제·발제·설교 준비에 바로 씀 |
| **5. 확장** | 오프라인(Service Worker) · 검색을 Web Worker로 · 구조 분석 연습 모드 · 공유 주석 · 태블릿 | 수업에서 함께 씀 |

### 지키는 원칙

- 자동으로 찾은 것은 '분석 결과'가 아니라 **'관찰 후보'**다. 와예히·x-qatal·명사문이 늘 장면 전환·배경은 아니다. 판정은 연구자가 한다.
- MILAL은 판정, MILALWV는 표시. 웹앱에서 사용자가 구조를 고쳐도 MILAL 결과를 덮어쓰지 않는다.
- CONDITIONAL·UNRESOLVED 관계를 확정으로 그리지 않는다.
- 사용자 표시(괄호·강조)는 원문 위에 입히는 별도 자료다. 본문 자체는 바꾸지 않는다.
- 휴대폰 계층도는 간결하게. 10~15단계 선을 다 그리지 않는다.

---

## 0. 세 저장소의 관계

| 저장소 | 하는 일 | 원칙 |
|---|---|---|
| **aqedah/MILAL** | 욥기 논문용 분석 장치(파이썬). 규칙을 만들고 검증·확정 | **MILALWV 작업에서 손대지 않는다.** 규칙이 확정되면 JSON 파일 하나로 내보내는 출구만 MILAL 쪽 일정에 맞춰 만든다 |
| **aqedah/MILALWV** (새로 만듦) | 히브리어 원문 읽기·낱말 풀이·장 구조·검색식 웹앱 | MILAL이 내보낸 JSON을 받아 화면에 보여 준다 |
| **aqedah/CBSR** | 성도용 통독·QT 앱. 지금은 성경연구 탭이 이 안에 들어 있음 | MILALWV가 자리 잡으면 CBSR은 MILALWV의 묶음을 불러다 쓰거나 지금 판을 그대로 둔다(나중에 결정) |

두 저장소(MILAL ↔ MILALWV)는 **JSON 파일 형식 하나로만** 이어진다. 그래서 논문 쪽 규칙이 바뀌어도 웹앱 코드는 거의 바뀌지 않는다.

---

## 1. GitHub 열기 (목사님이 하실 일)

1. GitHub에서 **New repository**를 누릅니다.
   - 이름: `MILALWV`
   - 공개(Public)로 만듭니다. 무료 계정에서 GitHub Pages로 웹앱을 띄우려면 공개 저장소여야 합니다.
   - README 추가는 체크하지 않습니다(빈 저장소).
2. 이 묶음(`milalwv_seed.zip`)을 풀어서 안의 파일을 저장소에 올립니다.
   - 웹 화면에서 **Add file → Upload files**로 올려도 됩니다.
   - 다른 방법: 새 Claude 대화에 zip을 첨부하고 "저장소에 올려 주세요"라고 하셔도 됩니다.
3. **Settings → Pages** 메뉴에서 Source를 `Deploy from a branch`, 가지(branch)를 `main` / `/(root)`로 정합니다.
   - 주소는 `https://aqedah.github.io/MILALWV/`가 됩니다.
4. 새 Claude 대화에서 저장소 `aqedah/MILALWV`를 연결합니다.

## 2. Firebase · Firestore 열기 (목사님이 하실 일)

CBSR의 Firebase(cbsr-21238)와 **섞지 않고 새 프로젝트를 만듭니다.**

1. https://console.firebase.google.com 에서 **프로젝트 추가**를 누릅니다.
   - 이름: `milalwv`
   - Google 애널리틱스는 끕니다(필요 없음).
2. **Firestore Database → 데이터베이스 만들기**
   - 위치: `asia-northeast3 (서울)` — 한 번 정하면 바꿀 수 없습니다.
   - **프로덕션 모드**로 시작합니다(규칙은 아래 4번에서 넣음).
3. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱(</>) 추가**
   - 앱 별명: `milalwv-web`
   - Hosting은 체크하지 않습니다(GitHub Pages를 씁니다).
   - 나오는 `firebaseConfig` 값(apiKey, authDomain, projectId 등)을 복사해 새 대화에 붙여 넣으면 `config.js`로 만듭니다.
   - 이 값은 공개되어도 되는 값입니다. 보호는 아래 규칙이 맡습니다.
4. **Authentication → 시작하기**
   - 로그인 방법은 아래 '정할 것 1번'에서 고릅니다.
   - **설정 → 승인된 도메인**에 `aqedah.github.io`를 추가합니다.
5. **Firestore → 규칙**: 저장소의 **`firestore.rules`** 파일 전문을 붙여 넣고 '게시'합니다. (2026-10-20 제안본 — 낱말 메모 동기화 · 주석 `users/{uid}/annots/{id}` 만들기/고치기/지우기 분리 · 나눔. `/users/{uid}/{doc=**}` 와일드카드는 없앴습니다. 에뮬레이터 시험 32건 통과: `pipeline/firestore_rules_test/`. **운영 규칙은 연구자 승인 뒤에만 바꿉니다.**)

> **이메일 주소는 공개 저장소에 넣지 않습니다.** 관리자 구분이 필요하면 uid로 합니다.
> 나눔은 규칙을 게시하기 전에는 "아직 서버 쪽 문이 열리지 않았습니다"로 뜹니다. (첫 올리기 때 "색인이 필요합니다" 링크가 뜨면 그 링크를 눌러 만들면 됩니다.)

---

## 3. 첫 작업: 성경연구 탭을 독립 앱으로 떼어 내기 (Claude가 할 일)

### 3-1. 이 묶음에 든 것

```
milalwv_seed/
  HANDOFF.md                 ← 이 문서
  app/
    study_ui.js              화면: 주소 막대, 원문(읽기·구조), 도구, 낱말, 전환 화면, 원어 메모, 글씨 크기
    study_q.js               검색식 엔진 (Text-Fabric 검색식의 일부를 브라우저에서 실행)
    study_theory.js          이론 탭 글 (내러티브 비평 소개)
  data/                      (gzip으로 압축됨, 풀어서 data/ 또는 study/에 둠)
    meta.json.gz             낱말 사전·문법표·책 정보
    words.json.gz            구약 낱말과 문장 구조 (절·구·절 원자·층)
    strong.json.gz           우리말 스트롱 사전 8,674항목
  ref/
    template3.html           CBSR 앱 전체 원본 (성경연구 CSS·도움 함수가 여기 있음)
    build_site.py            CBSR 빌드 스크립트 (성경연구 js 3개를 /*STUDY*/ 자리에 끼워 넣음)
  pipeline/
    build_study.py           BHSA → meta.json, words.json 만드는 스크립트
    hangul.py                BHSA 음운 전사 → 한글 발음
    load.py, tfq.py          Text-Fabric 불러오기·검색식 건수 대조용
    gl/                      짧은 우리말 뜻 (에이전트가 정리, in*/out* + out_fix.json 덮어쓰기)
    strong_ko/               스트롱 사전 우리말 번역(out0~9.json), 번역 지침 GUIDE.md, 점검 check.py, make_strong.py
    sources/strongs_ko.tsv   Lexicon Omnium Gentium 한국어 사전 (CC BY 4.0)
```

### 3-2. CBSR 앱에 기대는 부분 → 연결 파일(`host.js`) 하나로 대신

study_ui.js가 CBSR에서 빌려 쓰는 것과, MILALWV에서 대신할 방법입니다.

| 빌려 쓰는 것 | 하는 일 | MILALWV에서 |
|---|---|---|
| `view` | 화면 상태 (`view.tab`, `view.st`) | `const view={tab:"study",st:{}}` |
| `render()` | 화면 다시 그리기 | `main.innerHTML=renderStudy(); bindStudy(main)` |
| `sheet(title, html)` | 아래에서 올라오는 창 | template3.html의 `sheet()`와 `.sheet` CSS를 옮김 |
| `toast(msg)` | 짧은 알림 | template3.html의 `toast()`를 옮김 |
| `esc()` | HTML 글자 바꿈 | 그대로 옮김 |
| `PLAN.abbr`, `PLAN.full` | 성경 책 약칭·이름(66권) | 책 이름 표를 따로 둠 |
| `BIBLE`, `TR`, `TR_INFO` | 번역 본문(읽기 화면의 한글 절) | **정할 것 3번** |
| `dayPlan()`, `view.w`, `view.d` | 오늘 통독 본문 | 빼거나 '최근 본 곳'으로 대신 |
| `switchTab()`, `HSEL`, `studyOutro` | 통독 탭으로 돌아가기 | 뺌 |
| `cbsr-study` 켜기 설정 | 실험 기능 켜기 | 뺌 (늘 켜짐) |

- CSS: template3.html 안의 `body.tab-study` 색 변수와 `.shead2 .sbar .saddr .stl .tc .rdv .rstrip .rdet .theory .qblk …` 줄을 `study.css`로 모읍니다. `body.tab-study`는 `body`로 바꿉니다.
- localStorage 키(`cbsr-study-range`, `cbsr-study-recent`, `cbsr-study-notes`, `cbsr-study-fs`, `cbsr-study-vm`)는 `milal-…`으로 바꿉니다.

### 3-3. 자료 형식 요약

- `meta.json`
  - `lex` 한 줄: `[모음 붙은 표제어, BHSA lex, 품사, 스트롱 번호, 한글 사전 풀이(LOG), 영어 뜻(BHSA), 한글 발음, 횟수, 아람어 여부, 짧은 우리말 뜻, 자음 표제어]`
  - `morph`, `fun`, `typ`, `dom`, `ptyp`, `books`, `txt`: 번호 → 이름 표
- `words.json`
  - `V`: 절 목록 `[책, 한글 장, 한글 절, BHSA 장, BHSA 절, 첫 낱말 번호, 낱말 수]`
    - 절 번호는 OSHB VerseMap으로 개역(KJV식)에 맞춤
    - 시편 표제는 절 0
  - `heb`, `han`: 절마다 탭으로 나눈 히브리어 낱말·한글 발음
  - `wl`, `wm`: Uint16 — 낱말마다 사전 번호, 문법 번호
  - `wf`, `wg`: u8 — 구의 기능, 표시(절 첫 낱말, 구 첫 낱말, 케레, 아람어)
  - `wc`, `wp`, `ws`, `wa`: 낱말마다 절·구·문장·절 원자 번호
  - `can`: 절 원자마다 BHSA 2021 clause_atom 노드 번호(앞 것과의 차이), `bhsa`: BHSA 판
    - 증가 부호: 0 = 앞과 같음, 1 = 새 번호, 2 = 예외 목록에서
  - `ct`, `cd`, `pt`: 절 종류·영역, 구 종류
  - `at`, `ay`, `ax`: 절 원자의 층(tab)·종류(typ)·txt 번호
- `strong.json`: `{"312":["אַחֵר","H309에서 유래","본래 '뒤의'; …","(또) 다른 (사람), …"]}`

### 3-4. 첫 작업 순서

1. `index.html` + `host.js` + `study.css` + app 3개 + data로 독립 앱을 세운다.
2. 시작 화면은 '어디로 갈까요'(책 → 장)와 '최근 본 곳'으로 한다.
3. Firebase 연결: 로그인하면 원어 메모(`users/{uid}/notes`)를 기기끼리 맞춘다.
4. 휴대폰 너비(390px)에서 가로로 밀리는 화면이 없는지, 검색식 건수가 Text-Fabric과 같은지 확인한다.
   - 검색식 대조 건수: 227 / 369 / 2260 / 1015 / 3697
5. GitHub Pages로 배포한다.

---

## 4. MILAL 규칙을 받을 자리 (나중 일, 형식 초안)

MILAL이 확정한 결과를 MILALWV가 받는 파일 형식의 첫 안입니다. MILAL 쪽 규격이 정해지면 그에 맞춰 고칩니다.

```jsonc
// 주석은 설명용
{
  "milal": "MFR.0.3",              // MILAL 규칙 판 이름 (HANDOFF의 단계 이름)
  "bhsa": "2021",
  "book": "Job",
  "atoms": [
    { "ca": 123456,                // BHSA 2021 clause_atom 노드 번호 (두 쪽을 잇는 열쇠)
      "marker": "wayhi-time",      // 표지
      "layer": 2,                  // MILAL이 판정한 층
      "rel": { "to": 123450, "type": "..." }  // 관계 (MILAL 규격에 따름)
    }
  ]
}
```

- **끝남(2026-10-19):** words.json에 `can`(절 원자마다 BHSA 2021 clause_atom 노드 번호, 앞 것과의 차이로 저장)과 `bhsa:"2021"`을 넣었습니다. 앱에서는 `SD.can[aid]`로 씁니다.
  - '첫 노드 + 번호와 같을 것'이라는 짐작은 **틀렸습니다.** words.json은 개역 책 순서, BHSA는 타나크 순서라 욥기 첫 절 원자가 587617입니다.
  - `pipeline/add_can.py`가 otype.tf·oslots.tf·book.tf 셋만 읽어 넣고 검산합니다(낱말 426,590 · 절 원자 90,704 · 불일치 0 · tab 일치). build_study.py로 다시 만들 때도 `can`이 들어갑니다.
  - BHSA 자료는 목사님 컴퓨터 `~/text-fabric-data/github/ETCBC/bhsa/tf/2021`에 있습니다.
- 화면에서는 지금의 장 구조(Talstra식 ┤ ┘ │ 선, 표지 판정 `markerKind`) 자리에 MILAL 결과를 겹쳐 보이고, 'ETCBC 판정 / MILAL 판정' 전환을 둡니다.

---

## 5. 자료 사용 조건 (화면 아래 '자료 출처'에 그대로 밝힘)

| 자료 | 조건 | 쓰는 곳 |
|---|---|---|
| BHSA (ETCBC) | **CC BY-NC 4.0 — 영리 목적 금지** | 원문, 문법, 절·구·절 원자, 층 |
| OSHB morphhb | CC BY 4.0 | 스트롱 번호 연결, 절 번호 맞춤 |
| Lexicon Omnium Gentium 한국어 | CC BY 4.0 (영어 사전을 기계 번역한 자료) | 한글 사전 풀이 |
| Strong's Hebrew Dictionary | 공개 저작물 (Open Scriptures HebrewLexicon 정리본 CC BY 4.0) | 유래·단어 정의·KJV에서 옮긴 말(우리말 번역은 이 작업에서 새로 만듦) |
| 짧은 우리말 뜻, 한글 발음 | 이 작업에서 새로 만듦 | 낱말 띠 |
| 번역 본문(개역개정 등) | 저작권 정리는 목사님이 따로 | 읽기 화면 |

MILALWV는 **무료·비영리**로 운영합니다(BHSA 조건). 유료화나 광고를 하려면 ETCBC의 별도 허락이 먼저 필요합니다.

---

## 6. 작업 약속

- 커밋 작성자는 `aqedah`로 하고, 작성자 이메일은 대화에서 따로 알려 줍니다. **공개 파일 안에는 이메일을 쓰지 않습니다.**
- 커밋 메시지 끝에는 그 대화에서 정해 준 작성자 표시 줄을 붙입니다.
- 답은 한국어로, 쉬운 말로 합니다. 지나치게 친절하거나 방어적인 문구는 쓰지 않습니다. 앱 안의 이름표도 같은 원칙으로, 흔히 쓰는 간결한 한자어를 씁니다.
- MILAL 저장소(aqedah/MILAL)는 읽기만 합니다. 바꿀 일이 생기면 목사님께 먼저 묻습니다.
- 배포 전에는 휴대폰 너비에서 화면을 찍어 확인합니다.

## 7. 정할 것 (새 대화에서 처음 여쭐 것)

1. **로그인 방법:** Google 로그인(연구자 몇 명이면 가장 간단) / CBSR처럼 이름 + 숫자 / 로그인 없이 이 기기에만 저장
2. **CBSR과의 관계:** CBSR 성경연구 탭이 MILALWV의 묶음을 불러다 쓸지(한 곳만 고치면 됨), 지금 판을 그대로 둘지
3. **번역 본문:** 읽기 화면의 한글 절을 어디서 가져올지 (CBSR의 `bible.js` 재사용 / 번역 없이 원문만 / 다른 공개 번역)
4. **공유 기능:** 원어 메모를 혼자만 볼지, 연구 모임과 함께 볼지 (함께 보면 Firestore 규칙을 더 짬)
5. **앱 이름 표기:** 화면에 'MILALWV'로 쓸지, 'MILAL 원문 보기' 같은 우리말 이름을 함께 쓸지
