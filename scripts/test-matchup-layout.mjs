import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const source=read('../index.html'),art=extractSiteArtwork(source),html=prepareSite(source);
assert.ok([...art.assets.keys()].some(path=>path.endsWith('.mp4')),'Video is a cacheable file');
assert.ok([...art.assets.keys()].some(path=>path.endsWith('.png')),'Artwork remains a cacheable file');
for(const [path,bytes] of art.assets){
 assert.ok(source.includes(bytes.toString('base64')),'Extracted media bytes match the original: '+path);
 assert.ok(art.html.includes('/'+path),'Extracted media URL is used: '+path);
}
assert.equal((art.html.match(/data:(?:image\\/(?:png|jpeg|webp)|video\\/mp4);base64,[A-Za-z0-9+/=]{131072,}/g)||[]).length,0,'No large media URLs retained');
const css=text=>[...text.matchAll(/<style\b[^>]*>([^]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const boundary=html.indexOf('</head>');
const styles=css(html.slice(0,boundary))+'\n'+read('../styles/live-display.css')+'\n'+css(html.slice(boundary));
const row=(right=false)=>'<button class="hj-player-v3'+(right?' is-right':'')+'"><span class="hj-v3-avatar">A</span><span class="hj-v3-identity"><span class="hj-v3-name">J. Smith-Njigba</span><span class="hj-v3-meta">SEA · WR1</span></span><span class="hj-game-context"><span class="hj-game-status">FINAL W 34-31 @ DAL (30)</span><span class="hj-game-stats">186 PY, 50 RY, 2 PTD</span></span><span class="hj-v3-score"><strong>35.36</strong><span class="hj-v3-projection">E 20.83</span></span></button>';
const slots=['QB','RB','RB','WR','WR','TE','Flex','DST','K'];
const markup='<nav></nav><main id="league-hq"><div class="hj-folder-dock"></div><section id="hq-panel-matchups"><div class="hq-matchup-switcher-shell"><button class="hq-matchup-jump">Scores</button></div><article class="hq-matchup is-open"><div class="hq-matchup-summary">Matchup</div><div class="hj-matchup-actions">Matchup preview</div><div class="hj-lineup-v2"><div class="hj-lineup-v2-starters">'+slots.map(slot=>'<div class="hj-lineup-v2-row">'+row()+'<span class="hj-lineup-v2-slot">'+slot+'</span>'+row(true)+'</div>').join('')+'</div></div></article></section><section id="league-sync-content"><button class="league-team-tab">TYLER</button><div class="league-roster-identity hj-business-card">TYLER</div></section></main>';
const browser=await chromium.launch({executablePath:process.env.HJ_BROWSER_EXECUTABLE||undefined});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('https://hungjurors.test/**',route=>{
  const path=new URL(route.request().url()).pathname.slice(1),body=art.assets.get(path);
  return body?route.fulfill({contentType:'image/png',body}):route.abort();
 });
 await page.setContent('<base href="https://hungjurors.test/"><style>'+styles+'</style>'+markup+'<style>html,body{margin:0!important;padding:0!important}body>nav{height:44px!important;position:relative!important}#league-hq{width:100%!important;margin:0!important;padding:0!important}.hj-folder-dock{height:96px!important}.hq-matchup-switcher-shell{height:42px!important}.hq-matchup-summary{height:100px!important;box-sizing:border-box!important}.hj-matchup-actions{height:35px!important;box-sizing:border-box!important}</style>');
 await page.addScriptTag({content:read('./matchup-row-fit.js')});
 for(const selector of ['.hq-matchup-jump','.league-team-tab','.hj-business-card']){
  const graphic=await page.locator(selector).evaluate(async el=>{
   const background=getComputedStyle(el).backgroundImage;
   const match=background.match(/url\("([^"]+)"\)/);
   if(!match)return {background,width:0};
   const img=new Image();img.src=match[1];await img.decode();
   return {background,width:img.naturalWidth,height:img.naturalHeight};
  });
  assert.ok(graphic.background.includes('/assets/site-art/'),selector+' has original artwork');
  assert.ok(graphic.width>1000,selector+' original image decodes');
 }
 const metrics=[];
 for(const [width,height] of [[1440,1000],[1440,900],[1100,900],[390,844],[1100,550]]){
  await page.setViewportSize({width,height});
  const size=await page.evaluate(()=>{
   hjFitStarterSpace();
   const lineup=document.querySelector('.hj-lineup-v2'),grid=lineup.querySelector('.hj-lineup-v2-starters'),rows=[...grid.children];
   const avatar=getComputedStyle(grid.querySelector('.hj-v3-avatar'));
   return {columns:lineup.dataset.columns,positions:rows.map(r=>({x:r.getBoundingClientRect().left,y:r.getBoundingClientRect().top})),bottom:grid.getBoundingClientRect().bottom,avatar:parseFloat(avatar.width),name:parseFloat(getComputedStyle(grid.querySelector('.hj-v3-name')).fontSize),height:window.innerHeight};
  });
  assert.equal(size.columns,'1');
  assert.equal(new Set(size.positions.map(p=>p.x)).size,1);
  assert.ok(size.positions.every((p,i)=>i===0||p.y>size.positions[i-1].y));
  assert.ok(size.avatar>=27&&size.name>=11,'never below phone size');
  if(width>=1100&&height>=900)assert.ok(size.bottom<=height||size.avatar===27,JSON.stringify({width,height,...size}));
  if(width===1440&&height===1000)assert.ok(size.bottom<=height,'full starting lineup fits the desktop viewport');
  if(width===390||height===550)assert.equal(size.avatar,27);
  metrics.push({width,height,bottom:size.bottom,avatar:size.avatar});
 }
 console.log('PASS original artwork in Chromium; single-column lineup fits without shrinking below phone size',JSON.stringify(metrics));
}finally{await browser.close()}
