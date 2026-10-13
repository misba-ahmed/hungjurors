// Keep profile summaries tied to the same records and award cards as the site.
export function prepareProfileDetails(html){
 const replace=(from,to)=>{
  if(!html.includes(from))throw Error('Profile detail source changed: '+from.slice(0,80));
  html=html.replace(from,()=>to);
 };
 replace("cls:'is-red',badge:'!Waivers'","cls:'is-red',badge:''");

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
 replace('    const rect=card.getBoundingClientRect();\n    const overlay=document.createElement(\'div\');overlay.className=\'award-modal-overlay\';',
  '    const rect=card.getBoundingClientRect();\n    const managerOrigin=card.closest(\'.manager-modal-overlay\');\n    managerOrigin?.querySelector(\'.manager-modal-close\')?.click();\n    const overlay=document.createElement(\'div\');if(managerOrigin)overlay.style.zIndex=\'10020\';overlay.className=\'award-modal-overlay\';');

 const oldHigh=html.match(/function hjCurrentSeasonHigh\(team,data\)\{[^\n]+\}/)?.[0];
 if(!oldHigh)throw Error('Career high calculation missing');
 replace(oldHigh,`${hjCurrentSeasonHigh.toString()}\n${hjManagerCareerHigh.toString()}\n${hjProfileAwardAttrs.toString()}`);
 replace("const historical=Math.max(0,...staticRows.map(r=>Number(r.high_score||r.career_high_score||0))),live=hjCurrentSeasonHigh(team,data),v=high.querySelector('.v');if(v&&live>historical)v.textContent=Math.max(live,historical).toFixed(2)",
  "const v=high.querySelector('.v');if(v)v.textContent=hjManagerCareerHigh(name,team,data,HIST).toFixed(2)");
 return html;
}

export function hjCurrentSeasonHigh(team,data){
 if(!team||!data)return 0;
 const settings=data.settings?.scheduleSettings,regular=Number(settings?.matchupPeriodCount);
 if(!Number.isInteger(regular)||regular<1)return 0;
 let best=0;
 for(const game of data.schedule||[]){
  const period=Number(game.matchupPeriodId);
  if(period<1||period>regular||!['HOME','AWAY','TIE'].includes(game.winner))continue;
  const weeks=settings.matchupPeriods?.[period];
  if(!Array.isArray(weeks)||!weeks.length)continue;
  for(const side of [game.home,game.away]){
   if(String(side?.teamId)!==String(team.id))continue;
   for(const week of weeks){
    const value=side.pointsByScoringPeriod?.[week]??(weeks.length===1?side.totalPoints:null);
    if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))best=Math.max(best,Number(value));
   }
  }
 }
 return best;
}

export function hjManagerCareerHigh(name,team,data,history){
 const career=history.career_profiles?.find(row=>row.manager===name);
 const historical=Math.max(0,Number(career?.career_high_score)||0,...(history.manager_seasons||[]).filter(row=>row.manager===name).map(row=>Number(row.max_score)||0));
 return Math.max(historical,hjCurrentSeasonHigh(team,data));
}

export function hjProfileAwardAttrs(award,name){
 const aliases={'Highest Scorer Raffle':'Raffle Winner','The Titty Special':'Titty Special','The Overachiever Special':'Overachiever Special','The MVP Special':'MVP Special','The Optimizer Special':'Optimizer Special'};
 const title=aliases[award.award]||award.award;
 const index=(DATA['s'+Number(award.year)]?.awards||[]).findIndex(row=>row.k===title&&row.who===name&&(!award.week||Number(row.week)===Number(award.week)));
 return index<0?'class="profile-award"':`class="profile-award award-flip-card" data-year="${Number(award.year)}" data-award-index="${index}" tabindex="0" role="button" aria-label="Open ${esc(award.award)} award details"`;
}
