import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
execFileSync('git',['fetch','origin','main']);
execFileSync('git',['worktree','add','--detach','/tmp/banner-mock','origin/main']);
execFileSync('node',['scripts/prepare-site.mjs','index.html'],{cwd:'/tmp/banner-mock',stdio:'inherit'});
execFileSync('npm',['install','--no-save','--package-lock=false','playwright'],{stdio:'inherit'});
execFileSync('npx',['playwright','install','--with-deps','chromium'],{stdio:'inherit'});
const {chromium}=await import('playwright');const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1.5});
await page.route('https://hungjurors.com/**',async route=>{
 const url=new URL(route.request().url()),p=path.join('/tmp/banner-mock',decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(fs.existsSync(p)&&fs.statSync(p).isFile()){const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};return route.fulfill({body:fs.readFileSync(p),contentType:types[path.extname(p)]||'application/octet-stream'});}
 return route.continue();
});
await page.goto('https://hungjurors.com/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.wp-group');await page.waitForTimeout(2000);
await page.addStyleTag({content:fs.readFileSync('.mascot-fix/two-column.css','utf8')});
for(const [name,width] of [['desktop',1440],['narrow',900]]){
 await page.setViewportSize({width,height:1100});await page.evaluate(()=>{wireScrollTo(0);window.scrollTo(0,0)});await page.waitForTimeout(600);
 const bounds=await page.locator('.wp-group').boundingBox();
 const clip={x:Math.max(0,bounds.x-16),y:Math.max(0,bounds.y-175),width:bounds.width+32,height:bounds.height+270};
 fs.writeFileSync('.mascot-fix/two-column-'+name+'.json',JSON.stringify({image:(await page.screenshot({type:'png',clip})).toString('base64')}));
 fs.writeFileSync('.mascot-fix/two-column-layout-'+name+'.json',JSON.stringify(await page.locator('.wp-group .wp-panel').evaluateAll(nodes=>nodes.map(n=>({kind:n.dataset.wpCard,height:n.clientHeight,scrollHeight:n.scrollHeight,width:n.clientWidth,scrollWidth:n.scrollWidth})))));
}
await browser.close();

// Revised team hierarchy preview.
