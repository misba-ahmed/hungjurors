/* Performance (Oct 28): identical results, less repeated work inside one render pass.
   Each cache lives only until the current task finishes, so live updates are never stale. */
(function(){
 function perPass(){const store=new Map();let clearing=false;return {store,touch(){if(!clearing){clearing=true;queueMicrotask(()=>{store.clear();clearing=false})}}}}
 // Every player row asked for the whole week's live-scoring map, which was rebuilt each time.
 if(typeof hjLiveScoringEntries==='function'&&!hjLiveScoringEntries.__hjPass){
  const base=hjLiveScoringEntries,pass=perPass();
  hjLiveScoringEntries=function(data=HJ_LEAGUE_STATE.data,week=hjCurrentWeek(data)){
   const key=String(week);let byWeek=pass.store.get(data);
   if(!byWeek){byWeek=new Map();pass.store.set(data,byWeek);pass.touch()}
   if(!byWeek.has(key))byWeek.set(key,base.call(this,data,week));
   return byWeek.get(key);
  };
  hjLiveScoringEntries.__hjPass=true;
 }
 // Game-context stat lines scanned the whole season's rows for every player on the page.
 if(typeof hjCachedFantasyStats==='function'&&typeof HJ_GAME_RANKS!=='undefined'&&!hjCachedFantasyStats.__hjPass){
  const base=hjCachedFantasyStats,pass=perPass();
  hjCachedFantasyStats=function(player,week){
   const rows=HJ_GAME_RANKS.rows;if(!Array.isArray(rows)||!player)return base.apply(this,arguments);
   let groups=pass.store.get(rows);
   if(!groups){groups=new Map();for(const r of rows){const k=Number(r.week)+'|'+r.position;let list=groups.get(k);if(!list)groups.set(k,list=[]);list.push(r)}pass.store.set(rows,groups);pass.touch()}
   // Same rows, same order, only those that can match this week and position.
   HJ_GAME_RANKS.rows=groups.get(Number(week)+'|'+player.position)||[];
   try{return base.apply(this,arguments)}finally{HJ_GAME_RANKS.rows=rows}
  };
  hjCachedFantasyStats.__hjPass=true;
 }
})();
