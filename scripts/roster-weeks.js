/* Week selection is local to each roster surface; never change the live league clock. */
(function(){
 const selected=new Map(),jobs=new Map(),pools=new Map(),errors=new Map();
 const labels={actual:'ACTUAL',espn:'ESPN',vegas:'VEGAS',combo:'E/V COMBO'};
 const scope=(team,profile)=>profile?'manager:'+team.id:'hq';
 const weekFor=(key,data)=>selected.get(key)||hjCurrentWeek(data);
 function toolbar(team,week,profile){
  const key=scope(team,profile),mode=HJ_HQ_STATE.lineupModes.get(hjRosterModeKey(team.id,week))||'actual';
  return `<div class="hj-roster-week-tools" data-roster-week-scope="${esc(key)}"><div class="hj-roster-week-nav" aria-label="Roster week"><button type="button" data-roster-week="${week-1}" ${week<=1?'disabled':''} aria-label="Previous roster week">‹</button><b aria-live="polite">WEEK ${week}</b><button type="button" data-roster-week="${week+1}" ${week>=18?'disabled':''} aria-label="Next roster week">›</button></div><div class="league-roster-modes">${Object.entries(labels).map(([id,label])=>`<button type="button" class="league-roster-mode${mode===id?' active':''}" data-roster-view-mode="${id}" data-roster-team="${team.id}" data-roster-view-week="${week}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div></div>`;
 }
 function repaint(){hjRenderLeague();}
 function ensure(week,data){
  const current=hjCurrentWeek(data),season=Number(data.seasonId||HJ_LEAGUE_SEASON),key=season+':'+week;
  if(week===current||jobs.has(key)||(week<current?HJ_DATA.history.has(week):pools.has(key))||errors.has(key))return;
  const job=(week<current?hjDataJson(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?scoringPeriodId=${week}&view=mMatchup&view=mMatchupScore&view=mRoster&view=mSettings&view=mTeam`).then(payload=>{if(Number(payload.scoringPeriodId)!==week||!Array.isArray(payload.schedule))throw Error('Incorrect roster week');HJ_DATA.history.set(week,payload)}):hjDataPool(season,week).then(rows=>pools.set(key,new Map(rows.map(e=>[String(hjPlayer(e).id),hjPlayer(e)])))));
  jobs.set(key,job);job.catch(()=>errors.set(key,true)).finally(()=>{jobs.delete(key);repaint()});
 }
 function entriesFor(team,week,data){
  const current=hjCurrentWeek(data),season=Number(data.seasonId||HJ_LEAGUE_SEASON);
  if(week<current){const source=HJ_DATA.history.get(week);if(!source)return null;const game=(source.schedule||[]).find(g=>Number(g.matchupPeriodId)===week&&[g.home?.teamId,g.away?.teamId].some(id=>String(id)===String(team.id)));if(!game)return [];return hjHistoricalEntries(game,String(game.home?.teamId)===String(team.id)?'home':'away',week)}
  const entries=hjRosterEntries(team);if(week===current)return entries;
  const pool=pools.get(season+':'+week);if(!pool)return null;
  return entries.map(e=>{const p=hjPlayer(e),fresh=pool.get(String(p.id));if(!fresh)return e;const player={...p,stats:fresh.stats};return e.playerPoolEntry?{...e,playerPoolEntry:{...e.playerPoolEntry,player}}:{...e,player}});
 }
 function rows(team,week,data){
  ensure(week,data);const entries=entriesFor(team,week,data),season=Number(data.seasonId||HJ_LEAGUE_SEASON),key=season+':'+week;
  if(entries===null)return `<div class="hq-empty" role="status">${errors.has(key)?'Unable to load this week. <button type="button" data-roster-week-retry="'+week+'">Retry</button>':'Loading Week '+week+'…'}</div>`;
  if(!entries.length)return '<div class="hq-empty">No saved lineup for this week.</div>';
  const mode=HJ_HQ_STATE.lineupModes.get(hjRosterModeKey(team.id,week))||'actual',plan=hjLineupPlan(data),selection=hjSelectionForMode(entries,plan,week,mode),bench=hjRemainingBench(entries,selection),ir=entries.filter(e=>Number(e.lineupSlotId)===21);
  let starters=hjRosterSelectedGroupHTML('Starting lineup',selection,plan,week,season,mode);
  if(week!==hjCurrentWeek(data)){
   const values=selection.filter(Boolean).map(e=>hjNumber(hjWeeklyStat(e,week,0,season)?.appliedTotal)),totals=hjSelectionTotals(selection,week),total=week<hjCurrentWeek(data)?(values.length&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null):totals[mode==='actual'?'espn':mode];
   starters='<div class="league-roster-group"><div class="league-roster-group-head"><span>Starting lineup</span>'+(Number.isFinite(total)?'<b>'+pcFpts(total)+'</b>':'')+'</div><div class="league-player-list">'+selection.map((e,i)=>e?hjPlayerHTML({...e,lineupSlotId:Number(plan[i]?.slotId)},week,season):'').join('')+'</div></div>';
  }
  return '<div class="league-roster-groups">'+starters+hjRosterBenchGroupHTML(bench,week,season)+'</div>'+(ir.length?'<div class="league-ir-wrap">'+hjRosterGroupHTML('Injured reserve',ir,week,'',season)+'</div>':'');
 }
 const base=hjTeamViewHTML;
 hjTeamViewHTML=function(team,data){
  const week=weekFor('hq',data),html=base.apply(this,arguments),cut=html.indexOf('<div class="league-roster-optimizer">');
  if(cut<0)return html;
  let head=html.slice(0,cut);
  if(week!==hjCurrentWeek(data))head=head.replace(/<button class="league-matchup-score[\s\S]*?<\/button>/,'');
  return head+toolbar(team,week,false)+rows(team,week,data);
 };
 hjManagerRosterHTML=function(name){const data=HJ_LEAGUE_STATE.data,team=data?.teams?.find(t=>hjMatchManager(t,data)===name);if(!team)return '';const week=weekFor(scope(team,true),data);return '<div class="profile-section"><div class="profile-section-title">'+Number(data.seasonId||HJ_LEAGUE_SEASON)+' Roster</div><div class="manager-hq-roster">'+toolbar(team,week,true)+rows(team,week,data)+'</div></div>'};
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-roster-week],[data-roster-view-mode],[data-roster-week-retry]');if(!button)return;
  event.preventDefault();const data=HJ_LEAGUE_STATE.data;if(!data)return;
  if(button.hasAttribute('data-roster-week')){const key=button.closest('[data-roster-week-scope]').dataset.rosterWeekScope;selected.set(key,Math.max(1,Math.min(18,Number(button.dataset.rosterWeek))))}
  else if(button.hasAttribute('data-roster-view-mode'))HJ_HQ_STATE.lineupModes.set(hjRosterModeKey(button.dataset.rosterTeam,button.dataset.rosterViewWeek),button.dataset.rosterViewMode);
  else errors.delete(Number(data.seasonId||HJ_LEAGUE_SEASON)+':'+button.dataset.rosterWeekRetry);
  repaint();
 });
})();
