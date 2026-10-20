# BHSA 원본 모절 관계 대조 — V1 native_relations ↔ BHSA 2021 clause / clause_atom

- IF-1 `study/milal/job.json` · 원자료 사본 `study/milal/bhsa_native_job.json` (BHSA 2021 mother/rela 그대로, 판정 없음)

| 항목 | 건수 | 뜻 |
|---|---|---|
| if1_native_relations | 3350 | V1 이 보존한 BHSA 원 관계 |
| bhsa_clause_atoms / bhsa_clauses | 2977 / 2938 | 욥기 절 원자 / 절 |
| bhsa_atom_mothers / bhsa_clause_mothers | 2934 / 454 | 원본에서 mother 가 있는 절 원자 / 절 |
| **atom_exact** | 2895 | 절 원자→절 원자, 노드·rela 까지 원본과 같음 |
| **clause_exact** | 359 | 절→절, 원본과 같음 |
| clause_mother_phrase_or_word | 95 | 원본 mother 가 구·낱말 — V1 은 그 구가 든 절로 풀어 적음(다대일 해소, 원본과 같음) |
| phrase_level | 1 | dependent 가 구 — 절 수준으로 풀어 적힌 것 |
| **diff** | 0 | 원본과 다름(0 이어야 함) |
| no_nodes | 0 | 절 원자 번호 미복원 |
| bhsa_atom_mothers_not_in_v1 | 39 | 원본에는 있으나 V1 에 없는 절 원자 mother(절 하나에 원자 여럿: 39절) |

원칙: BHSA 관계는 원자료, MILAL 관계는 별도 판정. 여기서 모절 관계를 새로 만들지 않았다 — V1 에 없는 원본 mother 는 앱이 `bhsa_native_job.json`(원자료)에서 '원 자료' 칸으로만 보여 준다.

## 예
```
{
 "diff": [],
 "phrase_mother": [
  [
   "NAT-V1-EDGE-01e0ff4b7d5f1b9a1c63",
   498164,
   854926,
   "phrase",
   "Attr"
  ],
  [
   "NAT-V1-EDGE-05955dff15c353cd9a17",
   499971,
   860011,
   "phrase",
   "Attr"
  ],
  [
   "NAT-V1-EDGE-070d0cde2096356192d1",
   500042,
   345320,
   "word",
   "RgRc"
  ]
 ],
 "phrase_level": [
  [
   "NAT-V1-EDGE-e110e3a2972e0748817c",
   858336,
   499371,
   "Resu"
  ]
 ],
 "bhsa_atom_mothers_not_in_v1": [
  [
   587661,
   587659,
   1,
   10
  ],
  [
   587671,
   587669,
   1,
   12
  ],
  [
   587752,
   587750,
   2,
   4
  ],
  [
   587865,
   587863,
   3,
   25
  ],
  [
   587876,
   587874,
   4,
   2
  ],
  [
   587891,
   587889,
   4,
   7
  ],
  [
   587904,
   587902,
   4,
   14
  ],
  [
   588013,
   588011,
   6,
   7
  ]
 ]
}
```
