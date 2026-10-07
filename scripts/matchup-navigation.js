/* External matchup links always land on the scorecard top, never the lineup center. */
function hjScrollMatchupStart(card){
 const key=typeof card==='string'?card:card?.dataset.hqMatchupKey;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(HJ_HQ_STATE.activeTab!=='matchups')return;
  const target=key?[...document.querySelectorAll('#hq-panel-matchups .hq-matchup[data-hq-matchup-key]')].find(el=>el.dataset.hqMatchupKey===key):card;
  if(!target?.isConnected)return;
  const deck=target.closest('.hq-matchup-list');
  if(deck){
   if(key)HJ_HQ_STATE.matchupFocusKey=key;
   deck.scrollTo({left:deck.scrollLeft+target.getBoundingClientRect().left-deck.getBoundingClientRect().left-deck.clientLeft,behavior:'instant'});
   deck.scrollTop=0;
  }
  const height=selector=>{const el=document.querySelector(selector);return el?.getClientRects().length?el.getBoundingClientRect().height:0;};
  const inset=height('body > nav')+height('.hj-folder-dock')+height('#hq-panel-matchups .hq-matchup-switcher-shell')+8;
  const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-inset);
  window.scrollTo({top,behavior:'instant'});
 }));
}
/* Keep the matchup rail's existing selection, nested rails and height rules. */
(function(){
 const root=document.querySelector('#league-hq');if(!root)return;
 const controllers=new WeakMap();
 function install(){
  root.querySelectorAll('#hq-panel-matchups .hq-matchup-list').forEach(deck=>{
   if(!deck.clientWidth)return;
   if(controllers.has(deck)){controllers.get(deck).fit();return;}
   const cards=()=>[...deck.children];
   controllers.set(deck,hjSectionRail(deck,{
    label:'Matchups.',heightProperty:'--hj-matchup-height',
    selected:()=>Math.max(0,cards().findIndex(c=>c.dataset.hqMatchupKey===HJ_HQ_STATE.matchupFocusKey)),
    beforeFit:()=>{if(typeof hjFitStarterSpace==='function')hjFitStarterSpace();},
    choose:index=>{
     const key=cards()[index]?.dataset.hqMatchupKey;if(!key)return;HJ_HQ_STATE.matchupFocusKey=key;
     root.querySelectorAll('#hq-panel-matchups [data-hq-matchup-jump]').forEach(b=>{const selected=b.dataset.hqMatchupJump===key;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
     hjCenterMatchupJumpChipV32(key);
    }
   }));
  });
 }
 window.addEventListener('click',event=>{
  const button=event.target.closest?.('#hq-panel-matchups [data-hq-matchup-jump]');if(!button)return;
  const deck=root.querySelector('#hq-panel-matchups .hq-matchup-list');if(!deck)return;
  const index=[...deck.children].findIndex(c=>c.dataset.hqMatchupKey===button.dataset.hqMatchupJump);if(index<0)return;
  event.preventDefault();event.stopImmediatePropagation();install();controllers.get(deck)?.go(index);
 },true);
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;install()})}};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 root.addEventListener('toggle',schedule,true);window.addEventListener('resize',schedule);install();
})();

/* Roster pages stay in the native rail through touch, trackpad, rotation and sync. */
(function(){
 const root=document.getElementById('league-sync-content');if(!root)return;
 const installed=new WeakMap();
 function install(){
  const deck=root.querySelector('.hj-roster-rail');if(!deck||!deck.clientWidth)return;
  if(installed.has(deck)){installed.get(deck).fit();return;}
  const pages=()=>[...deck.children];
  const api=hjSectionRail(deck,{
   label:'Rosters.',inert:true,
   selected:()=>Math.max(0,pages().findIndex(p=>p.dataset.hjRosterTeam===String(HJ_LEAGUE_STATE.selectedTeamId))),
   exclude:node=>node.matches('.hj-team-photo,input,select,textarea,[contenteditable]'),
   choose:index=>{
    const key=pages()[index]?.dataset.hjRosterTeam;if(key==null)return;
    HJ_LEAGUE_STATE.selectedTeamId=key;
    try{localStorage.setItem(HJ_LEAGUE_TEAM_KEY,key)}catch(_){}
    root.querySelectorAll('[data-league-team]').forEach(b=>{const active=b.dataset.leagueTeam===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    const tab=root.querySelector('[data-league-team].active'),rail=tab?.parentElement;
    if(tab&&rail){const r=rail.getBoundingClientRect(),b=tab.getBoundingClientRect();if(b.left<r.left)rail.scrollLeft+=b.left-r.left;else if(b.right>r.right)rail.scrollLeft+=b.right-r.right;}
   }
  });installed.set(deck,api);
 }
 root.addEventListener('click',event=>{
  const tab=event.target.closest('[data-league-team]'),deck=root.querySelector('.hj-roster-rail');if(!tab||!deck)return;
  install();const api=installed.get(deck);if(!api)return;
  event.preventDefault();event.stopImmediatePropagation();api.go([...deck.children].findIndex(p=>p.dataset.hjRosterTeam===tab.dataset.leagueTeam));
 },true);
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;install()})}};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 new ResizeObserver(schedule).observe(root);
 window.addEventListener('resize',schedule);install();
})();

/* Keep the real challenge controls/listeners; move them into the selected page.
 * Other pages contain current previews, not temporary gesture overlays.
 */
(function(){
 const root=document.getElementById('challenges'),out=document.getElementById('challenge-out'),card=document.getElementById('challenge-card');
 if(!root||!out||!card)return;
 const deck=document.createElement('div');deck.className='hj-section-rail hj-challenge-rail';
 card.before(deck);
 const pages=CHALLENGES.map(ch=>{const page=document.createElement('div');page.className='hj-section-page hj-challenge-page';page.dataset.hjChallenge=ch.id;deck.append(page);return page;});
 let active=CHALLENGES.findIndex(ch=>ch.id===HJ_CHALLENGE_STATE.active),api=null;
 pages[active].append(card,out);
 const baseSelect=selectChallenge,baseRender=hjRenderChallenge;
 function preview(index){
  if(index===active)return;
  const ch=CHALLENGES[index],head=card.cloneNode(true),body=document.createElement('div');
  head.removeAttribute('id');head.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  head.querySelector('.ch-title').textContent=ch.label;head.querySelector('.ch-rules').textContent=ch.rule;head.querySelector('.ch-rules').classList.remove('is-open');head.querySelector('.ch-stamp').textContent=ch.prize;
  const toggle=head.querySelector('.ch-rules-toggle');if(toggle){toggle.textContent='Full rules';toggle.setAttribute('aria-expanded','false');}
  body.className='hj-challenge-out';body.innerHTML=hjChBodyHTML(ch,HJ_CHALLENGE_STATE.model);
  pages[index].replaceChildren(head,body);
 }
 function refresh(){pages.forEach((_,i)=>preview(i));api?.fit();}
 function choose(index){
  if(index===active)return;
  const previous=active;active=index;
  if(HJ_CHALLENGE_STATE.profileTimer){clearTimeout(HJ_CHALLENGE_STATE.profileTimer);HJ_CHALLENGE_STATE.profileTimer=null;}
  pages[index].replaceChildren(card,out);preview(previous);
  baseSelect(CHALLENGES[index].id);
 }
 refresh();
 api=hjSectionRail(deck,{
  label:'Side challenges.',inert:true,selected:()=>active,choose,
  exclude:node=>node.matches('input,select,textarea,[contenteditable]')||node.matches('.lms-stage')&&!node.closest('.lms-view')?.classList.contains('is-fit')
 });
 selectChallenge=function(id){const index=CHALLENGES.findIndex(ch=>ch.id===id);api.go(index<0?0:index);};
 hjRenderChallenge=function(){const result=baseRender.apply(this,arguments);refresh();return result;};
})();
