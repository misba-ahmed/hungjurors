import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const src=fs.readFileSync(new URL('./matchup-navigation.js',import.meta.url),'utf8').split('/* One owner')[0];
for(const width of [390,1440])for(const start of [0,2000]){
let y=start,left=0;const calls=[],queue=[],state={activeTab:'matchups'};const sizes={'body > nav':43,'.hj-folder-dock':80,'#hq-panel-matchups .hq-matchup-switcher-shell':60};
const deck={scrollLeft:0,scrollTop:100,clientLeft:0,getBoundingClientRect:()=>({left:0}),scrollTo(o){left=o.left;this.scrollLeft=left;}};
const target={isConnected:true,dataset:{hqMatchupKey:'4:1:2'},closest:()=>deck,getBoundingClientRect:()=>({left:width-left,top:1200-y})};
const context={HJ_HQ_STATE:state,requestAnimationFrame:f=>queue.push(f),document:{querySelectorAll:()=>[target],querySelector:s=>sizes[s]?{getClientRects:()=>[1],getBoundingClientRect:()=>({height:sizes[s]})}:null},window:{get scrollY(){return y},scrollTo(o){y=o.top;calls.push(o)}}};
vm.runInNewContext(src,context);context.hjScrollMatchupStart(target);while(queue.length)queue.shift()();
assert.equal(y,1009);assert.equal(target.getBoundingClientRect().top,191);assert.equal(left,width);assert.equal(deck.scrollTop,0);assert.equal(state.matchupFocusKey,'4:1:2');assert.equal(calls.length,1);
context.HJ_HQ_STATE.activeTab='rosters';context.hjScrollMatchupStart(target);while(queue.length)queue.shift()();assert.equal(calls.length,1);
}console.log('PASS matchup links align selected card beneath all pinned headers from above/below at mobile/desktop widths');
