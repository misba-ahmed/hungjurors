# Trade Desk analysis

The Trade Desk keeps market totals, the lineup optimizer, roster ranks, position bars, Breakdown and the seven-factor scorecard in the browser. Its written analysis comes from a Cloudflare Worker using the OpenAI Responses API. The frontend contains no API key. The rest of the site, including index.html, is unchanged.

## Deploy (three steps)

Prerequisites: an OpenAI API account with billing enabled, Node.js, a Cloudflare account, and a current checkout of this repository.

1. In the repository, run:
   ```sh
   cd workers/trade-analysis
   npx wrangler login
   npx wrangler deploy
   ```
   The configuration attaches **trade-analysis.hungjurors.com** to the Worker. This requires hungjurors.com to be an active zone in that Cloudflare account; the main site continues to use GitHub Pages. If DNS is managed elsewhere, remove the configuration's `routes` entry before deploying and use the printed `workers.dev` address in step 3 instead. There is no need to move the site.
2. Store the key as a Worker secret:
   ```sh
   npx wrangler secret put OPENAI_API_KEY
   ```
   Paste the API key into the hidden prompt. Never put it in JavaScript, a repository file, a GitHub Pages setting, or a URL. This creates a new deployed Worker version with the secret.
3. Open **hungjurors.com → League HQ → Roster Strength → Trade Desk**, select players on both sides, and wait for the analysis. The custom-domain configuration works with the committed frontend as-is. If using workers.dev instead, set `ANALYSIS_ENDPOINT` in `scripts/trade-desk.js` to the exact URL printed in step 1, commit that one-line change, and let Publish finish first.

Before the Worker is deployed or the secret is set, the deterministic trade comparisons still work. A failed request quietly removes the writing indicator.

## Configuration and behavior

- `workers/trade-analysis/wrangler.jsonc` selects the model (`gpt-5.4` by default). Change `MODEL` there and deploy to select another Responses model supporting reasoning and strict JSON schema output.
- The API accepts browser requests only from the exact origin `https://hungjurors.com`. No wildcard or credentials are allowed. Origin checks are browser access control, not user authentication; non-browser clients can spoof Origin. The function also limits requests per IP and across the function, bounds input/output size, rejects stale or malformed dossiers, and times out model requests.
- Rate-limit namespaces 49301 and 49302 must be unused by other Workers in the same account. Defaults are six calls per IP per minute and 30 total per minute. Cloudflare's limits are local to each location, not an account-wide billing cap.
- Successful analyses are cached for ten minutes in the browser (including the current tab's session storage). The key includes the managers, selected players, season/week, market snapshot, roster identities, injuries and roster-view basis. Server caching uses the complete dossier without its request timestamp.
- Selection is debounced. Responses for a previous selection cannot replace the current trade. Failures show only the deterministic sections, never an error paragraph. The full returned paragraphs are rendered without truncation.
- Only p, ul, li and b are accepted from the Worker. The browser independently rebuilds this allowlist without attributes. News and other dossier strings are explicitly treated as untrusted evidence in the model brief.

## Facts and boundaries

The dossier contains both rosters, optimized slots before/after, incoming roles, benched players, the lowest-valued drop candidates when required by league capacity, bye-specific lineups, unit ranks, records and observed season metrics, fantasy schedules and head-to-head games. Player facts include full recent Rotowire blurbs and Spin, injury reports, relevant teammates, with/without samples, weekly usage, the latest game, market movement, PFF, team offensive ranks/red-zone trips, wire alternatives and defense-vs-position schedules through Week 16.

Full-season projections are not relabeled as remaining totals. The adapter subtracts completed-week points and allocates the remaining estimate across scheduled games through this league's Week 16 finish. This is an estimate, recorded with its basis in the dossier; it does not claim a new weekly projection model. This-week effects are gated on the loaded current-week feed. IR return dates and temporary role windows remain facts for the analyst to weigh, rather than being converted into an invented exact points adjustment.

Under 10% market differences are balanced; under two points per week are treated as a lineup wash. Posture labels are withheld before four games. Balance options must be above replacement and cannot add another required drop. Observed absences are not diagnosed as injuries.

Verification: `node scripts/test-trade-desk.mjs` checks roster math, sample gates, news filtering and the server contract. `node scripts/test-trade-desk-browser.mjs` checks the request lifecycle, sanitization and 390px layout with Playwright. These tests use fixtures and never call a paid model.

References: [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [structured model output](https://developers.openai.com/api/docs/guides/structured-outputs).
