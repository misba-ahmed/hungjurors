import {chromium} from 'playwright';
const browser=await chromium.launch({headless:false});
try{
 const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),session=await context.newCDPSession(page);
 let layers=[];session.on('LayerTree.layerTreeDidChange',e=>layers=e.layers||[]);
 await session.send('LayerTree.enable');await session.send('Performance.enable');
 page.on('pageerror',e=>console.log('ERROR '+e.stack));
 page.on('crash',()=>console.log('CRASH'));
 await page.goto('https://hungjurors.com/?render-check=20260930c',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.length>0,{},{timeout:25000}).catch(()=>{});
 await page.waitForTimeout(1500);
 async function report(label){
  await session.send('LayerTree.enable');await page.screenshot({type:'jpeg',quality:10});await page.waitForTimeout(200);
  const dom=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {width:Math.round(r.width),height:Math.round(r.height)}};
   const tag=e=>e.tagName+'#'+e.id+'.'+String(e.className).slice(0,160);
   const styles=[...document.querySelectorAll('body *')].map(e=>{const s=getComputedStyle(e),r=rect(e);return {node:tag(e),...r,area:r.width*r.height,filter:s.filter,backdrop:s.backdropFilter,will:s.willChange,transform:s.transform,opacity:s.opacity,display:s.display,visibility:s.visibility,overflow:s.overflow}}).filter(x=>x.area>0&&x.display!=='none'&&x.visibility!=='hidden');
   const images=new Map();for(const e of document.images)if(e.complete&&e.naturalWidth)images.set(e.currentSrc||e.src,{src:(e.currentSrc||e.src).slice(0,150),w:e.naturalWidth,h:e.naturalHeight,pixels:e.naturalWidth*e.naturalHeight});
   const allImages=[...images.values()].sort((a,b)=>b.pixels-a.pixels);
   return {nodes:document.querySelectorAll('*').length,pageHeight:document.documentElement.scrollHeight,view:visualViewport?.scale,rows:document.querySelectorAll('.hj-v3-player').length,players:typeof HJ_PLAYER_DIRECTORY!=='undefined'?HJ_PLAYER_DIRECTORY.rows?.length:0,
    imageCount:allImages.length,imageMiB:allImages.reduce((n,x)=>n+x.pixels*4,0)/1048576,largeImages:allImages.slice(0,12),
    effects:styles.filter(x=>x.filter!=='none'||(x.backdrop&&x.backdrop!=='none')||x.will!=='auto').sort((a,b)=>b.area-a.area).slice(0,18),
    large:styles.sort((a,b)=>b.area-a.area).slice(0,6),
    folders:[...document.querySelectorAll('.hq-tab')].map(b=>({tab:b.dataset.hqTab,ready:b.classList.contains('hj-layer-ready'),art:!!b.querySelector('.hj-folder-layer'),width:b.querySelector('.hj-folder-layer')?.naturalWidth}))};
  });
  const sorted=layers.filter(l=>l.drawsContent).sort((a,b)=>b.width*b.height-a.width*a.height);
  const layerInfo=[];
  for(const l of sorted.slice(0,15)){
   let node=null,reasons=null;
   if(l.backendNodeId)try{const n=(await session.send('DOM.describeNode',{backendNodeId:l.backendNodeId})).node;node={name:n.nodeName,attributes:n.attributes?.slice(0,12).map(x=>x.slice(0,120))}}catch{}
   try{reasons=(await session.send('LayerTree.compositingReasons',{layerId:l.layerId})).compositingReasons}catch{}
   layerInfo.push({w:l.width,h:l.height,area:l.width*l.height,node,reasons});
  }
  const metrics=await session.send('Performance.getMetrics');
  console.log('REPORT '+label+' '+JSON.stringify({dom:{nodes:dom.nodes,pageHeight:dom.pageHeight,effects:dom.effects.slice(0,3),folders:dom.folders,imageMiB:dom.imageMiB},layers:layers.length,paintLayers:sorted.length,layerPixels:sorted.reduce((n,l)=>n+l.width*l.height,0),topLayers:layerInfo,metrics:metrics.metrics.filter(x=>['JSHeapUsedSize','LayoutCount','RecalcStyleCount','Nodes','Documents'].includes(x.name))}));
 }
 await page.screenshot({type:'jpeg',quality:10});
 await page.evaluate(()=>{hjSetHQTab('rosters');document.querySelector('#league-hq').scrollIntoView()});await page.waitForTimeout(800);
 await page.evaluate(()=>{hjSetHQTab('free-agents');document.querySelector('#league-hq').scrollIntoView()});
 await page.waitForTimeout(7000);await report('players');
 await page.evaluate(()=>{for(let i=0;i<6;i++)hjRenderHQTabs()});await page.waitForTimeout(300);
 for(const scale of [4,1]){await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});await page.waitForTimeout(800);if(scale===4)await report('scale-'+scale)}

 await page.addStyleTag({content:"#league-hq{--hj-layout-width:min(1240px,calc(100vw - 28px));width:var(--hj-layout-width)!important;left:auto!important;transform:none!important;margin-inline:calc((100% - var(--hj-layout-width))/2)!important;z-index:0}\n@media(max-width:900px){#league-hq{--hj-layout-width:calc(100vw - 18px)}}\n@media(max-width:620px){#league-hq{--hj-layout-width:calc(100vw - 12px)}}"});
 await report('untransformed');
 await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:4});await report('untransformed-scale4');
}finally{await browser.close()}
