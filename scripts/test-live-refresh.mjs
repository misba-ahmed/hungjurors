import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {prepareSite} from './prepare-site.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=prepareSite(read('../index.html'));
const css=text=>[...text.matchAll(/<style\b[^>]*>([^]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const head=html.indexOf('</head>'),styles=css(html.slice(0,head))+'\n'+read('../styles/live-display.css')+'\n'+css(html.slice(head));
const row=(id,right=false,score=12)=>'<button class="hj-player-v3'+(right?' is-right':'')+'" data-pc-id="'+id+'" data-game-in-progress="true"><span class="hj-v3-avatar"><img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'/%3E"></span><span class="hj-v3-identity"><span class="hj-v3-name">J. Smith-Njigba</span><span class="hj-v3-meta">SEA · WR1</span></span><span class="hj-game-context"><span class="hj-game-status">Q3 8:32</span><span class="hj-game-stats">6/8 REC, 70 REY</span></span><span class="hj-v3-score"><strong>'+score+'</strong><span class="hj-v3-projection">E 20.83</span></span></button>';
const matchup=score=>'<div class="hq-matchup-list">'+[0,1,2].map(i=>'<article class="hq-matchup is-open" data-hq-matchup="'+i+'" data-hq-matchup-key="'+i+'"><div class="hq-matchup-summary">Live '+score+'</div><div class="hq-match-win">Win probability</div><div class="hj-matchup-actions"><details class="hj-matchup-preview"><summary>Matchup Preview</summary><div>Lineup options</div></details></div><div class="hj-lineup-v2"><div class="hj-lineup-v2-starters">'+Array.from({length:9},(_,n)=>'<div class="hj-lineup-v2-row">'+row(i+'a'+n,false,score)+'<span class="hj-lineup-v2-slot">WR</span>'+row(i+'b'+n,true,score)+'</div>').join('')+'</div></div>'+(i===0?'<div style="height:200px">Side bet</div>':'')+'</article>').join('')+'</div>';
const roster=score=>'<div class="league-roster-groups"><div class="league-roster-group"><div class="league-roster-group-head">Starting lineup</div><div class="league-player-list">'+Array.from({length:16},(_,n)=>row('r'+n,false,score)).join('')+'</div></div></div>';
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}});
  await page.setContent('<style>'+styles+'</style><nav></nav><div style="height:500px"></div><main id="league-hq"><div class="hj-folder-dock"></div><div id="league-sync-content">'+roster(12)+'</div><div id="league-hq-tools"><section id="hq-panel-matchups"><div class="hq-matchup-switcher-shell"></div><div id="hq-matchup-content">'+matchup(12)+'</div></section></div></main><div style="height:1600px"></div><div class="manager-modal-scroll" style="height:350px;overflow:auto"><div class="manager-hq-roster">'+roster(12)+'</div></div><style>body>nav{height:44px!important}.hj-folder-dock{height:80px!important}#league-hq{width:100%!important;margin:0!important;padding:0!important}.hq-matchup-switcher-shell{height:42px!important}.hq-matchup-summary{height:90px!important}.hq-match-win{height:25px!important}.manager-modal-scroll{max-height:350px!important}</style>');
  await page.addScriptTag({content:'window.HJ_HQ_STATE={activeTab:"matchups",matchupFocusKey:"1"};function hjRenderLeagueTools(){} function hjSetHQTab(){} function hjCenterMatchupJumpChipV32(){}'});
  await page.addScriptTag({content:read('./live-updates.js')});
  await page.evaluate(markup=>document.querySelector('#hq-matchup-content').innerHTML=markup,matchup(12));
  await page.addScriptTag({content:read('./matchup-row-fit.js')});
  await page.addScriptTag({content:read('./matchup-navigation.js')});
  await page.addScriptTag({content:read('./layout-guard.js')});
  await page.waitForTimeout(250);
  for(const width of [1100,390]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
   await page.evaluate(()=>{
    const deck=document.querySelector('.hq-matchup-list'),card=deck.children[1];
    window.scrollTo(0,card.getBoundingClientRect().top+window.scrollY+140);
    document.querySelector('.manager-modal-scroll').scrollTop=180;
    window.refs={deck,card,lineup:card.querySelector('.hj-lineup-v2'),row:card.querySelector('.hj-player-v3'),image:card.querySelector('img'),profile:document.querySelector('.manager-hq-roster .hj-player-v3')};
    refs.row.style.setProperty('font-family','var(--sans)','important');
    refs.card.querySelector('details').open=true;
   });
   await page.waitForTimeout(250);
   const before=await page.evaluate(()=>({top:scrollY,left:refs.deck.scrollLeft,height:refs.deck.getBoundingClientRect().height,room:refs.lineup.style.getPropertyValue('--hj-row-room'),rowY:refs.row.getBoundingClientRect().top,profileScroll:document.querySelector('.manager-modal-scroll').scrollTop}));
   for(let score=13;score<=15;score++){
    const after=await page.evaluate(({matchup,roster})=>{
     hjHoldLayout(()=>{
      document.querySelector('#league-sync-content').innerHTML=roster;
      document.querySelector('#hq-matchup-content').innerHTML=matchup;
      document.querySelector('.manager-hq-roster').innerHTML=roster;
     });
     return {sameDeck:refs.deck===document.querySelector('.hq-matchup-list'),sameRow:refs.row===refs.card.querySelector('.hj-player-v3'),sameImage:refs.image===refs.card.querySelector('img'),sameProfile:refs.profile===document.querySelector('.manager-hq-roster .hj-player-v3'),score:refs.row.querySelector('strong').textContent,height:refs.deck.getBoundingClientRect().height,room:refs.lineup.style.getPropertyValue('--hj-row-room'),open:refs.card.querySelector('details').open,font:refs.row.style.getPropertyValue('font-family')};
    },{matchup:matchup(score),roster:roster(score)});
    assert.ok(after.sameDeck&&after.sameRow&&after.sameImage&&after.sameProfile,'retain live nodes');
    assert.equal(after.score,String(score),'scores still update');
    assert.ok(after.open,'expanded preview remains open');
    assert.equal(after.font,'var(--sans)');
    assert.equal(after.height,before.height,'no transient height reset during render');
    assert.equal(after.room,before.room,'no transient density reset');
    await page.waitForTimeout(400);
    const settled=await page.evaluate(()=>({top:scrollY,left:refs.deck.scrollLeft,height:refs.deck.getBoundingClientRect().height,room:refs.lineup.style.getPropertyValue('--hj-row-room'),rowY:refs.row.getBoundingClientRect().top,profileScroll:document.querySelector('.manager-modal-scroll').scrollTop}));
    assert.deepEqual(settled,before,'background refresh must not move the view');
   }
   // Ordinary scrolling must not refit typography when another score ticks.
   await page.evaluate(()=>{window.scrollBy(0,120);hjFitStarterSpace()});
   assert.equal(await page.evaluate(()=>refs.lineup.style.getPropertyValue('--hj-row-room')),before.room);
  }
  console.log('PASS '+engine.name()+': live scores update without replacing rows, resizing or moving page/carousel/profile');
 }finally{await browser.close()}
}
