# Trade Desk analysis

The existing Trade Desk comparisons remain on GitHub Pages. Written analysis uses Gemini 2.5 Flash with Google Search through the existing Cloudflare Worker. Browsers do not load WebLLM, download model weights, use WebGPU, or call Google directly.

## Activate without billing

1. Open [Google AI Studio API keys](https://aistudio.google.com/api-keys). Create a project/key and verify that the project's usage tier is **Free**. Do not link billing, upgrade, or add credits.
2. Open the existing Cloudflare **hungjurors-trade-analysis → Settings → Runtime variables and secrets**, select Production, and save these as secrets:
   - **GEMINI_API_KEY**: the newly created key.
   - **GEMINI_FREE_TIER_CONFIRMED**: **true**, only after verifying Free in AI Studio.
3. Deploy the saved secrets. The Production workers.dev address must be enabled. Open **League HQ → Roster Strength → Trade Desk**, select a trade and click **Write analysis**.

The endpoint is https://hungjurors-trade-analysis.misbauddin-ahmed.workers.dev/gemini. Git-connected Cloudflare builds deploy from workers/trade-analysis. Its configuration keeps workers.dev enabled and previews disabled.

Do not send a key through chat, commit it to GitHub, or add it to page JavaScript. The previous OPENAI_API_KEY and MODEL variables are ignored. There is no alternate model, retry loop, upgrade operation or paid-provider fallback.

**The API key does not disclose its billing tier to this Worker.** The confirmation flag is a required deployment check, not automatic billing verification. The project must remain Free; do not enable billing later while continuing to use this key. Google's Free tier enforces its allowance. Exhaustion stops generation rather than buying more capacity. Other unrelated account usage can also consume that quota. Cloudflare must also remain on its Free plan.

[Google pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash) lists a free search-grounding allowance for Gemini 2.5 Flash, shared with Flash-Lite. [Model/account rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) can be lower; 500 grounded requests is not a promise of 500 completed reports. Newer models have different search billing and are not automatic substitutes.

## Behavior and scope

Only an explicit **Write analysis** click sends a request. Editing the deal, browsing rosters or refreshing does not automatically consume the allowance. An unchanged report stays on screen through ordinary rerenders. Changing the trade removes that report and requires another explicit click. The saved trade selection survives a reload; model output is not saved.

The compact input contains both complete rosters, outgoing player IDs, record, roster slots/capacity, league scoring/playoff rules, current market values and 30-day changes. Gemini receives the current server date and researches current news, usage, teammate injuries, role windows and playoff schedules itself. It is instructed to qualify sample sizes and verify injury/return dates. Configuring search alone is not sufficient: the response must include evidence of a search and its associated search suggestions.

The entire written report follows the existing Breakdown and seven-row Factor scorecard. Source links and Google's search suggestions accompany it. Empty optional sections are omitted. No setup, provider limits, billing or model-loading explanation appears in the site UI. On failure, the deterministic comparisons remain and the button permits a manual retry.

Google's [grounding terms](https://ai.google.dev/gemini-api/terms#grounding-with-google-search) require the associated search suggestions to be displayed and restrict caching. Reports are held only as the current view; there is no browser storage cache, shared response cache, link tracking or automated reuse. The report text is rendered in full and sources open directly. Google's supplied suggestion markup is validated, then displayed intact in a shadow root so its styles stay scoped to the suggestion area.

## Implementation and checks

- scripts/trade-desk.js: compact request, explicit activation, cancellation, draft recovery, safe section rendering and source display.
- scripts/trade-analysis-shared.mjs: analyst instructions, request contract and complete response validation.
- workers/trade-analysis/worker.mjs: exact Origin and path checks, required free-tier confirmation, bounded input/output, request timeout, rate limit bindings and server-only key. Legacy paths remain HTTP 410.
- workers/trade-analysis/wrangler.jsonc: existing Worker identity, production URL and rate limit bindings. Limiters are Cloudflare location-based abuse controls, not a global billing cap or authentication. A non-browser caller can forge Origin; no claim is made that CORS authenticates a league member.

node scripts/test-trade-desk.mjs covers unchanged calculations and mocked Gemini request/response, free-tier/key gates, old-client rejection, origin checks, size bounds and quota errors. node scripts/test-trade-desk-browser.mjs covers explicit activation, compact input, sources, 390px layout, cancellation and quiet failure with a mocked HTTP endpoint. Neither check uses a real model or incurs inference charges.

**Live generation and report quality still require one real trial after the Free-tier key is configured.** Passing mock checks is not proof of provider availability or football accuracy.
