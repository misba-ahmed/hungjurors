import fs from'node:fs';import{execFileSync}from'node:child_process';
execFileSync('npm',['install','--no-save','--package-lock=false','playwright'],{stdio:'inherit'});execFileSync('npx',['playwright','install','--with-deps','chromium'],{stdio:'inherit'});
const {chromium}=await import('playwright');const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/leagues/**',r=>{const u=new URL(r.request().url());if(u.searchParams.get('scoringPeriodId')==='4'&&u.searchParams.getAll('view').includes('mMatchup'))return r.abort();return r.continue();});
await page.goto('https://hungjurors.com/?verify=rosters-a0c69ad',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.length,{},{timeout:30000});
const result=await page.evaluate(()=>{HJ_HQ_STATE.matchupWeek=4;hjRenderMatchupCenter();hjSetHQTab('matchups');return {seed:typeof HJ_MATCHUP_HISTORY_SEED!=='undefined',week:HJ_HQ_STATE.matchupWeek,cards:[...document.querySelectorAll('#hq-matchup-content [data-hq-matchup]')].map(c=>({key:c.dataset.hqMatchupKey,players:c.querySelectorAll('.pc-player-trigger').length}))};});
fs.writeFileSync('.mascot-fix/live-roster-verification.json',JSON.stringify(result));if(!result.seed||result.cards.length!==5||result.cards.some(c=>c.players<30))throw Error(JSON.stringify(result));await browser.close();
