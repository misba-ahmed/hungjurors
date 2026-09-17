# Vegas collection verification — September 17, 2026

Status: **blocked; live projections are not restored**. This branch adds a diagnostic only. It does not change `index.html`, `.github/workflows/refresh-pff.yml`, ESPN, PFF, advanced stats, or production data.

## Repository and deployment evidence

- The connected GitHub account can read and write `misba-ahmed/hungjurors`.
- Inspected `main` at `2de56f670f86f1ec24a701da3bbfcfed61817b33`. The repository has no `AGENTS.md` or other instruction files.
- Production run [35197185624](https://github.com/misba-ahmed/hungjurors/actions/runs/35197185624) failed collection with HTTP 403 and `cf-mitigated: challenge`. Browser installation and Pages publishing succeeded. Those steps did not establish collection success.
- `https://hungjurors.com/data/source-status.json` returned HTTP 200 and reported `rendered-browser-v1`, both projection sections blocked, zero rows, and no retained data. Advanced stats had 389 rows and snaps had 1,492 rows.
- `https://hungjurors.com/data/projections.json` returned HTTP 404.

## New test in the real deployment environment

[Diagnostic run 35198231759](https://github.com/misba-ahmed/hungjurors/actions/runs/35198231759), commit `c75651479dd076008d3fb86a20f78dc91aed83a1`, used `ubuntu-latest`, Node 24, and the same Playwright 1.63.0 headless Chromium configuration as production.

The test checked whether the existing collector aborts before an ordinary page load can settle. It allowed one 20-second passive wait after the initial challenge. It did not reload, change browser identity or network routing, interact with a CAPTCHA, or try another endpoint.

The weekly page returned HTTP 403 with `cf-mitigated: challenge`. Its initial and final titles both read `Just a moment...`. No rendered table appeared. The test stopped requests to that site and marked the season page `not-requested`; it did not claim a separate season response. The collection step failed, and the run saved `evidence.json` as an Actions artifact. The workflow has no deployment step and uses only `contents: read` permission.

This rules out a premature abort as a working fix under the tested configuration. An approved automatic access route from WinWithOdds remains necessary, such as permission and allowlisting for a scheduled collector. No provider-approved route is configured in the inspected repository. This branch does not replace production with an unverified service.

## Source rendering and scoring checks

An interactive browser could read these exact pages during this session:

- https://www.winwithodds.com/weekly_full_stats/.5tep
- https://www.winwithodds.com/season_long_full_stats/.5tep

Both tables had `.5tep` active, the standard range, and initialized DataTables markup. The browser returned 423 weekly and 549 season QB/RB/WR/TE rows. These are observations, not required future counts.

The unchanged production `parseRenderedVegas` parser accepted both complete rendered tables. Every accepted `sourceProjection` equaled its rendered cell. Negative checks rejected a different scoring format, a ceiling range, an uninitialized table, another source URL, and another season. The test imported the parser from the current workflow; it did not reproduce the old initial-HTML scoring adjustment.

| Player | Position | Weekly displayed value | Season displayed value |
| --- | --- | ---: | ---: |
| Josh Allen | QB | 25.7 | 353.9 |
| Jahmyr Gibbs | RB | 22.8 | 327.4 |
| Puka Nacua | WR | 20.1 | 312.5 |
| Trey McBride | TE | 18.9 | 285.2 |
| Brock Bowers | TE | 16.1 | 236.1 |

An isolated execution of the current frontend scoring functions preserved both TE values without another reception bonus. The frontend intentionally applies differences between league scoring and source scoring: its fallback deducts two points per interception, while the source rate deducts one. With that fallback, Josh Allen produces 25.25 weekly and 343.9 season points. This test used the code's fallback settings, not a claim about newly fetched live league settings.

The weekly publication time was September 17 at 04:01 AM ET (`2026-09-17T08:01:00Z`). The season publication time was September 14 at 07:01 PM ET (`2026-09-14T23:01:00Z`). The validation used a distinct retrieval timestamp, `2026-09-17T08:05:43.043Z`. The season page explicitly says it does not update continuously during the NFL season. Retrieving it again does not make its publication date newer.

The source rows stayed in temporary verification files. They were not added to the site, committed as a fallback feed, or represented as automated runner output.

## Shared frontend consumers

The current source uses `pcLoadVegas` → `hjLoadHostedVegas` → `data/projections.json`. It shares the JSON request and refreshes projection state in the background.

| Surface | Current shared-feed path |
| --- | --- |
| Player profiles | `pcRenderVegas` reads `pcLoadVegas` and current shared state |
| Player directory | `hjDirectoryLoadSources` reads `pcLoadVegas`; the directory bridge uses `HJ_PROJECTION_STATE` |
| Matchups and roster totals | `hjProjectionPair` / `hjSelectionTotals` read `hjVegasProjection` |
| Roster Strength comparisons | `hj6Projection` reads `hjVegasProjection` for weekly or season rows |

The hosted-feed checks require schema 1, the configured season, the exact source URL and `.5tep` scoring, the current weekly period (or season week 0), a nonempty table, a retrieval time less than one hour old, and a source update label. The browser checks the feed about every minute. Source publication dates and retrieval timestamps have separate fields. The profile starts its projection work after initial markup and does not await it before showing the main profile.

Live browser checks opened the player directory, Trey McBride's profile, Matchups, and Roster Strength Compare. The profile showed no current Vegas projection while ESPN projections and the PFF grade remained visible. Matchups and comparisons had missing Vegas values consistent with the absent feed. The code inspection confirms shared wiring; a successful published-feed-to-UI check remains impossible while the feed returns 404.

## Remaining work after source access becomes available

1. Run the actual collector on the authorized scheduled environment and require both exact source pages to pass the existing rendered scoring, season, and week checks.
2. Integrate only that proven route into the automatic production refresh.
3. Confirm the published feed returns HTTP 200 with valid, current sections and unchanged source publication dates.
4. Compare source samples, including a TE, against profiles, lists, matchups, and roster comparisons using the live league scoring settings.

Do not merge this diagnostic as a production fix. No tested collection route currently satisfies automatic deployment.
