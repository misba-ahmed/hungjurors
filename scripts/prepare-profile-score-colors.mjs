import {readFileSync} from 'node:fs';
const logProjections=readFileSync(new URL('./profile-log-projections.js',import.meta.url),'utf8');
// Profile game-log points share the matchup actual-vs-ESPN color rules.
export function prepareProfileScoreColors(html){
 html=html.replace('function pcTable(',()=>logProjections+'\nfunction pcTable(');
 html=html.replace("const rowsJob=pcLoadSeason(season)","pcLoadLogProjections(active.player,season).then(refresh).catch(()=>{});\n  const rowsJob=pcLoadSeason(season)");
 html=html.replace("if(!stat)return {week,season,team,opponent,opponentRank", "if(!stat)return {pc_player_id:player.id,week,season,team,opponent,opponentRank");
 html=html.replaceAll("status==='UPCOMING'?'':esc(status)","status==='UPCOMING'?pcLogProjectionText(row):esc(status)");

 html=html.replace("function pcTable(",()=>"function pcWeeklyPerformanceAttrs(row,actual){\n if((row.pc_status||row.status)==='UPCOMING')return 'style=\"color:#5f6b76!important;font-weight:400!important;font-style:italic!important;font-size:11px!important;text-shadow:none!important;\"';\n if(row.pc_status||row.status)return 'style=\"color:#8b96a2!important;text-shadow:none!important;\"';\n const projection=row.pc_espn_week_projection;\n return Number.isFinite(projection)?hjPerformanceAttrs(actual,projection):'style=\"color:var(--navy,#16354c)!important;text-shadow:none!important;\"';\n}\nfunction pcTable(");
 html=html.replace("pc_espn_applied_total:Number(stat.appliedTotal),pc_espn_actual:true",()=>"pc_espn_week_projection:hjNumber(hjMathCanonicalStat(entry,'week',week,season,1)?.appliedTotal),pc_espn_applied_total:Number(stat.appliedTotal),pc_espn_actual:true");
 html=html.replace("points:pcNumber(stat.appliedTotal),rank:pcDstWeekRank(entries,week,stat.appliedTotal),stats:stat.stats||{},status:''",()=>"pc_espn_week_projection:hjNumber(hjMathCanonicalStat(entry,'week',week,season,1)?.appliedTotal),points:pcNumber(stat.appliedTotal),rank:pcDstWeekRank(entries,week,stat.appliedTotal),stats:stat.stats||{},status:''");
 html=html.replace("<td class=\"pc-points-cell pc-group-start\">${status&&status!",()=>"<td class=\"pc-points-cell pc-group-start\" ${pcWeeklyPerformanceAttrs(row,pcPoints(row))}>${status&&status!");
 html=html.replace("<td class=\"pc-points-cell pc-group-start\">${status===",()=>"<td class=\"pc-points-cell pc-group-start\" ${pcWeeklyPerformanceAttrs(row,row.points)}>${status===");
 html=html.replace("<td class=\"pc-rank-cell\">${esc(rank)}</td>","<td class=\"pc-rank-cell\" ${status==='UPCOMING'?pcWeeklyPerformanceAttrs(row,null):''}>${status==='UPCOMING'?pcLogRankText(row):esc(rank)}</td>");
 html=html.replace("<td class=\"pc-rank-cell\">${row.rank?`#${row.rank}`:'\u2014'}</td>","<td class=\"pc-rank-cell\" ${status==='UPCOMING'?pcWeeklyPerformanceAttrs(row,null):''}>${status==='UPCOMING'?pcLogRankText(row):row.rank?`#${row.rank}`:'\u2014'}</td>");
 return html;
}
