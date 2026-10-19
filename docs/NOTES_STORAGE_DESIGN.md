# 기록(메모) 저장 구조 설계 — 낱말 메모를 지키면서 절·절 원자·구간 메모를 받을 자리

- 상태: 설계. 구현은 4단계. **기존 낱말 메모와 동기화 자료는 그대로 둔다.**
- 원칙: 사용자가 적은 것은 MILAL 판정과 다른 칸에 산다. 사용자 메모가 MILAL 자료를 덮어쓰는 길은 없다(쓰는 곳이 다르다).

## 1. 지금 (바꾸지 않음)

| 어디 | 무엇 | 모양 |
|---|---|---|
| 기기 `localStorage["milal-study-notes"]` | 낱말 메모 목록 | `[{t, b, c, v, heb, lex, han, gl, st, m}]` 최대 500개, 최신이 앞 |
| Firestore `users/{uid}/study/notes` | 같은 목록 (로그인 시 합침) | `{list:[…], at}` 문서 하나 |
| Firestore `shared/{id}` | 나눔에 올린 낱말 메모 | `{uid, name, photo, b, c, v, heb, gl, st, m, lex, han, t}` |

문제: 목록 하나에 전부 넣으니 500개가 한계이고, 메모 종류(낱말/절/구간)를 구별할 칸이 없고, 한 번 고치면 전체 목록을 다시 올린다.

## 2. 앞으로 — 주석(annotation) 한 장 = 문서 하나

```jsonc
// Firestore: users/{uid}/annots/{annotId}   ·   기기: IndexedDB "milal-annots" (localStorage 아님 — 용량)
{
  "id": "a_01HXYZ…",            // ULID (시간순 정렬 가능)
  "kind": "word" | "verse" | "atom" | "range" | "note",
  "anchor": {                   // 본문 자리를 BHSA 번호로 못 박는다 — 번역본·앱 판이 바뀌어도 그대로
    "book": 18, "ch": 32, "vs": 6,          // 개역 장절 (사람이 읽는 주소)
    "bhsa": "2021",
    "word_ids": [339210],                   // word: 낱말 하나 · atom/verse/range: 그 범위의 낱말 전부(또는 처음·끝)
    "clause_atom_ids": [589766],            // atom · range
    "clause_ids": ["499638"],               // 참고
    "span": { "from_word": 339210, "to_word": 339230 }   // range 만
  },
  "observation": "…",           // 관찰 (본 것)
  "interpretation": "…",        // 해석 (내 결론) — 관찰과 분리 (지시문 8절)
  "tags": ["전환", "반복"],      // 사용자 표시 유형 (앱의 자동 표지와 섞지 않음)
  "mark": { "style": "highlight" | "bracket" | "underline", "color": "a" },   // 본문 표시 (원문은 안 바뀜, 덧입힘)
  "milal_ref": { "relation_id": "V1-EDGE-…", "file": "MILAL_OUTPUT/…" },     // 선택: 어떤 MILAL 관계를 보며 적었나 (참조만, 수정 아님)
  "created": 1760000000000, "updated": 1760000000000,
  "deleted": false,             // 지움 표시 (동기화 충돌 때 되살리지 않게)
  "shared_id": null             // 나눔에 올렸으면 shared/{id}
}
```

- **낱말 메모는 `kind:"word"`로 자연스럽게 들어간다.** 옮기기: 처음 켤 때 `milal-study-notes`의 각 항목을 `word` 주석으로 바꾸어 `annots`에 넣고, 원 목록은 **지우지 않고** `milal-study-notes-migrated=1` 표시만 둔다. 되돌리기가 늘 가능.
- 기기 저장은 IndexedDB(수천 개도 됨). 로그인하면 문서 단위로 올리고 내린다(목록 전체 재전송 없음). 충돌은 `updated`가 큰 쪽이 이김, `deleted`는 되살리지 않음.
- `observation`과 `interpretation`을 나눈 것은 신학생이 "본 것"과 "결론"을 구별하도록 — 내보내기에서도 두 난으로 나간다.
- 내보내기(4단계): 범위의 주석을 `observation / interpretation / 자리 / MILAL 참조` 열로 Markdown·CSV. PDF는 그 뒤.

### Firestore 규칙 (초안 — 구현 때 적용)

```
match /users/{uid}/annots/{id} {
  allow read, write: if request.auth != null && request.auth.uid == uid
                     && request.resource.data.observation.size() <= 2000
                     && request.resource.data.interpretation.size() <= 2000;
}
```

## 3. 나눔(shared) 안전 점검표 — 지금 규칙(HANDOFF 2절) 기준

| 항목 | 지금 | 할 일 |
|---|---|---|
| 개인정보 노출 안내 | 올리기 전 확인 창에 "로그인한 이름과 함께 모든 사람에게 보입니다" | 사진(photo)도 올라간다 — 안내에 "프로필 사진" 추가, 또는 사진은 올리지 않기(**권장: 올리지 않음**) |
| 게시 권한 | 규칙: 로그인 + `uid == request.auth.uid` | 그대로 |
| 필드 검증 | 규칙: `m.size() <= 500` 만 | 규칙에 필드 목록 고정(`keys().hasOnly([...])`), `b` 1~39, `c`·`v` 정수, `heb`·`gl` 길이 ≤ 200, `t` 숫자 추가 |
| 글 길이 | 500자 | 그대로 |
| 삭제 권한 | 올린 사람만(`resource.data.uid == uid`) | 그대로. 관리자 삭제는 uid 목록으로(이메일 아님) |
| 수정 | 막음(`update: false`) | 그대로 |
| 읽기 | 누구나 | 그대로(비로그인 열람이 앱 원칙). 목록은 60개 제한, 더 보기 없음 |
| 신고·숨김 | 없음 | 4단계: `reports/{id}` + 관리자 숨김 플래그 |
| **적용 여부** | **규칙을 아직 콘솔에 붙여 넣지 않음** → 지금은 안전성이 "검증됨"이 아니라 "설계됨" | 목사님이 붙여 넣은 뒤, 비로그인 올리기·남의 글 삭제가 거부되는지 실제로 눌러 확인 |

보강한 규칙(붙여 넣을 때 이걸로):

```
match /shared/{id} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.keys().hasOnly(['uid','name','b','c','v','heb','gl','st','m','lex','han','t'])
    && request.resource.data.b is int && request.resource.data.b >= 1 && request.resource.data.b <= 39
    && request.resource.data.c is int && request.resource.data.v is int
    && request.resource.data.m is string && request.resource.data.m.size() <= 500
    && request.resource.data.heb.size() <= 200 && request.resource.data.gl.size() <= 200
    && request.resource.data.name.size() <= 60;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
  allow update: if false;
}
```
