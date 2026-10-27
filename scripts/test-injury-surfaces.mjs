import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {parseHTML}=await import(process.env.INJURY_DOM_MODULE||'linkedom');
import {prepareSite} from './prepare-site.mjs';
const built=prepareSite(fs.readFileSync('index.html','utf8'));
const code=built.slice(built.indexOf('function hjOfficialStatus('),built.indexOf('const HJ_HEALTH='));
assert(built.includes("attributeFilter:['data-pc-id','data-pc-position']"),'Reused player nodes must refresh when their ID changes');
assert(!built.includes('data-depth-freshness'),'Removed timestamp text stays removed');
const fixtures=JSON.parse(fs.readFileSync('scripts/fixtures/injury-player-surfaces.json'));
const {document}=parseHTML('<html><body></body></html>');
const ctx=vm.createContext({document,Date,HJ_STATUS_LIVE:new Map(),HJ_INJURY_REPORT:{rows:[]},ffnRosterPlayers:[]});
vm.runInContext(code,ctx);ctx.HJ_HEALTH=ctx.hjCreateHealthStore();
function setPlayers(players){ctx.HJ_HEALTH=ctx.hjCreateHealthStore();for(const p of players)ctx.HJ_HEALTH.accept(p.id,ctx.hjOfficialStatus(p),Date.now())}
const badges='.hj-espn-status,.hj-v3-injury,.hj-player-v2-injury,.depth-injury';
for(const fixture of fixtures){
 document.body.innerHTML=fixture.html;
 const node=document.querySelector('[data-pc-id]');node.dataset.pcId='101';node.dataset.pcPosition='RB';
 setPlayers([{id:'101',injuries:[{status:'Injured Reserve'}]}]);
 ctx.hjApplyOfficialStatuses();assert.equal(node.querySelectorAll(badges).length,1,fixture.surface+' IR badge');
 assert.equal(node.querySelector(badges).textContent,'IR');
 const unchanged=node.innerHTML;ctx.hjApplyOfficialStatuses();assert.equal(node.innerHTML,unchanged,'Idempotent update');
 node.append(node.querySelector(badges).cloneNode(true));ctx.hjApplyOfficialStatuses();assert.equal(node.querySelectorAll(badges).length,1,'Duplicate badge removal');
 setPlayers([{id:'101',injuries:[],status:'Active'}]);ctx.hjApplyOfficialStatuses();assert.equal(node.querySelectorAll(badges).length,0,'Healthy recovery');
 node.dataset.pcId='102';setPlayers([{id:'102',injuryStatus:'QUESTIONABLE'}]);ctx.hjApplyOfficialStatuses();assert.equal(node.querySelector(badges).textContent,'Q','Reused node gets the new player status');
 node.dataset.pcId='103';ctx.hjApplyOfficialStatuses();assert.equal(node.querySelectorAll(badges).length,0,'Unknown replacement player cannot inherit the previous badge');
 node.dataset.pcId='102';ctx.hjApplyOfficialStatuses();node.dataset.pcPosition='D/ST';ctx.hjApplyOfficialStatuses();assert.equal(node.querySelectorAll(badges).length,0,'DST has no player injury badge');
}
for(const prefix of ['ffn','rc-feat','rc-mini','rc-pcard']){
 const photo=fixtures.find(f=>f.surface.startsWith(prefix+'-photo')),name=fixtures.find(f=>f.surface.startsWith(prefix==='ffn'?'ffn-player-name':prefix+'-name'));
 document.body.innerHTML=`<div>${photo.html}<div>${name.html}</div></div>`;
 document.querySelectorAll('[data-pc-id]').forEach(n=>{n.dataset.pcId='101';n.dataset.pcPosition='RB'});
 setPlayers([{id:'101',injuryStatus:'OUT'}]);ctx.hjApplyOfficialStatuses();
 assert.equal(document.querySelectorAll(badges).length,1,'One injury badge for paired '+prefix+' photo/name');
 assert.equal(document.querySelector('.'+prefix+'-photo').querySelectorAll(badges).length,0,'No badge inside paired photo');
}
console.log(`PASS ${fixtures.length} actual player surfaces: IR, healthy recovery, node reuse, DST exclusion, duplicate cleanup and stable refresh; 4 photo/name pairs`);

const liveSource=fs.readFileSync('scripts/live-updates.js','utf8');
vm.runInContext(liveSource.slice(liveSource.indexOf(' function key('),liveSource.indexOf(' function update(')),ctx);
document.body.innerHTML='<div class="hj-v3-meta">NYJ · <span class="hj-v3-rank">RB39</span><span class="hj-espn-status">O</span></div>';
const current=document.body.firstElementChild;current.dataset.pcId='101';setPlayers([{id:'101',injuryStatus:'OUT'}]);
const badge=current.querySelector('.hj-espn-status');
for(let i=0;i<20;i++){
 const fresh=document.createElement('div');fresh.className='hj-v3-meta';fresh.dataset.pcId='101';fresh.innerHTML='NYJ · <span class="hj-v3-rank">RB39</span>';
 ctx.patch(current,fresh);assert.equal(current.querySelector('.hj-espn-status'),badge,'Score-only refresh retains the same badge node');
}
console.log('PASS 20 score refreshes preserve badge identity through canonical reconciliation');
