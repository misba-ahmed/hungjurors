import fs from 'node:fs/promises';import {webkit} from 'playwright';import sharp from 'sharp';
await fs.mkdir('.zoom',{recursive:true});
const html=await fs.readFile('index.html','utf8');
const clean=s=>s.replace(/data:[^"'\s<>]+;base64,[A-Za-z0-9+/=]+/g,'[embedded-image]').replace(/(["'])[A-Za-z0-9+/=]{1000,}\1/g,'"[base64]"');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>({attributes:m[1],text:clean(m[2])}));
const relevant=scripts.filter(s=>/canvas|visualViewport|ResizeObserver|location.reload|gesturestart|lms-zoom/.test(s.text));
await fs.writeFile('.zoom/source.json',JSON.stringify(relevant,null,2));
const imageInfo=[];
for(const name of await fs.readdir('assets/managers-v4')){const m=await sharp('assets/managers-v4/'+name).metadata();imageInfo.push({name,width:m.width,height:m.height});}
await fs.writeFile('.zoom/manager-images.json',JSON.stringify(imageInfo));
const browser=await webkit.launch();const report={errors:[],steps:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 page.on('crash',()=>report.errors.push('PAGE CRASH'));
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('https://hungjurors.com',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(8000);
 const stats=()=>page.evaluate(()=>({canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight})),nodes:document.querySelectorAll('*').length,scale:visualViewport?.scale,images:document.images.length,scrollHeight:document.documentElement.scrollHeight}));
 report.steps.push({stage:'loaded',...await stats()});
 await page.evaluate(()=>selectChallenge('raffle'));await page.locator('#challenge-out .lms-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
 for(const id of ['raffle','lms','titty','overachiever','optimizer']){
  await page.evaluate(id=>selectChallenge(id),id);await page.waitForTimeout(1200);
  for(let n=0;n<8;n++){
   await page.locator('#challenge-out [data-lms-zoom="detail"]').click({force:true});await page.waitForTimeout(550);
   await page.locator('#challenge-out [data-lms-zoom="fit"]').click({force:true});await page.waitForTimeout(550);
  }
  report.steps.push({stage:id,...await stats()});
 }
}catch(e){report.errors.push(e.stack)}finally{await browser.close();await fs.writeFile('.zoom/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
