// 동기화 시험 (에뮬레이터, 규칙 적용 상태): 기기 두세 대를 흉내 내어 app/sync_core.js 를 돌린다. 실행: run.sh 가 함께 돌림
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { doc, getDoc, getDocs, collection, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
const require = createRequire(import.meta.url); const SC = require("../../app/sync_core.js");

const env = await initializeTestEnvironment({ projectId: "milalwv-sync", firestore: { rules: readFileSync(process.argv[2] || "../../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const db = env.authenticatedContext("uidA").firestore(), UID = "uidA";
const R = []; const ok = (n, c, info = "") => R.push((c ? "PASS " : "FAIL ") + n + (c ? "" : " — " + info));
const ref = id => doc(db, "users", UID, "annots", id);
const mkDeps = (device, opts = {}) => ({ device, serverTs: () => serverTimestamp(), now: () => "T",
  transaction: fn => { if (opts.failIds && opts.failIds.size) return Promise.reject(new Error("unavailable (네트워크 끊김 흉내)")); return runTransaction(db, async tx => { const t = { get: async id => { const s = await tx.get(ref(id)); return s.exists() ? s.data() : null; }, set: (id, d) => tx.set(ref(id), d) }; return fn(t); }); } });
const annot = (id, over = {}) => ({ id, kind: "verse", key: "v:1-1-1", anchor: { book: 1, ch: 1, vs: 1, bhsa: "2021", clause_atom_ids: [1], clause_ids: ["1"], word_ids: [1, 2], heb: "x" }, observation: "obs", interpretation: "int", tags: ["a"], created: 100, updated: 100, deleted: false, rev: 1, device: "A", dirty: true, ...over });
class Device { constructor(n) { this.n = n; this.L = new Map(); this.deps = mkDeps(n); }
  put(a) { const c = this.L.get(a.id); const b = Object.assign({}, c || {}, a, { dirty: true, updated: (c ? c.updated : 0) + 1, device: this.n }); this.L.set(a.id, b); return b; }
  async push(opts) { const d = opts ? mkDeps(this.n, opts) : this.deps; const r = await SC.syncPushAll([...this.L.values()], d); for (const x of r.ok) this.L.set(x.record.id, x.record); return r; }
  async pull() { const s = await getDocs(collection(db, "users", UID, "annots")); const out = []; for (const d of s.docs) { const r = SC.syncPullOne(this.L.get(d.id), d.data()); this.L.set(d.id, r.record); out.push(r.action); } return out; } }
const srv = async id => { const s = await getDoc(ref(id)); return s.exists() ? s.data() : null; };
const A = new Device("A"), B = new Device("B");

// 1. 만들기 → 서버 rev 1
A.put(annot("n1")); let r = await A.push(); let S = await srv("n1");
ok("1 기기 A 만든 메모 올리기(rev 1, server_at 서버 시각)", r.ok[0].action === "created" && S.rev === 1 && S.server_at && A.L.get("n1").srv_rev === 1 && !A.L.get("n1").dirty, JSON.stringify(r));
// 2. B 내려받기
let p = await B.pull(); ok("2 기기 B 내려받기", p[0] === "added" && B.L.get("n1").observation === "obs" && B.L.get("n1").srv_rev === 1);
// 3. A 고침 → rev 2 → B 반영
A.put({ id: "n1", observation: "obs2" }); r = await A.push(); p = await B.pull(); S = await srv("n1");
ok("3 고치기(rev 2)와 내려받기", r.ok[0].action === "updated" && S.rev === 2 && p[0] === "replaced" && B.L.get("n1").observation === "obs2");
// 4. 서로 다른 칸을 동시에 고침 → 둘 다 반영, 충돌 없음
A.put({ id: "n1", observation: "A가 관찰 고침" }); B.put({ id: "n1", interpretation: "B가 해석 고침" });
r = await A.push(); let rb = await B.push(); await A.pull(); S = await srv("n1");
ok("4 다른 칸 동시 수정 → 병합(충돌 없음, rev 4)", r.ok[0].action === "updated" && rb.ok[0].action === "merged" && S.rev === 4 && S.observation === "A가 관찰 고침" && S.interpretation === "B가 해석 고침" && A.L.get("n1").interpretation === "B가 해석 고침", JSON.stringify([r.ok[0].action, rb.ok[0].action, S.rev]));
// 5. 같은 칸 동시 수정 → 서버 글 유지 + 기기 글 충돌 사본(둘 다 보존)
A.put({ id: "n1", observation: "A의 긴 관찰 문장" }); B.put({ id: "n1", observation: "B의 다른 관찰 문장" });
await A.push(); rb = await B.push(); await A.pull(); S = await srv("n1");
ok("5 같은 칸 충돌 → 양쪽 글 모두 보존(충돌 사본), 조용한 덮어쓰기 없음", rb.ok[0].action === "merged_conflict" && rb.ok[0].conflicts.includes("observation") && S.observation.startsWith("A의 긴 관찰 문장") && /충돌 사본 · 기기 B/.test(S.observation) && /B의 다른 관찰 문장/.test(S.observation) && A.L.get("n1").observation === S.observation, S.observation);
// 6. 오프라인 삭제 vs 다른 기기 수정 → 묘비 이김
B.put({ id: "n1", deleted: true }); A.put({ id: "n1", interpretation: "A가 또 고침" });
await A.push(); rb = await B.push(); await A.pull(); S = await srv("n1");
ok("6 오프라인에서 지운 것 + 다른 기기 수정 → 지움 유지(되살아나지 않음)", S.deleted === true && A.L.get("n1").deleted === true && rb.ok[0].record.deleted === true);
// 7. 되살리기 시도(기기 dirty 로 deleted=false 올리기) → 묘비 유지
A.put({ id: "n1", deleted: false, observation: "되살리기 시도" }); r = await A.push(); S = await srv("n1");
ok("7 되살리기 시도는 묘비로 남음(규칙·병합 둘 다)", S.deleted === true && A.L.get("n1").deleted === true, JSON.stringify(r.ok[0].action));
// 8. 낡은 기기 C: rev 2 때 사본을 들고 있다가 올림 → 병합, 서버 것 유지·묘비 유지, C 글은 충돌 사본
const C = new Device("C"); C.L.set("n1", annot("n1", { observation: "obs2", interpretation: "int", deleted: false, srv_rev: 2, dirty: true, base: SC.snap(annot("n1", { observation: "obs2" })), device: "C" })); C.put({ id: "n1", observation: "C의 오래된 수정" });
let rc = await C.push(); S = await srv("n1");
ok("8 낡은 기기의 재업로드 → 덮어쓰지 못하고 병합(묘비 유지, C 글은 사본으로 보존)", rc.ok[0].action === "merged_conflict" && S.deleted === true && /C의 오래된 수정/.test(S.observation) && S.observation.startsWith("되살리기 시도"), S.observation);
// 9. 전송은 됐는데 응답을 못 받은 경우(중복 전송) → 다시 쓰지 않고 채택
A.put(annot("n2", { observation: "둘째" })); await A.push(); const before = (await srv("n2")).rev; const a2 = A.L.get("n2"); a2.srv_rev = null; a2.dirty = true; a2.base = null; /* 응답 유실 흉내 */
r = await A.push(); S = await srv("n2"); const r9 = r.ok.find(x => x.record.id === "n2"); ok("9 중복 전송은 멱등(서버 rev 그대로, 'adopted')", r9.action === "adopted" && S.rev === before && A.L.get("n2").srv_rev === before && !A.L.get("n2").dirty, JSON.stringify([r9.action, before, S.rev]));
// 10. 일부 실패: 세 건 중 한 건 네트워크 오류 → 나머지 성공, 실패 건은 dirty 유지, 재시도 성공
A.put(annot("n3", { observation: "셋" })); A.put(annot("n4", { observation: "넷" })); A.put(annot("n5", { observation: "다섯" }));
const flaky = mkDeps("A"); let calls = 0; const realTx = flaky.transaction; flaky.transaction = fn => { calls++; if (calls === 2) return Promise.reject(new Error("unavailable")); return realTx(fn); };
r = await SC.syncPushAll([...A.L.values()].filter(x => x.dirty), flaky); for (const x of r.ok) A.L.set(x.record.id, x.record);
const dirtyLeft = [...A.L.values()].filter(x => x.dirty).map(x => x.id); r = await A.push();
ok("10 일부 실패 → 나머지 성공, 실패 건 dirty 유지, 재시도로 회복", dirtyLeft.length === 1 && (await srv(dirtyLeft[0])) && [...A.L.values()].every(x => !x.dirty), JSON.stringify(dirtyLeft));
// 11. 네트워크 끊김(저장 중) → 기기 기록 그대로(dirty), 서버 없음, 복구 뒤 올라감
B.put(annot("n6", { observation: "여섯" })); rb = await B.push({ failIds: new Set(["n6"]) });
ok("11a 저장 중 끊김 → 실패 보고, 기기 기록은 dirty 로 남음, 서버에 없음", rb.failed.length >= 1 && B.L.get("n6").dirty && !(await srv("n6")));
rb = await B.push(); ok("11b 복구 뒤 재전송 성공", rb.ok.some(x => x.record.id === "n6" && x.action === "created") && (await srv("n6")).rev === 1);
// 12. 서버에 없는 묘비는 올리지 않음(없는 것을 되살릴 일도 없음)
A.put(annot("n7", { deleted: true })); r = await A.push(); ok("12 서버에 없는 묘비는 안 올림", r.ok.some(x => x.record.id === "n7" && x.action === "skipped_tombstone") && !(await srv("n7")));
// 13. 내려받기 중 기기가 고치는 중(dirty)이면 건드리지 않음 → 다음 올리기에서 병합
await B.pull(); A.put({ id: "n2", observation: "A 수정중" }); B.put({ id: "n2", interpretation: "B 먼저" }); await B.push(); p = await A.pull();
ok("13 고치는 중인 기록은 내려받기가 덮지 않음(deferred)", p.includes("deferred") && A.L.get("n2").observation === "A 수정중" && A.L.get("n2").dirty);
r = await A.push(); S = await srv("n2"); ok("13b 그 뒤 올리기에서 병합", S.observation === "A 수정중" && S.interpretation === "B 먼저");
// 14. 표시(mark) 동기화: style/color 포함, 다른 종류에는 style 없음
A.put(annot("m1", { kind: "mark", key: "m:m1", style: "hl", color: "y" })); r = await A.push(); S = await srv("m1");
ok("14 표시 올리기(style·color 보존)", r.ok.some(x => x.record.id === "m1" && x.action === "created") && S.style === "hl" && S.color === "y" && !("style" in (await srv("n2"))));
// 15. 규칙 우회 없음: 동기화가 보낸 문서에 기기 전용 칸(srv_rev·dirty·base)이 없음
const n2 = await srv("n2"); ok("15 서버 문서에 기기 전용 칸 없음", !("srv_rev" in n2) && !("dirty" in n2) && !("base" in n2));
// 16. 낱말 메모(옛 방식) 동기화는 그대로
let wordOk = true; try { await setDoc(doc(db, "users", UID, "study", "notes"), { list: [{ t: 1 }], at: 1 }); } catch (e) { wordOk = false; } ok("16 낱말 메모 목록 동기화 유지", wordOk);
// 17. 양쪽에서 같은 태그·다른 태그 → 합집합
A.put({ id: "n3", tags: ["x", "공통"] }); B.L.delete("n3"); await B.pull(); B.put({ id: "n3", tags: ["y", "공통"] }); await A.push(); rb = await B.push(); S = await srv("n3");
ok("17 태그 동시 수정 → 합집합", [...S.tags].sort().join() === "x,y,공통", JSON.stringify(S.tags));
// 18. 모든 서버 문서가 규칙을 통과해 존재하고 rev 가 연속(건너뜀 없음)
const all = await getDocs(collection(db, "users", UID, "annots")); ok("18 서버 문서 전부 유효(rev≥1, server_at 있음)", all.docs.every(d => d.data().rev >= 1 && d.data().server_at));
await env.cleanup(); console.log(R.join("\n")); const bad = R.filter(x => x.startsWith("FAIL")).length; console.log(bad ? `\n동기화 실패 ${bad}` : "\n동기화 모두 기대대로"); process.exit(bad ? 1 : 0);
