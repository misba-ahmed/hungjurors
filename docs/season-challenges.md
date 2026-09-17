# Automatic Season Challenges

The existing ESPN league sync updates this section at its normal cadence: every 15 seconds during games, 30 seconds near kickoff, and 60 seconds otherwise while the page is visible. No separate manual data entry or workflow dispatch is needed. Opening the site loads all elapsed weeks; switching challenge tabs keeps the same shared results.

`challenge-engine.js` calculates results from each week's ESPN scoring-period roster, actual player stats and historical projections. `challenge-live.js` uses the site's shared request cache and historical-week cache, then redraws the selected challenge. Historical lineups refresh every five minutes to pick up corrections. All totals recompute from the records, so refreshes cannot duplicate awards. Current-week figures are provisional; raffle tickets and eliminations require final scores.

- Raffle: weekly high-score tickets through the league's regular-season endpoint (currently Week 14). Tied high scorers each receive a ticket. Tracking does not invent an end-of-season draw result.
- Last Man Standing: eliminate the lowest remaining score starting Week 5. The published rule does not define an elimination tiebreaker. A tied elimination stays unresolved and shows the specific tie; later eliminations wait rather than invent a winner.
- The Last Man Standing lineup uses original avatar heads on individual SVG figures. Final eliminations switch a figure to a seated, greyscale pose. Its chronological feed starts with Week 1, includes the lowest final score during Weeks 1–4 without eliminating anyone, and uses only eligible remaining managers thereafter. Ties or incomplete scores remain pending. The lineup has accessible manager/state names with manager names beneath the baseline; horizontal scrolling keeps figures legible on phones. All challenge manager portraits use the larger shared avatar style. The elimination feed is centered and capped at 640px on desktop while retaining its full available width on phones.
- Titty: starter passing, rushing, receiving, fumble-recovery and return TDs, plus made 50+ yard FGs. Aggregate return-TD and 50+ FG fields take precedence over overlapping component fields. Ties use total passing/rushing/receiving yards from starting QBs, RBs and WRs.
- Overachiever: official weekly score minus that week's starters' ESPN projections.
- MVP: compare against the whole ESPN player pool for all six positions, award only if the manager started the winning player, and award the overall bonus. Equal positional highs share the award. Ties use fantasy points from unique MVP players per week (the overall bonus does not duplicate the player's tiebreak points).
- Optimizer: maximize actual points under ESPN slot eligibility using that week's full roster, excluding IR. Players can fill only one slot. Empty slots may score zero. Gap compares the optimal lineup with actual starter points, excluding commissioner score adjustments.

The four stat challenges run through the league's final scoring period (currently Week 16), including playoffs, as the existing archived challenge records do. Missing records remain pending and partial totals are labeled. Failed requests retry with the next sync; successful prior results retain their original retrieval times.

Validation: `node scripts/test-challenges.mjs` exercises scoring, ties, starter eligibility, flex assignments, IR, missing records, season boundaries, and repeat-refresh behavior. The publishing workflow runs it alongside the Vegas feed checks.

ESPN stat identifiers follow the existing player-stat integration and the maintained mapping in https://github.com/cwendt94/espn-api/blob/master/espn_api/football/constant.py.
