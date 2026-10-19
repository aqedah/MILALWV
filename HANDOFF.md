# MILALWV 시작 문서

MILALWV는 MILAL의 웹 보기 앱입니다. CBSR(이야기 통독 노트)의 '성경연구' 탭을 떼어 내어 새 프로젝트로 시작합니다.

- 만든 사람: 이츠학(이츠학아카데미) · 이삭 목사(중앙성서교회)
- 작성: 2026-10-19
- 이 문서는 새 저장소의 `HANDOFF.md`로 둡니다. 새 대화(Claude/Codex)를 열 때 가장 먼저 읽게 합니다.

---

## 현재 상태 (2026-10-19, 첫 판 올림)

- 독립 앱이 돌아갑니다: `index.html` + `host.js`(CBSR이 주던 것 대신) + `study.css` + `app/` 3개 + `study/` 자료 3개.
- 시작 화면: '어디로 갈까요'(책 → 장) + '최근 본 곳'. 머리띠의 MILAL 글자와 하단 탭 '홈'이 처음 화면으로 갑니다.
- 하단 탭: 홈 · 원문 · 도구 · 낱말 · 검색식 · 이론 (`index.html`의 `.bnav`, `host.js`의 `bindNav/navSync`).
- 번역 본문: `study/bible.json` (`pipeline/make_bible.py`로 만듦). 지금은 **개역한글**(대한성서공회, 저작재산권 만료, 출처 crizin/bible-db holybible 정본, 구약 23,144절). 개역개정.bdb를 받으면 `make_bible.py sqlite` 로 바꿔 넣고 `STUDY_V`를 올립니다. 개역한글에는 시편 표제가 따로 없습니다.
- 링크 공유 썸네일 `img/og.jpg`(1200×630), 아이콘 `img/`, `manifest.webmanifest`. 썸네일 원본은 대화에서 만든 HTML(글꼴: Noto Serif Hebrew/KR, IBM Plex Mono).
- 로그인은 **보기에는 필요 없고**, 원어 메모를 기기끼리 맞출 때만 씁니다(Google 로그인, `firebase.js`, 저장 자리 `users/{uid}/study/notes` 문서 하나에 목록으로).
- 검색식 대조 건수 227 / 369 / 2260 / 1015 / 3697 모두 Text-Fabric과 같음(2026-10-19 확인). 390px 너비에서 가로 밀림 없음.
- localStorage 키는 `milal-study-…`로 바꿨습니다.
- `study/*.json`을 바꾸면 `index.html`의 `STUDY_V` 값을 올립니다(브라우저 캐시 때문).
- 남은 일: 이론 탭 글에 CBSR의 '일곱 읽기 도구' 언급이 남아 있음(정리 필요) · words.json(16MB) 책별 분할 검토 · '정할 것' 2·3·4·5번.

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
    // 그 밖은 모두 막음 (공유 주석 등은 나중에 규칙을 따로 추가)
    match /{path=**} { allow read, write: if false; }
  }
}
```

> **이메일 주소는 공개 저장소에 넣지 않습니다.** 관리자 구분이 필요하면 uid로 합니다.

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

- **할 일:** words.json의 절 원자 번호(`wa`)는 지금 0부터 차례로 매긴 번호입니다.
  - build_study.py가 BHSA를 책 순서대로 돌며 매기므로, `BHSA clause_atom 첫 노드 + 번호`와 같을 것으로 보입니다.
  - 확인한 뒤, BHSA 노드 번호를 그대로 쓰는 열(`can`)을 자료에 넣어 두 쪽이 같은 열쇠를 쓰게 합니다.
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
