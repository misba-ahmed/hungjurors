import fs from'node:fs';import path from'node:path';import{execFileSync}from'node:child_process';
execFileSync('git',['fetch','origin','main']);execFileSync('git',['worktree','add','--detach','/tmp/roster-fix','origin/main']);
for(const[from,to]of[['roster-helper.js','scripts/matchup-history.js'],['roster-prep.mjs','scripts/prepare-site.mjs'],['roster-tests.mjs','scripts/test-matchup-history.mjs']])fs.copyFileSync('.mascot-fix/'+from,'/tmp/roster-fix/'+to);
fs.mkdirSync('/tmp/roster-fix/data',{recursive:true});fs.copyFileSync('.mascot-fix/verified-matchup-history.json','/tmp/roster-fix/data/matchup-history.json');
execFileSync('node',['--test','scripts/test-matchup-week.mjs','scripts/test-matchup-history.mjs'],{cwd:'/tmp/roster-fix',stdio:'inherit'});
execFileSync('node',['scripts/prepare-site.mjs','index.html'],{cwd:'/tmp/roster-fix',stdio:'inherit'});
execFileSync('npm',['install','--no-save','--package-lock=false','playwright'],{stdio:'inherit'});
execFileSync('npx',['playwright','install','--with-deps','chromium'],{stdio:'inherit'});
const {chromium}=await import('playwright');const browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{const url=new URL(route.request().url());
if(url.hostname==='hungjurors.com'){const p=path.join('/tmp/roster-fix',decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(fs.existsSync(p)&&fs.statSync(p).isFile()){const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};return route.fulfill({body:fs.readFileSync(p),contentType:types[path.extname(p)]||'application/octet-stream'});}}
if(url.hostname==='lm-api-reads.fantasy.espn.com'&&url.searchParams.get('scoringPeriodId')==='4'&&url.searchParams.getAll('view').includes('mMatchup'))return route.abort();
return route.continue();});
await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.length,{},{timeout:30000});
const results=[];
for(const width of [1440,390]){await page.setViewportSize({width,height:1000});results.push(await page.evaluate(()=>{
 HJ_HQ_STATE.matchupWeek=4;hjRenderMatchupCenter();hjSetHQTab('matchups');
 const root=document.querySelector('#hq-matchup-content');
 return {width:innerWidth,cards:[...root.querySelectorAll('[data-hq-matchup]')].map(c=>({key:c.dataset.hqMatchupKey,players:c.querySelectorAll('.pc-player-trigger').length,sample:[...c.querySelectorAll('.pc-player-trigger')].slice(0,2).map(x=>x.textContent.trim())})),history:HJ_DATA.history.get(4)?.schedule.length};
}));}
fs.writeFileSync('.mascot-fix/roster-browser-result.json',JSON.stringify({results,errors}));
if(results.some(r=>r.cards.length!==5||r.cards.some(c=>c.players<30)))throw Error(JSON.stringify(results));
await page.screenshot({path:'.mascot-fix/roster-mobile.png',fullPage:false});await browser.close();
