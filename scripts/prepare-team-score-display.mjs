/* Render team totals through the same performance rules as individual players. */
export function prepareTeamScoreDisplay(html){
 const helper=String.raw`
function hjTeamTotalAttrs(actual,original){
 return hjPerformanceAttrs(actual,original)||'style="color:var(--navy,#16354c)!important"';
}
function hjRosterTotalHTML(total,actual,status,selection,week,mode,teamId,original){
 const data=HJ_LEAGUE_STATE.data;
 const matchup=mode==='actual'&&Number(week)===Number(hjCurrentWeek(data))?hjCurrentMatchup(teamId,data):null;
 const side=matchup?.side;
 const baseline=hjNumber(side?.totalProjectedPoints)??original;
 const score=actual?(hjSideScore(side,week)??total):total;
 const adjusted=actual?hjAdjustedEspnProjection(side):null;
 if(!Number.isFinite(score))return '';
 const projection=Number.isFinite(adjusted)?'<small class="hq-adjusted-projection" title="Live adjusted ESPN projection" aria-label="Live ESPN projection '+pcFpts(adjusted)+'">'+pcFpts(adjusted)+'</small>':'';
 return '<span class="league-roster-lineup-head-total'+(actual?' has-actual':'')+'">'+status+'<span class="hq-live-score-pair"><strong class="hq-match-team-score'+(actual?' is-actual':'')+'" '+(actual?hjTeamTotalAttrs(score,baseline):'')+'>'+pcFpts(score)+'</strong>'+projection+'</span></span>';
}
`;
 html=html.replace('function hjRosterSelectedGroupHTML(label,selection,plan,week,season,mode){',()=>helper+'\nfunction hjRosterSelectedGroupHTML(label,selection,plan,week,season,mode,teamId){');
 html=html.replaceAll("selection,plan,week,rosterSeason,mode)","selection,plan,week,rosterSeason,mode,team.id)");
 html=html.replaceAll("selection,plan,week,season,'actual')","selection,plan,week,season,'actual',team.id)");
 html=html.replace(/  const totalHTML=Number\.isFinite\(total\)\?`<span class="league-roster-lineup-head-total[^\n]+/,"  const totalHTML=hjRosterTotalHTML(total,actual,status,selection,week,mode,teamId,totals?.espn);");
 html=html.replaceAll('<strong class="hq-match-team-score${live?\' is-actual\':\'\'}">','<strong class="hq-match-team-score${live?\' is-actual\':\'\'}" ${live?hjTeamTotalAttrs(score,espn):\'\'}>');
 // Color the two actual scores separately in the roster matchup note.
 html=html.replace('`${pcFpts(ownActual)} – ${pcFpts(oppActual)}`','`<span ${hjTeamTotalAttrs(ownActual,hjNumber(matchup?.side?.totalProjectedPoints))}>${pcFpts(ownActual)}</span> – <span ${hjTeamTotalAttrs(oppActual,hjNumber(matchup?.opponent?.totalProjectedPoints))}>${pcFpts(oppActual)}</span>`');
 return html;
}
