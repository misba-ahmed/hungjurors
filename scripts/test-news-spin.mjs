import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=prepareSite(read('../index.html'));
const card=html.slice(html.indexOf('function ffnCardHTML('),html.indexOf('function ffnAppendBatch('));
const parser=html.slice(html.indexOf('function ffnFeedToItem('),html.indexOf('function ffnNewsSignature('));
const style=html.match(/<style>([\s\S]*?)<\/style>/)[1]+read('../styles/news-spin.css');
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
   const ffnPhoto=()=>'',ffnTeamLogo=()=>'',ffnOwnershipBadgeHTML=()=>'',ffnPlayerDataAttrs=()=>'',ffnInitials=()=>'TB',hjNewsGameHTML=()=>'',ffnRelative=()=>'Today',ffnRelatedHTML=()=>'',ffnClassify=()=>'update',ffnRelatedFor=()=>[];
   let ffnItems=[];function ffnRefreshVisible(item){window.refreshed=item.id}
  `+read('./news-spin.js')+parser+card});
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
  await summary.click();
  await page.waitForFunction(()=>document.querySelector('.ffn-spin').open);
  assert.equal(await first.locator('p').isVisible(),true);
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
  console.log('News expansion: parsing, escaping, refresh, mouse, keyboard, scroll, dynamic cards and '+width+'px layout passed.');
  await page.close();
 }
}finally{await browser.close()}
