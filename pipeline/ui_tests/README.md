# 화면 시험 (Playwright, 에뮬레이션 — 실기기 아님)

준비: `npm i playwright` 후 `npx playwright install chromium`. 저장소 루트에서 `python3 -m http.server 8765` 를 띄운 뒤:

- `sh pipeline/firestore_rules_test/run.sh` — 규칙 74건 + 동기화 19건 (에뮬레이터, Java 필요)
- `node pipeline/ui_tests/stability.js` — 작업 B 저장 안정성 18건 (새로고침·재시작·자료판 변경·백업/복원·IndexedDB 없음·용량 부족)
