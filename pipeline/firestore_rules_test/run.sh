#!/bin/sh
# Firestore 규칙 시험: 에뮬레이터를 띄우고 rules.test.mjs 를 돌린다 (Java 필요)
# 처음 한 번은 이 폴더에 npm 패키지를 받는다(package.json 참고). 규칙 파일은 저장소 루트의 firestore.rules.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; cd "$D"
[ -d node_modules ] || npm i --no-audit --no-fund
printf '{"firestore":{"rules":"../../firestore.rules"},"emulators":{"firestore":{"port":8080,"host":"127.0.0.1"}}}' > firebase.json
npx firebase emulators:exec --only firestore --project milalwv-test "node rules.test.mjs ../../firestore.rules"
