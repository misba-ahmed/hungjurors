import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=readFileSync('index.html','utf8'),component=readFileSync('scripts/team-photos.js','utf8');
const catalog=JSON.parse(readFileSync('assets/team-photos/catalog.json','utf8'));
const art=extractSiteArtwork(source),html=prepareSite(source);
await fs.mkdir('spacing-preview',{recursive:true});
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
async function shot(page,name){await page.locator('.league-roster-head').screenshot({path:'spacing-preview/'+name+'.png'});await fs.writeFile('spacing-preview/'+name+'.base64.txt',(await fs.readFile('spacing-preview/'+name+'.png')).toString('base64'));}

try{
 const page=await browser.newPage({viewport:{width:390,height:1000}});
 await open(page);
 const checks=[];
 for(const width of [390,600,601,900,1050,1051,1600]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>{HJ_LEAGUE_STATE.selectedTeamId=8;hjRenderLeague();});
  await page.locator('.league-roster-head').scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  const measure=await page.evaluate(()=>{
   const r=s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height,paddingTop:parseFloat(getComputedStyle(e).paddingTop),paddingBottom:parseFloat(getComputedStyle(e).paddingBottom)}};
   return {card:r('.hj-business-card'),sticky:r('.league-roster-head>.league-matchup-score'),photo:r('.hj-team-photo'),stage:r('.hj-team-photo-stage'),head:r('.league-roster-head')};
  });
  assert(Math.abs(measure.card.width/measure.card.height-38/23)<.006,'Business-card proportions preserved');
  if(width<=1050){
   assert(measure.sticky.bottom<=measure.photo.y+1,'Matchup must be above the lineup');
   assert(measure.photo.paddingTop===12&&measure.photo.paddingBottom===18,'Compact photo padding');
   assert(measure.stage.y-Math.max(measure.sticky.bottom,measure.card.bottom)<=19,'No excess gap above lineup');
   assert(measure.head.bottom-measure.stage.bottom<=31,'No excess gap below lineup');
   if(width<=600)assert(measure.sticky.y>=measure.card.bottom,'Mobile card, matchup, lineup order');
  }else assert(Math.abs(measure.sticky.y+measure.sticky.height/2-measure.photo.y-measure.photo.height/2)<2,'Desktop layout preserved');
  checks.push({width,...measure});
  if([390,900,1600].includes(width))await shot(page,'layout-'+width);
 }
 await page.setViewportSize({width:390,height:1000});
 await page.locator('.hj-team-photo').scrollIntoViewIfNeeded();
 const first=page.locator('.hj-team-photo-player').first(),before=await page.locator('.league-roster-head').boundingBox();
 await first.hover();await page.waitForTimeout(280);
 const after=await page.locator('.league-roster-head').boundingBox();
 assert(Math.abs(before.height-after.height)<.5,'Selecting a player must not move the layout');
 assert.equal(await first.locator('.hj-team-photo-caption').evaluate(e=>getComputedStyle(e).visibility),'visible');
 await shot(page,'mobile-selected');
 await page.evaluate(()=>hjRenderLeague());
 assert.equal(await page.locator('.hj-team-photo-player.is-active').count(),1,'Refresh preserves selection');
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
 await fs.writeFile('spacing-preview/checks.json',JSON.stringify({checks,touchCascadePlayers:seen.size,verticalScroll:true,safariTap:true,selectionStable:true},null,2));
 console.log('PASS: compact mobile/tablet order, unchanged desktop, no layout shift, touch cascade and Safari.');
}finally{await browser.close();await safari.close();server.close();}
