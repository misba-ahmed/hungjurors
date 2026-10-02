import fs from 'node:fs/promises';
import {webkit} from 'playwright';
import sharp from 'sharp';
await fs.mkdir('.zoom',{recursive:true});
const original=await (await fetch('https://hungjurors.com')).text();
const fixed=await fs.readFile('scripts/folder-artwork.js','utf8');
const report={errors:[],comparisons:[],buffers:[]};
const browser=await webkit.launch();
try{
for(const w of [390,1280]){
 const shots=[];
 for(const variant of ['before','after']){
  const page=await browser.newPage({viewport:{width:w,height:844},deviceScaleFactor:3,isMobile:w===390,hasTouch:true});
  page.on('crash',()=>report.errors.push(variant+' crash'));
  await page.route('https://hungjurors.com/',route=>route.fulfill({contentType:'text/html',body:variant==='before'?original:original.replace(/<script id="hj-folder-stack-script">[\s\S]*?<\/script>/,()=>'<script id="hj-folder-stack-script">'+fixed+'</script>')}));
  await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(5000);
  await page.locator('#league-hq-tabs').scrollIntoViewIfNeeded();
  const states=[];
  for(const fraction of [0,.5,1]){
   await page.evaluate(f=>{const n=document.querySelector('#league-hq-tabs');n.style.scrollBehavior='auto';n.scrollLeft=f*(n.scrollWidth-n.clientWidth)},fraction);
   await page.waitForTimeout(600);
   states.push(await page.locator('#league-hq-tabs').screenshot({animations:'disabled'}));
  }
  shots.push(states);
  report.buffers.push({variant,w,...await page.evaluate(()=>({bytes:[...document.querySelectorAll('canvas')].reduce((s,c)=>s+4*(c.width*c.height+(c._paperShadow?.width||0)*(c._paperShadow?.height||0)),0),canvases:[...document.querySelectorAll('canvas')].map(c=>[c.width,c.height])}))});
  if(variant==='after'&&w===390){
   for(const id of ['raffle','lms','titty','overachiever','optimizer']){
    await page.evaluate(id=>selectChallenge(id),id);await page.waitForTimeout(700);
    for(let n=0;n<3;n++){
     await page.locator('#challenge-out [data-lms-zoom="detail"]').click({force:true});await page.waitForTimeout(550);
     await page.locator('#challenge-out [data-lms-zoom="fit"]').click({force:true});await page.waitForTimeout(550);
    }
   }
  }
  await page.close();
 }
 for(let i=0;i<3;i++){
  const a=await sharp(shots[0][i]).raw().toBuffer({resolveWithObject:true}),b=await sharp(shots[1][i]).raw().toBuffer();
  let sum=0,max=0,count=0;for(let j=0;j<b.length;j++){const d=Math.abs(a.data[j]-b[j]);sum+=d;max=Math.max(max,d);if(d>10)count++}
  report.comparisons.push({w,i,mean:sum/b.length,max,over10:count/b.length,dimensions:a.info});
  await sharp(shots[1][i]).resize({width:Math.min(w,1280)}).jpeg({quality:85}).toFile('.zoom/tabs-'+w+'-'+i+'.jpg');
 }
}
}catch(e){report.errors.push(e.stack)}finally{await browser.close();await fs.writeFile('.zoom/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
