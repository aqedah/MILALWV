#!/bin/sh
# Firestore 규칙 시험: 에뮬레이터를 띄우고 rules.test.mjs 를 돌린다 (Java 필요)
# 준비(한 번): npm i firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
set -e
cd "$(dirname "$0")/../.."
printf '{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8080}}}' > /tmp/milalwv-firebase.json
npx firebase emulators:exec --only firestore --project milalwv-test --config /tmp/milalwv-firebase.json "node pipeline/firestore_rules_test/rules.test.mjs firestore.rules"
