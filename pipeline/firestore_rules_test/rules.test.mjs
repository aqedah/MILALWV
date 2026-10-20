// Firestore 규칙 허용·거부 시험 (에뮬레이터). 실행: pipeline/firestore_rules_test/run.sh
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "milalwv-test", firestore: { rules: readFileSync(process.argv[2] || "firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const A = env.authenticatedContext("uidA", { name: "A" }).firestore(), B = env.authenticatedContext("uidB").firestore(), N = env.unauthenticatedContext().firestore();
const results = []; const t = async (name, p, expectOk) => { let ok; try { await p; ok = true; } catch (e) { ok = false; } const pass = ok === expectOk; results.push((pass ? "PASS" : "FAIL") + " " + name + (pass ? "" : ` (기대 ${expectOk ? "허용" : "거부"}, 실제 ${ok ? "허용" : "거부"})`)); };
const annot = (over = {}) => ({ id: "a1", kind: "atom", key: "a:589766", anchor: { book: 18, ch: 32, vs: 6, bhsa: "2021", clause_atom_ids: [589766], clause_ids: ["499638"], word_ids: [339210], heb: "x" }, observation: "obs", interpretation: "int", tags: ["전환"], created: 1, updated: 1, deleted: false, rev: 1, server_at: serverTimestamp(), ...over });
// 관리자 문서는 규칙을 우회해 심는다(콘솔에서 만드는 것과 같음)
await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), "admins/uidAdmin"), { role: "admin" }); });
const ADM = env.authenticatedContext("uidAdmin").firestore();

// ---- 낱말 메모 동기화 (기존) ----
await t("낱말 메모: 본인 쓰기·읽기", (async () => { await setDoc(doc(A, "users/uidA/study/notes"), { list: [{ t: 1 }], at: 1 }); await getDoc(doc(A, "users/uidA/study/notes")); })(), true);
await t("낱말 메모: 남의 것 읽기 거부", getDoc(doc(B, "users/uidA/study/notes")), false);
await t("낱말 메모: 비로그인 쓰기 거부", setDoc(doc(N, "users/uidA/study/notes"), { list: [], at: 1 }), false);
await t("낱말 메모: 모르는 칸 거부", setDoc(doc(A, "users/uidA/study/notes"), { list: [], at: 1, extra: 1 }), false);
// ---- 주석 ----
await t("주석: 본인 만들기", setDoc(doc(A, "users/uidA/annots/a1"), annot()), true);
await t("주석: 본인 읽기", getDocs(collection(A, "users/uidA/annots")), true);
await t("주석: 남이 읽기 거부", getDocs(collection(B, "users/uidA/annots")), false);
await t("주석: 남이 만들기 거부", setDoc(doc(B, "users/uidA/annots/a2"), annot({ id: "a2" })), false);
await t("주석: 비로그인 만들기 거부", setDoc(doc(N, "users/uidA/annots/a3"), annot({ id: "a3" })), false);
await t("주석: id 불일치 거부", setDoc(doc(A, "users/uidA/annots/a4"), annot({ id: "zzz" })), false);
await t("주석: 모르는 칸 거부(와일드카드 우회 없음)", setDoc(doc(A, "users/uidA/annots/a5"), annot({ id: "a5", hack: 1 })), false);
await t("주석: 관찰 2000자 초과 거부", setDoc(doc(A, "users/uidA/annots/a6"), annot({ id: "a6", observation: "x".repeat(2001) })), false);
await t("주석: BHSA 판 다름 거부", setDoc(doc(A, "users/uidA/annots/a7"), annot({ id: "a7", anchor: { ...annot().anchor, bhsa: "2017" } })), false);
await t("주석: 책 번호 범위 밖 거부", setDoc(doc(A, "users/uidA/annots/a8"), annot({ id: "a8", anchor: { ...annot().anchor, book: 40 } })), false);
await t("주석: 처음부터 deleted=true 거부", setDoc(doc(A, "users/uidA/annots/a9"), annot({ id: "a9", deleted: true })), false);
await t("주석: rev 1 아닌 만들기 거부", setDoc(doc(A, "users/uidA/annots/a10"), annot({ id: "a10", rev: 5 })), false);
await t("주석: 기기 시각을 server_at 에 넣기 거부", setDoc(doc(A, "users/uidA/annots/a11"), annot({ id: "a11", server_at: new Date() })), false);
await t("주석: 본인 고치기(rev 1→2)", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int2", updated: 2, rev: 2 })), true);
await t("주석: 낡은 기기(rev 1 기준 → 2)의 덮어쓰기 거부 [두 기기 동시 수정]", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "stale", updated: 9, rev: 2 })), false);
await t("주석: rev 건너뛰기(2→4) 거부", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "x", updated: 3, rev: 4 })), false);
await t("주석: 다시 읽고 합친 뒤 rev 3 으로 고치기", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int2 / 충돌 사본: stale", updated: 3, rev: 3 })), true);
await t("주석: 고치기에서 자리(anchor) 바꾸기 거부", setDoc(doc(A, "users/uidA/annots/a1"), annot({ anchor: { ...annot().anchor, vs: 7 }, updated: 4, rev: 4 })), false);
await t("주석: 지움 표시(deleted=true, rev 4)", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int2", updated: 5, rev: 4, deleted: true })), true);
await t("주석: 지운 것 되살리기(deleted true→false) 거부", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int2", updated: 6, rev: 5, deleted: false })), false);
await t("주석: 오프라인 낡은 기기(rev 3 기준)의 되살리기 거부", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "old", updated: 2, rev: 4, deleted: false })), false);
await t("주석: 남이 지우기 거부", deleteDoc(doc(B, "users/uidA/annots/a1")), false);
await t("주석: 본인도 진짜 삭제 거부(묘비 유지)", deleteDoc(doc(A, "users/uidA/annots/a1")), false);
await t("주석: 다른 하위 경로(users/uidA/anything) 거부", setDoc(doc(A, "users/uidA/anything/x"), { a: 1 }), false);
// ---- 나눔 ----
const post = (over = {}) => ({ uid: "uidA", name: "A", b: 1, c: 1, v: 1, heb: "x", gl: "y", st: 0, m: "memo", lex: "", han: "", t: 1, ...over });
await t("나눔: 본인 이름으로 올리기", setDoc(doc(A, "shared/s1"), post()), true);
await t("나눔: 익명 열람", getDocs(collection(N, "shared")), true);
await t("나눔: 비로그인 올리기 거부", setDoc(doc(N, "shared/s2"), post()), false);
await t("나눔: 남의 uid 로 올리기 거부", setDoc(doc(B, "shared/s3"), post()), false);
await t("나눔: 사진 칸(photo) 거부", setDoc(doc(A, "shared/s4"), post({ photo: "http://x" })), false);
await t("나눔: 501자 거부", setDoc(doc(A, "shared/s5"), post({ m: "x".repeat(501) })), false);
await t("나눔: 고치기 거부(본인도)", updateDoc(doc(A, "shared/s1"), { m: "edited" }), false);
await t("나눔: 관리자가 내용 고치기 거부(hidden 만 됨)", updateDoc(doc(ADM, "shared/s1"), { m: "edited" }), false);
await t("나눔: 관리자가 숨기기(hidden=true)", updateDoc(doc(ADM, "shared/s1"), { hidden: true }), true);
await t("나눔: 일반 사용자가 숨기기 거부", updateDoc(doc(B, "shared/s1"), { hidden: true }), false);
await t("신고: 로그인한 사람이 만들기", setDoc(doc(B, "reports/r1"), { shared_id: "s1", reason: "부적절", uid: "uidB", t: serverTimestamp() }), true);
await t("신고: 비로그인 거부", setDoc(doc(N, "reports/r2"), { shared_id: "s1", reason: "x", uid: "uidB", t: serverTimestamp() }), false);
await t("신고: 300자 초과 거부", setDoc(doc(B, "reports/r3"), { shared_id: "s1", reason: "x".repeat(301), uid: "uidB", t: serverTimestamp() }), false);
await t("신고: 일반 사용자 읽기 거부", getDocs(collection(B, "reports")), false);
await t("신고: 관리자 읽기", getDocs(collection(ADM, "reports")), true);
await t("관리자 문서: 남이 쓰기 거부", setDoc(doc(B, "admins/uidB"), { role: "admin" }), false);
await t("나눔: 다른 사용자 삭제 거부", deleteDoc(doc(B, "shared/s1")), false);
await t("나눔: 관리자 삭제", (async () => { await setDoc(doc(A, "shared/s9"), post()); await deleteDoc(doc(ADM, "shared/s9")); })(), true);
await t("나눔: 본인 삭제", deleteDoc(doc(A, "shared/s1")), true);
await t("그 밖: 임의 모음 거부", setDoc(doc(A, "other/x"), { a: 1 }), false);
await env.cleanup();
console.log(results.join("\n")); const bad = results.filter(r => r.startsWith("FAIL")).length; console.log(bad ? `\n실패 ${bad}` : "\n모두 기대대로"); process.exit(bad ? 1 : 0);
