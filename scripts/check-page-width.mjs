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
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await open(page);await audit(page,name+' baseline');
  await page.addStyleTag({content:'.hj-team-photo-player:not(.is-active) .hj-team-photo-caption,.hj-team-photo-player:not(.is-active) .hj-team-photo-score{display:none}'});
  await audit(page,name+' hidden labels removed');
  await page.addStyleTag({content:'html{overflow-x:clip}'});
  await audit(page,name+' root clip');
 }finally{await browser.close();}
}
await fs.writeFile('overflow-preview/diagnosis.json',JSON.stringify(reports,null,2));
server.close();
