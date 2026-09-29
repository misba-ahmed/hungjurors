import {readFileSync} from 'node:fs';
const playerStatExtras=readFileSync(new URL('./player-stat-extras.js',import.meta.url),'utf8');
const opponentRankUpdates=readFileSync(new URL('./opponent-rank-updates.js',import.meta.url),'utf8');
/* Players-tab display order; retain the existing stat calculations and sorting. */
export function preparePlayerStatBars(html){
 const defs={"RB":[["fpts","FPTS"],["snap","SNP %"],["rushYd","RUSH YD"],["recYd","REC YD"],["rushTd","RUSH TD"],["recTd","REC TD"],["rush","RUSH"],["rec","REC"],["tgt","TAR"],["catchPct","CATCH %"],["ypc","YPC"],["ydRec","YD/REC"],["ydTar","YD/TAR"],["rostPct","ROST%"]],"WR":[["fpts","FPTS"],["snap","SNP %"],["rec","REC"],["recYd","REC YD"],["recTd","REC TD"],["tgt","TAR"],["ydRec","YD/REC"],["ydTar","YD/TAR"],["catchPct","CATCH %"],["rostPct","ROST %"]],"QB":[["fpts","FPTS"],["snap","SNP %"],["passYd","PASS YD"],["rushYd","RUSH YD"],["passTd","PASS TD"],["rushTd","RUSH TD"],["rush","RUSH"],["passAtt","PASS ATT"],["passCmp","PASS CMP"],["cmpPct","CMP %"],["int","INT"],["airYd","AIR YD"],["passRtg","PASS RTG"],["rostPct","ROST %"]],"K":[["fpts","FPTS"],["fgm","FGM"],["xpm","XPM"],["xpa","XPA"],["fga","FGA"],["fgPct","FGM %"],["fgm60","FGM 60+"],["fgm50","FGM 50+"],["fgm40","FGM 40-49"],["fgm30","FGM 30-39"],["rostPct","ROST %"]],"TE":[["fpts","FPTS"],["snap","SNP %"],["rec","REC"],["recYd","REC YD"],["recTd","REC TD"],["tgt","TAR"],["ydRec","YD/REC"],["ydTar","YD/TAR"],["catchPct","CATCH %"],["rostPct","ROST %"]]};
 for(const stats of Object.values(defs))stats.push(["startPct","START %"],["trend","TREND"],["oppRank","OPP RK"]);
 function replace(old,value){
  if(html.split(old).length!==2)throw Error('Player stat source changed: '+old.slice(0,70));
  html=html.replace(old,()=>value);
 }
 const pattern=/const HJ40_DEFS=\{[^]*?\n  \};/;
 const block=html.match(pattern)?.[0];if(!block)throw Error('Player stat definitions missing');
 let updated=block;
 for(const [position,stats] of Object.entries(defs)){
  const row=new RegExp('    '+position+':[^\\n]+');
  if(!row.test(updated))throw Error('Missing stat position '+position);
  updated=updated.replace(row,'    '+position+':'+JSON.stringify(stats)+',');
 }
 updated=updated.replace(/('D\/ST':\[)([^\n]+)(\]\n)/,(_,start,items,end)=>start+items+',["rostPct","ROST %"],["startPct","START %"],["trend","TREND"],["oppRank","OPP RK"]'+end);
 replace(block,updated);
 replace("key!=='pffGrade'&&(key!=='snap'||HJ40.period!=='total')","key!=='pffGrade'");
 replace("['snap','catchPct','cmpPct','fgPct','airShare','targetShare']","['snap','catchPct','cmpPct','fgPct','airShare','targetShare','rostPct','startPct']");
 replace("const value=statKey==='pffGrade'?hj40PffGrade(player):hj40Finite(raw.values[statKey]);","const value=['rostPct','startPct','trend','oppRank'].includes(statKey)?hj40ExtraValue(player,statKey):statKey==='pffGrade'?hj40PffGrade(player):hj40Finite(raw.values[statKey]);");
 replace('function hj40Snapshot(player){',playerStatExtras+'\nfunction hj40Snapshot(player){');
 replace("if(HJ40.statSort){const av=hj40Snapshot(a)?.[HJ40.statSort]?.value,bv=hj40Snapshot(b)?.[HJ40.statSort]?.value,aa=Number.isFinite(av)?av:-Infinity,bb=Number.isFinite(bv)?bv:-Infinity;return bb-aa||a.name.localeCompare(b.name)}","if(HJ40.statSort)return hj40CompareStat(a,b,HJ40.statSort);");
 replace("if(stat){HJ40.statSort=stat.dataset.hq40SortStat||'';","if(stat){hj40SelectStat(stat.dataset.hq40SortStat||'');");
 replace("if(key==='pffGrade')return value.toFixed(1);","if(key==='pffGrade')return value.toFixed(1);\n    if(key==='trend')return hj40TrendCount(value);\n    if(key==='oppRank')return String(Math.round(value));");
 replace("title=\"Sort by ${esc(label)}\" aria-pressed=\"${selected}\"><small>${esc(label)}</small><strong>${esc(metric?.display||'—')}</strong>","title=\"${esc(hj40StatTitle(key,label))}\" aria-pressed=\"${selected}\" data-sort-direction=\"${selected?(HJ40.statSortDir||'desc'):''}\"><small>${esc(label)}</small>${hj40StatValueHTML(player,key,metric)}");
 replace("const statLabel=HJ40.statSort?(HJ40_LABELS.get(HJ40.statSort)||HJ40.statSort):'';","const statLabel=HJ40.statSort?(HJ40_LABELS.get(HJ40.statSort)||HJ40.statSort)+(['trend','oppRank'].includes(HJ40.statSort)?(HJ40.statSortDir==='asc'?' ↑':' ↓'):''):'';");
 replace("function hj40StickyState(){","function hj40StickyState(){\n    hj40QueueTopBubble();hj40RefreshOwnership();hj40RefreshSleeper();");
 replace("async function hjLoadGameRanks(){",opponentRankUpdates+'\nasync function hjLoadGameRanks(){');
 replace("HJ_GAME_RANKS.rows=rows;HJ_GAME_RANKS.maps.clear();for(const pos of ['QB','RB','WR','TE','K'])HJ_GAME_RANKS.maps.set(pos,new Map(pcDvp(rows,pos).map(r=>[r.defense,{...r,season}])));","HJ_GAME_RANKS.rows=rows;hjUpdateOpponentRankMaps(season,['QB','RB','WR','TE','K'].map(pos=>[pos,new Map(pcDvp(rows,pos).map(r=>[r.defense,{...r,season}]))]));");
 replace("HJ_GAME_RANKS.rows=rows;for(const pos of ['QB','RB','WR','TE','K'])HJ_GAME_RANKS.maps.set(pos,new Map(pcDvp(rows,pos).map(r=>[r.defense,{...r,season}])));\n  HJ_GAME_RANKS.maps.set('D/ST',new Map([...pcDstOffenseRanks(entries,season,schedule)].map(([team,r])=>[team,{...r,season}])));","HJ_GAME_RANKS.rows=rows;hjUpdateOpponentRankMaps(season,[...['QB','RB','WR','TE','K'].map(pos=>[pos,new Map(pcDvp(rows,pos).map(r=>[r.defense,{...r,season}]))]),['D/ST',new Map([...pcDstOffenseRanks(entries,season,schedule)].map(([team,r])=>[team,{...r,season}]))]]);");
 replace("const rows=await pcLoadSeason(season),state=hj40Publish(season,rows,old?.snaps||new Map(),old?.dstEntries||[]);","const rows=await pcLoadSeason(season),latest=HJ40.data.get(season)||old,state=hj40Publish(season,rows,latest?.snaps||new Map(),latest?.dstEntries||[]);");
 replace("hj40StickyState();hj40EnsureSeason(Number(HJ40.year)).catch(()=>{});hj40HydrateLiveActuals(false).catch(()=>{});","hj40RevealSortedStat();hj40StickyState();hj40EnsureSeason(Number(HJ40.year)).catch(()=>{});hj40HydrateLiveActuals(false).catch(()=>{});");
 replace("Click any stat in a player row to rank the current filtered list by that stat.</div>","Click any stat in a player row to rank the current filtered list by that stat. Trends: <a href=\"https://sleeper.com\" target=\"_blank\" rel=\"noopener\">Sleeper</a> · 24h net adds.</div>");
 return html;
}
