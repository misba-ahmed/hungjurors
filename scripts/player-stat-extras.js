
  // Ownership is current ESPN data, independent of the selected scoring period.
  let hj40OwnershipPool=null,hj40OwnershipById=new Map();
  function hj40OwnershipValue(player,field){
    const pool=HJ_DATA.requests.get('players:'+NFL_SEASON+':'+hjCurrentWeek())?.value||null;
    if(pool!==hj40OwnershipPool){
      hj40OwnershipPool=pool;
      hj40OwnershipById=new Map((pool||[]).map(entry=>[String(hjPlayer(entry).id),entry]));
    }
    const id=String(player.id),candidates=[hj40OwnershipById.get(id),HJ_PLAYER_DIRECTORY.espnCache.get(id),player._leagueEntry,HJ_ESPN_HQ_POOL.byId.get(id),player];
    for(const entry of candidates){
      const p=hjPlayer(entry);
      for(const ownership of [entry?.ownership,p?.ownership,entry?.playerPoolEntry?.ownership]){
        const value=ownership?.[field];
        if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))return Number(value);
      }
    }
    return field==='percentOwned'&&player.pct!==null&&player.pct!==undefined&&player.pct!==''?hj40Finite(player.pct):null;
  }
  function hj40OpponentRank(player){
    const upcoming=hjUpcomingForWeek(player.team,hjCurrentWeek());
    if(!upcoming)return null;
    const rank=hj40Finite(HJ_GAME_RANKS.maps.get(hj40Pos(player.position))?.get(pcTeam(upcoming.abbr))?.rank);
    return rank!==null&&rank>=1&&rank<=32?rank:null;
  }
  function hj40ExtraValue(player,key){
    if(key==='oppRank')return hj40OpponentRank(player);
    return hj40OwnershipValue(player,{rostPct:'percentOwned',startPct:'percentStarted',trend:'percentChange'}[key]);
  }
  function hj40CompareStat(a,b,key){
    const av=hj40Snapshot(a)?.[key]?.value,bv=hj40Snapshot(b)?.[key]?.value;
    if(!Number.isFinite(av))return Number.isFinite(bv)?1:a.name.localeCompare(b.name);
    if(!Number.isFinite(bv))return -1;
    return (HJ40.statSortDir==='asc'?av-bv:bv-av)||a.name.localeCompare(b.name);
  }
  function hj40SelectStat(key){
    const reversible=key==='trend'||key==='oppRank';
    HJ40.statSortDir=reversible&&HJ40.statSort===key&&HJ40.statSortDir!=='asc'?'asc':'desc';
    HJ40.statSort=key;
  }
  function hj40StatValueHTML(player,key,metric){
    if(key==='trend'&&Number.isFinite(metric?.value)){
      const value=Number(metric.value.toFixed(1)),tone=value>0?'up':value<0?'down':'flat';
      const arrow=value===0?'':'<svg class="hq40-trend-arrow" viewBox="0 0 12 13" aria-hidden="true"><path d="M6 0 12 7H8V13H4V7H0Z"/></svg>';
      return '<strong class="hq40-trend is-'+tone+'" aria-label="'+(tone==='flat'?'No change':(tone==='up'?'Up ':'Down ')+Math.abs(value).toFixed(1)+' percentage points over the last week')+'"><span>'+(value>0?'+':'')+value.toFixed(1)+'</span>'+arrow+'</strong>';
    }
    if(key==='oppRank')return hjOpponentRankHTML(metric?.value,hj40Pos(player.position),Number(NFL_SEASON)).replace('>#','>');
    return '<strong>'+esc(metric?.display||'—')+'</strong>';
  }
  function hj40StatTitle(key,label){
    const next=HJ40.statSort===key&&HJ40.statSortDir!=='asc'&&(key==='trend'||key==='oppRank')?'lowest to highest':'highest to lowest';
    const context=key==='trend'?'ESPN roster percentage change over the last week. ':key==='oppRank'?'Current week opponent rank vs this position; 1 allows fewest fantasy points. ':key==='startPct'?'Currently started in ESPN leagues. ':key==='rostPct'?'Currently rostered in ESPN leagues. ':'';
    return context+'Sort by '+label+': '+next;
  }
  function hj40RefreshExtraMetrics(){
    if(HJ_HQ_STATE.activeTab!=='free-agents')return;
    HJ40.snapshotCache.clear();
    if(['rostPct','startPct','trend','oppRank'].includes(HJ40.statSort)){
      hjRenderPlayerDirectory(false);return;
    }
    const rows=new Map(HJ_PLAYER_DIRECTORY.rows.map(player=>[String(player.id),player]));
    document.querySelectorAll('#hq-fa-results [data-hq-directory-id]').forEach(card=>{
      const player=rows.get(card.dataset.hqDirectoryId);if(!player)return;
      ['rostPct','startPct','trend','oppRank'].forEach(key=>{
        const button=card.querySelector('[data-hq40-sort-stat="'+key+'"]');if(!button)return;
        const value=hj40ExtraValue(player,key),metric={value,display:hj40FmtMetric(key,value)};
        const markup='<small>'+esc(HJ40_LABELS.get(key))+'</small>'+hj40StatValueHTML(player,key,metric);
        if(button.innerHTML!==markup)button.innerHTML=markup;
      });
    });
  }
  let hj40OwnershipRefreshAt=0,hj40OwnershipRefreshPending=false,hj40OwnershipSignature='';
  async function hj40RefreshOwnership(){
    if(HJ_HQ_STATE.activeTab!=='free-agents'||document.hidden||hj40OwnershipRefreshPending||Date.now()-hj40OwnershipRefreshAt<60000)return;
    hj40OwnershipRefreshPending=true;hj40OwnershipRefreshAt=Date.now();
    try{
      const pool=await hjDataPool(Number(NFL_SEASON),hjCurrentWeek());
      const signature=JSON.stringify(pool.map(entry=>{const p=hjPlayer(entry),o=p.ownership||entry.ownership||entry.playerPoolEntry?.ownership||{};return [p.id,o.percentOwned,o.percentStarted,o.percentChange]}));
      if(signature!==hj40OwnershipSignature){hj40OwnershipSignature=signature;hj40RefreshExtraMetrics()}
    }catch(error){console.warn('Player ownership refresh unavailable',error)}
    finally{hj40OwnershipRefreshPending=false}
  }
  document.addEventListener('hj:game-ranks-updated',hj40RefreshExtraMetrics);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)hj40RefreshOwnership()});
  setInterval(hj40RefreshOwnership,60000);

  let hj40TopBubble=null,hj40TopFrame=0;
  function hj40UpdateTopBubble(){
    hj40TopFrame=0;
    const panel=document.getElementById('hq-panel-free-agents'),list=document.getElementById('hq-fa-results'),anchor=document.querySelector('.espn-float');
    const bounds=panel?.getBoundingClientRect(),visible=HJ_HQ_STATE.activeTab==='free-agents'&&panel&&!panel.hidden&&panel.getClientRects().length&&list&&anchor&&bounds.top<innerHeight&&bounds.bottom>80;
    if(!visible){if(hj40TopBubble)hj40TopBubble.hidden=true;return}
    if(!hj40TopBubble){
      hj40TopBubble=document.createElement('button');hj40TopBubble.id='hq-players-back-top';hj40TopBubble.type='button';
      hj40TopBubble.title='Back to top of Players';hj40TopBubble.setAttribute('aria-label','Back to top of player list');
      hj40TopBubble.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14M12 20V8m-6 6 6-6 6 6"/></svg>';
      hj40TopBubble.addEventListener('click',()=>{
        const target=document.getElementById('hq-fa-results'),controls=document.querySelector('#hq-panel-free-agents .hq40-controls');
        if(!target)return;
        const style=controls?getComputedStyle(controls):null;
        const offset=controls?(parseFloat(style.top)||0)+controls.getBoundingClientRect().height+10:(document.querySelector('body > nav')?.getBoundingClientRect().height||0)+10;
        window.scrollTo({top:Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      });
      document.body.append(hj40TopBubble);
    }
    const icon=anchor.getBoundingClientRect();
    hj40TopBubble.style.left=(icon.left+(icon.width-40)/2)+'px';
    hj40TopBubble.style.top=(icon.top-50)+'px';
    hj40TopBubble.hidden=false;
  }
  function hj40QueueTopBubble(){if(!hj40TopFrame)hj40TopFrame=requestAnimationFrame(hj40UpdateTopBubble)}
  window.addEventListener('scroll',hj40QueueTopBubble,{passive:true});
  window.addEventListener('resize',hj40QueueTopBubble,{passive:true});
  window.visualViewport?.addEventListener('resize',hj40QueueTopBubble,{passive:true});
  window.visualViewport?.addEventListener('scroll',hj40QueueTopBubble,{passive:true});
