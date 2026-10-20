# Completed-week results

`completed-results.js` creates a separate results view from ESPN's league payload. It uses the same `hjChNflWeekFinal` check as side challenges: the correct season and week, at least one NFL event, and every event completed and postgame. Delayed games and overtime keep the week open.

Undecided fantasy matchups receive calculated winners only when every matchup has explicit weekly scores (or current-week live totals). Missing scores are not treated as zero. Multi-week matchups wait for every scoring week. Official ESPN winners take precedence when supplied.

Regular-season wins, losses, ties, PF, PA and streaks are rebuilt from a complete schedule, never added to potentially updated ESPN aggregates. Missing or duplicate history leaves the official aggregates intact. For this league's one-division, points-for seeding rule, changed totals also update standings order. Repeating a refresh is idempotent; score corrections replace previous results.

`completed-results-live.js` supplies this view to standings, completed-week recap rows, Wire cards, record snapshots and manager result helpers. The manager lineup beside the logo also reads this view for ordering on its existing refresh timer; its score bubbles continue to use the raw league payload. It checks completion through the shared schedule cache every 15 seconds while visible (the schedule cache can be up to 60 seconds old). It uses the latest available ESPN fantasy scores; the ordinary league refresh continues supplying score corrections.

The shared raw league payload, roster objects and scoring periods are not modified. Matchups still use the existing previous-week-until-Wednesday rule. The NFL games schedule strip keeps its current source and behavior. No card markup, gestures or layout are changed.

Validation: `node --test scripts/test-completed-results.mjs` covers finality, missing data, rollover, ties, corrections, ranking, postseason separation and production result consumers. The publication workflow runs this alongside the existing record, challenge and matchup checks.

## Result-consumer audit

| Surface | Source / refresh |
| --- | --- |
| Standings, ranks, form, power and league schedule results | `hjApplyLiveSeason` supplies result totals and `DATA.weeks`; existing renderers recompute |
| Header manager order | `syncStandings` reads the results view; score bubbles retain raw data |
| Roster manager tabs and identity card | Result-team adapters for records/PF/rank; targeted text refresh when completion arrives, without rendering the player lineup |
| Weekly recap and top carousel | Completed weeks / recap / Wire builders receive results view |
| Record book and record announcements | Rebuilt record snapshots; existing record events redraw the book |
| Manager current-season and career record/high | Result-team and weekly-score helpers; open profiles refresh |
| Head-to-head and profile schedule results | Historical baseline plus completed current-season regular-season games; no accumulation across refreshes |
| Historical seasons, draft history, transactions and official annual awards | Preserve their archived/independent sources; no invented current-year awards |
| Roster scores, Matchups selected week and NFL schedule strip | Preserve raw payload, week-selection functions and existing render behavior |

ESPN simulation odds cannot be derived from final scores alone. When result totals differ from ESPN's aggregates, the existing PF-rank fallback replaces stale odds until ESPN reconciles. The raw simulation data is untouched.
