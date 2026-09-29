import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=readFileSync('index.html','utf8'),component=readFileSync('scripts/team-photos.js','utf8');
const catalog=JSON.parse(readFileSync('assets/team-photos/catalog.json','utf8'));
let game={state:'pre'},actual=24;
const ctx={document:{addEventListener(){}},window:{addEventListener(){}},HJ_LEAGUE_STATE:{data:{}},hjCurrentWeek:()=>3,hjPlayerTeam:()=>'BAL',hjUpcomingForWeek:()=>({game}),hjPlayerActualScore:()=>actual};
vm.createContext(ctx);vm.runInContext(component,ctx);
assert.equal(ctx.hjTeamPhotoFinalScore({}),null);
game={state:'in'};assert.equal(ctx.hjTeamPhotoFinalScore({}),null);
game={state:'post'};assert.equal(ctx.hjTeamPhotoFinalScore({}),'24.00');
actual=0;assert.equal(ctx.hjTeamPhotoFinalScore({}),'0.00');
actual=-1.5;assert.equal(ctx.hjTeamPhotoFinalScore({}),'-1.50');
actual=null;assert.equal(ctx.hjTeamPhotoFinalScore({}),null);
game=null;actual=25;assert.equal(ctx.hjTeamPhotoFinalScore({}),null);
const art=extractSiteArtwork(source),html=prepareSite(source);
await fs.mkdir('showcase-preview',{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(route==='/'||route==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 const asset=art.assets.get(route.slice(1));
 if(asset){res.setHeader('Content-Type',route.endsWith('.svg')?'image/svg+xml':'image/png');res.end(asset);return;}
 const file=path.resolve('.','.'+route);if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch(e){res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const resp=await fetch('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558?view=mRoster&view=mTeam&view=mMatchupScore&view=mSettings&view=mStatus',{signal:AbortSignal.timeout(30000)});
if(!resp.ok)throw Error('League data '+resp.status);
const league=await resp.json(),url='http://127.0.0.1:'+server.address().port+'/#rosters';
const browser=await chromium.launch(),safari=await webkit.launch(),errors=[];
const find=page=>page.locator('.hj-team-photo-player[data-team-photo-player="3043078"]');
async function open(page){
 page.on('pageerror',e=>{if(/hjTeamPhoto|HJ_TEAM_PHOTO|SyntaxError/.test(e.message))errors.push(e.message)});
 await page.route('**/apis/v3/games/ffl/**',route=>route.fulfill({json:route.request().url().includes('kona_player_info')?{players:[]}:league}));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-league-team="5"]',{timeout:60000});
 await page.locator('[data-league-team="5"]').first().click();
 await page.waitForSelector('.hj-team-photo-player');
 await page.locator('.hj-team-photo').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll('.hj-team-photo img')].every(i=>i.complete&&i.naturalWidth));
}
async function shot(page,name){await page.locator('.league-roster-head').screenshot({path:'showcase-preview/'+name+'.png'});await fs.writeFile('showcase-preview/'+name+'.base64.txt',(await fs.readFile('showcase-preview/'+name+'.png')).toString('base64'));}
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 await open(page);
 const header=await page.locator('.league-roster-head').boundingBox();
 await find(page).hover();await page.waitForTimeout(300);
 assert.equal(await find(page).getAttribute('aria-pressed'),'true');
 assert.equal(await find(page).locator('.hj-team-photo-caption').innerText(),'RB\nDERRICK\nHENRY');
 const after=await page.locator('.league-roster-head').boundingBox();assert(Math.abs(header.height-after.height)<.5);
 assert.equal(await find(page).getAttribute('data-pc-id'),null);
 assert.equal(await find(page).getAttribute('title'),null);
 await shot(page,'desktop');
 // Refresh must update only data, retaining the active player and loaded artwork.
 await page.evaluate(()=>{window.beforeShowcase=document.querySelector('.hj-team-photo-player.is-active');window.beforeShowcaseImg=beforeShowcase.querySelector('img');window.originalShowcaseScore=hjTeamPhotoFinalScore;hjTeamPhotoFinalScore=()=>0===0?'0.00':null;hjRenderLeague();});
 assert(await page.evaluate(()=>beforeShowcase===document.querySelector('.hj-team-photo-player.is-active')&&beforeShowcaseImg===beforeShowcase.querySelector('img')));
 assert.equal(await find(page).locator('.hj-team-photo-score').innerText(),'0.00');
 await page.evaluate(()=>{hjTeamPhotoFinalScore=()=>null;hjRenderLeague();});
 assert(await find(page).locator('.hj-team-photo-score').evaluate(e=>e.hidden));
 await page.evaluate(()=>{hjTeamPhotoFinalScore=originalShowcaseScore;hjRenderLeague();});
 await page.mouse.move(0,0);assert.equal(await page.locator('.hj-team-photo-player.is-active').count(),0);
 const first=page.locator('.hj-team-photo-player').first();
 await first.focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('.hj-team-photo-player.is-active').count(),1);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.hj-team-photo-player.is-active').count(),0);
 for(const width of [1600,900,390]){
  await page.setViewportSize({width,height:1000});
  await page.locator('.hj-team-photo').scrollIntoViewIfNeeded();
  for(const button of [page.locator('.hj-team-photo-player').first(),page.locator('.hj-team-photo-player').last()]){
   await button.hover();await page.waitForTimeout(260);
   const fit=await button.locator('.hj-team-photo-caption').boundingBox();
   assert(fit.x>=-1&&fit.x+fit.width<=width+1,'Caption outside viewport '+width);
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await find(page).locator('.hj-team-photo-figure').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 // Real touch input verifies horizontal scrubbing versus native vertical page scrolling.
 const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await open(touch);
 await find(touch).tap();assert.equal(await find(touch).getAttribute('aria-pressed'),'true');
 await touch.waitForTimeout(750);await find(touch).tap();assert.equal(await find(touch).getAttribute('aria-pressed'),'false');
 const session=await touch.context().newCDPSession(touch),r=await touch.locator('.hj-team-photo-stage').boundingBox();
 const startX=r.x+r.width*.12,endX=r.x+r.width*.88,y=r.y+r.height*.55,scroll=await touch.evaluate(()=>scrollY),seen=new Set();
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y,id:1}]});
 for(let i=1;i<=16;i++){
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:startX+(endX-startX)*i/16,y,id:1}]});
  await touch.waitForTimeout(20);
  const id=await touch.locator('.hj-team-photo-player.is-active').getAttribute('data-team-photo-player').catch(()=>null);if(id)seen.add(id);
 }
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert(seen.size>=6,'Scrub did not cascade through players: '+seen.size);
 assert(Math.abs((await touch.evaluate(()=>scrollY))-scroll)<3,'Horizontal scrub scrolled page');
 await touch.waitForTimeout(300);await shot(touch,'mobile-scrub');
 const r2=await touch.locator('.hj-team-photo-stage').boundingBox(),x=r2.x+r2.width*.5,y2=r2.y+r2.height*.55;
 const beforeScroll=await touch.evaluate(()=>scrollY);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y2,id:1}]});
 for(let i=1;i<=6;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y2-i*22,id:1}]});await touch.waitForTimeout(30);}
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(250);
 assert((await touch.evaluate(()=>scrollY))>beforeScroll+20,'Vertical page scroll blocked');
 // Safari engine: tap, keyboard, refresh, and gestures use Pointer Events without hover stickiness.
 const phone=await safari.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await open(phone);await find(phone).tap();
 assert.equal(await find(phone).getAttribute('aria-pressed'),'true');
 await phone.evaluate(()=>hjRenderLeague());assert.equal(await find(phone).getAttribute('aria-pressed'),'true');
 await phone.waitForTimeout(750);await find(phone).tap();assert.equal(await find(phone).getAttribute('aria-pressed'),'false');
 await find(phone).tap();await phone.waitForTimeout(260);await shot(phone,'safari-mobile');
 assert.deepEqual(errors,[]);
 await fs.writeFile('showcase-preview/checks.json',JSON.stringify({finalOnly:true,zeroAndNegativeScores:true,hover:true,keyboard:true,tap:true,scrubPlayers:seen.size,verticalScroll:true,refreshPreservesSpotlight:true,edgeLabels:[1600,900,390],reducedMotion:true,safariTap:true,errors},null,2));
 console.log('Showcase passed: hover, touch cascade, vertical scroll, Safari, final-only scores, edge labels, refresh and reduced motion.');
}finally{await browser.close();await safari.close();server.close();}
