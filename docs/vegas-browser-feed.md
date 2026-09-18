# Automatic Vegas projections

Two interchangeable collectors can feed the site: the scheduled ChatGPT browser task (producer `chatgpt-scheduled-browser-v1`) and the free home collector in `collector/` that runs on a Mac from launchd every two hours (producer `hj-home-collector-v1`, see `collector/README.md`). Both read these exact rendered source pages:

- https://www.winwithodds.com/weekly_full_stats/.5tep
- https://www.winwithodds.com/season_long_full_stats/.5tep

It verifies the initialized table, active `.5tep` scoring, standard range, season, and current weekly period with `extractRenderedVegasTable` and `parseRenderedVegas` from the production workflow. It commits only verified `data/projections.json` to the `vegas-browser-feed` branch. Both source tables must pass before it writes a new feed. The source's displayed projection already includes the TE reception bonus.

Either collector runs outside GitHub Actions (GitHub's runners are blocked by the source's bot check). The home collector uses Node.js with Playwright driving the Mac's Google Chrome (or a private Chromium) headlessly, applies the identical `parseRenderedVegas` contract, and commits through the GitHub Contents API with a fine-grained token stored only in `~/.hungjurors/token`. The existing `refresh-pff.yml` publishing schedule runs every 15 minutes and reads the verified feed from that branch. It does not request WinWithOdds from the GitHub runner. ESPN, PFF, advanced stats, and snap collection keep their existing paths.

`checkedAt` records the browser's successful source retrieval. `publishedAt` and `updated` record the source publication time. Republishing does not advance either source timestamp. The season page states that its season totals do not update continuously during the NFL season; a new retrieval can legitimately keep the same publication date and values.

The feed consumer checks producer, source URL, scoring, season, week, timestamps, row completeness, duplicate players, and row scoring metadata. The staging script applies the matching frontend freshness setting with an exact-match guard. It accepts a successful browser retrieval for 36 hours (was 90 minutes) so a collector outage of less than a day keeps the last verified projections visible with their original source timestamp instead of blanking the site. Failed updates retain previously verified sections with their original timestamps; the frontend rejects them after the same age limit.

`data/source-status.json` reports Vegas sections as `available` with transport `scheduled-browser` and their actual retrieval/publication times. Advanced-stat sources retain their existing `updated` status. An unavailable or expired browser feed makes the refresh run fail visibly while successful independent sources can still publish.

The shared frontend feed supplies profiles, player lists, matchups, roster comparisons, and other Vegas consumers. Profile rendering continues independently of projection refreshes.

Validation commands:

```sh
node scripts/test-vegas-feed.mjs
node scripts/check-live-vegas-feed.mjs
```

The first command tests contracts with synthetic data that never enters production. The second fetches the actual browser feed through the same consumer used by publication and fails if either section is unavailable or expired.
