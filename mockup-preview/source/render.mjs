import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
const dir='mockup-preview/rendered';
await fs.mkdir(dir,{recursive:true});
let html=await fs.readFile('mockup-preview/source/preview.html','utf8');
const urls=[...new Set(html.match(/https:\/\/a\.espncdn\.com\/i\/headshots\/nfl\/players\/full\/\d+\.png/g)||[])];
const manifest=[];
await Promise.all(urls.map(async url=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('Headshot unavailable: '+url+' '+response.status);
 const data=Buffer.from(await response.arrayBuffer());
 const uri='data:image/png;base64,'+data.toString('base64');
 html=html.split(url).join(uri);
 manifest.push({url,bytes:data.length});
}));
await fs.writeFile(dir+'/photo-sources.json',JSON.stringify(manifest,null,2));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:2200,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>console.log('PAGE ERROR '+e.message));
 await page.setContent(html,{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('Original player'),{timeout:60000});
 const png=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png').split(',')[1]);
 const buffer=Buffer.from(png,'base64');
 await fs.writeFile(dir+'/misba-team-photo.png',buffer);
 await sharp(buffer).extract({left:395,top:218,width:1438,height:210}).resize({width:2157}).png().toFile(dir+'/faces-detail.png');
 console.log(JSON.stringify({photos:manifest.length,image:await sharp(buffer).metadata()}));
}finally{await browser.close();}
