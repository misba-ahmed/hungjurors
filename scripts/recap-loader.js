/* Game logs load independently of historical-lineup hydration and optional feeds. */
function hjRecapExtraKey(chosen){
 return JSON.stringify(chosen.scores.map(r=>[r.teamId,r.lineupComplete,(r.starters||[]).map(e=>String(hjWeeklyStat(e,chosen.week)?.externalId||''))]));
}
function hjRecapNeedsExtra(chosen){
 const old=HJ_RECAP_EXTRA.weeks.get(chosen.week);
 return !old||old.key!==hjRecapExtraKey(chosen)||Date.now()>=Number(old.retryAt||old.checked+300000||0);
}
async function hjRecapLoadExtra(chosen){
 const {week}=chosen;if(HJ_RECAP_EXTRA.jobs.has(week))return HJ_RECAP_EXTRA.jobs.get(week);
 if(!hjRecapNeedsExtra(chosen))return HJ_RECAP_EXTRA.weeks.get(week);
 const old=HJ_RECAP_EXTRA.weeks.get(week),extra={...(old||{}),games:new Map(old?.games||[]),key:hjRecapExtraKey(chosen),loading:true,retryAt:0};
 clearTimeout(old?.retryTimer);HJ_RECAP_EXTRA.weeks.set(week,extra);
 const refresh=()=>{if(HJ_HQ_STATE.activeTab==='recap')hjRefreshRecap()};
 const job=Promise.resolve().then(async()=>{
  let failed=false;
  const run=async action=>{try{await action()}catch(error){failed=true;console.warn('Recap enrichment will retry',week,error)}};
  await Promise.all([
   run(async()=>{extra.pool=await hjDataPool(Number(NFL_SEASON),Math.max(week,hjCurrentWeek()));refresh()}),
   run(async()=>{const p=await hjDataRequest(`recap-transactions:${NFL_SEASON}:${week}`,()=>hjDataJson(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${NFL_SEASON}/segments/0/leagues/${ESPN_FANTASY_LEAGUE_ID}?view=mTransactions2&scoringPeriodId=${week}`),300000);if(Array.isArray(p.transactions))extra.transactions=p.transactions;refresh()}),
   run(async()=>{
    // The NFL schedule is available even when fantasy lineups are still arriving.
    extra.schedule=await hjDataSchedule(Number(NFL_SEASON),week);
    const ids=[...new Set([...(extra.schedule.events||[]).filter(e=>e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed).map(e=>String(e.id)),...chosen.scores.flatMap(r=>(r.starters||[]).map(e=>hjWeeklyStat(e,week)?.externalId)).filter(Boolean).map(String)])];
    if(!ids.length)throw Error('Completed game ids not available yet');
    let next=0;
    async function worker(){while(next<ids.length){const id=ids[next++];await run(async()=>{
     const game=await hjDataRequest(`recap-nfl:${NFL_SEASON}:${id}`,()=>hjDataJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${id}`),300000);
     if(!game.header?.competitions?.[0]?.status?.type?.completed||!(game.drives?.previous||[]).some(d=>d.plays?.length))throw Error('Completed play-by-play unavailable');
     extra.games.set(id,game);refresh();
    })}}
    await Promise.all([worker(),worker()]);
   })
  ]);
  extra.checked=Date.now();extra.loading=false;extra.retryAt=failed?Date.now()+15000:0;
  return extra;
 }).finally(()=>{
  HJ_RECAP_EXTRA.jobs.delete(week);refresh();
  if(extra.retryAt)extra.retryTimer=setTimeout(()=>{if(HJ_HQ_STATE.activeTab==='recap')hjRefreshRecap()},15500);
 });
 HJ_RECAP_EXTRA.jobs.set(week,job);return job;
}
