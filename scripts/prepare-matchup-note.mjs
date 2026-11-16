import {readFileSync} from 'node:fs';
/* League HQ › Rosters matchup sticky note (Nov 16): scripts/matchup-note.js renders it, styles/matchup-note.css lays it out. */
const helper=readFileSync(new URL('./matchup-note.js',import.meta.url),'utf8');
export function prepareMatchupNote(html){
 const from="  const matchupHTML=matchup?`<button class=\"league-matchup-score${matchupLive?' has-actual':''}\" type=\"button\" data-hq-open-matchup=\"${esc(team.id)}\" aria-label=\"Open Week ${matchup.week} matchup in Matchup Center\"><span class=\"league-matchup-team\">Week ${matchup.week} matchup${liveLabel}<b class=\"${matchupLive?'is-actual':''}\">${scoreLine||`vs ${esc(opponentName||'TBD')}`}</b>${scoreLine&&opponentName?`<span>vs ${esc(opponentName)}</span>`:''}${projectionLine}</span></button>`:'';";
 const to="  const matchupHTML=matchup?hjMatchupNoteHTML({week:matchup.week,teamId:team.id,oppId:opponent?.id??'opp',ownName:manager||owner,oppName:opponentName,live:matchupLive,ownActual,oppActual,ownProjected:Number.isFinite(ownProjected)?ownProjected:null,oppProjected:Number.isFinite(oppProjected)?oppProjected:null,ownVegas:vegasOwn?.vegas,oppVegas:vegasOpp?.vegas,ownAdjusted:hjAdjustedEspnProjection(matchup?.side),oppAdjusted:hjAdjustedEspnProjection(matchup?.opponent),ownFinal:!!ownLive.final,oppFinal:!!oppLive.final}):'';";
 if(html.split(from).length!==2)throw Error('Roster matchup note markup changed; review scripts/prepare-matchup-note.mjs');
 html=html.replace(from,()=>to);
 const anchor='hjTeamViewHTML=function(team,data){\n  const week=hjCurrentWeek(data),manager=hjMatchManager(team,data)';
 if(html.split(anchor).length!==2)throw Error('Roster view renderer changed; review scripts/prepare-matchup-note.mjs');
 html=html.replace(anchor,()=>helper+'\n'+anchor);
 // The page forces Public Sans inline on everything in the roster banner; the note's handwritten label and "VS"
 // keep their marker font.
 const fonts="if(el.closest('.hq-match-team-score.is-actual,.league-roster-lineup-head-total,.league-roster-total,.league-matchup-team b.is-actual'))return;";
 if(html.split(fonts).length!==2)throw Error('Font normalizer changed; review scripts/prepare-matchup-note.mjs');
 return html.replace(fonts,()=>fonts.replace("b.is-actual'","b.is-actual,.hj-mnote-label,.hj-mnote-vs-text'"));
}

