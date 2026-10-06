import fs from 'node:fs';import path from 'node:path';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);execFileSync('git',['worktree','add','--detach','/tmp/matchup-fix','origin/main']);
for(const [from,to]of [['history.js','scripts/matchup-history.js'],['prepare.mjs','scripts/prepare-site.mjs'],['tests.mjs','scripts/test-matchup-history.mjs']])fs.copyFileSync('.mascot-fix/matchup-'+from,'/tmp/matchup-fix/'+to);
execFileSync('node',['--test','scripts/test-matchup-week.mjs','scripts/test-matchup-history.mjs'],{cwd:'/tmp/matchup-fix',stdio:'inherit'});
execFileSync('node',['scripts/prepare-site.mjs','index.html'],{cwd:'/tmp/matchup-fix',stdio:'inherit'});
execFileSync('npm',['install','--no-save','--package-lock=false','playwright'],{stdio:'inherit'});
execFileSync('npx',['playwright','install','--with-deps','chromium'],{stdio:'inherit'});
const {chromium}=await import('playwright');const browser=await chromium.launch();const page=await browser.newPage();
const delayed=[];await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.hostname==='hungjurors.com'){const p=path.join('/tmp/matchup-fix',decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(fs.existsSync(p)&&fs.statSync(p).isFile()){const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};return route.fulfill({body:fs.readFileSync(p),contentType:types[path.extname(p)]||'application/octet-stream'});}}
 if(url.hostname==='lm-api-reads.fantasy.espn.com'&&url.searchParams.get('scoringPeriodId')==='4'&&url.searchParams.getAll('view').includes('mMatchup')){delayed.push(route);return;}
 return route.continue();
});
await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.length,{},{timeout:30000});
const results=[];
for(const width of [1440,390]){
 await page.setViewportSize({width,height:1000});
 results.push(await page.evaluate(()=>{
  HJ_HQ_STATE.matchupWeek=4;const start=performance.now();hjRenderMatchupCenter();hjSetHQTab('matchups');
  const root=document.querySelector('#hq-matchup-content');
  return {width:innerWidth,cards:root.querySelectorAll('[data-hq-matchup]').length,blankMessage:root.textContent.includes('matchups will appear when the schedule loads'),elapsed:performance.now()-start,week:HJ_HQ_STATE.matchupWeek};
 }));
}
if(results.some(r=>r.cards!==5||r.blankMessage))throw Error(JSON.stringify(results));
fs.writeFileSync('.mascot-fix/matchup-browser-result.json',JSON.stringify({passed:true,delayedRequests:delayed.length,results}));
await browser.close();
