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

---

## 4. 동기화 설계 (2026-10-20, 작업 E) — `rev` + 서버 시각, 묘비 영구

### 왜 "updated가 큰 쪽이 이김"으로는 안 되나
- 기기 시계가 틀리면(몇 분 앞선 휴대전화) 낡은 글이 새 글을 덮는다.
- 두 기기가 같은 메모를 동시에 고치면 한쪽 수정이 소리 없이 사라진다.
- 오프라인에서 지운 메모가, 다른 기기의 오래된 복사본이 올라오면서 되살아난다.

### 규칙 (firestore.rules, 에뮬레이터 48건 통과)
| 항목 | 규칙 | 막는 것 |
|---|---|---|
| `rev` | 만들 때 1, 고칠 때마다 **정확히 +1** | 낡은 기기(서버보다 뒤처진 rev 기준)의 덮어쓰기, 건너뛰기 |
| `server_at` | 반드시 `request.time`(서버 시각) | 기기 시계 조작·오차 |
| `deleted` | true → false **금지** | 지운 메모의 재등장(오프라인 낡은 복사본 포함) |
| 진짜 삭제 | **금지**(`allow delete: if false`) | 묘비가 사라져 다른 기기에서 되살아나는 것 |
| 고정 칸 | `anchor`·`created`·`kind`는 고치지 못함 | 메모가 다른 자리로 옮겨 붙는 것 |

### 클라이언트 절차 (구현 예정 — 운영 규칙 승인·배포 뒤 활성화)
1. 기기 저장(IndexedDB)에는 `rev`, `device`가 이미 들어간다(지금 구현됨). 서버 복사본의 `rev`를 `srv_rev`로 함께 둔다.
2. **올리기**: 트랜잭션으로 서버 문서를 읽어 `server.rev == 내 srv_rev`이면 `rev = server.rev + 1`, `server_at = serverTimestamp()`로 쓴다. 다르면(다른 기기가 먼저 고침) 3으로.
3. **합치기**: 칸별로 — 내가 바꾼 칸과 서버가 바꾼 칸이 다르면 둘 다 반영. 같은 칸을 둘 다 바꿨으면 서버 값을 두고 내 값을 그 칸 끝에 `⟪충돌 사본 · 기기 ID · 시각⟫`으로 덧붙인다(사람이 고르게; 아무것도 잃지 않음). `deleted`는 어느 쪽이든 true면 true. 그 뒤 `rev = server.rev + 1`로 다시 쓴다.
4. **내려받기**: `server.rev > srv_rev`인 문서만 기기에 반영. `deleted=true`는 기기에서도 묘비로 유지(목록에서 숨김).
5. 묘비 정리는 하지 않는다(개수가 문제 되면 1년 뒤 관리자 일괄 정리를 따로 설계).

### 낱말 메모(옛 저장)
그대로 둔다. `users/{uid}/study/notes` 목록 통째 동기화 유지(규칙에 칸 고정·500개 제한만 추가). 새 주석으로 옮기는 일은 동기화를 켤 때 사람이 '옮기기' 단추를 눌러서만.

### 나눔 운영
- 올리기 전 안내: "로그인 없이 누구나 볼 수 있는 공개 글, 사진 안 올라감, 내려도 이미 본 사람 화면은 못 지움".
- 신고: 로그인한 사람이 `reports/{id}`(이유 300자). 읽기는 관리자만.
- 관리자: `admins/{uid}` 문서(콘솔에서만 만듦). 관리자는 `shared/{id}.hidden`만 고칠 수 있고(내용 수정 불가), 삭제도 할 수 있다. 앱은 `hidden` 글을 거른다(관리자에게는 흐리게 보임).
- 기존 글의 사진 칸: 규칙 게시 전이라 글이 없을 것. 있으면 콘솔에서 `photo` 필드 삭제.

---

## 5. 백업·복원 (2026-10-20, 작업 B) — `MILALWV-BACKUP-1`

Markdown·CSV는 읽기용이고, **JSON 백업**은 기록을 그대로 다시 넣기 위한 것이다(기록 탭 → 'JSON 백업 내려받기' / '복원').

```jsonc
{ "schema":"MILALWV-BACKUP-1", "exported_at":"…", "app_data_version":"<STUDY_V>", "bhsa":"2021", "device":"<기기 ID>",
  "counts":{"annots":n,"annots_deleted":k,"word_notes":m},
  "annots":[ …주석 전부, 묘비(deleted:true) 포함, 칸 그대로(id·rev·anchor·observation·interpretation·tags·style·color·milal_ref·created·updated·device)… ],
  "word_notes":[ …낱말 메모 목록 그대로… ] }
```

복원 규칙(`restorePlan` → 미리 보기 → `restoreApply`): 들어온 기록마다
| 상황 | 처리 |
|---|---|
| 기기에 없는 id | 넣음 |
| 기기에 있고 **기기 쪽이 지운 것**(묘비) | 되살리지 않음(건너뜀) |
| 들어온 rev > 기기 rev | 고침 |
| 들어온 rev < 기기 rev | 건너뜀(기기 것이 더 새것) |
| rev 같고 내용 같음 | 아무것도 안 함(재복원은 멱등) |
| rev 같고 내용 다름 | 기존 것 그대로 두고, 들어온 것을 **충돌 사본**(새 id, 태그 `복원충돌`, 관찰 머리에 ⟪복원 충돌 사본 · 원본 id · 때⟫)으로 보존 — 사람이 고른다 |
| 형식 이상·백업 안 id 중복 | 건너뛰고 미리 보기에 사유 |
낱말 메모는 `t`로 맞춰 없는 것만 넣는다. 복원은 기존 기록을 지우거나 덮어써 없애지 않는다.

### 저장소가 안 될 때
- IndexedDB를 못 열면(사생활 모드·차단) 메모리 + `localStorage["milal-annots-fallback"]`로 버티고, 기록 탭에 경고와 백업 권유를 띄운다.
- 쓰기에서 용량 초과(QuotaExceededError)가 나면 "저장 공간이 부족합니다 … JSON 백업" 안내로 실패시키고, 화면 목록에는 넣지 않는다(조용한 유실 없음). 저장 실패 때 기록 객체의 rev·updated는 원래대로 되돌린다.

### 시험 (에뮬레이션, Playwright) — 18건 통과
새로고침 / 다른 책 다녀오기 / 브라우저 재시작(같은 프로필) / 자료판(STUDY_V) 바뀜 / 낱말 메모·주석 공존 / 백업 내용 / 지우고 복원 / 재복원 멱등 / 옛 판 건너뜀 / 새 판 반영 / 충돌 사본 / 묘비 유지 / 깨진 항목·중복·다른 규격 / id 중복 없음 / IndexedDB 없음 / 용량 부족. (네트워크 끊김·기기 간 충돌·오프라인 삭제·낡은 기록 재업로드는 동기화(6절) 시험에서.)

