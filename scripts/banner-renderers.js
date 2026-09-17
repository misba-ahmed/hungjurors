// Shared by every weekly recap and preview, including expanded cards.
function wireSummaryPortrait(side){return `<img class="av" src="data:image/png;base64,${AV[side.name]||AV_DEFAULT}" alt="">`;}
function wireSummaryManager(side){return `<span class="wire-feature-manager">${wireSummaryPortrait(side)}<span>${esc(side.name)}</span></span>`;}
function wireSummarySide(side,right=false,field='proj'){
 const value=Number.isFinite(side[field])?side[field].toFixed(2):'—';
 return `<span class="wire-preview-team${right?' right':''}">${wireSummaryPortrait(side)}<span class="wire-game-manager"><b>${esc(side.name)}</b><small>${value}</small></span></span>`;
}
function wireRecapSummary(week,results,high,low,close,blow,avg,under10){
 const attrs=game=>`data-wire-matchup="${esc(`${week}:${game.home.teamId}:${game.away.teamId}`)}"`;
 const highGame=results.find(game=>game.home===high||game.away===high);
 const finish=(label,game)=>`<button type="button" class="wire-preview-feature" ${attrs(game)}><span class="wire-feature-label">${label}</span><span class="wire-feature-managers">${wireSummaryManager(game.winner)}<span class="wire-feature-vs">vs</span>${wireSummaryManager(game.loser)}</span><strong>${game.margin.toFixed(2)}<small>point margin</small></strong></button>`;
 const highlights=`<div class="wire-preview-highlights"><button type="button" class="wire-preview-feature" ${attrs(highGame)}><span class="wire-feature-label">High Score</span>${wireSummaryManager(high)}<strong>${high.score.toFixed(2)}<small>fantasy points</small></strong></button>${finish('Closest Finish',close)}${finish('Biggest Win',blow)}</div>`;
 const totals=`<div class="wire-recap-totals"><div><span>League average</span><strong>${avg.toFixed(2)}</strong></div><div><span>Low score</span><span class="wire-recap-low">${wireSummaryPortrait(low)}<span><strong>${low.score.toFixed(2)}</strong><small>${esc(low.name)}</small></span></span></div><div><span>Close games</span><strong>${under10}<small> / ${results.length}</small></strong><small>under 10 points</small></div></div>`;
 const games=results.map(game=>`<button type="button" class="wire-preview-game" ${attrs(game)} aria-label="View Week ${week}: ${esc(game.home.name)} versus ${esc(game.away.name)}">${wireSummarySide(game.home,false,'score')}<span class="wire-preview-vs">FINAL</span>${wireSummarySide(game.away,true,'score')}</button>`).join('');
 return `${highlights}${totals}<div class="wire-preview-list">${games}</div>`;
}
