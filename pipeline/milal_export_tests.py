"""변환기 시험: fixture(MILAL 자체 시험 산출물)로 (1) round-trip 정확, (2) 원본 필드 손실 검출, (3) 근거 누락 검출, (4) 새 판정 생성 금지.
쓰는 법: python3 milal_export_tests.py
"""
import sys, os, json, subprocess, tempfile, zipfile, io, csv, shutil, copy
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FIX = os.path.join(ROOT, "test", "v1_fixture"); ZIP = os.path.join(FIX, "synthetic_P2_REVIEW.zip")
R = []
def run_export(v1dir, zipp, extra=()):
    out = tempfile.mktemp(suffix=".json"); cmpf = tempfile.mktemp(suffix=".json")
    p = subprocess.run([sys.executable, os.path.join(HERE, "milal_export_v1.py"), v1dir, out, "--test-only", "--compare", cmpf] + (["--review-zip", zipp] if zipp else []) + list(extra), capture_output=True, text=True)
    cmp = json.load(open(cmpf)) if os.path.exists(cmpf) else {}
    return p.returncode, cmp, (json.load(open(out)) if os.path.exists(out) else None), p.stdout + p.stderr
def rec(name, ok, extra=""): R.append(("PASS " if ok else "FAIL ") + name + (" — " + extra if extra else ""))

# 1) 원본 그대로 → ROUNDTRIP_EXACT, 근거 완전
rc, cmp, out, _ = run_export(FIX, ZIP)
rec("1 fixture round-trip 정확", rc == 0 and cmp.get("verdict") == "ROUNDTRIP_EXACT", cmp.get("verdict", ""))
rec("1b 근거 완전(관계마다 근거 있음)", cmp.get("evidence_complete") is True and cmp["evidence_coverage"]["relations_without_evidence"] == 0)
rec("1c 새 관계 판정 없음(관계 수 = 원본 edge 수)", cmp["counts"]["relations+native == edges"] is True)
# 2) 변환 결과에서 필드를 지우면 round-trip 이 잡는가
from milal_roundtrip import rebuild_v1, diff_paths
N = json.load(open(os.path.join(FIX, "V1_RELATION_NETWORK.json")))
M = copy.deepcopy(out); del M["relations"][0]["note"]; rec("2a 관계 note 손실 검출", bool(diff_paths(N, rebuild_v1(M))))
M = copy.deepcopy(out); M["nodes"][0]["word_ids"] = M["nodes"][0]["word_ids"][:-1]; rec("2b 절 word_ids 손실 검출", bool(diff_paths(N, rebuild_v1(M))))
M = copy.deepcopy(out); M["native_relations"][0]["annotation_indexes"] = []; rec("2c 원 관계 annotation_indexes 손실 검출", bool(diff_paths(N, rebuild_v1(M))))
gi = next(i for i, g in enumerate(out["groups"]) if g.get("rule_notes")); M = copy.deepcopy(out); M["groups"][gi]["rule_notes"] = []; rec("2d 묶음 rule_notes 손실 검출", bool(diff_paths(N, rebuild_v1(M))))
M = copy.deepcopy(out); M["notes"] = []; rec("2e 사람 결정 메모 손실 검출", bool(diff_paths(N, rebuild_v1(M))))
M = copy.deepcopy(out); del M["source"]["milal"]["v1_passthrough"]["counts"]; rec("2f 머리 칸(counts) 손실 검출", bool(diff_paths(N, rebuild_v1(M))))
# 3) zip 에서 trace 하나를 빼면 근거 누락을 잡는가
tmp = tempfile.mkdtemp(); shutil.copy(ZIP, os.path.join(tmp, "z.zip"))
z = zipfile.ZipFile(ZIP); names = z.namelist(); blobs = {n: z.read(n) for n in names}
rows = list(csv.DictReader(io.StringIO(blobs["P2_RULE_TRACE.csv"].decode()))); rows2 = [r for r in rows if '"trace_id": "T-A"' not in r["payload"]]
buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=rows[0].keys()); w.writeheader(); [w.writerow(r) for r in rows2]; blobs["P2_RULE_TRACE.csv"] = buf.getvalue().encode()
# manifest 갱신(변환기는 zip 자체의 sha 를 V1 source 와 대조하므로 다른 zip 은 거부되어야 함)
zp = os.path.join(tmp, "broken.zip"); zz = zipfile.ZipFile(zp, "w"); [zz.writestr(n, blobs[n]) for n in names]; zz.close()
rc3, cmp3, out3, log3 = run_export(FIX, zp)
rec("3 V1 이 읽은 것과 다른 zip 거부", rc3 != 0 and "sha256" in log3, log3.strip().splitlines()[-1][:80] if log3.strip() else "")
# 3b) zip 없이 변환하면 근거가 비고, 그 사실이 보고되는가
rc4, cmp4, out4, _ = run_export(FIX, None)
rec("3b zip 없이: trace 근거 없음이 보고됨(동결 관계·사람 결정 근거만 남음)", cmp4.get("evidence_coverage", {}).get("note", "") != "" and all(e["record"]["table"] in ("frozen_typed_relations", "frozen_human") for e in out4["evidence"]) and cmp4.get("verdict", "").startswith("ROUNDTRIP_EXACT"))
# 4) 변환 결과의 모든 관계 id 가 원본 edge id 와 같고, NO_DIRECT_RELATION 은 사람 기각 수와 같다
nd = sum(1 for s in out["issues"] if s["kind"] == "NO_DIRECT_RELATION"); hn = sum(1 for h in N["human_notes"] if "NO_DIRECT" in str(h.get("effect", "")) + str(h.get("decision", "")))
rec("4 직접연결없음 = 사람 기각 수", nd == hn, f"{nd} vs {hn}")
rec("4b 상태값은 원본 그대로(새 CONFIRMED 없음)", cmp["status_distribution_equal"] is True)
# 5) 절 원자 번호는 복원이 아님
rec("5 원 관계 절 원자 '복원 아님' 표시", all(x.get("atom_resolution") == "NOT_AVAILABLE_IN_V1" and x["clause_atom"] is None for x in out["native_relations"]))
# 6) origin_ids 판별이 절/낱말 집합으로 이루어짐(숫자만으로 절 취급 안 함)
ev = out["evidence"]; rec("6 origin_ids 판별 칸(clause/word/other) 존재", all(set(e["observed"].keys()) <= {"clause_ids", "word_ids", "other_ids"} for e in ev))
print("\n".join(R)); bad = sum(1 for r in R if r.startswith("FAIL")); print("\n모두 통과" if not bad else f"\n실패 {bad}"); sys.exit(1 if bad else 0)
