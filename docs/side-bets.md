# Manager side bets

The original 2026 Week 3 MISBA/GARRETT roulette agreement lives in `scripts/side-bets.js`. It appears beside its matchup, in the Week 3 recap, and after that recap in the Wire. Its rules and historical behavior remain intact.

The Week 7 MISBA/BRYAN agreement lives in `scripts/free-throw-bet.js` and uses those same three surfaces and the shared carousel interactions. It is announced during Weeks 6–7, remains with the Week 7 recap, then leaves the main carousel. The matchup and historical recap retain it.

- MISBA: 21/50 made, 29 missed. If MISBA loses, MISBA pays BRYAN $29.
- BRYAN: 28/50 made, 22 missed. If BRYAN loses, BRYAN pays MISBA $22.
- A tied matchup has no loser and no base payment.
- The optional extra-shot agreement is **not active**. Both managers must agree; it may be activated at any time. The loser shoots `ceil(losing margin)` additional free throws. Each miss adds $1. The owner confirmed rounding up.
- Agreement and extra-shot results follow the existing commissioner/group-chat workflow. There is no public toggle that can claim both managers agreed. After confirmation, update `HJ_FREE_THROW_BET.extra.agreed`. To record completion, also set `shooter`, `attempted`, and `made` to the verified results. Until then the additional amount remains pending.
- Completed-results data determines the winner without waiting overnight for fantasy finality. Corrections replace the outcome. If a correction changes the loser or required number of extra shots, previous extra-shot results no longer settle the bet automatically.

The basketball graphics use CSS/SVG; original manager portraits are reused. Gold dots represent makes and muted dots misses, with exactly 50 dots per manager. Decorative swish/rim-out animations run on the active or expanded Wire card and stop for reduced-motion preferences.

Checks: `node --test scripts/test-free-throw-bet.mjs`; `node scripts/test-free-throw-bet-browser.mjs` checks the isolated production Wire component (prepared styles, markup and shared interaction functions) in Chromium and WebKit at desktop/phone widths. Existing Wire/card gesture checks still apply.
