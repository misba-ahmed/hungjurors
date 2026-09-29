
  const HJ40_SLEEPER={data:null,byId:new Map(),byName:new Map(),byTeam:new Map(),pending:null,lastAttempt:0};
  function hj40TrendCount(value){
    if(!Number.isFinite(value))return '—';
    const n=Math.abs(value),sign=value>0?'+':value<0?'-':'';
    // Round compact values without displaying 1000K at the million boundary.
    const unit=n>=999950?1e6:n>=999.5?1e3:1,suffix=unit===1e6?'M':unit===1e3?'K':'';
    return sign+(unit===1?String(Math.round(n)):(n/unit).toFixed(1).replace(/\.0$/,''))+suffix;
  }
  function hj40SleeperNameKey(position,name){return hj40Pos(position)+'|'+hjNorm(pcBaseName(name||''))}
  function hj40SleeperRow(player){
    if(!HJ40_SLEEPER.data||Date.now()-HJ40_SLEEPER.data.generatedAt>2*3600000)return null;
    if(hj40Pos(player.position)==='D/ST')return HJ40_SLEEPER.byTeam.get(pcTeam(player.team))||null;
    return HJ40_SLEEPER.byId.get(String(player.id))||HJ40_SLEEPER.byName.get(hj40SleeperNameKey(player.position,player.name))||null;
  }
  function hj40SetSleeperFeed(feed){
    if(feed?.schema!==1||feed.source!=='Sleeper'||feed.lookbackHours!==24||!Number.isFinite(feed.generatedAt)||feed.generatedAt>Date.now()+60000||Date.now()-feed.generatedAt>2*3600000||!Array.isArray(feed.players)||!feed.players.length)throw Error('Sleeper trend data is unavailable or stale');
    const byId=new Map(),byName=new Map(),byTeam=new Map();
    const put=(map,key,row)=>{if(!key)return;map.set(key,map.has(key)?null:row)};
    const seen=new Set();
    for(const row of feed.players){
      if(!row.id||seen.has(row.id)||!Number.isSafeInteger(row.adds)||row.adds<0||!Number.isSafeInteger(row.drops)||row.drops<0||row.net!==row.adds-row.drops)throw Error('Invalid Sleeper trend count');
      seen.add(row.id);
      if(row.espnId&&Number(row.espnId)>0)put(byId,String(row.espnId),row);
      put(byName,hj40SleeperNameKey(row.position,row.name),row);
      if(row.position==='D/ST')put(byTeam,pcTeam(row.team),row);
    }
    HJ40_SLEEPER.data=feed;HJ40_SLEEPER.byId=byId;HJ40_SLEEPER.byName=byName;HJ40_SLEEPER.byTeam=byTeam;
  }
  async function hj40RefreshSleeper(){
    if(HJ_HQ_STATE.activeTab!=='free-agents'||document.hidden||HJ40_SLEEPER.pending||Date.now()-HJ40_SLEEPER.lastAttempt<5*60000)return;
    HJ40_SLEEPER.lastAttempt=Date.now();
    HJ40_SLEEPER.pending=(async()=>{
      try{
        const response=await fetch('/data/sleeper-trends.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw Error('Sleeper trends HTTP '+response.status);
        const feed=await response.json(),changed=feed.generatedAt!==HJ40_SLEEPER.data?.generatedAt;
        hj40SetSleeperFeed(feed);
        if(changed)hj40RefreshExtraMetrics();
      }catch(error){
        if(HJ40_SLEEPER.data&&Date.now()-HJ40_SLEEPER.data.generatedAt>2*3600000){HJ40_SLEEPER.data=null;hj40RefreshExtraMetrics()}
        console.warn('Sleeper trends unavailable',error);
      }finally{HJ40_SLEEPER.pending=null}
    })();
    return HJ40_SLEEPER.pending;
  }
  setInterval(hj40RefreshSleeper,60000);

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
    if(key==='trend')return hj40SleeperRow(player)?.net??null;
    if(key==='oppRank')return hj40OpponentRank(player);
    return hj40OwnershipValue(player,{rostPct:'percentOwned',startPct:'percentStarted'}[key]);
  }
  function hj40CompareStat(a,b,key){
    const av=hj40Snapshot(a)?.[key]?.value,bv=hj40Snapshot(b)?.[key]?.value;
    const aKnown=Number.isFinite(av),bKnown=Number.isFinite(bv);
    if(aKnown!==bKnown)return aKnown?-1:1;
    const rankOrder=aKnown?(HJ40.statSortDir==='asc'?av-bv:bv-av):0;
    if(rankOrder)return rankOrder;
    // For tied opponent ranks, useful weekly scorers lead in either rank direction.
    if(key==='oppRank'){
      const ap=hj40ProjectionScore(a,'week'),bp=hj40ProjectionScore(b,'week');
      const aProjected=Number.isFinite(ap),bProjected=Number.isFinite(bp);
      if(aProjected!==bProjected)return aProjected?-1:1;
      if(aProjected&&ap!==bp)return bp-ap;
    }
    return a.name.localeCompare(b.name);
  }
  function hj40SelectStat(key){
    const reversible=key==='trend'||key==='oppRank';
    HJ40.statSortDir=reversible&&HJ40.statSort===key&&HJ40.statSortDir!=='asc'?'asc':'desc';
    HJ40.statSort=key;
  }
  // Run after row rendering/scroll restoration and on viewport resize, never on
  // horizontal touch scroll. Only scroll the individual rail, not the page.
  function hj40RevealSortedStat(){
    const key=HJ40.statSort;
    if(!key||key==='pffGrade'||HJ_HQ_STATE.activeTab!=='free-agents')return;
    const moves=[];
    document.querySelectorAll('#hq-fa-results [data-hq40-stat-rail]').forEach(rail=>{
      const button=[...rail.querySelectorAll('[data-hq40-sort-stat]')].find(node=>node.dataset.hq40SortStat===key);
      if(!button||!rail.clientWidth)return;
      const box=rail.getBoundingClientRect(),stat=button.getBoundingClientRect();
      const left=box.left+rail.clientLeft,right=left+rail.clientWidth;
      if(stat.left>=left&&stat.right<=right)return;
      const target=rail.scrollLeft+stat.left-left-(rail.clientWidth-stat.width)/2;
      moves.push([rail,Math.max(0,Math.min(rail.scrollWidth-rail.clientWidth,target))]);
    });
    moves.forEach(([rail,left])=>rail.scrollTo({left,behavior:'instant'}));
  }
  let hj40StatRailFrame=0;
  function hj40QueueSortedStat(){
    if(!hj40StatRailFrame)hj40StatRailFrame=requestAnimationFrame(()=>{hj40StatRailFrame=0;hj40RevealSortedStat()});
  }
  window.addEventListener('resize',hj40QueueSortedStat,{passive:true});
  window.visualViewport?.addEventListener('resize',hj40QueueSortedStat,{passive:true});
  function hj40StatValueHTML(player,key,metric){
    if(key==='trend'&&Number.isFinite(metric?.value)){
      const value=metric.value,tone=value>0?'up':value<0?'down':'flat',row=hj40SleeperRow(player);
      const label='Sleeper, last 24 hours: '+(value>0?'+':'')+value+' net adds'+(row?' ('+row.adds+' adds, '+row.drops+' drops)':'');
      return '<strong class="hq40-trend is-'+tone+'" aria-label="'+esc(label)+'">'+hj40TrendCount(value)+'</strong>';
    }
    if(key==='oppRank')return hjOpponentRankHTML(metric?.value,hj40Pos(player.position),Number(NFL_SEASON)).replace('>#','>');
    return '<strong>'+esc(metric?.display||'—')+'</strong>';
  }
  function hj40StatTitle(key,label){
    const next=HJ40.statSort===key&&HJ40.statSortDir!=='asc'&&(key==='trend'||key==='oppRank')?'lowest to highest':'highest to lowest';
    const context=key==='trend'?'Sleeper · Last 24 hours · Net adds (adds minus drops). ':key==='oppRank'?'Current week opponent rank vs this position; 1 allows fewest fantasy points. Ties use highest weekly projection. ':key==='startPct'?'Currently started in ESPN leagues. ':key==='rostPct'?'Currently rostered in ESPN leagues. ':'';
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
      const signature=JSON.stringify(pool.map(entry=>{const p=hjPlayer(entry),o=p.ownership||entry.ownership||entry.playerPoolEntry?.ownership||{};return [p.id,o.percentOwned,o.percentStarted]}));
      if(signature!==hj40OwnershipSignature){hj40OwnershipSignature=signature;hj40RefreshExtraMetrics()}
    }catch(error){console.warn('Player ownership refresh unavailable',error)}
    finally{hj40OwnershipRefreshPending=false}
  }
  document.addEventListener('hj:game-ranks-updated',hj40RefreshExtraMetrics);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){hj40RefreshOwnership();hj40RefreshSleeper()}});
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
