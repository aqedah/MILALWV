> **2026-10-20 14:30 실행 기록**: 같은 저장소(MILAL 커밋 `d7c2eb3`)·같은 입력(P2_REVIEW.zip sha256 `0a96d235c6bc0bc3…`)으로 작업 환경에서 V1 을 돌렸다(자체 시험 16건 → 실제 실행 → BHSA 대조 2,938절 불일치 0). `V1_RELATION_NETWORK.json` sha256 **`c6df1724291cfb7c81d937af142961f3876d1e8019e746378706cd3539b37a20`**. 목사님 PC 에서 다시 돌리면 이 해시가 같은지만 보면 된다(`Get-FileHash results\mfr03_v1_<…>\real\V1_RELATION_NETWORK.json`). 변환·검증 결과: `docs/REPORT_real_v1_2026-10-20.md`.

# 실제 MILAL V1 관계망 만들기 → MILALWV로 가져오기 (재현 절차)

목적: 호환성 검증에 필요한 실제 파일을 얻는다. MILAL 저장소의 **기존 스크립트를 그대로** 쓴다. 규칙·판정은 건드리지 않는다.

## 0. 필요한 것 (목사님 Windows)

| 것 | 어디 | 확인 |
|---|---|---|
| MILAL 저장소 | 예: `C:\MILAL` (최신 `main`) | `git -C C:\MILAL log -1 --format=%H` → 커밋 해시 적어 두기 |
| `P2_REVIEW.zip` | `MILAL\results\mfr03_p2_20261002\release_a_v2\P2_REVIEW.zip` (SHA256 `0a96d235…`) | 없으면 P2 단계 산출물을 먼저 찾아야 함(`results/`는 Git에 없음) |
| Python 3.11+ | `MILAL\.venv` 또는 시스템 python | `python --version` |
| (선택) BHSA + text-fabric | `C:\Users\yisaa\text-fabric-data\github\ETCBC\bhsa\tf\2021` (있음) | `pip show text-fabric`; 있으면 BHSA 대조 게이트가 돈다 |

## 1. 실행 (PowerShell, MILAL 폴더에서)

```powershell
cd C:\MILAL
.\scripts\run_milal_v1_windows.ps1 -Bhsa 'C:\Users\yisaa\text-fabric-data\github\ETCBC\bhsa\tf\2021' -NoOpen
```

- 1/3 자체 시험(합성 자료, 게이트 20개 + 실패해야 하는 변이) → 2/3 실제 실행(P2_REVIEW.zip) → 3/3 결과 경로 출력.
- 결과 폴더: `MILAL\results\mfr03_v1_<날짜시각>\real\` — `V1_RELATION_NETWORK.json`, `90_run_metadata.json`, `99_manifest_sha256.csv`, `V1_CONTROLS.json`, `V1_VALIDATION.md` 등.
- `V1_VALIDATION.md`에 모든 게이트 PASS, `BHSA cross-check: PASS`(text-fabric 있을 때)인지 본다.

## 2. MILALWV로 변환 (MILALWV 폴더에서, 또는 이 세션에 파일을 올려 주시면 제가)

한 번에 10단계(검증 결과·해시·변환·round-trip·근거·BHSA 대조·관계 대조·차이 보고·연구자 판단 항목·욥 37:20 / 37:24→38:1 기준점):

```powershell
python pipeline\milal_real_v1_check.py C:\MILAL\results\mfr03_v1_<날짜시각>\real --review-zip C:\MILAL\results\mfr03_p2_20261002\release_a_v2\P2_REVIEW.zip --commit <MILAL 커밋 해시> --deploy study\milal\job.json
```
결과는 작업 폴더 `build\real_v1_<날짜>\job.json` 에 먼저 생기고, 보고서 `docs/REPORT_real_v1_<날짜>.md` 가 나온다. 종료 코드 0(모두 통과 — 이때만 `--deploy` 자리로 복사) / 1(⚠ 사람이 볼 것 — 배포 안 함) / 2(❌ 실패 — 배포 안 함). 기준점: 긍정 500064→500065(연구자 채택, CONFIRMED), 부정 500062→500065(직접 모절 기각 → NO_DIRECT_RELATION), 37:24→38:1 은 기록 유무만(V1 범위 밖이면 NOT_RECORDED). 규격 §12. 아래는 그 안에서 도는 개별 명령.

```powershell
cd C:\Users\yisaa\MILALWV
python pipeline\milal_export_v1.py C:\MILAL\results\mfr03_v1_<날짜시각>\real study\milal\job.json `
  --review-zip C:\MILAL\results\mfr03_p2_20261002\release_a_v2\P2_REVIEW.zip `
  --commit <0단계에서 적은 MILAL 커밋 해시> --compare study\milal\job.compare.json
python pipeline\milal_check.py study\milal\job.json --words study\words.json
```

- 변환기가 `ROUNDTRIP_EXACT`(또는 `STRUCTURAL_PRESERVATION_PASS`)를 찍고(절·묶음·관계 수, edge id 집합, 상태 분포, 방향, 근거 참조, 사람 메모가 모두 보존), 검증기가 V1~V16 **모두 PASS**(낱말 불일치 0건)여야 한다.
- 둘 중 하나라도 실패하면 그 절·원인을 보고하고 멈춘다. 연구자 승인 전에는 `review.status`가 `UNREVIEWED`라 앱에 "승인 전 — 검증 대기"로 뜬다.

## 3. 앱에 연결

`app/milal.js`의 `MILAL_FILES`에서 책 18을 `study/milal/job.json`으로 바꾸고 `STUDY_V`를 올린다. 시험 자료(`test/milal_test_only_job31-38.json`)는 더 쓰지 않는다.

## 4. 이 절차로 확인 못 하는 것 (실제 파일이 있어야)

- 실제 `90_run_metadata.json`에 어떤 칸이 더 있는지(합성 실행에는 커밋·생성 시각 없음 → `--commit`으로 보충).
- `V1_CONTROLS.json`의 "직접 관계 없음" 통제(4:7/5:1)의 실제 형식 → 변환기의 CONTROL 근거 `NO_DIRECT_RELATION` 추가 여부.
- 실제 rule trace의 `origin_ids`에 절 id가 들어 있는지(합성에는 비어 있음) → 근거의 `observed.clause_ids`.
- 실제 P2 `raw_clauses`에 절 원자 번호(`atoms[].node`)가 있는지(합성에는 없음) → `nodes.clause_atom_ids`, `native_relations.clause_atom`.
