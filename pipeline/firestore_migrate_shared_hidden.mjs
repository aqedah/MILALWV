// 나눔(shared) 옛 글에 `hidden:false` 채우기 — 새 규칙은 hidden 칸이 없는 글을 공개 조회에서 제외하므로, 규칙 게시 전(또는 직후)에 한 번 돌린다.
// 관리자 SDK 로 돌리므로 규칙과 무관하게 쓸 수 있다. 기본은 **미리 보기(dry-run)** — 실제로 쓰려면 --apply.
// 준비: npm i firebase-admin ; 서비스 계정 키 JSON 을 받아 GOOGLE_APPLICATION_CREDENTIALS=<경로> 로 지정(키 파일은 저장소에 넣지 않는다)
// 실행: node pipeline/firestore_migrate_shared_hidden.mjs [--apply] [--project milalwv]
// 에뮬레이터 시험: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node pipeline/firestore_migrate_shared_hidden.mjs --apply --project milalwv-test
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
const apply = process.argv.includes("--apply"); const pi = process.argv.indexOf("--project"); const projectId = pi > 0 ? process.argv[pi + 1] : "milalwv";
initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { credential: applicationDefault(), projectId });
const db = getFirestore();
const snap = await db.collection("shared").get(); let need = 0, photo = 0, bad = [];
const batch = db.batch();
for (const d of snap.docs) { const x = d.data();
  const upd = {};
  if (typeof x.hidden !== "boolean") { upd.hidden = false; need++; }          // 옛 글: hidden 없음 → false (보이는 글로 둔다; 숨길 글은 관리자가 앱에서 숨김)
  if ("photo" in x) { upd.photo = FieldValue.delete(); photo++; }              // 옛 규칙 때 올라간 사진 칸은 지운다(개인정보, 새 규칙에서 허용 칸 아님)
  if (typeof x.uid !== "string" || typeof x.m !== "string") bad.push(d.id);     // 새 규칙의 필수 칸이 없는 글(있다면 손으로 본다 — 자동으로 고치지 않음)
  if (Object.keys(upd).length && apply) batch.update(d.ref, upd); }
console.log(JSON.stringify({ project: projectId, emulator: !!process.env.FIRESTORE_EMULATOR_HOST, mode: apply ? "APPLY" : "DRY_RUN", shared_docs: snap.size, need_hidden_false: need, photo_fields_to_delete: photo, docs_missing_required_fields: bad }, null, 1));
if (apply && (need || photo)) { await batch.commit(); console.log("적용함"); } else if (!apply) console.log("미리 보기만 했음 — 실제로 쓰려면 --apply");
