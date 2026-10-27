import {readFileSync} from 'node:fs';
const currentTeamSource=readFileSync(new URL('./profile-current-team.js',import.meta.url),'utf8');
const injuryStatusSource=readFileSync(new URL('./player-injury-status.js',import.meta.url),'utf8');
const liveDepthSource=readFileSync(new URL('./profile-depth-live.js',import.meta.url),'utf8');
const careerSource=readFileSync(new URL('./profile-career-high.js',import.meta.url),'utf8');
// Keep profile summaries tied to the same records and award cards as the site.
export function prepareProfileDetails(html){
 const replace=(from,to)=>{
  if(!html.includes(from))throw Error('Profile detail source changed: '+from.slice(0,80));
  html=html.replace(from,()=>to);
 };
 replace("cls:'is-red',badge:'!Waivers'","cls:'is-red',badge:''");
 // This updater runs outside the historical profile renderer's local num helper.
 replace("set('Avg Adds / Season',num(tx.avgAdds,1),null);","set('Avg Adds / Season',Number(tx.avgAdds).toFixed(1),null);");

 // The legacy animation-frame callback can run after the newer timed installer.
 // Do not append a second menu when V2 has already finished installing it.
 replace("if(!back||back.dataset.hjManagerNav==='1')return;",
  "if(!back||back.dataset.hjManagerNav==='1'||back.dataset.hjManagerNavV2==='1')return;");

 replace('scroll.scrollTop=0;state.ready=true;pcBindProfileNav(scroll);','scroll.scrollTop=0;state.ready=true;pcBindProfileNav(scroll);pcRefreshProfileDepth(active);');
 // Keep the fetch time on live fantasy responses, including free agents.
 replace("return payload.players.map(entry=>({...entry,_pcSeason:season,", "return payload.players.map(entry=>({...entry,_hjStatusAt:Date.now(),_pcSeason:season,");
 replace("      return entries;\n    }catch(error){lastError=error}", "      return entries.map(entry=>({...entry,_hjStatusAt:Date.now(),_pcSeason:season}));\n    }catch(error){lastError=error}");
 replace("if(!entries.length)throw new Error('ESPN player pool was empty');return entries", "if(!entries.length)throw new Error('ESPN player pool was empty');return entries.map(entry=>({...entry,_hjStatusAt:Date.now()}))");
 // Keep roster status provenance when saving and refreshing player lists.
 replace("id,name,norm:ffnNorm(name),team,position:pos,", "id,name,norm:ffnNorm(name),team,position:pos,injuries:p.injuries,status:p.status,_hjStatusAt:Date.now(),");
 const injuryStart=html.indexOf('function hjOfficialStatus('),injuryEnd=html.indexOf('const HJ_STATUS_LIVE=',injuryStart);
 if(injuryStart<0||injuryEnd<0)throw Error('Shared injury status source changed');
 html=html.slice(0,injuryStart)+injuryStatusSource+'\n'+html.slice(injuryEnd);
 replace("code:status?(injury.type?.abbreviation||status.code):null", "code:status?status.code:null");
 // Restore a small recent report synchronously; refresh it without blocking the page.
 replace("const HJ_INJURY_REPORT={rows:HJ_INJURY_SNAPSHOT.rows,at:HJ_INJURY_SNAPSHOT.at,loading:false,lastAttempt:0};", "const HJ_INJURY_REPORT={rows:HJ_INJURY_SNAPSHOT.rows,at:HJ_INJURY_SNAPSHOT.at,loading:false,lastAttempt:0};\ntry{const saved=JSON.parse(localStorage.getItem('hj-injury-status-v1')||'null');if(saved&&Array.isArray(saved.rows)&&Date.parse(saved.at)>Date.parse(HJ_INJURY_REPORT.at)&&Date.now()-Date.parse(saved.at)<86400000)Object.assign(HJ_INJURY_REPORT,saved)}catch(_){}");
 replace("HJ_INJURY_REPORT.loading=false;hjApplyOfficialStatuses()", "HJ_INJURY_REPORT.loading=false;try{localStorage.setItem('hj-injury-status-v1',JSON.stringify({rows:HJ_INJURY_REPORT.rows,at:HJ_INJURY_REPORT.at}))}catch(_){}hjApplyOfficialStatuses()");
 // Resolve current affiliation before rendering any profile header or team section.
 replace('function pcPlayerFromTrigger(trigger){',currentTeamSource+'\n'+liveDepthSource+'\nfunction pcPlayerFromTrigger(trigger){');
 replace('raw.photo=exact.photo||raw.photo}return raw;', 'raw.photo=exact.photo||raw.photo}return pcCurrentPlayer(raw);');
 replace('pcActive={overlay,player,returnFocus:trigger,token:0};', 'pcActive={overlay,player,returnFocus:trigger,token:0};pcRefreshCurrentTeam(pcActive);');
 replace('const teamLogo=ffnTeamLogo(player.team);', "const teamLogo=player.team==='FA'?'':ffnTeamLogo(player.team);");
 replace("if(player.position==='D/ST')return;\n const id=String(player.id||''),target=overlay.querySelector('[data-profile-jersey]');", "if(player.position==='D/ST'||player.team==='FA')return;\n const id=String(player.id||''),target=overlay.querySelector('[data-profile-jersey]');");
 replace("roster=(ffnRosterByTeam.get(team)||[])", "roster=pcCurrentRoster(team)");
 replace('function pcTeamHTML(player,allRows,season){', `function pcTeamHTML(player,allRows,season){
  if(player.team==='FA')return '<section class="pc-depth-card pc-team-card" data-pc-section="team"><div class="pc-depth-summary"><span>Team</span><strong>NFL free agent</strong></div></section>';`);
 replace("const team=pcTeamForWeek(rows,week,player.team),game=", "const team=Number(season)===Number(NFL_SEASON)&&week>=hjCurrentWeek()?player.team:pcTeamForWeek(rows,week,player.team),game=");


 // Reverse only the rendered charts; other transaction consumers keep their ordering.
 replace('const years=txYears.map(year=>','const years=[...txYears].sort((a,b)=>b-a).map(year=>');
 replace('chart.innerHTML=txYears.map(year=>','chart.innerHTML=[...txYears].sort((a,b)=>b-a).map(year=>');
 replace('const bars=txYears.map(y=>','const bars=[...txYears].sort((a,b)=>b-a).map(y=>');
 replace('<div class="roster-activity-range">2019–2025</div>','<div class="roster-activity-range">${Math.min(...txYears)}–${Math.max(...txYears)}</div>');
 // One horizontal row grows with the number of seasons; never wrap a bar outside its card.
 html=html.replace('</head>',`<style>
 .roster-activity-bars,.profile-roster-years{grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:minmax(38px,1fr);overflow-x:auto;overflow-y:hidden;padding:3px 2px 5px;box-sizing:content-box}
 .profile-award.award-flip-card{cursor:pointer}
 .profile-award.award-flip-card:focus-visible{outline:3px solid var(--brass-bright);outline-offset:2px}
 </style></head>`);

 const awardStart='const awardHTML=awards.map(a=>`<div class="profile-award">';
 replace(awardStart,'const awardHTML=awards.map(a=>`<div ${hjProfileAwardAttrs(a,name)}>');

 const oldHigh=html.match(/function hjCurrentSeasonHigh\(team,data\)\{[^\n]+\}/)?.[0];
 if(!oldHigh)throw Error('Career high calculation missing');
 replace(oldHigh,`${careerSource}\n${hjProfileAwardAttrs.toString()}`);
 replace("const historical=Math.max(0,...staticRows.map(r=>Number(r.high_score||r.career_high_score||0))),live=hjCurrentSeasonHigh(team,data),v=high.querySelector('.v');if(v&&live>historical)v.textContent=Math.max(live,historical).toFixed(2)",
  "hjPaintCareerHigh(high,name)");
 replace('${num(c.career_high_score,2)}</div><div class="s">regular-season points', '${num(hjManagerCareerHighRecord(name).score,2)}</div><div class="s">${hjCareerHighCaption(hjManagerCareerHighRecord(name))}');
 replace('scroll.innerHTML=managerProfileHTML(name);back.append(head,scroll);', 'scroll.innerHTML=managerProfileHTML(name);hjLoadCareerHigh(name).then(()=>hjPaintCareerHigh(back,name));back.append(head,scroll);');
 return html;
}

export function hjProfileAwardAttrs(award,name){
 const aliases={'Highest Scorer Raffle':'Raffle Winner','The Titty Special':'Titty Special','The Overachiever Special':'Overachiever Special','The MVP Special':'MVP Special','The Optimizer Special':'Optimizer Special'};
 const title=aliases[award.award]||award.award;
 const index=(DATA['s'+Number(award.year)]?.awards||[]).findIndex(row=>row.k===title&&row.who===name&&(!award.week||Number(row.week)===Number(award.week)));
 return index<0?'class="profile-award"':`class="profile-award award-flip-card" data-year="${Number(award.year)}" data-award-index="${index}" tabindex="0" role="button" aria-label="Open ${esc(award.award)} award details"`;
}
