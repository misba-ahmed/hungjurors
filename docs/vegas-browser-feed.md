# Automatic Vegas projections

Two interchangeable collectors can feed the site: the scheduled ChatGPT browser task (producer `chatgpt-scheduled-browser-v1`) and the free home collector in `collector/` that runs on a Mac from launchd every two hours (producer `hj-home-collector-v1`, see `collector/README.md`). Both read these exact rendered source pages:

- https://www.winwithodds.com/weekly_full_stats/.5tep
- https://www.winwithodds.com/season_long_full_stats/.5tep

It verifies the initialized table, active `.5tep` scoring, standard range, season, and current weekly period with `extractRenderedVegasTable` and `parseRenderedVegas` from the production workflow. It commits only verified `data/projections.json` to the `vegas-browser-feed` branch. The hourly browser task processes weekly and season tables independently. Publish each freshly validated section even if the other source fails; retain a failed section only with its original timestamps and record its error. If neither source succeeds, do not advance `generatedAt` or write a replacement feed. Read the branch again before committing and preserve any newer concurrently collected section. The source's displayed projection already includes the TE reception bonus.

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

## Week rollover and collector recovery

The site changes its projection week on Tuesday in America/Chicago. A prior-week feed must never be relabeled or used as current. New weekly projections can appear only after WinWithOdds publishes that week's table and a collector successfully retrieves it. The browser backup task runs hourly; the site publisher consumes the branch every 15 minutes. This means availability follows successful collection and publication, not midnight alone.

On October 13, 2026 the feed branch still held Week 5 from October 12 at 10:25 PM CT while the site required Week 6. The hourly browser backup was disabled. Week 6 had been published by the source at 8:01 AM ET and was restored through a validated rendered-browser collection (344 QB/RB/WR/TE rows). The backup task was re-enabled and changed to independent section updates. A stopped home machine no longer leaves the home collector as the only scheduled collection path.

Keep the browser task enabled after transient failures and report concrete collection failures. A blocked/unavailable source or projections not yet published still cannot supply current values; do not fabricate them or extend timestamps to hide an outage. The existing 36-hour freshness window only protects same-week, previously verified data.
