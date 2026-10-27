/* Week 8 agreement. Record visits only after commissioner confirmation. */
const HJ_DEGENERATE_BET={id:'2026-w8-misba-cesar',visits:[null,null,null,null]};
function hjDegenerateBetSnapshot(data){
 if(Number(data?.seasonId)!==2026)return null;
 const source=typeof hjResultsView==='function'?hjResultsView(data):data;
 const names=new Map((source.teams||[]).map(t=>[String(t.id),String(hjMatchManager(t,source)||hjOwnerName(t,source)||'').toUpperCase()]));
 const game=(source.schedule||[]).find(g=>Number(g.matchupPeriodId)===8&&[names.get(String(g.home?.teamId)),names.get(String(g.away?.teamId))].sort().join('|')==='CESAR|MISBA');
 if(!game)return null;
 const sides=['home','away'].map(key=>({name:names.get(String(game[key].teamId)),score:hjSideScore(game[key],8)}));
 const known=sides.every(s=>Number.isFinite(s.score));
 const final=known&&['HOME','AWAY','TIE'].includes(game.winner);
 const tied=known&&sides[0].score===sides[1].score;
 const margin=known?Math.round(Math.abs(sides[0].score-sides[1].score)*100)/100:null;
 const loser=known&&!tied?sides[sides[0].score<sides[1].score?0:1]:null;
 const winner=loser?sides.find(s=>s!==loser):null;
 return {game,sides,known,final,tied,margin,loser,winner,key:`8:${game.home.teamId}:${game.away.teamId}`};
}
(function(){
 const BET=HJ_DEGENERATE_BET,opened=new Set();
 const terms='MISBA and CESAR agreed: the loser of their Week 8 matchup has to go to the casino with the winner once a week for a month. Each week, if the loser makes any gambling profit, they give the winner an amount in dollars equal to their fantasy matchup losing margin, from those profits.';
 const closing='Ok, this is clearly just an excuse for these two degenerates to go to the casino every week for a month and nothing else.';
 const invite='Agreed on a side bet? Share it in the group chat or text the commissioner to have it posted here. The commissioner is always open to side bets on his own matchups—text him to discuss.';
 const copy=()=>'<div class="sb-rules dg-copy"><p class="dg-terms">'+esc(terms)+'</p><p class="dg-joke">'+esc(closing)+'</p><p class="sb-invite">'+esc(invite)+'</p></div>';
 function wheel(){
  const wedges=Array.from({length:24},(_,i)=>'<path d="M60 60L60 14A46 46 0 0 1 71.91 15.57Z" fill="'+(i===0?'#228a68':i%2?'#ac3c36':'#182723')+'" stroke="#dfc27e" stroke-width=".45" transform="rotate('+(i*15)+' 60 60)"/>').join('');
  return '<svg class="dg-wheel" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="58" fill="#583d29" stroke="#d9b467" stroke-width="2"/><circle cx="60" cy="60" r="53" fill="#152c28" stroke="#a0793a" stroke-width="2"/><g class="dg-wheel-rotor">'+wedges+'<circle cx="60" cy="60" r="28" fill="#b8853e" stroke="#ebd19a" stroke-width="2"/><circle cx="60" cy="60" r="21" fill="#754a2c"/><path d="M60 36V84M36 60H84" stroke="#edcd83" stroke-width="3"/><circle cx="60" cy="60" r="7" fill="#efdaa3"/></g><g class="dg-wheel-ball"><circle cx="60" cy="10" r="3.5" fill="#fff9dd" stroke="#fff"/></g></svg>';
 }
 function manager(name){return '<button type="button" class="sb-manager manager-profile-trigger" data-manager="'+name+'" aria-label="Open '+name+' profile">'+av(name)+'<b>'+name+'</b></button>'}
 function table(){return '<div class="dg-table"><div class="dg-table-rail"><span>CASINO</span><span>ADMIT TWO</span></div><div class="dg-table-scene">'+manager('MISBA')+wheel()+manager('CESAR')+'</div><span class="dg-chips dg-chips-left" aria-hidden="true"><i></i><i></i><i></i></span><span class="dg-chips dg-chips-right" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="dg-felt-caption">LOSER BRINGS THE WINNER</span></div>'}
 function visits(){
  const count=BET.visits.filter(v=>v?.attended===true).length;
  return '<div class="dg-visits"><div class="dg-visit-heading"><b>4 weekly casino visits</b><span>'+count+'/4 logged</span></div><ol class="dg-tickets" aria-label="Casino visit log">'+BET.visits.map((v,i)=>'<li class="dg-ticket'+(v?.attended?' is-used':'')+'"><span class="dg-ticket-punch" aria-hidden="true">'+(v?.attended?'✓':'')+'</span><span><b>WEEK '+(i+1)+'</b><small>'+(v?.attended?'Visited':'Pending')+'</small></span></li>').join('')+'</ol></div>';
 }
 function stakes(view){
  let label='WEEK 8 DECIDES WHO PAYS',who='Loser → winner',amount='Final margin',note='Each profitable week: pay $1 per point lost, from those profits.';
  if(view?.final&&view.tied){label='FINAL · TIED MATCHUP';who='No matchup loser';amount='No payment';note='The loser-pays condition does not apply to a tie.'}
  else if(view?.loser){label=view.final?'FINAL · AMOUNT PER PROFITABLE WEEK':'IF IT ENDED NOW · PER PROFITABLE WEEK';who=view.loser.name+' → '+view.winner.name;amount='$'+view.margin.toFixed(2);note='Only if the loser makes a gambling profit that week.'}
  return '<div class="dg-stakes"><div class="dg-stakes-label">'+label+'</div><div class="dg-stakes-row"><b>'+who+'</b><strong>'+amount+'</strong></div><p>'+note+'</p></div>';
 }
 function detail(view,surface){return '<details class="sb-detail dg-detail" data-dg-detail="'+surface+'"'+(opened.has(surface)?' open':'')+'><summary><b>Degenerate Side Bet</b><span class="sb-chevron" aria-hidden="true">⌄</span></summary><div class="sb-detail-body">'+visits()+stakes(view)+copy()+'</div></details>'}
 const render=hjMatchupCardHTML;
 hjMatchupCardHTML=function(game,source,data,placeholder){const html=render.apply(this,arguments),view=hjDegenerateBetSnapshot(source);return !placeholder&&view&&view.key===`${game.matchupPeriodId}:${game.home?.teamId}:${game.away?.teamId}`?html.replace('<div class="hq-edge-grid">',detail(view,'matchup')+'<div class="hq-edge-grid">'):html};
 const build=wireBuild;
 wireBuild=function(data){
  const result=build.apply(this,arguments),view=hjDegenerateBetSnapshot(data);if(!view||!(hjCurrentWeek(data)<=8||Number(WIRE.recapWeek)===8))return result;
  const body='<div class="sb-wire-intro dg-intro"><div class="wc-title">Degenerate Side Bet</div>'+table()+visits()+stakes(view)+'<div class="sb-wire-expanded">'+copy()+'</div><button type="button" class="sb-open" data-wire-matchup="'+view.key+'">View Week 8 matchup <span aria-hidden="true">→</span></button></div>';
  const html=wireCard({kicker:'Side Bet',tag:'Week 8 · MISBA vs CESAR',cls:'is-lead sb-wire sb-dg-wire',body}).replace('data-wire-card','data-wire-key="'+BET.id+'" data-wire-card');
  result.cards.unshift({section:'sidebet',html});return result;
 };
 const stories=hjRcStories;
 hjRcStories=function(chosen,weeks,model){const html=stories.apply(this,arguments),view=Number(chosen?.week)===8?hjDegenerateBetSnapshot(model?.data):null;return view?html+'<section class="rc-block sb-recap"><h3 class="rc-h">Degenerate Side Bet <small>MISBA vs CESAR</small></h3>'+detail(view,'recap')+'</section>':html};
 document.addEventListener('toggle',e=>{const el=e.target;if(el.matches?.('[data-dg-detail]')&&el.isConnected){if(el.open)opened.add(el.dataset.dgDetail);else opened.delete(el.dataset.dgDetail)}},true);
 document.addEventListener('keydown',e=>{if(!e.defaultPrevented&&['Enter',' '].includes(e.key)&&e.target.matches?.('.sb-dg-wire[data-wire-card]')){e.preventDefault();wireOpenExpanded(e.target)}});
})();
