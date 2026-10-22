# 화면 시험 (Playwright, 에뮬레이션 — 실기기 아님)

준비: `npm i playwright` 후 `npx playwright install chromium`. 저장소 루트에서 `python3 -m http.server 8765` 를 띄운 뒤:

- `sh pipeline/firestore_rules_test/run.sh` — 규칙 74건 + 동기화 19건 (에뮬레이터, Java 필요)
- `node pipeline/ui_tests/stability.js` — 작업 B 저장 안정성 23건 (새로고침·재시작·자료판 변경·백업/복원·IndexedDB 없음·용량 부족)
- `node pipeline/ui_tests/mobile_f.js` — 작업 F 모바일 점검 12건 (키보드·RTL 괄호·선택 순서·글씨 크기·긴 구간·겹친 표시·표지 구별·빈/오류 상태)
- `node pipeline/ui_tests/personas_e.js <스크린샷 폴더>` — 작업 E 초급·중급·대학원 시나리오(터치 수·화면 기록, 스크린샷)
- `node pipeline/ui_tests/research_e.js <폴더>` — 반복 정렬 전환·검색식 보관함 9건
- `node pipeline/ui_tests/native_audit.js` — 작업 A-1 전수검사: 욥기 절 원자 2,977개의 V1 보존 상태(직접 2,895 · 원자료에만 39 · mother 없음 43), 잘못된 보존 표시 0
- `node pipeline/ui_tests/compare_d.js` — 5단계 본문 비교기 13건 + 초급(탭 7)·대학원(탭 5) 시나리오
- `node pipeline/ui_tests/compare_c.js <cmp_expected.json>` — 비교기 정확성(원문 연속 표현·기능어 제외 어순 대응 분리 3건 포함; Python 독립 계산과 낱말 번호·형태·횟수·연쇄·LCS 대조 3사례)·대칭·어휘 선택·성능(창22/욥32–37/욥 전체)·범위 검증·비교 메모 복원 24건. 기대값: `python3 pipeline/compare_expected.py <출력>`
- `node pipeline/ui_tests/print_f.js <출력 폴더>` — 작업 F 인쇄 시제품: 기록·비교 인쇄용 보기, A4 PDF 생성(Playwright), 인쇄 매체에서 앱 화면 숨김, 긴 비교 여러 쪽
- `node pipeline/ui_tests/query_g.js <스크린샷 폴더>` — 검색식 개편(지시 6) 28건: 첫 화면 질문·결과 흐름·단계 학습·왜 맞았나·본문 왕복·조건 변경 안내·상한/중단·왕복 보존·보관함·초급(탭 14)/대학원(탭 9)·대조 건수
- `node pipeline/ui_tests/query_h.js <스크린샷 폴더>` — 검색식 2차 안정화·마무리(지시 7·8) 34건: 첫 화면 범위 표시·전환, 보관 범위(구약 전체/책/장) 재현·옛 기록 호환, 절별 근거 보존(20,000건 상한에서도 뒤쪽 절)·독립 재계산 대조, 쉬운 말 근거·코드 펼침, 예시 안내 불일치 방지, 범위 변경 안내, 검색 메모 복원·재실행·비교, 초급 재방문(탭 15)·대학원(탭 8), 대조 건수
- `node pipeline/ui_tests/query_i.js` — Web Worker 검색(지시 9) 17건: 주 스레드·워커 엔진 결과 대조 9식(건수·지문·절별 근거·상한·중단), 보관함 재실행, 응답성(프레임 간격·탭 이동), 취소, 늦은 결과 방지, 대체 동작, 오류 표시, 메모리
- `node pipeline/ui_tests/ux_preview.js <스크린샷 폴더>` — 새 화면(index.html 기본, 지시 10) 30건 · 나머지 시험은 옛 화면(index.html?ux=0): 구조 기본/전문 보기·연구 시작 화면이 기존 기능에 연결, 운영 index.html 변화 없음
- `node pipeline/ui_tests/query_cards.js <스크린샷 폴더>` — 쉬운 검색(조건 카드) 19건: 카드 실행 = 같은 식 엔진 실행, 예시 식 왕복 뜻 보존, 다른 낱말 # 자동, 고급 검색 오가기, 욥기 구간, 본문에서 검색 시작·돌아오기, 장면 도구 뺀 곳 설명
- `node pipeline/ui_tests/study_nb.js <스크린샷 폴더>` — 본문 연구 노트 26건: 도구 문구(찾은 규칙·판단·뺀 곳), 비교 요약 사실/판단, 연구 만들기·메모 자동 모음·담기·칸 저장·제목 바꾸면 표시도·Markdown(설교 준비용)·백업 병합·지우기, 띠·휴대전화 노트 창·PC 옆 노트, 장르 표·질문 카드 실제 결과
- `node pipeline/ui_tests/research_tabs.js <스크린샷 폴더>` — 연구 첫 화면 세 탭(흐름 관찰·낱말·문법 찾기·지도에서 보기)·그림 칸·자유 시작·지도 16건
- `node pipeline/ui_tests/verse_range.js <스크린샷 폴더>` — 장:절 범위 10건(절까지 정하기, 장 넘는 절 범위, 도구·검색·워커·보관 범위)
