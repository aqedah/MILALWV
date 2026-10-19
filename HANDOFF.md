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
- 기록 탭: 내 메모 · 나눔(`shared` 모음, 내 메모의 ↗로 올림; 규칙은 2절).
- 번역 본문: `study/bible.json` (`pipeline/make_bible.py`로 만듦). 지금은 **개역한글**(대한성서공회, 저작재산권 만료, 출처 crizin/bible-db holybible 정본, 구약 23,144절). 개역개정.bdb를 받으면 `make_bible.py sqlite` 로 바꿔 넣고 `STUDY_V`를 올립니다. 개역한글에는 시편 표제가 따로 없습니다.
- 링크 공유 썸네일 `img/og.jpg`(1200×630), 아이콘 `img/`, `manifest.webmanifest`. 썸네일 원본은 대화에서 만든 HTML(글꼴: Noto Serif Hebrew/KR, IBM Plex Mono).
- 로그인은 **보기에는 필요 없고**, 원어 메모를 기기끼리 맞출 때만 씁니다(Google 로그인, `firebase.js`, 저장 자리 `users/{uid}/study/notes` 문서 하나에 목록으로).
- 검색식 대조 건수 227 / 369 / 2260 / 1015 / 3697 모두 Text-Fabric과 같음(2026-10-19 확인). 390px 너비에서 가로 밀림 없음.
- localStorage 키는 `milal-study-…`로 바꿨습니다.
- `study/*.json`을 바꾸면 `index.html`의 `STUDY_V` 값을 올립니다(브라우저 캐시 때문).
- 2단계 연결 규격: `docs/MILAL_INTERFACE_DRAFT.md` + `docs/milal_interface.schema.json` (초안, 연구자 승인 전) · 검증기 `pipeline/milal_check.py` · 시험 자료 `test/milal_test_only_job31-38.json`(**TEST_ONLY**) · 앱 읽기 `app/milal.js`(구조 탭 '계층'에서 'MILAL 판정 겹쳐 보기'; 지금은 욥기 시험 자료만).
- 성능(2026-10-19, 크로미엄 CPU 4~6배 느리게 + 4~12Mbps, gzip): 첫 전송 ≈ 5.3MB(words 3.9 + bible 0.9 + meta 0.46) → 본문까지 7~14초. 파싱 0.2~0.3초, 검색 색인 0.23~0.36초, 구약 전체 검색식 0.3초, 구조 화면 그리기 ≤0.1초, 메모리 81→115MB. **병목은 내려받기뿐**이라 지금은 쪼개지 않고, 5단계에서 Service Worker 캐시 + 책별 분할(읽기 경로)·전체 색인(검색 경로) 분리로 간다.
- 남은 일: '정할 것' 2·4·5번 · 개역개정 본문 · Firestore 규칙에 나눔(shared) 추가(목사님).

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
| **2. MILAL 연결 기반** (진행 중: 규격 초안·검증기·시험 자료 있음, 연구자 승인 대기) | ~~words.json에 BHSA clause_atom 실제 노드 번호(`can`) 저장~~(끝) · MILAL JSON 규격 확정(노드·관계 유형·판정 상태 확정/조건부/미해결·근거·버전) · 책별 분할 로딩 검토 | MILAL이 내보낸 JSON을 손실 없이 받을 수 있음 |
| **3. 핵심 시각화** | 구조 탭에 'ETCBC 판정 / MILAL 판정' 전환 · 절 원자를 누르면 모절·근거·상태 · 가까운 2~3단계만 기본 표시, 먼 관계는 이동 단추 · 발화 구조(서술자·발화자·수신자·인용 속 인용) | 다른 원어 성경 앱에 없는 화면 |
| **4. 연구 생산성** | 본문 하이라이트·괄호·구간 선택 · 절·절 원자·구간 메모 · 관찰/해석 구분 저장 · 반복·인용 비교 · 검색식 보관 · 내보내기 | 과제·발제·설교 준비에 바로 씀 |
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
5. **Firestore → 규칙**에 첫 규칙을 넣습니다. 처음에는 "자기 기록만 읽고 쓰기"입니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // 각자의 원어 메모·설정
    match /users/{uid}/{doc=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // 나눔(기록 탭 → 나눔): 읽기는 누구나, 올리기는 로그인한 사람이 자기 uid로만, 내리기는 올린 사람만
    match /shared/{id} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid
                    && request.resource.data.m.size() <= 500;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
      allow update: if false;
    }
    // 그 밖은 모두 막음
    match /{path=**} { allow read, write: if false; }
  }
}
```

> **이메일 주소는 공개 저장소에 넣지 않습니다.** 관리자 구분이 필요하면 uid로 합니다.
> **2026-10-19 '나눔'을 넣었으므로 위 규칙 전체를 Firebase 콘솔 → Firestore → 규칙에 다시 붙여 넣고 '게시'를 누릅니다.** 안 하면 나눔 탭에 "permission-denied"가 뜹니다. (첫 올리기 때 "색인이 필요합니다" 링크가 뜨면 그 링크를 눌러 만들면 됩니다 — `t` 내림차순 하나라 보통 필요 없음.)

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
