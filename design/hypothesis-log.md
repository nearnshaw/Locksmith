# Hypothesis Log — Locksmith

Generated index. Rebuilt from `design/*/H*_*.md`; never hand-edited. Sorted by cheapest killing test (arithmetic → desktop → mobile), then stage and number.

| ID | IF/THEN (falsifiable) | source section | cheapest killing test | status | verdict / date | tested on |
|---|---|---|---|---|---|---|
| H1-02 | IF the first frame shows the glowing padlock, "Use lockpick" and "Lockpicks: 0", THEN ≥80% of first-time testers act within 5 s and state the goal within 10 s | §2 First Minutes | desktop Explorer, greybox, 3–5 testers with a stopwatch | parked | — | — |
| H1-01 | IF every attempt answers within 0.5 s with a new line and the danger advances, THEN a first-time player finishes all 3 levels and calls it funny, not frustrating | §3 Core Loop — repetition 10 | desktop Explorer, owner self-test, then 3 first-time players | parked | — | — |

Invariants checked 2026-10-23: every `[HYPOTHESIS]` marker in `gdd.md` resolves to a row (H1-01); every row's source section records its claim (H1-02's claim is the §2 first-minutes text).
