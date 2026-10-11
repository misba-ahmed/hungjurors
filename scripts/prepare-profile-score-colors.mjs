// Profile game-log points share the matchup actual-vs-ESPN color rules.
export function prepareProfileScoreColors(html){
 html=html.replace("function pcTable(",()=>"function pcWeeklyPerformanceAttrs(row,actual){\n if(row.pc_status||row.status)return 'style=\"color:#8b96a2!important;text-shadow:none!important;\"';\n const projection=row.pc_espn_week_projection;\n return Number.isFinite(projection)?hjPerformanceAttrs(actual,projection):'style=\"color:var(--navy,#16354c)!important;text-shadow:none!important;\"';\n}\nfunction pcTable(");
 html=html.replace("pc_espn_applied_total:Number(stat.appliedTotal),pc_espn_actual:true",()=>"pc_espn_week_projection:hjNumber(hjMathCanonicalStat(entry,'week',week,season,1)?.appliedTotal),pc_espn_applied_total:Number(stat.appliedTotal),pc_espn_actual:true");
 html=html.replace("points:pcNumber(stat.appliedTotal),rank:pcDstWeekRank(entries,week,stat.appliedTotal),stats:stat.stats||{},status:''",()=>"pc_espn_week_projection:hjNumber(hjMathCanonicalStat(entry,'week',week,season,1)?.appliedTotal),points:pcNumber(stat.appliedTotal),rank:pcDstWeekRank(entries,week,stat.appliedTotal),stats:stat.stats||{},status:''");
 html=html.replace("<td class=\"pc-points-cell pc-group-start\">${status&&status!",()=>"<td class=\"pc-points-cell pc-group-start\" ${pcWeeklyPerformanceAttrs(row,pcPoints(row))}>${status&&status!");
 html=html.replace("<td class=\"pc-points-cell pc-group-start\">${status===",()=>"<td class=\"pc-points-cell pc-group-start\" ${pcWeeklyPerformanceAttrs(row,row.points)}>${status===");
 return html;
}
