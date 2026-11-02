/* Players tab data additions (Oct 29, 2026). See docs/players-tab.md.
 *
 * window.hjNflExtras.attach(state)  called by the Players directory each time it builds a season's state
 *   (a build swap in prepare-site.mjs). It loads data/nflverse-extras-<season>.json (written by
 *   scripts/refresh-nflverse-extras.mjs) and adds to the state:
 *     - state.xfp: expected fantasy points per player and week (ffopportunity), by nflverse player id;
 *     - QB hits on each defense's weekly record (ESPN's D/ST stats have none).
 *   When the file arrives after the state was built, the Players list is redrawn once.
 * window.hjXfpFor(state,player,rows,week,isAvg,games)  the XFP stat for a player and period, in league
 *   scoring (tight ends get the league's +0.5 per expected catch), using the same games as FPTS.
 * window.hjRzFor(...)   RZ OPP: carries + targets inside the opponent's 20, same period and games as FPTS.
 * window.hjSepFor(...)  SEP: Next Gen Stats average separation (yards); a week shows that week, totals and
 *   averages show the season to date. Players are found by the nflverse id on their stat rows.
 * (data/season-supplement-<season>.json, the snap rows and passing air yards a finished season's
 *  embedded data lacks, is merged by build swaps in pcLoadSeason / pcLoadSnaps; see prepare-site.mjs.)
 */
(function(){
 const cache=new Map();
 const load=season=>{
  season=Number(season);
  if(!cache.has(season)){
   const job=(typeof hjHostedJson==='function'?hjHostedJson(`nflverse-extras-${season}.json`):fetch(`data/nflverse-extras-${season}.json`).then(r=>r.ok?r.json():null))
    .then(data=>data?.schema===1&&Number(data.season)===season?data:null).catch(()=>null);
   cache.set(season,{job,data:undefined});job.then(data=>{cache.get(season).data=data});
  }
  return cache.get(season).job;
 };
 function apply(state,data){
  if(!state||!data||state.__hjExtras===data)return false;
  state.__hjExtras=data;
  const xfp=new Map();
  for(const r of data.expected?.rows||[]){if(r.id&&Number.isFinite(r.week)&&Number.isFinite(r.xfp))xfp.set(`${r.id}|${r.week}`,r)}
  state.xfp=xfp;state.xfpWeeks=new Map();state.xfpNames=new Map();
  const group=pos=>pos==='FB'?'RB':pos;
  for(const r of xfp.values()){
   if(!state.xfpWeeks.has(r.id))state.xfpWeeks.set(r.id,[]);state.xfpWeeks.get(r.id).push(r);
   const key=`${group(r.pos)}|${pcBaseName(r.name)}`;if(!state.xfpNames.has(key))state.xfpNames.set(key,new Set());state.xfpNames.get(key).add(r.id);
  }
  const group2=list=>{const m=new Map();for(const r of list||[]){if(!r?.id)continue;if(!m.has(r.id))m.set(r.id,[]);m.get(r.id).push(r)}return m};
  state.rzWeeks=group2(data.redzone?.rows);state.sepWeeks=group2(data.separation?.rows);
  const hits=new Map((data.defense?.rows||[]).map(r=>[`${pcTeam(r.team)}|${r.week}`,r.qbHit]));
  state.dstByTeam?.forEach((list,team)=>list.forEach(rec=>{const v=hits.get(`${team}|${rec.week}`);if(Number.isFinite(v)){rec.qbHit=v;rec.qbHitKnown=true}}));
  return true;
 }
 function redraw(){
  try{HJ40_API.state.snapshotCache.clear()}catch(_){}
  if(typeof hjRenderPlayerDirectory==='function'&&document.querySelector('#hq-fa-results .hq40-card'))hjRenderPlayerDirectory(false);
 }
 // A season's state can be built before the player pool has its D/ST entries (they arrive with the full
 // pool). The site then kept an empty D/ST list for a minute: every defense showed FPTS "—" and 0 sacks.
 // Fetch them again until they arrive (a few tries) and republish the state once.
 const dstTries=new Map();
 function ensureDst(season){
  const tries=dstTries.get(season)||0;if(tries>=6||typeof pcLoadDstSeason!=='function'||!HJ40_API?.publish)return;
  dstTries.set(season,tries+1);
  pcLoadDstSeason(season).then(entries=>{
   const current=HJ40_API.state.data.get(season);if(!current||current.dstEntries?.length)return;
   if(entries?.length){dstTries.delete(season);HJ40_API.publish(season,current.rows,current.snaps,entries)}
   else setTimeout(()=>ensureDst(season),5000);
  }).catch(()=>setTimeout(()=>ensureDst(season),5000));
 }
 window.hjNflExtras={
  load,
  attach(state){
   if(!state?.season)return;
   // state.dstEntries is set right after the state is built.
   setTimeout(()=>{const current=HJ40_API?.state?.data?.get(Number(state.season));if(current===state&&!state.dstEntries?.length)ensureDst(Number(state.season))},0);
   const entry=cache.get(Number(state.season));
   if(entry?.data!==undefined){apply(state,entry.data);return}
   load(state.season).then(data=>{if(apply(state,data))redraw()});
  }
 };
 window.hjXfpFor=function(state,player,rows,week,isAvg,games){
  const weeks=state?.xfpWeeks;if(!weeks)return null;
  // nflverse ids from the stat rows; rows merged with ESPN's official stats can carry ESPN's id instead,
  // so the player's name and position are the fallback (only when that name is unique at the position).
  let ids=[...new Set((rows||[]).map(r=>r.hj_gsis||r.player_id).filter(id=>weeks.has(id)))];
  if(!ids.length&&typeof hjGsisForPlayer==='function'){const g=hjGsisForPlayer(player);if(g&&weeks.has(g))ids=[g]}
  // A name only for a player the id table does not know, and only when the name is unique at the position.
  if(!ids.length&&!(typeof hjGsisForPlayer==='function'&&hjGsisForPlayer(player))){const pos=String(player?.position||'').toUpperCase(),named=state.xfpNames?.get(`${pos}|${pcBaseName(player?.name||'')}`);if(named?.size===1)ids=[...named]}
  let list=ids.flatMap(id=>weeks.get(id)||[]);
  if(week)list=list.filter(r=>r.week===Number(week));
  if(!list.length)return null;
  const te=String(player?.position||'').toUpperCase()==='TE';
  const total=list.reduce((sum,r)=>sum+r.xfp+(te?0.5*(r.rx||0):0),0);
  return isAvg&&games?total/games:total;
 };
 const idsOf=(state,player,rows)=>{const ids=[...new Set((rows||[]).map(r=>r.hj_gsis||r.player_id).filter(id=>/^00-\d/.test(String(id))))];if(!ids.length&&typeof hjGsisForPlayer==='function'){const g=hjGsisForPlayer(player);if(g)ids.push(g)}return ids};
 window.hjRzFor=function(state,player,rows,week,isAvg,games){
  const by=state?.rzWeeks;if(!by)return null;
  let list=idsOf(state,player,rows).flatMap(id=>by.get(id)||[]);
  if(week)list=list.filter(r=>r.week===Number(week));
  const total=list.reduce((sum,r)=>sum+r.rush+r.tgt,0);
  // A player with games but no red-zone plays has 0, not "no data".
  if(!list.length&&!(games>0))return null;
  return isAvg&&games?total/games:total;
 };
 window.hjSepFor=function(state,player,rows,week){
  const by=state?.sepWeeks;if(!by)return null;
  const list=idsOf(state,player,rows).flatMap(id=>by.get(id)||[]);
  const row=list.find(r=>r.week===(week?Number(week):0));
  return row?row.sep:null;
 };
 // Game log (player profile): the same XFP, RZ OPP, SEP and QB hits as the stat bar, for one game row, found
 // by the row's nflverse id. undefined = the file is still loading (the profile redraws on 'hj:nflverse-extras');
 // null = no value (the week is not in nflverse's data yet, or the player has no row that week).
 const rowIndex=new Map();
 function indexFor(season){
  season=Number(season);const entry=cache.get(season);
  if(!entry){load(season).then(data=>{if(data)document.dispatchEvent(new CustomEvent('hj:nflverse-extras',{detail:{season}}))});return undefined}
  if(entry.data===undefined)return undefined;
  if(!rowIndex.has(season)){
   const data=entry.data||{},by=(rows,key)=>{const m=new Map();let max=0;for(const r of rows||[]){if(!r?.id)continue;m.set(`${r.id}|${Number(r.week)}`,r);max=Math.max(max,Number(r.week)||0)}return {m,max:key?Math.max(max,Number(data[key]?.throughWeek)||0):max}};
   const defense=new Map();for(const r of data.defense?.rows||[])defense.set(`${pcTeam(r.team)}|${Number(r.week)}`,r.qbHit);
   // Same fallback as the stat bar: a player the id table does not know is found by name, only when the name is
   // unique at the position in nflverse's list.
   const names=new Map();for(const r of data.expected?.rows||[]){if(!r?.id||!r.name)continue;const k=`${r.pos==='FB'?'RB':r.pos}|${pcBaseName(r.name)}`;if(!names.has(k))names.set(k,new Set());names.get(k).add(r.id)}
   rowIndex.set(season,{xfp:by(data.expected?.rows),rz:by(data.redzone?.rows),sep:by(data.separation?.rows),defense,names});
  }
  return rowIndex.get(season);
 }
 document.addEventListener('hj:nflverse-extras',event=>rowIndex.delete(Number(event.detail?.season)));
 window.hjExtrasRow=function(kind,row){
  let gsis=typeof pcRowGsis==='function'?pcRowGsis(row):String(row?.hj_gsis||row?.player_id||'');const week=Number(row?.week);
  const index=indexFor(row?.season);if(index===undefined)return undefined;if(!index||!week)return null;
  if(!/^00-\d/.test(gsis)){const named=index.names.get(`${String(row?.position||'').toUpperCase()}|${pcBaseName(row?.player_display_name||'')}`);gsis=named?.size===1?[...named][0]:''}
  if(!gsis)return null;
  const set=index[kind];if(!set||week>set.max)return null;
  const hit=set.m.get(`${gsis}|${week}`);
  if(kind==='xfp')return hit?hit.xfp+(String(row.position).toUpperCase()==='TE'?0.5*(hit.rx||0):0):null;
  if(kind==='rz')return hit?hit.rush+hit.tgt:0;
  if(kind==='sep')return hit?hit.sep:null;
  return null;
 };
 window.hjExtrasQbHit=function(season,team,week){const index=indexFor(season);if(!index)return index;const v=index.defense.get(`${pcTeam(team)}|${Number(week)}`);return Number.isFinite(v)?v:null};
 // D/ST game log: the D/ST stat bar's stats, defined the same way (ESPN stat ids): SACK 99, QB HIT (nflverse),
 // TKL 109 (or 107 + 108), INT 95, FF 106, FR 96, DEF TD 103 + 104, KR TD 101, ST TD 93 + 101 + 102, PA 120, YA 127.
 if(typeof pcDstTable==='function')pcDstTable=function(rows){
  const h=(label,group)=>pcStatHeader(label,group,'D/ST'),n=(s,...ids)=>ids.reduce((t,id)=>t+pcNumber(s[id]),0);
  const cols=[['SACK','Defense',s=>n(s,'99')],['QB HIT','Defense',(s,row)=>{const v=window.hjExtrasQbHit?.(row.season,row.team,row.week);return v===undefined?'…':Number.isFinite(v)?v:'—'}],['TKL','Defense',s=>pcNumber(s['109'])||n(s,'107','108')],['INT','Defense',s=>n(s,'95')],['FF','Defense',s=>n(s,'106')],['FR','Defense',s=>n(s,'96')],['DEF TD','Defense',s=>n(s,'103','104')],['KR TD','Special teams',s=>n(s,'101')],['ST TD','Special teams',s=>n(s,'93','101','102')],['PA','Allowed',s=>s['120']??'—'],['YA','Allowed',s=>s['127']??'—']];
  const groups=[...new Set(cols.map(c=>c[1]))].map(g=>[g,cols.filter(c=>c[1]===g).length]),starts=new Set(groups.map(([g])=>cols.findIndex(c=>c[1]===g)));
  const body=rows.map(row=>{const s=row.stats||{},status=row.status||'',opponent=status==='BYE'?'BYE':hjOpponentHTML(row.opponent||'—',row.opponentRank,'D/ST',row.season||Number(NFL_SEASON),row.venue||'');
   return `<tr class="${status==='BYE'?'pc-bye-row':status?'pc-missed-row':''}"><td>${esc(row.week)}</td><td class="pc-opponent-cell">${opponent}</td><td class="pc-points-cell pc-group-start">${status==='BYE'?'—':status?(status==='UPCOMING'?'':esc(status)):pcFpts(row.points)}</td><td class="pc-rank-cell">${row.rank?`#${row.rank}`:'—'}</td>${cols.map((c,i)=>`<td${starts.has(i)?' class="pc-group-start"':''}>${status?'—':esc(c[2](s,row))}</td>`).join('')}</tr>`}).join('');
  return `<div class="pc-table-wrap"><table class="pc-table pc-dst-table is-full"><colgroup>${'<col>'.repeat(4+cols.length)}</colgroup><thead><tr class="pc-group-head"><th class="pc-id-head" rowspan="2">${h('WK','Identity')}</th><th class="pc-id-head" rowspan="2">${h('OPP','Identity')}</th><th class="pc-category-head" colspan="2">Fantasy</th>${groups.map(([g,c])=>`<th class="pc-category-head" colspan="${c}">${esc(g)}</th>`).join('')}</tr><tr class="pc-column-head"><th class="pc-group-start">${h('FPTS','Fantasy')}</th><th>${h('RANK','Fantasy')}</th>${cols.map((c,i)=>`<th${starts.has(i)?' class="pc-group-start"':''}>${h(c[0],c[1])}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div><div class="pc-scroll-hint">Scroll sideways for the full stat line.</div>`;
 };
 // States built before this script loaded.
 try{HJ40_API.state.data.forEach(state=>window.hjNflExtras.attach(state))}catch(_){}
})();
