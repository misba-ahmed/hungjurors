/* Week 7 agreement. Changes to extra.agreed/made require commissioner confirmation. */
const HJ_FREE_THROW_BET={
 id:'2026-w7-misba-bryan-free-throws',season:2026,week:7,
 shots:50,made:{MISBA:21,BRYAN:28},extra:{agreed:true,attempted:null,made:null,shooter:null}
};
function hjFreeThrowBetSnapshot(data,agreement=HJ_FREE_THROW_BET){
 if(Number(data?.seasonId)!==agreement.season)return null;
 const view=typeof hjResultsView==='function'?hjResultsView(data):data;
 const names=new Map((view.teams||[]).map(t=>[String(t.id),String(hjMatchManager(t,view)||hjOwnerName(t,view)||'').toUpperCase()]));
 const game=(view.schedule||[]).find(g=>Number(g.matchupPeriodId)===agreement.week&&
  [names.get(String(g.home?.teamId)),names.get(String(g.away?.teamId))].sort().join('|')==='BRYAN|MISBA');
 if(!game)return null;
 const sides=['home','away'].map(key=>({key,id:game[key].teamId,name:names.get(String(game[key].teamId)),score:hjSideScore(game[key],agreement.week)}));
 const final=['HOME','AWAY','TIE'].includes(game.winner)&&sides.every(s=>Number.isFinite(s.score));
 const tie=final&&(game.winner==='TIE'||sides[0].score===sides[1].score);
 const winner=final&&!tie?sides.find(s=>s.key.toUpperCase()===game.winner):null,loser=winner?sides.find(s=>s!==winner):null;
 const base=loser?agreement.shots-agreement.made[loser.name]:null;
 const margin=winner?Math.round(Math.abs(winner.score-loser.score)*100)/100:null;
 const extraShots=winner&&agreement.extra.agreed?Math.ceil(margin):null;
 // A corrected winner invalidates any attempts recorded for the previous loser.
 const extraMade=agreement.extra.made,extraKnown=extraShots!==null&&agreement.extra.shooter===loser.name&&agreement.extra.attempted===extraShots&&Number.isInteger(extraMade)&&extraMade>=0&&extraMade<=extraShots;
 const extraOwed=extraKnown?extraShots-extraMade:null;
 const scoresKnown=sides.every(s=>Number.isFinite(s.score));
 const liveMargin=scoresKnown?Math.round(Math.abs(sides[0].score-sides[1].score)*100)/100:null;
 const liveTrailer=scoresKnown&&liveMargin>0?sides.find(s=>s.score===Math.min(...sides.map(s=>s.score))):null;
 return {sides,final,tie,winner,loser,base,margin,extraShots,extraOwed,liveMargin,liveTrailer,
  total:tie?0:base===null?null:agreement.extra.agreed?(extraKnown?base+extraOwed:null):base,
  key:`${agreement.week}:${game.home.teamId}:${game.away.teamId}`};
}
(function(){
 const BET=HJ_FREE_THROW_BET,opened=new Set();
 const money=n=>'$'+n;
 function shotChart(name){
  return '<span class="sb-ft-shotchart" role="img" aria-label="'+BET.made[name]+' made, '+(BET.shots-BET.made[name])+' missed">'+Array.from({length:50},(_,i)=>'<i class="'+(i<BET.made[name]?'is-made':'is-missed')+'"></i>').join('')+'</span>';
 }
 function court(){
  return '<div class="sb-ft-court"><div class="wc-title">Free Throw Bet <small>SWISH OR PAY</small></div><svg viewBox="0 0 320 76" aria-hidden="true" focusable="false"><path class="sb-ft-floor" d="M135 72H319M195 72Q200 54 223 54T251 72"/><rect class="sb-ft-board" x="265" y="7" width="35" height="36" rx="3"/><path class="sb-ft-target" d="M274 39V23H291V39"/><path class="sb-ft-net" d="M246 46L251 64H267L274 46M251 47L263 64M269 47L255 64M250 55H270"/><ellipse class="sb-ft-rim" cx="260" cy="45" rx="15" ry="4"/><g class="sb-ft-ball is-made"><circle r="6"/><path d="M-6 0H6M0-6V6M-4-4Q3 0-4 4M4-4Q-3 0 4 4"/></g><g class="sb-ft-ball is-missed"><circle r="6"/><path d="M-6 0H6M0-6V6M-4-4Q3 0-4 4M4-4Q-3 0 4 4"/></g></svg></div>';
 }
 function faces(){
  return '<div class="sb-faces">'+Object.keys(BET.made).map(name=>'<div class="sb-ft-shooter"><button type="button" class="sb-manager manager-profile-trigger" data-manager="'+name+'" aria-label="Open '+name+' profile">'+av(name)+'<b>'+name+'</b></button><small>'+BET.made[name]+'/50 made · '+(BET.shots-BET.made[name])+' misses</small>'+shotChart(name)+'</div>').join('<span class="sb-vs">vs</span>')+'</div>';
 }
 function result(view){
  if(!view.final)return '<p class="sb-result">The Week 7 matchup decides who pays.</p>';
  if(view.tie)return '<p class="sb-result">The matchup is tied. Neither manager owes a payment under this loser-pays bet.</p>';
  let text='<b>'+esc(view.loser.name)+'</b> owes <b>'+esc(view.winner.name)+' '+money(view.base)+'</b>';
  if(BET.extra.agreed)text+=view.extraOwed===null?' plus $1 per miss on '+view.extraShots+' extra free throws. Extra-shot results are pending.':' plus '+money(view.extraOwed)+' for extra misses — <b>'+money(view.total)+' total</b>.';
  else text+=' for '+(BET.shots-BET.made[view.loser.name])+' missed free throws.';
  return '<p class="sb-result">'+text+'</p>';
 }
 function extraPanel(view){
  if(!BET.extra.agreed)return '<p class="sb-ft-option">Optional extra shots · both must agree</p>';
  const count=view.final?(view.tie?0:view.extraShots):view.liveMargin===null?null:Math.ceil(view.liveMargin);
  const shooter=view.final?view.loser:view.liveTrailer;
  const label=view.final?(view.tie?'Final · tie game':view.extraOwed===null?'Final · shots to take':'Extra shots completed'):'If it ended now';
  const copy=shooter?esc(shooter.name)+(view.final&&view.extraOwed!==null?' shot':' shoots'):'No shooter'+(view.final?'':' yet');
  return '<div class="sb-ft-pressure"><div class="sb-ft-lock"><span aria-hidden="true">✓</span> EXTRA SHOTS · LOCKED IN</div><div class="sb-ft-pressure-row"><div><small>'+label+'</small><b>'+copy+'</b></div><strong>'+(count===null?'—':count)+'<small>EXTRA SHOTS</small></strong></div><p>'+(view.final&&view.extraOwed!==null?money(view.extraOwed)+' in extra misses':'Losing margin rounded up · $1 per miss')+'</p></div>';
 }
 function rules(){
  return '<div class="sb-rules"><p>Both managers shot 50 free throws. The Week 7 matchup loser pays the winner $1 for each shot they missed: MISBA made 21 and missed 29; BRYAN made 28 and missed 22.</p>'+
   '<p><b>'+ (BET.extra.agreed?'Extra shots are locked in:':'Optional extra shots:')+'</b> '+(BET.extra.agreed?'MISBA and BRYAN both agreed. The loser must shoot':'Both managers must agree before the loser shoots')+' additional free throws equal to their losing margin, rounded up to a whole shot. A 12.6-point loss means 13 extra shots. Every extra miss adds $1 to the base payment.</p>'+
   '<p><b>'+ (BET.extra.agreed?'Extra-shot option agreed.':'Extra-shot option is not active; both managers must agree.')+'</b></p>'+
   '<p class="sb-invite">Agreed on a side bet? Share it in the group chat or text the commissioner to have it posted here. The commissioner is always open to side bets on his own matchups—text him to discuss.</p></div>';
 }
 function stakes(){
  return '<div class="sb-ft-stakes"><div><small>If MISBA loses</small><b>$29 to BRYAN</b></div><div><small>If BRYAN loses</small><b>$22 to MISBA</b></div></div>';
 }
 function detail(view,surface){
  const key=BET.id+':'+surface;
  return '<details class="sb-detail sb-ft-detail" data-ft-bet-detail="'+key+'"'+(opened.has(key)?' open':'')+'><summary><b>Side Bet · Free Throws</b><span class="sb-detail-label">$29 / $22'+(BET.extra.agreed?' + extra shots':'')+'</span><span class="sb-chevron" aria-hidden="true">⌄</span></summary><div class="sb-detail-body">'+
   (surface==='matchup'?'':faces())+stakes()+extraPanel(view)+result(view)+rules()+'</div></details>';
 }
 function card(view){
  const body='<div class="sb-wire-intro sb-ft-intro">'+court()+faces()+stakes()+
   extraPanel(view)+(view.final?'<div class="sb-wire-expanded">'+result(view)+'</div>':'')+
   '<div class="sb-wire-expanded">'+rules()+'</div><button type="button" class="sb-open" data-wire-matchup="'+esc(view.key)+'">View Week 7 matchup <span aria-hidden="true">→</span></button></div>';
  return wireCard({kicker:'Side Bet',tag:'Week 7 · MISBA vs BRYAN',cls:'is-lead sb-wire sb-ft-wire',body}).replace('data-wire-card','data-wire-key="'+BET.id+'" data-wire-card');
 }
 const matchup=hjMatchupCardHTML;
 hjMatchupCardHTML=function(game,source,data,placeholder){
  const html=matchup.apply(this,arguments);
  if(placeholder||Number(game?.matchupPeriodId)!==BET.week)return html;
  const view=hjFreeThrowBetSnapshot(source);
  if(!view||view.key!==`${BET.week}:${game.home?.teamId}:${game.away?.teamId}`)return html;
  return html.replace('<div class="hq-edge-grid">',detail(view,'matchup')+'<div class="hq-edge-grid">');
 };
 const build=wireBuild;
 wireBuild=function(data){
  const built=build.apply(this,arguments),week=hjCurrentWeek(data);
  // Announce ahead of Week 7, retain through its recap, then leave the carousel.
  if(!(week>=6&&(week<=7||Number(WIRE.recapWeek)===7)))return built;
  const view=hjFreeThrowBetSnapshot(data);if(!view)return built;
  const afterRecap=built.cards.reduce((last,c,i)=>c.section==='recap'?i+1:last,0);
  built.cards.splice(afterRecap,0,{section:'sidebet',html:card(view)});
  return built;
 };
 const stories=hjRcStories;
 hjRcStories=function(chosen,weeks,model){
  const html=stories.apply(this,arguments);
  if(Number(chosen?.week)!==BET.week)return html;
  const view=hjFreeThrowBetSnapshot(model?.data);if(!view?.final)return html;
  return html+'<section class="rc-block sb-recap"><h3 class="rc-h">Side Bet <small>Week 7 · MISBA vs BRYAN</small></h3>'+detail(view,'recap')+'</section>';
 };
 document.addEventListener('toggle',event=>{
  const el=event.target;if(!el.matches?.('[data-ft-bet-detail]')||!el.isConnected)return;
  if(el.open)opened.add(el.dataset.ftBetDetail);else opened.delete(el.dataset.ftBetDetail);
 },true);
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||!['Enter',' '].includes(event.key)||!event.target.matches?.('.sb-ft-wire[data-wire-card]'))return;
  event.preventDefault();wireOpenExpanded(event.target);
 });
})();
