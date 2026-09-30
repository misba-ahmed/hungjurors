import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
import {extractSiteArtwork} from './site-artwork.mjs';
const source=await readFile('index.html','utf8'),html=prepareSite(source);
for(const [path,data]of extractSiteArtwork(source).assets){await mkdir(dirname(path),{recursive:true});await writeFile(path,data);}
const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1630558';
const league=await(await fetch(url+'?view=mRoster&view=mTeam&view=mSettings&view=mMatchup&view=mMatchupScore&view=mStatus&view=mStandings')).json();
if(league.teams?.length!==10)throw Error('Live roster not loaded');
const filter={players:{limit:2000,offset:0,filterSlotIds:{value:[0,2,4,6,16,17]},filterStatsForSourceIds:{value:[0,1]},filterStatsForSplitTypeIds:{value:[0,1]},filterStatsForScoringPeriodIds:{value:[0,1,2,3,4]},sortPercOwned:{sortAsc:false,sortPriority:1}}};
const pool=await(await fetch(url+'?view=kona_player_info&scoringPeriodId=4',{headers:{'x-fantasy-filter':JSON.stringify(filter)}})).json();
console.log('FIXTURE '+JSON.stringify({teams:league.teams.length,players:pool.players?.length}));
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;res.setHeader('Content-Type',path==='/'?'text/html':({'.css':'text/css','.js':'text/javascript','.png':'image/png','.mp4':'video/mp4','.webp':'image/webp','.jpg':'image/jpeg'}[extname(path)]||'application/json'));res.end(path==='/'?html:await readFile('.'+path));}catch{res.statusCode=404;res.end('{}');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{
 for(const [name,engine]of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.ZOOM_ENGINE||name===process.env.ZOOM_ENGINE)){
  const browser=await engine.launch({headless:false});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
   await context.route('**/*',async route=>{
    const req=route.request(),u=req.url();
    if(u.startsWith(base))return route.continue();
    if(u.includes('lm-api-reads.fantasy.espn.com'))return route.fulfill({json:u.includes('kona_player_info')?pool:league,headers:{'access-control-allow-origin':'*'}});
    if(/\.(png|webp|jpg|svg)(\?|$)/.test(u)||u.includes('/combiner/')||u.includes('fonts.'))return route.continue();
    return route.abort();
   });
   const page=await context.newPage();await page.addInitScript(()=>window.__zoomDocumentToken=Math.random());let crashes=0,navigations=0;const errors=[];
   page.on('crash',()=>{crashes++;console.log('CRASH '+name)});page.on('pageerror',e=>errors.push(e.message));
   page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++});
   const cdp=name==='chromium'?await context.newCDPSession(page):null;let layers=[];
   if(cdp){await cdp.send('LayerTree.enable');await cdp.send('Performance.enable');cdp.on('LayerTree.layerTreeDidChange',e=>layers=e.layers||[]);}
   await page.goto(base,{waitUntil:'load',timeout:60000});await page.waitForTimeout(3500);
   for(const tab of ['free-agents']){
    if(tab!=='home')await page.evaluate(tab=>{hjSetHQTab(tab);document.querySelector('#league-hq').scrollIntoView()},tab);
    await page.waitForTimeout(1800);await page.bringToFront();await page.screenshot({type:'jpeg',quality:30});
    const state=await page.evaluate(()=>{
     const named=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'?'.'+e.className.trim().replace(/\s+/g,'.'):'');
     const all=[...document.querySelectorAll('*')],visible=all.filter(e=>e.getClientRects().length);
     const scrolls=visible.filter(e=>{const s=getComputedStyle(e);return /(auto|scroll)/.test(s.overflowX+' '+s.overflowY)&&e.scrollWidth*e.scrollHeight>100000}).map(e=>({node:named(e),w:e.clientWidth,h:e.clientHeight,sw:e.scrollWidth,sh:e.scrollHeight}));
     const textures=visible.filter(e=>{const s=getComputedStyle(e);return s.filter!=='none'||s.backdropFilter!=='none'||s.willChange!=='auto'||s.transformStyle==='preserve-3d'||s.perspective!=='none'}).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {node:named(e),w:r.width,h:r.height,filter:s.filter,backdrop:s.backdropFilter,will:s.willChange,transform:s.transform,perspective:s.perspective}});
     const imgs=new Map();for(const e of document.images)if(e.naturalWidth)imgs.set(e.currentSrc,{src:e.currentSrc.slice(0,110),w:e.naturalWidth,h:e.naturalHeight});
     const largest=[...imgs.values()].sort((a,b)=>b.w*b.h-a.w*a.h);
     return {nodes:all.length,visible:visible.length,height:document.documentElement.scrollHeight,players:document.querySelectorAll('.hq40-card').length,scrolls:scrolls.sort((a,b)=>b.sw*b.sh-a.sw*a.sh).slice(0,16),textures:textures.sort((a,b)=>b.w*b.h-a.w*a.h).slice(0,20),images:imgs.size,decodedMB:largest.reduce((n,x)=>n+x.w*x.h*4,0)/1048576,largest:largest.slice(0,8),canvases:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height}))};
    });console.log('PROFILE '+JSON.stringify({engine:name,tab,...state}));
    if(cdp){
     const largest=layers.filter(l=>l.drawsContent).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,12);const result=[];
     for(const l of largest){let node;try{node=(await cdp.send('DOM.describeNode',{backendNodeId:l.backendNodeId})).node}catch{}result.push({w:l.width,h:l.height,id:l.layerId,node:node?{name:node.nodeName,attributes:node.attributes}:null,reasons:(await cdp.send('LayerTree.compositingReasons',{layerId:l.layerId}).catch(()=>({}))).compositingReasons});}
     console.log('LAYERS '+JSON.stringify({tab,count:layers.length,largest:result,metrics:(await cdp.send('Performance.getMetrics')).metrics.filter(m=>/JSHeapUsedSize|Nodes|LayoutCount|RecalcStyleCount|LayoutDuration|RecalcStyleDuration/.test(m.name))}));
     const token=await page.evaluate(()=>window.__zoomDocumentToken),scales=[];
     for(const scaleFactor of [3,1/3,4,.25]){await cdp.send('Input.synthesizePinchGesture',{x:190,y:400,scaleFactor,relativeSpeed:800,gestureSourceType:'touch'});await page.waitForTimeout(200);scales.push(await page.evaluate(()=>visualViewport.scale));}
     if(await page.evaluate(()=>window.__zoomDocumentToken)!==token)throw Error('Document reloaded during pinch');
     console.log('SCALES '+JSON.stringify({tab,scales}));
     if(Math.max(...scales)<2){
      console.log('GESTURE_LIMITATION native touch pinch is unavailable in this Linux browser; exercising browser page scale directly');
      scales.length=0;
      for(const pageScaleFactor of [3,1,5,1]){
       await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor});
       await page.screenshot({type:'jpeg',quality:20});await page.waitForTimeout(150);
       scales.push(await page.evaluate(()=>visualViewport.scale));
      }
      console.log('BROWSER_ZOOM '+JSON.stringify({tab,scales}));
      if(Math.max(...scales)<2||scales.at(-1)!==1)throw Error('Browser zoom did not execute');
      if(await page.evaluate(()=>window.__zoomDocumentToken)!==token)throw Error('Document reloaded during browser zoom');
     }
     console.log('PINCH '+JSON.stringify({tab,crashes,navigations,scale:await page.evaluate(()=>visualViewport.scale)}));
    }
   }
   await page.evaluate(()=>{hjSetHQTab('free-agents');document.querySelector('#league-hq-tabs').scrollIntoView()});await page.waitForTimeout(500);
   const bounded=await page.evaluate(()=>[...document.querySelectorAll('.hj-folder-layer')].map(e=>({w:e.getBoundingClientRect().width,tab:e.parentElement.getBoundingClientRect().width})));
   if(bounded.length!==6||bounded.some(x=>x.w>x.tab+82))throw Error('Folder surface exceeds its tab');
   const thumbs=await page.evaluate(()=>[...document.images].filter(e=>e.currentSrc.includes('/combiner/')&&e.naturalWidth).map(e=>e.naturalWidth));
   if(!thumbs.length||thumbs.some(w=>w>160))throw Error('Thumbnail source dimensions incorrect');
   console.log('CHECKS '+JSON.stringify({bounded,thumbnails:thumbs.length,players:await page.locator('.hq40-card').count()}));
   await page.evaluate(()=>{const b=document.createElement('button');b.dataset.pcId='3918298';b.dataset.pcName='Josh Allen';b.dataset.pcTeam='BUF';b.dataset.pcPosition='QB';pcOpen(b)});
   await page.waitForSelector('.pc-modal-overlay.is-open');
   if(!await page.locator('.pc-headshot').getAttribute('src').then(s=>s.includes('/players/full/')))throw Error('Profile photo lost full resolution');
   for(const pageScaleFactor of [3,1]){await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor});await page.screenshot({type:'jpeg',quality:20});}
   await page.evaluate(()=>pcClose());await page.waitForTimeout(300);
   const shot=(await page.locator('#league-hq-tabs').screenshot({type:'jpeg',quality:75})).toString('base64');
   for(let i=0;i<shot.length;i+=6000)console.log('SCREEN '+shot.slice(i,i+6000));
   console.log('RESULT '+JSON.stringify({name,crashes,navigations,errors:errors.slice(0,15)}));
  }finally{await browser.close();}
 }
}finally{server.close();}
