import fs from 'node:fs/promises';
import {readFileSync,existsSync} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const teams=JSON.parse(readFileSync('assets/team-photos/sources/rosters.json','utf8'));
const catalog=JSON.parse(readFileSync('assets/team-photos/catalog.json','utf8'));
const component=readFileSync('scripts/team-photos.js','utf8');
const entries=t=>t.players.map(p=>({lineupSlotId:p.slot,playerPoolEntry:{player:{id:Number(p.id),fullName:p.name,defaultPositionId:({QB:1,RB:2,WR:3,TE:4,K:5})[p.position],proTeamId:p.teamId}}}));
const sandbox={HJ_TEAM_PHOTO_ASSETS:catalog,hjPlayer:e=>e.playerPoolEntry.player,hjRosterEntries:t=>t.roster.entries,hjBenchCompare:(a,b)=>a.playerPoolEntry.player.fullName.localeCompare(b.playerPoolEntry.player.fullName),hjLineupCompare:(a,b)=>a.lineupSlotId-b.lineupSlotId,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),hjPlayerPhoto:e=>'https://a.espncdn.com/i/headshots/nfl/players/full/'+e.playerPoolEntry.player.id+'.png'};
vm.createContext(sandbox);vm.runInContext(component,sandbox);
for(const t of teams){
 const roster=entries(t);const html=sandbox.hjTeamPhotoHTML({roster:{entries:roster}});
 assert.equal((html.match(/data-team-photo-player=/g)||[]).length,roster.length);
 assert.equal((html.match(/ is-starter/g)||[]).length,roster.filter(e=>![20,21].includes(e.lineupSlotId)).length);
 assert(roster.every(e=>catalog[e.playerPoolEntry.player.id]));
 const ordered=sandbox.hjTeamPhotoOrder(roster),active=ordered.filter(e=>![20,21].includes(e.lineupSlotId)).map(e=>e.lineupSlotId);
 assert.deepEqual([...active],[17,6,4,2,0,2,4,23]);
}
const changed=entries(teams[0]);changed.push({lineupSlotId:16,playerPoolEntry:{player:{id:-1600,defaultPositionId:16}}});
assert.equal(sandbox.hjTeamPhotoOrder(changed).length,teams[0].players.length);
const smaller=changed.filter(e=>e.lineupSlotId!==20);assert.equal(sandbox.hjTeamPhotoOrder(smaller).length,smaller.length-1);
const starter=changed.find(e=>e.lineupSlotId===2),benched=changed.find(e=>e.lineupSlotId===20&&e.playerPoolEntry.player.defaultPositionId===2);
starter.lineupSlotId=20;benched.lineupSlotId=2;
const changedHTML=sandbox.hjTeamPhotoHTML({roster:{entries:changed}});
assert(changedHTML.includes('is-starter" data-team-photo-player="'+benched.playerPoolEntry.player.id+'"'));
assert(!changedHTML.includes('is-starter" data-team-photo-player="'+starter.playerPoolEntry.player.id+'"'));
console.log('Roster membership, all starter glows, bench/IR order, smaller rosters and lineup changes verified.');
const source=readFileSync('index.html','utf8'),art=extractSiteArtwork(source),html=prepareSite(source);
await fs.mkdir('team-photo-preview',{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(route==='/'||route==='/index.html'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const asset=art.assets.get(route.slice(1));if(asset){res.setHeader('Content-Type',mime[path.extname(route)]||'application/octet-stream');res.end(asset);return;}
 const file=path.resolve('.','.'+route);if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch(e){res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const leagueResponse=await fetch('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558?view=mRoster&view=mTeam&view=mMatchupScore&view=mSettings&view=mStatus',{signal:AbortSignal.timeout(30000)});
if(!leagueResponse.ok)throw Error('League fixture '+leagueResponse.status);
const league=await leagueResponse.json();
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/apis/v3/games/ffl/**',route=>route.fulfill({json:route.request().url().includes('kona_player_info')?{players:[]}:league}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/#rosters',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-league-team="1"]',{timeout:60000});
 await page.locator('[data-league-team="1"]').first().click();
 await page.waitForSelector('.hj-team-photo-player',{timeout:30000});
 await page.locator('.league-roster-head').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.hj-team-photo img')).every(i=>i.complete&&i.naturalWidth>0));
 const initial=await page.evaluate(()=>{
 const el=document.querySelector('.hj-team-photo');window.photoRef=el;window.photoImageRef=el.querySelector('img');
 return {count:el.children.length,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height};
 });
 assert.equal(initial.count,teams.find(t=>t.id===1).players.length);
 assert(initial.width>300&&initial.height>75);
 await page.evaluate(()=>hjRenderLeague());
 assert(await page.evaluate(()=>window.photoRef===document.querySelector('.hj-team-photo')&&window.photoImageRef===document.querySelector('.hj-team-photo img')));
 await page.locator('.league-roster-head').screenshot({path:'team-photo-preview/desktop.png'});
 await fs.writeFile('team-photo-preview/desktop.base64.txt',(await fs.readFile('team-photo-preview/desktop.png')).toString('base64'));
 for(const viewport of [{width:900,height:1100},{width:390,height:844}]){
 await page.setViewportSize(viewport);
 await page.locator('.league-roster-head').scrollIntoViewIfNeeded();
 await page.waitForTimeout(250);
 const fit=await page.locator('.hj-team-photo').evaluate(el=>{
 const r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,viewport:innerWidth,count:el.children.length,display:getComputedStyle(el).display};
 });
 assert(fit.width>200&&fit.height>40&&fit.display!=='none');
 assert(fit.left>=-1&&fit.right<=fit.viewport+1,'Photo spills outside viewport');
 await page.locator('.league-roster-head').screenshot({path:'team-photo-preview/'+viewport.width+'.png'});
 await fs.writeFile('team-photo-preview/'+viewport.width+'.base64.txt',(await fs.readFile('team-photo-preview/'+viewport.width+'.png')).toString('base64'));
 }
 await fs.writeFile('team-photo-preview/checks.json',JSON.stringify({players:Object.keys(catalog).length,teams:teams.length,desktop:initial,refreshPreservesNodes:true,viewports:[1600,900,390],pageErrors:errors},null,2));
 if(errors.some(e=>/hjTeamPhoto|HJ_TEAM_PHOTO|SyntaxError/.test(e)))throw Error(errors.join('\n'));
 console.log('Roster photo browser checks passed: 1600px, 900px, 390px; refresh preserves image nodes.');
}finally{await browser.close();server.close();}
