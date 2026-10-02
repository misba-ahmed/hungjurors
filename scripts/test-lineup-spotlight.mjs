import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch({args:['--no-sandbox']});
try{
for(const width of [390,768,1280]){
 const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:width<600});
 const css=await fs.readFile('styles/team-photos.css','utf8'),src='data:image/webp;base64,'+(await fs.readFile('assets/team-photos/players/4047646-faces-v2.webp')).toString('base64');
 await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style><main id="league-hq"><div id="league-sync-content"><div class="league-roster-head"><div class="hj-team-photo" data-team-photo-team="1"><div class="hj-team-photo-stage" style="aspect-ratio:4.5">'+[0,1].map((i)=>'<div class="hj-team-photo-player" data-team-photo-player="'+i+'" tabindex="0" style="left:'+(i?90:0)+'%;width:8%;height:95%"><span class="hj-team-photo-figure"><img src="'+src+'" width="322" height="850"></span><span class="hj-team-photo-score" hidden></span><span class="hj-team-photo-caption"><span>WR</span><button class="hj-team-photo-name">Player Name</button></span></div>').join('')+'</div></div></div></div></main>');
 await page.evaluate(()=>{window.HJ_LEAGUE_STATE={data:{teams:[]}};window.hjRosterEntries=()=>[];});
 await page.addScriptTag({content:await fs.readFile('scripts/team-photos.js','utf8')});
 for(const index of [0,1]){
  await page.locator('.hj-team-photo-player').nth(index).focus();await page.keyboard.press('Enter');await page.waitForTimeout(300);
  const r=await page.locator('.is-active').evaluate(b=>{const img=b.querySelector('img').getBoundingClientRect(),group=b.closest('.hj-team-photo').getBoundingClientRect(),stage=b.closest('.hj-team-photo').querySelector('.hj-team-photo-stage').getBoundingClientRect();return{height:img.height,left:img.left,right:img.right,top:img.top,groupTop:group.top,base:b.getBoundingClientRect().height,width:innerWidth,padding:stage.top-group.top};});
  assert(r.height>=212&&r.height<=214,JSON.stringify(r));
  assert(r.left>=7&&r.right<=r.width-7,JSON.stringify(r));
  assert(r.top>=r.groupTop&&r.top-r.groupTop<12,JSON.stringify(r));
  assert(r.height>r.base,JSON.stringify(r));
 }
 await page.keyboard.press('Escape');assert.equal(await page.locator('.is-active').count(),0);await page.close();
}
console.log('Spotlight passes phone/tablet/desktop sizing, sharp native-size rendering, edge fit, compact headroom and dismiss checks');
}finally{await browser.close();}
