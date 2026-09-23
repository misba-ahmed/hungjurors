import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=prepareSite(read('../index.html'));
const card=html.slice(html.indexOf('function ffnCardHTML('),html.indexOf('function ffnAppendBatch('));
const parser=html.slice(html.indexOf('function ffnFeedToItem('),html.indexOf('function ffnNewsSignature('));
const style=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n')+read('../styles/news-spin.css');
const profile=html.slice(html.indexOf('function pcNewsBody('),html.indexOf('function pcLatestNews('));
const response=await fetch('https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?limit=10&playerId=4434153',{signal:AbortSignal.timeout(20000)});
assert.equal(response.ok,true,'ESPN news available');
const feed=(await response.json()).feed.find(f=>f.type==='Rotowire'&&f.story);
assert.ok(feed,'ESPN supplies the Spin story field');
const browser=await chromium.launch();
try{
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:850}});
  await page.route('**/*',route=>route.abort());
  await page.setContent('<style>'+style+'</style><button id="outside">Outside</button><div class="ffn-scroll" id="ffn-scroll"></div>');
  await page.addScriptTag({content:`
   const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const ffnPhoto=()=>'',ffnTeamLogo=()=>'',ffnOwnershipBadgeHTML=()=>'',ffnPlayerDataAttrs=()=>'',ffnInitials=()=>'TB',hjNewsGameHTML=()=>'<span class="hj-game-context"><span class="hj-game-status">SUN 12 PM vs DEN (20)</span><span class="hj-game-stats">3 REC, 32 REY, 1 RETD</span></span>',ffnRelative=()=>'Today',ffnRelatedHTML=()=>'',ffnClassify=()=>'update',ffnRelatedFor=()=>[];
   let ffnItems=[];function ffnRefreshVisible(item){window.refreshed=item.id}
  `+read('./news-spin.js')+parser+card+profile});
  await page.evaluate(raw=>{
   const item=ffnFeedToItem(raw,{id:'4434153',name:'Tyson Bagent',team:'CHI',position:'QB'},'');
   if(!item.spin||item.spin===item.text)throw Error('Spin must be separate from description');
   if(ffnSpinFromFeed({story:'<b>Spin:</b> More &amp; better.'})!=='More & better.')throw Error('HTML normalization');
   if(ffnSpinFromFeed({})!==''||ffnSpinHTML({})!=='')throw Error('Missing Spin should have no toggle');
   if(ffnSpinHTML({spin:'<img src=x onerror=alert(1)>'}).includes('<img'))throw Error('Unsafe Spin markup');
   ffnItems=[{...item,spin:''}];ffnMergeSpin([item]);if(ffnItems[0].spin!==item.spin||window.refreshed!==item.id)throw Error('Same-ID refresh must update Spin');
   const items=Array.from({length:8},(_,i)=>({...item,id:String(i),spin:i===7?'':item.spin}));
   document.getElementById('ffn-scroll').innerHTML=items.map(ffnCardHTML).join('');
   ffnInstallSpin();ffnInstallSpin();
  },feed);
  const first=page.locator('.ffn-spin').first(),summary=first.locator('summary');
  assert.equal(await page.locator('.ffn-spin').count(),7);
  assert.equal(await page.locator('.ffn-spin[open]').count(),0);
  const dimensions=await first.evaluate(panel=>{
   const card=panel.closest('.ffn-card'),before=card.getBoundingClientRect().height,next=panel.nextSibling,parent=panel.parentNode;
   panel.remove();const original=card.getBoundingClientRect().height;parent.insertBefore(panel,next);
   return {before,original,text:panel.querySelector('summary').textContent};
  });
  assert.ok(dimensions.before-dimensions.original<=2,'Compact Spin adds at most two pixels to the original card');
  assert.equal(dimensions.text,'','Collapsed control shows only a plus');
  const placement=await summary.evaluate(el=>{
   const news=el.closest('.ffn-card').querySelector('.ffn-text').getBoundingClientRect(),row=el.getBoundingClientRect();
   return {below:row.top>=news.bottom-1,left:Math.abs(row.left-news.left)<1,glyph:getComputedStyle(el,'::before').content,font:getComputedStyle(el,'::before').fontSize};
  });
  assert.equal(placement.below,true,'Divider sits below news');
  assert.equal(placement.left,true,'Plus is flush with the news text');
  assert.equal(placement.glyph,'"+"','Original plus glyph is restored');
  assert.equal(placement.font,'16px','Original plus size is restored');
  for(const state of ['SUN 12 PM vs DEN (20)','Q3 5:10 · 14–10 vs DEN (20)','FINAL W 24–17 vs DEN (20)']){
   const fonts=await page.locator('.ffn-card').first().evaluate((card,state)=>{
    card.querySelector('.hj-game-status').textContent=state;
    return ['.ffn-text','.hj-game-status','.hj-game-stats'].map(selector=>getComputedStyle(card.querySelector(selector)).fontSize);
   },state);
   assert.equal(new Set(fonts).size,1,'Pregame, live/final status and stats match the news text size');
  }
  await summary.click();
  await page.waitForFunction(()=>document.querySelector('.ffn-spin').open);
  assert.equal(await first.locator('p').isVisible(),true);
  const gap=await first.evaluate(panel=>panel.querySelector('p').getBoundingClientRect().top-panel.querySelector('summary').getBoundingClientRect().bottom);
  assert.ok(gap>=0,'Expanded analysis never overlaps its divider/control');
  assert.equal(await summary.evaluate(el=>getComputedStyle(el,'::before').content),'"−"');
  await first.locator('p').click();assert.equal(await first.getAttribute('open'),'');
  await page.locator('#outside').click();assert.equal(await page.locator('.ffn-spin[open]').count(),0);
  await summary.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.ffn-spin').open);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.ffn-spin[open]').count(),0);
  assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
  await summary.click();await page.waitForTimeout(30);
  await page.evaluate(()=>document.getElementById('ffn-scroll').scrollLeft=280);
  await page.waitForFunction(()=>!document.querySelector('.ffn-spin').open);
  await page.evaluate(()=>{
   document.getElementById('ffn-scroll').scrollLeft=0;
  });
  await page.waitForTimeout(100);
  await summary.click();await page.waitForTimeout(30);
  await page.evaluate(()=>document.querySelectorAll('.ffn-spin')[1].open=true);
  await page.waitForFunction(()=>!document.querySelector('.ffn-spin').open&&document.querySelectorAll('.ffn-spin')[1].open);
  assert.equal(await page.locator('.ffn-spin[open]').count(),1);
  await page.evaluate(()=>document.getElementById('outside').focus());
  assert.equal(await page.locator('.ffn-spin[open]').count(),0);
  await page.evaluate(()=>{
   document.getElementById('ffn-scroll').innerHTML=ffnCardHTML({id:'later',player:'New arrival',text:'Update',spin:'Analysis'});
  });
  await page.locator('.ffn-spin summary').click();
  await page.waitForFunction(()=>document.querySelector('.ffn-spin').open);
  const overflow=await page.locator('.ffn-spin').evaluate(el=>el.scrollWidth>el.clientWidth+1);
  assert.equal(overflow,false,'Spin fits the card');
  await page.evaluate(()=>{
   document.getElementById('ffn-scroll').innerHTML='';
   const modal=document.createElement('div');modal.id='profile-test';modal.className='pc-modal-scroll';
   modal.style.cssText='height:180px;max-height:180px;width:100%;overflow:auto;position:fixed;top:40px;left:0';
   modal.innerHTML=pcNewsBody(Array.from({length:8},(_,i)=>({id:i,text:'Profile update '+i,spin:'Player analysis '+i,category:'role'})));
   document.body.append(modal);
  });
  const profilePanel=page.locator('#profile-test .ffn-spin').first(),profileSummary=profilePanel.locator('summary');
  await profileSummary.click();await page.waitForFunction(()=>document.querySelector('#profile-test .ffn-spin').open);
  assert.equal(await profilePanel.locator('p').textContent(),'Player analysis 0');
  assert.ok(await profilePanel.evaluate(panel=>panel.querySelector('p').getBoundingClientRect().top>=panel.querySelector('summary').getBoundingClientRect().bottom),'Profile Spin clears divider');
  await profilePanel.locator('p').click();assert.equal(await profilePanel.getAttribute('open'),'');
  await page.keyboard.press('Escape');assert.equal(await profilePanel.getAttribute('open'),null);
  await profileSummary.click();
  await page.waitForTimeout(30);
  await page.evaluate(()=>document.getElementById('profile-test').scrollTop=400);
  await page.waitForFunction(()=>!document.querySelector('#profile-test .ffn-spin').open);
  await page.evaluate(()=>document.getElementById('profile-test').scrollTop=0);
  await profileSummary.click();await page.locator('#outside').click();
  assert.equal(await page.locator('.ffn-spin[open]').count(),0,'Outside clicks close profile analysis');
  console.log('News and profile expansion: divider layout, matching text sizes, parsing, refresh, mouse, keyboard, scroll and '+width+'px layout passed.');
  await page.close();
 }
}finally{await browser.close()}
