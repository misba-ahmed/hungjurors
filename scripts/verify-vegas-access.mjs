// Diagnostic only: this script never writes the published site or changes scoring.
import {readFile, writeFile, mkdir, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const workflow = await readFile('.github/workflows/refresh-pff.yml', 'utf8');
const inline = workflow.split("node --input-type=module <<'DATA_SCRIPT'\n")[1]?.split('          DATA_SCRIPT')[0];
if (!inline) throw Error('Cannot locate the production projection parser');
const scratch = await mkdtemp(join(tmpdir(), 'hj-vegas-check-'));
const parserPath = join(scratch, 'collector.mjs');
await writeFile(parserPath, inline.split('\n').map(line => line.replace(/^ {10}/, '')).join('\n'));
process.env.DATA_UNIT_TEST = '1';
const {vegasUrl, extractRenderedVegasTable, parseRenderedVegas} = await import(pathToFileURL(parserPath).href);
const {chromium} = await import(process.env.VEGAS_PLAYWRIGHT_MODULE || 'playwright');
const html = await readFile('index.html', 'utf8');
const season = Number(html.match(/const NFL_SEASON\s*=\s*(\d{4})/)?.[1]);
if (!season) throw Error('Missing site season');
const evidence = {schema: 1, probe: 'same-browser-passive-wait-v1', season, attemptedAt: Date.now(), ok: false, sources: {}};
const feed = {schema: 1, season, generatedAt: Date.now(), errors: {}};
const browser = await chromium.launch({headless: true});
let blocked = false;
try {
  for (const kind of ['weekly', 'season']) {
    const field = kind === 'weekly' ? 'weekly' : 'seasonProjections';
    if (blocked) {
      evidence.sources[field] = {status: 'not-requested', reason: 'The first source kept its access restriction.'};
      continue;
    }
    const page = await browser.newPage();
    const result = evidence.sources[field] = {url: vegasUrl(kind), status: 'checking'};
    try {
      const response = await page.goto(vegasUrl(kind), {waitUntil: 'load', timeout: 30000});
      result.initialHttpStatus = response?.status();
      result.mitigation = response?.headers()['cf-mitigated'] || null;
      result.initialTitle = await page.title();
      const challenge = result.mitigation === 'challenge';
      if (!response?.ok() && !challenge) {
        blocked = [401, 403, 429].includes(result.initialHttpStatus);
        throw Error(`Source HTTP ${result.initialHttpStatus}`);
      }
      // One passive wait in the original, unmodified browser. No reload, proxy,
      // fingerprint changes, CAPTCHA interaction, or alternate source endpoint.
      result.passiveWait = challenge;
      try {
        await page.locator('table.dataTable').waitFor({state: 'attached', timeout: challenge ? 20000 : 10000});
      } catch (error) {
        result.finalTitle = await page.title();
        blocked = challenge || /just a moment|verify you are human|access denied|checking your browser/i.test(result.finalTitle);
        if (blocked) throw Error(`Source challenge remained after one passive wait (initial HTTP ${result.initialHttpStatus})`);
        throw error;
      }
      const table = await page.evaluate(extractRenderedVegasTable);
      const data = parseRenderedVegas(table, kind, season);
      feed[field] = data;
      Object.assign(result, {
        status: 'collected', rows: data.rows.length, scoring: data.scoring,
        range: table.range, publishedAt: data.publishedAt, checkedAt: data.checkedAt,
        samples: data.rows.filter(row => ['Josh Allen', 'Jahmyr Gibbs', 'Puka Nacua', 'Trey McBride', 'Brock Bowers'].includes(row.name))
          .map(({name, position, sourceProjection, sourceScoring, sourceReceptionPoints}) => ({name, position, sourceProjection, sourceScoring, sourceReceptionPoints}))
      });
    } catch (error) {
      result.status = blocked ? 'blocked' : 'failed';
      result.error = String(error.message || error);
      feed.errors[field] = result.error;
      console.error(`${kind}: ${result.error}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
evidence.ok = Object.values(evidence.sources).every(source => source.status === 'collected');
await mkdir('vegas-access-check', {recursive: true});
await writeFile('vegas-access-check/evidence.json', JSON.stringify(evidence, null, 2));
if (evidence.ok) await writeFile('vegas-access-check/candidate-projections.json', JSON.stringify(feed));
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.ok) process.exitCode = 1;
