// Firestore 규칙 허용·거부 시험 (에뮬레이터). 실행: pipeline/firestore_rules_test/run.sh
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, updateDoc } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "milalwv-test", firestore: { rules: readFileSync(process.argv[2] || "firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const A = env.authenticatedContext("uidA", { name: "A" }).firestore(), B = env.authenticatedContext("uidB").firestore(), N = env.unauthenticatedContext().firestore();
const results = []; const t = async (name, p, expectOk) => { let ok; try { await p; ok = true; } catch (e) { ok = false; } const pass = ok === expectOk; results.push((pass ? "PASS" : "FAIL") + " " + name + (pass ? "" : ` (기대 ${expectOk ? "허용" : "거부"}, 실제 ${ok ? "허용" : "거부"})`)); };
const annot = (over = {}) => ({ id: "a1", kind: "atom", key: "a:589766", anchor: { book: 18, ch: 32, vs: 6, bhsa: "2021", clause_atom_ids: [589766], clause_ids: ["499638"], word_ids: [339210], heb: "x" }, observation: "obs", interpretation: "int", tags: ["전환"], created: 1, updated: 1, deleted: false, ...over });

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
await t("주석: 본인 고치기(해석 바꿈, updated 증가)", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int2", updated: 2 })), true);
await t("주석: 고치기에서 자리(anchor) 바꾸기 거부", setDoc(doc(A, "users/uidA/annots/a1"), annot({ anchor: { ...annot().anchor, vs: 7 }, updated: 3 })), false);
await t("주석: 고치기에서 updated 되돌리기 거부", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int3", updated: 1 })), false);
await t("주석: 지움 표시(deleted=true)", setDoc(doc(A, "users/uidA/annots/a1"), annot({ interpretation: "int2", updated: 4, deleted: true })), true);
await t("주석: 남이 지우기 거부", deleteDoc(doc(B, "users/uidA/annots/a1")), false);
await t("주석: 본인 진짜 삭제", deleteDoc(doc(A, "users/uidA/annots/a1")), true);
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
await t("나눔: 다른 사용자 삭제 거부", deleteDoc(doc(B, "shared/s1")), false);
await t("나눔: 본인 삭제", deleteDoc(doc(A, "shared/s1")), true);
await t("그 밖: 임의 모음 거부", setDoc(doc(A, "other/x"), { a: 1 }), false);
await env.cleanup();
console.log(results.join("\n")); const bad = results.filter(r => r.startsWith("FAIL")).length; console.log(bad ? `\n실패 ${bad}` : "\n모두 기대대로"); process.exit(bad ? 1 : 0);
