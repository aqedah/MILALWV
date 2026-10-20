// 이전 스크립트 시험: 옛 글(hidden 없음, photo 있음) 2건 + 새 글 1건 → dry-run 은 안 바꾸고, apply 는 hidden:false·photo 삭제, 새 글은 그대로
import { initializeTestEnvironment } from "@firebase/rules-unit-testing"; import { readFileSync } from "node:fs"; import { execSync } from "node:child_process";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
const env = await initializeTestEnvironment({ projectId: "milalwv-test", firestore: { rules: readFileSync(process.argv[2] || "../../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
await env.clearFirestore();   /* 앞선 규칙·동기화 시험의 문서를 비운다 */
await env.withSecurityRulesDisabled(async c => { const db = c.firestore(); await setDoc(doc(db, "shared/old1"), { uid: "u", name: "A", b: 1, c: 1, v: 1, heb: "x", gl: "y", st: 0, m: "m", lex: "", han: "", t: 1, photo: "http://x" }); await setDoc(doc(db, "shared/old2"), { uid: "u", name: "A", b: 1, c: 1, v: 1, heb: "x", gl: "y", st: 0, m: "m", lex: "", han: "", t: 2 }); await setDoc(doc(db, "shared/new1"), { uid: "u", name: "A", b: 1, c: 1, v: 1, heb: "x", gl: "y", st: 0, m: "m", lex: "", han: "", t: 3, hidden: true }); });
// 스크립트는 pipeline/ 에 있고 firebase-admin 은 이 폴더의 node_modules 에 있으므로, 시험용 사본을 이 폴더에 두고 돌린다
const { copyFileSync } = await import("node:fs"); copyFileSync("../firestore_migrate_shared_hidden.mjs", "./_migrate_under_test.mjs");
const run = (args) => execSync(`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node ./_migrate_under_test.mjs ${args} --project milalwv-test`, { encoding: "utf8" });
const dry = run(""); const read = async () => { const o = {}; await env.withSecurityRulesDisabled(async c => { const s = await getDocs(collection(c.firestore(), "shared")); s.forEach(d => o[d.id] = d.data()); }); return o; };
let S = await read(); const okDry = /DRY_RUN/.test(dry) && /"need_hidden_false": 2/.test(dry) && S.old1.hidden === undefined && "photo" in S.old1;
run("--apply"); S = await read();
const okApply = S.old1.hidden === false && !("photo" in S.old1) && S.old2.hidden === false && S.new1.hidden === true;
const again = run(""); const okIdem = /"need_hidden_false": 0/.test(again) && /"photo_fields_to_delete": 0/.test(again);
// 적용 뒤 새 규칙으로 익명 공개 조회에 old1·old2 가 보이고 new1(숨김)은 안 보임
const { query, where } = await import("firebase/firestore"); const N = env.unauthenticatedContext().firestore(); const pub = await getDocs(query(collection(N, "shared"), where("hidden", "==", false))); const ids = pub.docs.map(d => d.id).sort();
const okRules = JSON.stringify(ids) === JSON.stringify(["old1", "old2"]);
console.log({ okDry, okApply, okIdem, okRules }); await env.cleanup(); process.exit(okDry && okApply && okIdem && okRules ? 0 : 1);
