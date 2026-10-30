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
  if(!ids.length){const pos=String(player?.position||'').toUpperCase(),named=state.xfpNames?.get(`${pos}|${pcBaseName(player?.name||'')}`);if(named?.size===1)ids=[...named]}
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
 // States built before this script loaded.
 try{HJ40_API.state.data.forEach(state=>window.hjNflExtras.attach(state))}catch(_){}
})();
