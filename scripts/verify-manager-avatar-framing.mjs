import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=await readFile('index.html','utf8');
const artwork=extractSiteArtwork(source);
for(const [name,bytes] of artwork.assets){await mkdir(dirname(name),{recursive:true});await writeFile(name,bytes);}
const prepared=prepareSite(source);
const avatars=JSON.parse(prepared.match(/const AV = (\{[^\n]+\});/)[1]);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const managerAvatarSrc=s=>avatars[s].startsWith('/')?avatars[s]:'data:image/png;base64,'+avatars[s];
const av=new Function('esc','managerAvatarSrc',prepared.match(/const av\s*=[^\n]+/)[0]+'\nreturn av;')(esc,managerAvatarSrc);
const start=prepared.indexOf('function hjManagerBusinessCard('),end=prepared.indexOf('\n}',start)+2;
const card=new Function('av','esc','pcFpts','hjCurrentStandingRank','hjTeamName','hjTeamRecord',prepared.slice(start,end)+'\nreturn hjManagerBusinessCard;')(av,esc,n=>n.toFixed(2),t=>t.rank,t=>t.name,t=>t.recordText);
const misba={name:'Chase Brown People',recordText:'0-3',rank:10,record:{pointsFor:276.96}};
const cesar={name:'Je Ne Saquon',recordText:'1-2',rank:9,record:{pointsFor:325.2}};
const head='<!doctype html><html><head>'+[...prepared.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>/gi)].map(m=>m[0]).join('\n');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname.slice(1);res.setHeader('Content-Type',name.endsWith('.png')?'image/png':name.endsWith('.css')?'text/css':'text/plain');res.end(await readFile(name));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
function emit(name,buffer){const b64=buffer.toString('base64');for(let i=0;i<b64.length;i+=6000)console.log('AVATAR_ASSET '+name+' '+Math.floor(i/6000)+' '+b64.slice(i,i+6000));}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:860,height:440},deviceScaleFactor:2});
 const markup='<section id="league-hq"><div id="league-sync-content"><div class="qa-cards">'+[card(misba,{},'MISBA','MISBA'),card(cesar,{},'CESAR','CESAR')].map(c=>'<div class="league-roster-head">'+c+'</div>').join('')+'</div></div></section>';
 const css='html,body{min-width:0!important;margin:0!important}body{padding:18px!important;background:#f7ecd4!important}.qa-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}#league-hq{padding:0!important;margin:0!important}#league-sync-content .league-roster-head{display:block!important;margin:0!important;padding:0!important;min-height:0!important;border:0!important}#league-sync-content .league-roster-identity{margin:0!important}.qa-small{display:flex;align-items:center;gap:12px;padding:12px}.qa-label{color:#173650;font:600 12px Arial;padding:12px 0}@media(max-width:600px){.qa-cards{grid-template-columns:1fr}}';
 await page.setContent(head.replace('<head>','<head><base href="'+origin+'">')+'<style>'+css+'</style></head><body><div class="qa-label">Actual roster business cards · same framing · Misba saturation 80%</div>'+markup+'<div class="qa-small">'+av('MISBA')+av('CESAR')+'</div></body></html>');
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const result=await page.locator('.hj-business-card>.av').evaluateAll(imgs=>imgs.map(i=>({manager:i.dataset.manager,fit:getComputedStyle(i).objectFit,filter:getComputedStyle(i).filter,width:i.clientWidth,height:i.clientHeight,complete:i.complete})));
 assert(result.every(r=>r.fit==='cover'&&r.complete));
 assert.equal(result[0].filter,'saturate(0.8)');
 assert.equal(result[0].width,result[1].width);
 assert.equal(result[0].height,result[1].height);
 emit('preview',await page.screenshot({type:'jpeg',quality:90}));
 await page.setViewportSize({width:390,height:650});
 emit('mobile',await page.screenshot({type:'jpeg',quality:90}));
 emit('detail',await page.locator('.hj-business-card').first().screenshot({type:'jpeg',quality:95,scale:'device'}));
 console.log('AVATAR_CHECKS_PASSED '+JSON.stringify(result));
}finally{await browser.close();server.close();}
