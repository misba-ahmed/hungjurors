function pcProjectionSummaryHTML(player,data,row,espn={},loading=false,period='season',week=0){
 const position=player.position,context=pcVegasRank(data,row,position),value=row?pcVegasPoints(row,position):null;
 const rank=context?'#'+context.rank+' '+position:'—',espnContext=espn[period+'Rank'];
 const espnRank=espnContext?' · #'+espnContext.rank+' '+position:'',stats=row?pcVegasStats(row,position):'';
 const weekly=period==='week',title=weekly?`Vegas Week ${week} Projections`:'Vegas Season Projections';
 const sourceNote=data?.updated?`Updated ${data.updated}`:loading?'Loading projections':'Projection unavailable';
 const update=weekly?(data?.updated||''):Number.isFinite(data?.publishedAt)?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'}).format(new Date(data.publishedAt)):'';
 const rankNote=context?`Vegas #${context.rank} of ${context.total} ${position}s; ${pcFpts(Math.abs(context.difference))} ${context.difference>=0?'above':'below'} ${position} average`:'';
 return `${update?`<span class="pc-season-updated" title="${esc(sourceNote)}">Updated ${esc(update)}</span>`:''}<span class="pc-season-title" title="${esc(sourceNote)}">${esc(title)}</span><div class="pc-season-total" title="${esc(rankNote)}"><strong>${Number.isFinite(value)?pcFpts(value):'—'}</strong><small>${esc(rank)}</small></div><span class="pc-season-espn">ESPN <b>${Number.isFinite(espn[period])?pcFpts(espn[period]):'—'}</b>${esc(espnRank)}</span>${stats?`<div class="pc-season-stat-scroll" tabindex="0" role="region" aria-label="${weekly?'Weekly':'Season'} projection stats. ${esc(sourceNote)}"><div class="pc-season-stats">${stats}</div></div>`:`<span class="pc-season-state">${loading?'Loading…':'No current projection'}</span>`}`;
}
function pcSeasonProjectionHTML(player,data,row,espn={},loading=false){
 return pcProjectionSummaryHTML(player,data,row,espn,loading);
}
