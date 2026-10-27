# Manager side bets

The original 2026 Week 3 MISBA/GARRETT roulette agreement lives in `scripts/side-bets.js`. It appears beside its matchup, in the Week 3 recap, and in the Wire. Its rules and historical behavior remain intact.

The Week 7 MISBA/BRYAN agreement lives in `scripts/free-throw-bet.js` and uses those same three surfaces and the shared carousel interactions. It is announced during Weeks 6–7, remains with the Week 7 recap, then leaves the main carousel. The matchup and historical recap retain it. The Side Bet carousel section appears immediately before Bye Week.

- MISBA: 21/50 made, 29 missed. If MISBA loses, MISBA pays BRYAN $29.
- BRYAN: 28/50 made, 22 missed. If BRYAN loses, BRYAN pays MISBA $22.
- A tied matchup has no loser and no base payment.
- The extra-shot agreement is **active**. The owner confirmed both managers agreed on October 25, 2026. The loser shoots `ceil(losing margin)` additional free throws. Each miss adds $1. The owner confirmed rounding up.
- Agreement and extra-shot results follow the existing commissioner/group-chat workflow. There is no public toggle that can claim both managers agreed. After confirmation, update `HJ_FREE_THROW_BET.extra.agreed`. To record completion, also set `shooter`, `attempted`, and `made` to the verified results. Until then the additional amount remains pending.
- Completed-results data determines the winner without waiting overnight for fantasy finality. Corrections replace the outcome. If a correction changes the loser or required number of extra shots, previous extra-shot results no longer settle the bet automatically.

A gold “EXTRA SHOTS · LOCKED IN” panel shows the rounded current score gap and trailing manager under “If it ended now”; it becomes the final shot count after the matchup ends. Missing scores stay unknown, ties require no shots, and no extra dollars settle before confirmed shooting results.

The basketball graphics use CSS/SVG; original manager portraits are reused. Gold dots represent makes and muted dots misses, with exactly 50 dots per manager. Decorative swish/rim-out animations run on the active or expanded Wire card and stop for reduced-motion preferences.

Checks: `node --test scripts/test-free-throw-bet.mjs`; `node scripts/test-free-throw-bet-browser.mjs` checks the isolated production Wire component (prepared styles, markup and shared interaction functions) in Chromium and WebKit at desktop/phone widths. Existing Wire/card gesture checks still apply.

## Week 8 · Degenerate Side Bet

`scripts/degenerate-side-bet.js` and `styles/degenerate-side-bet.css` present MISBA and CESAR's agreement on the Wire, matchup and recap. The closed card shows casino felt, an animated roulette wheel and ball, blackjack cards, four weekly amount cards and the profit condition. Full terms, the owner's closing joke as a plain paragraph and the standard commissioner invitation appear in the expanded card and agreement details.

All four weekly cards display the same running actual Week 8 score difference in dollars once games start. Before kickoff or when either score is missing, they show a dash. A live tie shows $0.00. Once the matchup ends, all four keep the final margin, including later score corrections. These are amounts per profitable week, not attendance or payment records.

The amount panel says “If it ended now” until the result becomes final. Missing scores and pre-game zeroes show “Final margin” without inventing a loser or amount. Final ties show no payment. Amounts retain cents. A score correction updates the displayed payer, recipient and amount through normal Wire refreshes.

The roulette animation is decorative and pauses off-screen and under reduced-motion preferences. Existing manager portraits, shared card dimensions and expansion/gesture behavior remain in use.

Check: `node --test scripts/test-degenerate-side-bet.mjs scripts/test-wire-priorities.mjs`.
