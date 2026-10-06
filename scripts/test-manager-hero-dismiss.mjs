import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
class El{constructor(){this.attrs={};this.children=[];this.events={};}setAttribute(k,v){this.attrs[k]=String(v)}append(n){n.parent=this;this.children.push(n)}insertBefore(n,b){this.children=this.children.filter(x=>x!==n);this.children.splice(this.children.indexOf(b),0,n);n.parent=this;}addEventListener(k,f){this.events[k]=f}replaceWith(n){this.replacement=n}contains(n){return n===this||this.children.some(c=>c.contains(n))}closest(){return this.attrs['data-hero-manager']?this:this.parent?.closest()} }
const logo=new El();logo.src='logo';const listeners={},document={readyState:'complete',hidden:false,querySelector:()=>logo,getElementById:()=>null,createElement:()=>new El(),createElementNS:()=>new El(),addEventListener:(k,f)=>listeners[k]=f};
const names=['MISBA','BRYAN','TYLER','NATHAN M','WASI','CESAR','NATHAN T','GARRETT','JARRETT','KAT'];
const data={status:{currentMatchupPeriod:1},teams:names.map((name,id)=>({id,name,record:{overall:{wins:id,pointsFor:id}}})),schedule:[]};
const ctx=vm.createContext({document,HJ_LEAGUE_STATE:{data},hjMatchManager:t=>t.name,NFL_WEEK1:[],setInterval(){}});
vm.runInContext(fs.readFileSync('scripts/manager-hero.js','utf8'),ctx);
const svg=logo.replacement.children[0],g=svg.children.find(c=>c.attrs['data-hero-manager']),bubble=svg.children.at(-1);
g.events.click();assert.equal(bubble.attrs.visibility,'visible');
listeners.pointerdown({target:g.children[0],pointerType:'touch'});assert.equal(bubble.attrs.visibility,'visible');
listeners.pointerdown({target:new El(),pointerType:'touch'});assert.equal(bubble.attrs.visibility,'hidden');
g.events.click();assert.equal(bubble.attrs.visibility,'visible');listeners.keydown({key:'Escape'});assert.equal(bubble.attrs.visibility,'hidden');
console.log('Mobile outside tap dismisses score; selecting another manager still works');
