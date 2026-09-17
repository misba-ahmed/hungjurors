import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {prepareSite} from './prepare-site.mjs';

const workflow = await readFile('.github/workflows/refresh-pff.yml', 'utf8');
const inline = workflow.split("node --input-type=module <<'DATA_SCRIPT'\n")[1]?.split('          DATA_SCRIPT')[0];
assert.ok(inline, 'Production parser must remain available to the scheduled collector');
const scratch = await mkdtemp(join(tmpdir(), 'hj-vegas-feed-test-'));
try {
  const modulePath = join(scratch, 'collector.mjs');
  await writeFile(modulePath, inline.split('\n').map(line => line.replace(/^ {10}/, '')).join('\n'));
  process.env.DATA_UNIT_TEST = '1';
  const {collectScheduledBrowserVegas, nflWeek, sourceTimestamp, vegasUrl, VEGAS_FEED_MAX_AGE} = await import(pathToFileURL(modulePath).href);
  const now = Date.now(), season = new Date(now).getUTCFullYear();
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true}).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const updated = `${part('month')}/${part('day')}/${part('year')} ${part('hour')}:${part('minute')} ${part('dayPeriod')} ET`;
  // Synthetic rows exercise feed contracts; these never become publication data.
  const section = kind => ({source:'WinWithOdds', sourceUrl:vegasUrl(kind), scoring:'.5tep', season,
    week:kind==='weekly'?nflWeek(now,season):0, updated, publishedAt:sourceTimestamp(updated),
    checkedAt:now, transport:'scheduled-browser', rows:Array.from({length:201},(_,i)=>({
      name:`Test Player ${i}`, position:i%2?'TE':'QB', sourceProjection:20.1,
      sourceScoring:'.5tep', sourceReceptionPoints:i%2?1.5:1
    }))});
  const feed = {schema:1, producer:'chatgpt-scheduled-browser-v1', season, generatedAt:now,
    weekly:section('weekly'), seasonProjections:section('season')};
  const html=prepareSite(await readFile('index.html','utf8'));
  const start=html.indexOf('function hjHostedVegasValid('),end=html.indexOf('async function hjLoadHostedVegas(',start);
  const frontend=vm.createContext({Date,NFL_SEASON:season,hjCurrentWeek:()=>nflWeek(now,season)});
  vm.runInContext(html.slice(start,end),frontend);
  assert.ok(frontend.hjHostedVegasValid('weekly',feed.weekly));
  assert.ok(frontend.hjHostedVegasValid('weekly',{...feed.weekly,checkedAt:now-75*60000}),'Hourly collections need publication headroom');
  assert.equal(frontend.hjHostedVegasValid('weekly',{...feed.weekly,checkedAt:now-91*60000}),false,'Old retrievals must expire');
  assert.equal(frontend.hjHostedVegasValid('season',feed.weekly),false);
  const load = candidate => collectScheduledBrowserVegas(season, async()=>candidate);
  const fresh = await load(feed);
  assert.equal(fresh.weekly.data, feed.weekly, 'Publishing must not rewrite the browser retrieval time');
  assert.equal(fresh.season.data.publishedAt, feed.seasonProjections.publishedAt);
  assert.equal(fresh.weekly.data.rows[1].sourceProjection,20.1,'Publishing must not add another TE bonus');
  for (const change of [
    f=>f.producer='unknown', f=>f.generatedAt=now-VEGAS_FEED_MAX_AGE-1,
    f=>f.generatedAt=now+120000, f=>f.season--
  ]) {
    const bad=structuredClone(feed);change(bad);const result=await load(bad);
    assert.ok(result.weekly.error && result.season.error, 'Invalid envelopes must fail both sections');
  }
  for (const change of [
    f=>f.weekly.checkedAt=now-VEGAS_FEED_MAX_AGE-1,
    f=>f.weekly.week=f.weekly.week===1?2:1,
    f=>f.weekly.scoring='ppr', f=>f.weekly.sourceUrl=vegasUrl('season'),
    f=>f.weekly.rows[1].sourceReceptionPoints=2,
    f=>f.weekly.rows[1].sourceScoring='ppr',
    f=>f.weekly.publishedAt-=60000,
    f=>f.weekly.rows[2]=structuredClone(f.weekly.rows[0]),
    f=>f.weekly.rows.length=2
  ]) {
    const bad=structuredClone(feed);change(bad);const result=await load(bad);
    assert.ok(result.weekly.error,'Invalid weekly sections must fail');
    assert.ok(result.season.data,'An independent valid season section stays usable');
  }
  const refused=await collectScheduledBrowserVegas(season,async()=>{throw Error('upstream unavailable')});
  assert.ok(refused.weekly.error && refused.season.error);
  console.log('PASS: scheduled browser feed identity, freshness, periods, publication timestamps, TE scoring, completeness, and failure isolation');
} finally {
  await rm(scratch,{recursive:true,force:true});
}
