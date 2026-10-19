# 스트롱 히브리어 사전 한국어 옮기기 지침

입력: inN.json  {"312": {"s": 유래(source), "m": 뜻(meaning), "u": KJV 번역어(usage)}, ...}
출력: outN.json 같은 키, 같은 세 칸 {"s","m","u"} — 모두 한국어로. 빈 칸은 빈 칸 그대로.

## 공통
- 교회 성도가 읽을 쉬운 우리말. 전문 용어는 꼭 필요할 때만.
- "H309" 같은 번호는 반드시 그대로 둔다(앱에서 연결 고리로 쓴다).
- 히브리어 글자는 그대로 둔다.
- 사람·땅 이름은 개역개정 표기(아브라함, 예루살렘, 므낫세, 에브라임, 블레셋 등).
- × 와 + 기호는 그대로 둔다(×는 '다른 말과 묶여서 그렇게 옮겨짐', +는 '다른 낱말과 합쳐 옮김'을 뜻하는 원래 기호).

## s (유래) 정형 표현
- a primitive root → 기본 어근
- a primitive word → 기본 낱말
- a primitive particle → 기본 불변사
- from H309 → H309에서 유래
- from the same as H809 → H809와 같은 어근에서 유래
- plural of H433 → H433의 복수형
- feminine of H808 → H808의 여성형
- (Aramaic) corresponding to H2088 → H2088에 해당하는 아람어
- or אָהֵב → 또는 אָהֵב
- prolonged from / contracted from / intensive from → H…을 늘인 꼴 / 줄인 꼴 / 강조형
- of foreign origin → 외래어
- probably / perhaps / apparently → 아마 / 어쩌면 / 보아하니
- 나머지는 자연스러운 우리말로. 끝의 세미콜론은 지운다.

## m (뜻)
- properly, X; generally, Y → 본래 'X'; 일반적으로 'Y'
- 핵심 뜻은 작은따옴표 '…'로 감싼다.
- 이름 항목: "Abram, the original name of Abraham" → 아브람, 아브라함의 원래 이름
- 의미를 줄이거나 덧붙이지 말고 다 옮긴다.

## u (KJV 번역어)
- 영어 번역어 하나하나를 우리말 낱말로 옮긴다. 쉼표 구분과 순서 유지.
- 괄호 표기는 뜻이 통하게 바꾼다: "(an-) other man" → "(또) 다른 (사람)", "(be-) love(-d, -ly, -r)" → "사랑하다(사랑받다, 사랑스럽게, 사랑하는 자)".
- 같은 우리말이 겹치면 한 번만.
- 이름 항목의 u가 이름 하나면 개역개정 표기로.

## 작업 방법
- 100개씩 끊어 옮기고 파이썬으로 outN_partK.json에 저장한 뒤, 끝에 합쳐 outN.json을 만든다.
- 끝나면 `python3 check.py N` 을 돌려 빠진 키·영어가 남은 칸이 없는지 확인하고 고친다.
