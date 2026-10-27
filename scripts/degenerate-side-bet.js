/* Display the managers' supplied Week 8 agreement. */
(function(){
 const id='2026-w8-misba-cesar',opened=new Set();
 const terms='MISBA and CESAR agreed: the loser of their Week 8 matchup has to go to the casino with the winner once a week for a month. Each week, if the loser makes any gambling profit, they give the winner an amount in dollars equal to their fantasy matchup losing margin, from those profits.';
 const closing='Ok, this is clearly just an excuse for these two degenerates to go to the casino every week for a month and nothing else.';
 const invite='Agreed on a side bet? Share it in the group chat or text the commissioner to have it posted here. The commissioner is always open to side bets on his own matchups—text him to discuss.';
 const copy=()=>'<div class="sb-rules dg-copy"><p class="dg-terms">'+esc(terms)+'</p><p class="dg-joke">'+esc(closing)+'</p><p class="sb-invite">'+esc(invite)+'</p></div>';
 function match(data){
  if(Number(data?.seasonId)!==2026)return null;
  const names=new Map((data.teams||[]).map(t=>[String(t.id),String(hjMatchManager(t,data)||hjOwnerName(t,data)||'').toUpperCase()]));
  return (data.schedule||[]).find(g=>Number(g.matchupPeriodId)===8&&[names.get(String(g.home?.teamId)),names.get(String(g.away?.teamId))].sort().join('|')==='CESAR|MISBA');
 }
 const key=g=>`8:${g.home.teamId}:${g.away.teamId}`;
 function detail(surface){return '<details class="sb-detail" data-dg-detail="'+surface+'"'+(opened.has(surface)?' open':'')+'><summary><b>Degenerate Side Bet</b><span class="sb-chevron" aria-hidden="true">⌄</span></summary><div class="sb-detail-body">'+copy()+'</div></details>'}
 const render=hjMatchupCardHTML;
 hjMatchupCardHTML=function(game,source,data,placeholder){const html=render.apply(this,arguments),g=match(source);return !placeholder&&g&&key(g)===`${game.matchupPeriodId}:${game.home?.teamId}:${game.away?.teamId}`?html.replace('<div class="hq-edge-grid">',detail('matchup')+'<div class="hq-edge-grid">'):html};
 const build=wireBuild;
 wireBuild=function(data){
  const result=build.apply(this,arguments),g=match(data);if(!g||!(hjCurrentWeek(data)<=8||Number(WIRE.recapWeek)===8))return result;
  const faces='<div class="sb-faces dg-duel">'+['MISBA','CESAR'].map(n=>'<button type="button" class="sb-manager dg-person manager-profile-trigger" data-manager="'+n+'"><span class="dg-corner" aria-hidden="true">✦</span>'+av(n)+'<b>'+n+'</b></button>').join('<span class="dg-versus">VS</span>')+'</div>';
  const body='<div class="sb-wire-intro"><div class="dg-marquee"><div class="wc-title">Degenerate<small>Side Bet</small></div></div>'+faces+'<div class="dg-duration">Once a week · One month</div>'+copy()+'<button type="button" class="sb-open" data-wire-matchup="'+key(g)+'">View Week 8 matchup <span aria-hidden="true">→</span></button></div>';
  const html=wireCard({kicker:'Side Bet',tag:'Week 8 · MISBA vs CESAR',cls:'is-lead sb-wire sb-dg-wire',body}).replace('data-wire-card','data-wire-key="'+id+'" data-wire-card');
  result.cards.unshift({section:'sidebet',html});return result;
 };
 const stories=hjRcStories;
 hjRcStories=function(chosen,weeks,model){const html=stories.apply(this,arguments);return Number(chosen?.week)===8&&match(model?.data)?html+'<section class="rc-block sb-recap"><h3 class="rc-h">Degenerate Side Bet <small>MISBA vs CESAR</small></h3>'+detail('recap')+'</section>':html};
 document.addEventListener('toggle',e=>{const el=e.target;if(el.matches?.('[data-dg-detail]')&&el.isConnected){if(el.open)opened.add(el.dataset.dgDetail);else opened.delete(el.dataset.dgDetail)}},true);
 document.addEventListener('keydown',e=>{if(!e.defaultPrevented&&['Enter',' '].includes(e.key)&&e.target.matches?.('.sb-dg-wire[data-wire-card]')){e.preventDefault();wireOpenExpanded(e.target)}});
})();
