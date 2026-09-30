import {chromium} from 'playwright';
const browser=await chromium.launch({headless:false,executablePath:'/usr/bin/google-chrome'});
try{
 const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),session=await context.newCDPSession(page);
 let layers=[];session.on('LayerTree.layerTreeDidChange',e=>layers=e.layers||[]);await session.send('LayerTree.enable');
 page.on('pageerror',e=>console.log('ERROR '+e.message));page.on('crash',()=>console.log('CRASH'));
 await page.goto('https://hungjurors.com/?layers=20260930',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof HJ_LEAGUE_STATE!=='undefined'&&HJ_LEAGUE_STATE.data?.teams?.length>0,{},{timeout:25000}).catch(()=>{});
 await page.evaluate(()=>{hjSetHQTab('free-agents');document.querySelector('#league-hq').scrollIntoView()});
 await page.waitForTimeout(3000);
 async function report(label){
  await page.screenshot({type:'jpeg',quality:10});await page.waitForTimeout(300);
  const sorted=layers.filter(l=>l.drawsContent).sort((a,b)=>b.width*b.height-a.width*a.height);
  const top=await Promise.all(sorted.slice(0,10).map(async l=>{let node=null;try{node=(await session.send('DOM.describeNode',{backendNodeId:l.backendNodeId})).node}catch{};return {w:l.width,h:l.height,node:node?{tag:node.nodeName,attrs:node.attributes?.slice(0,6)}:null}}));
  console.log('REPORT '+label+' '+JSON.stringify({layers:layers.length,pixels:sorted.reduce((n,l)=>n+l.width*l.height,0),top,dom:await page.evaluate(()=>({scrollHeight:document.documentElement.scrollHeight,viewport:innerWidth,sections:[...document.querySelectorAll('main>section')].map(e=>({id:e.id,h:e.offsetHeight})),player:[...document.querySelectorAll('.hq40-card')].slice(0,2).map(e=>({h:e.offsetHeight,w:e.offsetWidth})),folders:[...document.querySelectorAll('.hq-tab')].map(b=>!!b.querySelector('.hj-folder-layer'))}))}));
 }
 await report('before');
 await page.addStyleTag({content:"\n/* Keep sorting controls inside their own player card's paint order. */\n.hq-player-directory .hq40-card { isolation:isolate; contain:layout paint; }\n/* Keep independent sections from sharing page-sized overlap surfaces. */\nmain>section,main>details { isolation:isolate; }\n#record-book-out.rb-book { perspective:none!important }\n#record-book-fold .rb-page,#record-book-fold .rb-page::before,#record-book-fold .rb-page::after { backface-visibility:visible!important;-webkit-backface-visibility:visible!important }\n/* Idle decorative figures need no separately rasterized shadow surface. */\n.lineup-figure {filter:none!important}\n"});
 await report('bounded');
 await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:4});await report('bounded4');await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 await page.addStyleTag({content:'.hq40-card{content-visibility:auto;contain-intrinsic-size:auto 184px}'});
 await report('deferred-cards');
}finally{await browser.close()}
