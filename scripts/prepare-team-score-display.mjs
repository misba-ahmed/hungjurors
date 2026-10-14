/* Render team totals through the same performance rules as individual players. */
export function prepareTeamScoreDisplay(html){
 const helper=String.raw`

function hjRosterMatchupPortraits(manager,opponent){
 const portrait=(name,side)=>name?'<img class="hj-roster-versus-avatar '+side+'" src="'+esc(managerAvatarSrc(name))+'" alt="" aria-hidden="true" loading="lazy" decoding="async">':'';
 return portrait(manager,'is-own')+portrait(opponent,'is-opponent');
}
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

 // Decorative portraits occupy the note's existing side padding, outside text flow.
 // Keep both roster renderers, score/projection updates and the original button intact.
 const noteStart='<span class="league-matchup-team">Week ${matchup.week} matchup';
 const noteWithPortraits='<span class="league-matchup-team">${hjRosterMatchupPortraits(manager,opponentName)}Week ${matchup.week} matchup';
 html=html.split(noteStart).join(noteWithPortraits);
 html=html.replace('</head>',`<style id="hj-roster-matchup-portraits">
#league-hq .league-roster-head .league-matchup-team{position:relative}
#league-hq .league-roster-head .league-matchup-team>.hj-roster-versus-avatar{
 position:absolute;top:50%;transform:translateY(-50%);display:block;
 width:24px;height:24px;min-width:24px;max-width:24px;box-sizing:border-box;
 margin:0;padding:0;border:1.5px solid var(--brass,#b88a2a);border-radius:50%;
 object-fit:cover;object-position:center;background:#fffdf7;pointer-events:none;
}
#league-hq .league-roster-head .hj-roster-versus-avatar.is-own{left:-28px}
#league-hq .league-roster-head .hj-roster-versus-avatar.is-opponent{right:-28px}
</style></head>`);
 return html;
}
