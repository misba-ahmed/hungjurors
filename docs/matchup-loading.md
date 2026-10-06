# Matchup loading

Keep the default matchup on the just-completed week through Tuesday (America/Chicago); advance Wednesday. Explicit selections retain their destination.

The published page includes a verified completed-week ESPN roster snapshot. scripts/refresh-matchup-history.mjs refreshes it before each deployment; prepare-site.mjs embeds it safely. Validate league, season and scoring period before seeding the shared history cache. Preserve the last valid snapshot if ESPN is temporarily unavailable; never substitute current rosters for historical lineups. The selected week refreshes directly, independently of older background history requests.

Do not verify only matchup shells or scoreboard totals. With historical network requests blocked, assert populated player rows for every matchup, including starters and benches, at desktop and mobile widths. On 2026-10-06 the browser test verified five Week 4 matchups with 32 populated player rows each at 1440px and 390px, with no JavaScript errors. The first fix only asserted five containers and therefore missed empty lineups.

Regression checks: scripts/test-matchup-week.mjs and scripts/test-matchup-history.mjs. Preserve Wednesday rollover, shared request deduplication, stale-response protection, accurate historical rosters and lineup gestures.
