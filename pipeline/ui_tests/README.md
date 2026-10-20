# 화면 시험 (Playwright, 에뮬레이션 — 실기기 아님)

준비: `npm i playwright` 후 `npx playwright install chromium`. 저장소 루트에서 `python3 -m http.server 8765` 를 띄운 뒤:

- `sh pipeline/firestore_rules_test/run.sh` — 규칙 74건 + 동기화 19건 (에뮬레이터, Java 필요)
- `node pipeline/ui_tests/stability.js` — 작업 B 저장 안정성 18건 (새로고침·재시작·자료판 변경·백업/복원·IndexedDB 없음·용량 부족)
- `node pipeline/ui_tests/mobile_f.js` — 작업 F 모바일 점검 12건 (키보드·RTL 괄호·선택 순서·글씨 크기·긴 구간·겹친 표시·표지 구별·빈/오류 상태)
- `node pipeline/ui_tests/personas_e.js <스크린샷 폴더>` — 작업 E 초급·중급·대학원 시나리오(터치 수·화면 기록, 스크린샷)
