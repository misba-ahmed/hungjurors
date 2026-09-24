# Trade Desk analysis

Trade analysis now runs entirely on the visitor's device through WebLLM. There is no OpenAI request, hosted inference fallback, API key, token bill, or provider usage allowance. The site remains on GitHub Pages.

## Browser behavior

Select a trade and click **Write analysis** beneath the factor scorecard. The first use downloads the model and tokenizer. WebLLM caches model files in browser storage; clearing that storage requires another download. Initial download and inference can take time and require substantial device memory. A working WebGPU adapter is required. No claim is made that every phone or browser supports this workload.

The page shows only the analysis control, loading progress and the existing write-up sections. Failures retain all deterministic comparisons and offer another attempt. There is no provider, setup, billing or technical explanation on the page.

After the first click, subsequent trade selections in the same page session generate locally after a short debounce. Completed reports are cached for ten minutes by trade, roster, week, market and injury state. Changing a trade cancels the old generation; one job runs at a time. Old results cannot replace the current selection. Heavy model work runs in a dedicated Web Worker.

## Implementation

- `scripts/trade-desk.js`: existing dossier/lineup calculations and UI; dynamically imports the local client after activation.
- `scripts/trade-analysis-local.mjs`: cancellation-safe browser-to-worker requests.
- `scripts/trade-analysis-worker.mjs`: WebLLM 0.2.85, WebTokenizers 0.1.6, Qwen3-1.7B with q4f16 or q4f32 according to shader-f16 support. The 8,192-token context bounds GPU cache memory. Model/CDN downloads use no credentials and receive no league dossier.
- `scripts/trade-analysis-shared.mjs`: original analyst brief, full dossier and HTML validation, context sizing and generation. The model tokenizer counts input tokens. Dossiers that exceed the context window are split losslessly and read by the model in portions; only the model's notes are condensed for the final report. No article, Spin, source evidence or displayed output is cut off to fit. A response that ends at its token limit is rejected.
- `workers/trade-analysis/worker.mjs`: a retired endpoint returning HTTP 410 for old tabs. It never reads a key or calls any model. The Cloudflare service is no longer part of analysis. A previously saved OpenAI secret is unused and can be removed from Cloudflare.

The same dossier supplies manager records, needs, exact lineup slots, drops, bye coverage, free agents, player and teammate news/Spin, usage samples, timelines and schedules. The local model is substantially smaller than the previous hosted model; equivalent prose/reasoning quality is not promised.

Generated HTML remains restricted to p, ul, li and b, with independent browser sanitization. Dossier strings remain untrusted evidence, never instructions. The paid-model cache is not reused.

## Verification

`node scripts/test-trade-desk.mjs` checks existing calculations, lossless evidence splitting/context handling, rejected truncated output and that the retired endpoint cannot make network calls.

`node scripts/test-trade-desk-browser.mjs` checks the local Worker lifecycle, activation, cache, changing selections, failure and the 390px layout with mocked inference. It does not download model weights or make paid requests. Real generation speed, model quality and device-specific GPU compatibility require a supported device; the automated checks do not simulate those performance characteristics.

References: [WebLLM](https://webllm.mlc.ai/docs/), [Web Workers](https://webllm.mlc.ai/docs/user/advanced_usage.html), [model records](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts).
