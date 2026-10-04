import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createApp} from './server.mjs';
let remoteText='',closed=false;
const app=createApp({code:'fixture-private-code-123456',origin:'http://127.0.0.1:38751',browserFactory:async()=>({
 frame:async()=>({image:'',origin:'https://fantasy.espn.com'}),
 input:async a=>{if(a.type==='text')remoteText=a.text;},
 roster:async()=>({teams:[{id:1,name:'Fixture manager',players:[{name:'Fixture quarterback'}]}]}),
 close:async()=>{closed=true;}
})});
const server=app.listen(38751,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch();try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage();await page.goto('http://127.0.0.1:38751');
 await page.locator('#code').fill('fixture-private-code-123456');await page.locator('#login button').tap();
 await page.locator('#test').waitFor({state:'visible'});await page.locator('#start').tap();await page.locator('#viewer').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('#start').disabled);
 await page.locator('#text').fill('fixture-only');await page.locator('#typing button').tap();await page.waitForFunction(()=>!document.querySelector('#start').disabled);
 assert.equal(remoteText,'fixture-only');assert.equal(await page.locator('#text').inputValue(),'');
 await page.locator('#league').fill('42');await page.locator('#roster button').tap();await page.locator('#results h2').waitFor();
 assert.equal(await page.locator('#results h2').textContent(),'Fixture manager');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'mobile-proof.png',fullPage:true});
 await page.locator('#end').tap();await page.locator('#login').waitFor({state:'visible'});assert.equal(closed,true);
 console.log('Mobile viewport, touch buttons, masked keyboard relay, roster display and session teardown passed with fixture only. Live ESPN login NOT verified.');
}finally{await browser.close();await app.locals.shutdown();await new Promise(r=>server.close(r));}
