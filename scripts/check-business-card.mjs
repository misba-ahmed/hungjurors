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
await fs.mkdir('card-preview',{recursive:true});
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

const report=[];
async function inspect(page,width,manager){
 await page.setViewportSize({width,height:1000});
 await page.evaluate(id=>{HJ_LEAGUE_STATE.selectedTeamId=id;hjRenderLeague()},manager);
 const card=page.locator('.league-roster-head>.hj-business-card');
 await card.waitFor();
 await card.scrollIntoViewIfNeeded();
 await page.waitForTimeout(180);
 const m=await card.evaluate(e=>{
  const r=e.getBoundingClientRect(),box=s=>{const n=e.querySelector(s),b=n.getBoundingClientRect();return {x:(b.x-r.x)/r.width,y:(b.y-r.y)/r.height,w:b.width/r.width,h:b.height/r.height,font:parseFloat(getComputedStyle(n).fontSize)/r.width,right:b.right,bottom:b.bottom,scroll:n.scrollWidth,client:n.clientWidth}};
  return {width:r.width,height:r.height,x:r.x,right:r.right,name:e.querySelector('.league-roster-name').textContent,avatar:box('.av'),copy:box('.hj-business-copy'),logo:box('.hj-business-logo'),stats:box('.hj-business-stats'),title:box('.league-roster-name'),team:box('.hj-business-team')};
 });
 assert(Math.abs(m.width/m.height-38/23)<.006,'Card aspect at '+width);
 assert(m.width<=380.5&&m.x>=-1&&m.right<=width+1,'Card fits at '+width);
 assert(Math.abs(m.avatar.x-.0975)<.002&&Math.abs(m.avatar.w-.141)<.002,'Avatar proportions at '+width);
 assert(Math.abs(m.title.font-.0805)<.002,'Title scale at '+width);
 assert(Math.abs(m.stats.y-.634)<.002,'Stats alignment at '+width);
 assert(m.team.bottom<m.stats.bottom-m.stats.h*m.height,'Team name touches stats '+m.name+' '+width);
 assert(m.title.scroll<=m.title.client+1,'Manager name overflow '+m.name+' '+width);
 report.push({viewport:width,manager:m.name,width:m.width,height:m.height});
 if(manager===5&&[390,600,900,1100,1600].includes(width)){
  await page.locator('.league-roster-head').screenshot({path:'card-preview/card-'+width+'.png'});
  await fs.writeFile('card-preview/card-'+width+'.base64.txt',(await fs.readFile('card-preview/card-'+width+'.png')).toString('base64'));
 }
}
const browser=await chromium.launch(),safari=await webkit.launch();
async function open(page){
 await page.route('**/apis/v3/games/ffl/**',route=>route.fulfill({json:route.request().url().includes('kona_player_info')?{players:[]}:league}));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-league-team="5"]',{timeout:60000});
 await page.locator('[data-league-team="5"]').first().click();
 await page.waitForSelector('.hj-team-photo-player');
 await page.waitForFunction(()=>[...document.querySelectorAll('.hj-team-photo img')].every(i=>i.complete&&i.naturalWidth));
}
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 await open(page);
 for(const width of [320,390,600,601,768,900,1024,1050,1051,1100,1280,1600,1920]){
  for(const manager of [5,4,10])await inspect(page,width,manager);
 }
 const apple=await safari.newPage({viewport:{width:390,height:1000}});
 await open(apple);
 for(const width of [390,900,1600])await inspect(apple,width,5);
 await fs.writeFile('card-preview/results.json',JSON.stringify({passed:true,report},null,2));
 console.log('PASS: fixed card proportions, text and avatar alignment at 13 viewport sizes, including Safari.');
}finally{await browser.close();await safari.close();server.close();}
