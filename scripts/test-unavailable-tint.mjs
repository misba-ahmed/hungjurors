import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {webkit} from 'playwright';
const browser=await webkit.launch();
try{
 const page=await browser.newPage({viewport:{width:1000,height:600},isMobile:true,hasTouch:true,deviceScaleFactor:3});
 await page.goto('https://hungjurors.com',{waitUntil:'domcontentloaded'});
 await page.locator('.hj-team-photo-player').first().waitFor({timeout:60000});
 const tabs=page.locator('[data-league-team]');
 for(let i=0;i<await tabs.count();i++){
  await tabs.nth(i).click({force:true});await page.waitForTimeout(200);
  if(await page.locator('.hj-team-photo-player.is-unavailable').count())break;
 }
 const image=page.locator('.hj-team-photo-player.is-unavailable img').first();await image.waitFor();
 const before=await image.evaluate(img=>{
  const matches=[];function walk(rules){for(const r of rules){if(r.selectorText){try{if(img.matches(r.selectorText)&&r.style?.filter)matches.push({selector:r.selectorText,filter:r.style.filter,priority:r.style.getPropertyPriority('filter')});}catch{}}if(r.cssRules)walk(r.cssRules);}}
  for(const sheet of document.styleSheets){try{walk(sheet.cssRules);}catch{}}
  return{filter:getComputedStyle(img).filter,classes:img.closest('.hj-team-photo-player').className,matches};
 });
 await page.addStyleTag({content:await fs.readFile('styles/team-photos.css','utf8')});
 const after=await image.evaluate(img=>getComputedStyle(img).filter);assert(after.includes('0.18'),after);
 const active=page.locator('.hj-team-photo-player:not(.is-unavailable) img').first();
 assert(!(await active.evaluate(img=>getComputedStyle(img).filter)).includes('0.18'),'Active player must remain colored');
 await page.locator('.hj-team-photo').scrollIntoViewIfNeeded();
 await fs.mkdir('.tint',{recursive:true});
 await page.locator('.hj-team-photo').screenshot({path:'.tint/proof.jpg',type:'jpeg',quality:75});
 await fs.writeFile('.tint/report.json',JSON.stringify({before,after},null,2));
 console.log(JSON.stringify({before,after}));
}finally{await browser.close();}
