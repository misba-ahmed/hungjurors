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
await fs.mkdir('overflow-preview',{recursive:true});
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
const league=await resp.json(),url='http://127.0.0.1:'+server.address().port+'/';

const reports=[];
async function audit(page,label){
 const data=await page.evaluate(()=>{
  const w=document.documentElement.clientWidth;
  const nodes=[...document.querySelectorAll('body *')].flatMap(e=>{
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);
   if(!r.width||!r.height||r.right<=w+.5&&r.left>=-.5)return [];
   let p=e.parentElement,clipped=false;
   while(p&&p!==document.body&&p!==document.documentElement){
    const ps=getComputedStyle(p),pr=p.getBoundingClientRect();
    if(['hidden','clip','auto','scroll'].includes(ps.overflowX)&&pr.left>=-.5&&pr.right<=w+.5){clipped=true;break;}
    p=p.parentElement;
   }
   if(clipped)return [];
   return [{tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className:'',left:r.left,right:r.right,width:r.width,visibility:s.visibility,position:s.position,overflow:s.overflowX,text:(e.textContent||'').trim().slice(0,70)}];
  });
  return {client:w,inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,scale:visualViewport?.scale,viewport:visualViewport?.width,nodes:nodes.slice(0,70)};
 });
 reports.push({label,...data});console.log(label,JSON.stringify({client:data.client,inner:data.inner,doc:data.doc,body:data.body,nodes:data.nodes.slice(0,12)}));
}
async function open(page){
 await page.route('**/apis/v3/games/ffl/**',route=>route.fulfill({json:route.request().url().includes('kona_player_info')?{players:[]}:league}));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.hj-team-photo-player',{timeout:60000});
 await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(4000)]);
 await page.waitForTimeout(600);
}

const checks=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await open(page);
  async function fits(label){
   const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,client:document.documentElement.clientWidth}));
   assert(size.doc<=size.client+1&&size.body<=size.client+1,label+' '+JSON.stringify(size));
   checks.push({browser:name,label,...size});
  }
  for(const width of [320,390,430,600,900]){
   await page.setViewportSize({width,height:1000});
   for(const team of league.teams){
    await page.evaluate(id=>{HJ_LEAGUE_STATE.selectedTeamId=id;hjRenderLeague()},team.id);
    await fits('width '+width+' team '+team.id+' idle');
   }
   for(const pick of ['first','last']){
    const player=pick==='first'?page.locator('.hj-team-photo-player').first():page.locator('.hj-team-photo-player').last();
    await player.scrollIntoViewIfNeeded();await player.tap();await page.waitForTimeout(280);
    assert.equal(await player.getAttribute('aria-pressed'),'true','Edge player selected');
    assert.equal(await player.locator('.hj-team-photo-caption').evaluate(e=>getComputedStyle(e).display),'block');
    await fits('width '+width+' '+pick+' selected');
    await page.evaluate(()=>hjRenderLeague());await fits('width '+width+' '+pick+' refreshed');
    await page.waitForTimeout(750);await player.tap();await page.waitForTimeout(280);
    await fits('width '+width+' '+pick+' deselected');
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.scrollTo({left:100,top:0,behavior:'instant'})});
  assert.equal(await page.evaluate(()=>scrollX),0,'Whole page must not scroll horizontally');
  const nav=await page.locator('nav[aria-label="Sections"]').evaluate(e=>{const before=e.scrollLeft;e.scrollLeft=100;return {before,after:e.scrollLeft,width:e.clientWidth,total:e.scrollWidth};});
  assert(nav.total>nav.width&&nav.after>nav.before,'Navigation rail remains horizontally scrollable');
  const viewport=await page.locator('meta[name="viewport"]').getAttribute('content');
  assert(!/user-scalable=no|maximum-scale/.test(viewport),'Pinch zoom remains enabled');
  await page.evaluate(()=>window.scrollTo({left:0,top:0,behavior:'instant'}));
  await page.screenshot({path:'overflow-preview/'+name+'-mobile.png'});
  await fs.writeFile('overflow-preview/'+name+'-mobile.base64.txt',(await fs.readFile('overflow-preview/'+name+'-mobile.png')).toString('base64'));
 }finally{await browser.close();}
}
await fs.writeFile('overflow-preview/verification.json',JSON.stringify({passed:true,checks,zoomEnabled:true,navScroll:true,pageHorizontalScroll:0},null,2));
console.log('PASS: mobile document width stays inside viewport for every roster, edge selections, refresh, and deselection. Rails and zoom preserved.');
server.close();
