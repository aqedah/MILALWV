"""milal_real_v1_check.py 회귀 시험 — MILAL 자체 시험 fixture(합성)로 기준점 논리를 확인한다.
fixture 는 실제 H0.2 와 같은 모양(114→115 채택 CONFIRMED, 112→115 직접 모절 기각 → human_notes)이라
긍정/부정/기록 유무 세 갈래를 실제 자료 없이도 검사할 수 있다. 실행: python3 pipeline/milal_real_v1_check_tests.py"""
import subprocess, sys, os, json, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); os.chdir(ROOT)
N = json.load(open("test/v1_fixture/V1_RELATION_NETWORK.json", encoding="utf-8")); ref = {c["id"]: f"{c['ch']}:{c['vs']}" for c in N["clauses"]}
def run(extra, v1dir="test/v1_fixture"):
    w = tempfile.mkdtemp(); rep = os.path.join(w, "r.md")
    p = subprocess.run([sys.executable, "pipeline/milal_real_v1_check.py", v1dir, "--review-zip", "test/v1_fixture/synthetic_P2_REVIEW.zip", "--commit", "deadbeef", "--work", w, "--report", rep, "--deploy", os.path.join(w, "deploy.json"), "--words", "none"] + extra, capture_output=True, text=True)
    return p.returncode, open(rep, encoding="utf-8").read(), os.path.exists(os.path.join(w, "deploy.json")), w
bad = 0
def t(name, c, info=""): global bad; print(("PASS " if c else "FAIL ") + name + ("" if c else " — " + info)); bad += not c
# 1. 올바른 기준점(fixture 의 실제 사람 판정)
rc, R, dep, w = run([f"--positive={ref['114']}=114>115", f"--negative={ref['112']}=112>115", "--not-in-v1=9:9>9:10"])
t("긍정 기준점: CONFIRMED·HUMAN 규칙·HUMAN 근거 인정", "관계 `V1-EDGE-" in R and "❌ 긍정" not in R and "HUMAN 1)" in R, R[-1500:])
t("부정 기준점: CONFIRMED 없음 ✓ + human_notes 1건 + NO_DIRECT_RELATION ✓", "CONFIRMED 계층 관계 없음 ✓" in R and "명시적 기각 기록: 1건" in R and "NO_DIRECT_RELATION `ISS-NDR" in R, R[-1500:])
t("기록 유무: 범위 밖 → NOT_RECORDED, 오류 아님", "NOT_RECORDED" in R.split("### 기록 유무")[1].split("## 결론")[0] and "❌" not in R.split("### 기록 유무")[1].split("## 결론")[0], R.split("### 기록 유무")[1][:400])
t("V1_VALIDATION.md 없음은 ⚠(1)이고 배포하지 않음", rc == 1 and not dep, f"rc={rc} dep={dep} " + "".join(l for l in R.splitlines(True) if l.startswith("❌")))
# 2. 뒤집힌 기준점(처음 판의 잘못) → ❌
rc, R, dep, w = run([f"--positive={ref['112']}=112>115"])
t("기각된 쌍을 긍정 기준점으로 주면 ❌(관계 없음)", rc == 2 and "❌ 112 → 115 관계가 없음" in R, R[-600:])
# 3. 부정 기준점에 기록이 없는 쌍 → NOT_RECORDED ⚠ (기각으로 꾸미지 않음)
rc, R, dep, w = run([f"--negative={ref['114']}=114>112"])
t("기각 기록 없는 쌍 → '기각됨' 아님(NOT_RECORDED ⚠)", "NOT_RECORDED" in R and "가상" not in R.split("부정 기준점")[1].split("###")[0] and "❌ 기각" not in R, R[-600:])
# 4. 부정 기준점에 CONFIRMED 가 있으면 ❌
rc, R, dep, w = run([f"--negative={ref['114']}=114>115"])
t("채택된 쌍을 부정 기준점으로 주면 ❌(판정과 어긋남)", rc == 2 and "CONFIRMED 관계가 있음" in R, R[-600:])
# 5. manifest 불일치 → 즉시 중단, 변환 안 함
d = tempfile.mkdtemp(); shutil.copytree("test/v1_fixture", d, dirs_exist_ok=True)
json.dump({"x": 1}, open(os.path.join(d, "V1_CONTROLS.json"), "w"))
rc, R, dep, w = run([], v1dir=d)
t("manifest 불일치 → 즉시 중단(2), 변환 결과 없음", rc == 2 and "불일치!" in R and not os.path.exists(os.path.join(w, "job.json")), R[-400:])
# 6. V1 게이트 FAIL → 변환하지 않음
d = tempfile.mkdtemp(); shutil.copytree("test/v1_fixture", d, dirs_exist_ok=True); open(os.path.join(d, "V1_VALIDATION.md"), "w").write("G1 PASS\nG2 FAIL something\n")
rc, R, dep, w = run([], v1dir=d)
t("V1 자체 검증 FAIL → 변환하지 않음(2)", rc == 2 and "변환하지 않습니다" in R and not os.path.exists(os.path.join(w, "job.json")), R[-400:])
# 7. 모두 통과 → 배포
import hashlib
d = tempfile.mkdtemp(); shutil.copytree("test/v1_fixture", d, dirs_exist_ok=True); vp = os.path.join(d, "V1_VALIDATION.md"); open(vp, "w").write("G1 PASS\nBHSA cross-check: PASS\n")
mp = os.path.join(d, "99_manifest_sha256.csv"); open(mp, "w", encoding="utf-8-sig").write(open(mp, encoding="utf-8-sig").read().replace("V1_VALIDATION.md,2339e9db599187dc383d95adba55eb200b74f363ecc799d672ea9df993a8f11d", "V1_VALIDATION.md," + hashlib.sha256(open(vp, "rb").read()).hexdigest()))
rc, R, dep, w = run([f"--positive={ref['114']}=114>115", f"--negative={ref['112']}=112>115", "--not-in-v1=9:9>9:10", "--words", "study/words.json"], v1dir=d)
t("합성 자료는 V5(낱말 대조)에서 막혀 배포되지 않음(2)", rc == 2 and not dep and "V5" in R, f"rc={rc} dep={dep}")
rc, R, dep, w = run([f"--positive={ref['114']}=114>115", f"--negative={ref['112']}=112>115", "--not-in-v1=9:9>9:10"], v1dir=d)
t("(낱말 대조 건너뜀 ⚠ 때문에 1) 배포 안 됨 — 배포는 0일 때만", rc == 1 and not dep and "배포하지 않음" in R, f"rc={rc} dep={dep} " + R[-300:])
print("모두 통과" if not bad else f"실패 {bad}"); sys.exit(1 if bad else 0)
