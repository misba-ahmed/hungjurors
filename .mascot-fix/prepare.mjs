import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
execFileSync('git',['fetch','origin','main'],{stdio:'inherit'});
execFileSync('git',['worktree','add','--detach','/tmp/priority-preview','origin/main'],{stdio:'inherit'});
for(const [from,to] of [['priority.js','scripts/wire-priorities.js'],['priority.css','styles/wire-priorities.css'],['priority-prep.mjs','scripts/prepare-site.mjs']])fs.copyFileSync('.mascot-fix/'+from,'/tmp/priority-preview/'+to);
fs.copyFileSync('.mascot-fix/priority-test.mjs','/tmp/priority-preview/scripts/test-wire-priorities.mjs');
execFileSync('node',['--test','scripts/test-wire-priorities.mjs'],{cwd:'/tmp/priority-preview',stdio:'inherit'});
execFileSync('node',['scripts/prepare-site.mjs','index.html'],{cwd:'/tmp/priority-preview',stdio:'inherit'});
execFileSync('npm',['install','--no-save','--package-lock=false','playwright'],{stdio:'inherit'});
execFileSync('npx',['playwright','install','--with-deps','chromium','webkit'],{stdio:'inherit'});
const {chromium,webkit}=await import('playwright');
for(const engine of [chromium,webkit]){
const browser=await engine.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://hungjurors.com/**',async route=>{
 const url=new URL(route.request().url()),p=path.join('/tmp/priority-preview',decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(fs.existsSync(p)&&fs.statSync(p).isFile()){const ext=path.extname(p),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};return route.fulfill({body:fs.readFileSync(p),contentType:types[ext]||'application/octet-stream'});}
 return route.continue();
});
await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForSelector('.wp-group',{timeout:120000});
await page.waitForTimeout(4000);
await page.evaluate(()=>{wireScrollTo(0);window.scrollTo(0,0)});
await page.waitForTimeout(800);
fs.writeFileSync('.mascot-fix/priority-desktop.json',JSON.stringify({image:(await page.screenshot({type:'jpeg',quality:70})).toString('base64')}));
const report={errors,desktop:await page.evaluate(()=>({panels:document.querySelectorAll('.wp-group .wp-panel').length,heading:document.querySelector('.wp-lms h3')?.textContent,group:document.querySelector('.wp-group')?.getBoundingClientRect().toJSON(),bye:document.querySelector('.wp-byes')?.textContent,chip:document.querySelector('#wire-chips')?.textContent}))};
await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>wireScrollTo(0));await page.waitForTimeout(500);
fs.writeFileSync('.mascot-fix/priority-mobile.json',JSON.stringify({image:(await page.screenshot({type:'jpeg',quality:80,clip:{x:0,y:0,width:390,height:1500}})).toString('base64')}));
await page.evaluate(()=>window.scrollTo(0,240));
fs.writeFileSync('.mascot-fix/priority-mobile-bottom.json',JSON.stringify({image:(await page.screenshot({type:'jpeg',quality:80})).toString('base64')}));
report.mobile=await page.evaluate(()=>({groupHeight:document.querySelector('.wp-group').getBoundingClientRect().height,standardHeight:wireCardNodes().find(n=>!n.classList.contains('wp-group')).getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,panels:[...document.querySelectorAll('.wp-group .wp-panel')].map(e=>({rect:e.getBoundingClientRect().toJSON(),overflow:e.scrollHeight>e.clientHeight+1}))}));

if(Math.abs(report.mobile.groupHeight-report.mobile.standardHeight)>1)throw Error('Priority viewport differs from ordinary cards');
if(Math.max(...report.mobile.panels.map(p=>p.rect.height))-Math.min(...report.mobile.panels.map(p=>p.rect.height))>1)throw Error('Unequal mobile panels');
report.byeScroll=await page.locator('.wp-group .wp-bye-list').evaluate(el=>{el.scrollTop=120;return {count:el.querySelectorAll('.wp-person').length,top:el.scrollTop,overflow:el.scrollHeight>el.clientHeight};});
if(!report.byeScroll.overflow||report.byeScroll.top<100||report.byeScroll.count<5)throw Error('Compact full roster must scroll');
await page.locator('.wp-group [data-wp-expand="byes"]').first().click();
await page.waitForSelector('.wire-expanded-overlay.is-open');
report.expanded=await page.locator('.wire-expanded-overlay').innerText();
await page.keyboard.press('Escape');await page.waitForTimeout(300);
await page.locator('[data-wire-section-jump="recap"]').click();
await page.waitForTimeout(900);

report.navigation=await page.evaluate(()=>({section:WIRE.activeSection,index:WIRE.index,rail:document.querySelector('#wire-scroll').getBoundingClientRect().height,card:wireCardNodes()[WIRE.index].getBoundingClientRect().height}));
if(report.navigation.rail-report.navigation.card>20)throw Error('Empty rail space remains');
await page.locator('#wire-scroll').screenshot({path:'.mascot-fix/recap-height.png'});

await page.locator('[data-wire-section-jump="this-week"]').click();await page.waitForTimeout(700);

const title=page.locator('.wp-group .wp-lms .wc-title');
await title.click();
await page.waitForSelector('.wire-expanded-overlay.is-open');
await page.keyboard.press('Escape');await page.waitForTimeout(300);
const panel=page.locator('.wp-group [data-wp-card="lms"]');
await panel.focus();await page.keyboard.press('Enter');
await page.waitForSelector('.wire-expanded-overlay.is-open');
const header=page.locator('.wire-expanded-overlay .wc-title');
const rect=await header.boundingBox();
await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2+210,{steps:12});await page.mouse.up();
await page.waitForSelector('.wire-expanded-overlay',{state:'detached',timeout:5000});
await page.locator('[data-wire-section-jump="this-week"]').click();await page.waitForTimeout(600);
await page.locator('.wp-group .wp-lms .wc-title').evaluate(el=>{
 const point={identifier:1,target:el,clientX:250,clientY:300};
 for(const [type,x]of [['touchstart',250],['touchmove',130],['touchend',100]]){
  const p={...point,clientX:x},ev=new Event(type,{bubbles:true,cancelable:true});
  Object.defineProperties(ev,{touches:{value:type==='touchend'?[]:[p]},changedTouches:{value:[p]}});
  el.dispatchEvent(ev);
 }
 el.click();
});
if(await page.locator('.wire-expanded-overlay').count())throw Error('Swipe opened a priority card');
await page.waitForTimeout(650);
await page.locator('[data-wire-section-jump="this-week"]').click();await page.waitForTimeout(600);
report.cardRules={backgroundExpand:true,keyboardExpand:true,headerDragDismiss:true,swipeClickSuppressed:true};

await page.locator('.wp-group [data-wp-lms]').click();await page.waitForTimeout(700);
report.challenge=await page.evaluate(()=>({title:document.querySelector('#challenge-title')?.textContent}));
fs.writeFileSync('.mascot-fix/priority-report.json',JSON.stringify(report,null,2));
fs.writeFileSync('.mascot-fix/fix-report-'+engine.name()+'.json',JSON.stringify(report,null,2));
await browser.close();
}

// Verify the tightened left-aligned layout.
