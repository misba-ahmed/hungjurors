import fs from 'node:fs/promises';import {chromium} from 'playwright';
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await page.goto('https://hungjurors.com',{waitUntil:'domcontentloaded'});
 await page.locator('.hj-team-photo-player').first().waitFor({timeout:60000});
 const player=page.locator('.hj-team-photo-player').nth(5);
 await player.scrollIntoViewIfNeeded();await player.focus();await page.keyboard.press('Enter');await page.waitForTimeout(600);
 const info=await player.evaluate(b=>{
 const out=[];for(let e=b;e&&out.length<7;e=e.parentElement){const c=getComputedStyle(e),r=e.getBoundingClientRect();out.push({class:e.className,top:r.top,bottom:r.bottom,height:r.height,padding:c.padding,margin:c.margin,align:c.alignItems,minHeight:c.minHeight});}
 const fig=b.querySelector('.hj-team-photo-figure').getBoundingClientRect(),img=b.querySelector('img').getBoundingClientRect();return{out,fig:{top:fig.top,height:fig.height},img:{top:img.top,height:img.height}};
 });
 await fs.mkdir('.lineup-audit',{recursive:true});await fs.writeFile('.lineup-audit/spacing.json',JSON.stringify(info,null,2));
 await page.screenshot({path:'.lineup-audit/spacing.jpg',type:'jpeg',quality:65});
 console.log(JSON.stringify(info));
}finally{await browser.close();}
