import {chromium} from 'playwright';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
page.on('pageerror',e=>console.log('PAGE_ERROR '+e.stack));
page.on('crash',()=>console.log('PAGE_CRASH'));
const cdp=await page.context().newCDPSession(page);let layers=[];
cdp.on('LayerTree.layerTreeDidChange',e=>{layers=e.layers||[]});await cdp.send('LayerTree.enable');await cdp.send('DOM.enable');await cdp.send('Performance.enable');
try{
 await page.goto('https://hungjurors.com/?zoom-diagnostic=3',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(5000);
 for(const [name,selector]of [['home','body'],['rosters','#league-hq'],['challenges','#challenge-out']]){
  await page.evaluate(selector=>document.querySelector(selector)?.scrollIntoView({block:'start',behavior:'instant'}),selector);
  await page.waitForTimeout(700);
  console.log('STATE '+name+' '+JSON.stringify(await page.evaluate(()=>({
   url:location.href,scale:visualViewport.scale,scroll:scrollY,width:innerWidth,height:innerHeight,body:[document.body.scrollWidth,document.body.scrollHeight],
   nodes:document.querySelectorAll('*').length,images:document.images.length,league:typeof HJ_LEAGUE_STATE==='object'?!!HJ_LEAGUE_STATE.data:null,
   bigImages:[...document.images].filter(i=>i.naturalWidth*i.naturalHeight>1000000).map(i=>({w:i.naturalWidth,h:i.naturalHeight,src:i.currentSrc.slice(0,130)})).slice(0,10),
   painted:[...document.querySelectorAll('*')].filter(e=>e.getClientRects().length).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className.slice(0,100):'',w:r.width,h:r.height,filter:s.filter,backdrop:s.backdropFilter,transform:s.transform,style3d:s.transformStyle,will:s.willChange}}).filter(e=>e.filter!=='none'||e.backdrop!=='none'||e.will!=='auto'||e.style3d==='preserve-3d').slice(0,100)
  }))));
  for(const scale of [1,4,1]){
   await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});await page.waitForTimeout(250);
   await page.screenshot({type:'jpeg',quality:10});
   const top=layers.filter(l=>l.drawsContent).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,12);
   const report=[];
   for(const l of top){
    let node='';
    try{if(l.backendNodeId){const d=await cdp.send('DOM.describeNode',{backendNodeId:l.backendNodeId});node={name:d.node.nodeName,attributes:d.node.attributes}}}catch{}
    let reasons=[];try{reasons=(await cdp.send('LayerTree.compositingReasons',{layerId:l.layerId})).compositingReasons}catch{}
    report.push({w:l.width,h:l.height,area:l.width*l.height,node,reasons});
   }
   console.log('LAYERS '+name+' '+scale+' '+JSON.stringify({count:layers.length,area:layers.filter(l=>l.drawsContent).reduce((a,l)=>a+l.width*l.height,0),top:report}));
  }
 }
}finally{await browser.close()}
