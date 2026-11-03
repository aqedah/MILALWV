# TBESH 이름 설명 한국어 옮기기 지침

입력: nm_in/inNN.json — {"names": {"H6872C": "스롤", ...}, "items": [{"k": "H0001I", "name": "~의 아버지", "en": "영어 설명"}, ...]}
출력: nm_out/outNN.json — [{"k": "H0001I", "ko": "우리말 설명"}, ...]. **items 수와 같고 순서도 같아야 한다.**

`en`은 Tyndale House가 정리한 성경 인물·지명 정보다. 성경 구절 표시는 이미 우리말 약어(삼상 9:1)로 바꿔 두었으니 그대로 둔다.

## 꼭 지킬 것
- `(H6872C)` 같은 괄호 번호는 **반드시 그대로** 둔다(앱에서 연결 고리로 쓴다). 번호 앞의 이름은 `names` 표에 있는 우리말 이름으로 바꾼다: "Zeror (H6872C)" → "스롤 (H6872C)". 표에 없는 번호는 개역개정 표기로 옮긴다.
- 사람·땅·지파 이름은 개역개정 표기. 지파: 유다·레위·베냐민·아셀·므낫세·갓·에브라임·시므온·르우벤·잇사갈·납달리·스불론·단. 민족: 애굽 사람·아랍 사람·에돔 사람·암몬 사람·모압 사람·구스 사람·미디안 사람·아람 사람·고멜 사람·헬라 사람·가나안 사람.
- 시대 이름은 이렇게 통일한다:
  - the Patriarchs → 족장 시대
  - Egypt and Wilderness → 출애굽·광야 시대
  - Israel before the Monarchy → 왕정 이전(사사) 시대
  - United Monarchy → 통일 왕국 시대
  - Divided Monarchy → 분열 왕국 시대
  - Exile and Return → 포로·귀환 시대
- 정형 문장은 이렇게 옮긴다(끝은 '-이다/-임' 대신 명사형으로 짧게):
  - "A man of the tribe of Levi living at the time of Divided Monarchy, first mentioned at 대상 6:21" → "분열 왕국 시대에 산 레위 지파 사람. 대상 6:21에 처음 나옴"
  - "A man living at the time of Exile and Return, only mentioned at 느 11:14" → "포로·귀환 시대에 산 사람. 느 11:14에만 나옴"
  - "A woman …" → "…여인", "A king of the tribe of Judah …" → "…유다 지파 출신 왕", "A prophet …" → "…예언자", "A Judge …" → "…사사"
  - "son of: A (H1), B (H2)" → "아버지·어머니: A (H1), B (H2)" 가 아니라 **"A (H1)와 B (H2)의 아들"** 처럼 자연스럽게. "daughter of" → "…의 딸", "brother of" → "…의 형제", "sister of" → "…의 자매", "half-brother of" → "…의 이복 형제", "married to" → "배우자: …", "father of" → "자녀: …", "mother of" → "자녀: …", "husband of"/"wife of" → "…의 남편/아내", "progenitors of" → "…의 조상".
  - "also called X at 대상 9:35" → "대상 9:35에서는 X라고도 불림". "(Ketiv: Jeuel; KJV: Jehiel)" → "(케티브: 여우엘, KJV: 여히엘)".
  - "Another name of a.vi-al.von (אֲבִי־עַלְבוֹן "Abi-albon" H0045)" → "아비알본 (אֲבִי־עַלְבוֹן H0045)의 다른 이름". 히브리어 글자는 그대로, 라틴 음역(a.vi-al.von)은 지운다.
  - "Also named: …" → "다른 이름: …", "Combined with …" → "…과 합쳐 쓰임", "Aramaic of …" → "…의 아람어", "Also means: …" → "다른 뜻: …".
  - "(?)" 는 "(?)" 그대로.
- 항목 사이는 "; " 대신 ". " 또는 " · " 로 자연스럽게 나눈다.
- 영어를 남기지 않는다(KJV·NIV 같은 역본 이름과 H번호, 히브리어는 예외).
- 내용을 줄이거나 덧붙이지 않는다.

## 작업 방법
- 파이썬으로 입력을 읽고, 번역을 코드 안에 목록으로 적어 출력 파일을 만든다. 끝에 `len(items)==len(out)`, k 순서 일치, 각 ko 안의 `(H…)` 번호 집합이 en의 것과 같은지 검사하고 틀리면 고친다.
