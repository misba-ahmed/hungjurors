/* MISBA / GARRETT, 2026 Week 3: one agreement shared by the Wire, matchup and recap. */
(function(){
 'use strict';
 const BET={id:'2026-w3-misba-garrett',season:2026,week:3,names:['MISBA','GARRETT'],stake:32,chip:2};
 const COPY=[
  'MISBA and GARRETT agreed to a side bet for their matchup this week. The loser has to take $32 to the casino and bet $2 straight up on each of their player’s rounded fantasy score from this week—including their bench players (not including the IR). If multiple players have the same rounded score, that number gets a $2 bet for each player. For zero or negative scores, the bets go on 0 and/or 00. Any player who scores more than 36 points is a wild card chip—the loser can put that player’s $2 bet on any number.',
  'If they actually hit, the matchup winner keeps the profit, and the loser then bets the original $32 again on the same numbers. lol They keep going until they lose. Matchup winner takes any and all profits.'
 ];
 const INVITE='Agreed on a side bet? Share it in the group chat or text the commissioner to have it posted here. The commissioner is always open to side bets on his own matchups—text him to discuss.';
 const opened=new Set(),picked=new Map(),views=new Map();
 const red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
 const money=n=>'$'+n;
 const fmt=n=>Number.isFinite(n)?pcFpts(n):'—';
 const nameOf=(t,d)=>t?String(hjMatchManager(t,d)||hjOwnerName(t,d)||'').toUpperCase():'';
 const seasonOK=d=>Number(d?.seasonId||HJ_LEAGUE_SEASON)===BET.season;
 function matches(game,data){
  if(!seasonOK(data)||Number(game?.matchupPeriodId)!==BET.week)return false;
  const names=['home','away'].map(k=>nameOf((data?.teams||[]).find(t=>String(t.id)===String(game?.[k]?.teamId)),data));
  return BET.names.every(n=>names.includes(n));
 }
 // A score must exist before it can become a roulette number. Raw scores above 36 are wild cards.
 function chipFor(score){
  if(!Number.isFinite(score))return {kind:'pending',number:null};
  if(score>36)return {kind:'wild',number:null};
  const rounded=Math.max(0,Math.round(score));
  return rounded===0?{kind:'zero',number:null}:{kind:'number',number:rounded};
 }
 function player(entry,data,final){
  const p=hjPlayer(entry),stat=hjWeeklyStat(entry,BET.week,0,BET.season);
  const current=hjCurrentWeek(data)===BET.week;
  let score=stat?hjNumber(stat.appliedTotal):null;
  if(current&&!final){
   score=hjPlayerActualScore(entry,BET.week,data);
   // ESPN sometimes supplies zero before kickoff. Do not turn that placeholder into a bet.
   if(score===0&&hjPlayerGameState(hjPlayerTeam(entry))==='pre')score=null;
  }
  return {id:String(p.id||entry.playerId||''),name:p.fullName||p.displayName||p.name||'Player',
   position:hjPlayerPosition(entry),team:hjPlayerTeam(entry),photo:hjPlayerPhoto(entry),
   bench:Number(entry.lineupSlotId)===20,score,...chipFor(score)};
 }
 function roster(entries,data,final){
  const seen=new Set();
  return (entries||[]).filter(e=>Number(e.lineupSlotId)!==21).filter(e=>{
   const id=String(hjPlayer(e).id||e.playerId||'');if(!id||seen.has(id))return false;seen.add(id);return true;
  }).map(e=>player(e,data,final));
 }
 function snapshot(data,game,source=data){
  if(!data||!source||!matches(game,source))return null;
  const final=hjGameFinal(game,source),past=hjCurrentWeek(data)>BET.week;
  const sides=['home','away'].map(k=>{
   const team=(source.teams||[]).find(t=>String(t.id)===String(game[k].teamId));
   let entries=hjHistoricalEntries(game,k,BET.week);
   if(!past&&!final)entries=hjRosterEntries(team);
   return {name:nameOf(team,source),id:String(team.id),score:hjSideScore(game[k],BET.week),players:roster(entries,data,final)};
  });
  const tie=final&&(game.winner==='TIE'||sides[0].score===sides[1].score);
  const winner=final&&!tie?sides[sides[0].score>sides[1].score?0:1]:null;
  const loser=winner?sides.find(s=>s!==winner):null;
  return {sides,final,tie,winner,loser,key:BET.week+':'+sides[0].id+':'+sides[1].id};
 }
 function currentSnapshot(data){
  if(!data||!seasonOK(data))return null;
  const history=HJ_DATA.history.get(BET.week);
  const source=history&&hjCurrentWeek(data)>BET.week?history:data;
  const game=(source.schedule||[]).find(g=>matches(g,source));
  const view=snapshot(data,game,source);
  // Never substitute today's roster for a completed week's roster.
  if(view&&hjCurrentWeek(data)>BET.week&&!history)view.sides.forEach(s=>s.players=[]);
  return view;
 }
 function recapSnapshot(chosen,model){
  if(Number(chosen?.week)!==BET.week||!seasonOK(model?.data))return null;
  const rows=BET.names.map(n=>(chosen.scores||[]).find(r=>r.short===n));
  if(rows.some(r=>!r)||rows[0].opp!==rows[1].short)return null;
  const data=HJ_DATA.history.get(BET.week)||HJ_LEAGUE_STATE.data;
  const sides=rows.map(r=>({name:r.short,id:String(r.teamId),score:r.pts,players:roster(r.entries,data,true)}));
  const tie=sides[0].score===sides[1].score,winner=tie?null:sides[sides[0].score>sides[1].score?0:1];
  return {sides,final:true,tie,winner,loser:winner?sides.find(s=>s!==winner):null,key:BET.week+':'+sides[0].id+':'+sides[1].id};
 }
 function manager(name){
  return '<button type="button" class="sb-manager manager-profile-trigger" data-manager="'+esc(name)+'" aria-label="Open '+esc(name)+' profile">'+av(name)+'<b>'+esc(name)+'</b></button>';
 }
 function faces(){return '<div class="sb-faces">'+manager('MISBA')+'<span class="sb-vs">vs</span>'+manager('GARRETT')+'</div>';}
 function rules(){
  return '<div class="sb-rules">'+COPY.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div><p class="sb-invite">'+esc(INVITE)+'</p>';
 }
 function result(view){
  if(!view?.final)return '';
  if(view.tie)return '<p class="sb-result">The matchup finished tied, '+fmt(view.sides[0].score)+'–'+fmt(view.sides[1].score)+'.</p>';
  return '<p class="sb-result"><b>'+esc(view.winner.name)+'</b> won '+fmt(view.winner.score)+'–'+fmt(view.loser.score)+'. <b>'+esc(view.loser.name)+'</b> takes the $32 to the casino; '+esc(view.winner.name)+' keeps any profit.</p>';
 }
 function rouletteHTML(list){
  const fixed=new Map(),zeros=list.filter(p=>p.kind==='zero'),wild=list.filter(p=>p.kind==='wild');
  list.filter(p=>p.kind==='number').forEach(p=>{if(!fixed.has(p.number))fixed.set(p.number,[]);fixed.get(p.number).push(p)});
  const pocket=(number,people,cls,style='')=>{
   const count=people.length,label=String(number)+': '+(count?money(count*BET.chip)+' bet':'no bet');
   return '<div class="sb-pocket '+cls+(count?' has-bet':'')+'"'+(style?' style="'+style+'"':'')+' role="img" aria-label="'+esc(label)+'" title="'+esc(count?people.map(p=>p.name).join(', '):label)+'"><span class="sb-pocket-number">'+number+'</span>'+
    (count?'<span class="sb-table-chip'+(count>1?' is-stack':'')+'"><b>'+money(count*BET.chip)+'</b></span>':'')+'</div>';
  };
  // Two zero-score chips cover both green pockets; any extras remain a choice.
  const green= '<div class="sb-zero-pockets">'+pocket('0',zeros.length>=2?[zeros[0]]:[],'is-green')+pocket('00',zeros.length>=2?[zeros[1]]:[],'is-green')+'</div>';
  const numbers=Array.from({length:36},(_,i)=>{
   const n=i+1;
   return pocket(n,fixed.get(n)||[],red.has(n)?'is-red':'is-black','--sb-col:'+Math.ceil(n/3)+';--sb-row:'+(3-i%3));
  }).join('');
  const optionalZeros=zeros.length===1?zeros:zeros.slice(2);
  const tray=(people,label)=>people.length?'<div class="sb-chip-tray"><span class="sb-table-chip"><b>'+money(people.length*BET.chip)+'</b></span><span>'+label+'</span></div>':'';
  return '<div class="sb-roulette" aria-label="American roulette betting board">'+green+'<div class="sb-number-pockets">'+numbers+'</div></div>'+
   tray(optionalZeros,'Choose 0 or 00'+(optionalZeros.length>1?' for each $2 chip.':'.'))+
   tray(wild,'Wild card'+(wild.length>1?'s':'')+' · '+(wild.length>1?'Choose any number for each $2 chip.':'Choose any number.'));
 }
 function boardHTML(view,surface){
  const options=view.loser?[view.loser]:view.sides;
  const selected=options.find(s=>s.name===picked.get(surface))||options[0];
  if(!selected)return '';
  const list=selected.players,pending=list.filter(p=>p.kind==='pending').length;
  const tabs=options.length>1?'<div class="sb-tabs" role="group" aria-label="Choose roster">'+options.map(s=>
   '<button type="button" data-sb-pick="'+esc(s.name)+'" aria-pressed="'+(s===selected)+'">'+esc(s.name)+'</button>').join('')+'</div>':'';
  return '<div class="sb-board-head"><h4>'+esc(selected.name)+'’s '+(view.final?'roulette bets':'live bets')+'</h4>'+tabs+'</div>'+
   '<p class="sb-board-meta">$2 per player · Matching numbers stack'+(pending?' · '+pending+' score'+(pending===1?'':'s')+' pending':'')+'</p>'+rouletteHTML(list);
 }
 function detail(view,surface){
  views.set(surface,view);
  return '<details class="sb-detail" data-sb-detail="'+surface+'"'+(opened.has(surface)?' open':'')+'><summary>'+
   '<span class="sb-mini-chip" aria-hidden="true">$</span><b>Side Bet <span>· $32</span></b><span class="sb-detail-label">Rules &amp; bets</span><span class="sb-chevron" aria-hidden="true">⌄</span></summary>'+
   '<div class="sb-detail-body">'+faces()+(surface==='recap'?'':result(view))+rules()+'<div class="sb-board" data-sb-board="'+surface+'">'+boardHTML(view,surface)+'</div></div></details>';
 }
 function wireHTML(view){
  const key=esc(view.key);
  const body='<div class="sb-wire-intro">'+faces()+'<div class="sb-stake"><span class="sb-big-chip">$32</span><span><b>Side Bet</b><small>Week 3 · MISBA vs GARRETT</small></span></div>'+
   (view.final?result(view):'<p class="sb-wire-copy">MISBA and GARRETT agreed to a side bet for their matchup this week. The loser bets $32 on roulette using their players’ rounded fantasy scores. The matchup winner keeps any profit.</p>')+
   '<div class="sb-wire-expanded">'+rules()+'</div><button type="button" class="sb-open" data-wire-matchup="'+key+'">View '+(view.final?'the bets':'matchup &amp; bets')+' <span aria-hidden="true">→</span></button></div>';
  return wireCard({kicker:'Side Bet',tag:'Week 3 · $32',cls:'is-lead sb-wire',body}).replace('data-wire-card','data-wire-key="'+BET.id+'" data-wire-card');
 }
 const baseMatchup=hjMatchupCardHTML;
 hjMatchupCardHTML=function(game,source,data,placeholder){
  const html=baseMatchup.apply(this,arguments);
  if(placeholder||!matches(game,source))return html;
  const view=snapshot(data,game,source);if(!view)return html;
  return html.replace('<div class="hq-edge-grid">',detail(view,'matchup')+'<div class="hq-edge-grid">');
 };
 const baseBuild=wireBuild;
 WIRE_SECTION_LABELS.sidebet='Side Bet';
 if(!HJ_WIRE_ORDER.includes('sidebet'))HJ_WIRE_ORDER.unshift('sidebet');
 wireBuild=function(data){
  const built=baseBuild.apply(this,arguments);
  if(hjCurrentWeek(data)<BET.week||hjCurrentWeek(data)>BET.week+1)return built;
  const view=currentSnapshot(data);
  if(view)built.cards.unshift({section:'sidebet',html:wireHTML(view)});
  return built;
 };
 const baseStories=hjRcStories;
 hjRcStories=function(chosen,weeks,model){
  const html=baseStories.apply(this,arguments),view=recapSnapshot(chosen,model);
  return html+(view?'<section class="rc-block sb-recap"><h3 class="rc-h">Side Bet <small>Week 3 · MISBA vs GARRETT</small></h3>'+result(view)+detail(view,'recap')+'</section>':'');
 };
 document.addEventListener('toggle',event=>{
  const el=event.target;if(!el.matches?.('[data-sb-detail]')||!el.isConnected)return;
  if(el.open)opened.add(el.dataset.sbDetail);else opened.delete(el.dataset.sbDetail);
 },true);
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-sb-pick]');if(!button)return;
  const board=button.closest('[data-sb-board]'),surface=board?.dataset.sbBoard,view=views.get(surface);if(!view)return;
  event.preventDefault();picked.set(surface,button.dataset.sbPick);board.innerHTML=boardHTML(view,surface);
  board.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
 });
 window.HJSB={bet:BET,chipFor};
 try{wireRender(true);if(HJ_HQ_STATE.activeTab==='matchups')hjRenderMatchupCenter();if(HJ_HQ_STATE.activeTab==='recap')hjRefreshRecap()}catch(error){console.warn('Side bet display deferred',error)}
})();
