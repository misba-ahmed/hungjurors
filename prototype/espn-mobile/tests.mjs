import test from 'node:test';import assert from 'node:assert/strict';import {createApp,validAction} from './server.mjs';import {allowed,ownRoster} from './browser.mjs';
const member='{11111111-2222-3333-4444-555555555555}';
test('only intended ESPN and Disney destinations; no fantasy writes',()=>{
 assert.equal(allowed('https://registerdisney.go.com/login','POST'),true);
 for(const url of ['http://fantasy.espn.com/','https://evil.com/','https://espn.com.evil.com/','https://127.0.0.1/','https://fantasy.espn.com:8443/','https://lm-api-writes.fantasy.espn.com/anything','https://lm-api-reads.fantasy.espn.com/leagues/1/transactions/'])assert.equal(allowed(url),false,url);
 assert.equal(allowed('https://fantasy.espn.com/apis/v3/leagues/1','POST'),false);
 assert.equal(allowed('https://lm-api-reads.fantasy.espn.com/apis/v3/leagues/1','GET'),true);
});
test('ownership filtering excludes another manager and never returns credentials',()=>{
 const league={id:42,seasonId:2026,teams:[{id:1,owners:[member],name:'My team',roster:{entries:[{lineupSlotId:0,playerPoolEntry:{player:{fullName:'Fixture QB'}}}]}},{id:2,owners:['{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}'],name:'Other team'}]};
 const r=ownRoster(league,member,'42',2026);assert.equal(r.teams.length,1);assert.equal(r.teams[0].id,1);assert.ok(!JSON.stringify(r).includes(member));
 assert.throws(()=>ownRoster(league,'{AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA}','42',2026));
 assert.throws(()=>ownRoster(league,member,'43',2026));
 assert.throws(()=>ownRoster({...league,teams:[{id:1,owners:[member]}]},member,'42',2026));
});
test('input is bounded and cannot execute arbitrary browser commands',()=>{
 assert.ok(validAction({type:'text',text:'fixture-only'}));assert.ok(validAction({type:'tap',x:10,y:20}));
 for(const a of [{type:'tap',x:-1,y:0},{type:'tap',x:400,y:0},{type:'text',text:'a'.repeat(513)},{type:'key',key:'F12'},{type:'navigate',url:'https://evil.com'},{type:'evaluate',text:'alert(1)'}])assert.equal(validAction(a),false);
});
test('private routes, CSRF, session lifecycle and read-only roster flow',async()=>{
 let now=1000,closed=0,inputs=0,reads=0;const origin='https://private.example';
 const app=createApp({code:'fixture-only-access-code-12345',origin,now:()=>now,browserFactory:async()=>({
  frame:async()=>({image:'fixture',origin:'https://fantasy.espn.com'}),input:async()=>{inputs++;},
  roster:async()=>{reads++;return {teams:[{id:1,name:'Fixture'}]};},close:async()=>{closed++;}
 })});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 let cookie='',csrf='';const call=(path,body,extra={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-Test-CSRF':csrf,...extra},body:body===undefined?undefined:JSON.stringify(body)});
 try{
  assert.equal((await call('/api/frame')).status,401);
  assert.equal((await call('/api/login',{code:'fixture-only-access-code-12345'},{Origin:'https://evil.com'})).status,403);
  assert.equal((await call('/api/login',{code:'wrong'})).status,401);
  const login=await call('/api/login',{code:'fixture-only-access-code-12345'});assert.equal(login.status,200);
  const header=login.headers.get('set-cookie');assert.match(header,/HttpOnly/);assert.match(header,/Secure/);assert.match(header,/SameSite=Strict/);cookie=header.split(';')[0];csrf=(await login.json()).csrf;
  assert.equal((await call('/api/start',{}, {'X-Test-CSRF':'wrong'})).status,403);
  assert.equal((await call('/api/start',{})).status,200);
  assert.equal((await call('/api/input',{type:'navigate',url:'https://evil.com'})).status,400);assert.equal(inputs,0);
  assert.equal((await call('/api/input',{type:'text',text:'fixture'})).status,200);assert.equal(inputs,1);
  assert.equal((await call('/api/roster',{league:'42',season:2026})).status,200);assert.equal(reads,1);
  assert.equal((await call('/api/roster',{league:'42/../../evil',season:2026})).status,400);
  assert.equal((await call('/api/transactions',{type:'DROP'})).status,404);
  assert.equal((await call('/api/end',{})).status,200);assert.equal(closed,1);assert.equal((await call('/api/frame')).status,401);
  const next=await call('/api/login',{code:'fixture-only-access-code-12345'});cookie=next.headers.get('set-cookie').split(';')[0];csrf=(await next.json()).csrf;
  now+=21*60000;assert.equal((await call('/api/session')).status,401);
 }finally{await app.locals.shutdown();await new Promise(r=>server.close(r));}
});
