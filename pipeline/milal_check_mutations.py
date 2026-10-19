"""검증기의 음성 변이 검사: 일부러 틀린 파일을 만들어 milal_check.py 가 잡는지 본다.

쓰는 법: python3 milal_check_mutations.py test/milal_test_only_job31-38.json study/words.json
모두 '잡힘'이어야 한다. 'jsonschema 없음' 변이는 검사 불가(종료 2)가 나와야 한다.
"""
import sys, json, copy, subprocess, os, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
SRC, WORDS = sys.argv[1], sys.argv[2]
D = json.load(open(SRC, encoding="utf-8"))

def run(M, name, expect_fail, env_extra=None):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(M, f); path = f.name
    env = dict(os.environ); env.update(env_extra or {})
    r = subprocess.run([sys.executable, HERE + "/milal_check.py", path, "--words", WORDS], capture_output=True, text=True, env=env)
    os.unlink(path)
    fails = [l.split(" — ")[0][5:] for l in r.stdout.splitlines() if l.startswith("FAIL")]
    ok = (r.returncode == 2) if expect_fail == "unable" else ((r.returncode == 1) == expect_fail)
    print(("잡힘   " if ok else "놓침!! ") + f"{name:22s} → 종료 {r.returncode} {fails}")
    return ok

results = []
M = copy.deepcopy(D); M["relations"][0]["target"] = {"type": "group", "id": "NOPE"}; results.append(run(M, "1 끝점 없음", True))
M = copy.deepcopy(D); c = [r for r in M["relations"] if r["status"] == "CONFIRMED"][0]
M["relations"].append(dict(c, id="X", source=c["target"], target=c["source"], record={"table": "t", "id": "x"})); results.append(run(M, "2 확정 순환", True))
M = copy.deepcopy(D); c = [r for r in M["relations"] if r["status"] == "CONFIRMED"][0]
M["relations"].append(dict(c, id="Y", source={"type": "clause", "id": M["nodes"][5]["id"]}, record={"table": "t", "id": "y"})); results.append(run(M, "3 확정 중복 모절", True))
M = copy.deepcopy(D); M["nodes"][3]["word_ids"] = M["nodes"][3]["word_ids"][:-1]; results.append(run(M, "4 낱말 개수 다름", True))
M = copy.deepcopy(D); M["relations"][0]["status"] = "CONDITIONAL"; results.append(run(M, "5 모르는 상태", True))
M = copy.deepcopy(D); M["source"]["bhsa_version"] = "2017"; results.append(run(M, "6 BHSA 판 다름", True))
# 새로 더한 것
M = copy.deepcopy(D); w = M["nodes"][3]["word_ids"]; w[0] = w[0] + 100000; results.append(run(M, "7 낱말 번호 바뀜(개수 같음)", True))
M = copy.deepcopy(D); M["relations"][0]["kind"] = "HYPOTACTIC"; results.append(run(M, "8 잘못된 관계 유형", True))
M = copy.deepcopy(D); M["relations"][0]["evidence_ids"] = ["EV-NOPE"]; results.append(run(M, "9 근거 참조 누락", True))
M = copy.deepcopy(D); nd = [s for s in M["issues"] if s["kind"] == "NO_DIRECT_RELATION"][0]; del nd["basis"]; results.append(run(M, "10 직접연결없음 근거 없음", True))
M = copy.deepcopy(D); M["native_relations"][0]["clause_atom"] = 1; results.append(run(M, "11 원 관계 절 원자 밖", True))
M = copy.deepcopy(D); M["file_status"] = "MILAL_OUTPUT"; results.append(run(M, "12 실제 출력인데 출처 없음", True))
M = copy.deepcopy(D); M["relations"][1]["kind"] = "PARALLEL"; results.append(run(M, "13 계열-종류 불일치", True))
# 스키마 검사 생략 → 검사 불가(2)
results.append(run(copy.deepcopy(D), "14 jsonschema 없음", "unable", {"PYTHONPATH": HERE + "/_no_jsonschema"}))
# 원본은 통과해야
results.append(run(copy.deepcopy(D), "0 원본(통과해야)", False))
print("\n모두 잡힘" if all(results) else "\n놓친 것이 있음"); sys.exit(0 if all(results) else 1)
